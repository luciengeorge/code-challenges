# drills

Reps for "practice manipulating objects in TypeScript." Each file is a reference
implementation with tests and gotcha comments underneath.

- `01-objects-and-maps.ts` — `groupBy`/`groupByMap`, `indexBy`, `countBy`, `mapValues`,
  `pick`/`omit`, `invert`, `entriesSortedBy`, `deepFreeze`. Gotchas: integer-like keys
  reordering in plain objects, `Object.entries`/`fromEntries`, Map vs Record vs Set,
  `Object.groupBy`/`Map.groupBy` target caveats, `in` vs `hasOwnProperty`, `delete` vs
  `undefined`, `JSON.stringify` dropping undefined.
- `02-arrays-and-sorting.ts` — `sortBy`, `byKey`/`thenBy`, `partition`, `uniqueBy`, `chunk`,
  `zip`, `sumBy`, `maxBy`, `range`, `rotate`, `intersectionBy`/`differenceBy`. Gotchas:
  lexicographic default sort, sort stability, mutating vs copying methods, comparator
  correctness, `NaN` in `includes`/`indexOf`, sparse arrays and shared references.
- `03-nested-objects.ts` — `getPath`/`setPath`, `deepMerge`, `flatten`/`unflatten`,
  `deepEqual`, `deepClone`, `prune`, `renameKeys`, `toRows`. Gotchas: shallow spread
  aliasing, `structuredClone` vs `JSON` round trip, prototype pollution guards.
- `04-types-and-narrowing.ts` — discriminated unions with `assertNever`, type guards,
  `Record`/`Partial`/`Pick`/`Omit`/`Readonly`, `as const`, `satisfies`, generic
  constraints, `??` vs `||`, index signatures, `noUncheckedIndexedAccess`.

Repetition routine: read the file top to bottom, close it, re-type the helpers and one
gotcha section from memory into a scratch file, run it, then diff against the original
and fix what's wrong. Repeat the ones that broke.
