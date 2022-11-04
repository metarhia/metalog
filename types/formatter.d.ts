export class Formatter {
  constructor(home: string, workerId: string);

  home: string;
  workerId: string;

  public pretty(type: string, indent: number, ...args: any[]): string;
  public file(type: string, indent: number, ...args: any[]): string;
  public json(type: string, indent: number, ...args: any[]): string;

  public format(type: string, indent: number, ...args: any[]): string;
  public normalizeStack(stack: string): string;
  public expandError(err: Error): { message: string; stack: string } & Error;
}
