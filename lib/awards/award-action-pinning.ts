export function shouldPinAwardAction(
  scrollY: number,
  actionBottom: number,
  viewportHeight: number,
) {
  const pinThreshold = Math.max(96, viewportHeight * 0.28)
  return scrollY > 0 && actionBottom < pinThreshold
}
