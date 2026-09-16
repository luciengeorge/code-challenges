// Tiny zero-dep test harness. Runs under `bun run <file>` or `npx tsx <file>`.
import { deepStrictEqual } from 'node:assert'

let failures = 0

export function suite(name: string, fn: () => void): void {
  console.log(`\n${name}`)
  fn()
}

export function check(label: string, actual: unknown, expected: unknown): void {
  try {
    deepStrictEqual(actual, expected)
    console.log(`  ok   ${label}`)
  } catch {
    failures++
    process.exitCode = 1
    console.log(`  FAIL ${label}`)
    console.log(`       expected: ${fmt(expected)}`)
    console.log(`       actual:   ${fmt(actual)}`)
  }
}

export function checkThrows(label: string, fn: () => unknown, message?: string | RegExp): void {
  try {
    fn()
  } catch (err) {
    const text = err instanceof Error ? err.message : String(err)
    const ok =
      message === undefined ||
      (typeof message === 'string' ? text.includes(message) : message.test(text))
    if (ok) {
      console.log(`  ok   ${label}`)
      return
    }
    failures++
    process.exitCode = 1
    console.log(`  FAIL ${label} — threw "${text}", expected to match ${message}`)
    return
  }
  failures++
  process.exitCode = 1
  console.log(`  FAIL ${label} — expected a throw, got none`)
}

process.on('exit', () => {
  if (failures > 0) console.log(`\n${failures} check(s) failed`)
})

function fmt(value: unknown): string {
  if (value instanceof Map) return `Map(${JSON.stringify([...value])})`
  if (value instanceof Set) return `Set(${JSON.stringify([...value])})`
  return JSON.stringify(value)
}
