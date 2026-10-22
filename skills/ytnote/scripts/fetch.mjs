// Fetch a YouTube transcript with @steipete/summarize and write its stdout byte-for-byte.
// Shell redirection mangles UTF-8 on some platforms, so never capture the text.
// Captions only by default; --audio transcribes the audio (needs yt-dlp, ffmpeg, a provider key).
// --audio prefers Deepgram and falls back to whichever provider the environment offers.
// Usage: node fetch.mjs <11-char-videoId> [--audio]
import { spawn } from 'node:child_process'
import { createWriteStream, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const id = process.argv[2]
if (!/^[A-Za-z0-9_-]{11}$/.test(id ?? '')) {
  console.error('usage: node fetch.mjs <11-char-videoId>')
  process.exit(1)
}

const root = process.env.YTNOTE_HOME || join(homedir(), '.ytnote')
const dir = join(root, id)
const file = join(dir, 'extract.raw.json')
mkdirSync(dir, { recursive: true })

const url = `https://www.youtube.com/watch?v=${id}`
const pkg = '@steipete/summarize@0.25.2'
const audio = process.argv.includes('--audio')
const childFlags = ['--extract', '--timestamps', '--json', '--no-color', '--youtube', audio ? 'yt-dlp' : 'web']
const win = process.platform === 'win32'
const [cmd, args] = win
  ? [`npx -y ${pkg} "${url}" ${childFlags.join(' ')}`, []]
  : ['npx', ['-y', pkg, url, ...childFlags]]

// Upload date is not in the extract output, so take it from the watch page. Best effort:
// a missing date means "unknown", never a failed fetch.
async function saveUploadDate() {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
    const html = await res.text()
    const m = html.match(/"uploadDate":"([^"]+)"/) ?? html.match(/"publishDate":"([^"]+)"/)
    if (m) writeFileSync(join(dir, 'published.txt'), `${m[1]}\n`)
  } catch {
    // ignore
  }
}

const run = (env) =>
  new Promise((resolve) => {
    const child = spawn(cmd, args, { shell: win, stdio: ['ignore', 'pipe', 'inherit'], env })
    const out = createWriteStream(file)
    child.stdout.pipe(out)
    let exit = null
    let flushed = false
    const done = () => {
      if (exit !== null && flushed) resolve(exit)
    }
    child.on('close', (code) => {
      exit = code ?? 1
      done()
    })
    out.on('close', () => {
      flushed = true
      done()
    })
  })

const hasSegments = () => {
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8'))
    const extracted = raw.extracted ?? raw
    return (extracted.transcriptSegments?.length ?? 0) > 0
  } catch {
    return false
  }
}

// The extractor picks the first provider whose key is set (AssemblyAI, Gemini, OpenAI, FAL,
// Deepgram), so Deepgram only wins when it is the sole key. Preferred provider: mask the
// others for the first attempt, then retry with the real environment as the fallback.
const others = [
  'ASSEMBLYAI_API_KEY',
  'GEMINI_API_KEY',
  'GOOGLE_API_KEY',
  'GOOGLE_GENERATIVE_AI_API_KEY',
  'OPENAI_API_KEY',
  'FAL_KEY',
  'GROQ_API_KEY',
]

let code
if (audio && process.env.DEEPGRAM_API_KEY) {
  const onlyDeepgram = { ...process.env }
  for (const key of others) delete onlyDeepgram[key]
  code = await run(onlyDeepgram)
  if (code !== 0 || !hasSegments()) {
    console.error('deepgram produced no transcript; retrying with any provider')
    code = await run(process.env)
  }
} else {
  code = await run(process.env)
}

if (code !== 0) {
  rmSync(file, { force: true })
  console.error(`summarize exited with ${code}`)
  process.exit(code ?? 1)
}
await saveUploadDate()
console.log(file)
