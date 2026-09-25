import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VAULT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../vault');

function notes(dir = VAULT, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.')) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) notes(full, out);
    else if (entry.endsWith('.md')) out.push(full);
  }
  return out;
}

const all = notes();
const byName = new Map(all.map((f) => [path.basename(f, '.md'), f]));
const linksIn = (text) => [...text.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g)].map((m) => m[1].trim());

describe('the vault template', () => {
  test('has the two notes the assistant reads first', () => {
    assert.ok(byName.has('00 - READ FIRST'), '00 - READ FIRST.md is missing');
    assert.ok(byName.has('Golden rules'), 'Golden rules.md is missing');
  });

  test('has the five folders of the loop', () => {
    const folders = readdirSync(VAULT).filter((e) => statSync(path.join(VAULT, e)).isDirectory());
    for (const f of ['01 QA process', '02 Workflows', '03 Knowledge', '04 Sessions', '99 Templates']) {
      assert.ok(folders.includes(f), `${f}/ is missing`);
    }
  });

  test('every [[wikilink]] resolves to a note (Obsidian resolves by name across folders)', () => {
    const broken = [];
    for (const file of all) {
      for (const link of linksIn(readFileSync(file, 'utf8'))) {
        if (!byName.has(path.basename(link))) broken.push(`${path.relative(VAULT, file)} → [[${link}]]`);
      }
    }
    assert.deepEqual(broken, []);
  });

  test('every note has frontmatter with a type', () => {
    const missing = all
      .filter((f) => !/^---\n[\s\S]*?\btype:\s*\S+[\s\S]*?\n---\n/.test(readFileSync(f, 'utf8')))
      .map((f) => path.relative(VAULT, f));
    assert.deepEqual(missing, []);
  });

  test('no note is an island: each one links out or is linked to', () => {
    const linked = new Set(all.flatMap((f) => linksIn(readFileSync(f, 'utf8')).map((l) => path.basename(l))));
    const islands = all
      .filter((f) => linksIn(readFileSync(f, 'utf8')).length === 0 && !linked.has(path.basename(f, '.md')))
      .map((f) => path.relative(VAULT, f));
    assert.deepEqual(islands, []);
  });
});
