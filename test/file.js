'use strict';

const test = require('node:test');
const metalog = require('..');

const createLogger = () =>
  metalog.openLog({
    path: './log',
    workerId: 3,
    writeInterval: 3000,
    writeBuffer: 64 * 1024,
    keepDays: 5,
    toStdout: [],
    home: process.cwd(),
  });

const run = async () => {
  const logger1 = await createLogger();
  const { console } = logger1;

  test('console.assert', () => {
    console.assert(false, 'Assert message: not passed');
  });

  test('console.count', () => {
    console.count('count-label');
  });

  test('console.countReset', () => {
    console.countReset('count-label');
  });

  test('console.debub', () => {
    console.debug('Test log message for console.debug', 'arg2');
  });

  test('console.dir', () => {
    console.dir('Test log message for console.dir', 'arg2');
  });

  test('console.error', () => {
    const err = new Error('Test log message for console.error');
    console.error(err);
  });

  test('console.group', () => {
    console.group('Test log message for console.group', 'arg2');
    console.groupCollapsed('Test log message for console.group', 'arg2');
    console.groupEnd();
  });

  test('console.info', () => {
    console.info('Test log message for console.info', 'arg2');
  });

  test('console.log', () => {
    console.log('Test log message for console.log', 'arg2');
  });

  test('console.table', () => {
    console.table([
      { a: 1, b: 2 },
      { a: 3, b: 4 },
    ]);
  });

  test('console.time', () => {
    console.time('time-label');
    console.timeEnd('time-label');
    console.timeLog('time-label', 'Test log message for console.timeLog');
  });

  test('console.trace', () => {
    console.trace('Test log message for console.trace', 'arg2');
  });

  test('console.warn', () => {
    console.warn('Test log message for console.warn', 'arg2');
  });

  setTimeout(() => {
    logger1.close();
  }, 500);

  test('logger write more then 60Mb', async () => {
    const logger = await createLogger();
    logger.toStdout.INFO = false;
    const begin = process.hrtime();
    for (let i = 0; i < 1000000; i++) {
      logger.console.info('Write more then 60Mb logs, line: ' + i);
    }
    logger.on('close', () => {
      const end = process.hrtime(begin);
      const time = end[0] * 1e9 + end[1];
      console.log({ time });
    });
    await logger.close();
  });

  test('logger.close', async () => {
    const logger = await createLogger();
    logger.console.info('Info log message');
    await logger.close();
  });

  test('logger.close after close', async () => {
    const logger = await createLogger();
    logger.console.info('Info log message');
    await logger.close();
    await logger.close();
  });

  test('logger.rotate', async () => {
    const logger = await createLogger();
    logger.rotate();
    await logger.close();
  });

  test('Truncate paths in stack traces', async () => {
    const logger = await createLogger();
    const message = new Error('Example').stack;
    const msg = logger.normalizeStack(message);
    const dir = process.cwd();
    if (msg.includes(dir)) throw new Error('Path truncation error');
    await logger.close();
  });
};

run();
