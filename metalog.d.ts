import { EventEmitter } from 'node:events';

interface LoggerOptions {
  path: string;
  home: string;
  workerId?: number;
  createStream?: () => NodeJS.WritableStream;
  writeInterval?: number;
  writeBuffer?: number;
  keepDays?: number;
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
  home: string;
  console: Console;

  constructor(options: LoggerOptions);
  static create(options: LoggerOptions): Promise<Logger>;
  get json(): boolean;
  open(): Promise<Logger>;
  close(): Promise<void>;
  rotate(): Promise<void>;
  write(type: string, indent: number, ...args: unknown[]): void;
  flush(callback?: (err?: Error) => void): void;

  #createStream: () => NodeJS.WritableStream;
  #writeInterval: number;
  #writeBuffer: number;
  #keepDays: number;
  #stream: NodeJS.WritableStream;
  #rotationTimer: NodeJS.Timer;
  #flushTimer: NodeJS.Timer;
  #flashing: boolean;
  #buffers: Array<Buffer>;
  #bufferedBytes: number;
  #file: string;
  #fsEnabled: boolean;
  #json: boolean;
  #toFile: Record<string, boolean>;
  #toStdout: Record<string, boolean>;

  #createLogDir(): Promise<void>;
  #format(type: string, indent: number, ...args: unknown[]): string;
  #formatPretty(type: string, indent: number, ...args: unknown[]): string;
  #formatFile(type: string, indent: number, ...args: unknown[]): string;
  #formatJson(type: string, indent: number, ...args: unknown[]): string;
  #normalizeStack(stack: string): string;
  #expandError(err: Error): unknown;
}
