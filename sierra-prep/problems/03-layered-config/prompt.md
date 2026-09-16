# 3. Layered agent config

**Budget:** 45 min. Read only this file before you start. Spoiler at the bottom.

## Setup

An agent's runtime config is assembled from layers. Later layers win over earlier ones:

```
platform defaults  <  customer org  <  agent  <  runtime override
```

```ts
type Config = { [key: string]: unknown }   // arbitrarily nested objects, arrays, primitives
```

Write `resolveConfig(layers: Config[]): Config`, a deep merge where objects merge recursively and
everything else replaces.

Then write `getPath(config, path)` so ops can query a resolved config:

```ts
getPath(cfg, 'escalation.rules[0].channel')   // 'email'
getPath(cfg, 'escalation.missing', 'none')    // 'none'
```

## Ask these before writing code

- Arrays: replace wholesale, or concatenate, or merge element by element by `id`? All three are
  defensible and they mean different things to a customer. Ask which, then make it an option.
- How does a layer **delete** an inherited key? A convention is needed. `null` meaning delete is
  common. What if a real value is legitimately null?
- Should the result share references with the inputs? If a caller mutates the merged config, should
  the defaults layer change? (No. Say why.)
- Empty layer list, single layer, layers of different depth.
- Does `getPath` distinguish "key missing" from "key present and undefined"?

## Follow-ups the interviewer will reach for

1. **Provenance.** For any path, which layer supplied the winning value? Support asks this constantly:
   "why is this agent escalating to email?"
2. **Diff.** `diffConfigs(a, b)` returning the paths that changed, with before and after. Now you want
   `flatten` to dotted paths, and the diff is a set operation over the flattened keys.
3. **Immutable set.** `setPath(config, 'a.b[0].c', value)` returning a new config, sharing structure
   with the old one everywhere it did not change.
4. **Security.** What happens if a customer-supplied layer contains the key `__proto__`?

## What this is probing

Recursion over unknown-shaped data, and whether you are careful with the base cases: arrays are typeof
'object', `null` is typeof 'object', a `Date` is typeof 'object'. Everyone writes a deep merge that
corrupts arrays on the first attempt. Follow-up 4 is prototype pollution, a real CVE class in exactly
this kind of code. Mentioning it unprompted is a strong signal.

---
<details>
<summary>Spoiler: the shape of the answer</summary>

`isPlainObject(x)` gate: `x !== null && typeof x === 'object' && !Array.isArray(x)` and ideally a
`Object.getPrototypeOf(x) === Object.prototype` check. Recurse only when both sides pass it, otherwise
take the override. Skip the keys `__proto__`, `constructor`, `prototype`. Path parsing:
`path.replace(/\[(\d+)\]/g, '.$1').split('.')` then reduce. Provenance: merge in the same walk but
carry the layer index alongside each leaf, or run the merge once per prefix of layers and compare.
</details>
