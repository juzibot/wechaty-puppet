import { FileBox }      from 'file-box'
import { Brolog }       from 'brolog'
import { MemoryCard }   from 'memory-card'
import { StateSwitch }  from 'state-switch'

import { packageJson } from './package-json.js'

import * as envVars from './env-vars.js'

const log = new Brolog()
const logLevel = process.env['WECHATY_LOG']
if (logLevel) {
  log.level(logLevel.toLowerCase() as any)
  log.silly('Puppet', 'Config: WECHATY_LOG set level to %s', logLevel)
}

const VERSION = packageJson.version || '0.0.0'
const NAME    = packageJson.name    || 'NONAME'
export const FOUR_PER_EM_SPACE = String.fromCharCode(0x2005)
export const STRING_SPLITTER = String.fromCharCode(0x1F)

export {
  envVars,
  FileBox,
  log,
  MemoryCard,
  NAME,
  StateSwitch,
  VERSION,
}
