/**
 * LoggerLike — the minimal logging surface that Puppet expects.
 *
 * The signature intentionally mirrors `brolog` (the historical default) so
 * that any existing brolog-compatible logger drops in without adaptation.
 * The first argument is conventionally a module tag (e.g. 'PuppetCacheMixin'),
 * followed by an optional printf-style message and its arguments — but a
 * single-argument form (`log.warn('bad payload')`) is also accepted, matching
 * how brolog is used across the wechaty codebase.
 *
 * This exists so upstream applications (multi-bot hosts, tests, custom
 * transports) can inject a per-instance logger via `PuppetOptions.logger`.
 */
export interface LoggerLike {
  info    (msgOrPrefix: string, ...args: any[]): void
  warn    (msgOrPrefix: string, ...args: any[]): void
  error   (msgOrPrefix: string, ...args: any[]): void
  verbose (msgOrPrefix: string, ...args: any[]): void
  silly   (msgOrPrefix: string, ...args: any[]): void
}
