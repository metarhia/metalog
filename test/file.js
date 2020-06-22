'use strict';

const metatests = require('metatests');
const metalog = require('..');

const createLogger = () =>
  metalog({
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

  metatests.test('logger.system', test => {
    logger1.system('System test log message');
    test.end();
  });

  metatests.test('logger.fatal', test => {
    logger1.fatal('Fatal test log message');
    test.end();
  });

  metatests.test('logger.error', test => {
    logger1.error('Error test log message');
    test.end();
  });

  metatests.test('logger.warn', test => {
    logger1.warn('Warning test log message');
    test.end();
  });

  metatests.test('logger.info', test => {
    logger1.info('Info test log message');
    test.end();
  });

  metatests.test('logger.debug', test => {
    logger1.debug('Debug test log message');
    test.end();
  });

  metatests.test('logger.slow', test => {
    logger1.slow('Slow test log message');
    test.end();
  });

  metatests.test('logger.db', test => {
    logger1.db('Database test log message');
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
      logger.info('Write more then 60Mb logs, line: ' + i);
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
    logger.info('Info log message');
    await logger.close();
    test.end();
  });

  metatests.test('logger.close after close', async test => {
    const logger = await createLogger();
    logger.info('Info log message');
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
