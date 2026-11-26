import { useEffect, useState } from 'react';
import { mergeJournal, type JournalEntry } from '../engine/journal';
import { saveJournalEntry, subscribeJournal } from './firebaseService';

const prefix = 'levelup_journal_v1:';

function readJournal(key: string): JournalEntry[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(prefix + key) || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

export const loadGuestJournal = () => readJournal('guest');

function writeJournal(key: string, records: JournalEntry[]) {
  try {
    localStorage.setItem(prefix + key, JSON.stringify(records));
  } catch {
    // The in-session journal and Firestore's cache still retain these changes.
  }
}

export function useJournal(uid?: string) {
  const key = uid ? 'cloud:' + uid : 'guest';
  const [state, setState] = useState(() => ({ key, records: readJournal(key), ready: !uid, syncError: false }));
  const visible = state.key === key ? state : { key, records: readJournal(key), ready: !uid, syncError: false };

  useEffect(() => {
    setState({ key, records: readJournal(key), ready: !uid, syncError: false });
    if (!uid) return;
    return subscribeJournal(uid, (remote, fromCache) => {
      const records = mergeJournal(readJournal(key), remote);
      writeJournal(key, records);
      setState((current) => ({
        key, records,
        ready: !fromCache || !navigator.onLine || (current.key === key && current.ready),
        syncError: fromCache && current.key === key && current.syncError,
      }));
    }, () => setState((current) => current.key === key ? { ...current, ready: true, syncError: true } : current));
  }, [key, uid]);

  const save = (entry: JournalEntry) => {
    const records = mergeJournal(readJournal(key), [entry]);
    writeJournal(key, records);
    setState((current) => ({ key, records: mergeJournal(current.key === key ? current.records : records, records),
      ready: current.key === key ? current.ready : !uid, syncError: false }));
    if (uid) void saveJournalEntry(uid, entry).catch(() => {
      setState((current) => current.key === key ? { ...current, syncError: true } : current);
    });
  };

  return { ...visible, save };
}
