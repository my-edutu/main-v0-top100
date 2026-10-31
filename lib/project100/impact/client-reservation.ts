/** Clearing an old return page must not discard a newer pending checkout. */
export function clearImpactReservation(
  storage: Pick<Storage, "getItem" | "removeItem">,
  groupId: string,
  contributionId: string,
) {
  const key = `project100-checkout:${groupId}`;
  try {
    const saved = JSON.parse(storage.getItem(key) ?? "null");
    if (saved?.contributionId === contributionId) storage.removeItem(key);
  } catch {
    /* Browser storage is optional; the database reservation remains authoritative. */
  }
}
