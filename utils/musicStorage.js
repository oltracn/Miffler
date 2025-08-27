import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { BASE_API_URL } from '@env';

// 确保并返回本地 guestId
export async function ensureGuestId() {
  let guestId = await AsyncStorage.getItem('guestId');
  if (!guestId) {
    guestId = uuidv4();
    await AsyncStorage.setItem('guestId', guestId);
  }
  return guestId;
}

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
// 请求格式（POST /api/guest/fetch）:
// { guestId, event: { url?, title?, fetched_at?, meta? }, items: [ { song?, artist?, album?, cover_url?, spotify_url?, meta? }, ... ] }
// 响应格式: { event: { id, ... }, items: [ { id, ... }, ... ] }
export async function saveMusicInfo(payload = {}) {
  const guestId = await ensureGuestId();
  const records = normalizeRecords(payload).map(toItem);

  if (records.length === 0) return { ok: false, reason: 'no_records' };

  if (!BASE_API_URL) throw new Error('BASE_API_URL not configured in .env');

  // 构建 event 元信息（前端可传入 url/title/meta）
  const event = {
    // 仅使用 payload.url 作为事件的主 URL，不再使用 sourceUrl
    url: payload.url || null,
    title: payload.title || payload.pageTitle || null,
    fetched_at: new Date().toISOString(),
    meta: payload.meta || { raw: payload },
  };

  const body = { guestId, event, items: records };

  const res = await fetch(`${BASE_API_URL}/api/guest/fetch`, {
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

// 查询当前设备（guestId）的抓取历史
// 仅支持新版后端返回格式：{ events: [ { id, guest_id, url, title, fetched_at, meta, music_items: [...] }, ... ] }
// 返回值为 events 数组，若无数据或格式不符则返回 []
export async function getMyMusicHistory() {
  const guestId = await AsyncStorage.getItem('guestId');
  if (!guestId) return [];

  if (!BASE_API_URL) throw new Error('BASE_API_URL not configured in .env');
  const res = await fetch(`${BASE_API_URL}/api/guest/fetches?guestId=${encodeURIComponent(guestId)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `查询失败: ${res.status}`);
  }

  const body = await res.json().catch(() => ({}));

  // 仅接受新版接口返回 { events: [...] }
  if (Array.isArray(body.events)) return body.events;

  // 其他格式视为无数据
  return [];
}
