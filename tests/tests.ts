import 'mocha'
import { expect } from 'chai'
import '../source/extensions'
import { Address } from '../source/json-rpc-types';

describe('json-rpc-types', async () => {
	describe('Address', async () => {
		it('equals other zero address', async () => {
			const first = new Address()
			const second = new Address('0000000000000000000000000000000000000000')
			expect(first.equals(second)).to.be.true
		})
		it('does not equal non-zero address', async () => {
			const first = new Address()
			const second = new Address('0000000000000000000000000000000000000001')
			expect(first.equals(second)).to.be.false
		})
		it('equals non-zero address', async () => {
			const first = new Address('0xbadf00dbadf00dbadf00dbadf00dbadf00dbadf0')
			const second = new Address('badf00dbadf00dbadf00dbadf00dbadf00dbadf0')
			expect(first.equals(second)).to.be.true
		})
	})
})

describe('extensions', async () => {
	describe('Array', async () => {
		it('returns undefined first for empty array', async () => {
			const array: Array<number> = []
			const result = array.first()
			expect(result).to.equal(undefined)
		})
		it('returns undefined last for empty array', async () => {
			const array: Array<number> = []
			const result = array.last()
			expect(result).to.equal(undefined)
		})
		it('returns first', async () => {
			const array: Array<number> = [0, 1, 2]
			const result = array.first()
			expect(result).to.equal(0)
		})
		it('returns last', async () => {
			const array: Array<number> = [0, 1, 2]
			const result = array.last()
			expect(result).to.equal(2)
		})
		it('returns fallback firstOrDefault for empty array', async () => {
			const array: Array<number> = []
			const result = array.firstOrDefault(5)
			expect(result).to.equal(5)
		})
		it('returns fallback lastOrDefault for empty array', async () => {
			const array: Array<number> = []
			const result = array.lastOrDefault(5)
			expect(result).to.equal(5)
		})
		it('returns firstOrDefault', async () => {
			const array: Array<number> = [0, 1, 2]
			const result = array.firstOrDefault(5)
			expect(result).to.equal(0)
		})
		it('returns lastOrDefault', async () => {
			const array: Array<number> = [0, 1, 2]
			const result = array.lastOrDefault(5)
			expect(result).to.equal(2)
		})
	})
})
