// ============ 数据层：单一 JSON store + localStorage + GitHub 防抖同步 ============
import { debounce, fmtHM } from './util.js';
import { pullRemote, pushRemote } from './github.js';

const LS_DATA = 'workbench.data.v1';
const LS_TOKEN = 'workbench.gh.token';
const LS_REPO = 'workbench.gh.repo';
const LS_STATUS = 'workbench.sync.status';
const LS_DEVICE = 'workbench.device.id';

function blankData() {
  return {
    meta: { updatedAt: 0, device: '' },
    todos: [],            // {id,title,done,priority:'high|mid|low',date,createdAt}
    events: [],           // {id,date,title,note}
    notes: [],            // {id,title,body,tags:[],updatedAt}
    inspirations: [],     // {id,text,tags:[],createdAt}
    prompts: [],          // {id,title,content}
    ledger: [],           // {id,type:'in|out',amount,category,note,date}
    learning: { plans: [], checkins: [] },   // plans:{id,name,goal,progress}; checkins:['YYYY-MM-DD']
    stocks: {
      trades: [],         // {id,code,side:'buy|sell',price,qty,date,note,createdAt}
      watchlist: [        // {code}
        { code: 'sh000001' }, { code: 'sz399001' }, { code: 'sz399006' },
      ],
      notes: [],          // {id,code,title,body,updatedAt}
    },
    work: {
      plans: [],          // {id,month:'YYYY-MM',title,note,done,createdAt}
      logs: [],           // {id,date:'YYYY-MM-DD',focus,install,civil,sub,other,content(旧格式),createdAt,updatedAt}
      focus: {},          // { 'YYYY-MM': '当月重点工作' }
    },
    settings: {},
  };
}

function getDeviceId() {
  let d = localStorage.getItem(LS_DEVICE);
  if (!d) { d = 'web-' + Math.random().toString(36).slice(2, 8); localStorage.setItem(LS_DEVICE, d); }
  return d;
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_DATA);
    if (!raw) return blankData();
    const parsed = JSON.parse(raw);
    // 与空结构做深合并，保证后续版本新增字段不崩
    const base = blankData();
    const merged = { ...base, ...parsed };
    merged.meta = { ...base.meta, ...(parsed.meta || {}) };
    merged.learning = { ...base.learning, ...(parsed.learning || {}) };
    merged.stocks = { ...base.stocks, ...(parsed.stocks || {}) };
    merged.work = { ...base.work, ...(parsed.work || {}) };
    return merged;
  } catch { return blankData(); }
}

const changeListeners = new Set();
const syncListeners = new Set();

export const store = {
  data: loadLocal(),
  sync: loadSyncStatus(),

  onChange(fn) { changeListeners.add(fn); return () => changeListeners.delete(fn); },
  onSync(fn) { syncListeners.add(fn); return () => syncListeners.delete(fn); },

  emitChange(src) { changeListeners.forEach(fn => { try { fn(src); } catch (e) { console.error(e); } }); },

  saveLocal() {
    try { localStorage.setItem(LS_DATA, JSON.stringify(this.data)); } catch (e) { console.error('localStorage 写入失败', e); }
  },

  /** 所有写操作统一入口 */
  update(mutator, opts = {}) {
    mutator(this.data);
    this.data.meta.updatedAt = Date.now();
    this.data.meta.device = getDeviceId();
    this.saveLocal();
    this.emitChange(opts.source || 'local');
    this.schedulePush();
  },

  /** 用远端数据合并到本地：按模块取并集，同键以远端为准；任何一方已有的内容都不会丢 */
  replaceFromRemote(remote) {
    const local = loadLocal(); // 借用深合并逻辑，保证字段齐全
    const byId = (l = [], r = []) => {
      const map = new Map();
      l.forEach(x => x && x.id != null && map.set(x.id, x));
      r.forEach(x => x && x.id != null && map.set(x.id, x)); // 远端覆盖同 id
      return [...map.values()];
    };
    const byKey = (key) => (l = [], r = []) => {
      const map = new Map();
      l.forEach(x => x && x[key] != null && map.set(x[key], x));
      r.forEach(x => x && x[key] != null && map.set(x[key], x));
      return [...map.values()];
    };
    const rl = remote.learning || {}, rs = remote.stocks || {}, rw = remote.work || {};
    const merged = {
      ...local, ...remote,
      meta: { ...local.meta, ...(remote.meta || {}), updatedAt: Math.max(local.meta?.updatedAt || 0, remote.meta?.updatedAt || 0) },
      todos: byId(local.todos, remote.todos),
      events: byId(local.events, remote.events),
      notes: byId(local.notes, remote.notes),
      inspirations: byId(local.inspirations, remote.inspirations),
      prompts: byId(local.prompts, remote.prompts),
      ledger: byId(local.ledger, remote.ledger),
      learning: {
        plans: byId(local.learning.plans, rl.plans),
        checkins: [...new Set([...(local.learning.checkins || []), ...(rl.checkins || [])])].sort(),
      },
      stocks: {
        trades: byId(local.stocks.trades, rs.trades),
        watchlist: byKey('code')(local.stocks.watchlist, rs.watchlist),
        notes: byId(local.stocks.notes, rs.notes),
      },
      work: {
        plans: byId(local.work.plans, rw.plans),
        logs: byKey('date')(local.work.logs, rw.logs), // 日志按日期合并，同日期以远端为准
        focus: { ...(local.work.focus || {}), ...(rw.focus || {}) },
      },
      settings: { ...(local.settings || {}), ...(remote.settings || {}) },
    };
    this.data = merged;
    this.saveLocal();
    this.emitChange('remote');
  },

  // ---- 凭据（token 只存 localStorage，绝不进入 data.json）----
  getToken() { return localStorage.getItem(LS_TOKEN) || ''; },
  setToken(t) { t ? localStorage.setItem(LS_TOKEN, t.trim()) : localStorage.removeItem(LS_TOKEN); },
  getRepo() { return localStorage.getItem(LS_REPO) || 'workbench-data'; },
  setRepo(r) { localStorage.setItem(LS_REPO, (r || '').trim() || 'workbench-data'); },

  // ---- 同步状态 ----
  setSync(patch) {
    this.sync = { ...this.sync, ...patch };
    try { localStorage.setItem(LS_STATUS, JSON.stringify(this.sync)); } catch {}
    syncListeners.forEach(fn => { try { fn(this.sync); } catch {} });
  },

  schedulePush: null, // init 时赋值

  /** 启动：本地渲染后调用，尝试从 GitHub 拉取 */
  async pullOnBoot() {
    const token = this.getToken();
    if (!token) { this.setSync({ state: 'off', msg: '未配置 Token' }); return; }
    this.setSync({ state: 'syncing', msg: '正在检查云端…' });
    try {
      const remote = await pullRemote(token, this.getRepo());
      if (remote && remote.data) {
        // 双向合并（并集）：本地较新时把合并结果推回云端，保证两端都是完整数据
        const localNewer = (this.data.meta.updatedAt || 0) > (remote.data.meta?.updatedAt || 0);
        this.replaceFromRemote(remote.data);
        if (localNewer) await this.pushNow();
        this.setSync({ state: 'ok', time: Date.now(), msg: '已同步 ' + fmtHM(Date.now()) });
      } else {
        this.setSync({ state: 'ok', time: Date.now(), msg: '已同步 ' + fmtHM(Date.now()) });
      }
    } catch (e) {
      console.warn('拉取失败', e);
      this.setSync({ state: 'err', msg: '拉取失败：' + (e.message || e) });
    }
  },

  async pushNow() {
    const token = this.getToken();
    if (!token) { this.setSync({ state: 'off', msg: '未配置 Token，仅本地保存' }); return false; }
    if (this._pushing) return false;
    this._pushing = true;
    this.setSync({ state: 'syncing', msg: '同步中…' });
    try {
      await pushRemote(token, this.getRepo(), this.data);
      this.setSync({ state: 'ok', time: Date.now(), msg: '已同步 ' + fmtHM(Date.now()) });
      return true;
    } catch (e) {
      console.warn('推送失败', e);
      this.setSync({ state: 'err', msg: String(e.message || e) });
      return false;
    } finally { this._pushing = false; }
  },
};

store.schedulePush = debounce(() => store.pushNow(), 2000);

function loadSyncStatus() {
  try { return JSON.parse(localStorage.getItem(LS_STATUS)) || { state: 'off', msg: '未配置' }; }
  catch { return { state: 'off', msg: '未配置' }; }
}
