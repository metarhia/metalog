# Meta Logger for Metarhia

[![ci status](https://github.com/metarhia/metalog/workflows/Testing%20CI/badge.svg)](https://github.com/metarhia/metalog/actions?query=workflow%3A%22Testing+CI%22+branch%3Amaster)
[![codacy](https://api.codacy.com/project/badge/Grade/7aaad5ed17c74634855fa6202a03a56e)](https://www.codacy.com/app/metarhia/metalog)
[![snyk](https://snyk.io/test/github/metarhia/impress/badge.svg)](https://snyk.io/test/github/metarhia/impress)
[![npm version](https://img.shields.io/npm/v/metalog.svg?style=flat)](https://www.npmjs.com/package/metalog)
[![npm downloads/month](https://img.shields.io/npm/dm/metalog.svg)](https://www.npmjs.com/package/metalog)
[![npm downloads](https://img.shields.io/npm/dt/metalog.svg)](https://www.npmjs.com/package/metalog)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/metarhia/metalog/blob/master/LICENSE)

## Output example

<img src="https://user-images.githubusercontent.com/4405297/111154959-7b99c700-859c-11eb-81bb-0f8398535106.png" width="60%"/>

## Usage

```js
const logger = await metalog.openLog({
  path: './log', // absolute or relative path
  workerId: 7, // mark for process or thread
  writeInterval: 3000, // flush log to disk interval
  writeBuffer: 64 * 1024, // buffer size (default 64kb)
  keepDays: 5, // delete after N days, 0 - disable
  home: process.cwd(), // remove substring from paths
});

const { console } = logger;
console.log('Test message');
await logger.close();
```

## License & Contributors

Copyright (c) 2017-2021 [Metarhia contributors](https://github.com/metarhia/metalog/graphs/contributors).
Metalog is [MIT licensed](./LICENSE).\
Metalog is a part of [Metarhia](https://github.com/metarhia) technology stack.
