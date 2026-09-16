# 9. Resolving ids into objects

**Evidence: strong.** First-hand account of the Sierra screen: after handling the flaky endpoint, the
next part was *"resolving product IDs into product objects through iteration"*, with each follow-up
adding a requirement. The same account says the round is *"not LeetCode - it simulates a real
scenario you'd encounter working at Sierra"*. Expect this to arrive as part two of problem 8.

**Budget:** 45 min. Read only this file. Spoiler at the bottom.

## Setup

You have orders that reference products by id. You need the products.

```ts
type Order = { orderId: string, productIds: string[] }
type Product = { id: string, name: string, priceCents: number }

// The only way to get products. Network call. Do not call it once per id.
type FetchProducts = (ids: string[]) => Promise<Product[]>

async function hydrate(orders: Order[], fetchProducts: FetchProducts): Promise<HydratedOrder[]>
```

Return each order with its products attached, in the original order.

## Ask these before writing code

- Does the API return products in the order I asked for? Assume not, and key by id rather than by
  position. Relying on response order is a real bug that survives code review.
- What if an id does not come back? Drop it, null it, or throw? The customer-facing answer differs
  from the internal one, so ask which side you are on.
- Is there a cap on ids per request? There always is. Ask for it, then chunk.
- Can the same id appear across many orders? Yes, constantly. Ask for it once.
- Does the order of results matter? Yes. Say so, and make sure your async code preserves it.

## Follow-ups the interviewer will reach for

1. **Batch size.** The endpoint accepts at most 50 ids. Chunk, and decide whether the chunks go in
   sequence or in parallel. Both are defensible; say what each costs.
2. **Bounded concurrency.** Firing 200 chunks at once is how you get rate limited. Run at most `k`
   in flight. Write the pool; it is about fifteen lines and it comes up constantly.
3. **Coalescing.** Two callers ask for the same id at the same time. Return them the same in-flight
   promise rather than making two calls. This is the trick worth knowing: cache the promise, not the
   value.
4. **Partial failure.** One chunk fails while the others succeed. Does the whole thing fail? Combine
   this with problem 8's retry and say where the retry belongs: per chunk, not per batch.
5. **Order preservation.** Prove your result is in input order even though the calls resolved out of
   order.

## What this is probing

The N+1 query problem, which is the most common performance bug in real backend code, and whether you
reach for a `Map` from id to object the moment you hear "resolve". Then whether you can do async
correctly: `Promise.all` over chunks, a concurrency pool, and the difference between caching a value
and caching a promise. Follow-up 3 is the one that makes an interviewer sit up.

---
<details>
<summary>Spoiler: the shape of the answer</summary>

Collect a `Set` of every id across all orders. Chunk it. Fetch chunks through a concurrency pool.
Fold every response into one `Map<string, Product>`. Then walk the original orders and map ids through
the lookup, so output order falls out of input order for free and never depends on resolution order.
Coalescing: `Map<string, Promise<Product>>`, set the promise before awaiting it, and delete on
rejection so a failure is not cached forever.
</details>
