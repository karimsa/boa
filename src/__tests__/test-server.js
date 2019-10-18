/**
 * @file tests/test-server.js
 * @copyright 2019-present Karim Alibhai. All rights reserved.
 */

import supertest from 'supertest'

import * as http from '../server'

test('should be able to create http servers', async () => {
	const app = supertest(
		http.createServer({
			routes: [
				http.route(
					'GET',
					'/test',
					() => ({
						blah: 'shizblah',
					}),
					{
						noauth: true,
					},
				),
				http.route('GET', '/protected', () => ({
					blah: 'shizblah',
				})),
				http.route(
					'GET',
					'/internal-error',
					() => Promise.reject(new Error('blahshizblah')),
					{
						noauth: true,
					},
				),
			],
		}),
	)

	expect((await app.get('/')).status).toBe(404)

	// unprotected
	const testRes = await app.get('/test')
	expect(testRes.status).toBe(200)
	expect(testRes.body).toEqual({
		blah: 'shizblah',
	})

	// protected
	const protectedBody = await app.get('/protected')
	expect(protectedBody.status).toBe(401)
	expect(protectedBody.body.error.message).toMatch(/not authenticated/)

	// internal error
	const internalErr = await app.get('/internal-error')
	expect(internalErr.status).toBe(500)
	expect(internalErr.body.error.message).toMatch(/blahshizblah/)
})
