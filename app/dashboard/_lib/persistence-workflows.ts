export async function persistThenRefresh<T>({
  applyPersisted,
  persist,
  refresh,
  refreshWarning,
}: {
  applyPersisted: (persisted: T) => void
  persist: () => Promise<T>
  refresh: () => Promise<void>
  refreshWarning: string
}): Promise<{ persisted: T; warning: string }> {
  const persisted = await persist()
  applyPersisted(persisted)

  try {
    await refresh()
    return { persisted, warning: '' }
  } catch {
    return { persisted, warning: refreshWarning }
  }
}
