type VideoSummaryItem = { date?: string | null }

export function summarizeAdminVideos(items: VideoSummaryItem[], now = new Date()) {
  const cutoff = new Date(now)
  cutoff.setMonth(cutoff.getMonth() - 3)

  const dates = items.map((item) => item.date ? new Date(item.date) : null)
  const validDates = dates.filter((date): date is Date => Boolean(date && !Number.isNaN(date.getTime())))

  return {
    total: items.length,
    dated: validDates.length,
    recent: validDates.filter((date) => date >= cutoff && date <= now).length,
    missingDate: items.length - validDates.length,
  }
}
