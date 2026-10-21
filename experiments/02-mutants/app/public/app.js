// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Cristian Guerra
const $ = (sel) => document.querySelector(sel);
let token = sessionStorage.getItem('token');
let me = null;

const api = async (method, url, body) => {
  const res = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json();
  if (!res.ok) throw Object.assign(new Error(data?.error || res.statusText), { status: res.status });
  return data;
};

let toastTimer;
const toast = (msg, isError = false) => {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.toggle('is-error', isError);
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 2200);
};

const canApprove = () => ['approver', 'admin'].includes(me.role);
const canPublish = () => ['editor', 'approver', 'admin'].includes(me.role);
const canEditMember = (member) => me.role === 'admin' || member.id === me.id;

const renderMe = () => {
  $('#me-name').textContent = me.name;
  const badge = $('#me-role');
  badge.textContent = me.role;
  badge.dataset.role = me.role;
  $('#user-chip').hidden = false;
};

const renderDocs = async () => {
  const docs = await api('GET', '/api/docs');
  const body = $('#docs-body');
  body.innerHTML = '';
  if (!docs.length) {
    body.innerHTML = '<tr class="empty"><td colspan="4">No documents yet</td></tr>';
    return;
  }
  for (const doc of docs) {
    const tr = document.createElement('tr');
    tr.dataset.testid = 'doc-row';
    tr.innerHTML = `
      <td class="doc-title">${doc.title}</td>
      <td>${doc.owner}</td>
      <td><span class="badge" data-testid="status" data-status="${doc.status}">${doc.status}</span></td>
      <td><div class="actions">
        <button class="btn btn-small" data-action="approve" ${canApprove() && doc.status === 'draft' ? '' : 'disabled'}>Approve</button>
        <button class="btn btn-small btn-primary" data-action="publish" ${canPublish() && doc.status === 'approved' ? '' : 'disabled'}>Publish</button>
      </div></td>`;
    tr.querySelectorAll('[data-action]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        try {
          await api('POST', `/api/docs/${doc.id}/${btn.dataset.action}`);
          toast(`"${doc.title}" ${btn.dataset.action === 'approve' ? 'approved' : 'published'}`);
          await renderDocs();
        } catch (err) {
          toast(`${err.status}: ${err.message}`, true);
        }
      }),
    );
    body.appendChild(tr);
  }
};

const renderMembers = async () => {
  const members = await api('GET', '/api/members');
  const body = $('#members-body');
  body.innerHTML = '';
  for (const m of members) {
    const tr = document.createElement('tr');
    tr.dataset.testid = 'member-row';
    const editable = canEditMember(m);
    tr.innerHTML = `
      <td>${m.name}</td>
      <td>${m.email}</td>
      <td><span class="badge" data-testid="role" data-role="${m.role}">${m.role}</span></td>
      <td><div class="actions">${editable ? `
        <select aria-label="Role for ${m.name}">
          ${['viewer', 'editor', 'approver', 'admin'].map((r) => `<option ${r === m.role ? 'selected' : ''}>${r}</option>`).join('')}
        </select>
        <button class="btn btn-small btn-primary" data-action="save">Save</button>` : '<span class="muted">—</span>'}
      </div></td>`;
    tr.querySelector('[data-action="save"]')?.addEventListener('click', async () => {
      try {
        const role = tr.querySelector('select').value;
        await api('POST', `/api/members/${m.id}/role`, { role });
        toast(`${m.name} is now ${role}`);
        if (m.id === me.id) {
          me = await api('GET', '/api/me');
          renderMe();
        }
        await renderMembers();
      } catch (err) {
        toast(`${err.status}: ${err.message}`, true);
      }
    });
    body.appendChild(tr);
  }
};

const showApp = async () => {
  me = await api('GET', '/api/me');
  renderMe();
  $('#login-view').hidden = true;
  $('#app-view').hidden = false;
  await renderDocs();
};

const showLogin = () => {
  token = null;
  me = null;
  sessionStorage.removeItem('token');
  $('#user-chip').hidden = true;
  $('#app-view').hidden = true;
  $('#login-view').hidden = false;
  $('#login-form').reset();
};

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#login-error').hidden = true;
  try {
    const { token: t } = await api('POST', '/api/auth/login', { email: $('#email').value, password: $('#password').value });
    token = t;
    sessionStorage.setItem('token', t);
    await showApp();
  } catch (err) {
    $('#login-error').textContent = err.message;
    $('#login-error').hidden = false;
  }
});

$('#signout').addEventListener('click', showLogin);

$('#doc-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const doc = await api('POST', '/api/docs', { title: $('#title').value, owner: $('#owner').value });
    toast(`"${doc.title}" created as draft`);
    $('#doc-form').reset();
    await renderDocs();
  } catch (err) {
    toast(`${err.status}: ${err.message}`, true);
  }
});

document.querySelectorAll('.tab').forEach((tab) =>
  tab.addEventListener('click', async () => {
    document.querySelectorAll('.tab').forEach((t) => {
      t.classList.toggle('is-active', t === tab);
      t.setAttribute('aria-selected', String(t === tab));
    });
    $('#tab-docs').hidden = tab.dataset.tab !== 'docs';
    $('#tab-members').hidden = tab.dataset.tab !== 'members';
    await (tab.dataset.tab === 'docs' ? renderDocs() : renderMembers());
  }),
);

if (token) showApp().catch(showLogin);
