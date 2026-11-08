// One process for the two mandatory start-of-invocation checks: due queue rows + store size.
// Previously queue.mjs due and size.mjs meant two Node startups (~150 ms each on Windows).
// Usage: node checks.mjs   -> JSON { root, due, size }
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const root = process.env.YTNOTE_HOME || join(homedir(), '.ytnote')
mkdirSync(root, { recursive: true })
const queueFile = join(root, '_queue.json')
const LIMIT = 1024 ** 3

const rows = existsSync(queueFile) ? JSON.parse(readFileSync(queueFile, 'utf8')) : []
const now = Date.now()
const due = rows.filter((r) => !r.gaveUp && r.nextCheckAt <= now)

let bytes = 0
let rawCaptions = 0
let rawTranscribed = 0

const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    // Hidden entries are caches/tooling, never video data.
    if (entry.name.startsWith('.')) continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(path)
      continue
    }
    const size = statSync(path).size
    bytes += size
    if (entry.name !== 'extract.raw.json') continue
    // Captions can be fetched again for free; a transcription was paid for.
    let kind = 'captions'
    try {
      kind = JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8')).transcriptKind ?? 'captions'
    } catch {
      // no meta yet: treat as captions, the common case
    }
    if (kind === 'transcribed') rawTranscribed += size
    else rawCaptions += size
  }
}

try {
  walk(root)
} catch {
  // missing/unreadable store is an empty store
}

const mb = (n) => Math.round(n / 1024 / 1024)
const overLimit = bytes > LIMIT
const message =
  `${mb(bytes)} MB in ${root}; captions raw ${mb(rawCaptions)} MB; transcribed raw ${mb(rawTranscribed)} MB; limit ${mb(LIMIT)} MB` +
  (overLimit
    ? ` | OVER LIMIT: deleting captions raw would free ${mb(rawCaptions)} MB. Transcribed raw stays — it was paid for. Ask the user first.`
    : '')

console.log(
  JSON.stringify(
    {
      root,
      due,
      size: { bytes, captionsRaw: rawCaptions, transcribedRaw: rawTranscribed, limit: LIMIT, overLimit, message },
    },
    null,
    2,
  ),
)
