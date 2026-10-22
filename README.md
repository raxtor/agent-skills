# my_skills

Moje vlastní skills pro agenty. Každý skill = jedna složka pod `skills/`.

[![skills.sh](https://skills.sh/b/raxtor/my-skills)](https://skills.sh/raxtor/my-skills)

## Obsah

| skill | co dělá |
|---|---|
| [`skills/ytnote`](skills/ytnote) | YouTube video → časovaný přepis + poznámka s klikacími na highlights; vyhledávání v uložených přepisech; přepis z audia přes Deepgram |

## Instalace

```bash
npx skills add raxtor/my-skills -g -y                                  # z GitHubu (doporučeno — funguje i npx skills update)
npx skills add raxtor/my-skills -g -a claude-code codex opencode -y   # vybrané agenty
npx skills add <lokalní cesta> -g -y                                  # z lokální kopie repo
```

CLI si sám rozhodne, kam skill dá:

- agenti s vlastním adresářem (Claude Code) dostanou **odkaz** na kanonickou kopii,
- agenti na konvenci `.agents/skills` (Codex, Gemini CLI, Copilot, Antigravity, Cline, opencode) **čtou** kanonickou kopii `~/.agents/skills/<skill>`.

Kdo skill uvidí, napíše `npx skills ls -g --json` (pole `agents`).

## `/ytnote` — alias pro ruční vyvolání

`npx skills` instaluje jen `SKILL.md`; **slash command si musíš přidat sám** pro každý agent, kde ho chceš. Šablony jsou v [`commands/`](commands):

| agent | kam soubor | formát |
|---|---|---|
| opencode | `~/.config/opencode/commands/ytnote.md` | markdown + `$ARGUMENTS` |
| Claude Code | `~/.claude/commands/ytnote.md` | markdown + `$ARGUMENTS` |
| Codex | `~/.codex/prompts/ytnote.md` | markdown + `$ARGUMENTS` |
| Gemini CLI | `~/.gemini/commands/ytnote.toml` | TOML + `{{args}}` |

Bez aliasu skill pořád funguje — agent ho načte sám, když sedne zadání (např. když v chatu hodíš YouTube odkaz). Alias znamená „vyvolám ho ručně a hned“.


## Vývoj

```bash
git clone https://github.com/raxtor/my-skills.git
cd my_skills
npx skills add . -g -y      # nainstaluj ze zdroje
# ... uprav skill ...
git push                    # a pak npx skills update ytnote
```

Pozor: u **lokálního** zdroje (`sourceType: local`) `npx skills update` nefunguje — CLI hlásí *„cannot be checked automatically“*. Propaguje se to znovu instalací:

```bash
npx skills add <lokalní cesta> -g -y
```

U **GitHub** zdroje update funguje normálně.

## Jak se skill vyvolá

- `metadata.opencode/autoinvoke: "false"` → **jen v opencode**: model skill nevidí, nevyvolá ho sám (ruční režim). Ostatní agenty tenhle klíč ignorují a skill si vyvolají samy.
- `metadata.opencode/slash: "true"` → v opencode v2.1.2 z toho zatím nevznikne `/name` command, reálně to funguje přes command file (viz výše).

```markdown
---
description: ...
---

Load the `<name>` skill with the skill tool (id `<name>`) and follow it.

$ARGUMENTS
```

Příkaz řekne modelovi skill načíst přesně podle jména — funguje i u skillu, který model nevidí.

