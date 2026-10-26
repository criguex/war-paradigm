#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Cristian Guerra
# Claude Code PreToolUse hook (matcher: Bash).
#
# Reads the tool call as JSON on stdin ({"tool_name":"Bash","tool_input":{"command":"..."}})
# and refuses any `git push` whose destination is main or master.
#
#   exit 2  → the tool call is BLOCKED and stderr is shown to the assistant
#   exit 0  → the tool call goes through
#
# A prompt can be ignored. This can't.

PROTECTED='^(main|master)$'
GIT_OPTS='([[:space:]]+(-[Cc]|--git-dir|--work-tree|--namespace|--config-env)[[:space:]]+[^[:space:]]+|[[:space:]]+-[^[:space:]]+)*'

input="$(cat)"
[ -z "$input" ] && exit 0

# --- 1. pull tool_input.command out of the JSON (jq → node → crude fallback) ---
if command -v jq >/dev/null 2>&1; then
  cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)"
elif command -v node >/dev/null 2>&1; then
  cmd="$(printf '%s' "$input" | node -e '
    let raw = "";
    process.stdin.on("data", (c) => (raw += c)).on("end", () => {
      try { process.stdout.write(String(JSON.parse(raw).tool_input?.command ?? "")); } catch { /* not JSON */ }
    });')"
else
  cmd="$(printf '%s' "$input" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)".*/\1/p' | sed 's/\\"/"/g')"
fi
[ -z "$cmd" ] && exit 0

current_branch() {
  git -C "${CLAUDE_PROJECT_DIR:-.}" symbolic-ref --short -q HEAD 2>/dev/null || echo ""
}

block() {
  echo "blocked by hook: block-push-to-main.sh — a push to '$1' is not allowed. Push a feature branch and open a pull request." >&2
  exit 2
}

# --- 2. look at every simple command in the line (a && b ; c | d) ---
while IFS= read -r segment; do
  segment="${segment//\\git/git}"
  push_re="(^|[[:space:]])git${GIT_OPTS}[[:space:]]+push([[:space:]]|$)"
  [[ "$segment" =~ $push_re ]] || continue

  after="$(printf '%s' "$segment" | sed -E "s/^.*(^|[[:space:]])git${GIT_OPTS}[[:space:]]+push([[:space:]]+|\$)//")"
  read -ra tokens <<< "$after"

  remote=""
  refspecs=""
  for token in ${tokens[@]+"${tokens[@]}"}; do
    case "$token" in
      -*) continue ;;                       # --force, -u, --tags, --force-with-lease ...
      *) if [ -z "$remote" ]; then remote="$token"; else refspecs="$refspecs $token"; fi ;;
    esac
  done

  if [ -z "$refspecs" ]; then
    # `git push` / `git push origin` → pushes the current branch
    branch="$(current_branch)"
    [[ "$branch" =~ $PROTECTED ]] && block "$branch (current branch)"
    [[ "$remote" =~ $PROTECTED ]] && block "$remote"
  else
    for spec in $refspecs; do
      dest="${spec#+}"                       # +refs/heads/main → refs/heads/main
      dest="${dest##*:}"                     # feature:main   → main
      dest="${dest#refs/heads/}"             # refs/heads/main → main
      [ "$dest" = "HEAD" ] && dest="$(current_branch)"
      [[ "$dest" =~ $PROTECTED ]] && block "$dest"
    done
  fi
done < <(printf '%s\n' "$cmd" | sed -E 's/(&&|\|\||;|\|)/\n/g')

exit 0
