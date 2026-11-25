'use client'

import { useEffect, useState } from 'react'
import { nextOpportunityDeadlineCheck, opportunityDeadlineDay } from '@/lib/opportunities/types'

export function useOpportunityDeadlineDay() {
  const [deadlineDay, setDeadlineDay] = useState(opportunityDeadlineDay)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    function checkDeadlines() {
      clearTimeout(timer)
      const now = new Date()
      setDeadlineDay(opportunityDeadlineDay(now))
      timer = setTimeout(checkDeadlines, Math.max(1, nextOpportunityDeadlineCheck(now) - now.getTime()))
    }
    checkDeadlines()
    window.addEventListener('focus', checkDeadlines)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('focus', checkDeadlines)
    }
  }, [])

  return deadlineDay
}
