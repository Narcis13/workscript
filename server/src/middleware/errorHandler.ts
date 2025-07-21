import type { ErrorHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'

export const errorHandler: ErrorHandler = (err, c) => {
  console.error(`[${new Date().toISOString()}] ERROR:`, err)

  if (err instanceof HTTPException) {
    // Handle Hono HTTP exceptions
    return c.json(
      {
        error: {
          message: err.message,
          status: err.status,
        },
        success: false,
      },
      err.status
    )
  }

  // Handle validation errors from workflow parser
  if (err.name === 'ValidationError') {
    return c.json(
      {
        error: {
          message: 'Validation failed',
          details: err.message,
          status: 400,
        },
        success: false,
      },
      400
    )
  }

  // Handle other errors
  const isDev = process.env.NODE_ENV === 'development'
  const message = isDev ? err.message : 'Internal server error'
  const stack = isDev ? err.stack : undefined

  return c.json(
    {
      error: {
        message,
        status: 500,
        ...(stack && { stack }),
      },
      success: false,
    },
    500
  )
}