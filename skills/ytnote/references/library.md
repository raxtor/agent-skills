# Coming back to stored videos

Loaded when no URL was given, or when the user asks about a stored video, searches the library,
or asks what the store holds. For writing a note from an existing transcript, see
`references/note.md`.

## No URL — welcome and library

A bare `/ytnote` is neither an error nor a reason to guess. Run the start-of-invocation check
first, then, in the user's language:

1. Say in two or three lines what this does: turns a URL into a cached timestamped transcript
   and `note.md` with clickable highlights, searches stored videos by keyword, and can
   re-transcribe from audio when exact wording matters.
2. Show the library: the 10 most recently added videos from `<root>/*/meta.json` (sort by
   `fetchedAt`), each with title, publish date, and whether `note.md` exists. If there are
   more, say how many.
3. If the queue is not empty, show it as well (`references/queue.md`): how many videos are
   waiting, as a table with titles. The user decides from there — keep waiting, drop, or
   transcribe.
4. Ask for a URL, or which of them to open.

An empty store skips step 2: description plus a request for the first URL.

## Stored videos

Everything about one video lives in `<root>/<videoId>/`. When the user returns to it, read
`meta.json` and, if present, `note.md` and `discussion.md` — never re-fetch, never regenerate the
note unasked.
When asked what the library holds, list `<root>/*/meta.json` and show title, publish date,
duration, and whether a note exists; build no stored index, the directories are the index.

Search notes first (`*/note.md`, then `*/discussion.md`). If they miss, search `*/transcript.md` and read the matching
parts — never paste a whole transcript into the chat, and never re-watch the video when the
text is already on disk. If the question needs the surrounding argument rather than a keyword
hit, read that file in sequential chunks.

`transcript.md` is the whole video, not a digest: the note sits on top of it, never instead of
it. Answer from the transcript, give the timestamp of the passage, and if the transcript does
not answer the question, say that instead of filling the gap from your own knowledge. Re-fetch
only when `transcript.md` is missing or empty — a new session that does not remember the
analysis still has the source text on disk.
