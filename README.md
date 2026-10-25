# agent-skills

My own agent skills. One skill = one folder under `skills/`; its per-agent invocation aliases
live in `commands/<skill>/`.

[![skills.sh](https://skills.sh/b/raxtor/agent-skills)](https://skills.sh/raxtor/agent-skills)

## What is in here

| skill | what it does |
|---|---|
| [`skills/ytnote`](skills/ytnote) | Turns a YouTube URL into a cached, timestamped transcript plus a short note with clickable highlights. Searches stored transcripts by keyword. Can re-transcribe from audio when the captions are too lossy. |

## Security

`ytnote` ingests third-party content by design: the transcript, the title and the description
come from a YouTube page the user supplies. The skill treats all of it as **data, never
instructions** — the `SKILL.md` has an explicit *Untrusted content* section, the only commands
it runs are the ones written in the skill file, and their arguments come from the video ID and
the paths named there, never from fetched text.

The automated audits on skills.sh report this skill as **Socket: 0 alerts / Snyk: MEDIUM (W011
"Exposure to untrusted third-party content")**. That finding is accurate rather than a defect:
W011 is a statement about the data flow, and a skill that turns a YouTube URL into a transcript
cannot avoid it. The mitigation is the handling above plus a narrow blast radius — the captions
path needs no API key, no audio download and runs no command taken from the fetched text.

## Install

```bash
npx skills add raxtor/agent-skills -g -y                                  # from GitHub (recommended — npx skills update works)
npx skills add raxtor/agent-skills -g -a claude-code codex opencode -y   # pick the agents
npx skills add <local path> -g -y                                        # from a local checkout
```

The CLI decides where the skill lands:

- agents with their own directory (Claude Code) get a **link** to the canonical copy,
- agents that follow the `.agents/skills` convention (Codex, Gemini CLI, GitHub Copilot,
  Antigravity, Cline, opencode) **read** the canonical copy at `~/.agents/skills/<skill>`.

`npx skills ls -g --json` tells you who sees it (the `agents` field).

## The `/ytnote` alias

`npx skills` installs `SKILL.md` only; the **slash command has to be added per agent**.
Templates live in [`commands/ytnote/`](commands/ytnote):

| agent | file | format |
|---|---|---|
| opencode | `~/.config/opencode/commands/ytnote.md` | markdown + `$ARGUMENTS` |
| Claude Code | `~/.claude/commands/ytnote.md` | markdown + `$ARGUMENTS` |
| Codex | `~/.codex/prompts/ytnote.md` | markdown + `$ARGUMENTS` |
| Gemini CLI | `~/.gemini/commands/ytnote.toml` | TOML + `{{args}}` |

Without the alias the skill still works — the agent loads it on its own when the task fits
(e.g. when a YouTube link shows up in chat). The alias means "I call it by hand, right now".

## Development

```bash
git clone https://github.com/raxtor/agent-skills.git
cd agent-skills
npx skills add . -g -y      # install from the source
# ... edit the skill ...
git push                    # then: npx skills update ytnote
```

Note: with a **local** source (`sourceType: local`) `npx skills update` does not work — the CLI
reports *"cannot be checked automatically"*. Re-install to propagate instead:

```bash
npx skills add <local path> -g -y
```

With a **GitHub** source, update works normally.

## How the skill gets invoked

- `metadata.opencode/autoinvoke: "false"` — **opencode only**: the model does not see the skill
  and will not load it by itself (manual mode). Other agents ignore the key and pick the skill
  up on their own.
- `metadata.opencode/slash: "true"` — in opencode v2.1.2 this does not produce a `/name`
  command yet; the command file above is what actually works.

```markdown
---
description: ...
---

Load the `<name>` skill with the skill tool (id `<name>`) and follow it.

$ARGUMENTS
```

The command tells the model to load the skill by its exact name — which works even for a skill
the model cannot see.

## Requirements for the audio path

Captions need nothing but network access. Transcribing the audio additionally needs `yt-dlp`,
`ffmpeg` and a provider key (Deepgram preferred; the extractor also accepts AssemblyAI, Gemini,
OpenAI, FAL and Groq). The skill explains the details — read `skills/ytnote/SKILL.md`.

## License

MIT — see [LICENSE](LICENSE).
