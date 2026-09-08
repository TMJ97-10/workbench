// ============ 工作情况：月工作计划 + 日工作完成情况 ============
import { el, icon, formModal, confirmBox, emptyState, viewHead, cardTitle, todayStr, fmtDateTime, toast, uid, WEEK_CN } from '../util.js';
import { store } from '../store.js';

const pad = n => String(n).padStart(2, '0');
function monthStr(d = new Date()) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; }

let tab = 'plans';           // plans | logs
let curMonth = monthStr();   // 当前查看的月份 YYYY-MM

function monthLabel(m) { const [y, mm] = m.split('-'); return `${y} 年 ${Number(mm)} 月`; }
function shiftMonth(m, delta) {
  const [y, mm] = m.split('-').map(Number);
  const d = new Date(y, mm - 1 + delta, 1);
  return monthStr(d);
}
function dateLabel(ds) {
  const d = new Date(ds + 'T00:00:00');
  return `${ds} 星期${WEEK_CN[d.getDay()]}`;
}

// ---------------- 月工作计划 ----------------
function planModal(existing) {
  formModal(existing ? '编辑月计划' : '新建月计划', [
    { key: 'title', label: '计划内容', required: true, placeholder: '这个月要达成什么？' },
    { key: 'note', label: '备注', type: 'textarea', rows: 3, placeholder: '可选：具体拆解、衡量标准…' },
  ], existing || {}).then(v => {
    if (!v) return;
    store.update(d => {
      if (existing) Object.assign(d.work.plans.find(p => p.id === existing.id), v);
      else d.work.plans.push({ id: uid(), month: curMonth, title: v.title, note: v.note, done: false, createdAt: Date.now() });
    });
    toast(existing ? '计划已更新' : '已加入本月计划');
  });
}

function renderPlans(box) {
  const plans = store.data.work.plans.filter(p => p.month === curMonth);
  const doneCnt = plans.filter(p => p.done).length;
  const pct = plans.length ? Math.round(doneCnt / plans.length * 100) : 0;

  box.innerHTML = '';
  box.append(
    // 月份切换 + 新建
    el('div', { class: 'work-toolbar' },
      el('div', { class: 'work-month' },
        el('button', { class: 'btn btn-sm', onclick: () => { curMonth = shiftMonth(curMonth, -1); renderPlans(box); } }, '‹'),
        el('span', { class: 'work-month-label' }, monthLabel(curMonth)),
        el('button', { class: 'btn btn-sm', onclick: () => { curMonth = shiftMonth(curMonth, 1); renderPlans(box); } }, '›'),
        curMonth !== monthStr() ? el('button', { class: 'btn btn-sm', onclick: () => { curMonth = monthStr(); renderPlans(box); } }, '回本月') : null),
      el('button', { class: 'btn btn-primary', onclick: () => planModal() }, '+ 新建计划')),

    // 完成进度
    plans.length ? el('div', { class: 'card work-progress' },
      el('div', { style: 'display:flex;justify-content:space-between;align-items:baseline' },
        el('span', { class: 'tiny muted' }, '本月完成度'),
        el('span', { class: 'num', style: 'font-weight:700;color:var(--accent)' }, `${doneCnt} / ${plans.length}　${pct}%`)),
      el('div', { class: 'work-bar' }, el('div', { class: 'work-bar-fill', style: `width:${pct}%` }))) : null,

    // 计划列表
    plans.length
      ? el('div', { class: 'work-list' }, plans.map(p =>
        el('div', { class: 'card work-row' + (p.done ? ' is-done' : '') },
          el('button', {
            class: 'work-check' + (p.done ? ' on' : ''), title: p.done ? '标记为未完成' : '标记为完成',
            onclick: () => store.update(d => { const x = d.work.plans.find(i => i.id === p.id); x.done = !x.done; })
          }, p.done ? icon('check', 13) : null),
          el('div', { class: 'work-main' },
            el('div', { class: 'work-title' }, p.title),
            p.note ? el('div', { class: 'muted tiny', style: 'margin-top:4px;white-space:pre-wrap' }, p.note) : null),
          el('div', { class: 'work-ops' },
            el('button', { class: 'btn btn-sm', onclick: () => planModal(p) }, icon('edit', 14)),
            el('button', { class: 'btn btn-sm btn-danger', onclick: async () => { if (await confirmBox(`删除计划「${p.title}」？`)) store.update(d => { d.work.plans = d.work.plans.filter(i => i.id !== p.id); }); } }, icon('trash', 14))))))
      : emptyState('cal', `${monthLabel(curMonth)}还没有计划`, '点右上角「+ 新建计划」给这个月定个目标'));
}

// ---------------- 日工作完成情况 ----------------
function logModal(existing) {
  formModal(existing ? '编辑工作记录' : '补记工作完成情况', [
    { key: 'date', label: '日期', type: 'date', required: true },
    { key: 'content', label: '完成情况', type: 'textarea', rows: 5, required: true, placeholder: '今天完成了哪些工作？' },
  ], existing || { date: todayStr() }).then(v => {
    if (!v) return;
    store.update(d => {
      if (existing) Object.assign(d.work.logs.find(l => l.id === existing.id), v, { updatedAt: Date.now() });
      else {
        const dup = d.work.logs.find(l => l.date === v.date);
        if (dup) { dup.content = v.content; dup.updatedAt = Date.now(); }
        else d.work.logs.push({ id: uid(), date: v.date, content: v.content, createdAt: Date.now(), updatedAt: Date.now() });
      }
    });
    toast('已保存');
  });
}

function renderLogs(box) {
  const logs = [...store.data.work.logs].sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt);
  const today = todayStr();
  const todayLog = logs.find(l => l.date === today);

  const ta = el('textarea', { class: 'input', rows: '3', placeholder: '今天完成了哪些工作？随手记一笔…' }, todayLog ? todayLog.content : '');
  box.innerHTML = '';
  box.append(
    el('div', { class: 'card work-today' },
      cardTitle('edit', '今天 · ' + dateLabel(today)),
      ta,
      el('div', { style: 'display:flex;gap:10px;margin-top:10px;flex-wrap:wrap' },
        el('button', {
          class: 'btn btn-primary', onclick: () => {
            const content = ta.value.trim();
            if (!content) { toast('先写点内容再保存', 'err'); ta.focus(); return; }
            store.update(d => {
              const dup = d.work.logs.find(l => l.date === today);
              if (dup) { dup.content = content; dup.updatedAt = Date.now(); }
              else d.work.logs.push({ id: uid(), date: today, content, createdAt: Date.now(), updatedAt: Date.now() });
            });
            toast('今天的工作已记录 ✓');
          }
        }, todayLog ? '更新今天的记录' : '保存今天的记录'),
        el('button', { class: 'btn', onclick: () => logModal() }, '补记以往日期'))),

    logs.length
      ? el('div', { class: 'work-list' }, logs.map(l =>
        el('div', { class: 'card work-row' },
          el('div', { class: 'work-main' },
            el('div', { class: 'work-title', style: 'display:flex;align-items:center;gap:8px;flex-wrap:wrap' },
              dateLabel(l.date),
              l.date === today ? el('span', { class: 'tag' }, '今天') : null),
            el('div', { class: 'muted', style: 'font-size:13.5px;margin-top:6px;white-space:pre-wrap' }, l.content)),
          el('div', { class: 'work-ops' },
            el('button', { class: 'btn btn-sm', onclick: () => logModal(l) }, icon('edit', 14)),
            el('button', { class: 'btn btn-sm btn-danger', onclick: async () => { if (await confirmBox(`删除 ${l.date} 的记录？`)) store.update(d => { d.work.logs = d.work.logs.filter(i => i.id !== l.id); }); } }, icon('trash', 14))))))
      : emptyState('note', '还没有工作记录', '在上方写下今天的完成情况'));
}

// ---------------- 视图入口 ----------------
export function render(root) {
  const content = el('div', {});
  const paint = () => (tab === 'plans' ? renderPlans(content) : renderLogs(content));
  root.append(
    viewHead('工作情况', '月工作计划 · 日工作完成情况'),
    el('div', { class: 'tabs stock-tabs' },
      ...[['plans', '月工作计划'], ['logs', '日工作完成情况']].map(([k, label]) =>
        el('button', {
          class: 'tab' + (tab === k ? ' active' : ''),
          onclick: (e) => {
            tab = k;
            e.currentTarget.parentElement.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b === e.currentTarget));
            paint();
          }
        }, label))),
    content);
  paint();
}
