---
type: rules
status: living
tags: [rules, ai-assistant]
updated: 2026-09-24
---

# Golden rules

What the assistant follows on every task. Not suggestions, not "if you can".

1. **Read [[00 - READ FIRST]] first.** Then the note for the flow you are working on. Never design scenarios for a flow you have not read.
2. **"Document" means the vault.** Not the chat, not a DM, not the model's memory. If it is not in a note, it did not happen.
3. **One note answers one question** and links to the rest. Prefer a wikilink over copying text.
4. **Do not invent.** No test data, roles, status codes or requirements that are not in `03 Knowledge/`. If something is missing, say so and create a task, do not fill the gap with a guess.
5. **Hard rules live in hooks.** A push to `main` is blocked by `hooks/block-push-to-main.sh` (exit 2). Do not look for a way around it, open a pull request.
6. **Every failure gets a verdict**: product bug, test bug, environment or data. Report bugs with [[Report a defect]]; never "fix" a test so it passes against a wrong response.
7. **Green three times, not once.** A test that passed once is a candidate, not a test. See [[Definition of done for a story]].
8. **Evidence or it did not happen.** Screenshots, traces and response bodies go next to the finding.
9. **Close the session with a note** in `04 Sessions/` using [[Session note]]. Tomorrow starts where today left off.
