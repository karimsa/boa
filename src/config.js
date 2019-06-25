/**
 * @file src/config.js
 * @copyright 2019-present Karim Alibhai. All rights reserved.
 */

function assertString(name) {
	const value = process.env[name]
	if (!value) {
		throw new Error(`Missing env variable: ${name}`)
	}
	return value
}

function getEnvName(name) {
	let castedName = ''
	for (let i = 0; i < name.length; i++) {
		if (name[i] === '.') {
			castedName += '_'
		} else if (i !== 0 && name[i] === name[i].toUpperCase()) {
			castedName += '_' + name[i]
		} else {
			castedName += name[i].toUpperCase()
		}
	}
	return castedName
}

// Env constants
export const NodeEnv = process.env.NODE_ENV || 'development'
export const isTestEnv = NodeEnv === 'test'
export const isDevelopment = NodeEnv === 'development'
export const isProduction = NodeEnv === 'production'
export const EnvTarget = isProduction
	? assertString('ENV_TARGET')
	: process.env.ENV_TARGET || 'development'
export const isLocalEnv =
	process.env.NODE_ENV !== 'production' || EnvTarget === 'local'

export const Config = {
	/**
	 * Reads a environment variable from the env as a string.
	 * @param {string} name name of the environment variable to read
	 * @param {string?} defaultValue value to return if the environment variable does not exist
	 */
	string(name, defaultValue) {
		name = getEnvName(name)

		if (defaultValue === undefined) {
			return assertString(name)
		}
		return process.env[name] || defaultValue
	},

	/**
	 * Reads a boolean environment variable.
	 * @param {string} name name of the environment variable to read
	 * @param {boolean} defaultValue value to return if the environment variable does not exist
	 */
	bool(name, defaultValue) {
		name = getEnvName(name)

		const value =
			defaultValue === undefined ? assertString(name) : process.env[name]

		if (value === undefined) {
			return defaultValue
		}

		if (value === 'true') {
			return true
		} else if (value === 'false') {
			return false
		}

		throw new Error(`Non-boolean value given for ${name} => ${value}`)
	},

	/**
	 * Reads a environment variable from the env as an integer.
	 * @param {string} name name of the environment variable to read
	 * @param {number?} defaultValue value to return if the environment variable does not exist
	 */
	int(name, defaultValue) {
		name = getEnvName(name)

		const str =
			defaultValue === undefined
				? assertString(name)
				: process.env[name] || defaultValue
		const value = parseInt(str, 10)

		if (isNaN(value) || str !== String(value)) {
			throw new Error(
				`Env variable '${name}' must be a valid integer, not '${str}'`,
			)
		}

		return value
	},
}
