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

export function summariseConversations(events: AgentEvent[]): Summary[] {
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
    attempt(() => summariseConversations(queue).map(summary => summary.conversationId)),
    ['conv-2', 'conv-1'])

  check('full rollup of an out-of-order conversation',
    attempt(() => summariseConversations(queue)[1]), {
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

  check('handoff without resolution',
    attempt(() => summariseConversations(queue)[0]), {
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
    attempt(() => summariseConversations(queue)[1].messageCount), 2)

  const toolRun: AgentEvent[] = [
    evt('t3', 'conv-3', 30, 'tool_call', 'agent', { name: 'refund' }),
    evt('t1', 'conv-3', 10, 'tool_call', 'agent', { name: 'search_kb' }),
    evt('t2', 'conv-3', 20, 'tool_call', 'agent', { name: 'refund' }),
    evt('t4', 'conv-3', 10, 'tool_call', 'agent', { name: 'lookup_order' })
  ]
  check('tool names in first-call order, equal timestamps keep input order',
    attempt(() => summariseConversations(toolRun)[0].toolCalls),
    ['search_kb', 'lookup_order', 'refund'])

  const malformed: AgentEvent[] = [
    evt('m1', 'conv-4', 10, 'tool_call', 'agent'),
    evt('m2', 'conv-4', 20, 'tool_call', 'agent', { arguments: {} }),
    evt('m3', 'conv-4', 30, 'tool_call', 'agent', { name: 'escalate' })
  ]
  check('tool_call without a name does not crash',
    attempt(() => summariseConversations(malformed)[0].toolCalls), ['escalate'])

  const single = [evt('s1', 'conv-5', 1000, 'message', 'agent')]
  check('single event has zero duration',
    attempt(() => summariseConversations(single)[0].durationMs), 0)
  check('single event start equals end',
    attempt(() => [summariseConversations(single)[0].startedAt, summariseConversations(single)[0].endedAt]),
    [1000, 1000])

  check('empty input', attempt(() => summariseConversations([])), [])
})

// FOLLOW-UP 1: write summariseSessions(events, gapMs), then uncomment.
// const THIRTY_MINUTES = 30 * 60 * 1000
//
// suite('summariseSessions', () => {
//   const gapped: AgentEvent[] = [
//     evt('g1', 'conv-1', 0, 'message', 'customer'),
//     evt('g2', 'conv-1', 60_000, 'message', 'agent'),
//     evt('g3', 'conv-1', 60_000 + 31 * 60_000, 'message', 'customer'),
//     evt('g4', 'conv-1', 60_000 + 32 * 60_000, 'resolved', 'agent')
//   ]
//
//   check('a long gap splits the conversation',
//     summariseSessions(gapped).map(summary => summary.conversationId), ['conv-1#0', 'conv-1#1'])
//   check('first session stops at the gap', summariseSessions(gapped)[0], {
//     conversationId: 'conv-1#0',
//     startedAt: 0,
//     endedAt: 60_000,
//     durationMs: 60_000,
//     messageCount: 2,
//     customerMessages: 1,
//     toolCalls: [],
//     handedOff: false,
//     resolved: false
//   })
//   check('second session carries the resolution', summariseSessions(gapped)[1], {
//     conversationId: 'conv-1#1',
//     startedAt: 1_920_000,
//     endedAt: 1_980_000,
//     durationMs: 60_000,
//     messageCount: 1,
//     customerMessages: 1,
//     toolCalls: [],
//     handedOff: false,
//     resolved: true
//   })
//
//   const exact: AgentEvent[] = [
//     evt('x1', 'conv-9', 0, 'message', 'customer'),
//     evt('x2', 'conv-9', THIRTY_MINUTES, 'message', 'agent')
//   ]
//   check('a gap of exactly 30 minutes does not split',
//     summariseSessions(exact).map(summary => summary.conversationId), ['conv-9#0'])
//
//   check('an unsplit conversation keeps its counts',
//     summariseSessions(queue).map(summary => summary.conversationId), ['conv-2#0', 'conv-1#0'])
//   check('empty input', summariseSessions([]), [])
// })

// FOLLOW-UP 2: write topTools(events, k), then uncomment.
// suite('topTools', () => {
//   const traffic: AgentEvent[] = [
//     evt('p1', 'conv-1', 1, 'tool_call', 'agent', { name: 'refund' }),
//     evt('p2', 'conv-1', 2, 'tool_call', 'agent', { name: 'refund' }),
//     evt('p3', 'conv-2', 3, 'tool_call', 'agent', { name: 'refund' }),
//     evt('p4', 'conv-2', 4, 'tool_call', 'agent', { name: 'search_kb' }),
//     evt('p5', 'conv-3', 5, 'tool_call', 'agent', { name: 'search_kb' }),
//     evt('p6', 'conv-3', 6, 'tool_call', 'agent', { name: 'lookup_order' }),
//     evt('p7', 'conv-4', 7, 'tool_call', 'agent', { name: 'lookup_order' }),
//     evt('p8', 'conv-4', 8, 'tool_call', 'agent', { name: 'escalate' }),
//     evt('p9', 'conv-4', 9, 'message', 'customer')
//   ]
//
//   check('ties break alphabetically', topTools(traffic, 2), ['refund', 'lookup_order'])
//   check('three deep', topTools(traffic, 3), ['refund', 'lookup_order', 'search_kb'])
//   check('k larger than the tool count',
//     topTools(traffic, 10), ['refund', 'lookup_order', 'search_kb', 'escalate'])
//   check('k of zero', topTools(traffic, 0), [])
//   check('no tool calls', topTools([evt('n1', 'conv-1', 1, 'message', 'agent')], 3), [])
// })

// FOLLOW-UP 3: no code. Answer out loud which fields still fold in one pass over an
// AsyncIterable with bounded memory, and what you do about the ones that do not.

// FOLLOW-UP 4: write medianDuration(summaries) and approximateMedian(durations), then uncomment.
// suite('durations', () => {
//   const summaries = summariseConversations(queue)
//   check('exact median of two conversations', medianDuration(summaries), 115)
//   check('exact median of an odd count',
//     medianDuration([...summaries, summariseConversations(queue)[1]]), 200)
//   check('empty median', medianDuration([]), 0)
//
//   const durations = [1000, 2000, 3000, 4000, 5000]
//   const approx = approximateMedian(durations)
//   check('approximate median lands within one bucket below the exact value',
//     approx <= 3000 && approx >= 3000 / 1.26, true)
//   check('approximate median of zeroes', approximateMedian([0, 0, 0]), 0)
//   check('approximate median of nothing', approximateMedian([]), 0)
// })
