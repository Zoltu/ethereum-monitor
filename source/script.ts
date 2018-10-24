import { DataFaucet, DataFaucetConfiguration } from "./data-faucet";

function getEnv(envName: string): string {
	const env = process.env[envName]
	if (!env) throw new Error(`You must set ${envName} environment variable.`)
	return env
}

const ethereumEndpoint = getEnv('ETHEREUM_URI')
const influxHost = getEnv('INFLUX_HOST')
const influxPort = parseInt(process.env.INFLUX_PORT || '8086')
const influxProtocol = process.env.INFLUX_PROTOCOL || 'http'
const influxDatabaseName = process.env.INFLUX_DATABASE_NAME || 'Ethereum'
const influxUser = process.env.INFLUX_USER || 'user'
const influxPass = process.env.INFLUX_PASS || 'password'
const startBlock = process.env.START_BLOCK || undefined

if (influxProtocol !== 'http' && influxProtocol !== 'https') throw new Error(`INFLUX_PROTOCOL environment variable must be 'http' or 'https', not ${influxProtocol}`)

const config: DataFaucetConfiguration = {
	ethereumEndpoint: ethereumEndpoint,
	influxHost: influxHost,
	influxPort: influxPort,
	influxProtocol: influxProtocol,
	influxUser: influxUser,
	influxPass: influxPass,
	influxDatabaseName: influxDatabaseName,
	startBlock: startBlock,
}

DataFaucet.create(config).catch(error => {
	console.error(error)
	process.exit(1)
})
