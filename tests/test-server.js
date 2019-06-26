/**
 * @file tests/test-server.js
 * @copyright 2019-present Karim Alibhai. All rights reserved.
 */

import test from 'ava'
import supertest from 'supertest'

import { http } from '../'

test('should be able to create http servers', async t => {
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

	t.is((await app.get('/')).status, 404)

	// unprotected
	const testRes = await app.get('/test')
	t.is(testRes.status, 200)
	t.deepEqual(testRes.body, {
		blah: 'shizblah',
	})

	// protected
	const protectedBody = await app.get('/protected')
	t.is(protectedBody.status, 401)
	t.regex(protectedBody.body.error.message, /not authenticated/)

	// internal error
	const internalErr = await app.get('/internal-error')
	t.is(internalErr.status, 500)
	t.regex(internalErr.body.error.message, /blahshizblah/)
})
