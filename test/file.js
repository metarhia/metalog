'use strict';

const metatests = require('metatests');
const { Formatter } = require('../lib/formatter.js');
const { FsLogger } = require('../lib/fsLogger.js');
const metalog = require('..');

const createLogger = () =>
  metalog.openLog({
    path: './log',
    home: process.cwd(),
    workerId: 3,
    fs: {
      keepDays: 5,
      writeInterval: 3000,
      writeBuffer: 64 * 1024,
      types: ['log', 'info', 'warn', 'debug', 'error'],
    },
    stdout: {
      types: ['log', 'info', 'warn', 'debug', 'error'],
    },
  });

(async () => {
  const logger1 = await createLogger();
  const { console } = logger1;

  metatests.test('console.assert', (test) => {
    console.assert(false, 'Assert message: not passed');
    test.end();
  });

  metatests.test('console.count', (test) => {
    console.count('count-label');
    test.end();
  });

  metatests.test('console.countReset', (test) => {
    console.countReset('count-label');
    test.end();
  });

  metatests.test('console.debub', (test) => {
    console.debug('Test log message for console.debug', 'arg2');
    test.end();
  });

  metatests.test('console.dir', (test) => {
    console.dir('Test log message for console.dir', 'arg2');
    test.end();
  });

  metatests.test('console.error', (test) => {
    const err = new Error('Test log message for console.error');
    console.error(err);
    test.end();
  });

  metatests.test('console.group', (test) => {
    console.group('Test log message for console.group', 'arg2');
    console.groupCollapsed('Test log message for console.group', 'arg2');
    console.groupEnd();
    test.end();
  });

  metatests.test('console.info', (test) => {
    console.info('Test log message for console.info', 'arg2');
    test.end();
  });

  metatests.test('console.log', (test) => {
    console.log('Test log message for console.log', 'arg2');
    test.end();
  });

  metatests.test('console.table', (test) => {
    console.table([
      { a: 1, b: 2 },
      { a: 3, b: 4 },
    ]);
    test.end();
  });

  metatests.test('console.time', (test) => {
    console.time('time-label');
    console.timeEnd('time-label');
    console.timeLog('time-label', 'Test log message for console.timeLog');
    test.end();
  });

  metatests.test('console.trace', (test) => {
    console.trace('Test log message for console.trace', 'arg2');
    test.end();
  });

  metatests.test('console.warn', (test) => {
    console.warn('Test log message for console.warn', 'arg2');
    test.end();
  });

  setTimeout(() => {
    logger1.close();
  }, 500);

  metatests.test('logger write more then 60Mb', async (test) => {
    const logger = await metalog.openLog({
      path: './log',
      home: process.cwd(),
      workerId: 3,
      fs: {
        keepDays: 5,
        writeInterval: 3000,
        writeBuffer: 64 * 1024,
        types: ['log', 'info', 'warn', 'debug', 'error'],
      },
      stdout: {
        types: ['log', 'warn', 'debug', 'error'],
      },
    });
    const begin = process.hrtime();
    for (let i = 0; i < 1000000; i++) {
      logger.console.info('Write more then 60Mb logs, line: ' + i);
    }
    logger.on('close', () => {
      const end = process.hrtime(begin);
      const time = end[0] * 1e9 + end[1];
      console.log({ time });
      test.end();
    });
    await logger.close();
  });

  metatests.test('logger.close', async (test) => {
    const logger = await createLogger();
    logger.console.info('Info log message');
    await logger.close();
    test.end();
  });

  metatests.test('logger.close after close', async (test) => {
    const logger = await createLogger();
    logger.console.info('Info log message');
    await logger.close();
    await logger.close();
    test.end();
  });

  metatests.test('FsLogger.rotate', async (test) => {
    const logger = new FsLogger({
      path: './log',
      workerId: 3,
      writeInterval: 3000,
      writeBuffer: 64 * 1024,
      keepDays: 5,
    });
    await logger.open();
    logger.rotate();
    await logger.close();
    test.end();
  });

  metatests.test('Truncate paths in stack traces', (test) => {
    const home = process.cwd();
    const workerId = 0;
    const formatter = new Formatter(home, workerId);
    const message = new Error('Example').stack;
    const msg = formatter.normalizeStack(message);
    const dir = process.cwd();
    if (msg.includes(dir)) throw new Error('Path truncation error');
    test.end();
  });
})();
