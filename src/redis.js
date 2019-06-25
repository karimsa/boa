/**
 * @file src/redis.js
 * @copyright 2019-present Karim Alibhai. All rights reserved.
 */

import Client from 'ioredis'

import * as Config from './config'
import { logger } from './logger'

const connections = new Map()

export function createClient(db) {
	// Do not allow usage of multiple DBs in test env
	if (Config.isTestEnv) {
		db = Config.int('Redis.TestRedisDB', 0)
	}

	const cachedClient = connections.get(db)
	if (cachedClient) {
		return cachedClient
	}

	const client = new Client({
		db,
		host: Config.string('Redis.Host', 'localhost'),
		password: Config.string('Redis.Password', ''),
		port: Config.int('Redis.Port', 6379),
		showFriendlyErrorStack: Config.bool('Redis.ShowFriendlyErrorStack', false),
		maxRetriesPerRequest: Config.int('Redis.MaxRetriesPerRequest', 3),
		enableOfflineQueue: false,
	})
	client.on('error', err => {
		logger.error(`Redis connection error`, err)
	})

	connections.set(db, client)
	return client
}
