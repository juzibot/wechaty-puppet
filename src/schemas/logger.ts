/**
 * LoggerLike — the minimal logging surface that Puppet expects.
 *
 * The signature intentionally mirrors `brolog` (the historical default) so
 * that any existing brolog-compatible logger drops in without adaptation.
 * The first argument is a module tag (e.g. 'PuppetCacheMixin'); everything
 * after that is a printf-style message and its arguments.
 *
 * This exists so upstream applications (multi-bot hosts, tests, custom
 * transports) can inject a per-instance logger via `PuppetOptions.logger`.
 */
export interface LoggerLike {
  info    (prefix: string, message: string, ...args: any[]): void
  warn    (prefix: string, message: string, ...args: any[]): void
  error   (prefix: string, message: string, ...args: any[]): void
  verbose (prefix: string, message: string, ...args: any[]): void
  silly   (prefix: string, message: string, ...args: any[]): void
}
