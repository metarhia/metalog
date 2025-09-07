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
  flushInterval: 3000, // flush log to disk interval (default: 3s)
  writeBuffer: 64 * 1024, // buffer size (default: 64kb)
  keepDays: 5, // delete after N days, 0 - disable (default: 1)
  home: process.cwd(), // remove substring from paths
  json: false, // print logs in JSON format (default: false)
  toFile: ['log', 'info', 'warn', 'error'], // tags to write to file (default: all)
  toStdout: ['log', 'info', 'warn', 'error'], // tags to write to stdout (default: all)
  createStream: () => fs.createWriteStream, // custom stream factory (optional)
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

## Configuration Options

### LoggerOptions

| Option          | Type       | Default                                     | Description                                         |
| --------------- | ---------- | ------------------------------------------- | --------------------------------------------------- |
| `path`          | `string`   | **required**                                | Directory path for log files (absolute or relative) |
| `home`          | `string`   | **required**                                | Base path to remove from stack traces               |
| `workerId`      | `number`   | `undefined`                                 | Worker/process identifier (appears as W0, W1, etc.) |
| `flushInterval` | `number`   | `3000`                                      | Flush buffer to disk interval in milliseconds       |
| `writeBuffer`   | `number`   | `65536`                                     | Buffer size threshold before flushing (64KB)        |
| `keepDays`      | `number`   | `1`                                         | Days to keep log files (0 = disable rotation)       |
| `json`          | `boolean`  | `false`                                     | Output logs in JSON format                          |
| `toFile`        | `string[]` | `['log', 'info', 'warn', 'debug', 'error']` | Log tags to write to file                           |
| `toStdout`      | `string[]` | `['log', 'info', 'warn', 'debug', 'error']` | Log tags to write to stdout                         |
| `createStream`  | `function` | `fs.createWriteStream`                      | Custom stream factory function                      |
| `crash`         | `string`   | `undefined`                                 | Crash handling mode ('flush' to flush on exit)      |

### Log Tags

Metalog supports five log tags that can be filtered independently for file and console output:

- `log` - General logging
- `info` - Informational messages
- `warn` - Warning messages
- `debug` - Debug messages
- `error` - Error messages

## Advanced Usage

### Custom Stream Factory

```js
const logger = await Logger.create({
  path: './log',
  home: process.cwd(),
  createStream: (filePath) => {
    // Custom compression stream
    const fs = require('fs');
    const zlib = require('zlib');
    const gzip = zlib.createGzip();
    const writeStream = fs.createWriteStream(filePath + '.gz');
    return gzip.pipe(writeStream);
  },
});
```

### Selective Logging

```js
// Only log errors to file, all tags to console
const logger = await Logger.create({
  path: './log',
  home: process.cwd(),
  toFile: ['error'],
  toStdout: ['log', 'info', 'warn', 'debug', 'error'],
});

// Only log info and above tags to both file and console
const logger = await Logger.create({
  path: './log',
  home: process.cwd(),
  toFile: ['info', 'warn', 'error'],
  toStdout: ['info', 'warn', 'error'],
});
```

### JSON Logging

```js
const logger = await Logger.create({
  path: './log',
  home: process.cwd(),
  json: true,
});

logger.console.info('User action', { userId: 123, action: 'login' });
// Output: {"timestamp":"2025-01-07T10:30:00.000Z","worker":"W0","tag":"info","message":"User action","userId":123,"action":"login"}
```

### Log Rotation and Cleanup

```js
const logger = await Logger.create({
  path: './log',
  home: process.cwd(),
  keepDays: 7, // Keep logs for 7 days
  workerId: 1,
});

// Manual rotation
await logger.rotate();

// Log files are automatically rotated daily
// Old files are cleaned up based on keepDays setting
```

### Error Handling

```js
const logger = await Logger.create({
  path: './log',
  home: process.cwd(),
  crash: 'flush', // Flush buffer on process exit
});

logger.on('error', (error) => {
  console.error('Logger error:', error.message);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await logger.close();
  process.exit(0);
});
```

## API Reference

### Logger Class

#### Constructor

```js
new Logger(options: LoggerOptions): Promise<Logger>
```

#### Static Methods

- `Logger.create(options: LoggerOptions): Promise<Logger>` - Create and open logger

#### Instance Methods

- `open(): Promise<Logger>` - Open log file and start logging
- `close(): Promise<void>` - Close logger and flush remaining data
- `rotate(): Promise<void>` - Manually trigger log rotation
- `write(tag: string, indent: number, args: unknown[]): void` - Low-level write method
- `flush(callback?: (error?: Error) => void): void` - Flush buffer to disk

#### Properties

- `active: boolean` - Whether logger is currently active
- `path: string` - Log directory path
- `home: string` - Home directory for path normalization
- `console: Console` - Console instance for logging

### BufferedStream Class

```js
const stream = new BufferedStream({
  stream: fs.createWriteStream('output.log'),
  writeBuffer: 32 * 1024, // 32KB buffer
  flushInterval: 5000, // 5 second flush interval
});

stream.write(Buffer.from('data'));
stream.flush();
await stream.close();
```

### Formatter Class

```js
const formatter = new Formatter({
  worker: 'W1',
  home: '/app',
  json: false,
});

const formatted = formatter.formatPretty('info', 0, ['Message']);
const jsonOutput = formatter.formatJson('error', 0, [error]);
```

## Best Practices

### Performance Optimization

1. **Buffer Size**: Adjust `writeBuffer` based on your log volume
   - High volume: 128KB or larger
   - Low volume: 16KB or smaller

2. **Flush Interval**: Balance between performance and data safety
   - Production: 3-10 seconds
   - Development: 1-3 seconds

3. **Selective Logging**: Use `toFile` and `toStdout` to reduce I/O
   ```js
   // Production: Only errors to file, warnings+ to console
   toFile: ['error'],
   toStdout: ['warn', 'error']
   ```

### Log Management

1. **Rotation Strategy**: Set appropriate `keepDays` based on storage
2. **Path Organization**: Use structured paths for multi-service deployments

   ```js
   path: `/var/log/app/${process.env.NODE_ENV}/${process.env.SERVICE_NAME}`;
   ```

3. **Error Handling**: Always handle logger errors
   ```js
   logger.on('error', (error) => {
     // Fallback logging or alerting
   });
   ```

### Development vs Production

```js
const isDevelopment = process.env.NODE_ENV === 'development';

const logger = await Logger.create({
  path: './log',
  home: process.cwd(),
  json: !isDevelopment, // JSON in production, pretty in dev
  toFile: isDevelopment ? ['log', 'info', 'warn', 'error'] : ['error'],
  toStdout: isDevelopment
    ? ['log', 'info', 'warn', 'debug', 'error']
    : ['warn', 'error'],
  flushInterval: isDevelopment ? 1000 : 5000,
  keepDays: isDevelopment ? 1 : 30,
});
```

## Troubleshooting

### Common Issues

**Logs not appearing in files:**

- Check `path` directory exists and is writable
- Verify `toFile` array includes desired log tags
- Ensure logger is properly opened with `await logger.open()`

**High memory usage:**

- Reduce `writeBuffer` size
- Increase `flushInterval` frequency
- Use selective logging with `toFile`/`toStdout`

**Missing logs on crash:**

- Set `crash: 'flush'` option
- Handle process signals properly
- Use try/catch around critical operations

**Performance issues:**

- Use JSON format for high-volume logging
- Disable file logging for debug tags in production
- Consider using separate loggers for different components

### Debug Mode

```js
// Enable debug logging
const logger = await Logger.create({
  path: './log',
  home: process.cwd(),
  toStdout: ['debug', 'info', 'warn', 'error'],
});

logger.console.debug('Debug information', { data: 'value' });
```

## License & Contributors

Copyright (c) 2017-2025 [Metarhia contributors](https://github.com/metarhia/metalog/graphs/contributors).
Metalog is [MIT licensed](./LICENSE).\
Metalog is a part of [Metarhia](https://github.com/metarhia) technology stack.
