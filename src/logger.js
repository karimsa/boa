/**
 * @file src/components/logger/index.ts
 * @copyright 2018-present HireFast Inc. All rights reserved.
 */

import * as Sentry from '@sentry/node'
import chalk from 'chalk'
import * as os from 'os'
import * as util from 'util'
import createDebug from 'debug'
import { createLogger, format, transports } from 'winston'

import * as Config from './config'

// Support for Node v8.x
util.formatWithOptions =
	util.formatWithOptions || ((_, ...args) => util.format(...args))

function colorLevel(label) {
	switch (label) {
		case 'info':
			return chalk.cyan(label)

		case 'verbose':
			return chalk.gray(label)

		case 'error':
			return chalk.red(label)

		case 'warn':
			return chalk.yellow(label)

		default:
			return label
	}
}

function doubleDigits(num) {
	if (num < 10) {
		return '0' + num
	}
	return String(num)
}

function printDate(date) {
	if (Config.isTestEnv) {
		return (
			doubleDigits(date.getMinutes()) +
			':' +
			doubleDigits(date.getSeconds()) +
			'.' +
			doubleDigits(Math.round(date.getMilliseconds() / 10))
		)
	}

	return date.toUTCString()
}

const reset = '\r\u001b[K\r'

const hostname = os.hostname()
const pid = process.pid

function SPrint(info) {
	let log = ''

	if (Config.isTestEnv) {
		log += reset
	}
	if (!Config.isTestEnv) {
		log += `[${hostname}] `
	}

	return `${log}${printDate(new Date())} [${pid}] ${colorLevel(info.level)}: ${
		info.message
	}`
}

function SPrintf(level, msg, ...args) {
	return SPrint({
		level,
		message: util.formatWithOptions(formatOpts, msg, ...args),
	})
}

const internalLogger = createLogger({
	format: format.printf(SPrint),
	level: Config.string('LoggingLevel', 'warn'),
	transports: [new transports.Console()],
})

const formatOpts = {
	colors: true,
	depth: 10,
}

/**
 * A winston-powered logger with `util.format()` powered message
 * formatting & convenience methods for errors and debugging.
 */
export const logger = {
	addTransport(transport) {
		internalLogger.add(transport)
	},

	/**
	 * Reports a non-fatal error to sentry & prints it to the logger.
	 * @param {String} msg message formatter
	 * @param {Error} err error object to report
	 * @param  {...any} args arguments to interpolate into the message
	 */
	error(msg, err, ...args) {
		if (err) {
			if (err instanceof Promise) {
				err.catch(errVal => this.error(msg, errVal))
				return
			}

			// Report the error
			if (Config.exists('Sentry.DSN')) {
				Sentry.captureException(err)
			}

			// Log it
			return internalLogger.error(
				util.formatWithOptions(
					formatOpts,
					`${msg}: ${String(err.stack || err)}`,
					...args,
				),
			)
		}

		internalLogger.error(msg)
	},

	warn: (msg, ...args) =>
		internalLogger.warn(util.formatWithOptions(formatOpts, msg, ...args)),
	info: (msg, ...args) =>
		internalLogger.info(util.formatWithOptions(formatOpts, msg, ...args)),
	verbose: (msg, ...args) =>
		internalLogger.verbose(util.formatWithOptions(formatOpts, msg, ...args)),

	/**
	 * Builds a log message, used internally by all logger functions.
	 * @param {Object} info object containing raw message details
	 * @param {String} info.level the level at which to log (warn, error, info, etc.)
	 * @param {String} info.message the pre-formatted message to log
	 */
	SPrint,

	/**
	 * @param {String} level the level at which to log (warn, error, info, etc.)
	 * @param {String} message message formatter
	 * @param {...any} args arguments to interpolate into the message
	 */
	SPrintf,

	/**
	 * Prints an info log to the logger if debugging is enabled for the namespace.
	 * @param {String} namespace a debug-package friendly namespace
	 * @param {String} msg message formatter
	 * @param  {...any} args arguments to interpolate into the message
	 */
	debug(namespace, msg, ...args) {
		if (createDebug.enabled(namespace)) {
			internalLogger.info(util.formatWithOptions(formatOpts, msg, ...args))
		}
	},

	/**
	 * Builds an error object using a formatted message.
	 * @param {String} message the message to use for the error
	 * @param  {...any} args any format arguments to be interpolated into the message
	 */
	errorf(message, ...args) {
		const err = new Error(util.formatWithOptions(formatOpts, message, ...args))
		Error.captureStackTrace(err, this.errorf)
		return err
	},

	/**
	 * Builds & throws an error object using a formatted message.
	 * @param {String} message the message to use for the error
	 * @param  {...any} args any format arguments to be interpolated into the message
	 */
	fatalf(msg, ...args) {
		const err = this.errorf(msg, ...args)
		Error.captureStackTrace(err, this.fatalf)
		throw err
	},
}

// Setup sentry if a valid DSN is available in the environment
if (Config.exists('Sentry.DSN')) {
	logger.verbose(`Initializing with sentry enabled`)

	Sentry.init({
		dsn: Config.string('Sentry.DSN'),
	})
} else if (Config.isTestEnv) {
	setImmediate(() => logger.verbose(`Initializing with sentry disabled`))
} else {
	logger.verbose(`Initializing with sentry disabled`)
}

// Just for convenience, it is useful to know what debug namespaces are enabled
// at application start
if (process.env.DEBUG) {
	logger.verbose(`Debug enabled for namespaces: %O`, process.env.DEBUG)
} else {
	logger.verbose(`Debug disabled`)
}
