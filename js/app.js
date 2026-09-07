// ============ 应用外壳：导航 / 路由 / 视图调度 ============
import { el, icon, closeModal } from './util.js';
import { store } from './store.js';

import * as dashboard from './views/dashboard.js';
import * as todos from './views/todos.js';
import * as notes from './views/notes.js';
import * as ideas from './views/ideas.js';
import * as ai from './views/ai.js';
import * as ledger from './views/ledger.js';
import * as learning from './views/learning.js';
import * as info from './views/info.js';
import * as stocks from './views/stocks.js';
import * as settings from './views/settings.js';

const VIEWS = [
  { id: 'dashboard', name: '首页', icon: 'home', mod: dashboard },
  { id: 'todos', name: '待办日程', icon: 'todo', mod: todos },
  { id: 'notes', name: '笔记', icon: 'note', mod: notes },
  { id: 'ideas', name: '灵感库', icon: 'bulb', mod: ideas },
  { id: 'ai', name: 'AI 助手', icon: 'ai', mod: ai },
  { id: 'ledger', name: '记账理财', icon: 'coin', mod: ledger },
  { id: 'learning', name: '学习管理', icon: 'book', mod: learning },
  { id: 'info', name: '信息面板', icon: 'grid', mod: info },
  { id: 'stocks', name: '股票记录', icon: 'chart', mod: stocks },
  { id: 'settings', name: '设置', icon: 'gear', mod: settings },
];

const viewEl = document.getElementById('view');
const navEl = document.getElementById('nav');
const tabbarEl = document.getElementById('tabbar');

let currentId = null;
let cleanup = null;

// ---------- 构建导航 ----------
for (const v of VIEWS) {
  navEl.append(el('button', { class: 'nav-item', dataset: { id: v.id }, onclick: () => go(v.id) }, icon(v.icon), v.name));
  tabbarEl.append(el('button', { class: 'nav-item', dataset: { id: v.id }, onclick: () => go(v.id) }, icon(v.icon, 19), v.name));
}

function paintNav() {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.id === currentId));
}

function go(id) {
  if (!VIEWS.some(v => v.id === id)) id = 'dashboard';
  if (location.hash !== '#/' + id) location.hash = '#/' + id;
  else renderView(id);
}

function renderView(id) {
  if (cleanup) { try { cleanup(); } catch {} cleanup = null; }
  closeModal();
  currentId = id;
  paintNav();
  viewEl.innerHTML = '';
  const v = VIEWS.find(x => x.id === id);
  const r = v.mod.render(viewEl);
  cleanup = typeof r === 'function' ? r : null;
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', () => {
  const id = location.hash.replace(/^#\//, '') || 'dashboard';
  if (id !== currentId) renderView(id);
});
document.addEventListener('wb:nav', e => go(e.detail));

// ---------- 数据变化时重绘当前视图 ----------
store.onChange(() => { if (currentId) renderView(currentId); });

// ---------- 同步状态指示 ----------
const chips = [document.getElementById('syncChip'), document.getElementById('syncChipM')];
chips.forEach(c => c && c.addEventListener('click', () => go('settings')));
function paintSync() {
  const s = store.sync;
  const cls = s.state === 'ok' ? 'ok' : s.state === 'syncing' ? 'syncing' : s.state === 'err' ? 'err' : '';
  const text = s.state === 'ok' ? (s.msg || '已同步') :
    s.state === 'syncing' ? '同步中…' :
    s.state === 'err' ? '同步失败' : '未配置同步';
  chips.forEach(c => { if (!c) return; c.className = 'sync-chip ' + cls; c.innerHTML = ''; const dot = el('span', { class: 'dot' }); c.append(dot, text); });
}
store.onSync(paintSync);

// ---------- 启动 ----------
paintSync();
const first = location.hash.replace(/^#\//, '') || 'dashboard';
renderView(VIEWS.some(v => v.id === first) ? first : 'dashboard');
store.pullOnBoot(); // 本地已渲染，后台拉云端
