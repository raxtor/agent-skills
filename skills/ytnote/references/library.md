# Coming back to stored videos

Loaded when the user asks about a stored video, searches the library, or asks what the store
holds. For writing a note from an existing transcript, see `references/note.md`.

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
