export default {
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(
      fetch(`${env.APP_ORIGIN}/api/internal/email-outbox/process`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${env.EMAIL_OUTBOX_WORKER_SECRET}`,
        },
      }).then(async response => {
        if (!response.ok) {
          throw new Error(`Email outbox processor returned ${response.status}`)
        }
      }).catch(error => {
        console.error('email outbox processing failed', error)
      }),
    )
  },

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
