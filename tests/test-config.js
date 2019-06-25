/**
 * @file tests/test-config.js
 * @copyright 2019-present Karim Alibhai. All rights reserved.
 */

import test from 'ava'

import { Config } from '../'

test('should be able to read string variables from the env', t => {
	const err = t.throws(() => Config.string('TestOne'))
	t.regex(String(err), /Missing/)

	process.env.TEST_ONE = 'blah'
	t.is(Config.string('TestOne'), 'blah')
})

test('should be able to read integer variables from the env', t => {
	// empty values are rejected
	const err = t.throws(() => Config.int('TestTwo'))
	t.regex(String(err), /Missing/)

	// value should be parsed correctly
	process.env.TEST_TWO = '152'
	t.is(Config.int('TestTwo'), 152)

	// value should be cached
	process.env.TEST_TWO = '1898948989389'
	t.is(Config.int('TestTwo'), 152)

	// floats are not allowed
	process.env.TEST_THREE = '152.1434'
	const intErr = t.throws(() => Config.int('TestThree'))
	t.regex(String(intErr), /must be a valid integer/)

	// letters are not allowed
	process.env.TEST_FOUR = 'kajejrfnkan'
	const letterErr = t.throws(() => Config.int('TestFour'))
	t.regex(String(letterErr), /must be a valid integer/)
})
