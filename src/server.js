/**
 * @file src/server.js
 * @copyright 2019-present Karim Alibhai. All rights reserved.
 */

import * as http from 'http'
import * as url from 'url'
import { v4 as uuid } from 'uuid'
import cookie from 'node-cookie'

import * as Config from './config'
import * as Redis from './redis'
import { logger } from './logger'
import { Performance } from './perf'

const sessionRedis = Redis.createClient(Config.int('Redis.AuthenticationDB', 0))
const sessionKey = ({ token, sid }) =>
	Config.bool('Server.UseCookieSessions', false)
		? `user(${token}:${sid})`
		: `user(${token})`

export async function createSession(user, res) {
	const token = uuid()
	const sid = uuid()

	if (
		(await sessionRedis.set(
			sessionKey({ token, sid }),
			JSON.stringify({ userID: user._id }),
			'NX',
			'EX',
			String(60 * 60 * 24 * 7),
		)) !== null
	) {
		cookie.create(res, 'sid', sid, Config.Server.CookieSecret)

		await Performance.mark('user_login', {
			userID: user._id,
		})

		return {
			userID: user._id,
			token,
		}
	}

	throw new Error(`Internal server error`)
}

function parseURL(str) {
	return url.parse(str) // eslint-disable-line
}

export async function getSession(req) {
	const sid = Config.bool('Server.UseCookieSessions', false)
		? cookie.get(req, 'sid', Config.string('Server.CookieSecret'))
		: true
	const token = req.headers.authorization

	logger.debug('hf:auth', 'Received auth request => %O', { sid, token })
	if (sid && token) {
		const sessionStr = await sessionRedis.get(sessionKey({ token, sid }))
		logger.debug('hf:auth', 'Retrieved session for user => %O', sessionStr)
		if (sessionStr) {
			try {
				const body = JSON.parse(sessionStr)
				const { pathname, query } = parseURL(req.url)

				await Performance.markStart(pathname, {
					userID: body.userID,
					session: body,
					query,
				})

				return body
			} catch (err) {
				logger.warn(
					`Got non-JSON session from redis: %O - ${err.stack}`,
					sessionStr,
				)
			}
		}
	}

	throw new Unauthorized(`User is not authenticated`)
}

function stringify(object) {
	return Config.isProduction
		? JSON.stringify(object)
		: JSON.stringify(object, null, 2)
}

export function createServer({ routes }) {
	const router = new Map()
	for (const { method, pathname, run } of routes) {
		logger.verbose(`Adding route: ${method} ${pathname}`)
		router.set(`${method} ${pathname}`, run)
	}

	const server = http.createServer(async function(req, res) {
		const { pathname } = parseURL(req.url)
		const handler = router.get(`${req.method} ${pathname}`)
		if (handler) {
			try {
				const body = await handler(req, res)
				res.end(stringify(body))
			} catch (err) {
				res.statusCode = 500
				res.end(
					stringify({
						error: String(err),
					}),
				)
			}
		} else {
			res.statusCode = 404
			res.end('Not found')
		}
	})

	// For testing
	if (Config.isTestEnv) {
		return server
	}

	server.listen(Config.int('Port', 8080), () => {
		logger.info(`Started http server on :${server.address().port}`)
	})
}

export function route(method, pathname, fn, opts = {}) {
	return {
		method,
		pathname,
		async run(req, res) {
			try {
				res.setHeader('Content-Type', 'application/json')

				if (opts.noauth !== true) {
					req.session = await getSession(req)
				}

				req.params = function() {
					if (global.URL) {
						return new URL(req.url, Config.Server.PublicURL)
					}
					const { query } = url.parse(req.url, true) // eslint-disable-line
					return {
						searchParams: {
							entries: () => Object.entries(query),
							get: key => query[key],
							getAll: key =>
								!Array.isArray(query[key])
									? key in query
										? [query[key]]
										: []
									: query[key],
						},
					}
				}

				req.finished = false
				const timeout = setTimeout(() => {
					req.finished = true
					res.status(503)
					res.set('Content-Type', 'application/json')
					res.end('{"error":"Request timed out"}')
				}, Config.int('Server.Timeout', 10000))
				const data = await fn(req, res)
				clearTimeout(timeout)

				if (req.finished) {
					logger.warn(
						`Request timed out and then resolved with response => %O`,
						data,
					)
				} else {
					res.end(stringify(data))
				}
			} catch (err) {
				if (!req.finished) {
					res.statusCode = err.status || 500

					const errRes = {
						error: {
							message: err.message || String(err).split('\n')[0],
							stack: err.stack || String(err),
						},
					}
					res.end(
						Config.isProduction
							? JSON.stringify(errRes)
							: JSON.stringify(errRes, null, 2),
					)
				} else {
					logger.error(`Timed out request errored out later => ${err.stack}`)
				}
			}

			if (req.session) {
				const { pathname, query } = parseURL(req.url)
				await Performance.markEnd(pathname, {
					userID: req.session.userID,
					query,
					session: req.session,
				})
			}
		},
	}
}

export function json(req) {
	return new Promise((resolve, reject) => {
		let buffer = ''
		req.setEncoding('utf8')
		req.on('data', chunk => (buffer += chunk))
		req.on('end', () => {
			try {
				resolve(JSON.parse(buffer))
			} catch (err) {
				reject(err)
			}
		})
	})
}

export class APIError extends Error {
	constructor(message, status = 500) {
		super(message)
		this.status = status
	}
}

export class BadRequest extends APIError {
	constructor(message) {
		super(message, 400)
	}
}

export class NotFound extends APIError {
	constructor(message) {
		super(message, 404)
	}
}

export class Forbidden extends APIError {
	constructor(message) {
		super(message, 403)
	}
}

export class Unauthorized extends APIError {
	constructor(message) {
		super(message, 401)
	}
}

function typeOf(val) {
	if (val === null) {
		return 'null'
	}
	if (Array.isArray(val)) {
		return 'array'
	}
	return typeof val
}

export function typeCheck(types, values) {
	for (const param of Object.keys(values)) {
		const isMatch = types.reduce((match, type) => {
			return match && typeOf(values[param]) === type
		}, true)
		if (!isMatch) {
			throw new BadRequest(`Parameter ${param} is required`)
		}
	}
}

export function assertParams(params) {
	for (const key in params) {
		if (
			params.hasOwnProperty(key) &&
			(params[key] === undefined || params[key] === null)
		) {
			throw new BadRequest(`Parameter '${key}' is required`)
		}
	}
}
