'use strict';

const metatests = require('metatests');
const metalog = require('..');

const createLogger = () => {
  const logger = metalog({
    path: './log',
    node: 'S1N1',
    writeInterval: 3000,
    writeBuffer: 64 * 1024,
    keepDays: 5,
    toStdout: [],
  });
  const appLogger = logger.bind('app1');
  return { logger, appLogger };
};

metatests.test(
  'logger flow',
  test => {
    const { logger, appLogger } = createLogger();

    logger.on('error', err => {
      test.fail('logger error', err);
      logger.close();
    });

    logger.once('close', () => test.end());

    test.test('open', test => {
      logger.on('open', () => test.end());
      logger.open();
    });

    test.testSync('logger.system', () => {
      appLogger.system('System test log message');
    });

    test.testSync('logger.fatal', () => {
      appLogger.fatal('Fatal test log message');
    });

    test.testSync('logger.error', () => {
      appLogger.error('Error test log message');
    });

    test.testSync('logger.warn', () => {
      appLogger.warn('Warning test log message');
    });

    test.testSync('logger.info', () => {
      appLogger.info('Info test log message');
    });

    test.testSync('logger.debug', () => {
      appLogger.debug('Debug test log message');
    });

    test.testSync('logger.slow', () => {
      appLogger.slow('Slow test log message');
    });

    test.testSync('logger.db', () => {
      appLogger.db('Database test log message');
    });

    test.testSync('close', () => {
      logger.close();
    });
  },
  { dependentSubtests: true }
);

metatests.test('logger write more then 60Mb', test => {
  const { logger, appLogger } = createLogger();

  logger.open();
  const begin = process.hrtime();
  for (let i = 0; i < 1000000; i++) {
    appLogger.info('Write more then 60Mb logs, line: ' + i);
  }

  logger.once('close', () => {
    const end = process.hrtime(begin);
    test.log('time: ', end[0] * 1e9 + end[1]);
    test.end();
  });

  logger.close();
});

metatests.test('logger.close', test => {
  const { logger, appLogger } = createLogger();
  logger.open();
  appLogger.info('Info log message');
  logger.close();
  logger.once('close', () => test.end());
});

metatests.test('logger.close after close', test => {
  const { logger, appLogger } = createLogger();
  logger.open();
  appLogger.info('Info log message');
  logger.close();
  logger.once('close', () => {
    logger.removeAllListeners('close');
    logger.close();
    logger.on('close', test.mustNotCall());
    test.end();
  });
});

metatests.testSync('logger.rotate', test => {
  const { logger } = createLogger();
  logger.rotate();
  logger.once('close', () => test.end());
  logger.close();
});
