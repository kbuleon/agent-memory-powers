Project: **TO BE COMPLETED**

# Key files and directories

* `README.md`: project overview and repository layout. Maintained by the agent.
* `CODEMAP.md`: map of the repository's code, built from the sources only. Maintained by the agent.
* `ARCHITECTURE.md`: **software architecture only** — everything there is to know about the project's technical and software architecture. Features do not belong here, nor does `CODEMAP.md`. This file is **self-contained, with no outgoing links**. Maintained by the agent when an architectural boundary is crossed, not on every change.
* `TODO.md`: maintained manually by me. The agent does not touch it.
* `CHANGELOG.md`: history of software changes. Maintained by the agent. Each entry must be compact and reference a work item if one exists.
* `docs/`
	* `00-knowledge-base`: general knowledge base about the project,
	  including `010-glossary.md`, a domain glossary.
	* `05-draft`: drafts in progress. Written by me. The agent neither reads nor modifies them.
	* `07-studies`: one-off studies about how the repository works or about general topics. Written by the agent **at my request**. A study reflects the state of the repository at the date it was written: it is **not kept up to date**.
	* `10-work-items`: analyses of requests. Written by me. Named `<prefix>-<nnnn>-<slug>.md`. In a Superpowers brainstorming, the agent will be told explicitly which work item to read. The agent does not modify them, **except for the front matter**. Two families of work items coexist:
		* **Local work items**, created by the `/create-work-item` skill, whose prefix is read from `docs/work-items-settings.json` and whose number is allocated by the creation skill.
		* **Work items imported from Jira**, created by the `/create-work-item-from-jira` skill, which carry the Jira project prefix and the Jira issue number padded to four digits. In this case, the agent also writes the body, **at creation and only at creation**.
	* `20-specs`: Superpowers writes its specifications here, named `YYMMDD-<slug>.md`. For a brainstorming based on a **work item**, Superpowers names the spec `YYMMDD-<prefix>-<nnnn>-<slug>.md`.
	* `30-plans`: Superpowers writes its execution plans here, named `YYMMDD-<slug>.md`. If a plan is based on a spec carrying a work item number, Superpowers names the plan `YYMMDD-<prefix>-<nnnn>-<slug>.md`.
	* `40-adr`: Architecture Decision Records. **As work goes on, as soon as a decision is adopted, the agent must propose creating an ADR**, named `YYMMDD-<slug>.md`. The user must confirm the creation of the ADR.
	* `50-technical-references`: technical reference documents. Each document covers one specific topic. Important: they must be **kept up to date by the agent, as soon as the change happens**, in a concise, non-verbose way. The agent does not create new documents on its own initiative, but may propose creating one if the topic is not already covered by another document; once the user accepts, the agent creates it.
# Who to trust?
* The **source code is the only reliable source of truth**.
* The `10-work-items` are useful because they describe the raw request for a change or a fix. But the solution adopted may differ from the initial request. These documents are kept as a record.
* The `50-technical-references` aim to offer thematic technical documents to someone discovering the project. But although the agent must maintain them whenever a change is made, **the source code remains the only real truth**.
# Workflow
* The user writes their documents in `00-knowledge-base` and `05-draft`, and maintains their `TODO.md`.
* The user creates a new work item with the `/create-work-item <title>` skill, and the agent updates `docs/10-work-items/README.md`.
* The user imports a Jira issue with the `/create-work-item-from-jira <key>` skill: the agent creates the work item, updates `docs/10-work-items/README.md`, and adds the label set by `jiraLabel` in `docs/work-items-settings.json` to the original Jira issue.
* The user submits a `10-work-items` entry to Superpowers brainstorming.
* Superpowers iterates on the thinking with the user and classifies the work item in its `superpowers-class` field. The agent then sets its status to `in-progress`.
* What follows depends on the class:
	* `spike`: the answer is given to the user, and the agent sets the work item to `done`.
	* `bounded`: Superpowers moves straight on to development.
	* `architectural`: Superpowers produces a specification in `20-specs`, and the agent updates `docs/20-specs/README.md`. When the user approves the `20-specs`, Superpowers produces an execution plan in `30-plans`, and the agent updates `docs/30-plans/README.md`.
* When development starts — right after classification for `bounded` work, once the user approves the `30-plans` for `architectural` work — Superpowers **follows these instructions**:
	* **Sequential only**: One task at a time. No parallel runs.
	* **Clean context**: Give sub-agent only needed context with specs.
	* **Adaptive effort**: Match model power and reasoning depth to task difficulty.
	* **Strict review**: Check each delivery yourself. Reject if specs or edge cases fail. Fix before next step.
	* **Compact memory**: Summarize validated output into main context. Drop intermediate logs.
* As decisions are made along the way, the agent creates an entry in `40-adr` after the user confirms, and updates `docs/40-adr/README.md`.
* As development progresses, the agent updates the relevant topic document in `50-technical-references`; if it proposed creating a new one and the proposal was accepted, the agent updates `docs/50-technical-references/README.md`.
# Work item front matter
Every `10-work-items` entry carries a front matter:
```
---
id: <prefix>-<nnnn>
title: "The work item title"
status: new
superpowers-class: 
tags: []
---
```
The id prefix is configured in `docs/work-items-settings.json`.
The prefix may also be free: typed in manually, or imported from Jira.
An issue imported from Jira carries two extra marks: `tags` contains `Jira`, and a `jira` field holds the exact issue key — `PROJ-558` for a work item `PROJ-0558`, the local number being padded to four digits while the Jira key is not. Its `title` is the Jira issue summary as is, followed by the summary of its parent in brackets when the issue has a parent.
The front matter of an imported issue reads:
```
---
id: PROJ-0558
title: "The Jira issue summary [The parent summary]"
status: new
superpowers-class: 
tags: [Jira]
jira: PROJ-558
---
```
The possible `status` values are:
* `draft`: set manually by the user.
* `new`: status after the work item is created by the `/create-work-item` or `/create-work-item-from-jira` skill.
* `deferred`: set manually by the user.
* `in-progress`: set by the agent once Superpowers has classified the work item.
* `review`: set by the agent when Superpowers reaches the code review step.
* `done`: set by the agent at the final commit of the development — or, for a `spike`, once the answer has been given.
* `canceled`: set manually by the user.
The `superpowers-class` must be assigned by Superpowers during its classification, and may take the values:
* `spike`: a question whose output is an answer, not code.
* `bounded`: a well-scoped change in code that already exists in the repository.
* `architectural`: a new project, a new subsystem, or an architectural change.
The `tags` are updated manually by the user, but the agent may suggest some.
The agent modifies **only** the front matter of a work item, never its body — with one exception: the import skill writes the body of a Jira issue at its creation, and only at its creation. After that, an imported issue belongs to its author like any other.
