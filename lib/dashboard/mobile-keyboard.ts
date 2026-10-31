export function hasSoftwareKeyboard(layoutHeight: number, visualHeight: number, scale: number, editing: boolean) {
  return editing && scale === 1 && layoutHeight - visualHeight > 150
}
