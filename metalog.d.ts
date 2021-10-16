import EventEmitter = require('events');

interface LoggerOptions {
  path: string;
  home: string;
  workerId?: number;
  createStream?: () => NodeJS.WritableStream;
  writeInterval: number;
  writeBuffer: number;
  keepDays: number;
  toFile?: Array<string>;
  toStdout?: Array<string>;
}

export class Logger extends EventEmitter {
  active: boolean;
  path: string;
  workerId: string;
  createStream: () => NodeJS.WritableStream;
  writeInterval: number;
  writeBuffer: number;
  keepDays: number;
  home: string;
  stream: NodeJS.WritableStream;
  reopenTimer: NodeJS.Timer;
  flushTimer: NodeJS.Timer;
  lock: boolean;
  buffer: Array<Buffer>;
  file: string;
  toFile: Record<string, boolean>;
  fsEnabled: boolean;
  toStdout: Record<string, boolean>;
  console: Console;
  constructor(args: LoggerOptions);
  createLogDir(): Promise<void>;
  open(): Promise<Logger>;
  close(): Promise<void>;
  rotate(): Promise<void>;
  write(type: string, s: string): void;
  flush(callback: Function): void;
  normalizeStack(stack: string): string;
}

export function openLog(args: LoggerOptions): Promise<Logger>;
