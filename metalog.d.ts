import { EventEmitter } from 'node:events';
import { InspectOptions } from 'node:util';

export type LogTag = 'log' | 'info' | 'warn' | 'debug' | 'error';

interface LoggerOptions {
  path: string;
  home?: string;
  workerId?: number;
  createStream?: (
    filePath: string,
    options?: { flags?: string },
  ) => NodeJS.WritableStream;
  writeBuffer?: number;
  flushInterval?: number;
  keepDays?: number;
  json?: boolean;
  toFile?: Array<LogTag>;
  toStdout?: Array<LogTag>;
  crash?: 'flush';
}

interface BufferedStreamOptions {
  stream: NodeJS.WritableStream;
  writeBuffer?: number;
  flushInterval?: number;
}

interface FormatterOptions {
  json?: boolean;
  worker?: string;
  home?: string;
}

export class BufferedStream extends EventEmitter {
  constructor(options: BufferedStreamOptions);
  write(buffer: Buffer): void;
  flush(callback?: (error?: Error) => void): void;
  close(): Promise<void>;
}

export class Formatter {
  constructor(options?: FormatterOptions);
  format(tag: LogTag, indent: number, args: unknown[]): string;
  formatPretty(tag: LogTag, indent: number, args: unknown[]): string;
  formatFile(tag: LogTag, indent: number, args: unknown[]): string;
  formatJson(tag: LogTag, indent: number, args: unknown[]): string;
  normalizeStack(stack?: string | null): string;
  expandError(error: Error): unknown;
}

export class Console {
  constructor(logger: Logger);
  assert(value: unknown, ...message: unknown[]): void;
  clear(): void;
  count(label?: string): void;
  countReset(label?: string): void;
  debug(data?: unknown, ...args: unknown[]): void;
  dir(obj: unknown, options?: InspectOptions): void;
  dirxml(...data: unknown[]): void;
  error(data?: unknown, ...args: unknown[]): void;
  group(...label: unknown[]): void;
  groupCollapsed(...label: unknown[]): void;
  groupEnd(): void;
  info(data?: unknown, ...args: unknown[]): void;
  log(data?: unknown, ...args: unknown[]): void;
  table(tabularData: unknown, properties?: string[]): void;
  time(label?: string): void;
  timeEnd(label?: string): void;
  timeLog(label?: string, ...data: unknown[]): void;
  trace(message?: unknown, ...args: unknown[]): void;
  warn(data?: unknown, ...args: unknown[]): void;
}

export class Logger extends EventEmitter {
  active: boolean;
  path: string;
  home?: string;
  console: Console;

  constructor(options: LoggerOptions);
  static create(options: LoggerOptions): Promise<Logger>;
  open(): Promise<Logger>;
  close(): Promise<void>;
  rotate(): Promise<void>;
  write(tag: LogTag, indent: number, args: unknown[]): void;
  flush(callback?: (error?: Error) => void): void;
}

export function nowDays(): number;
export function nameToDays(fileName: string): number;
