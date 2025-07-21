import type { MiddlewareHandler } from 'hono'

export const logger: MiddlewareHandler = async (c, next) => {
  const start = Date.now()
  const method = c.req.method
  const path = c.req.path
  
  console.log(`[${new Date().toISOString()}] ${method} ${path} - Request started`)
  
  await next()
  
  const ms = Date.now() - start
  const status = c.res.status
  
  const logLevel = status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO'
  const logMessage = `[${new Date().toISOString()}] ${logLevel}: ${method} ${path} - ${status} (${ms}ms)`
  
  if (logLevel === 'ERROR') {
    console.error(logMessage)
  } else if (logLevel === 'WARN') {
    console.warn(logMessage)
  } else {
    console.log(logMessage)
  }
}