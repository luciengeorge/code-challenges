import { check, suite } from '../../lib/check'

type AgentEvent = {
  eventId: string
  conversationId: string
  ts: number                                  // epoch ms
  type: 'message' | 'tool_call' | 'handoff' | 'resolved'
  actor: 'customer' | 'agent'
  payload?: Record<string, unknown>           // tool_call has { name: string }
}

type Summary = {
  conversationId: string
  startedAt: number
  endedAt: number
  durationMs: number
  messageCount: number
  customerMessages: number
  toolCalls: string[]
  handedOff: boolean
  resolved: boolean
}

// Time O(n log n) for the one sort, space O(n) for the dedupe set plus the summaries.
export function summariseConversations(events: AgentEvent[]): Summary[] {
  const seen = new Set<string>()
  const deduped = events.filter(event => {
    // The queue is at-least-once, so eventId is the dedupe key and the first copy wins.
    if (seen.has(event.eventId)) return false
    seen.add(event.eventId)
    return true
  })
  // Sort is stable, so events sharing a timestamp keep their input order. That is the tie-break
  // for "tool names in the order first called".
  const ordered = deduped.sort((a, b) => a.ts - b.ts)

  const summaries = new Map<string, Summary>()
  const toolsSeen = new Map<string, Set<string>>()

  for (const event of ordered) {
    let summary = summaries.get(event.conversationId)
    if (summary === undefined) {
      summary = blank(event.conversationId, event.ts)
      summaries.set(event.conversationId, summary)
      toolsSeen.set(event.conversationId, new Set())
    }
    apply(summary, toolsSeen.get(event.conversationId)!, event)
  }

  return [...summaries.values()].sort((a, b) => a.startedAt - b.startedAt)
}

function blank(conversationId: string, ts: number): Summary {
  // A conversation with one event has a duration of 0, which is a real answer, not an error.
  return {
    conversationId,
    startedAt: ts,
    endedAt: ts,
    durationMs: 0,
    messageCount: 0,
    customerMessages: 0,
    toolCalls: [],
    handedOff: false,
    resolved: false
  }
}

function apply(summary: Summary, tools: Set<string>, event: AgentEvent): void {
  if (event.ts < summary.startedAt) summary.startedAt = event.ts
  if (event.ts > summary.endedAt) summary.endedAt = event.ts
  summary.durationMs = summary.endedAt - summary.startedAt

  if (event.type === 'message') {
    summary.messageCount++
    if (event.actor === 'customer') summary.customerMessages++
    return
  }
  if (event.type === 'tool_call') {
    const name = event.payload?.name
    // payload.name is meant to be there; a malformed event is dropped rather than killing the job.
    if (typeof name === 'string' && !tools.has(name)) {
      tools.add(name)
      summary.toolCalls.push(name)
    }
    return
  }
  if (event.type === 'handoff') {
    summary.handedOff = true
    return
  }
  summary.resolved = true
}

// ---- Follow-up 1: inactivity split ----

const THIRTY_MINUTES = 30 * 60 * 1000

// Time O(n log n), space O(n). The Summary shape does not change; only the key gains a "#n" suffix,
// so every downstream consumer keeps working.
export function summariseSessions(events: AgentEvent[], gapMs: number = THIRTY_MINUTES): Summary[] {
  const seen = new Set<string>()
  const byConversation = new Map<string, AgentEvent[]>()
  for (const event of events) {
    if (seen.has(event.eventId)) continue
    seen.add(event.eventId)
    const bucket = byConversation.get(event.conversationId)
    if (bucket === undefined) byConversation.set(event.conversationId, [event])
    else bucket.push(event)
  }

  const summaries: Summary[] = []
  for (const [conversationId, bucket] of byConversation) {
    bucket.sort((a, b) => a.ts - b.ts)
    let summary: Summary | null = null
    let tools = new Set<string>()
    let index = 0
    let previousTs = 0
    for (const event of bucket) {
      // A gap strictly greater than gapMs opens a new session; a gap of exactly 30 minutes does not.
      if (summary === null || event.ts - previousTs > gapMs) {
        if (summary !== null) index++
        summary = blank(`${conversationId}#${index}`, event.ts)
        tools = new Set()
        summaries.push(summary)
      }
      apply(summary, tools, event)
      previousTs = event.ts
    }
  }

  return summaries.sort((a, b) => a.startedAt - b.startedAt)
}

// ---- Follow-up 2: top k tools ----

type ToolCount = { name: string, count: number }

// Time O(n + u log k) for u distinct tools, space O(u + k). A size-k heap beats sorting all counts
// once u is large, which is the whole point of the question.
export function topTools(events: AgentEvent[], k: number): string[] {
  if (k <= 0) return []

  const seen = new Set<string>()
  const counts = new Map<string, number>()
  for (const event of events) {
    if (event.type !== 'tool_call') continue
    if (seen.has(event.eventId)) continue
    seen.add(event.eventId)
    const name = event.payload?.name
    if (typeof name === 'string') counts.set(name, (counts.get(name) ?? 0) + 1)
  }

  // The root is the weakest entry we are keeping: lowest count, and on a tie the later name,
  // because ties break alphabetically in favour of the earlier name.
  const weakestFirst = (a: ToolCount, b: ToolCount): number =>
    a.count - b.count || compareNames(b.name, a.name)

  const heap = new MinHeap<ToolCount>(weakestFirst)
  for (const [name, count] of counts) {
    const entry = { name, count }
    if (heap.size() < k) {
      heap.push(entry)
    } else if (weakestFirst(entry, heap.peek()!) > 0) {
      heap.pop()
      heap.push(entry)
    }
  }

  const ranked: string[] = []
  while (heap.size() > 0) ranked.push(heap.pop()!.name)
  return ranked.reverse()
}

// Codepoint order, not localeCompare, so the result does not depend on the runtime's locale.
function compareNames(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

class MinHeap<T> {
  private items: T[] = []

  constructor(private readonly cmp: (a: T, b: T) => number) {}

  size(): number {
    return this.items.length
  }

  peek(): T | undefined {
    return this.items[0]
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

// ---- Follow-up 3: 400 million events as an AsyncIterable ----
// Counters and extremes fold in one pass with memory proportional to live conversations, not to
// events: startedAt, endedAt, messageCount, customerMessages, handedOff and resolved all survive
// out-of-order arrival. Two things do not. Dedupe needs the set of every eventId ever seen, and
// "tool names in the order first called" needs a per-conversation set of names plus the first ts
// for each, so a late event can reorder a list already emitted downstream. The practical answer is
// to bound both: a time-windowed id set (or a Bloom filter, accepting false drops) and a cap of N
// tool names per conversation, then emit per-window partials and merge them in a second job.

// ---- Follow-up 4: median conversation duration ----

// Time O(n log n), space O(n): the exact median has to hold every duration at once.
export function medianDuration(summaries: Summary[]): number {
  if (summaries.length === 0) return 0
  const durations = summaries.map(summary => summary.durationMs).sort((a, b) => a - b)
  const middle = durations.length >> 1
  // Even counts average the two middle values.
  if (durations.length % 2 === 1) return durations[middle]
  return (durations[middle - 1] + durations[middle]) / 2
}

// Time O(n), space O(buckets). Durations land in exponential buckets and the answer is the lower
// bound of the bucket holding the middle item. What you give up is exactness: the error is at most
// one bucket width, here about 26%, in exchange for memory that does not grow with n.
export function approximateMedian(durations: Iterable<number>, bucketsPerDecade = 10): number {
  const counts = new Map<number, number>()
  let total = 0
  for (const value of durations) {
    const bucket = value <= 0 ? -1 : Math.floor(Math.log10(value) * bucketsPerDecade)
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1)
    total++
  }
  if (total === 0) return 0

  const target = Math.ceil(total / 2)
  let seen = 0
  for (const bucket of [...counts.keys()].sort((a, b) => a - b)) {
    seen += counts.get(bucket)!
    if (seen >= target) return bucket === -1 ? 0 : 10 ** (bucket / bucketsPerDecade)
  }
  return 0
}

const evt = (
  eventId: string,
  conversationId: string,
  ts: number,
  type: AgentEvent['type'],
  actor: AgentEvent['actor'],
  payload?: Record<string, unknown>
): AgentEvent => ({ eventId, conversationId, ts, type, actor, payload })

const queue: AgentEvent[] = [
  evt('e5', 'conv-2', 50, 'message', 'customer'),
  evt('e3', 'conv-1', 300, 'resolved', 'agent'),
  evt('e1', 'conv-1', 100, 'message', 'customer'),
  evt('e2', 'conv-1', 200, 'tool_call', 'agent', { name: 'lookup_order' }),
  evt('e6', 'conv-2', 80, 'handoff', 'agent'),
  evt('e1', 'conv-1', 100, 'message', 'customer'),
  evt('e4', 'conv-1', 150, 'message', 'agent')
]

suite('summariseConversations', () => {
  check('one summary per conversation, sorted by startedAt',
    summariseConversations(queue).map(summary => summary.conversationId), ['conv-2', 'conv-1'])

  check('full rollup of an out-of-order conversation', summariseConversations(queue)[1], {
    conversationId: 'conv-1',
    startedAt: 100,
    endedAt: 300,
    durationMs: 200,
    messageCount: 2,
    customerMessages: 1,
    toolCalls: ['lookup_order'],
    handedOff: false,
    resolved: true
  })

  check('handoff without resolution', summariseConversations(queue)[0], {
    conversationId: 'conv-2',
    startedAt: 50,
    endedAt: 80,
    durationMs: 30,
    messageCount: 1,
    customerMessages: 1,
    toolCalls: [],
    handedOff: true,
    resolved: false
  })

  check('repeated eventId counted once',
    summariseConversations(queue)[1].messageCount, 2)

  const toolRun: AgentEvent[] = [
    evt('t3', 'conv-3', 30, 'tool_call', 'agent', { name: 'refund' }),
    evt('t1', 'conv-3', 10, 'tool_call', 'agent', { name: 'search_kb' }),
    evt('t2', 'conv-3', 20, 'tool_call', 'agent', { name: 'refund' }),
    evt('t4', 'conv-3', 10, 'tool_call', 'agent', { name: 'lookup_order' })
  ]
  check('tool names in first-call order, equal timestamps keep input order',
    summariseConversations(toolRun)[0].toolCalls, ['search_kb', 'lookup_order', 'refund'])

  const malformed: AgentEvent[] = [
    evt('m1', 'conv-4', 10, 'tool_call', 'agent'),
    evt('m2', 'conv-4', 20, 'tool_call', 'agent', { arguments: {} }),
    evt('m3', 'conv-4', 30, 'tool_call', 'agent', { name: 'escalate' })
  ]
  check('tool_call without a name does not crash',
    summariseConversations(malformed)[0].toolCalls, ['escalate'])

  const single = summariseConversations([evt('s1', 'conv-5', 1000, 'message', 'agent')])
  check('single event has zero duration', single[0].durationMs, 0)
  check('single event start equals end', [single[0].startedAt, single[0].endedAt], [1000, 1000])

  check('empty input', summariseConversations([]), [])
})

suite('summariseSessions', () => {
  const gapped: AgentEvent[] = [
    evt('g1', 'conv-1', 0, 'message', 'customer'),
    evt('g2', 'conv-1', 60_000, 'message', 'agent'),
    evt('g3', 'conv-1', 60_000 + 31 * 60_000, 'message', 'customer'),
    evt('g4', 'conv-1', 60_000 + 32 * 60_000, 'resolved', 'agent')
  ]

  check('a long gap splits the conversation',
    summariseSessions(gapped).map(summary => summary.conversationId), ['conv-1#0', 'conv-1#1'])
  check('first session stops at the gap', summariseSessions(gapped)[0], {
    conversationId: 'conv-1#0',
    startedAt: 0,
    endedAt: 60_000,
    durationMs: 60_000,
    messageCount: 2,
    customerMessages: 1,
    toolCalls: [],
    handedOff: false,
    resolved: false
  })
  check('second session carries the resolution', summariseSessions(gapped)[1], {
    conversationId: 'conv-1#1',
    startedAt: 1_920_000,
    endedAt: 1_980_000,
    durationMs: 60_000,
    messageCount: 1,
    customerMessages: 1,
    toolCalls: [],
    handedOff: false,
    resolved: true
  })

  const exact: AgentEvent[] = [
    evt('x1', 'conv-9', 0, 'message', 'customer'),
    evt('x2', 'conv-9', THIRTY_MINUTES, 'message', 'agent')
  ]
  check('a gap of exactly 30 minutes does not split',
    summariseSessions(exact).map(summary => summary.conversationId), ['conv-9#0'])

  check('an unsplit conversation keeps its counts',
    summariseSessions(queue).map(summary => summary.conversationId), ['conv-2#0', 'conv-1#0'])
  check('empty input', summariseSessions([]), [])
})

suite('topTools', () => {
  const traffic: AgentEvent[] = [
    evt('p1', 'conv-1', 1, 'tool_call', 'agent', { name: 'refund' }),
    evt('p2', 'conv-1', 2, 'tool_call', 'agent', { name: 'refund' }),
    evt('p3', 'conv-2', 3, 'tool_call', 'agent', { name: 'refund' }),
    evt('p4', 'conv-2', 4, 'tool_call', 'agent', { name: 'search_kb' }),
    evt('p5', 'conv-3', 5, 'tool_call', 'agent', { name: 'search_kb' }),
    evt('p6', 'conv-3', 6, 'tool_call', 'agent', { name: 'lookup_order' }),
    evt('p7', 'conv-4', 7, 'tool_call', 'agent', { name: 'lookup_order' }),
    evt('p8', 'conv-4', 8, 'tool_call', 'agent', { name: 'escalate' }),
    evt('p9', 'conv-4', 9, 'message', 'customer')
  ]

  check('ties break alphabetically', topTools(traffic, 2), ['refund', 'lookup_order'])
  check('three deep', topTools(traffic, 3), ['refund', 'lookup_order', 'search_kb'])
  check('k larger than the tool count',
    topTools(traffic, 10), ['refund', 'lookup_order', 'search_kb', 'escalate'])
  check('k of zero', topTools(traffic, 0), [])
  check('no tool calls', topTools([evt('n1', 'conv-1', 1, 'message', 'agent')], 3), [])
})

suite('durations', () => {
  const summaries = summariseConversations(queue)
  check('exact median of two conversations', medianDuration(summaries), 115)
  check('exact median of an odd count',
    medianDuration([...summaries, summariseConversations(queue)[1]]), 200)
  check('empty median', medianDuration([]), 0)

  const durations = [1000, 2000, 3000, 4000, 5000]
  const approx = approximateMedian(durations)
  check('approximate median lands within one bucket below the exact value',
    approx <= 3000 && approx >= 3000 / 1.26, true)
  check('approximate median of zeroes', approximateMedian([0, 0, 0]), 0)
  check('approximate median of nothing', approximateMedian([]), 0)
})
