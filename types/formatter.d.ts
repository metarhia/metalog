export class Formatter {
  constructor(home: string, workerId: number);

  home: string;
  workerId: number;

  public none(...args: any[]): any[];
  public pretty(type: string, ident: number, ...args: any[]): string;
  public file(type: string, ident: number, ...args: any[]): string;
  public json(type: string, ident: number, ...args: any[]): string;

  public format(type: string, ident: number, ...args: any[]): string;
  public normalizeStack(stack: string): string;
  public expandError(err: Error): { message: string; stack: string } & Error;
}
