# my_skills

Vlastní skills. Zdroj je tady, nainstalovaná kopie žije v `~/.agents/skills/`.

## Struktura

```
skills/<name>/SKILL.md   # jeden skill = jedna složka, frontmatter: name, description, metadata
skills/<name>/scripts/   # volitelné helper skripty (skill se na ně odkazuje relativně)
```

## Instalace / aktualizace

```bash
npx skills add "D:\web_app\my_skills" -g -y
```

- `-g` = globálně (do `~/.agents/skills/`, čte to opencode i ostatní agenti), bez `-g` by to bylo jen v tomto repo.
- **Update nefunguje** (`npx skills update` u lokálního source skončí hláškou „cannot be checked automatically“). Změnu tu propaguješ tím samým příkazem — CLI překopíruje soubory.
- Kdybys chtěl živou kopii bez překopírovávání, nainstaluj symlinkem (`--copy` je default, symlink na Windows padá). Editace v `my_skills` pak jdou rovnou do `~/.agents/skills/`.

## Jak se skill vyvolá

- `metadata.opencode/autoinvoke: "false"` → model skill nevidí, nevyvolá ho sám.
- `metadata.opencode/slash: "true"` → v opencode v2.1.2 zatím nevygeneruje `/name` command, reálně funguje command file `~/.config/opencode/commands/<name>.md`:

  ```markdown
  ---
  description: ...
  ---

  Load the `<name>` skill with the skill tool (id `<name>`) and follow it.

  $ARGUMENTS
  ```

  Command file řekne modelovi skill načíst přesně podle jména — funguje i u skillu, který model nevidí.
