// this line forces TypeScript to interpret this file as a module, otherwise you get an error on the `declare global` bit
export { }

declare global {
	interface Array<T> {
		first: () => T | undefined
		firstOrDefault: (fallback: T) => T
		last: () => T | undefined
		lastOrDefault: (fallback: T) => T
	}
}

Object.defineProperty(Array.prototype, 'first', {
	enumerable: false,
	configurable: false,
	writable: false,
	value: function <T>(this: Array<T>): T | undefined {
		return this[0]
	}
})

Object.defineProperty(Array.prototype, 'firstOrDefault', {
	enumerable: false,
	configurable: false,
	writable: false,
	value: function <T>(this: Array<T>, fallback: T) {
		const first = this.first()
		return (first === undefined) ? fallback : first
	}
})

Object.defineProperty(Array.prototype, 'last', {
	enumerable: false,
	configurable: false,
	writable: false,
	value: function <T>(this: Array<T>): T | undefined {
		return this[this.length - 1]
	}
})

Object.defineProperty(Array.prototype, 'lastOrDefault', {
	enumerable: false,
	configurable: false,
	writable: false,
	value: function <T>(this: Array<T>, fallback: T): T {
		const last = this.last()
		return (last === undefined) ? fallback : last
	}
})
