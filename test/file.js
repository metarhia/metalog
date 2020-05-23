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

  const logger2 = await createLogger();

  metatests.test('logger write more then 60Mb', test => {
    logger2.toStdout.INFO = false;
    const begin = process.hrtime();
    for (let i = 0; i < 1000000; i++) {
      logger2.info('Write more then 60Mb logs, line: ' + i);
    }
    logger2.close();
    logger2.on('close', () => {
      const end = process.hrtime(begin);
      const time = end[0] * 1e9 + end[1];
      console.log({ time });
      test.end();
    });
  });

  const logger3 = await createLogger();

  metatests.test('logger.close', test => {
    logger3.info('Info log message');
    logger3.on('close', () => {
      test.end();
    });
    logger3.close();
  });

  const logger4 = await createLogger();

  metatests.test('logger.close after close', test => {
    logger4.info('Info log message');
    logger4.close();
    logger4.on('close', () => {
      logger4.removeAllListeners('close');
      logger4.on('close', test.mustNotCall());
      logger4.close();
      test.end();
    });
  });

  const logger5 = await createLogger();

  metatests.test('logger.rotate', test => {
    logger5.rotate();
    logger5.close();
    test.end();
  });

  /*metatests.test('await metalog(options)', test => {
    createLogger().then(logger => {
      test.end();
      logger.close();
    });
  });*/

  /*metatests.test('await logger.close', test => {
    createLogger().then(logger => {
      logger.close().then(() => {
        test.end();
      });
    });
  });*/
})();
