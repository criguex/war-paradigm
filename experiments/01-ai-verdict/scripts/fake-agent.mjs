#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Cristian Guerra
// A stand-in "agent" for the command adapter: reads the story from stdin, ignores it,
// and prints the recorded run selected by RUN (1..3) from the set in FAKE_AGENT_SET.
// Replace this with anything that turns a story into a test plan JSON.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const set = process.env.FAKE_AGENT_SET || 'pinned';
const run = process.env.RUN || '1';
const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), `../fixtures/runs/${set}/run-${run}.json`);

let stdin = '';
process.stdin.setEncoding('utf8');
for await (const chunk of process.stdin) stdin += chunk;
JSON.parse(stdin);

process.stdout.write(await readFile(file, 'utf8'));
