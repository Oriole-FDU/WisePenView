export async function clearIndexedDbDatabases(prefixes: readonly string[]): Promise<void> {
  if (typeof indexedDB === 'undefined') return;

  const indexedDb = indexedDB as IDBFactory & {
    databases?: () => Promise<Array<{ name?: string }>>;
  };
  if (typeof indexedDb.databases !== 'function') return;

  let databases: Array<{ name?: string }>;
  try {
    databases = await indexedDb.databases();
  } catch {
    return;
  }

  const names = databases
    .map((database) => database.name)
    .filter((name): name is string => typeof name === 'string')
    .filter((name) => prefixes.some((prefix) => name.startsWith(prefix)));

  await Promise.all(
    names.map(
      (name) =>
        new Promise<void>((resolve) => {
          const request = indexedDB.deleteDatabase(name);
          request.onsuccess = () => resolve();
          request.onerror = () => resolve();
          request.onblocked = () => resolve();
        })
    )
  );
}
