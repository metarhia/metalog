'use strict';

const metatests = require('metatests');
const { createClient } = require('redis');
const metalog = require('..');

metatests.test('Pluggable logger with instance', async (test) => {
  // logger for redis using streams
  const redisLogger = {
    client: createClient(),

    on(event, callback) {
      this.client.on(event, callback);
    },

    open() {
      this.client.on('error', (err) => this.client.emit('error', err));
      return this.client.connect();
    },

    write(args) {
      const [type, ident, line] = args;
      this.client
        .xAdd(`logger:${type}`, '*', { ['ident' + ident]: line })
        .catch((err) => this.client.emit('error', err));
    },

    close() {
      this.client.removeAllListeners('error');
      return this.client.disconnect();
    },
  };

  // metalog Logger instance with redis logger injected
  const logger = await metalog.openLog({
    path: './log',
    home: process.cwd(),
    workerId: 1,
    stdout: {
      logTypes: ['log', 'warn', 'info', 'debug', 'error'],
    },
    loggers: {
      redis: {
        instance: redisLogger,
        logTypes: ['log', 'info'],
      },
    },
  });

  // write logs to redis and stdout
  logger.console.log('Write to redis and stdout');

  // read logs and process logs
  const [
    {
      messages: [{ id, message }],
    },
  ] = await redisLogger.client.xRead([{ key: 'logger:log', id: '0-0' }], {
    COUNT: 1,
    BLOCK: 1000,
  });
  const processed = JSON.stringify(message);
  const deleted = await redisLogger.client.xDel('logger:log', id);
  test.strictEqual(deleted, 1);
  test.strictEqual(processed, '{"ident0":"Write to redis and stdout"}');

  await logger.close();
  test.end();
});