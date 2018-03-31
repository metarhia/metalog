'use strict';

const tap = require('tap');
const metalog = require('..');

tap.test('stub', (test) => {
  const logger = metalog('./log', 'S1N1');
  logger.on('open', () => {
    logger.info('Test log message');
    logger.close();
  });
  logger.on('close', () => {
    test.end();
  });
});
