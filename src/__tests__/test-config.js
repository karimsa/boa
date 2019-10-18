/**
 * @file tests/test-config.js
 * @copyright 2019-present Karim Alibhai. All rights reserved.
 */

import * as Config from '../config'

test('should be able to read string variables from the env', () => {
	expect(() => Config.string('TestOne')).toThrow(/Missing/)

	process.env.TEST_APE = 'blah'
	expect(Config.string('TestApe')).toBe('blah')
})

test('should be able to read integer variables from the env', () => {
	// empty values are rejected
	expect(() => Config.int('TestTwo')).toThrow(/Missing/)

	// value should be parsed correctly
	process.env.TEST_APPLE = '152'
	expect(Config.int('TestApple')).toBe(152)

	// value should be cached
	process.env.TEST_APPLE = '1898948989389'
	expect(Config.int('TestApple')).toBe(152)

	// floats are not allowed
	process.env.TEST_THREE = '152.1434'
	expect(() => Config.int('TestThree')).toThrow(/must be a valid integer/)

	// letters are not allowed
	process.env.TEST_FOUR = 'kajejrfnkan'
	expect(() => Config.int('TestFour')).toThrow(/must be a valid integer/)
})
