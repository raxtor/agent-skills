// Shared store plumbing: where the store lives, how to read the queue without crashing, and
// how to measure it. checks.mjs runs on every invocation, so this module stays dependency-free
// and does no work at import time.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const root = process.env.YTNOTE_HOME || join(homedir(), '.ytnote')
export const queueFile = join(root, '_queue.json')
export const LIMIT = 1024 ** 3

// A corrupt or half-written queue must not take down the invocation that only wanted to read
// it: an empty queue is recoverable, a crash at start-of-invocation is not. It does have to be
// visible, though — a queue that silently reads as empty stops retrying videos without a word.
// Returns { rows, corrupt } so the caller can say which it got.
export const readQueue = () => {
  if (!existsSync(queueFile)) return { rows: [], corrupt: false }
  try {
    const rows = JSON.parse(readFileSync(queueFile, 'utf8'))
    if (!Array.isArray(rows)) return { rows: [], corrupt: true }
    return { rows, corrupt: false }
  } catch {
    return { rows: [], corrupt: true }
  }
}

export const mb = (n) => Math.round(n / 1024 / 1024)

// Totals the store and splits the raw files by whether they can be fetched again for free.
// Raw is counted per file, next to its own meta.json, so a video's kind never leaks sideways.
export const measureStore = () => {
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

  return {
    bytes,
    captionsRaw: rawCaptions,
    transcribedRaw: rawTranscribed,
    limit: LIMIT,
    overLimit: bytes > LIMIT,
  }
}
