---
name: create-work-item-from-jira
description: Use when the user asks to import a Jira ticket into this project as a work item, or invokes /create-work-item-from-jira <key>. Reads the Jira issue, writes docs/10-work-items/<ID>-<slug>.md with its front matter and description, updates the folder index, and adds the label configured in docs/work-items-settings.json to the Jira issue.
---

# Import a work item from Jira

Creates **one** work item in `docs/10-work-items/` from a Jira issue. Renumbers nothing,
overwrites nothing, updates no previous import. Creating is this skill's only verb.

The issue key is the command's argument — `PROJ-1061`. If it is missing, ask for it
before anything else.

In this skill, `<skill-dir>` is the directory containing this `SKILL.md`. Its location
depends on the agent (`.agents/skills/`, `.claude/skills/`…): never assume it.

## 1. Read the label

```bash
node -e "const s=JSON.parse(require('fs').readFileSync('docs/work-items-settings.json','utf8')); if(!/^\S+$/.test(s.jiraLabel||'')) throw new Error('jiraLabel empty or containing spaces'); process.stdout.write(s.jiraLabel)"
```

Keep the printed value as `label`. If the command fails — missing file, invalid JSON,
`jiraLabel` missing, empty or containing spaces, which Jira labels cannot — **stop** and tell the
user. Nothing has been read from or written to Jira at this point. Never fall back to a default
label: the label is how the user tracks which issues were handed to the agent.

## 2. Resolve the Atlassian site

Call `getAccessibleAtlassianResources` and keep the site's `id` as `cloudId`.

**Exactly one site is expected.** If several are returned, **stop** and ask which one rather
than picking one: the wrong site would import a homonymous issue from another project.

## 3. Read the issue

Call `getJiraIssue` with the `cloudId` from block 2, the issue key,
`responseContentFormat: "markdown"`, and the fields `summary`, `description`, `parent`.

Issue not found or not accessible: **stop**. Nothing is written, neither locally nor in Jira.

Keep:

| Value | Where to read it |
|---|---|
| `summary` | `fields.summary` |
| `parent` | `fields.parent.fields.summary`, or nothing if there is no parent |
| `description` | `fields.description` |
| `url` | `webUrl` |

## 4. Write the file

`compose.js` does all the exact work — key validation, number padding to four digits,
prefix guard, duplicate refusal, capped slug, YAML escaping, image substitution.
Reimplement none of it here: this logic is the only tested part of the setup, and a second,
untested copy would contradict it one day.

First write the payload to a temporary file outside the repository — for example in a
directory created with `mktemp -d`, with no need to keep it afterwards — since the description
may contain anything, including what would break an inline command-line argument:

```json
{
  "key": "PROJ-1061",
  "summary": "<fields.summary>",
  "parent": "<parent summary, or null>",
  "description": "<fields.description, or null>",
  "url": "<webUrl>"
}
```

Then, from the repository root:

```bash
node "<skill-dir>/compose.js" < "<path-to-the-json>"
```

The command prints the path of the created file. If it exits with an error, **stop** and
report its message verbatim. Nothing has been written to Jira at this point.

## 5. Add the label

Only after block 4 has succeeded. The order matters: an issue carrying the label always
exists locally, never the other way around.

Read the labels again with a `getJiraIssue` call using the `cloudId` from block 2 and the issue
key, on the `labels` field only, rather than reusing those from block 3: this narrows
the window during which a concurrent change would be lost.

- `label` (from block 1) already present: write nothing.
- Otherwise, `editJiraIssue` with the `cloudId` from block 2, the issue key, and
  `fields: { labels: [ ...the labels just read, label ] }`.
  **The full list**, never `[label]` alone: this tool replaces the field, it does not
  append to it, and writing the single label would erase all the others.

If Jira refuses, **do not undo the local work**. The file stays, and the failure is reported
in block 7.

## 6. Update the index

In `docs/10-work-items/README.md`, add an entry after the neighboring entries: the
file name in backticks, an em dash, then a real description of the issue's content, written
in the language of the project's documentation — never the Jira title copied as is. For example:

```
- `PROJ-1061-rc-name-inverted-in-the-menu.md` — imported Jira issue
  (epic "Apollo 2 - Support"): the names of the snap-to-neighbor and dynamic snap functions
  are swapped in the menu, while the tooltips remain correct.
```

## 7. Announce

State the path created, and the label status — added, already present, or refused with the
reason. Nothing more.
