import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { Request, Response } from 'express'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const isHttpException = exception instanceof HttpException
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR

    const exceptionResponse = isHttpException ? exception.getResponse() : null
    const normalizedMessage = this.normalizeMessage(exceptionResponse, exception)

    if (status >= 500) {
      this.logger.error(`[${request.method}] ${request.url} -> ${normalizedMessage}`)
    } else {
      this.logger.warn(`[${request.method}] ${request.url} -> ${normalizedMessage}`)
    }

    response.status(status).json({
      statusCode: status,
      message: normalizedMessage,
      path: request.url,
      timestamp: new Date().toISOString(),
    })
  }

  private normalizeMessage(exceptionResponse: unknown, exception: unknown): string {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse
    }

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const message = (exceptionResponse as { message?: unknown }).message
      if (Array.isArray(message)) {
        return message.join('; ')
      }
      if (typeof message === 'string') {
        return message
      }
    }

    if (exception instanceof Error && exception.message) {
      return exception.message
    }

    return 'Internal server error'
  }
}
