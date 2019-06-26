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
				http.route('GET', '/test', () => ({
					blah: 'shizblah',
				})),
			],
		}),
	)

	t.is((await app.get('/')).status, 404)
	t.is((await app.get('/test')).status, 401)
})
