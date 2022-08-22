import EventEmitter = require('events');

import { LoggerInterface } from '../metalog';

export interface FsLoggerOptions {
  path: string;
  workerId: number;

  createStream?: () => NodeJS.WritableStream;
  writeInterval: number;
  writeBuffer: number;
  keepDays: number;
  logTypes: string[];
}

export class FsLogger extends EventEmitter implements LoggerInterface {
  constructor(options?: FsLoggerOptions);

  path: string;
  workerId: number;

  createStream: () => NodeJS.WritableStream;
  writeInterval: number;
  writeBuffer: number;
  keepDays: number;
  logTypes: string[];

  active: boolean;
  stream: null | NodeJS.WritableStream;
  reopenTimer: null | NodeJS.Timer;
  flushTimer: null | NodeJS.Timer;
  lock: boolean;
  buffer: Buffer[];
  file: string;

  public write(record: string): void;
  public open(): Promise<void>;
  public close(): Promise<void>;

  private rotate(): Promise<void>;
  private flush(callback: Function): void;
}
