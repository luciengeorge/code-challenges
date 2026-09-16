import { check, suite } from '../../lib/check'

type Order = { orderId: string, productIds: string[] }

type Product = { id: string, name: string, priceCents: number }

type HydratedOrder = { orderId: string, products: Product[] }

// The only way to get products. Network call. Do not call it once per id.
type FetchProducts = (ids: string[]) => Promise<Product[]>

export async function hydrate(orders: Order[], fetchProducts: FetchProducts): Promise<HydratedOrder[]> {
  throw new Error('not implemented')
}

// `check` compares a value that already exists, so await first and turn a rejection into its
// message. An unimplemented function therefore shows up as one FAIL line, not a dead run.
async function attempt<T>(fn: () => Promise<T>): Promise<T | string> {
  try {
    return await fn()
  } catch (err) {
    return err instanceof Error ? err.message : String(err)
  }
}

const product = (id: string): Product => ({ id, name: id.toUpperCase(), priceCents: id.length * 100 })

// Answers in a deliberately different order from the request, because a real API does.
const shuffledFetch = (): { fetchProducts: FetchProducts, batches: string[][] } => {
  const batches: string[][] = []
  return {
    batches,
    fetchProducts: async ids => {
      batches.push(ids)
      return [...ids].reverse().map(product)
    }
  }
}

// Holds every request open until the test releases it, so concurrency is observed rather than timed.
type Gate = {
  fetchProducts: FetchProducts
  batches: string[][]
  releases: Array<() => void>
  peak: () => number
}

const gatedFetch = (): Gate => {
  const batches: string[][] = []
  const releases: Array<() => void> = []
  let inFlight = 0
  let peak = 0
  return {
    batches,
    releases,
    peak: () => peak,
    fetchProducts: ids => {
      batches.push(ids)
      inFlight++
      peak = Math.max(peak, inFlight)
      return new Promise<Product[]>(resolve => {
        releases.push(() => {
          inFlight--
          resolve(ids.map(product))
        })
      })
    }
  }
}

// A handful of microtask turns, no timers: enough for the pool to start whatever it is allowed to.
const flush = async (): Promise<void> => {
  for (let i = 0; i < 20; i++) await Promise.resolve()
}

const drain = async (gate: Gate, reverse = false): Promise<void> => {
  for (let guard = 0; guard < 50; guard++) {
    await flush()
    if (gate.releases.length === 0) return
    const batch = gate.releases.splice(0)
    if (reverse) batch.reverse()
    for (const release of batch) release()
  }
}

const orders: Order[] = [
  { orderId: 'o1', productIds: ['p1', 'p2'] },
  { orderId: 'o2', productIds: ['p2', 'p3'] },
  { orderId: 'o3', productIds: [] }
]

const names = (hydrated: HydratedOrder[]): Array<[string, string[]]> =>
  hydrated.map(order => [order.orderId, order.products.map(p => p.id)])

async function coreSuite(): Promise<void> {
  const shuffled = shuffledFetch()
  const result = await attempt(() => hydrate(orders, shuffled.fetchProducts))
  const hydrated = typeof result === 'string' ? result : names(result)
  const firstProduct = typeof result === 'string' ? result : result[0].products[0]
  const batches = shuffled.batches.map(ids => [...ids])

  const missing = await attempt(async () =>
    names(await hydrate([{ orderId: 'o9', productIds: ['p1', 'ghost', 'p2'] }],
      async ids => ids.filter(id => id !== 'ghost').map(product))))

  const unused = shuffledFetch()
  const empty = await attempt(async () => names(await hydrate([], unused.fetchProducts)))
  const noIds = await attempt(async () => names(await hydrate([{ orderId: 'o8', productIds: [] }], unused.fetchProducts)))

  const repeated = shuffledFetch()
  const twice = await attempt(async () =>
    names(await hydrate([{ orderId: 'o7', productIds: ['p1', 'p1'] }], repeated.fetchProducts)))

  suite('hydrate', () => {
    check('one request for every id', batches, [['p1', 'p2', 'p3']])
    check('orders come back in input order with their products',
      hydrated, [['o1', ['p1', 'p2']], ['o2', ['p2', 'p3']], ['o3', []]])
    check('products are keyed by id, not by response position',
      firstProduct, { id: 'p1', name: 'P1', priceCents: 200 })

    check('an id the API did not return is dropped', missing, [['o9', ['p1', 'p2']]])

    check('no orders means no request', [empty, unused.batches], [[], []])
    check('no ids means no request', [noIds, unused.batches], [[['o8', []]], []])

    check('an id repeated inside one order is fetched once', repeated.batches, [['p1']])
    check('but stays repeated in the output', twice, [['o7', ['p1', 'p1']]])
  })
}

// FOLLOW-UP 1: write hydrateChunked(orders, fetchProducts, batchSize), then uncomment.
// async function chunkedSuite(): Promise<void> {
//   const wide: Order[] = [
//     { orderId: 'w1', productIds: ['a', 'b', 'c'] },
//     { orderId: 'w2', productIds: ['c', 'd', 'e'] }
//   ]
//   const fetcher = shuffledFetch()
//   const hydrated = await attempt(async () => names(await hydrateChunked(wide, fetcher.fetchProducts, 2)))
//
//   suite('hydrateChunked', () => {
//     check('ids are split into requests of at most the batch size',
//       fetcher.batches, [['a', 'b'], ['c', 'd'], ['e']])
//     check('every chunk is folded into one lookup',
//       hydrated, [['w1', ['a', 'b', 'c']], ['w2', ['c', 'd', 'e']]])
//   })
// }

// FOLLOW-UP 2: write mapWithConcurrency(items, limit, worker) and
// hydrateBounded(orders, fetchProducts, batchSize, limit), then uncomment.
// async function concurrencySuite(): Promise<void> {
//   const wide: Order[] = [{ orderId: 'w1', productIds: ['a', 'b', 'c', 'd', 'e', 'f'] }]
//
//   const gate = gatedFetch()
//   const run = hydrateBounded(wide, gate.fetchProducts, 1, 2)
//   await drain(gate)
//   const hydrated = await attempt(async () => names(await run))
//
//   const solo = gatedFetch()
//   const soloRun = hydrateBounded(wide, solo.fetchProducts, 1, 1)
//   await drain(solo)
//   await attempt(() => soloRun)
//
//   const workers = await attempt(() => mapWithConcurrency([1, 2, 3, 4], 2, async n => n * 10))
//   const limitMessage = await attempt(() => mapWithConcurrency([1], 0, async n => n))
//
//   suite('hydrateBounded', () => {
//     check('never more than k requests in flight', gate.peak(), 2)
//     check('and the pool really did run k at once, not one at a time', gate.peak() >= 2, true)
//     check('every chunk was sent', gate.batches.length, 6)
//     check('the result is complete', hydrated, [['w1', ['a', 'b', 'c', 'd', 'e', 'f']]])
//
//     check('a limit of one is fully sequential', solo.peak(), 1)
//
//     check('mapWithConcurrency keeps input order', workers, [10, 20, 30, 40])
//     check('a limit below one is rejected', limitMessage, 'limit must be at least 1')
//   })
// }

// FOLLOW-UP 3: write class ProductLoader with load(id) and loadMany(ids), then uncomment.
// async function coalescingSuite(): Promise<void> {
//   const calls: string[][] = []
//   const loader = new ProductLoader(async ids => {
//     calls.push(ids)
//     return ids.map(product)
//   })
//   const first = loader.load('p1')
//   const second = loader.load('p1')
//   const both = await attempt(async () => (await Promise.all([first, second])).map(p => p.id))
//   const afterBoth = calls.map(ids => [...ids])
//   const later = await attempt(async () => (await loader.load('p1')).id)
//   const callsAfterLater = calls.length
//
//   const mixed = await attempt(async () => (await loader.loadMany(['p1', 'p2'])).map(p => p.id))
//   const afterMixed = calls.map(ids => [...ids])
//
//   let attempts = 0
//   const flakyCalls: string[][] = []
//   const flaky = new ProductLoader(async ids => {
//     flakyCalls.push(ids)
//     attempts++
//     if (attempts === 1) throw new Error('upstream down')
//     return ids.map(product)
//   })
//   const failure = await attempt(() => flaky.load('p1'))
//   const afterFailure = await attempt(async () => (await flaky.load('p1')).id)
//
//   const gapped = new ProductLoader(async ids => ids.filter(id => id !== 'ghost').map(product))
//   const ghost = await attempt(() => gapped.load('ghost'))
//   const ghostAgain = await attempt(() => gapped.load('ghost'))
//
//   suite('ProductLoader', () => {
//     check('two concurrent callers share one request', afterBoth, [['p1']])
//     check('and both get the product', both, ['p1', 'p1'])
//     check('a later caller hits the cache', [later, callsAfterLater], ['p1', 1])
//     check('only the unknown id is requested',
//       [mixed, afterMixed], [['p1', 'p2'], [['p1'], ['p2']]])
//
//     check('a failure reaches the caller', failure, 'upstream down')
//     check('a failure is not cached: the next call refetches and succeeds',
//       [afterFailure, flakyCalls], ['p1', [['p1'], ['p1']]])
//
//     check('an id the API does not know rejects', ghost, 'product ghost not found')
//     check('and is not cached either', ghostAgain, 'product ghost not found')
//   })
// }

// FOLLOW-UP 4: write hydrateResilient(orders, fetchProducts, options) returning
// { orders, failedIds }, retrying per chunk with an injected sleep, then uncomment.
// async function resilientSuite(): Promise<void> {
//   const wide: Order[] = [
//     { orderId: 'r1', productIds: ['a', 'b'] },
//     { orderId: 'r2', productIds: ['c', 'd'] }
//   ]
//
//   const deadBatches: string[][] = []
//   const dead = await attempt(() => hydrateResilient(
//     wide,
//     async ids => {
//       deadBatches.push(ids)
//       if (ids.includes('c')) throw new Error('shard down')
//       return ids.map(product)
//     },
//     { batchSize: 2, concurrency: 2, maxAttempts: 2, baseDelayMs: 100, sleep: async () => {} }
//   ))
//
//   const delays: number[] = []
//   let firstChunkCalls = 0
//   const recovered = await attempt(() => hydrateResilient(
//     wide,
//     async ids => {
//       if (ids.includes('a')) {
//         firstChunkCalls++
//         if (firstChunkCalls === 1) throw new Error('blip')
//       }
//       return ids.map(product)
//     },
//     {
//       batchSize: 2,
//       concurrency: 2,
//       maxAttempts: 3,
//       baseDelayMs: 100,
//       sleep: async ms => {
//         delays.push(ms)
//       }
//     }
//   ))
//
//   suite('hydrateResilient', () => {
//     check('a dead chunk does not take the job down',
//       typeof dead === 'string' ? dead : names(dead.orders), [['r1', ['a', 'b']], ['r2', []]])
//     check('and its ids are reported rather than silently dropped',
//       typeof dead === 'string' ? dead : dead.failedIds, ['c', 'd'])
//     check('the dead chunk was retried, the healthy one was not',
//       deadBatches, [['a', 'b'], ['c', 'd'], ['c', 'd']])
//
//     check('a chunk that recovers is hydrated in full',
//       typeof recovered === 'string' ? recovered : names(recovered.orders),
//       [['r1', ['a', 'b']], ['r2', ['c', 'd']]])
//     check('one retry, one backoff sleep, no failures',
//       [delays, typeof recovered === 'string' ? recovered : recovered.failedIds], [[100], []])
//   })
// }

// FOLLOW-UP 5: prove the output order does not depend on the resolution order, then uncomment.
// async function orderSuite(): Promise<void> {
//   const wide: Order[] = [
//     { orderId: 'z1', productIds: ['a', 'b'] },
//     { orderId: 'z2', productIds: ['c', 'd'] },
//     { orderId: 'z3', productIds: ['e', 'f'] }
//   ]
//
//   const gate = gatedFetch()
//   const run = hydrateBounded(wide, gate.fetchProducts, 2, 3)
//   // Release the last chunk first, so the responses arrive in exactly the wrong order.
//   await drain(gate, true)
//   const hydrated = await attempt(async () => names(await run))
//
//   suite('order preservation', () => {
//     check('three chunks went out together', gate.batches, [['a', 'b'], ['c', 'd'], ['e', 'f']])
//     check('output order follows the input, not the resolution order',
//       hydrated, [['z1', ['a', 'b']], ['z2', ['c', 'd']], ['z3', ['e', 'f']]])
//   })
// }

async function main(): Promise<void> {
  await coreSuite()
  // await chunkedSuite()
  // await concurrencySuite()
  // await coalescingSuite()
  // await resilientSuite()
  // await orderSuite()
}

main().catch(err => {
  console.error(err)
  process.exitCode = 1
})
