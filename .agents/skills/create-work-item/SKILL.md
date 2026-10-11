---
name: create-work-item
description: Use when the user asks to create a new work item or ticket for this project, or invokes /create-work-item <title>. Allocates the next ticket number, writes docs/10-work-items/<PREFIX>-<nnnn>-<slug>.md with its front matter, and updates the folder index.
---

# Create a work item

Creates **one** numbered work item in `docs/10-work-items/`. Renumbers nothing, rewrites no existing ticket, touches no status. Creating is this skill's only verb.

The title is the command's argument. If it is missing, ask for it before anything else.

## 1. Read the prefix

Shell state does not survive from one command to the next: each block below therefore sets
its own variable instead of relying on an inheritance that does not exist.

```bash
prefix=$(node -e "const s=JSON.parse(require('fs').readFileSync('docs/work-items-settings.json','utf8')); if(!s.prefix) throw new Error('empty prefix'); process.stdout.write(s.prefix)")
test -n "$prefix" || { echo "unreadable settings or empty prefix — aborting"; exit 1; }
```

If the command fails — missing file, invalid JSON, empty `prefix` — **stop** and tell the
user. Never fall back to a default value: a misnamed ticket would go unnoticed.

## 2. Compute the next number

Set `prefix` again (block 1) before using it: this is a new block, with no inherited state.

```bash
prefix=$(node -e "const s=JSON.parse(require('fs').readFileSync('docs/work-items-settings.json','utf8')); if(!s.prefix) throw new Error('empty prefix'); process.stdout.write(s.prefix)")
test -n "$prefix" || { echo "unreadable settings or empty prefix — aborting"; exit 1; }

last=$(ls docs/10-work-items/ | sed -nE "s/^${prefix}-0*([0-9]+)-.*/\1/p" | sort -n | tail -1)

if [ -z "$last" ]; then
  if ls docs/10-work-items/ | grep -q "^${prefix}-"; then
    echo "empty scan although ${prefix}-* tickets exist — anomaly, aborting"; exit 1
  fi
  number=1
else
  number=$((last + 1))
fi
printf '%04d' "$number"
```

The pattern reads `([0-9]+)` and **never** `([0-9]{4})`: a fixed-width read would stop
seeing tickets written with another width — such as older three-digit ones — and start
again from 1, overwriting them.

**A scan that returns nothing while `docs/10-work-items/` already contains `<prefix>-*`
files is an anomaly, not an empty repository — in that case, stop.** Falling back to `1` only applies to a folder that truly has no ticket with this prefix. Otherwise, the highest number found plus one.

The block prints the number on four digits: keep it as `<nnnn>`.

## 3. Reduce the title to a slug

`title` is the argument received by the command (see above). Set it with a quoted heredoc, in the same block as the slug, never by pasting the title between quotes: the quoted `'TITLE'` delimiter keeps `'`, `"`, `$` and backticks literal, whatever the title contains.

```bash
title=$(cat <<'TITLE'
<the title, exactly as typed>
TITLE
)
slug=$(node -e "process.stdout.write(process.argv[1].normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''))" "$title")
test -n "$slug" || { echo "title cannot be reduced to a slug — ask for another title — aborting"; exit 1; }
echo "$slug"
```

Keep the printed value as `<slug>`.

Accents stripped, lowercase, everything else turned into dashes, repeated dashes collapsed,
edge dashes trimmed. The diacritics range is written with the `\u0300-\u036f` escapes, never as raw characters: raw bytes would silently survive an editor normalization or a non-UTF-8 pipeline.

If `slug` is empty — a title such as `"???"`, `"— :"` or only spaces — **stop** and
ask for another title. An empty slug would produce a `<PREFIX>-<nnnn>-.md` file.

## 4. Refuse to overwrite

If `docs/10-work-items/<PREFIX>-<nnnn>-<slug>.md` already exists, **stop** and say so.
Never overwrite a work item.

## 5. Write the file

The file contains **the front matter and nothing else** — no `#` heading, no document
outline. The body belongs to the author, and a template that has to be erased is worse than nothing.

```yaml
---
id: <PREFIX>-<nnnn>
title: "The title as typed, unchanged"
status: new
superpowers-class: 
tags: []
---
```

`title` is **always** in straight double quotes: a title containing ": " breaks YAML
parsing if it is not. Inside the quotes, escape each `\` as `\\` and each `"` as `\"`,
as the Jira import does. Apart from that escaping, the title is kept exactly as typed, without rewording.

`status: new` always. The possible values are `draft`, `new`, `deferred`,
`in-progress`, `review`, `done`, `canceled` — but creation sets only one.

`superpowers-class`: possible values are `spike`, `bounded`, `architectural`. Left empty at creation.

## 6. Update the index

In `docs/10-work-items/README.md`, add an entry after the neighboring entries: the file
name in backticks, an em dash, then the title — the body is still empty at this point.
For example:

```
- `AMP-0001-fix-login-timeout-on-slow-networks.md` — Fix login timeout on slow networks
```

## 7. Announce

State the path created, and nothing more.
