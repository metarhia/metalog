'use strict';

const test = require('node:test');
const { Console, Logger } = require('..');

test('Console basic methods', async () => {
  const logger = await Logger.create({
    path: './log',
    home: process.cwd(),
    toStdout: [],
    toFile: [],
  });

  const console = new Console(logger);

  console.assert(true, 'Should not throw');
  console.count('test-label');
  console.countReset('test-label');
  console.debug('Debug message');
  console.dir({ test: 'object' });
  console.dirxml('XML data');
  console.error('Error message');
  console.group('Group message');
  console.groupCollapsed('Collapsed group');
  console.groupEnd();
  console.info('Info message');
  console.log('Log message');
  console.table([{ a: 1, b: 2 }]);
  console.time('test-timer');
  console.timeEnd('test-timer');
  console.timeLog('test-timer', 'Timer log');
  console.trace('Trace message');
  console.warn('Warning message');
  console.clear();

  logger.close();
});

test('Console timing methods', async () => {
  const logger = await Logger.create({
    path: './log',
    home: process.cwd(),
    toStdout: [],
    toFile: [],
  });

  const console = new Console(logger);

  console.time('label1');
  console.time('label2');
  console.timeEnd('label1');
  console.timeLog('label2', 'Still running');
  console.timeEnd('label2');

  logger.close();
});

test('Console group nesting', async () => {
  const logger = await Logger.create({
    path: './log',
    home: process.cwd(),
    toStdout: [],
    toFile: [],
  });

  const console = new Console(logger);

  console.group('Level 1');
  console.log('Message 1');
  console.group('Level 2');
  console.log('Message 2');
  console.groupEnd();
  console.log('Message 3');
  console.groupEnd();

  logger.close();
});

test('Console assert with false condition', async () => {
  const logger = await Logger.create({
    path: './log',
    home: process.cwd(),
    toStdout: [],
    toFile: [],
  });

  const console = new Console(logger);

  console.assert(false, 'This should trigger an error log');
  console.assert(false);

  logger.close();
});

test('Console count with multiple labels', async () => {
  const logger = await Logger.create({
    path: './log',
    home: process.cwd(),
    toStdout: [],
    toFile: [],
  });

  const console = new Console(logger);

  console.count('label1');
  console.count('label1');
  console.count('label2');
  console.countReset('label1');
  console.count('label1');

  logger.close();
});

test('Console table with properties', async () => {
  const logger = await Logger.create({
    path: './log',
    home: process.cwd(),
    toStdout: [],
    toFile: [],
  });

  const console = new Console(logger);

  const data = [
    { name: 'John', age: 30, city: 'New York' },
    { name: 'Jane', age: 25, city: 'London' },
  ];

  console.table(data);
  console.table(data, ['name', 'age']);

  logger.close();
});

test('Console timeLog with non-existent label', async () => {
  const logger = await Logger.create({
    path: './log',
    home: process.cwd(),
    toStdout: [],
    toFile: [],
  });

  const console = new Console(logger);

  console.timeLog('non-existent-label', 'This should warn');

  logger.close();
});

test('Console trace with stack', async () => {
  const logger = await Logger.create({
    path: './log',
    home: process.cwd(),
    toStdout: [],
    toFile: [],
  });

  const console = new Console(logger);

  console.trace('Trace message with stack');

  logger.close();
});

test('Console dir with options', async () => {
  const logger = await Logger.create({
    path: './log',
    home: process.cwd(),
    toStdout: [],
    toFile: [],
  });

  const console = new Console(logger);

  const obj = { nested: { value: 42 } };
  console.dir(obj);
  console.dir(obj, { depth: 1 });

  logger.close();
});

test('Console groupEnd without group', async () => {
  const logger = await Logger.create({
    path: './log',
    home: process.cwd(),
    toStdout: [],
    toFile: [],
  });

  const console = new Console(logger);

  console.groupEnd();
  console.groupEnd();

  logger.close();
});

test('Console with different log tags', async () => {
  const logger = await Logger.create({
    path: './log',
    home: process.cwd(),
    toStdout: ['log', 'info', 'warn', 'error', 'debug'],
    toFile: [],
  });

  const console = new Console(logger);

  console.log('Log message');
  console.info('Info message');
  console.warn('Warning message');
  console.error('Error message');
  console.debug('Debug message');

  logger.close();
});
