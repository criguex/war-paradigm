// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Cristian Guerra
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT || 4310);
const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const ROLES = ['viewer', 'editor', 'approver', 'admin'];
const TITLE_MAX = 80;

const seedMembers = () => [
  { id: 'u1', name: 'Vera Lind', email: 'viewer@demo.io', role: 'viewer' },
  { id: 'u2', name: 'Eli Moss', email: 'editor@demo.io', role: 'editor' },
  { id: 'u3', name: 'Ana Reyes', email: 'approver@demo.io', role: 'approver' },
  { id: 'u4', name: 'Adam Cole', email: 'admin@demo.io', role: 'admin' },
];

const state = { members: seedMembers(), docs: [], sessions: new Map(), seq: 0 };
const PASSWORD = 'demo123';

const reset = () => {
  state.members = seedMembers();
  state.docs = [];
  state.sessions.clear();
  state.seq = 0;
};

const json = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};

const readBody = (req) =>
  new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); }
    });
  });

const authenticate = (req) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const session = token && state.sessions.get(token);
  if (!session) return { error: 'unauthorized' };
  if (Date.now() >= session.exp) return { error: 'token expired' };
  const user = state.members.find((m) => m.id === session.userId);
  return user ? { user } : { error: 'unauthorized' };
};

const can = {
  approve: (u) => ['approver', 'admin'].includes(u.role),
  publish: (u) => ['editor', 'approver', 'admin'].includes(u.role),
  editMember: (actor, target) => actor.role === 'admin' || actor.id === target.id,
};

const routes = [
  ['POST', /^\/api\/_reset$/, () => { reset(); return [204]; }],

  ['POST', /^\/api\/auth\/login$/, async (req) => {
    const { email, password, ttl = 3600 } = await readBody(req);
    const user = state.members.find((m) => m.email === email);
    if (!user || password !== PASSWORD) return [401, { error: 'invalid credentials' }];
    const token = crypto.randomBytes(16).toString('hex');
    state.sessions.set(token, { userId: user.id, exp: Date.now() + Number(ttl) * 1000 });
    return [200, { token, user }];
  }],

  ['GET', /^\/api\/me$/, (_req, auth) => [200, auth.user]],

  ['GET', /^\/api\/members$/, () => [200, state.members]],

  ['POST', /^\/api\/members\/([^/]+)\/role$/, async (req, auth, [id]) => {
    const target = state.members.find((m) => m.id === id);
    if (!target) return [404, { error: 'member not found' }];
    if (!can.editMember(auth.user, target)) return [403, { error: 'forbidden' }];
    const { role } = await readBody(req);
    if (!ROLES.includes(role)) return [422, { error: `role must be one of ${ROLES.join(', ')}` }];
    target.role = role;
    return [200, target];
  }],

  ['GET', /^\/api\/docs$/, () => [200, state.docs]],

  ['POST', /^\/api\/docs$/, async (req, auth) => {
    const { title, owner } = await readBody(req);
    const clean = typeof title === 'string' ? title.trim() : '';
    if (clean.length < 3 || clean.length > TITLE_MAX) return [422, { error: `title must be 3-${TITLE_MAX} chars` }];
    if (!owner || !state.members.some((m) => m.email === owner)) return [422, { error: 'owner is required' }];
    const doc = { id: `d${++state.seq}`, title: clean, owner, status: 'draft', createdBy: auth.user.email };
    state.docs.push(doc);
    return [201, doc];
  }],

  ['POST', /^\/api\/docs\/([^/]+)\/approve$/, (_req, auth, [id]) => {
    const doc = state.docs.find((d) => d.id === id);
    if (!doc) return [404, { error: 'document not found' }];
    if (!can.approve(auth.user)) return [403, { error: 'only approvers can approve' }];
    if (doc.status !== 'draft') return [409, { error: `cannot approve a ${doc.status} document` }];
    doc.status = 'approved';
    doc.approvedBy = auth.user.email;
    return [200, doc];
  }],

  ['POST', /^\/api\/docs\/([^/]+)\/publish$/, (_req, auth, [id]) => {
    const doc = state.docs.find((d) => d.id === id);
    if (!doc) return [404, { error: 'document not found' }];
    if (!can.publish(auth.user)) return [403, { error: 'viewers cannot publish' }];
    if (doc.status !== 'approved') return [409, { error: 'document must be approved before publishing' }];
    doc.status = 'published';
    doc.publishedBy = auth.user.email;
    return [200, doc];
  }],
];

const PUBLIC_ROUTES = ['/api/auth/login', '/api/_reset'];

const serveStatic = (req, res) => {
  const url = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const file = path.join(PUBLIC, path.normalize(url));
  if (!file.startsWith(PUBLIC) || !fs.existsSync(file)) return json(res, 404, { error: 'not found' });
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
  res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
};

http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];
  if (!url.startsWith('/api/')) return serveStatic(req, res);
  for (const [method, pattern, handler] of routes) {
    const match = req.method === method && url.match(pattern);
    if (!match) continue;
    let auth = {};
    if (!PUBLIC_ROUTES.includes(url)) {
      auth = authenticate(req);
      if (auth.error) return json(res, 401, { error: auth.error });
    }
    const [status, body] = await handler(req, auth, match.slice(1));
    return body === undefined ? (res.writeHead(status), res.end()) : json(res, status, body);
  }
  json(res, 404, { error: 'not found' });
}).listen(PORT, () => console.log(`DocFlow listening on http://localhost:${PORT}`));
