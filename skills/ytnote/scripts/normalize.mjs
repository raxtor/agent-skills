// Turns extract.raw.json into transcript.md / meta.json.
// published.txt is a fetch intermediate: folded into meta.json and removed here.
// Usage: node normalize.mjs <videoDir>
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2]
if (!dir) {
  console.error('usage: node normalize.mjs <videoDir>')
  process.exit(1)
}

const raw = JSON.parse(readFileSync(join(dir, 'extract.raw.json'), 'utf8'))
const e = raw.extracted ?? {}
let segs = Array.isArray(e.transcriptSegments) ? e.transcriptSegments : []

if (!segs.length) {
  // Fallback for outputs without segments: lines shaped like "[h:mm:ss] text".
  segs = (e.content ?? '')
    .split('\n')
    .map((l) => l.match(/^\[(\d+(?::\d+){1,2})\]\s+(.+)$/))
    .filter(Boolean)
    .map((m) => {
      const p = m[1].split(':').map(Number)
      const sec = p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]
      return { startMs: sec * 1000, text: m[2] }
    })
}

const transcript = segs
  .map((s) => ({ startMs: Math.round(Number(s.startMs)), text: String(s.text ?? '').trim() }))
  .filter((s) => Number.isFinite(s.startMs) && s.text)

if (!transcript.length) {
  const reason = e.transcriptMetadata?.reason
  console.error(`no transcript segments in extract.raw.json${reason ? ` (${reason})` : ''}`)
  process.exit(1)
}

const hms = (ms) => {
  const t = Math.floor(ms / 1000)
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}

const publishedFile = join(dir, 'published.txt')
const publishedAt = existsSync(publishedFile) ? readFileSync(publishedFile, 'utf8').trim() : null

// YouTube captions may be ASR or author-made and the output does not say which, so the flag
// only distinguishes downloaded captions from audio transcription.
const transcriptSource = e.transcriptSource ?? null
const transcriptKind = /caption|youtubei/i.test(String(transcriptSource)) ? 'captions' : 'transcribed'

const meta = {
  videoId: (String(e.url ?? '').match(/(?:v=|youtu\.be\/|shorts\/|live\/)([\w-]{11})/) ?? [])[1] ?? null,
  url: e.url ?? null,
  title: e.title ?? null,
  publishedAt,
  durationSeconds: e.mediaDurationSeconds ?? null,
  transcriptSource,
  transcriptKind,
  transcriptionProvider: e.transcriptionProvider ?? null,
  segments: transcript.length,
  words: e.transcriptWordCount ?? null,
  fetchedAt: new Date().toISOString(),
}

writeFileSync(join(dir, 'transcript.md'), transcript.map((s) => `[${hms(s.startMs)}] ${s.text}`).join('\n') + '\n')
writeFileSync(join(dir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n')
rmSync(publishedFile, { force: true })
console.log(JSON.stringify(meta))
