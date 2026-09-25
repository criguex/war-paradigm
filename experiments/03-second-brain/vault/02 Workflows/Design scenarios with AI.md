---
type: workflow
status: approved
tags: [workflow, ai-assistant, scenarios]
updated: 2026-09-24
---

# Design scenarios with AI

Step by step for turning a story into scenarios with an assistant, without getting generic tests back.

## Before asking

1. The assistant reads [[00 - READ FIRST]] and [[Golden rules]].
2. It reads the flow note, e.g. [[DocFlow - golden flow]], and the [[Roles and permissions]] matrix.
3. It reads the open defects for the flow, e.g. [[DEF-001 self-grant role]], so it does not re-discover them.

## The ask

> Design scenarios for `US-42` from its acceptance criteria. For every scenario give: id `S-n`, title, actor, action, expected status, steps, and the source `US-42/R-n`. Add one negative scenario per protected action and the four boundary cases for the title. Do not invent roles or data: use [[Test data - users]].

## After the answer

- Score the plan against the acceptance criteria: must criteria block, should criteria add to the score. Reject anything without a source.
- Run the same ask three times. If the verdict flips, that is a finding on the prompt or the pins (model, temperature, prompt version), not on the story.
- Turn the approved scenarios into mutants as data and run them API-first, see [[Test strategy]].
- Close with a [[Session note]].
