import { JsonRpcProvider } from "ethers/providers"

export class RetryingJsonRpcProvider extends JsonRpcProvider {
	private readonly timeoutMilliseconds: number
	constructor(timeoutMilliseconds: number, url: string, network: string) {
		super(url, network)
		this.timeoutMilliseconds = timeoutMilliseconds
	}

	async send(method: string, params: Array<any>): Promise<any> {
		return this.internalSend(method, params, 100, { fulfilled: false })
	}

	private async internalSend(method: string, params: Array<any>, retryDelay: number, x: { fulfilled: boolean }): Promise<any> {
		// sketchy returning like this, but it shouldn't be possible to reach that return with a promise that will ever be viewed
		if (x.fulfilled) return
		return new Promise(async (resolve, reject) => {
			setTimeout(() => {
				if (x.fulfilled) return
				console.error(`timed out calling ${method}, trying again in ${retryDelay / 1000} seconds`)
				const newRetryDelay = Math.min(5 * 60 * 1000, retryDelay * 2)
				setTimeout(() => this.internalSend(method, params, newRetryDelay, x).then(resolve).catch(reject), retryDelay)
			}, this.timeoutMilliseconds)
			try {
				const result = await super.send(method, params)
				x.fulfilled = true
				resolve(result)
			} catch (error) {
				x.fulfilled = true
				reject(error)
			}
		})
	}
}
