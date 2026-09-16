import { check, suite } from '../../lib/check'

type Order = { orderId: string, productIds: string[] }

type Product = { id: string, name: string, priceCents: number }

type HydratedOrder = { orderId: string, products: Product[] }

// The only way to get products. Network call. Do not call it once per id.
type FetchProducts = (ids: string[]) => Promise<Product[]>

// Time O(total ids), space O(unique ids). One request for every id rather than one request per id:
// this is the N+1 query in its natural habitat.
export async function hydrate(orders: Order[], fetchProducts: FetchProducts): Promise<HydratedOrder[]> {
  const ids = uniqueIds(orders)
  // An empty request is still a round trip, so skip it.
  const products = ids.length === 0 ? [] : await fetchProducts(ids)
  return attach(orders, indexById(products))
}

function uniqueIds(orders: Order[]): string[] {
  const ids = new Set<string>()
  for (const order of orders) {
    for (const id of order.productIds) ids.add(id)
  }
  return [...ids]
}

// Key by id, never by position. The API is free to return the products in any order it likes, and
// relying on the response order is a bug that survives code review because it usually works.
function indexById(products: Product[]): Map<string, Product> {
  return new Map(products.map(product => [product.id, product]))
}

function attach(orders: Order[], byId: Map<string, Product>): HydratedOrder[] {
  // Walking the input orders is what makes the output order independent of the resolution order.
  return orders.map(order => {
    const products: Product[] = []
    // A repeated id inside one order stays repeated: the order really does list it twice.
    for (const id of order.productIds) {
      const product = byId.get(id)
      // Decision: an id the lookup does not have is dropped. Nulling it or throwing are the other
      // two answers, and which is right depends on whether a shopper or a ledger reads the result.
      if (product !== undefined) products.push(product)
    }
    return { orderId: order.orderId, products }
  })
}

// ---- Follow-up 1: batch size ----

const MAX_IDS_PER_REQUEST = 50

function chunk<T>(items: T[], size: number): T[][] {
  if (size < 1) throw new Error('chunk size must be at least 1')
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}

// Time O(total ids), space O(unique ids). The chunks go out in parallel, so the wall clock is one
// round trip instead of n. What that costs is n open connections at once and an all-or-nothing
// failure: one bad chunk rejects the Promise.all. Sequential is the opposite trade, gentle on the
// service and n times slower. Follow-up 2 is the middle, and is what you actually ship.
export async function hydrateChunked(
  orders: Order[],
  fetchProducts: FetchProducts,
  batchSize = MAX_IDS_PER_REQUEST
): Promise<HydratedOrder[]> {
  const batches = chunk(uniqueIds(orders), batchSize)
  const responses = await Promise.all(batches.map(batch => fetchProducts(batch)))
  return attach(orders, indexById(responses.flat()))
}

// ---- Follow-up 2: bounded concurrency ----

// Time O(n) tasks with at most limit running, space O(n) for the results. Every runner pulls from
// one shared cursor, so a slow task holds up nothing but itself, and writing results by index keeps
// the output in input order however the tasks finish.
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (limit < 1) throw new Error('limit must be at least 1')
  const results = new Array<R>(items.length)
  let next = 0

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await worker(items[index], index)
    }
  })

  await Promise.all(runners)
  return results
}

// Time O(total ids), space O(unique ids). At most `limit` requests are ever in flight.
export async function hydrateBounded(
  orders: Order[],
  fetchProducts: FetchProducts,
  batchSize = MAX_IDS_PER_REQUEST,
  limit = 4
): Promise<HydratedOrder[]> {
  const batches = chunk(uniqueIds(orders), batchSize)
  const responses = await mapWithConcurrency(batches, limit, batch => fetchProducts(batch))
  return attach(orders, indexById(responses.flat()))
}

// ---- Follow-up 3: coalescing ----

// Caches the PROMISE, not the product. A second caller arriving while the first request is still
// open joins it instead of opening another; caching the value only helps once the value exists,
// which is exactly when you no longer have the problem.
export class ProductLoader {
  private readonly inFlight = new Map<string, Promise<Product>>()

  constructor(private readonly fetchProducts: FetchProducts) {}

  load(id: string): Promise<Product> {
    return this.loadMany([id]).then(products => products[0])
  }

  // One request for the ids nobody has asked for yet, and the cache for the rest.
  loadMany(ids: string[]): Promise<Product[]> {
    const missing = [...new Set(ids)].filter(id => !this.inFlight.has(id))
    if (missing.length > 0) this.register(missing)
    return Promise.all(ids.map(id => this.inFlight.get(id)!))
  }

  private register(ids: string[]): void {
    const lookup = this.fetchProducts(ids).then(indexById)
    for (const id of ids) {
      const entry = lookup.then(byId => {
        const product = byId.get(id)
        if (product === undefined) throw new Error(`product ${id} not found`)
        return product
      })
      // A rejection must not be cached forever, or one blip poisons that id until restart. The
      // identity check means a retry already in flight is not evicted by the old failure.
      entry.catch(() => {
        if (this.inFlight.get(id) === entry) this.inFlight.delete(id)
      })
      // The promise goes in the map before it settles. That is the whole trick.
      this.inFlight.set(id, entry)
    }
  }
}

// ---- Follow-up 4: partial failure ----

type HydrateReport = { orders: HydratedOrder[], failedIds: string[] }

type ResilientOptions = {
  batchSize?: number
  concurrency?: number
  maxAttempts?: number
  baseDelayMs?: number
  sleep?: (ms: number) => Promise<void>       // injected so tests do not actually wait
}

const defaultSleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

// The retry belongs around one chunk, not around the whole hydrate. Retrying the hydrate re-sends
// the chunks that already succeeded, which is slower and, on a metered endpoint, dearer.
async function fetchChunkWithRetry(
  batch: string[],
  fetchProducts: FetchProducts,
  maxAttempts: number,
  baseDelayMs: number,
  sleep: (ms: number) => Promise<void>
): Promise<Product[]> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fetchProducts(batch)
    } catch (err) {
      if (attempt === maxAttempts) throw err
      await sleep(baseDelayMs * 2 ** (attempt - 1))
    }
  }
  throw new Error('unreachable')
}

// Time O(total ids), space O(unique ids). A chunk that dies after its retries costs you its ids and
// nothing else: turning the rejection into a value inside the worker is what stops one bad chunk
// taking the job down, and it reports which ids are missing instead of quietly dropping them.
export async function hydrateResilient(
  orders: Order[],
  fetchProducts: FetchProducts,
  options: ResilientOptions = {}
): Promise<HydrateReport> {
  const {
    batchSize = MAX_IDS_PER_REQUEST,
    concurrency = 4,
    maxAttempts = 3,
    baseDelayMs = 100,
    sleep = defaultSleep
  } = options

  const batches = chunk(uniqueIds(orders), batchSize)
  const settled = await mapWithConcurrency(batches, concurrency, batch =>
    fetchChunkWithRetry(batch, fetchProducts, maxAttempts, baseDelayMs, sleep).then(
      products => ({ ok: true as const, products }),
      () => ({ ok: false as const, ids: batch })
    ))

  const found: Product[] = []
  const failedIds: string[] = []
  for (const result of settled) {
    if (result.ok) found.push(...result.products)
    else failedIds.push(...result.ids)
  }
  return { orders: attach(orders, indexById(found)), failedIds }
}

// ---- Follow-up 5: order preservation ----
// There is no code for this one, which is the point. Every variant above fetches into a
// Map<string, Product> and then walks the ORIGINAL orders array to build the output, so the result
// order is the input order by construction and cannot depend on which request came back first. The
// one place resolution order could leak in is mapWithConcurrency, and it writes results[index]
// rather than pushing, for the same reason. The suite below proves it by resolving the last chunk
// first.

// ---- tests ----

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

async function rejects(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn()
    return 'resolved, expected a rejection'
  } catch (err) {
    return err instanceof Error ? err.message : String(err)
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
  const hydrated = await hydrate(orders, shuffled.fetchProducts)

  const partial = shuffledFetch()
  const missing = await hydrate([{ orderId: 'o9', productIds: ['p1', 'ghost', 'p2'] }], async ids => {
    partial.batches.push(ids)
    return ids.filter(id => id !== 'ghost').map(product)
  })

  const unused = shuffledFetch()
  const empty = await hydrate([], unused.fetchProducts)
  const noIds = await hydrate([{ orderId: 'o8', productIds: [] }], unused.fetchProducts)

  const repeated = shuffledFetch()
  const twice = await hydrate([{ orderId: 'o7', productIds: ['p1', 'p1'] }], repeated.fetchProducts)

  suite('hydrate', () => {
    check('one request for every id', shuffled.batches, [['p1', 'p2', 'p3']])
    check('orders come back in input order with their products',
      names(hydrated), [['o1', ['p1', 'p2']], ['o2', ['p2', 'p3']], ['o3', []]])
    check('products are keyed by id, not by response position',
      hydrated[0].products[0], { id: 'p1', name: 'P1', priceCents: 200 })

    check('an id the API did not return is dropped', names(missing), [['o9', ['p1', 'p2']]])

    check('no orders means no request', [names(empty), unused.batches], [[], []])
    check('no ids means no request', [names(noIds), unused.batches], [[['o8', []]], []])

    check('an id repeated inside one order is fetched once', repeated.batches, [['p1']])
    check('but stays repeated in the output', names(twice), [['o7', ['p1', 'p1']]])
  })
}

async function chunkedSuite(): Promise<void> {
  const wide: Order[] = [
    { orderId: 'w1', productIds: ['a', 'b', 'c'] },
    { orderId: 'w2', productIds: ['c', 'd', 'e'] }
  ]
  const fetcher = shuffledFetch()
  const hydrated = await hydrateChunked(wide, fetcher.fetchProducts, 2)

  suite('hydrateChunked', () => {
    check('ids are split into requests of at most the batch size',
      fetcher.batches, [['a', 'b'], ['c', 'd'], ['e']])
    check('every chunk is folded into one lookup',
      names(hydrated), [['w1', ['a', 'b', 'c']], ['w2', ['c', 'd', 'e']]])
  })
}

async function concurrencySuite(): Promise<void> {
  const wide: Order[] = [{ orderId: 'w1', productIds: ['a', 'b', 'c', 'd', 'e', 'f'] }]

  const gate = gatedFetch()
  const run = hydrateBounded(wide, gate.fetchProducts, 1, 2)
  await drain(gate)
  const hydrated = await run

  const solo = gatedFetch()
  const soloRun = hydrateBounded(wide, solo.fetchProducts, 1, 1)
  await drain(solo)
  await soloRun

  const workers = await mapWithConcurrency([1, 2, 3, 4], 2, async n => n * 10)
  const limitMessage = await rejects(() => mapWithConcurrency([1], 0, async n => n))

  suite('hydrateBounded', () => {
    check('never more than k requests in flight', gate.peak(), 2)
    check('and the pool really did run k at once, not one at a time', gate.peak() >= 2, true)
    check('every chunk was sent', gate.batches.length, 6)
    check('the result is complete', names(hydrated), [['w1', ['a', 'b', 'c', 'd', 'e', 'f']]])

    check('a limit of one is fully sequential', solo.peak(), 1)

    check('mapWithConcurrency keeps input order', workers, [10, 20, 30, 40])
    check('a limit below one is rejected', limitMessage, 'limit must be at least 1')
  })
}

async function coalescingSuite(): Promise<void> {
  const calls: string[][] = []
  const loader = new ProductLoader(async ids => {
    calls.push(ids)
    return ids.map(product)
  })
  // Both callers start before either awaits, which is the race the cache exists for.
  const first = loader.load('p1')
  const second = loader.load('p1')
  const both = await Promise.all([first, second])
  // The recorder keeps growing, so snapshot it at each point of interest.
  const afterBoth = calls.map(ids => [...ids])
  const later = await loader.load('p1')
  const callsAfterLater = calls.length

  const mixed = await loader.loadMany(['p1', 'p2'])
  const afterMixed = calls.map(ids => [...ids])

  let attempts = 0
  const flakyCalls: string[][] = []
  const flaky = new ProductLoader(async ids => {
    flakyCalls.push(ids)
    attempts++
    if (attempts === 1) throw new Error('upstream down')
    return ids.map(product)
  })
  const failure = await rejects(() => flaky.load('p1'))
  const afterFailure = await flaky.load('p1')

  const gapped = new ProductLoader(async ids => ids.filter(id => id !== 'ghost').map(product))
  const ghost = await rejects(() => gapped.load('ghost'))
  const ghostAgain = await rejects(() => gapped.load('ghost'))

  suite('ProductLoader', () => {
    check('two concurrent callers share one request', afterBoth, [['p1']])
    check('and both get the product', both.map(p => p.id), ['p1', 'p1'])
    check('a later caller hits the cache', [later.id, callsAfterLater], ['p1', 1])
    check('only the unknown id is requested',
      [mixed.map(p => p.id), afterMixed], [['p1', 'p2'], [['p1'], ['p2']]])

    check('a failure reaches the caller', failure, 'upstream down')
    check('a failure is not cached: the next call refetches and succeeds',
      [afterFailure.id, flakyCalls], ['p1', [['p1'], ['p1']]])

    check('an id the API does not know rejects', ghost, 'product ghost not found')
    check('and is not cached either', ghostAgain, 'product ghost not found')
  })
}

async function resilientSuite(): Promise<void> {
  const wide: Order[] = [
    { orderId: 'r1', productIds: ['a', 'b'] },
    { orderId: 'r2', productIds: ['c', 'd'] }
  ]

  const deadBatches: string[][] = []
  const dead = await hydrateResilient(
    wide,
    async ids => {
      deadBatches.push(ids)
      if (ids.includes('c')) throw new Error('shard down')
      return ids.map(product)
    },
    { batchSize: 2, concurrency: 2, maxAttempts: 2, baseDelayMs: 100, sleep: async () => {} }
  )

  const delays: number[] = []
  let firstChunkCalls = 0
  const recovered = await hydrateResilient(
    wide,
    async ids => {
      if (ids.includes('a')) {
        firstChunkCalls++
        if (firstChunkCalls === 1) throw new Error('blip')
      }
      return ids.map(product)
    },
    {
      batchSize: 2,
      concurrency: 2,
      maxAttempts: 3,
      baseDelayMs: 100,
      sleep: async ms => {
        delays.push(ms)
      }
    }
  )

  suite('hydrateResilient', () => {
    check('a dead chunk does not take the job down',
      names(dead.orders), [['r1', ['a', 'b']], ['r2', []]])
    check('and its ids are reported rather than silently dropped', dead.failedIds, ['c', 'd'])
    check('the dead chunk was retried, the healthy one was not',
      deadBatches, [['a', 'b'], ['c', 'd'], ['c', 'd']])

    check('a chunk that recovers is hydrated in full',
      names(recovered.orders), [['r1', ['a', 'b']], ['r2', ['c', 'd']]])
    check('one retry, one backoff sleep, no failures', [delays, recovered.failedIds], [[100], []])
  })
}

async function orderSuite(): Promise<void> {
  const wide: Order[] = [
    { orderId: 'z1', productIds: ['a', 'b'] },
    { orderId: 'z2', productIds: ['c', 'd'] },
    { orderId: 'z3', productIds: ['e', 'f'] }
  ]

  const gate = gatedFetch()
  const run = hydrateBounded(wide, gate.fetchProducts, 2, 3)
  // Release the last chunk first, so the responses arrive in exactly the wrong order.
  await drain(gate, true)
  const hydrated = await run

  suite('order preservation', () => {
    check('three chunks went out together', gate.batches, [['a', 'b'], ['c', 'd'], ['e', 'f']])
    check('output order follows the input, not the resolution order',
      names(hydrated), [['z1', ['a', 'b']], ['z2', ['c', 'd']], ['z3', ['e', 'f']]])
  })
}

async function main(): Promise<void> {
  await coreSuite()
  await chunkedSuite()
  await concurrencySuite()
  await coalescingSuite()
  await resilientSuite()
  await orderSuite()
}

main().catch(err => {
  console.error(err)
  process.exitCode = 1
})
