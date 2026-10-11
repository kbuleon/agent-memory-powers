**Work items** are analyses of requests for changes or fixes. They are created by the `/create-work-item` or `/create-work-item-from-jira` skills, and **written by the user** — except for an issue imported from Jira, whose body the agent writes at creation, and only at creation.
When a work item is submitted to **brainstorming**, **Superpowers** assigns it a processing class (stored in the work item's front matter, in the `superpowers-class` field):
* `spike`: a question whose output is an answer, not code.
* `bounded`: a well-scoped change in code that already exists in the repository. In this case, **Superpowers** can move straight on to development.
* `architectural`: a new project, a new subsystem, or an architectural change. Only in this case does **Superpowers** produce a **specification** (`20-specs`) and then an **execution plan** (`30-plans`).

This file is an index of the **work items** in this folder.
This list is kept up to date by the agent.

---
# Contents

