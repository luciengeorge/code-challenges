import { check, checkThrows, suite } from '../../lib/check'

type Step = {
  id: string
  dependsOn?: string[]
  durationMs?: number        // only used in follow-up 4
}

export function resolveOrder(steps: Step[]): string[] {
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

const skill: Step[] = [
  { id: 'publish', dependsOn: ['test', 'build'] },
  { id: 'build', dependsOn: ['install'] },
  { id: 'test', dependsOn: ['build'] },
  { id: 'install' },
  { id: 'changelog' }
]

suite('resolveOrder', () => {
  check('dependencies come first, ties alphabetical',
    attempt(() => resolveOrder(skill)), ['changelog', 'install', 'build', 'test', 'publish'])
  check('a single chain', attempt(() => resolveOrder([
    { id: 'c', dependsOn: ['b'] },
    { id: 'b', dependsOn: ['a'] },
    { id: 'a' }
  ])), ['a', 'b', 'c'])
  check('independent steps come out alphabetically',
    attempt(() => resolveOrder([{ id: 'zip' }, { id: 'alpha' }, { id: 'mid' }])),
    ['alpha', 'mid', 'zip'])
  check('empty input', attempt(() => resolveOrder([])), [])
  check('a repeated dependency is not a second edge',
    attempt(() => resolveOrder([{ id: 'b', dependsOn: ['a', 'a'] }, { id: 'a' }])), ['a', 'b'])

  checkThrows('unknown dependency',
    () => resolveOrder([{ id: 'b', dependsOn: ['ghost'] }]), 'unknown dependency')
  checkThrows('duplicate id',
    () => resolveOrder([{ id: 'a' }, { id: 'a' }]), 'duplicate step id')
  checkThrows('self dependency',
    () => resolveOrder([{ id: 'a', dependsOn: ['a'] }]), 'cycle detected')
  checkThrows('cycle of three', () => resolveOrder([
    { id: 'a', dependsOn: ['c'] },
    { id: 'b', dependsOn: ['a'] },
    { id: 'c', dependsOn: ['b'] }
  ]), 'cycle detected')
})

// FOLLOW-UP 1: write findCycle(steps), then uncomment.
// suite('findCycle', () => {
//   check('the actual path, not just a flag', findCycle([
//     { id: 'a', dependsOn: ['c'] },
//     { id: 'b', dependsOn: ['a'] },
//     { id: 'c', dependsOn: ['b'] }
//   ]), ['a', 'c', 'b', 'a'])
//   check('a self dependency is a cycle of length one',
//     findCycle([{ id: 'a', dependsOn: ['a'] }]), ['a', 'a'])
//   check('a shared dependency is not a cycle', findCycle(skill), null)
//   check('the lead-in is excluded from the path', findCycle([
//     { id: 'start' },
//     { id: 'a', dependsOn: ['start', 'b'] },
//     { id: 'b', dependsOn: ['a'] }
//   ]), ['a', 'b', 'a'])
//   check('empty input', findCycle([]), null)
// })

// FOLLOW-UP 2: write resolveBatches(steps), then uncomment.
// suite('resolveBatches', () => {
//   check('one batch per wave of ready steps', resolveBatches(skill), [
//     ['changelog', 'install'], ['build'], ['test'], ['publish']
//   ])
//   check('everything independent runs at once',
//     resolveBatches([{ id: 'b' }, { id: 'a' }, { id: 'c' }]), [['a', 'b', 'c']])
//   check('empty input', resolveBatches([]), [])
//   checkThrows('cycle', () => resolveBatches([{ id: 'a', dependsOn: ['a'] }]), 'cycle detected')
// })

// FOLLOW-UP 3: write resolveFor(steps, target), then uncomment.
// suite('resolveFor', () => {
//   check('transitive dependencies plus the target, nothing else',
//     resolveFor(skill, 'test'), ['install', 'build', 'test'])
//   check('a leaf target is just itself', resolveFor(skill, 'install'), ['install'])
//   check('an isolated target', resolveFor(skill, 'changelog'), ['changelog'])
//   check('the last target pulls in everything',
//     resolveFor(skill, 'publish'), ['install', 'build', 'test', 'publish'])
//   checkThrows('unknown target', () => resolveFor(skill, 'ghost'), 'unknown step')
// })

// FOLLOW-UP 4: write criticalPath(steps) returning { totalMs, path }, then uncomment.
// suite('criticalPath', () => {
//   const timed: Step[] = [
//     { id: 'install', durationMs: 100 },
//     { id: 'build', dependsOn: ['install'], durationMs: 300 },
//     { id: 'test', dependsOn: ['build'], durationMs: 200 },
//     { id: 'lint', dependsOn: ['install'], durationMs: 50 },
//     { id: 'publish', dependsOn: ['test', 'lint'], durationMs: 10 }
//   ]
//   check('the chain that sets the wall-clock time',
//     criticalPath(timed), { totalMs: 610, path: ['install', 'build', 'test', 'publish'] })
//   check('a missing durationMs counts as zero',
//     criticalPath([{ id: 'a', durationMs: 5 }, { id: 'b', dependsOn: ['a'] }]),
//     { totalMs: 5, path: ['a', 'b'] })
//   check('the longest branch wins, not the last one', criticalPath([
//     { id: 'root', durationMs: 1 },
//     { id: 'slow', dependsOn: ['root'], durationMs: 100 },
//     { id: 'quick', dependsOn: ['root'], durationMs: 2 }
//   ]), { totalMs: 101, path: ['root', 'slow'] })
//   check('empty input', criticalPath([]), { totalMs: 0, path: [] })
// })
