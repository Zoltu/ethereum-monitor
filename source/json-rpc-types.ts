export type Quantity = string
export type RawHash = string
export type RawBytes8 = string
export type RawBytes32 = string
export type RawBytes256 = string
export type RawAddress = string
export type RawBytes = string
export type Tag = 'earliest'|'latest'|'pending'

abstract class ByteArray extends Uint8Array {
	toString() {
		return this.reduce((result: string, byte: number) => result + ('0' + byte.toString(16)).slice(-2), '')
	}
	to0xString() {
		return `0x${this.toString()}`
	}
	equals = (other?: ByteArray | null): boolean => {
		if (other === undefined || other === null) return false
		if (this.length !== other.length) return false
		for (let i = 0; i < this.length; ++i) {
			if (this[i] !== other[i]) return false
		}
		return true
	}
}

export class Bytes extends ByteArray {
	constructor(raw: RawBytes) {
		if (!/[a-fA-F0-9]*/.test(raw)) throw new Error(`Expected RawBytes to be a hex encoded byte array with an optional '0x' prefix.  Received: ${raw}`)
		raw = (raw.startsWith('0x')) ? raw.slice(2) : raw
		super(raw.length / 2)
		for (let i = 0; i < raw.length; i += 2) {
			this[i/2] = parseInt(raw[i] + raw[i+1], 16)
		}
	}
}
export class Bytes32 extends ByteArray {
	constructor(raw?: RawBytes32) {
		super(32)
		if (raw === undefined) return
		raw = (raw.startsWith('0x')) ? raw.slice(2) : raw
		if (!/[a-fA-F0-9]{64}/.test(raw)) throw new Error(`Expected RawBytes32 to be a 32 byte number hex encoded in a string with an optional '0x' prefix. Received: ${raw}`)
		for (let i = 0; i < raw.length; i += 2) {
			this[i/2] = parseInt(raw[i] + raw[i+1], 16)
		}
	}
}
export class Bytes256 extends ByteArray {
	constructor(raw?: RawBytes256) {
		super(256)
		if (raw === undefined) return
		raw = (raw.startsWith('0x')) ? raw.slice(2) : raw
		if (!/[a-fA-F0-9]{512}/.test(raw)) throw new Error(`Expected RawBytes256 to be a 256 byte number hex encoded in a string with an optional '0x' prefix. Received: ${raw}`)
		for (let i = 0; i < raw.length; i += 2) {
			this[i/2] = parseInt(raw[i] + raw[i+1], 16)
		}
	}
}
export class Hash extends ByteArray {
	constructor(raw?: RawHash) {
		super(32)
		if (raw === undefined) return
		raw = (raw.startsWith('0x')) ? raw.slice(2) : raw
		if (!/[a-fA-F0-9]{64}/.test(raw)) throw new Error(`Expected RawHash to be a 32 byte number hex encoded in a string with an optional '0x' prefix. Received: ${raw}`)
		for (let i = 0; i < raw.length; i += 2) {
			this[i/2] = parseInt(raw[i] + raw[i+1], 16)
		}
	}
}
export class Address extends ByteArray {
	constructor(raw?: RawAddress) {
		super(20)
		if (raw === undefined) return
		raw = (raw.startsWith('0x')) ? raw.slice(2) : raw;
		if (!/[a-fA-F0-9]{40}/.test(raw)) throw new Error(`Expected RawAddress to be a 20 byte number hex encoded in a string with an optional '0x' prefix. Received: ${raw}`)
		for (let i = 0; i < raw.length; i += 2) {
			this[i/2] = parseInt(raw[i] + raw[i+1], 16)
		}
	}
}

export interface RawLog {
	logIndex: Quantity
	blockNumber: Quantity
	blockHash: RawHash
	transactionHash: RawHash
	transactionIndex: Quantity
	address: RawAddress
	data: RawBytes
	topics: Array<RawHash>
}

export interface RawReceipt {
	blockHash: RawHash
	blockNumber: Quantity
	contractAddress: RawAddress | null
	cumulativeGasUsed: Quantity
	gasUsed: Quantity
	logs: Array<RawLog>
	logsBloom: RawHash
	root: RawHash | null
	status: Quantity
	transactionHash: RawHash
	transactionIndex: Quantity
}

export interface RawTransaction {
	hash: RawHash
	nonce: Quantity
	blockHash: RawHash
	blockNumber: Quantity
	transactionIndex: Quantity
	from: RawAddress
	to: RawAddress | null
	value: Quantity
	gasPrice: Quantity
	gas: Quantity
	input: RawBytes
}

export interface RawBlock {
	number: Quantity
	hash: RawHash
	parentHash: RawHash
	nonce: RawBytes8
	sha3Uncles: RawBytes32
	logsBloom: RawBytes256
	transactionsRoot: RawBytes32
	stateRoot: RawBytes32
	receiptsRoot: RawBytes32
	author: RawAddress
	miner: RawAddress
	difficulty: Quantity
	extraData: RawBytes
	size: Quantity
	gasLimit: Quantity
	gasUsed: Quantity
	timestamp: Quantity
	transactions: Array<RawTransaction>
	uncles: Array<RawHash>
}

export interface Log {
	blockNumber: number
	blockHash: Hash
	transactionIndex: number
	transcationHash: Hash
	logIndex: number
	address: Address
	topics: Array<Hash>
	data: Bytes
}

export interface Receipt {
	transactionHash: Hash
	blockHash: Hash
	blockNumber: number
	transactionIndex: number
	cumulativeGasUsed: number
	status: number
	gasUsed: number
	contractAddress: Address | null
	logs: Array<Log>
	logsBloom: Hash
	root: Hash | null
}

export interface Transaction {
	hash: Hash
	nonce: number
	blockHash: Hash
	blockNumber: number
	transactionIndex: number
	from: Address
	to: Address | null
	value: number
	gasPrice: number
	gas: number
	input: Bytes
}

export interface Block {
	number: number
	hash: Hash
	parentHash: Hash
	nonce: number
	sha3Uncles: Bytes32
	logsBloom: Bytes256
	transactionsRoot: Bytes32
	stateRoot: Bytes32
	receiptsRoot: Bytes32
	author: Address
	miner: Address
	difficulty: number
	extraData: Bytes
	size: number
	gasLimit: number
	gasUsed: number
	timestamp: Date
	transactions: Array<Transaction>
	uncles: Array<Hash>
}

export function parseLog(raw: RawLog): Log {
	return {
		address: new Address(raw.address),
		blockHash: new Hash(raw.blockHash),
		blockNumber: parseInt(raw.blockNumber, 16),
		data: new Bytes(raw.data),
		logIndex: parseInt(raw.logIndex, 16),
		topics: raw.topics.map(topic => new Hash(topic)),
		transactionIndex: parseInt(raw.transactionIndex, 16),
		transcationHash: new Hash(raw.transactionHash),
	}
}

export function parseReceipt(raw: RawReceipt): Receipt {
	return {
		blockHash: new Hash(raw.blockHash),
		blockNumber: parseInt(raw.blockNumber, 16),
		contractAddress: (raw.contractAddress !== null) ? new Address(raw.contractAddress) : null,
		cumulativeGasUsed: parseInt(raw.cumulativeGasUsed, 16),
		gasUsed: parseInt(raw.gasUsed, 16),
		logs: raw.logs.map(log => parseLog(log)),
		logsBloom: new Hash(raw.logsBloom),
		root: (raw.root !== null) ? new Hash(raw.root) : null,
		status: parseInt(raw.status),
		transactionHash: new Hash(raw.transactionHash),
		transactionIndex: parseInt(raw.transactionIndex, 16),
	}
}

export function parseTransaction(raw: RawTransaction): Transaction {
	return {
		hash: new Hash(raw.hash),
		nonce: parseInt(raw.nonce, 16),
		blockHash: new Hash(raw.blockHash),
		blockNumber: parseInt(raw.blockNumber, 16),
		transactionIndex: parseInt(raw.transactionIndex, 16),
		from: new Address(raw.from),
		to: (raw.to === null) ? null : new Address(raw.to),
		value: parseInt(raw.value, 16),
		gasPrice: parseInt(raw.gasPrice, 16),
		gas: parseInt(raw.gas, 16),
		input: new Bytes(raw.input),
	}
}

export function parseBlock(raw: RawBlock): Block {
	return {
		number: parseInt(raw.number, 16),
		hash: new Hash(raw.hash),
		parentHash: new Hash(raw.parentHash),
		nonce: parseInt(raw.nonce, 16),
		sha3Uncles: new Bytes32(raw.sha3Uncles),
		logsBloom: new Bytes256(raw.logsBloom),
		transactionsRoot: new Bytes32(raw.transactionsRoot),
		stateRoot: new Bytes32(raw.stateRoot),
		receiptsRoot: new Bytes32(raw.stateRoot),
		author: new Address(raw.author),
		miner: new Address(raw.miner),
		difficulty: parseInt(raw.difficulty, 16),
		extraData: new Bytes(raw.extraData),
		size: parseInt(raw.size, 16),
		gasLimit: parseInt(raw.gasLimit, 16),
		gasUsed: parseInt(raw.gasUsed, 16),
		timestamp: new Date(parseInt(raw.timestamp, 16) * 1000),
		transactions: raw.transactions.map(parseTransaction),
		uncles: raw.uncles.map(raw => new Hash(raw)),
	}
}
