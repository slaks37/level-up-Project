import { useEffect, useState } from 'react';
import { ExternalLink, Newspaper } from 'lucide-react';
import type { Language } from '../types';

const FEED = 'https://raw.githubusercontent.com/slaks37/level-up-Project/promo-news/promo-news.json';
const SOURCES = {
  Indomaret: 'https://www.indomaret.co.id/promosi/',
  Alfagift: 'https://blog.alfagift.id/promo/',
};
type Source = keyof typeof SOURCES;
interface NewsItem {
  title: string;
  source: Source;
  url: string;
  kind: 'promo' | 'news';
  start?: string;
  end?: string;
  published?: string;
}
interface NewsSnapshot {
  date: string;
  checks: Partial<Record<Source, boolean>>;
  items: NewsItem[];
}
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const wib = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' });
const cacheKey = 'levelup_promo_news_v1';
function safeItem(item: NewsItem) {
  if (!item || typeof item.title !== 'string' || !(item.source in SOURCES)) return false;
  try {
    const url = new URL(item.url);
    const source = new URL(SOURCES[item.source]);
    return url.protocol === 'https:' && url.hostname === source.hostname &&
      (item.kind === 'promo' ? datePattern.test(item.start || '') && datePattern.test(item.end || '') :
        item.kind === 'news' && datePattern.test(item.published || ''));
  } catch { return false; }
}
function cachedNews(): NewsSnapshot | null {
  try { return JSON.parse(localStorage.getItem(cacheKey) || 'null'); } catch { return null; }
}
function humanDate(value: string, lang: Language) {
  return new Date(value + 'T12:00:00Z').toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function PromoNewsPanel({ lang }: { lang: Language }) {
  const id = lang === 'id';
  const [snapshot, setSnapshot] = useState(cachedNews);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const today = wib.format();
  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort('timeout'), 10000);
    fetch(FEED + '?date=' + today, { signal: controller.signal, cache: 'no-cache' }).then(async (response) => {
      if (!response.ok) throw new Error('News unavailable');
      const value: NewsSnapshot = await response.json();
      if (!datePattern.test(value.date) || !value.checks || !Array.isArray(value.items)) throw new Error('Invalid news');
      const clean = { ...value, items: value.items.filter(safeItem).slice(0, 30) };
      setSnapshot(clean);
      try { localStorage.setItem(cacheKey, JSON.stringify(clean)); } catch { /* Cache is optional. */ }
    }).catch(() => {
      if (!controller.signal.aborted || controller.signal.reason === 'timeout') setFailed(true);
    }).finally(() => {
      if (!controller.signal.aborted || controller.signal.reason === 'timeout') setLoading(false);
    });
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [today]);

  const stale = Boolean(snapshot && snapshot.date !== today);
  const items = (snapshot?.items ?? []).filter((item) => (!item.end || item.end >= today) &&
    (item.kind !== 'promo' || ((item.start ?? '') <= today && !stale)));
  return (
    <section className="anime-panel overflow-hidden">
      <div className="blender-bar px-3 py-2">
        <h2 className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-sky-800"><Newspaper className="size-3.5" /> {id ? 'BERITA PROMO HARIAN' : 'DAILY PROMO NEWS'}</h2>
      </div>
      <div className="space-y-3 p-4">
        <p className="text-xs leading-relaxed text-slate-600">{id ? 'Promo dari kanal resmi. Cek ketersediaan gerai dan syarat di sumber.' : 'Promotions from official sources. Check participating stores and terms at the source.'}</p>
        {snapshot && <p className="text-[11px] font-semibold text-slate-600">{id ? 'Pembaruan terakhir' : 'Last updated'} · {humanDate(snapshot.date, lang)} WIB</p>}
        {(stale || failed || (snapshot && Object.values(snapshot.checks).some((ok) => !ok))) &&
          <p role="status" className="rounded bg-amber-50 p-2 text-xs text-amber-900">{id ? 'Pembaruan dari sebagian atau seluruh sumber belum tersedia.' : 'Some or all sources could not be refreshed.'}</p>}
        {items.length === 0 && <p role="status" className="text-xs text-slate-700">{loading
          ? (id ? 'Memuat berita…' : 'Loading news…')
          : (id ? 'Belum ada promo terverifikasi untuk hari ini.' : 'No verified promotions for today yet.')}</p>}
        <div className="max-h-[440px] space-y-2 overflow-y-auto pr-1">
          {items.map((item) => (
            <article key={item.source + item.title} className="space-y-1 rounded border border-slate-200 bg-slate-50 p-2.5">
              <p className="text-[10px] font-bold text-slate-600">{item.source} · {item.kind === 'promo'
                ? (id ? 'Berlaku hari ini' : 'Active today') : (id ? 'Berita promo' : 'Promo news')}</p>
              <h3 className="text-xs font-bold leading-snug text-slate-900">{item.title}</h3>
              {item.end && <p className="text-[11px] text-slate-600">{id ? 'Periode' : 'Period'} · {humanDate(item.start!, lang)} – {humanDate(item.end, lang)}</p>}
              {!item.end && item.published && <p className="text-[11px] text-slate-600">{humanDate(item.published, lang)}</p>}
              <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 underline">
                {id ? 'Baca sumber' : 'Read source'} <ExternalLink className="size-3" />
              </a>
            </article>
          ))}
        </div>
        {items.length === 0 && !loading && <div className="flex flex-wrap gap-2">
          {Object.entries(SOURCES).map(([name, url]) => <a key={name} href={url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-sky-700 underline">{name}</a>)}
        </div>}
      </div>
    </section>
  );
}
