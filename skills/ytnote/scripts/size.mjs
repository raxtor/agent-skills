// Reports how much disk the transcript store uses and what is safe to delete.
// Usage: node size.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const LIMIT = 1024 ** 3
const root = process.env.YTNOTE_HOME || join(homedir(), '.ytnote')

let bytes = 0
let rawCaptions = 0
let rawTranscribed = 0

const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
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
  // missing store is an empty store
}

const mb = (n) => Math.round(n / 1024 / 1024)
console.log(
  `${mb(bytes)} MB in ${root}; captions raw ${mb(rawCaptions)} MB; transcribed raw ${mb(rawTranscribed)} MB; limit ${mb(LIMIT)} MB`,
)
if (bytes > LIMIT) {
  console.log(
    `OVER LIMIT: deleting captions raw would free ${mb(rawCaptions)} MB. Transcribed raw stays — it was paid for. Ask the user first.`,
  )
}
