// Queue of videos waiting for YouTube to generate ASR captions.
// Usage: node queue.mjs <list|due|titles|add|bump|drop> [videoId] [url]
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const root = process.env.YTNOTE_HOME || join(homedir(), '.ytnote')
mkdirSync(root, { recursive: true })
const file = join(root, '_queue.json')
const HOUR = 3600 * 1000
const BACKOFF_HOURS = [6, 24, 72]
const MAX_ATTEMPTS = 4

const load = () => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [])
const save = (rows) => {
  const tmp = `${file}.tmp`
  writeFileSync(tmp, JSON.stringify(rows, null, 2) + '\n')
  renameSync(tmp, file)
}

const args = process.argv.slice(2)
// `add` takes an optional --reason: "captions" (waiting for YouTube to generate them) or
// "transcription" (waiting for a provider key - caption retries cannot help those).
const reasonIdx = args.indexOf('--reason')
const reason = reasonIdx >= 0 ? args[reasonIdx + 1] : null
const positional = args.filter((_, i) => !(reasonIdx >= 0 && (i === reasonIdx || i === reasonIdx + 1)))
const [cmd, id, url] = positional
const rows = load()
const now = Date.now()

if (cmd === 'list') {
  console.log(JSON.stringify(rows, null, 2))
} else if (cmd === 'due') {
  console.log(JSON.stringify(rows.filter((r) => !r.gaveUp && r.nextCheckAt <= now), null, 2))
} else if (cmd === 'titles') {
  // A queued video has no meta.json yet, so its title is not on disk. Resolve it once
  // (oEmbed + watch page) and cache it in _queue.json; without the cache every invocation
  // would pay two network calls per waiting video. Only successful lookups are cached,
  // so a transient failure is retried on the next call.
  let changed = false
  const enriched = await Promise.all(
    rows.map(async (r) => {
      const [titleInfo, uploadDate] = await Promise.all([
        (async () => {
          if (r.title) return { title: r.title, author: r.author }
          try {
            const o = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent('https://youtu.be/' + r.videoId)}&format=json`).then((x) => x.json())
            if (o.title) {
              r.title = o.title
              r.author = o.author_name
              changed = true
            }
          } catch {}
          return { title: r.title ?? 'unknown', author: r.author }
        })(),
        (async () => {
          if (r.uploadDate) return r.uploadDate
          try {
            const html = await fetch(`https://www.youtube.com/watch?v=${r.videoId}`, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            }).then((x) => x.text())
            const m = html.match(/"uploadDate":"([^"]+)"/) ?? html.match(/"publishDate":"([^"]+)"/)
            if (m) {
              r.uploadDate = m[1].slice(0, 10)
              changed = true
            }
          } catch {}
          return r.uploadDate ?? 'unknown'
        })(),
      ])
      return {
        videoId: r.videoId,
        title: titleInfo.title,
        author: titleInfo.author,
        uploadDate,
        reason: r.reason ?? 'captions',
        attempts: r.attempts,
        nextCheckAt: r.nextCheckAt,
        gaveUp: r.gaveUp,
      }
    }),
  )
  if (changed) save(rows)
  console.log(JSON.stringify(enriched, null, 2))
} else if (cmd === 'add' && id && url) {
  const existing = rows.find((r) => r.videoId === id)
  const why = reason ?? existing?.reason ?? 'captions'
  // One check already happened, so the first retry waits a full backoff step.
  if (existing) {
    existing.url = url
    existing.reason = why
    existing.attempts = 1
    existing.nextCheckAt = now + BACKOFF_HOURS[0] * HOUR
    existing.gaveUp = false
  } else {
    rows.push({
      videoId: id,
      url,
      reason: why,
      attempts: 1,
      nextCheckAt: now + BACKOFF_HOURS[0] * HOUR,
      addedAt: now,
      gaveUp: false,
    })
  }
  save(rows)
  console.log(JSON.stringify(rows.find((r) => r.videoId === id)))
} else if (cmd === 'bump' && id) {
  const row = rows.find((r) => r.videoId === id)
  if (!row) {
    console.error(`not queued: ${id}`)
    process.exit(1)
  }
  row.attempts += 1
  row.gaveUp = row.attempts >= MAX_ATTEMPTS
  row.nextCheckAt = now + (BACKOFF_HOURS[Math.min(row.attempts, BACKOFF_HOURS.length) - 1] ?? 72) * HOUR
  save(rows)
  console.log(JSON.stringify(row))
} else if (cmd === 'drop' && id) {
  save(rows.filter((r) => r.videoId !== id))
  console.log(`dropped ${id}`)
} else {
  console.error('usage: node queue.mjs <list|due|titles|add|bump|drop> [videoId] [url]')
  process.exit(1)
}
