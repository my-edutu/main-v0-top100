export default {
  async queue(batch, env) {
    for (const message of batch.messages) {
      try {
        if (!env.PORTFOLIO_WORKER_SECRET || !env.APP_ORIGIN) throw new Error('Worker configuration missing')
        const response = await fetch(`${env.APP_ORIGIN}/api/internal/portfolio-cover/process`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${env.PORTFOLIO_WORKER_SECRET}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify(message.body),
          signal: AbortSignal.timeout(310_000),
        })

        if (!response.ok) {
          throw new Error(`Portfolio processor returned ${response.status}`)
        }
        const result = await response.json()
        if (!['ready', 'selected', 'rejected', 'expired'].includes(result.status)) {
          throw new Error('Portfolio processor did not confirm completion')
        }

        message.ack()
      } catch (error) {
        console.error('portfolio generation job failed', error)
        message.retry({ delaySeconds: Math.min(60 * 2 ** Math.min(message.attempts || 1, 6), 3600) })
      }
    }
  },
}
