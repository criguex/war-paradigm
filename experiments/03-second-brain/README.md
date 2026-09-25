# Experiment #03 · AI without context writes generic tests.

**Specimen:** an AI assistant asked to write Playwright tests for a flow it has never seen. Clean code, correct syntax, tests nothing that matters.

The fix wasn't a better prompt. What worked was giving the assistant the same knowledge a senior QA carries in their head, written down in one place it reads before every task, and moving the rules that must never be broken out of the prompt and into a hook.

## Run it

```bash
npm test        # 33 checks: the hook blocks/allows correctly + the vault is consistent
npm run demo    # the hook in action against six commands
```

Requires Node 20+ and `git`. Nothing else.

## Part 1 · the vault (`vault/`)

Open the `vault/` folder in Obsidian as a vault, or copy it next to your project and rename the notes. It documents the demo app from [experiment #02](../02-mutants) so the three experiments share one world.

```
vault/
├── 00 - READ FIRST.md            the project in one page: the map, not the territory
├── Golden rules.md               what the assistant must never do
├── 01 QA process/                Test strategy · Definition of done for a story
├── 02 Workflows/                 Design scenarios with AI · Report a defect
├── 03 Knowledge/                 DocFlow - golden flow · Roles and permissions · Test data - users · DEF-001 self-grant role
├── 04 Sessions/                  one note per session, e.g. 2026-09-24 - mutants on DocFlow
└── 99 Templates/                 Session note · Flow note · Defect note
```

Two lessons baked into the structure:

- **Structure beats volume.** Small, boring, predictable folders are what let the assistant find the right note every time.
- **One note, one question**, linked to the rest. When the assistant reads the golden flow it also gets the roles, the known bugs and the data. No guessing.

Every note has frontmatter (`type`, `status`, `tags`) and `[[wikilinks]]`. [`tests/vault-links.test.mjs`](tests/vault-links.test.mjs) fails the build if a link points to a note that does not exist, a note has no frontmatter, or a note is an island.

The loop the vault supports:

1. Vault = single source of truth: flows, rules, roles, known bugs, lessons.
2. `00 - READ FIRST` + `Golden rules` are read before anything else.
3. The assistant designs scenarios / writes Playwright code / triages failures.
4. Playwright runs + evidence, linked back to the notes.
5. Every session ends with a note, so tomorrow starts where today left off.

## Part 2 · hard rules live in hooks, not in prompts

A prompt can be ignored. A hook that blocks a push to `main` can't be "forgotten".

[`.claude/settings.json`](.claude/settings.json) registers a Claude Code `PreToolUse` hook for the `Bash` tool:

```json
{ "hooks": { "PreToolUse": [{ "matcher": "Bash",
  "hooks": [{ "type": "command", "command": "\"$CLAUDE_PROJECT_DIR\"/hooks/block-push-to-main.sh" }] }] } }
```

[`hooks/block-push-to-main.sh`](hooks/block-push-to-main.sh) reads the tool call as JSON on stdin and exits `2` (block, stderr shown to the assistant) when the destination is `main` or `master`:

```
$ git push origin main                    ✘ BLOCKED (exit 2)
$ git push --force origin HEAD:main       ✘ BLOCKED (exit 2)
$ npm test && git push origin master      ✘ BLOCKED (exit 2)
$ git push origin feature/mutants         ✓ allowed (exit 0)
$ git push -u origin feature/mutants      ✓ allowed (exit 0)
$ git pull origin main                    ✓ allowed (exit 0)
```

It handles explicit branches, refspecs (`HEAD:main`, `feature:master`, `refs/heads/main`), force flags, chained commands (`a && git push ...`), `git -C <dir> push`, and the bare `git push` / `git push origin` by resolving the current branch. It parses the JSON with `jq`, falls back to `node`, then to `sed`. [`tests/hook.test.mjs`](tests/hook.test.mjs) proves each case against real temporary git repos, on `main` and on a feature branch, for all three parsers.

To use it in your own project: copy `.claude/settings.json` and `hooks/` to the project root, `chmod +x hooks/block-push-to-main.sh`, done. Claude Code runs the hook before every Bash call.

## Layout

```
vault/                       the Obsidian template (14 notes)
.claude/settings.json        the PreToolUse hook registration
hooks/block-push-to-main.sh  the hook
tests/hook.test.mjs          28 cases: blocks / allows / robustness / parser fallbacks
tests/vault-links.test.mjs   links resolve, frontmatter present, no islands
tests/demo.mjs               npm run demo
```
