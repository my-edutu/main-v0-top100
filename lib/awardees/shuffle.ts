/** Return a Fisher-Yates shuffled copy of the awardee list. */
export function shuffleAwardees<T>(
  awardees: readonly T[],
  random: () => number = Math.random,
): T[] {
  const shuffled = [...awardees]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ]
  }

  return shuffled
}
