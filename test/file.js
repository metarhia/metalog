'use strict';

const metatests = require('metatests');
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

(async () => {
  const logger1 = await createLogger();
  const { console } = logger1;

  metatests.test('console.log', test => {
    console.log('Regular test log message');
    test.end();
  });

  metatests.test('console.info', test => {
    console.info('Info test log message');
    test.end();
  });

  metatests.test('console.warn', test => {
    console.warn('Warning test log message');
    test.end();
  });

  metatests.test('console.debug', test => {
    console.debug('Debug test log message');
    test.end();
  });

  metatests.test('console.error', test => {
    console.error('Error test log message');
    test.end();
  });

  setTimeout(() => {
    logger1.close();
  }, 500);

  metatests.test('logger write more then 60Mb', async test => {
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
      test.end();
    });
    await logger.close();
  });

  metatests.test('logger.close', async test => {
    const logger = await createLogger();
    logger.console.info('Info log message');
    await logger.close();
    test.end();
  });

  metatests.test('logger.close after close', async test => {
    const logger = await createLogger();
    logger.console.info('Info log message');
    await logger.close();
    await logger.close();
    test.end();
  });

  metatests.test('logger.rotate', async test => {
    const logger = await createLogger();
    logger.rotate();
    await logger.close();
    test.end();
  });

  metatests.test('Truncate paths in stack traces', async test => {
    const logger = await createLogger();
    const message = new Error('Example').stack;
    const msg = logger.normalizeStack(message);
    const dir = process.cwd();
    if (msg.includes(dir)) throw new Error('Path truncation error');
    await logger.close();
    test.end();
  });
})();
