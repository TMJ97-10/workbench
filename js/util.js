// ============ 通用工具 ============

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** DOM 构建器：el('div', {class:'x', onclick:fn}, child...) */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(c));
  }
  return node;
}

/** 内联 SVG 图标库（stroke 风格，currentColor） */
const ICON_PATHS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/>',
  todo: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="m8 12 3 3 5-6"/>',
  note: '<path d="M5 3h11l4 4v14H5z"/><path d="M9 12h7M9 16h5"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.8.7 1 1.5 1 2.5h6c0-1 .2-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
  ai: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M18.5 15.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M15.5 9.2c-.6-1-1.9-1.5-3.5-1.5-2 0-3.2 1-3.2 2.3 0 3.3 7 1.6 7 4.7 0 1.4-1.5 2.4-3.8 2.4-1.8 0-3-.7-3.6-1.7"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 1 2-2h13"/><path d="M9 7h6"/>',
  grid: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 14 4-5 3 3 5-7"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.7M12 18.5v2.7M2.8 12h2.7M18.5 12h2.7M5.1 5.1l1.9 1.9M17 17l1.9 1.9M18.9 5.1 17 7M7 17l-1.9 1.9"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6.5 7l1 14h9l1-14"/><path d="M10 11v6M14 11v6"/>',
  edit: '<path d="M4 20h4l11-11-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.6M20 3v4h-4"/>',
  link: '<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  briefcase: '<rect x="3" y="7" width="18" height="14" rx="3"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3 12.5h18"/>',
  check: '<path d="m4 12.5 5 5L20 6.5"/>',
  cloud: '<path d="M7 18a5 5 0 0 1-.9-9.9A6 6 0 0 1 17.7 9 4.5 4.5 0 0 1 17 18z"/>',
};
export function icon(name, size) {
  const s = size || 18;
  const span = document.createElement('span');
  span.innerHTML = `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name] || ''}</svg>`;
  return span.firstChild;
}

// ---------- ID / 日期 / 数字 ----------
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
export function debounce(fn, ms) {
  let t = null;
  const d = (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  d.cancel = () => clearTimeout(t);
  return d;
}
const pad = n => String(n).padStart(2, '0');
export function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function fmtDateTime(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function fmtHM(ts) {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export const WEEK_CN = ['日', '一', '二', '三', '四', '五', '六'];
export function fmtMoney(n, sign = false) {
  if (n == null || !Number.isFinite(n)) return '--';
  const s = Math.abs(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (sign) return (n > 0 ? '+' : n < 0 ? '-' : '') + s;
  return (n < 0 ? '-' : '') + s;
}
export function fmtPct(n) {
  if (n == null || !Number.isFinite(n)) return '--';
  return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
}
/** 本周（周一~周日）日期字符串数组 */
export function thisWeekDates() {
  const now = new Date();
  const dow = (now.getDay() + 6) % 7; // 周一=0
  const mon = new Date(now); mon.setDate(now.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i);
    return todayStr(d);
  });
}

// ---------- Toast ----------
export function toast(msg, type = '') {
  const root = $('#toast-root');
  const t = el('div', { class: 'toast' + (type ? ' ' + type : '') }, msg);
  root.append(t);
  setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 320); }, 2400);
}

// ---------- 弹窗 ----------
let activeCleanup = null;
export function closeModal() { if (activeCleanup) { const c = activeCleanup; activeCleanup = null; c(null); } }

function openModal({ title, body, actions = [] }) {
  closeModal();
  const root = $('#modal-root');
  return new Promise(resolve => {
    const cleanup = val => {
      mask.remove(); document.removeEventListener('keydown', onKey);
      activeCleanup = null; resolve(val);
    };
    const onKey = e => { if (e.key === 'Escape') cleanup(null); };
    document.addEventListener('keydown', onKey);
    activeCleanup = cleanup;
    const btns = actions.map(a => el('button', {
      class: 'btn ' + (a.class || ''),
      onclick: async () => {
        if (a.onClick) { const r = await a.onClick(); if (r === false) return; cleanup(a.value !== undefined ? a.value : true); }
        else cleanup(a.value !== undefined ? a.value : true);
      }
    }, a.label));
    const mask = el('div', { class: 'modal-mask', onclick: e => { if (e.target === mask) cleanup(null); } },
      el('div', { class: 'modal' },
        el('h3', {}, title),
        body,
        btns.length ? el('div', { class: 'modal-actions' }, btns) : null
      )
    );
    root.append(mask);
  });
}

/**
 * 表单弹窗。fields: [{key,label,type,options,placeholder,required,min,max,step,rows}]
 * type: text | textarea | number | date | select | password
 * resolve(values) 或 null（取消）。校验失败时弹窗保持打开。
 */
export function formModal(title, fields, initial = {}, okLabel = '保存') {
  const inputs = {};
  const body = el('div', {});
  for (const f of fields) {
    let inp;
    const val = initial[f.key] ?? '';
    if (f.type === 'select') {
      inp = el('select', { class: 'input' },
        (f.options || []).map(o => {
          const [v, label] = Array.isArray(o) ? o : [o, o];
          return el('option', { value: v, selected: String(val) === String(v) ? '' : null }, label);
        }));
    } else if (f.type === 'textarea') {
      inp = el('textarea', { class: 'input', placeholder: f.placeholder || '', rows: String(f.rows || 4) }, val);
    } else {
      inp = el('input', {
        class: 'input', type: f.type || 'text', value: val,
        placeholder: f.placeholder || '',
        min: f.min ?? null, max: f.max ?? null, step: f.step ?? null,
      });
    }
    inputs[f.key] = inp;
    body.append(el('div', { class: 'field' },
      el('label', {}, f.label, f.required ? el('span', { class: 'req' }, ' *') : null), inp));
  }
  return new Promise(resolve => {
    openModal({
      title, body,
      actions: [
        { label: '取消', value: null },
        {
          label: okLabel, class: 'btn-primary',
          onClick: () => {
            const out = {};
            for (const f of fields) {
              const raw = inputs[f.key].value.trim();
              if (f.required && !raw) { toast(`请填写「${f.label}」`, 'err'); inputs[f.key].focus(); return false; }
              if (f.type === 'number') {
                if (raw === '') { if (f.required) return false; out[f.key] = null; }
                else {
                  const n = parseFloat(raw);
                  if (!Number.isFinite(n)) { toast(`「${f.label}」需要填写数字`, 'err'); inputs[f.key].focus(); return false; }
                  out[f.key] = n;
                }
              } else out[f.key] = raw;
            }
            // 手动 resolve 并保持弹窗由 openModal 的默认流程关闭：
            // 返回非 false 值让 openModal cleanup，并把它 resolve 的值转成 out
            pendingValues = out;
            return true;
          },
          value: undefined // 让 cleanup 用 true，随后在外层替换
        }
      ]
    }).then(v => resolve(v ? pendingValues : null));
  });
}
let pendingValues = null;

export function confirmBox(msg, okLabel = '确认删除') {
  return openModal({
    title: '请确认',
    body: el('div', { class: 'muted', html: undefined }, msg),
    actions: [
      { label: '取消', value: false },
      { label: okLabel, class: 'btn-danger', value: true },
    ]
  });
}

// ---------- 常用小组件 ----------
export function emptyState(iconName, text, hint) {
  return el('div', { class: 'empty' },
    el('span', { class: 'em-icon', style: 'color:var(--text-3)' }, iconName ? icon(iconName, 26) : null),
    text,
    hint ? el('div', { class: 'em-hint' }, hint) : null
  );
}

export function viewHead(title, sub, ...actions) {
  return el('div', { class: 'view-head' },
    el('div', {}, el('h1', {}, title), sub ? el('div', { class: 'sub' }, sub) : null),
    actions.length ? el('div', { style: 'display:flex;gap:10px;flex-wrap:wrap' }, actions) : null
  );
}

export function cardTitle(iconName, text, right) {
  return el('div', { class: 'card-title' },
    iconName ? icon(iconName, 17) : null, text,
    right ? el('span', { class: 'right' }, right) : null);
}
