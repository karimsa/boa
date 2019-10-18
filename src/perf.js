/**
 * @file src/perf.js
 * @copyright 2019-present Karim Alibhai. All rights reserved.
 */

import * as os from 'os'

import prettyTime from 'pretty-time'

import * as Config from './config'
import { logger } from './logger'

function mstime(ms) {
	const seconds = Math.floor(ms / 1000)
	const nanoseconds = (ms - seconds * 1000) * 1000000
	return prettyTime([seconds, nanoseconds])
}

// Start either the blocked or blocked-at module, depending on
// the environment to measure any latency caused by highly synchronous
// code blocks
if (Config.isProduction) {
	require('blocked')(
		delay => logger.warn(`Event loop blocked for ${mstime(delay)}`),
		{ threshold: Config.int('Perf.MaxEventLoopBlock', 100) },
	)
} else {
	require('blocked-at')(
		(delay, stack) =>
			logger.warn(
				`Event loop blocked for ${mstime(delay)} at: ${stack.join('\n')}`,
			),
		{ threshold: Config.int('Perf.MaxEventLoopBlock', 100) },
	)
}

/**
 * Simple API for monitoring performance.
 */

const observers = []
const transformers = []
const emitEvent = object => {
	const originalObject = object
	object.timestamp = Date.now()
	object.hostname = os.hostname()

	for (const fn of transformers) {
		object = fn(object)

		// Allow transformers to filter out events
		if (!object) {
			logger.debug(
				'boa:perf',
				`Dropping performance event due to transformer => %O`,
				originalObject,
			)
			return
		}
	}

	logger.debug('boa:perf', 'Emitting performance event: %O', object)
	return Promise.all(observers.map(fn => fn(object)))
}

export const Performance = {
	mark: (event, data) => emitEvent({ type: 'single_event', event, data }),

	markStart: (event, data) =>
		emitEvent({ type: 'duration_start', event, data }),
	markEnd: (event, data) => emitEvent({ type: 'duration_end', event, data }),

	transform: fn => transformers.push(fn),
	observe: fn => observers.push(fn),
}
