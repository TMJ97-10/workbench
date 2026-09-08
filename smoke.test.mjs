// 纯逻辑冒烟测试（node 环境，模拟 localStorage/document 最小桩）
const ls = {};
globalThis.localStorage = {
  getItem: k => (k in ls ? ls[k] : null),
  setItem: (k, v) => { ls[k] = String(v); },
  removeItem: k => { delete ls[k]; },
};

const assert = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; } else console.log('PASS:', msg); };

// 1. Base64 中文往返
const gh = await import('./js/github.js');
const src = JSON.stringify({ meta: { updatedAt: 1 }, todos: [{ title: '中文待办 ✓' }] });
assert(gh.b64decode(gh.b64encode(src)) === src, 'Base64 UTF-8 中文往返');

// 2. 腾讯行情解析（使用 2026-09-07 真实抓取的接口数据，A股 / 港股 / 美股 / 异常）
const q = await import('./js/quotes.js');
const aRaw = '1~贵州茅台~600519~1319.93~1330.00~1324.00~15533~7054~8479~1319.50~1~1319.19~1~1319.08~3~1319.06~1~1319.02~2~1319.93~1~1319.94~1~1319.98~2~1320.00~1~1320.05~1~~20260907114928~-10.07~-0.76~1333.60~1319.08~1319.93/15533/2056646602~15533~205665~0.12~20.26~~1333.60~1319.08~1.09~16500.20~16500.20~6.57~1463.00~1197.00~1.11~2~1324.09~18.53~20.04~~~0.09~205664.6602~0.0000~0~   A~GP-A~-2.17~1.57~3.94~32.41~27.30~1539.98~1151.01~1.17~-2.14~4.43~1250081601~1250081601~14.29~-2.29~1250081601~~';
const a = q.parseQuote('sh600519', aRaw);
assert(a && a.name === '贵州茅台' && a.price === 1319.93 && a.chg === -10.07 && a.pct === -0.76 && a.high === 1333.6 && a.low === 1319.08, 'A股真实格式解析');

const hkRaw = '100~腾讯控股~00700~439.200~442.800~440.600~4800340.0~0~0~439.200~0~0~0~0~0~0~0~0~0~439.200~0~0~0~0~0~0~0~0~0~4800340.0~2026/09/07 11:33:20~-3.600~-0.81~442.600~438.800~439.200~4800340.0~2113755165.760~0~16.06~~0~0~0.86~39981.0518~39981.0518~TENCENT~1.21~677.700~411.000~0.62~28.63~0~0~0~0~0~14.74~3.07~0.05~100~-26.02~-3.05~GP~20.41~11.00~-0.18~-8.77~-3.94~9103153877.00~9103153877.00~15.22~5.309~440.334~-26.52~HKD~1~30';
const h = q.parseQuote('hk00700', hkRaw);
assert(h && h.name === '腾讯控股' && h.price === 439.2 && h.chg === -3.6 && h.pct === -0.81 && h.high === 442.6 && h.low === 438.8, '港股真实格式解析');

const usRaw = '200~苹果~AAPL.OQ~319.97~328.21~328.31~39606884~0~0~320.01~40~0~0~0~0~0~0~0~0~320.07~120~0~0~0~0~0~0~0~0~~2026-09-04 16:00:01~-8.24~-2.51~328.93~317.86~USD~39606884~12721652691~0.27~36.69~~42.89~~3.37~46667.97288~46696.99775~Apple Inc.~8.72~344.26~225.12~-80~43.43~0.33~46696.99775~18.02~0';
const u = q.parseQuote('usAAPL', usRaw);
assert(u && u.name === '苹果' && u.price === 319.97 && u.chg === -8.24 && u.pct === -2.51 && u.high === 328.93 && u.low === 317.86, '美股真实格式解析');

// 兼容历史带包装格式
const wrapped = q.parseQuote('sh600519', 'v_sh600519="' + aRaw + '";');
assert(wrapped && wrapped.price === 1319.93, '兼容 v_="..." 包装格式');

assert(q.parseQuote('sh600519', '') === null, '空数据返回 null');
assert(q.parseQuote('usAAPL.OQ', 'v_pv_none_match="1";') === null || q.parseQuote('xx000', '1') === null, '异常数据返回 null');
assert(q.parseQuote('xx000', 'v_pv_none_match="1";') === null, '无匹配代码返回 null');
assert(q.normCode('600519') === 'sh600519' && q.normCode('000001') === 'sz000001' && q.normCode('HK00700') === 'hk00700', 'A股港股代码规范化');
assert(q.normCode('AAPL') === 'usAAPL' && q.normCode('aapl.oq') === 'usAAPL' && q.normCode('usAAPL.OQ') === 'usAAPL', '美股代码规范化');

// 3. store 合并与持仓计算
const { store } = await import('./js/store.js');
assert(store.data.stocks.watchlist.length === 3, '默认自选含三大指数');
assert(store.data.work && Array.isArray(store.data.work.plans) && Array.isArray(store.data.work.logs), '工作情况数据结构');
store.update(d => d.todos.push({ id: 't1', title: '测试', done: false, priority: 'mid', date: '2026-09-07', createdAt: 1 }));
assert(JSON.parse(localStorage.getItem('workbench.data.v1')).todos.length === 1, 'update 立即写 localStorage');

const { calcPositions } = await import('./js/views/stocks.js');
const pos = calcPositions([
  { code: 'sh600519', side: 'buy', price: 100, qty: 100, date: '2026-01-01', createdAt: 1 },
  { code: 'sh600519', side: 'buy', price: 120, qty: 100, date: '2026-01-02', createdAt: 2 },
  { code: 'sh600519', side: 'sell', price: 150, qty: 50, date: '2026-01-03', createdAt: 3 },
]);
assert(pos.length === 1 && pos[0].qty === 150 && Math.abs(pos[0].cost - 110) < 1e-9, '平均成本法持仓');
assert(Math.abs(pos[0].realized - (150 - 110) * 50) < 1e-9, '已实现盈亏计算');

console.log('--- 冒烟测试完成 ---');
