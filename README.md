# my_skills

Moje vlastní skills pro agenty. Každý skill = jedna složka pod `skills/`.

[![skills.sh](https://skills.sh/b/raxtor/my-skills)](https://skills.sh/raxtor/my-skills)

## Obsah

| skill | co dělá |
|---|---|
| [`skills/ytnote`](skills/ytnote) | YouTube video → časovaný přepis + poznámka s klikacími na highlights; vyhledávání v uložených přepisech; přepis z audia přes Deepgram |

## Instalace

```bash
npx skills add raxtor/my-skills -g -y     # z GitHubu (doporučeno — funguje i npx skills update)
npx skills add <lokalní cesta> -g -y     # z lokální kopie repo
```

V opencode se skill vyvolá jako `/ytnote` (command file `~/.config/opencode/commands/ytnote.md`).

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

- `metadata.opencode/autoinvoke: "false"` → model skill nevidí, nevyvolá ho sám (ruční režim).
- `metadata.opencode/slash: "true"` → v opencode v2.1.2 z toho zatím nevznikne `/name` command, reálně to funguje přes command file:

  ```markdown
  ---
  description: ...
  ---

  Load the `<name>` skill with the skill tool (id `<name>`) and follow it.

  $ARGUMENTS
  ```

  Příkaz řekne modelovi skill načíst přesně podle jména — funguje i u skillu, který model nevidí.
