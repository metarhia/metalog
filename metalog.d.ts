import { EventEmitter } from 'node:events';

interface LoggerOptions {
  path: string;
  home: string;
  workerId?: number;
  createStream?: () => NodeJS.WritableStream;
  writeBuffer?: number;
  flushInterval?: number;
  keepDays?: number;
  json?: boolean;
  toFile?: Array<string>;
  toStdout?: Array<string>;
  crash?: string;
}

interface BufferedStreamOptions {
  stream?: NodeJS.WritableStream;
  writeBuffer?: number;
  flushInterval?: number;
}

interface FormatterOptions {
  json?: boolean;
  worker?: string;
  home?: string;
}

export class BufferedStream extends EventEmitter {
  constructor(options?: BufferedStreamOptions);
  write(buffer: Buffer): void;
  flush(callback?: (error?: Error) => void): void;
  close(): Promise<void>;
}

export class Formatter {
  constructor(options?: FormatterOptions);
  format(tag: string, indent: number, args: unknown[]): string;
  formatPretty(tag: string, indent: number, args: unknown[]): string;
  formatFile(tag: string, indent: number, args: unknown[]): string;
  formatJson(tag: string, indent: number, args: unknown[]): string;
  normalizeStack(stack: string): string;
  expandError(error: Error): unknown;
}

export class Console {
  constructor(logger: Logger);
  assert(value: unknown, ...message: unknown[]): void;
  clear(): void;
  count(label?: string): void;
  countReset(label?: string): void;
  debug(data: unknown, ...args: unknown[]): void;
  dir(obj: unknown, options?: unknown): void;
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
  home: string;
  console: Console;

  constructor(options: LoggerOptions);
  static create(options: LoggerOptions): Promise<Logger>;
  open(): Promise<Logger>;
  close(): Promise<void>;
  rotate(): Promise<void>;
  write(tag: string, indent: number, args: unknown[]): void;
  flush(callback?: (error?: Error) => void): void;

  #options: LoggerOptions;
  #worker: string;
  #createStream: () => NodeJS.WritableStream;
  #keepDays: number;
  #stream: NodeJS.WritableStream | null;
  #rotationTimer: NodeJS.Timer | null;
  #file: string;
  #fsEnabled: boolean;
  #toFile: Record<string, boolean> | null;
  #toStdout: Record<string, boolean> | null;
  #buffer: BufferedStream | null;
  #formatter: Formatter;

  #createDir(): Promise<void>;
  #setupCrashHandling(): void;
}

export function nowDays(): number;
export function nameToDays(fileName: string): number;
