import 'source-map-support/register'
import './extensions'

import { RawBlock, parseBlock, Block, Transaction, parseReceipt, Receipt, RawLog, Hash } from './json-rpc-types'
import { RetryingJsonRpcProvider } from './my-provider';
import { JsonRpcProvider } from 'ethers/providers'
import { InfluxDB, FieldType, IPoint } from 'influx/lib/src'
import { BlockAndLogStreamer } from 'ethereumjs-blockstream'

export interface DataFaucetConfiguration {
	ethereumEndpoint: string
	influxHost: string
	influxPort: number
	influxProtocol: 'http'|'https'
	influxDatabaseName: string
	influxUser: string
	influxPass: string
	startBlock?: string
}

export class DataFaucet {
	// TODO: drop ethers.js, just use `fetch` instead for simpler debugging since we don't need all of ethers.js features.
	private readonly provider: JsonRpcProvider
	private readonly influxdb: InfluxDB
	private timer: NodeJS.Timer | null = null
	private blockStreamer: BlockAndLogStreamer<RawBlock, RawLog>
	private currentProcessor: Promise<void>

	static async create(configuration: DataFaucetConfiguration): Promise<DataFaucet> {
		const provider = new RetryingJsonRpcProvider(5000, configuration.ethereumEndpoint, 'homestead')
		const influxdb = new InfluxDB({
			host: configuration.influxHost,
			port: configuration.influxPort,
			protocol: configuration.influxProtocol,
			database: configuration.influxDatabaseName,
			username: configuration.influxUser,
			password: configuration.influxPass,
			schema: [
				{
					measurement: 'block',
					fields: {
						hash: FieldType.STRING,
						parent_hash: FieldType.STRING,
						number: FieldType.INTEGER,
						author: FieldType.STRING,
						miner: FieldType.STRING,
						nonce: FieldType.FLOAT,
						difficulty: FieldType.FLOAT,
						size_bytes: FieldType.INTEGER,
						gas_limit: FieldType.INTEGER,
						gas_used: FieldType.INTEGER,
						uncles_count: FieldType.INTEGER,
						since_previous_block_seconds: FieldType.INTEGER,
					},
					tags: [ ],
				}, {
					measurement: 'transaction',
					tags: [ 'index', 'failed'],
					fields: {
						hash: FieldType.STRING,
						block_hash: FieldType.STRING,
						block_number: FieldType.INTEGER,
						transaction_index: FieldType.INTEGER,
						status: FieldType.INTEGER,
						gas_used: FieldType.INTEGER,
						gas_provided: FieldType.INTEGER,
						gas_price_nanoeth: FieldType.FLOAT,
						gas_cost_total_eth: FieldType.FLOAT,
						from: FieldType.STRING,
						to: FieldType.STRING,
						nonce: FieldType.INTEGER,
						eth: FieldType.FLOAT,
						contract_address: FieldType.STRING,
						log_count: FieldType.INTEGER,
					}
				}
			]
		})
		// create DB if necessary
		const existingDatabases = await influxdb.getDatabaseNames()
		if (!existingDatabases.includes(configuration.influxDatabaseName)) await influxdb.createDatabase(configuration.influxDatabaseName)
		// figure out what block to start on
		const result = await influxdb.query<{ last: string, timestamp: Date }>('select last(hash) from block')
		// FIXME: if we reorg out the last block to be put into the DB before a service restart then we won't properly detect and cleanup after it, we should delete the last `n` blocks from the DB and repopulate on startup
		let lastProcessedBlock: RawBlock = (result.length !== 0)
			? await provider.send('eth_getBlockByHash', [`0x${result[0].last}`, true])
			: configuration.startBlock
				? await provider.send('eth_getBlockByHash', [configuration.startBlock, true])
				: await provider.send('eth_getBlockByNumber', ['latest', true])
		if (lastProcessedBlock === null) lastProcessedBlock = await provider.send('eth_getBlockByNumber', ['latest', true])
		const blockStreamer = new BlockAndLogStreamer(async (hash) => await provider.send('eth_getBlockByHash', [hash, true]), async () => [], console.error)
		await blockStreamer.reconcileNewBlock(lastProcessedBlock)
		// kick off everything
		return new DataFaucet(provider, influxdb, blockStreamer)
	}

	private constructor(provider: JsonRpcProvider, influxdb: InfluxDB, blockStreamer: BlockAndLogStreamer<RawBlock, RawLog>) {
		this.provider = provider
		this.influxdb = influxdb
		this.blockStreamer = blockStreamer
		this.currentProcessor = Promise.resolve()
		this.blockStreamer.subscribeToOnBlockAdded(block => this.currentProcessor = this.currentProcessor.then(() => this.processBlock(block)))
		this.blockStreamer.subscribeToOnBlockRemoved(block => this.currentProcessor = this.currentProcessor.then(() => this.purgeBlock(block)))
		this.maybeFetchBlock()
		process.on('SIGINT', () => { if (this.timer) clearTimeout(this.timer) })
		process.on('SIGTERM', () => { if (this.timer) clearTimeout(this.timer) })
	}

	private maybeFetchBlock = async () => {
		try {
			const previousBlock = parseBlock(this.blockStreamer.getLatestReconciledBlock()!)
			const latestBlockNumber = await this.getBlockNumber()
			if (previousBlock.number >= latestBlockNumber) {
				if (this.timer === null) {
					// uses a timer instead of async/await so we can stop it by cancelling the timer, also to avoid stack overflow due to recurssion
					this.timer = setTimeout(() => { this.timer = null; this.maybeFetchBlock() }, 1000)
				}
			} else {
				this.timer = null
				const rawBlock: RawBlock = await this.fetchLatestBlock()
				await this.blockStreamer.reconcileNewBlock(rawBlock)
				// no tail call recursion, so we need to push this back to the top of the stack when we recurse
				setImmediate(this.maybeFetchBlock)
			}
		} catch (error) {
			console.error(error)
		}
	}

	private getBlockNumber = async (): Promise<number> => {
		while (true) {
			try {
				return await this.provider.getBlockNumber()
			} catch (error) {
				console.error(error)
			}
		}
	}

	private processBlock = async (rawBlock: RawBlock): Promise<void> => {
		try {
			const block = parseBlock(rawBlock)
			console.log(`fetching previous block ${block.parentHash} (${block.number - 1})`)
			const previousBlockTimestamp = await this.fetchBlockTimestamp(block.parentHash)
			console.log(`fetching receipts for block ${block.hash} (${block.number})`)
			const receipts = await this.fetchReceipts(block)
			// console.log(`fetching parity traces for block ${block.hash} (${block.number})`)
			// const parityTraces = await this.fetchParityTraces(block)
			console.log(`submitting measurements for block ${block.hash} (${block.number})`)
			const measurements = this.generateTransactionMeasurements(block, receipts)
				.concat(this.generateBlockMeasurement(previousBlockTimestamp, block))
			await this.influxdb.writePoints(measurements, { precision: 's' })
			console.log(`done processing block ${block.hash} (${block.number})`)
		} catch (error) {
			console.error(error)
		}
	}

	private purgeBlock = async (rawBlock: RawBlock): Promise<void> => {
		try {
			const block = parseBlock(rawBlock)
			console.log(`purging block ${rawBlock.hash} (${rawBlock.number})`)
			await this.influxdb.query(`delete from block where time = '${block.timestamp.toISOString()}'`)
			await this.influxdb.query(`delete from transaction where time = '${block.timestamp.toISOString()}'`)
		} catch (error) {
			console.error(error)
		}
	}

	private fetchBlockTimestamp = async (blockHash: Hash): Promise<Date> => {
		const rawBlock = await this.provider.send('eth_getBlockByHash', [blockHash.to0xString(), false])
		return new Date(parseInt(rawBlock.timestamp, 16) * 1000)
	}

	private fetchLatestBlock = async (): Promise<RawBlock> => {
		return await this.provider.send('eth_getBlockByNumber', ['latest', true])
	}

	private fetchReceipts = async (block: Block): Promise<Array<Receipt>> => {
		const transactionReceiptRequests = block.transactions.map(this.fetchReceipt)
		return await Promise.all(transactionReceiptRequests)
	}

	private fetchReceipt = async (transaction: Transaction): Promise<Receipt> => {
		const rawReceipt = await this.provider.send('eth_getTransactionReceipt', [ transaction.hash.to0xString() ])
		return parseReceipt(rawReceipt)
	}

	// private fetchParityTraces = async (block: Block): Promise<Array<ParityTrace>> => {
	// 	const rawTraces = await this.provider.send('trace_replayBlockTransactions', [ block.number, ['trace'] ])
	// 	return await Promise.all(parityTraceRequests)
	// }

	private generateBlockMeasurement = (previousBlockTimestamp: Date, block: Block): IPoint => {
		return {
			measurement: 'block',
			timestamp: block.timestamp,
			fields: {
				hash: block.hash.toString(),
				parent_hash: block.parentHash.toString(),
				number: block.number,
				author: block.author.toString(),
				miner: block.miner.toString(),
				nonce: block.nonce,
				difficulty: block.difficulty,
				size_bytes: block.size,
				gas_limit: block.gasLimit,
				gas_used: block.gasUsed,
				uncles_count: block.uncles.length,
				since_previous_block_seconds: (block.timestamp.valueOf() - previousBlockTimestamp.valueOf()) / 1000,
			}
		}
	}

	private generateTransactionMeasurements = (block: Block, receipts: Array<Receipt>): Array<IPoint> => {
		const transactions = block.transactions.reduce((map, transaction) => map.set(transaction.hash.toString(), transaction), new Map<string, Transaction>())

		const measurements: Array<IPoint> = []
		for (let receipt of receipts) {
			const transaction = transactions.get(receipt.transactionHash.toString())!
			measurements.push(this.generateTransactionMeasurement(block, transaction, receipt))
		}
		return measurements
	}

	private generateTransactionMeasurement = (block: Block, transaction: Transaction, receipt: Receipt): IPoint => {
		return {
			measurement: 'transaction',
			timestamp: block.timestamp,
			tags: {
				index: receipt.transactionIndex.toString(),
				failed: (!receipt.status).toString(),
			},
			fields: {
				hash: receipt.transactionHash.toString(),
				block_number: receipt.blockNumber,
				block_hash: receipt.blockHash.toString(),
				transaction_index: receipt.transactionIndex,
				status: receipt.status,
				gas_used: receipt.gasUsed,
				gas_provided: transaction.gas,
				gas_price_nanoeth: transaction.gasPrice / 1e9,
				gas_cost_total_eth: receipt.gasUsed * transaction.gasPrice / 1e18,
				from: transaction.from.toString(),
				to: (transaction.to !== null) ? transaction.to.toString() : null,
				nonce: transaction.nonce,
				eth: transaction.value / 1e18,
				contract_address: (receipt.contractAddress !== null) ? receipt.contractAddress.toString() : null,
				log_count: receipt.logs.length,
			}
		}
	}
}
