// One process for the two mandatory start-of-invocation checks: due queue rows + store size.
// Previously queue.mjs due and size.mjs meant two Node startups (~150 ms each on Windows).
// Usage: node checks.mjs   -> JSON { root, due, size }
import { mkdirSync } from 'node:fs'
import { mb, measureStore, readQueue, root } from './store.mjs'

mkdirSync(root, { recursive: true })

const now = Date.now()
const { rows, corrupt } = readQueue()
const due = rows.filter((r) => !r.gaveUp && r.nextCheckAt <= now)
const size = measureStore()

const message =
  `${mb(size.bytes)} MB in ${root}; captions raw ${mb(size.captionsRaw)} MB; transcribed raw ${mb(size.transcribedRaw)} MB; limit ${mb(size.limit)} MB` +
  (size.overLimit
    ? ` | OVER LIMIT: deleting captions raw would free ${mb(size.captionsRaw)} MB. Transcribed raw stays — it was paid for. Ask the user first.`
    : '')

// queueCorrupt is only present when the file could not be read, so its absence is the normal case.
console.log(
  JSON.stringify(
    { root, due, size: { ...size, message }, ...(corrupt ? { queueCorrupt: true } : {}) },
    null,
    2,
  ),
)
