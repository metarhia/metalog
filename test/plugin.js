'use strict';

const metatests = require('metatests');
const { createClient } = require('redis');
const metalog = require('../metalog');

const { REDIS_HOST = '127.0.0.1', REDIS_PORT = 6379 } = process.env;

const redisClient = createClient({
  url: `redis://${REDIS_HOST}:${REDIS_PORT}`,
});

// writable using redis streams
const redisWritablePlugin = {
  on(event, callback) {
    redisClient.on(event, callback);
  },

  open() {
    return redisClient.connect();
  },

  write(...args) {
    const [type, indent, line] = args;
    redisClient
      .xAdd(`console:${type}`, '*', { ['indent' + indent]: line })
      .catch((err) => redisClient.emit('error', err));
  },

  close() {
    redisClient.removeAllListeners('error');
    return redisClient.disconnect();
  },

  types: ['log', 'info'],
};

const writables = [redisWritablePlugin];

metatests.test('Plugin: writable with redis', async (test) => {
  const logger = await metalog.openLog({
    path: './log',
    home: process.cwd(),
    workerId: 1,
    stdout: {
      types: ['log', 'warn', 'info', 'debug', 'error'],
    },
  });

  await logger.loadPlugin(writables);

  // write logs to redis and stdout
  logger.console.log('Write to redis and stdout');

  // read logs and process logs
  const [
    {
      messages: [{ id, message }],
    },
  ] = await redisClient.xRead([{ key: 'console:log', id: '0-0' }], {
    COUNT: 1,
    BLOCK: 1000,
  });
  const processed = JSON.stringify(message);
  const deleted = await redisClient.xDel('console:log', id);
  test.strictEqual(deleted, 1);
  test.strictEqual(processed, '{"indent0":"Write to redis and stdout"}');

  await logger.close();
  test.end();
});
