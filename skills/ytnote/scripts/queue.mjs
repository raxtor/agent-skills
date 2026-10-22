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

const [cmd, id, url] = process.argv.slice(2)
const rows = load()
const now = Date.now()

if (cmd === 'list') {
  console.log(JSON.stringify(rows, null, 2))
} else if (cmd === 'due') {
  console.log(JSON.stringify(rows.filter((r) => !r.gaveUp && r.nextCheckAt <= now), null, 2))
} else if (cmd === 'titles') {
  // A queued video has no meta.json yet, so the title is not on disk. Resolve it here:
  // oEmbed for the title, the watch page for the upload date. Both best effort.
  const enriched = await Promise.all(
    rows.map(async (r) => {
      const info = { videoId: r.videoId, title: 'unknown', uploadDate: 'unknown', attempts: r.attempts, nextCheckAt: r.nextCheckAt, gaveUp: r.gaveUp }
      try {
        const o = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent('https://youtu.be/' + r.videoId)}&format=json`).then((x) => x.json())
        info.title = o.title
        info.author = o.author_name
      } catch {}
      try {
        const html = await fetch(`https://www.youtube.com/watch?v=${r.videoId}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        }).then((x) => x.text())
        const m = html.match(/"uploadDate":"([^"]+)"/) ?? html.match(/"publishDate":"([^"]+)"/)
        if (m) info.uploadDate = m[1].slice(0, 10)
      } catch {}
      return info
    }),
  )
  console.log(JSON.stringify(enriched, null, 2))
} else if (cmd === 'add' && id && url) {
  const existing = rows.find((r) => r.videoId === id)
  // One check already happened, so the first retry waits a full backoff step.
  if (existing) {
    existing.url = url
    existing.attempts = 1
    existing.nextCheckAt = now + BACKOFF_HOURS[0] * HOUR
    existing.gaveUp = false
  } else {
    rows.push({
      videoId: id,
      url,
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
