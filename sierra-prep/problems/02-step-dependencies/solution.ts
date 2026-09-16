import { check, checkThrows, suite } from '../../lib/check'

type Step = {
  id: string
  dependsOn?: string[]
  durationMs?: number        // only used in follow-up 4
}

type Graph = {
  deps: Map<string, string[]>         // step -> what it waits for
  dependents: Map<string, string[]>   // step -> what waits for it
  indegree: Map<string, number>
}

// Time O(V log V + E) because of the heap tie-break, space O(V + E).
export function resolveOrder(steps: Step[]): string[] {
  const { dependents, indegree } = buildGraph(steps)

  // Alphabetical tie-break: a build order that changes between runs is miserable to debug.
  const ready = new MinHeap<string>(compareIds)
  for (const [id, degree] of indegree) {
    if (degree === 0) ready.push(id)
  }

  const order: string[] = []
  while (ready.size() > 0) {
    const id = ready.pop()!
    order.push(id)
    for (const dependent of dependents.get(id)!) {
      const remaining = indegree.get(dependent)! - 1
      indegree.set(dependent, remaining)
      if (remaining === 0) ready.push(dependent)
    }
  }

  // Fewer steps out than in means something never reached indegree 0, which is a cycle.
  if (order.length !== steps.length) throw new Error('cycle detected')
  return order
}

// Time O(V + E), space O(V + E).
function buildGraph(steps: Step[]): Graph {
  const deps = new Map<string, string[]>()
  const dependents = new Map<string, string[]>()
  const indegree = new Map<string, number>()

  for (const step of steps) {
    // Duplicate ids are a config bug; merging them silently would hide it.
    if (deps.has(step.id)) throw new Error(`duplicate step id: ${step.id}`)
    deps.set(step.id, step.dependsOn ?? [])
    dependents.set(step.id, [])
    indegree.set(step.id, 0)
  }

  for (const step of steps) {
    for (const dependency of deps.get(step.id)!) {
      // An unknown dependency is a typo. Failing loudly beats running a partial skill.
      if (!dependents.has(dependency)) {
        throw new Error(`unknown dependency: ${step.id} depends on ${dependency}`)
      }
      dependents.get(dependency)!.push(step.id)
      indegree.set(step.id, indegree.get(step.id)! + 1)
    }
  }

  return { deps, dependents, indegree }
}

// Codepoint order, not localeCompare, so the order does not depend on the runtime's locale.
function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

class MinHeap<T> {
  private items: T[] = []

  constructor(private readonly cmp: (a: T, b: T) => number) {}

  size(): number {
    return this.items.length
  }

  push(item: T): void {
    this.items.push(item)
    let child = this.items.length - 1
    while (child > 0) {
      const parent = (child - 1) >> 1
      if (this.cmp(this.items[parent], this.items[child]) <= 0) break
      this.swap(parent, child)
      child = parent
    }
  }

  pop(): T | undefined {
    if (this.items.length === 0) return undefined
    const root = this.items[0]
    const last = this.items.pop()!
    if (this.items.length === 0) return root

    this.items[0] = last
    let parent = 0
    while (true) {
      const left = 2 * parent + 1
      const right = left + 1
      let smallest = parent
      if (left < this.items.length && this.cmp(this.items[left], this.items[smallest]) < 0) smallest = left
      if (right < this.items.length && this.cmp(this.items[right], this.items[smallest]) < 0) smallest = right
      if (smallest === parent) break
      this.swap(parent, smallest)
      parent = smallest
    }
    return root
  }

  private swap(a: number, b: number): void {
    const tmp = this.items[a]
    this.items[a] = this.items[b]
    this.items[b] = tmp
  }
}

// ---- Follow-up 1: report the cycle path ----

// Time O(V + E), space O(V) including the recursion stack. The path runs in dependency direction:
// ['a', 'c', 'b', 'a'] means a waits for c, c waits for b, b waits for a.
export function findCycle(steps: Step[]): string[] | null {
  const { deps } = buildGraph(steps)
  const state = new Map<string, 'active' | 'done'>()
  const path: string[] = []

  // Recursive here for brevity; a skill with thousands of chained steps wants an explicit stack.
  function visit(id: string): string[] | null {
    state.set(id, 'active')
    path.push(id)
    for (const dependency of deps.get(id)!) {
      // Hitting a step still on the active path closes a cycle.
      if (state.get(dependency) === 'active') {
        return [...path.slice(path.indexOf(dependency)), dependency]
      }
      if (!state.has(dependency)) {
        const cycle = visit(dependency)
        if (cycle !== null) return cycle
      }
    }
    path.pop()
    state.set(id, 'done')
    return null
  }

  for (const id of deps.keys()) {
    if (state.has(id)) continue
    const cycle = visit(id)
    if (cycle !== null) return cycle
  }
  return null
}

// ---- Follow-up 2: parallel batches ----

// Time O(V log V + E), space O(V + E). Every step in batch i can run at once, after batch i - 1.
export function resolveBatches(steps: Step[]): string[][] {
  const { dependents, indegree } = buildGraph(steps)

  let ready = [...indegree.keys()].filter(id => indegree.get(id) === 0).sort(compareIds)
  const batches: string[][] = []
  let scheduled = 0

  while (ready.length > 0) {
    batches.push(ready)
    scheduled += ready.length
    // Drain the whole level at once; newly freed steps belong to the next batch, not this one.
    const next: string[] = []
    for (const id of ready) {
      for (const dependent of dependents.get(id)!) {
        const remaining = indegree.get(dependent)! - 1
        indegree.set(dependent, remaining)
        if (remaining === 0) next.push(dependent)
      }
    }
    ready = next.sort(compareIds)
  }

  if (scheduled !== steps.length) throw new Error('cycle detected')
  return batches
}

// ---- Follow-up 3: run only what a target needs ----

// Time O(V log V + E), space O(V + E): reachability backwards from the target, then the same sort.
export function resolveFor(steps: Step[], target: string): string[] {
  const { deps } = buildGraph(steps)
  if (!deps.has(target)) throw new Error(`unknown step: ${target}`)

  const needed = new Set<string>()
  const stack = [target]
  while (stack.length > 0) {
    const id = stack.pop()!
    if (needed.has(id)) continue
    needed.add(id)
    for (const dependency of deps.get(id)!) stack.push(dependency)
  }

  // The needed set is closed under dependsOn, so the filtered list still validates.
  return resolveOrder(steps.filter(step => needed.has(step.id)))
}

// ---- Follow-up 4: critical path ----

type CriticalPath = { totalMs: number, path: string[] }

// Time O(V log V + E), space O(V). Longest path on a DAG, which is only easy because a topological
// order lets each step read its dependencies' finish times before it needs its own.
export function criticalPath(steps: Step[]): CriticalPath {
  const order = resolveOrder(steps)
  const { deps } = buildGraph(steps)
  const duration = new Map(steps.map(step => [step.id, step.durationMs ?? 0]))
  const finish = new Map<string, number>()
  const parent = new Map<string, string | null>()

  for (const id of order) {
    let readyAt = 0
    let from: string | null = null
    for (const dependency of deps.get(id)!) {
      const candidate = finish.get(dependency)!
      // Alphabetical tie-break again, so the reported chain is stable.
      if (from === null || candidate > readyAt || (candidate === readyAt && compareIds(dependency, from) < 0)) {
        readyAt = candidate
        from = dependency
      }
    }
    finish.set(id, readyAt + duration.get(id)!)
    parent.set(id, from)
  }

  let end: string | null = null
  let totalMs = 0
  for (const id of order) {
    const value = finish.get(id)!
    // On a tie take the step later in topological order: same finish time, longer chain to report.
    if (end === null || value >= totalMs) {
      totalMs = value
      end = id
    }
  }

  const path: string[] = []
  for (let id: string | null = end; id !== null; id = parent.get(id) ?? null) {
    path.push(id)
  }
  return { totalMs, path: path.reverse() }
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
    resolveOrder(skill), ['changelog', 'install', 'build', 'test', 'publish'])
  check('a single chain', resolveOrder([
    { id: 'c', dependsOn: ['b'] },
    { id: 'b', dependsOn: ['a'] },
    { id: 'a' }
  ]), ['a', 'b', 'c'])
  check('independent steps come out alphabetically',
    resolveOrder([{ id: 'zip' }, { id: 'alpha' }, { id: 'mid' }]), ['alpha', 'mid', 'zip'])
  check('empty input', resolveOrder([]), [])
  check('a repeated dependency is not a second edge',
    resolveOrder([{ id: 'b', dependsOn: ['a', 'a'] }, { id: 'a' }]), ['a', 'b'])

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

suite('findCycle', () => {
  check('the actual path, not just a flag', findCycle([
    { id: 'a', dependsOn: ['c'] },
    { id: 'b', dependsOn: ['a'] },
    { id: 'c', dependsOn: ['b'] }
  ]), ['a', 'c', 'b', 'a'])
  check('a self dependency is a cycle of length one',
    findCycle([{ id: 'a', dependsOn: ['a'] }]), ['a', 'a'])
  check('a shared dependency is not a cycle', findCycle(skill), null)
  check('the lead-in is excluded from the path', findCycle([
    { id: 'start' },
    { id: 'a', dependsOn: ['start', 'b'] },
    { id: 'b', dependsOn: ['a'] }
  ]), ['a', 'b', 'a'])
  check('empty input', findCycle([]), null)
})

suite('resolveBatches', () => {
  check('one batch per wave of ready steps', resolveBatches(skill), [
    ['changelog', 'install'], ['build'], ['test'], ['publish']
  ])
  check('everything independent runs at once',
    resolveBatches([{ id: 'b' }, { id: 'a' }, { id: 'c' }]), [['a', 'b', 'c']])
  check('empty input', resolveBatches([]), [])
  checkThrows('cycle', () => resolveBatches([{ id: 'a', dependsOn: ['a'] }]), 'cycle detected')
})

suite('resolveFor', () => {
  check('transitive dependencies plus the target, nothing else',
    resolveFor(skill, 'test'), ['install', 'build', 'test'])
  check('a leaf target is just itself', resolveFor(skill, 'install'), ['install'])
  check('an isolated target', resolveFor(skill, 'changelog'), ['changelog'])
  check('the last target pulls in everything',
    resolveFor(skill, 'publish'), ['install', 'build', 'test', 'publish'])
  checkThrows('unknown target', () => resolveFor(skill, 'ghost'), 'unknown step')
})

suite('criticalPath', () => {
  const timed: Step[] = [
    { id: 'install', durationMs: 100 },
    { id: 'build', dependsOn: ['install'], durationMs: 300 },
    { id: 'test', dependsOn: ['build'], durationMs: 200 },
    { id: 'lint', dependsOn: ['install'], durationMs: 50 },
    { id: 'publish', dependsOn: ['test', 'lint'], durationMs: 10 }
  ]
  check('the chain that sets the wall-clock time',
    criticalPath(timed), { totalMs: 610, path: ['install', 'build', 'test', 'publish'] })
  check('a missing durationMs counts as zero',
    criticalPath([{ id: 'a', durationMs: 5 }, { id: 'b', dependsOn: ['a'] }]),
    { totalMs: 5, path: ['a', 'b'] })
  check('the longest branch wins, not the last one', criticalPath([
    { id: 'root', durationMs: 1 },
    { id: 'slow', dependsOn: ['root'], durationMs: 100 },
    { id: 'quick', dependsOn: ['root'], durationMs: 2 }
  ]), { totalMs: 101, path: ['root', 'slow'] })
  check('empty input', criticalPath([]), { totalMs: 0, path: [] })
})
