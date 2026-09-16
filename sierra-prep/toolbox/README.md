# toolbox

Data structures JS/TS doesn't give you for free. Read the file, close it, re-type it from
memory, run it, diff against the original.

| structure | reach for this when you see | key operations |
| --- | --- | --- |
| `min-heap.ts` | "top K", "kth largest/smallest", a priority queue | push/pop/peek O(log n), heapify O(n), topK O(n log k) |
| `deque.ts` | push/pop at both ends, "sliding window max/min" | pushFront/pushBack/popFront/popBack O(1), slidingWindowMax O(n) |
| `trie.ts` | autocomplete, prefix search, "words starting with" | insert/has/startsWith O(m), wordsWithPrefix O(p + n) |
| `union-find.ts` | "are these connected", merge duplicate groups, cycle detection on undirected graphs | find/union/connected amortised ~O(1), count O(1) |
| `binary-search.ts` | sorted array lookup, "minimum X such that Y holds" | lowerBound/upperBound/binarySearch O(log n), firstTrue O(log range) |
| `lru-cache.ts` | fixed-size cache with eviction, "design an LRU cache" | get/set O(1); TTLCache adds per-entry expiry |
| `graph.ts` | shortest path, dependency ordering, cycle detection on directed graphs | bfsShortestPath/dfsIterative/topoSort/topoLevels/findCycle all O(V + E) |

`m` = word length, `p` = prefix length, `n` = matching results, `V`/`E` = vertices/edges.
