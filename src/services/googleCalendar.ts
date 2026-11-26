const CLIENT_ID = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID?.trim() || '';
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events.owned.readonly';
type TokenReply = { access_token?: string; scope?: string; error?: string };
interface GoogleOAuthClient {
  requestAccessToken(options?: { prompt?: string }): void;
}
interface GoogleOAuth {
  initTokenClient(options: {
    client_id: string;
    scope: string;
    include_granted_scopes: boolean;
    callback: (reply: TokenReply) => void;
    error_callback: () => void;
  }): GoogleOAuthClient;
  revoke(token: string, callback: () => void): void;
}
type GoogleWindow = Window & { google?: { accounts?: { oauth2?: GoogleOAuth } } };

const googleOAuth = () => (window as GoogleWindow).google?.accounts?.oauth2;
let loader: Promise<void> | undefined;

export function prepareGoogleOAuth(): Promise<void> {
  if (!CLIENT_ID) return Promise.reject(new Error('GOOGLE_OAUTH_UNCONFIGURED'));
  if (googleOAuth()) return Promise.resolve();
  if (!loader) {
    loader = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      const timeout = window.setTimeout(() => {
        script.remove();
        reject(new Error('GOOGLE_OAUTH_UNAVAILABLE'));
      }, 12000);
      script.onload = () => {
        window.clearTimeout(timeout);
        if (googleOAuth()) resolve();
        else reject(new Error('GOOGLE_OAUTH_UNAVAILABLE'));
      };
      script.onerror = () => {
        window.clearTimeout(timeout);
        script.remove();
        reject(new Error('GOOGLE_OAUTH_UNAVAILABLE'));
      };
      document.head.append(script);
    }).catch((error) => {
      loader = undefined;
      throw error;
    });
  }
  return loader;
}

export function requestGoogleToken(scope: string): Promise<string> {
  const oauth = googleOAuth();
  return new Promise((resolve, reject) => {
    if (!oauth || !CLIENT_ID) return reject(new Error('GOOGLE_OAUTH_UNAVAILABLE'));
    oauth.initTokenClient({
      client_id: CLIENT_ID,
      scope,
      include_granted_scopes: false,
      callback: (result) => {
        if (result.error || !result.access_token) reject(new Error('GOOGLE_CONSENT_REQUIRED'));
        else if (
          scope === CALENDAR_SCOPE &&
          !result.scope?.split(' ').some((granted) =>
            granted === CALENDAR_SCOPE ||
            granted === 'https://www.googleapis.com/auth/calendar.events.readonly' ||
            granted === 'https://www.googleapis.com/auth/calendar.readonly'
          )
        ) {
          reject(new Error('GOOGLE_CALENDAR_SCOPE_REQUIRED'));
        } else {
          resolve(result.access_token);
        }
      },
      error_callback: () => reject(new Error('GOOGLE_POPUP_CLOSED')),
    }).requestAccessToken({ prompt: 'select_account' });
  });
}

export function revokeCalendarToken(token: string) {
  googleOAuth()?.revoke(token, () => {});
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  link?: string;
}

export async function fetchCalendarEvents(token: string, now = new Date()): Promise<CalendarEvent[]> {
  const timeMin = new Date(now.getTime() - 7 * 86400000).toISOString();
  const timeMax = new Date(now.getTime() + 7 * 86400000).toISOString();
  const params = new URLSearchParams({
    singleEvents: 'true', orderBy: 'startTime', maxResults: '100', timeMin, timeMax,
    fields: 'items(id,summary,start,end,htmlLink,status)',
  });
  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?' + params, {
    headers: { Authorization: 'Bearer ' + token },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(response.status === 401 ? 'GOOGLE_SESSION_EXPIRED' : 'GOOGLE_CALENDAR_UNAVAILABLE');
  const { items } = await response.json() as { items?: Array<{
    id: string; summary?: string; htmlLink?: string; status?: string;
    start?: { date?: string; dateTime?: string }; end?: { date?: string; dateTime?: string };
  }> };
  return (items || []).flatMap((event) => {
    const start = event.start?.dateTime ?? event.start?.date;
    const end = event.end?.dateTime ?? event.end?.date;
    if (!start || !end || event.status === 'cancelled') return [];
    return [{ id: event.id, title: event.summary?.trim().slice(0, 120) || '', start, end, allDay: !event.start?.dateTime,
      ...(event.htmlLink?.startsWith('https://www.google.com/calendar/') || event.htmlLink?.startsWith('https://calendar.google.com/') ? { link: event.htmlLink } : {}) }];
  });
}

export async function connectCalendar(): Promise<string> {
  await prepareGoogleOAuth();
  return requestGoogleToken(CALENDAR_SCOPE);
}

export const calendarOAuthEnabled =
  Boolean(CLIENT_ID) && import.meta.env.VITE_CALENDAR_OAUTH_ENABLED !== 'false';

export async function importCalendarFile(file: File): Promise<CalendarEvent[]> {
  if (file.size > 3 * 1024 * 1024) throw new Error('Calendar file too large');
  const { default: ICAL } = await import('ical.js');
  const component = new ICAL.Component(ICAL.parse(await file.text()));
  if (component.name !== 'vcalendar') throw new Error('Invalid calendar');
  const source = component.getAllSubcomponents('vevent');
  const now = Date.now();
  const earliest = now - 7 * 86400000;
  const latest = now + 7 * 86400000;
  const list: CalendarEvent[] = [];
  let recurrenceBudget = 30000;
  for (const item of source.slice(0, 3000)) {
    if (item.getFirstPropertyValue('status') === 'CANCELLED' || item.hasProperty('recurrence-id')) continue;
    const event = new ICAL.Event(item);
    if (!event.startDate) continue;
    const add = (start: typeof event.startDate, end: typeof event.endDate) => {
      if (end.toJSDate().getTime() < earliest || start.toJSDate().getTime() > latest) return;
      list.push({
        id: event.uid + '-' + start.toString(), title: String(event.summary || '').slice(0, 120),
        start: start.isDate ? start.toString() : start.toJSDate().toISOString(),
        end: end.isDate ? end.toString() : end.toJSDate().toISOString(), allDay: start.isDate,
      });
    };
    if (!event.isRecurring()) { add(event.startDate, event.endDate); continue; }
    const iterator = event.iterator();
    for (let i = 0; i < 3000 && recurrenceBudget > 0; i++, recurrenceBudget--) {
      const next = iterator.next();
      if (!next || next.toJSDate().getTime() > latest) break;
      if (next.toJSDate().getTime() < earliest - 86400000) continue;
      const occurrence = event.getOccurrenceDetails(next);
      add(occurrence.startDate, occurrence.endDate);
    }
  }
  return list.sort((a, b) => Date.parse(a.start) - Date.parse(b.start)).slice(-100);
}
