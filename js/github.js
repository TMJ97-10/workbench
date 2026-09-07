// ============ GitHub 云同步（REST API，data.json 存私有仓库） ============
const API = 'https://api.github.com';

/** UTF-8 安全 Base64 编码（中文必须走 TextEncoder） */
export function b64encode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}
/** Base64 -> UTF-8 字符串（GitHub 返回的 content 含换行，需先去掉） */
export function b64decode(b64) {
  const bin = atob(String(b64).replace(/\s/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function gh(token, path, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  return res;
}

/** 获取当前 token 对应的用户名 */
export async function getOwner(token) {
  const res = await gh(token, '/user');
  if (!res.ok) throw new Error(res.status === 401 ? 'Token 无效（401）' : '获取用户信息失败 HTTP ' + res.status);
  const u = await res.json();
  return u.login;
}

/** 确保私有仓库存在（不存在则自动创建），返回 true */
export async function ensureRepo(token, owner, repo) {
  const res = await gh(token, `/repos/${owner}/${repo}`);
  if (res.ok) return true;
  if (res.status !== 404) throw new Error('检查仓库失败 HTTP ' + res.status);
  const create = await gh(token, '/user/repos', {
    method: 'POST',
    body: JSON.stringify({ name: repo, private: true, description: '个人工作台数据（由 workbench 应用自动创建）', auto_init: false }),
  });
  if (!create.ok) {
    const t = await create.text().catch(() => '');
    throw new Error('创建仓库失败 HTTP ' + create.status + ' ' + t.slice(0, 120));
  }
  return true;
}

/** 拉取 data.json；文件不存在返回 null */
export async function fetchDataFile(token, owner, repo) {
  const res = await gh(token, `/repos/${owner}/${repo}/contents/data.json`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('拉取数据失败 HTTP ' + res.status);
  const j = await res.json();
  if (!j.content) return null;
  try {
    return { data: JSON.parse(b64decode(j.content)), sha: j.sha };
  } catch (e) {
    throw new Error('云端数据解析失败：' + e.message);
  }
}

/** 推送 data.json（先取 sha 再 PUT） */
export async function pushDataFile(token, owner, repo, dataObj) {
  let sha;
  const cur = await gh(token, `/repos/${owner}/${repo}/contents/data.json`);
  if (cur.ok) { const j = await cur.json(); sha = j.sha; }
  else if (cur.status !== 404) throw new Error('读取远端 sha 失败 HTTP ' + cur.status);
  const body = {
    message: 'workbench sync ' + new Date().toISOString(),
    content: b64encode(JSON.stringify(dataObj)),
    ...(sha ? { sha } : {}),
  };
  const res = await gh(token, `/repos/${owner}/${repo}/contents/data.json`, { method: 'PUT', body: JSON.stringify(body) });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error('推送失败 HTTP ' + res.status + ' ' + t.slice(0, 120));
  }
  return true;
}

/** 一次性带 15s 超时的完整拉取流程 */
export async function pullRemote(token, repo) {
  const owner = await getOwner(token);
  await ensureRepo(token, owner, repo);
  return fetchDataFile(token, owner, repo);
}

export async function pushRemote(token, repo, dataObj) {
  const owner = await getOwner(token);
  await ensureRepo(token, owner, repo);
  return pushDataFile(token, owner, repo, dataObj);
}
