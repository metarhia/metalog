# Meta Logger for Metarhia

[![ci status](https://github.com/metarhia/metalog/workflows/Testing%20CI/badge.svg)](https://github.com/metarhia/metalog/actions?query=workflow%3A%22Testing+CI%22+branch%3Amaster)
[![snyk](https://snyk.io/test/github/metarhia/impress/badge.svg)](https://snyk.io/test/github/metarhia/impress)
[![npm version](https://img.shields.io/npm/v/metalog.svg?style=flat)](https://www.npmjs.com/package/metalog)
[![npm downloads/month](https://img.shields.io/npm/dm/metalog.svg)](https://www.npmjs.com/package/metalog)
[![npm downloads](https://img.shields.io/npm/dt/metalog.svg)](https://www.npmjs.com/package/metalog)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/metarhia/metalog/blob/master/LICENSE)

## Output example

<img src="https://user-images.githubusercontent.com/4405297/111154959-7b99c700-859c-11eb-81bb-0f8398535106.png" width="60%"/>

## Usage

```js
const logger = await Logger.create({
  path: './log', // absolute or relative path
  workerId: 7, // mark for process or thread
  writeInterval: 3000, // flush log to disk interval (default: 3s)
  writeBuffer: 64 * 1024, // buffer size (default: 64kb)
  keepDays: 5, // delete after N days, 0 - disable (default: 1)
  home: process.cwd(), // remove substring from paths
  json: false, // print logs in JSON format (default: false)
  crash: 'flush', // crash handling: 'flush' to flush buffer on exit (optional)
});

const { console } = logger;

console.log('Test message');
console.info('Info message');
console.warn('Warning message');
console.error('Error message');
console.debug('Debug message');

console.assert(true, 'Assertion passed');
console.assert(false, 'Assertion failed');
console.count('counter');
console.count('counter');
console.countReset('counter');

console.time('operation');
// ... some operation ...
console.timeEnd('operation');
console.timeLog('operation', 'Checkpoint');

console.group('Group 1');
console.log('Nested message');
console.groupCollapsed('Group 2');
console.log('Collapsed group message');
console.groupEnd();
console.groupEnd();

console.dir({ key: 'value' });
console.dirxml('<div>HTML content</div>');
console.table([
  { name: 'John', age: 30 },
  { name: 'Jane', age: 25 },
]);

console.trace('Trace message');

await logger.close();
```

## Console API Compatibility

Metalog provides a fully compatible console implementation that supports all Node.js console methods:

- `console.log([data][, ...args])` - General logging
- `console.info([data][, ...args])` - Informational messages
- `console.warn([data][, ...args])` - Warning messages
- `console.error([data][, ...args])` - Error messages
- `console.debug([data][, ...args])` - Debug messages
- `console.assert(value[, ...message])` - Assertion testing
- `console.clear()` - Clear the console
- `console.count([label])` - Count occurrences
- `console.countReset([label])` - Reset counter
- `console.dir(obj[, options])` - Object inspection
- `console.dirxml(...data)` - XML/HTML inspection
- `console.group([...label])` - Start group
- `console.groupCollapsed()` - Start collapsed group
- `console.groupEnd()` - End group
- `console.table(tabularData[, properties])` - Table display
- `console.time([label])` - Start timer
- `console.timeEnd([label])` - End timer
- `console.timeLog([label][, ...data])` - Log timer value
- `console.trace([message][, ...args])` - Stack trace

All methods maintain the same behavior as Node.js native console, with output routed through the metalog system for consistent formatting and file logging.

## License & Contributors

Copyright (c) 2017-2025 [Metarhia contributors](https://github.com/metarhia/metalog/graphs/contributors).
Metalog is [MIT licensed](./LICENSE).\
Metalog is a part of [Metarhia](https://github.com/metarhia) technology stack.
