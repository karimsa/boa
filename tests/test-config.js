/**
 * @file tests/test-config.js
 * @copyright 2019-present Karim Alibhai. All rights reserved.
 */

import test from 'ava'

import { Config } from '../'

test('should be able to read string variables from the env', t => {
	const err = t.throws(() => Config.string('test'))
	t.regex(String(err), /Missing/)

	process.env.TEST = 'blah'
	t.is(Config.string('test'), 'blah')

	process.env.TEST = ''
})

test('should be able to read integer variables from the env', t => {
	const err = t.throws(() => Config.int('test'))
	t.regex(String(err), /Missing/)

	process.env.TEST = '152'
	t.is(Config.int('test'), 152)

	process.env.TEST = '152.1434'
	const intErr = t.throws(() => Config.int('test'))
	t.regex(String(intErr), /must be a valid integer/)

	process.env.TEST = ''
})
