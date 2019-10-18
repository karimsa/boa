/**
 * @file src/config.js
 * @copyright 2019-present Karim Alibhai. All rights reserved.
 */

import createDebug from 'debug'

const debug = createDebug('boa:config')
const env = new Map()

function getValue(name) {
	if (env.has(name)) {
		return env.get(name)
	}

	const value = process.env[name]
	env.set(name, value)
	return value
}

function assertString(name) {
	const value = getValue(name)
	if (!value) {
		throw new Error(`Missing env variable: ${name}`)
	}
	return value
}

function getEnvName(name) {
	let castedName = ''
	for (let i = 0; i < name.length; i++) {
		if (name[i] === '.') {
			// Ignore dot, next letter should be uppercase and therefore
			// add an underscore anyways
		} else if (i !== 0 && name[i] === name[i].toUpperCase()) {
			castedName += '_' + name[i]
		} else {
			castedName += name[i].toUpperCase()
		}
	}
	debug(`Looking up ${castedName} in env (source: ${name})`)
	return castedName
}

// Env constants
export const NodeEnv = getValue('NODE_ENV') || 'development'
export const isTestEnv = NodeEnv === 'test'
export const isDevelopment = NodeEnv === 'development'
export const isProduction = NodeEnv === 'production'
export const isLocalEnv = getValue('NODE_ENV') !== 'production'

/**
 * Reads a environment variable from the env as a string.
 * @param {string} name name of the environment variable to read
 * @param {string?} defaultValue value to return if the environment variable does not exist
 */
export function string(name, defaultValue) {
	name = getEnvName(name)

	if (defaultValue === undefined) {
		return assertString(name)
	}
	return getValue(name) || defaultValue
}

/**
 * Reads a boolean environment variable.
 * @param {string} name name of the environment variable to read
 * @param {boolean} defaultValue value to return if the environment variable does not exist
 */
export function bool(name, defaultValue) {
	name = getEnvName(name)

	const value = defaultValue === undefined ? assertString(name) : getValue(name)

	if (value === undefined) {
		return defaultValue
	}

	if (value === 'true') {
		return true
	} else if (value === 'false') {
		return false
	}

	throw new Error(`Non-boolean value given for ${name} => ${value}`)
}

export function exists(name) {
	return getValue(name) !== undefined
}

/**
 * Reads a environment variable from the env as an integer.
 * @param {string} name name of the environment variable to read
 * @param {number?} defaultValue value to return if the environment variable does not exist
 */
export function int(name, defaultValue) {
	name = getEnvName(name)

	const str =
		defaultValue === undefined
			? assertString(name)
			: getValue(name) || String(defaultValue)
	const value = parseInt(str, 10)

	if (isNaN(value) || str !== String(value)) {
		throw new Error(
			`Env variable '${name}' must be a valid integer, not '${str}'`,
		)
	}

	return value
}
