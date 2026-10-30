// Deletes a stored video from the archive. Captions can be fetched again for free, so a
// captions-only video is cheap to drop; an audio transcription was paid for, and its
// extract.raw.json is the only copy of what was bought, so it never goes without
// --include-paid-raw.
// Dry run by default: prints what would go, deletes nothing until --yes.
// Usage: node remove.mjs <videoId> [<videoId> ...] [--yes] [--raw-only] [--include-paid-raw]
//        node remove.mjs --all-captions-raw [--yes]
import { existsSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve, sep } from 'node:path'

const root = resolve(process.env.YTNOTE_HOME || join(homedir(), '.ytnote'))
const argv = process.argv.slice(2)
const flags = new Set(argv.filter((a) => a.startsWith('--')))
const ids = argv.filter((a) => !a.startsWith('--'))

const yes = flags.has('--yes')
const rawOnly = flags.has('--raw-only')
const includePaidRaw = flags.has('--include-paid-raw')
const allCaptionsRaw = flags.has('--all-captions-raw')

const DIR_ID = /^[A-Za-z0-9_-]{11}$/
const queueFile = join(root, '_queue.json')

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`

const readMeta = (dir) => {
  try {
    return JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8'))
  } catch {
    return null
  }
}

// A video directory is small (a few MB), so walk it rather than tracking sizes.
const dirBytes = (dir) => {
  let bytes = 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) bytes += dirBytes(path)
    else bytes += statSync(path).size
  }
  return bytes
}

// Dropping the archive should also drop a pending queue row: the video is gone, so there is
// nothing left to retry.
const dropFromQueue = (id) => {
  if (!existsSync(queueFile)) return false
  const rows = JSON.parse(readFileSync(queueFile, 'utf8'))
  const next = rows.filter((r) => r.videoId !== id)
  if (next.length === rows.length) return false
  const tmp = `${queueFile}.tmp`
  writeFileSync(tmp, JSON.stringify(next, null, 2) + '\n')
  renameSync(tmp, queueFile)
  return true
}

const exitUsage = () => {
  console.error(
    'usage: node remove.mjs <videoId> [<videoId> ...] [--yes] [--raw-only] [--include-paid-raw]\n' +
      '       node remove.mjs --all-captions-raw [--yes]',
  )
  process.exit(1)
}

const badId = ids.find((id) => !DIR_ID.test(id))
if (badId) {
  console.error(`not a video id: ${badId}`)
  exitUsage()
}
if (!ids.length && !allCaptionsRaw) exitUsage()
if (!existsSync(root)) {
  console.error(`no store at ${root}`)
  process.exit(1)
}

// --- --all-captions-raw: the over-limit cleanup size.mjs suggests -------------------------
if (allCaptionsRaw) {
  const targets = []
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || !DIR_ID.test(entry.name)) continue
    const dir = join(root, entry.name)
    const raw = join(dir, 'extract.raw.json')
    if (!existsSync(raw)) continue
    // Transcribed raw is the paid copy. Leave it alone, no flag overrides this sweep.
    if (readMeta(dir)?.transcriptKind === 'transcribed') continue
    targets.push({ dir, raw, size: statSync(raw).size })
  }

  const total = targets.reduce((sum, t) => sum + t.size, 0)
  if (!targets.length) {
    console.log('nothing to free: no captions extract.raw.json in the store')
    process.exit(0)
  }
  const verb = yes ? 'removed' : 'would remove (dry run, pass --yes)'
  console.log(`${verb} ${targets.length} captions raw file(s), ${mb(total)} total`)
  for (const t of targets) console.log(`  ${t.dir.split(sep).pop()}  ${mb(t.size)}`)
  if (yes) for (const t of targets) rmSync(t.raw, { force: true })
  process.exit(0)
}

// --- per-video removal -------------------------------------------------------------------
const plan = []
let refused = 0

for (const id of ids) {
  const dir = join(root, id)
  if (!dir.startsWith(root + sep)) {
    console.error(`refusing path outside the store: ${dir}`)
    refused += 1
    continue
  }
  if (!existsSync(dir)) {
    console.error(`no archive for ${id} (nothing at ${dir})`)
    refused += 1
    continue
  }

  const meta = readMeta(dir)
  const paid = meta?.transcriptKind === 'transcribed'
  const title = meta?.title ?? 'unknown title'
  const note = existsSync(join(dir, 'note.md')) ? ', note' : ''

  if (rawOnly) {
    const raw = join(dir, 'extract.raw.json')
    if (!existsSync(raw)) {
      console.error(`${id}: no extract.raw.json to remove`)
      refused += 1
      continue
    }
    if (paid && !includePaidRaw) {
      console.error(
        `${id}: "${title}" was transcribed from audio, so extract.raw.json is the only copy ` +
          'of what was paid for. Pass --include-paid-raw to drop it anyway.',
      )
      refused += 1
      continue
    }
    plan.push({ id, dir, paid, kind: 'raw only', files: ['extract.raw.json'], size: statSync(raw).size })
    continue
  }

  if (paid && !includePaidRaw) {
    console.error(
      `${id}: "${title}" was transcribed from audio, so its extract.raw.json is the only copy ` +
        'of what was paid for. Pass --include-paid-raw to remove the whole video, or ' +
        '--raw-only --include-paid-raw to keep the transcript and note.',
    )
    refused += 1
    continue
  }
  plan.push({ id, dir, paid, kind: paid ? 'whole video (paid raw)' : `whole video${note}`, files: null, size: dirBytes(dir) })
}

if (!plan.length) {
  console.error(refused ? `nothing removed, ${refused} target(s) refused` : 'nothing to do')
  process.exit(refused ? 2 : 1)
}

const total = plan.reduce((sum, p) => sum + p.size, 0)
const verb = yes ? 'removed' : 'would remove (dry run, pass --yes)'
console.log(`${verb} ${plan.length} video(s), ${mb(total)} total`)

for (const p of plan) {
  const detail = p.files ? p.files.join(', ') : 'transcript, meta, note, raw'
  console.log(`  ${p.id}  ${mb(p.size)}  ${p.kind}: ${detail}`)
  if (!yes) continue
  if (p.files) for (const name of p.files) rmSync(join(p.dir, name), { force: true })
  else rmSync(p.dir, { recursive: true, force: true })
  if (dropFromQueue(p.id)) console.log(`    also dropped ${p.id} from the queue`)
}

if (!yes) {
  console.log('dry run: nothing was deleted')
  process.exit(0)
}
if (refused) {
  console.error(`${refused} target(s) refused and left alone`)
  process.exit(2)
}