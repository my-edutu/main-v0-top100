export default {
  async queue(batch, env) {
    for (const message of batch.messages) {
      try {
        const response = await fetch(`${env.APP_ORIGIN}/api/internal/portfolio-cover/process`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${env.PORTFOLIO_WORKER_SECRET}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify(message.body),
        })

        if (!response.ok) {
          throw new Error(`Portfolio processor returned ${response.status}`)
        }

        message.ack()
      } catch (error) {
        console.error('portfolio generation job failed', error)
        message.retry()
      }
    }
  },
}
