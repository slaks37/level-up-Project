const DATABASE = 'level-up-avatar';
const STORE = 'photos';

export function avatarOwnerKey(uid?: string): string {
  return uid ? `cloud:${uid}` : 'guest';
}

function withAvatarStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      let transaction: IDBTransaction;
      let operation: IDBRequest<T>;
      try {
        transaction = database.transaction(STORE, mode);
        operation = action(transaction.objectStore(STORE));
      } catch (error) {
        database.close();
        reject(error);
        return;
      }
      transaction.oncomplete = () => {
        database.close();
        resolve(operation.result);
      };
      transaction.onabort = () => {
        database.close();
        reject(transaction.error || operation.error);
      };
    };
  });
}

export function loadAvatarPhoto(owner: string): Promise<Blob | undefined> {
  return withAvatarStore('readonly', (store) => store.get(owner));
}

export function saveAvatarPhoto(owner: string, photo: Blob) {
  return withAvatarStore('readwrite', (store) => store.put(photo, owner));
}

export function deleteAvatarPhoto(owner: string) {
  return withAvatarStore('readwrite', (store) => store.delete(owner));
}
