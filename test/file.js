'use strict';

const metatests = require('metatests');
const metalog = require('..');

const logger = metalog({
  path: './log',
  nodeId: 'S1N1',
  writeInterval: 3000,
  writeBuffer: 64 * 1024,
  keepDays: 5,
  stdout: []
});

metatests.test('logger.open', (test) => {
  logger.on('open', () => {
    test.end();
  });
  logger.on('error', (err) => {
    test.error(err);
    process.exit(1);
  });
});

metatests.test('logger.system', (test) => {
  logger.system('System test log message');
  test.end();
});

metatests.test('logger.fatal', (test) => {
  logger.fatal('Fatal test log message');
  test.end();
});

metatests.test('logger.error', (test) => {
  logger.error('Error test log message');
  test.end();
});

metatests.test('logger.warn', (test) => {
  logger.warn('Warning test log message');
  test.end();
});

metatests.test('logger.info', (test) => {
  logger.info('Info test log message');
  test.end();
});

metatests.test('logger.debug', (test) => {
  logger.debug('Debug test log message');
  test.end();
});

metatests.test('logger.slow', (test) => {
  logger.slow('Slow test log message');
  test.end();
});

metatests.test('logger write more then 60Mb', (test) => {
  logger.stdout.INFO = false;
  logger.removeAllListeners('open');
  const begin = process.hrtime();
  for (let i = 0; i < 1000000; i++) {
    logger.info('Write more then 60Mb logs, line: ' + i);
  }
  logger.close();
  logger.on('close', () => {
    const end = process.hrtime(begin);
    const time = end[0] * 1e9 + end[1];
    logger.open();
    logger.on('open', () => {
      logger.stdout.INFO = true;
      logger.info(time);
      test.end();
    });
  });
});

metatests.test('logger.close', (test) => {
  logger.removeAllListeners('close');
  console.log('close1');
  logger.close();
  logger.on('close', () => {
    console.log('close2');
    test.end();
  });
});

metatests.test('logger.close after close', (test) => {
  //logger.removeAllListeners('close');
  console.log('close3');
  logger.on('close', () => {
    console.log('close4');
    test.notOk();
  });
  console.log('close5');
  logger.close();
  console.log('close6');
  test.end();
});

metatests.test('logger.rotate', (test) => {
  logger.rotate();
  test.end();
});
