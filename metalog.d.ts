import { EventEmitter } from 'node:events';

interface LoggerOptions {
  path: string;
  home: string;
  workerId?: number;
  createStream?: () => NodeJS.WritableStream;
  writeInterval: number;
  writeBuffer: number;
  keepDays: number;
  json?: boolean;
  toFile?: Array<string>;
  toStdout?: Array<string>;
  crash?: string;
}

interface Console {
  assert(assertion: unknown, ...args: unknown[]): void;
  clear(): void;
  count(label?: string): void;
  countReset(label?: string): void;
  debug(...args: unknown[]): void;
  dir(...args: unknown[]): void;
  trace(...args: unknown[]): void;
  info(...args: unknown[]): void;
  log(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  group(...args: unknown[]): void;
  groupCollapsed(...args: unknown[]): void;
  groupEnd(): void;
  table(tabularData: unknown): void;
  time(label?: string): void;
  timeEnd(label?: string): void;
  timeLog(label: string, ...args: unknown[]): void;
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
  json: boolean;
  stream: NodeJS.WritableStream;
  reopenTimer: NodeJS.Timer;
  flushTimer: NodeJS.Timer;
  lock: boolean;
  buffer: Array<Buffer>;
  bufferLength: number;
  file: string;
  toFile: Record<string, boolean>;
  fsEnabled: boolean;
  toStdout: Record<string, boolean>;
  console: Console;

  constructor(options: LoggerOptions);
  static create(options: LoggerOptions): Promise<Logger>;
  open(): Promise<Logger>;
  close(): Promise<void>;
  createLogDir(): Promise<void>;
  rotate(): Promise<void>;
  format(type: string, indent: number, ...args: unknown[]): string;
  formatPretty(type: string, indent: number, ...args: unknown[]): string;
  formatFile(type: string, indent: number, ...args: unknown[]): string;
  formatJson(type: string, indent: number, ...args: unknown[]): string;
  write(type: string, indent: number, ...args: unknown[]): void;
  flush(callback?: (err?: Error) => void): void;
  normalizeStack(stack: string): string;
  expandError(err: Error): unknown;
}
