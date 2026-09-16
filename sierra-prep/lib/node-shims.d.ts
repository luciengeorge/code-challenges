// Minimal ambient declarations so `tsc --noEmit` is clean without installing @types/node.
// Only what lib/check.ts touches.
declare module 'node:assert' {
  export function deepStrictEqual(actual: unknown, expected: unknown, message?: string): void
}

declare const process: {
  exitCode: number | undefined
  on(event: 'exit', listener: () => void): void
}
