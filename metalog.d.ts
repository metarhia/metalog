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
  workerId: string;
  home: string;
  console: Console;

  constructor(options: LoggerOptions);
  static create(options: LoggerOptions): Promise<Logger>;
  get json(): boolean;
  open(): Promise<Logger>;
  close(): Promise<void>;
  rotate(): Promise<void>;
  write(type: string, indent: number, args: unknown[]): void;
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

  #createDir(): Promise<void>;
  #format(type: string, indent: number, ...args: unknown[]): string;
  #formatPretty(type: string, indent: number, ...args: unknown[]): string;
  #formatFile(type: string, indent: number, ...args: unknown[]): string;
  #formatJson(type: string, indent: number, ...args: unknown[]): string;
  #normalizeStack(stack: string): string;
  #expandError(err: Error): unknown;
}
