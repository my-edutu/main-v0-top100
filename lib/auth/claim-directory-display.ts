export function repairUtf8Mojibake(value: string): string {
  return value.replace(/Ã[\u0080-\u00bf]/gu, (sequence) => {
    const bytes = Uint8Array.from(Array.from(sequence, (character) => character.codePointAt(0)!))
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    } catch {
      return sequence
    }
  })
}
