# Audio transcription and missing captions

Loaded when `normalize.mjs` reports no transcript segments, when the user wants an exact
transcript from audio, or when a provider key is missing. Paths are relative to `<skill-dir>`.
Captions are free and are the default; everything below is optional and may cost money.

## Re-transcribing

Captions are free and good enough to extract information, but auto-captions mangle names,
numbers, and product terms. When the user wants an exact transcript, transcribe the audio:

```
node "<skill-dir>/scripts/fetch.mjs" <videoId> --audio
node "<skill-dir>/scripts/normalize.mjs" "<root>/<videoId>"
```

This overwrites the raw JSON and the whole transcript, including one that was already cached.
One transcript per video is intentional: two copies would leave `note.md` ambiguous, and the
captions version can always be fetched again for free.
Re-running `--audio` on a video that is already transcribed pays again — if only the note is
missing, use the existing transcript instead.
It is usually billed per minute (Deepgram), but it can be free: Groq's Whisper is free and
takes up to ~25 MB of audio per request — roughly 20 minutes of a talk, so longer videos need
a different provider. Either way it needs a provider key and network, so run it only when
asked. An existing `note.md` was built from the old text — say that it is now stale and offer
to regenerate it. Prerequisites are listed below under "No transcript".

## Audio transcription — language and provider

Audio transcription is optional and costs money; captions are the default path. When it is
needed:

- **Provider.** The extractor (`@steipete/summarize`) picks the first provider whose key is
  set — AssemblyAI, Gemini, OpenAI, FAL, Deepgram. `fetch.mjs` prefers Deepgram: with
  `DEEPGRAM_API_KEY` set it masks the other keys for the first attempt and retries with the
  real environment if that yields no transcript, so a video is never lost because one provider
  failed. `transcriptionProvider` in the result says who actually transcribed — the note must
  name that instead of assuming Deepgram.
- **Cost.** Deepgram is billed per minute; Groq's Whisper is free but accepts up to ~25 MB of
  audio per request. Say which one applies before spending anything.
- **Language.** It cannot be forced: the request always sends `detect_language=true`. The
  only Deepgram-specific lever is the model (`SUMMARIZE_DEEPGRAM_TRANSCRIPTION_MODEL`, default
  `nova-3`); the other providers have their own.

So decide before paying:

1. Know the video's language — read it from an existing transcript or the title; if neither is
   conclusive, ask the user.
2. Check it against the provider's supported language list (for Deepgram: the model's language
   list in Deepgram's docs). If the language is not supported, do not run `--audio`: say which
   language it is and that the run would be wasted money.
3. After transcribing, read the first lines. Wrong language or gibberish means a failed run:
   ask the user what language the video is in and report it. This tool cannot resend with a
   manual language code — the request is always auto-detect — so do not promise a retry.

## No transcript

`normalize.mjs` exits with `no transcript segments in extract.raw.json` when YouTube has no
caption track for the video. Then:

1. Read the upload date from `<root>/<videoId>/published.txt` if it still exists (a failed
   normalize leaves it behind); missing means unknown.
2. Clean up this run's artefacts but **keep `published.txt`**: delete `extract.raw.json` and
   `meta.json` from `<root>/<videoId>/`, so the directory cannot pretend to be a transcript (it
   has no `transcript.md`). Keep the date file — the upload date is what decides between waiting
   and transcribing, and it cannot be recovered later. Do this by hand, not with `remove.mjs`:
   that deletes the whole directory, `published.txt` included, and the date is the one thing
   here that cannot be recovered.
3. Ask the user which way to go — wait, transcribe from audio, or drop it from the queue
   (`node "<skill-dir>/scripts/queue.mjs" drop <videoId>`) — and give a recommendation based
   on that date:
   - **uploaded less than ~30 days ago → wait.** Captions are usually generated within hours;
     queue it with `node "<skill-dir>/scripts/queue.mjs" add <videoId> "<url>" --reason captions`
     and say when it will be re-checked.
   - **older than ~30 days, or date unavailable → the captions will never come.** YouTube does
     not add captions retroactively to old videos (captions disabled, music only, unsupported
     language), so waiting is pointless. Offer to transcribe from audio and name the cost: free
     up to the provider's size limit (Groq's Whisper, ~25 MB of audio) or billed per minute
     (Deepgram).
   - **a live stream that has not ended yet → wait.** Its captions are finalised after the
     stream ends, so it is the "too fresh" case regardless of age; queue it with
     `--reason captions` and re-check once the stream is over.
4. Transcribe only on explicit consent:
   `node "<skill-dir>/scripts/fetch.mjs" <videoId> --audio`, then normalize as usual.
   If normalize still finds no segments after that, the message names the reason — check the
   three prerequisites below before reporting a real failure.
   Otherwise report the real failure and, if it was queued, leave it queued.
5. **Transcription needs a provider key. If there is none, or the user declines to pay for
   one, the video waits** — it is not a failure and it is not lost:
   `node "<skill-dir>/scripts/queue.mjs" add <videoId> "<url>" --reason transcription`
   and say that it stays queued until a key is available. A queued video with that reason is
   waiting for a credential, not for YouTube, so caption retries cannot help it
   (`references/queue.md`). The captions path needs no key, so a video that only waits for
   captions is never blocked this way.

Never summarize the description as if it were the video. Never install software on your own.

The audio path needs all three on the machine: `yt-dlp` and `ffmpeg` on PATH (the extractor
runs `yt-dlp -x --audio-format mp3`), plus a transcription provider key. Deepgram is preferred
(`DEEPGRAM_API_KEY`); the extractor also accepts AssemblyAI (`ASSEMBLYAI_API_KEY`), Gemini
(`GEMINI_API_KEY` or `GOOGLE_API_KEY`), OpenAI (`OPENAI_API_KEY`), FAL (`FAL_KEY`) and Groq
(`GROQ_API_KEY`). Check with `yt-dlp --version`, `ffmpeg -version` and the credential check
below; name the missing one and stop.

## Credentials — never in chat

Only the audio path needs a provider key; captions never do. The extractor reads it from
the agent's own process environment, so it never has to be typed into the conversation.

When it is missing:

1. Say exactly where it belongs: an environment variable in the user's own account environment
   (not in this repo, not in the skill, not in chat), set by
   the user, followed by a restart of the agent so the new process picks it up. Deepgram is the
   preferred one: `DEEPGRAM_API_KEY` — the others are `ASSEMBLYAI_API_KEY`, `GEMINI_API_KEY`,
   `OPENAI_API_KEY`, `FAL_KEY`, `GROQ_API_KEY`.
2. Say how to create one — for Deepgram: `console.deepgram.com` → API Keys → create. New accounts usually
   include free credit, so a few hours of audio often costs nothing — check the console for
   the current amount rather than promising a number.
3. Verify presence without revealing it — for Deepgram:
   `node -p "process.env.DEEPGRAM_API_KEY ? 'set' : 'missing'"` (same for any other provider
   key). Never print, echo, log or persist the value.
4. If the user refuses, leave the video queued with the reason `transcription`
   (`node "<skill-dir>/scripts/queue.mjs" add <videoId> "<url>" --reason transcription`) — that
   is a valid answer, not a failure.
