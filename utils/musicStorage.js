import { BASE_API_URL } from '@env';

// 已由 actor.js 统一管理身份

function normalizeRecords(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  if (input?.results && Array.isArray(input.results)) return input.results;
  return [input];
}

// 将单条 record 规范化为后端期望字段
function toItem(r) {
  return {
    song: r.song || r.title || null,
    artist: r.artist || null,
    album: r.album || null,
    // prefer explicit cover fields, fall back to spotify.coverUrl when present
    cover_url: r.coverUrl || r.cover_url || (r.spotify && (r.spotify.coverUrl || r.spotify.cover_url)) || null,
    // accept various shapes: top-level spotifyUrl, nested spotify.url, or spotify.spotifyUrl
    spotify_url:
      (r.spotify && (r.spotify.url || r.spotifyUrl || r.spotify.spotifyUrl)) || r.spotify_url || null,
    meta: r.meta || null,
  };
}

// 保存一次抓取行为（fetch event）及其中的音乐条目（items）
// 统一使用 actor（userId 或 guestId）
export async function saveMusicInfo(payload = {}, actor) {
  if (!actor) throw new Error('saveMusicInfo 需要一个 actor 对象');

  const records = normalizeRecords(payload).map(toItem);

  if (records.length === 0) return { ok: false, reason: 'no_records' };

  if (!BASE_API_URL) throw new Error('BASE_API_URL not configured in .env');

  // 构建 event 元信息（前端可传入 url/title/meta）
  const event = {
    url: payload.url || null,
    title: payload.title || payload.pageTitle || null,
    fetched_at: new Date().toISOString(),
    meta: payload.meta || { raw: payload },
  };

  // 新 RESTful 路径，actor 统一传递
  const body = { actor, event, items: records };
  const res = await fetch(`${BASE_API_URL}/api/sniffs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `保存失败: ${res.status}`);
  }

  return await res.json();
}

// 查询当前身份（userId 或 guestId）的抓取历史
// 返回值为 events 数组，若无数据或格式不符则返回 []
export async function getMyMusicHistory(actor) {
  if (!actor) return []; // 如果没有 actor，直接返回空数组

  if (!BASE_API_URL) throw new Error('BASE_API_URL not configured in .env');
  let url = `${BASE_API_URL}/api/sniffs?`;
  if (actor.type === 'user') {
    url += `userId=${encodeURIComponent(actor.id)}`;
  } else {
    url += `guestId=${encodeURIComponent(actor.id)}`;
  }
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `查询失败: ${res.status}`);
  }

  const body = await res.json().catch(() => ({}));

  // 后端返回数组
  if (Array.isArray(body)) return body;

  // 其他格式视为无数据
  return [];
}
