<h1 align="center">boa</h1>

<p align="center">Tools for developing robust APIs.</p>

## Configuration

- **Read string environment variable**: `Config.string('Redis.Password')` - This will read the environment variable `REDIS_PASSWORD` and will error out if the value is empty.
- **Read string environment variable with default value**: `Config.string('Redis.Password', 'blah')` - This will try to read the environment variable `REDIS_PASSWORD` and will return `blah` if the value is empty.
- **Read integer environment variable**: `Config.int('Redis.Port')` - This will read the environment variable `REDIS_PORT` and try to cast it to an integer. If the casting fails or the value is empty, it will fail.

Preloaded variables:

- `Config.NodeEnv` -> `process.env.NODE_ENV`
- `Config.isTestEnv` -> `true` if `NODE_ENV` is set to `test`.
- `Config.isDevelopmentEnv` -> `true` if `NODE_ENV` is set to `development`.

## License

Licensed under MIT license.

Copyright (C) 2019-present Karim Alibhai.
