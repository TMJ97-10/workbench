// ============ 设置（GitHub Token / 仓库 / 手动同步 / 备份） ============
import { el, icon, viewHead, cardTitle, fmtDateTime, toast, confirmBox } from '../util.js';
import { store } from '../store.js';

const STATE_TEXT = {
  off: ['未配置', '仅本地模式，数据不会丢失，但换设备看不到'],
  syncing: ['同步中…', '正在与 GitHub 通信'],
  ok: ['已同步', ''],
  err: ['同步失败', ''],
};

function statusLine() {
  const s = store.sync;
  const [label, extra] = STATE_TEXT[s.state] || STATE_TEXT.off;
  return el('div', { class: 'sync-status-line' },
    el('span', {
      class: 'dot', style: `width:9px;height:9px;border-radius:50%;flex-shrink:0;background:${
        s.state === 'ok' ? 'var(--accent2)' : s.state === 'syncing' ? 'var(--accent)' : s.state === 'err' ? 'var(--up)' : 'var(--text-3)'}`
    }),
    el('span', { style: 'font-weight:600' }, label + (s.state === 'ok' && s.time ? ' ' + new Date(s.time).toTimeString().slice(0, 5) : '')),
    el('span', { class: 'muted tiny' }, s.msg || extra));
}

export function render(root) {
  const tokenInp = el('input', { class: 'input', type: 'password', placeholder: 'ghp_xxxxxxxxxxxxxxxx', value: store.getToken() });
  const repoInp = el('input', { class: 'input', placeholder: 'workbench-data', value: store.getRepo() });

  const statusBox = el('div', {}, statusLine());
  const unsub = store.onSync(() => { statusBox.innerHTML = ''; statusBox.append(statusLine()); });

  root.append(
    viewHead('设置', '云端同步与数据管理'),

    // ---- 同步状态 ----
    el('div', { class: 'card set-card' },
      cardTitle('cloud', 'GitHub 云同步'),
      statusBox,
      el('div', { class: 'field' }, el('label', {}, 'GitHub Personal Access Token'), tokenInp,
        el('div', { class: 'tiny muted', style: 'margin-top:6px' }, 'Token 只保存在本机浏览器 localStorage，不会写入任何文件或仓库。')),
      el('div', { class: 'field' }, el('label', {}, '私有仓库名'), repoInp),
      el('div', { style: 'display:flex;gap:10px;flex-wrap:wrap' },
        el('button', {
          class: 'btn btn-primary',
          onclick: async () => {
            store.setToken(tokenInp.value);
            store.setRepo(repoInp.value);
            toast('已保存设置', 'ok');
            if (store.getToken()) { await store.pullOnBoot(); }
            else store.setSync({ state: 'off', msg: '未配置 Token，仅本地保存' });
          }
        }, '保存设置'),
        el('button', {
          class: 'btn',
          onclick: async (e) => {
            if (!store.getToken()) { toast('请先填写并保存 Token', 'err'); return; }
            e.target.disabled = true;
            const ok = await store.pushNow();
            e.target.disabled = false;
            toast(ok ? '同步成功 ☁️' : '同步失败：' + (store.sync.msg || ''), ok ? 'ok' : 'err');
          }
        }, icon('refresh', 15), '立即同步'))),

    // ---- 配置引导 ----
    el('div', { class: 'card set-card' },
      cardTitle('gear', '如何获取 Token（约 1 分钟）'),
      el('div', { class: 'guide', html: `
        <ol>
          <li>打开 <b>GitHub</b> 并登录 → 右上角头像 → <b>Settings</b></li>
          <li>左侧最下方 <b>Developer settings</b> → <b>Personal access tokens</b> → <b>Tokens (classic)</b></li>
          <li><b>Generate new token (classic)</b>，备注随便填（如 workbench）</li>
          <li>勾选权限：<b>repo</b>（完整仓库权限，用于自动建私有仓库）</li>
          <li>生成后复制 <b>ghp_</b> 开头的字符串，粘贴到上面的输入框并保存</li>
        </ol>
        <div style="margin-top:8px">保存后应用会自动创建名为 <b>workbench-data</b> 的<b>私有</b>仓库（只有你自己可见），所有数据存放在其中的 <b>data.json</b> 文件里。不配 Token 也能正常使用全部功能（纯本地模式）。</div>` })),

    // ---- 数据备份 ----
    el('div', { class: 'card set-card' },
      cardTitle('note', '数据备份'),
      el('div', { class: 'tiny muted', style: 'margin-bottom:12px' }, '所有数据都是一个 JSON，可以导出备份，或从备份恢复。'),
      el('div', { style: 'display:flex;gap:10px;flex-wrap:wrap' },
        el('button', {
          class: 'btn',
          onclick: () => {
            const blob = new Blob([JSON.stringify(store.data, null, 2)], { type: 'application/json' });
            const a = el('a', { href: URL.createObjectURL(blob), download: `workbench-backup-${new Date().toISOString().slice(0, 10)}.json` });
            document.body.append(a); a.click(); a.remove();
            toast('已导出备份文件', 'ok');
          }
        }, '⬇ 导出全部数据'),
        el('button', {
          class: 'btn',
          onclick: () => {
            const inp = el('input', { type: 'file', accept: '.json', style: 'display:none' });
            inp.addEventListener('change', async () => {
              const f = inp.files[0]; if (!f) return;
              try {
                const j = JSON.parse(await f.text());
                if (!j || typeof j !== 'object' || !j.meta) throw new Error('不是有效的工作台备份');
                if (await confirmBox('导入将覆盖当前全部数据，确定？', '覆盖导入')) {
                  store.replaceFromRemote(j);
                  toast('导入成功', 'ok');
                }
              } catch (e) { toast('导入失败：' + e.message, 'err'); }
            });
            document.body.append(inp); inp.click(); inp.remove();
          }
        }, '⬆ 从备份导入'))),

    // ---- 关于 ----
    el('div', { class: 'card set-card' },
      cardTitle('home', '关于'),
      el('div', { class: 'tiny muted', style: 'line-height:2' },
        el('div', {}, '个人工作台 · 纯静态单页应用，离线可用'),
        el('div', {}, '数据默认保存在浏览器本地；配置 GitHub Token 后自动云端同步'),
        el('div', { class: 'num' }, `本地数据更新时间：${store.data.meta.updatedAt ? fmtDateTime(store.data.meta.updatedAt) : '—'}`)))
  );

  return unsub;
}
