import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { ApiResponse } from 'shared/dist'
import { securityHeaders, logger, errorHandler } from './middleware'

const app = new Hono()

// Global middleware
app.use('*', logger)
app.use('*', securityHeaders)
app.use('*', cors())

// Error handling
app.onError(errorHandler)

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/hello', async (c) => {

  const data: ApiResponse = {
    message: "Hello BHVR!",
    success: true
  }

  return c.json(data, { status: 200 })
})

// Export WorkflowParser for use in other modules
export { WorkflowParser } from './parser/WorkflowParser'

export default app
