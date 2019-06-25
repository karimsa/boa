/**
 * @file src/perf.js
 * @copyright 2019-present Karim Alibhai. All rights reserved.
 */

import prettyTime from 'pretty-time'

import { Config } from './config'
import { logger } from './logger'

// Start either the blocked or blocked-at module, depending on
// the environment to measure any latency caused by highly synchronous
// code blocks
if (Config.isProduction) {
	require('blocked')(
		delay => logger.warn(`Event loop blocked for ${prettyTime(delay * 1000)}`),
		{ threshold: Config.int('Perf.MaxEventLoopBlock', 100) },
	)
} else {
	require('blocked-at')(
		(delay, stack) =>
			logger.warn(
				`Event loop blocked for ${prettyTime(delay * 1000)} at: ${stack.join(
					'\n',
				)}`,
			),
		{ threshold: Config.int('Perf.MaxEventLoopBlock', 100) },
	)
}
