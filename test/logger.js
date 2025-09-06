'use strict';

const test = require('node:test');
const { Logger } = require('..');

test('Logger basic functionality', async () => {
  const logger = await Logger.create({
    path: './log',
    home: process.cwd(),
    toStdout: ['info'],
    toFile: ['info'],
  });
  logger.write('info', 0, ['Test message']);
  await logger.flush();
  await logger.close();
});

test('Logger with different log tags', async () => {
  const logger = await Logger.create({
    path: './log',
    home: process.cwd(),
    toStdout: ['log', 'info', 'warn', 'error', 'debug'],
    toFile: ['log', 'info', 'warn', 'error', 'debug'],
  });
  logger.write('log', 0, ['Log message']);
  logger.write('info', 0, ['Info message']);
  logger.write('warn', 0, ['Warning message']);
  logger.write('error', 0, ['Error message']);
  logger.write('debug', 0, ['Debug message']);
  await logger.flush();
  await logger.close();
});

test('Logger JSON mode', async () => {
  const logger = await Logger.create({
    path: './log',
    home: process.cwd(),
    json: true,
    toStdout: ['info'],
    toFile: ['info'],
  });
  logger.write('info', 0, ['JSON test message']);
  await logger.flush();
  await logger.close();
});

test('Logger with custom workerId', async () => {
  const logger = await Logger.create({
    path: './log',
    home: process.cwd(),
    workerId: 42,
    toStdout: ['info'],
    toFile: ['info'],
  });
  logger.write('info', 0, ['Worker ID test']);
  await logger.flush();
  await logger.close();
});

test('Logger rotation', async () => {
  const logger = await Logger.create({
    path: './log',
    home: process.cwd(),
    keepDays: 1,
    toStdout: [],
    toFile: ['info'],
  });
  await logger.rotate();
  await logger.close();
});

test('Logger static create method', async () => {
  const logger = await Logger.create({
    path: './log',
    home: process.cwd(),
    toStdout: ['info'],
    toFile: ['info'],
  });

  logger.write('info', 0, ['Static create test']);
  await logger.flush();
  await logger.close();
});

test('Logger events', async () => {
  const logger = await Logger.create({
    path: './log',
    home: process.cwd(),
    toStdout: [],
    toFile: ['info'],
  });

  let closeEmitted = false;

  logger.on('close', () => {
    closeEmitted = true;
  });

  await logger.close();
  if (!closeEmitted) {
    throw new Error('Close event not emitted');
  }
});

test('Logger with crash handling', async () => {
  const logger = await Logger.create({
    path: './log',
    home: process.cwd(),
    crash: 'flush',
    toStdout: [],
    toFile: ['info'],
  });
  logger.write('info', 0, ['Crash handling test']);
  await logger.close();
});

test('Logger without file system', async () => {
  const logger = await Logger.create({
    path: './log',
    home: process.cwd(),
    toStdout: ['info'],
    toFile: [],
  });
  logger.write('info', 0, ['No file system test']);
  await logger.flush();
  await logger.close();
});

test('Logger with custom options', async () => {
  const logger = await Logger.create({
    path: './log',
    home: process.cwd(),
    flushInterval: 2000,
    writeBuffer: 32 * 1024,
    keepDays: 7,
    toStdout: ['info'],
    toFile: ['info'],
  });
  logger.write('info', 0, ['Custom options test']);
  await logger.flush();
  await logger.close();
});

test('Logger multiple open/close cycles', async () => {
  const logger = await Logger.create({
    path: './log',
    home: process.cwd(),
    toStdout: ['info'],
    toFile: ['info'],
  });
  logger.write('info', 0, ['First cycle']);
  await logger.close();

  await logger.open();
  logger.write('info', 0, ['Second cycle']);
  await logger.close();
});

test('Logger flush without buffer', async () => {
  const logger = await Logger.create({
    path: './log',
    home: process.cwd(),
    toStdout: ['info'],
    toFile: [],
  });
  await logger.flush();
  await logger.close();
});

test('Logger write with indentation', async () => {
  const logger = await Logger.create({
    path: './log',
    home: process.cwd(),
    toStdout: ['info'],
    toFile: ['info'],
  });
  logger.write('info', 0, ['No indent']);
  logger.write('info', 2, ['Two spaces indent']);
  logger.write('info', 4, ['Four spaces indent']);
  await logger.flush();
  await logger.close();
});
