import { Writable, LogType, Format } from './interfaces';

import EventEmitter = require('events');

export class FsWritable extends EventEmitter implements Writable {
  constructor(options: {
    path: string;
    workerId: string;

    createStream?: () => NodeJS.WritableStream;
    writeInterval?: number;
    writeBuffer?: number;
    keepDays?: number;
    format: Format;
    types: LogType[];
  });

  path: string;
  workerId: string;

  createStream: () => NodeJS.WritableStream;
  writeInterval: number;
  writeBuffer: number;
  keepDays: number;
  format: Format;
  types: LogType[];

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
