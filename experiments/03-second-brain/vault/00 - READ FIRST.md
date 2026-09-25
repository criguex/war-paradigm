---
type: map
status: living
tags: [read-first, context]
updated: 2026-09-24
---

# 00 · READ FIRST

The project in one page. Read this note and [[Golden rules]] before designing scenarios, writing Playwright code or triaging a failure. The map, not the territory: every section links to the note that holds the detail.

## What we test

**DocFlow**, a small content workflow: an editor creates a draft, an approver approves it, an editor publishes it. Roles, gates and status codes are the product.

- Flows → [[DocFlow - golden flow]]
- Who can do what → [[Roles and permissions]]
- Users, passwords, seeds → [[Test data - users]]
- Open defects → [[DEF-001 self-grant role]]

## How we test

- Strategy and what "done" means → [[Test strategy]], [[Definition of done for a story]]
- Step-by-step how-tos → [[Design scenarios with AI]], [[Report a defect]]
- Every session ends with a note → [[04 Sessions/2026-09-24 - mutants on DocFlow|latest session]]

## Where things live

| Question | Note |
|---|---|
| Which flows exist? | `03 Knowledge/` |
| How do we do X? | `02 Workflows/` |
| What did we decide? | `01 QA process/` |
| What happened yesterday? | `04 Sessions/` |
| How do I start a new note? | `99 Templates/` |

## Rules the assistant cannot skip

Hard rules live in hooks, not in prompts. See `hooks/block-push-to-main.sh` and [[Golden rules]] rule 5.
