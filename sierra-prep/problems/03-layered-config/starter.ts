import { check, checkThrows, suite } from '../../lib/check'

type Config = { [key: string]: unknown }   // arbitrarily nested objects, arrays, primitives

type MergeOptions = {
  arrays?: 'replace' | 'concat' | 'byId'
  nullDeletes?: boolean
}

export const DELETE = Symbol('config.delete')

export function resolveConfig(layers: Config[], options: MergeOptions = {}): Config {
  throw new Error('not implemented')
}

export function getPath(config: Config, path: string, fallback?: unknown): unknown {
  throw new Error('not implemented')
}

// `check` needs a value and an unimplemented function throws before it can produce one, so trap the
// throw and let the message show up as the failure.
function attempt<T>(fn: () => T): T | string {
  try {
    return fn()
  } catch (err) {
    return err instanceof Error ? err.message : String(err)
  }
}

const platform: Config = {
  model: 'sonnet',
  limits: { maxTurns: 20, timeoutMs: 30_000 },
  channels: ['web'],
  escalation: { rules: [{ id: 'r1', channel: 'email', after: 3 }] }
}
const org: Config = {
  limits: { maxTurns: 40 },
  channels: ['web', 'sms']
}
const agent: Config = {
  model: 'opus',
  escalation: { rules: [{ id: 'r2', channel: 'slack', after: 1 }], owner: 'support' }
}

suite('resolveConfig', () => {
  check('later layers win, objects merge deeply',
    attempt(() => resolveConfig([platform, org, agent])), {
      model: 'opus',
      limits: { maxTurns: 40, timeoutMs: 30_000 },
      channels: ['web', 'sms'],
      escalation: { rules: [{ id: 'r2', channel: 'slack', after: 1 }], owner: 'support' }
    })
  check('no layers', attempt(() => resolveConfig([])), {})
  check('one layer is copied, not returned',
    attempt(() => resolveConfig([platform]) === platform), false)
  check('nested objects are copied too',
    attempt(() => (resolveConfig([platform]).limits as Config) === (platform.limits as Config)), false)

  check('mutating the result leaves the defaults alone', attempt(() => {
    const merged = resolveConfig([platform, org])
    ;(merged.limits as Config).maxTurns = 999
    return (platform.limits as Config).maxTurns
  }), 20)

  check('arrays replace wholesale by default',
    attempt(() => resolveConfig([platform, org]).channels), ['web', 'sms'])
  check('arrays concatenate on request',
    attempt(() => resolveConfig([platform, org], { arrays: 'concat' }).channels),
    ['web', 'web', 'sms'])

  const base: Config = { rules: [{ id: 'r1', channel: 'email' }, { id: 'r2', channel: 'sms' }] }
  const patch: Config = { rules: [{ id: 'r2', channel: 'slack' }, { id: 'r3', channel: 'phone' }] }
  check('arrays merge by id on request',
    attempt(() => resolveConfig([base, patch], { arrays: 'byId' }).rules), [
      { id: 'r1', channel: 'email' },
      { id: 'r2', channel: 'slack' },
      { id: 'r3', channel: 'phone' }
    ])
  check('entries without an id are appended',
    attempt(() => resolveConfig([{ rules: [1, 2] }, { rules: [3] }], { arrays: 'byId' }).rules),
    [1, 2, 3])

  check('DELETE removes an inherited key',
    attempt(() => resolveConfig([platform, { limits: { timeoutMs: DELETE } }]).limits),
    { maxTurns: 20 })
  check('null is a real value by default',
    attempt(() => resolveConfig([platform, { model: null }]).model), null)
  check('null deletes when the option says so',
    attempt(() => resolveConfig([platform, { model: null }], { nullDeletes: true }).model), undefined)
  check('deleting a key that was never there is a no-op',
    attempt(() => resolveConfig([{ a: 1 }, { b: DELETE }])), { a: 1 })

  check('layers of different depth',
    attempt(() => resolveConfig([{ a: 1 }, { b: { c: { d: 2 } } }])), { a: 1, b: { c: { d: 2 } } })
  check('an object replaces a primitive',
    attempt(() => resolveConfig([{ a: 1 }, { a: { b: 2 } }])), { a: { b: 2 } })
  check('a primitive replaces an object',
    attempt(() => resolveConfig([{ a: { b: 2 } }, { a: 1 }])), { a: 1 })
  check('an array replaces an object',
    attempt(() => resolveConfig([{ a: { b: 2 } }, { a: [1] }])), { a: [1] })
  check('a Date is taken whole, not merged key by key',
    attempt(() => resolveConfig([{ at: new Date(0) }, {}]).at), new Date(0))

  const hostile = JSON.parse('{"__proto__": {"polluted": true}}') as Config
  check('a hostile __proto__ key is dropped',
    attempt(() => 'polluted' in resolveConfig([{ safe: 1 }, hostile])), false)
  check('Object.prototype is untouched',
    attempt(() => {
      resolveConfig([{ safe: 1 }, hostile])
      return ({} as Config).polluted
    }), undefined)
})

suite('getPath', () => {
  const cfg = attempt(() => resolveConfig([platform, org, agent]))
  const ready = typeof cfg === 'string' ? {} : cfg

  check('through an array index',
    attempt(() => getPath(ready, 'escalation.rules[0].channel')), 'slack')
  check('a nested scalar', attempt(() => getPath(ready, 'limits.maxTurns')), 40)
  check('a whole branch',
    attempt(() => getPath(ready, 'limits')), { maxTurns: 40, timeoutMs: 30_000 })
  check('a missing key returns the fallback',
    attempt(() => getPath(ready, 'escalation.missing', 'none')), 'none')
  check('a missing key with no fallback',
    attempt(() => getPath(ready, 'escalation.missing')), undefined)
  check('a path through a primitive returns the fallback',
    attempt(() => getPath(ready, 'model.nope', 'none')), 'none')
  check('an index past the end returns the fallback',
    attempt(() => getPath(ready, 'escalation.rules[7].channel', 'none')), 'none')
  check('a key present and undefined is not missing',
    attempt(() => getPath({ a: undefined }, 'a', 'none')), undefined)
  check('an empty path is the whole config', attempt(() => getPath({ a: 1 }, '')), { a: 1 })
})

// FOLLOW-UP 1: write resolveWithProvenance(layers) returning { config, sources }, then uncomment.
// suite('resolveWithProvenance', () => {
//   const { config, sources } = resolveWithProvenance([platform, org, agent])
//   check('the merge is unchanged', config.model, 'opus')
//   check('every surviving leaf names its layer', sources, new Map<string, number>([
//     ['model', 2],
//     ['limits.maxTurns', 1],
//     ['limits.timeoutMs', 0],
//     ['channels', 1],
//     ['escalation.rules', 2],
//     ['escalation.owner', 2]
//   ]))
//   check('a single layer owns everything',
//     resolveWithProvenance([{ a: { b: 1 } }]).sources, new Map([['a.b', 0]]))
//   check('no layers', resolveWithProvenance([]).sources, new Map())
// })

// FOLLOW-UP 2: write flatten(config) and diffConfigs(a, b), then uncomment.
// suite('diffConfigs', () => {
//   check('changed and replaced paths, sorted',
//     diffConfigs(resolveConfig([platform]), resolveConfig([platform, org])), [
//       { path: 'channels', before: ['web'], after: ['web', 'sms'] },
//       { path: 'limits.maxTurns', before: 20, after: 40 }
//     ])
//   check('an added path has no before',
//     diffConfigs({ a: 1 }, { a: 1, b: 2 }), [{ path: 'b', before: undefined, after: 2 }])
//   check('a removed path has no after',
//     diffConfigs({ a: 1, b: 2 }, { a: 1 }), [{ path: 'b', before: 2, after: undefined }])
//   check('equal arrays are not a change', diffConfigs({ a: [1, 2] }, { a: [1, 2] }), [])
//   check('identical configs', diffConfigs(platform, platform), [])
//   check('a key holding undefined differs from a missing key',
//     diffConfigs({ a: undefined }, {}), [{ path: 'a', before: undefined, after: undefined }])
// })

// FOLLOW-UP 3: write setPath(config, path, value), then uncomment.
// suite('setPath', () => {
//   const cfg = resolveConfig([platform, org, agent])
//   const next = setPath(cfg, 'escalation.rules[0].channel', 'phone')
//   check('the new value is in place', getPath(next, 'escalation.rules[0].channel'), 'phone')
//   check('the original is untouched', getPath(cfg, 'escalation.rules[0].channel'), 'slack')
//   check('untouched branches are shared', next.limits === cfg.limits, true)
//   check('the rewritten branch is a new object', next.escalation === cfg.escalation, false)
//   check('missing intermediate objects are created',
//     getPath(setPath(cfg, 'retry.backoff.ms', 250), 'retry.backoff.ms'), 250)
//   checkThrows('an empty path', () => setPath(cfg, '', 1), 'must not be empty')
//   checkThrows('an unsafe segment', () => setPath(cfg, 'a.__proto__.b', 1), 'unsafe path segment')
// })

// FOLLOW-UP 4: no new code. The two __proto__ checks in the core suite above are the test.
// Say out loud what a naive merge does with that layer and why JSON.parse lets it through.
