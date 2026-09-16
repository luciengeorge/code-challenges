import { check, suite } from '../lib/check'

export type AgentEvent =
  | { type: 'agent.started'; agentId: string }
  | { type: 'agent.paused'; agentId: string; reason: string }
  | { type: 'conversation.message'; conversationId: string; text: string }
  | { type: 'conversation.closed'; conversationId: string; resolved: boolean }

export function assertNever(x: never): never {
  throw new Error('Unhandled event')
}

export function eventCategory(event: AgentEvent): string {
  switch (event.type) {
    case 'agent.started':
      return 'started'
    case 'agent.paused':
      return event.reason
    case 'conversation.message':
      return event.text
    case 'conversation.closed':
      return event.resolved ? 'resolved' : 'unresolved'
    default:
      // A new union member makes event non-never here, causing a compile error.
      return assertNever(event)
  }
}

export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function hasKey<T extends object, K extends PropertyKey>(
  value: T,
  key: K
): value is T & Record<K, unknown> {
  // Call the prototype method: the input might shadow hasOwnProperty.
  return Object.prototype.hasOwnProperty.call(value, key)
}

export type MyPick<T, K extends keyof T> = { [P in K]: T[P] }
export type MyPartial<T> = { [P in keyof T]?: T[P] }

export const agentStates = ['idle', 'busy', 'offline'] as const
export type AgentState = (typeof agentStates)[number]

export type Agent = {
  id: string
  name: string
  state: AgentState
  handled: number
}

export type AgentPatch = Partial<Agent>
export type AgentSummary = Pick<Agent, 'id' | 'state'>
export type NewAgent = Omit<Agent, 'id'>
export type AgentSnapshot = Readonly<Agent>

export type QueueConfig = {
  mode: 'fifo' | 'priority'
  retries: number
}

// Time O(n), space O(n) for the returned array.
export function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
  return items.map(item => item[key])
}

suite('discriminated unions and exhaustive switches', () => {
  check('started event', eventCategory({ type: 'agent.started', agentId: 'a1' }), 'started')
  check('paused event narrows to reason', eventCategory({
    type: 'agent.paused', agentId: 'a1', reason: 'break'
  }), 'break')
  check('message event narrows to text', eventCategory({
    type: 'conversation.message', conversationId: 'c1', text: 'Hello'
  }), 'Hello')
  check('resolved conversation', eventCategory({
    type: 'conversation.closed', conversationId: 'c1', resolved: true
  }), 'resolved')
  check('unresolved conversation', eventCategory({
    type: 'conversation.closed', conversationId: 'c2', resolved: false
  }), 'unresolved')
})

suite('type guards preserve narrowing', () => {
  const mixed: (number | null | undefined)[] = [0, 2, null, undefined, 4]
  // The `value is T` return type lets filter return number[], not a nullable array.
  const numbers: number[] = mixed.filter(isDefined)
  check('filter keeps zero and removes only nullish values', numbers, [0, 2, 4])
  check('false is defined', isDefined(false), true)
  check('empty string is defined', isDefined(''), true)

  const candidates: unknown[] = [{ id: 'a1' }, null, [], 'agent', 3]
  const records: Record<string, unknown>[] = candidates.filter(isRecord)
  check('record guard excludes null, arrays and primitives', records, [{ id: 'a1' }])
  // This is a broad object guard, not validation of a plain JSON object or its fields.
  check('class instances also pass this record guard', isRecord(new Date(0)), true)

  const input: unknown = { id: 'a1', handled: 0 }
  if (isRecord(input) && hasKey(input, 'id') && typeof input.id === 'string') {
    const id: string = input.id
    check('validate the value after checking the key', id.toUpperCase(), 'A1')
  } else {
    check('expected a record with a string id', false, true)
  }
  const object: object = { handled: 0 }
  if (hasKey(object, 'handled')) {
    const handled: unknown = object.handled
    check('key guard exposes an unknown value', handled, 0)
  } else {
    check('expected an own handled key', false, true)
  }
  check('inherited keys do not count', hasKey({}, 'toString'), false)
  check('shadowed method is harmless', hasKey({ hasOwnProperty: false }, 'hasOwnProperty'), true)
  check('undefined value still has a key', hasKey({ id: undefined }, 'id'), true)
})

suite('utility types and mapped types', () => {
  const agent: Agent = { id: 'a1', name: 'Sam', state: 'idle', handled: 0 }
  const counts: Record<AgentState, number> = { idle: 2, busy: 3, offline: 1 }
  check('Record requires every key in the union', counts.busy, 3)

  const patch: AgentPatch = { handled: 1 }
  const handwrittenPatch: MyPartial<Agent> = { state: 'busy' }
  check('Partial permits a subset of properties', { ...agent, ...patch }.handled, 1)
  check('mapped Partial has the same shape', handwrittenPatch, { state: 'busy' })

  const summary: AgentSummary = { id: agent.id, state: agent.state }
  const handwrittenSummary: MyPick<Agent, 'id' | 'state'> = summary
  check('Pick keeps selected properties', handwrittenSummary, { id: 'a1', state: 'idle' })
  const draft: NewAgent = { name: 'Sam', state: 'idle', handled: 0 }
  check('Omit leaves the remaining properties', Object.keys(draft), ['name', 'state', 'handled'])

  const snapshot: AgentSnapshot = agent
  // Readonly prevents assignment through snapshot at compile time; it does not freeze.
  agent.handled = 7
  check('Readonly does not prevent mutations through another reference', snapshot.handled, 7)
  const nested: Readonly<{ stats: { handled: number } }> = { stats: { handled: 0 } }
  nested.stats.handled = 8
  check('Readonly is shallow', nested.stats.handled, 8)
})

suite('literal types, as const and satisfies', () => {
  const state: AgentState = 'busy'
  check('derive a union from a readonly literal tuple', agentStates.includes(state), true)
  check('as const preserves the literal values at runtime', agentStates, ['idle', 'busy', 'offline'])

  const annotated: QueueConfig = { mode: 'fifo', retries: 2 }
  const validated = { mode: 'fifo', retries: 2 } satisfies QueueConfig
  const exactMode: 'fifo' = validated.mode
  // An annotation gives mode the whole union; satisfies checks without that widening.
  const anotherAllowedMode: typeof annotated.mode = 'priority'
  check('satisfies keeps the concrete mode literal', exactMode, 'fifo')
  check('the annotated property type allows the other literal', anotherAllowedMode, 'priority')
  // satisfies is not as const: numeric properties normally still infer as number.
  validated.retries = 3
  check('satisfies does not freeze or make every property literal', validated.retries, 3)
})

suite('generic constraints and indexed access types', () => {
  const agents: Agent[] = [
    { id: 'a1', name: 'Sam', state: 'idle', handled: 2 },
    { id: 'a2', name: 'Jo', state: 'busy', handled: 5 }
  ]
  const names: string[] = pluck(agents, 'name')
  const handled: number[] = pluck(agents, 'handled')
  const states: AgentState[] = pluck(agents, 'state')
  check('key constraint produces string values', names, ['Sam', 'Jo'])
  check('indexed access produces number values', handled, [2, 5])
  check('literal union survives generic lookup', states, ['idle', 'busy'])
  check('empty input', pluck<Agent, 'id'>([], 'id'), [])
})

suite('optional chaining and nullish defaults', () => {
  const response: { agent?: { name?: string | null }; attempts: number } = { attempts: 0 }
  check('optional chaining stops at a missing parent', response.agent?.name, undefined)
  check('nullish fallback handles the missing value', response.agent?.name ?? 'Unassigned', 'Unassigned')
  check('null also triggers the fallback', ({ name: null }).name ?? 'Unassigned', 'Unassigned')
  check('nullish fallback preserves zero', response.attempts ?? 3, 0)
  check('or incorrectly replaces zero', response.attempts || 3, 3)
  response.agent = { name: '' }
  check('nullish fallback preserves an empty string', response.agent?.name ?? 'Unassigned', '')
  check('or incorrectly replaces an empty string', response.agent?.name || 'Unassigned', 'Unassigned')
})

suite('index signatures, Map and unchecked indexed access', () => {
  // An index signature describes arbitrary property names; Record can also use a finite union.
  const counts: { [id: string]: number } = { a1: 2 }
  check('string dictionary lookup', counts.a1, 2)
  const key = { id: 'a1' }
  const byAgent = new Map<object, number>([[key, 2]])
  check('Map supports object keys', byAgent.get(key), 2)
  check('equal-looking object is a different key', byAgent.get({ id: 'a1' }), undefined)

  // noUncheckedIndexedAccess is off here: both assignments compile but produce undefined.
  const names = ['Sam']
  const assumedName: string = names[10]
  const assumedCount: number = counts['missing']
  check('array lookup can still miss at runtime', assumedName, undefined)
  check('dictionary lookup can still miss at runtime', assumedCount, undefined)
  // Turning it on adds undefined to these lookup types, forcing a guard or fallback.
  const safeName: string = names[10] ?? 'Unassigned'
  const safeCount: number = counts['missing'] ?? 0
  const maybeCount: number | undefined = byAgent.get({ id: 'missing' })
  check('array fallback is safe with either compiler setting', safeName, 'Unassigned')
  check('dictionary fallback is safe with either compiler setting', safeCount, 0)
  check('Map.get includes undefined regardless of that setting', maybeCount, undefined)
})
