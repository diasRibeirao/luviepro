import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { randomUUID } from 'crypto';
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx=host.switchToHttp(),res=ctx.getResponse(),req=ctx.getRequest();
    const status=exception instanceof HttpException?exception.getStatus():HttpStatus.INTERNAL_SERVER_ERROR;
    const body=exception instanceof HttpException?exception.getResponse():undefined;
    const raw=typeof body==='string'?body:(body as any)?.message;
    const message=Array.isArray(raw)?raw.join('; '):raw??'Erro interno do servidor';
    const requestId=req.headers['x-request-id']||randomUUID();
    res.setHeader('x-request-id',requestId);
    res.status(status).json({statusCode:status,code:(body as any)?.error??'HTTP_ERROR',message,path:req.url,requestId,timestamp:new Date().toISOString()});
  }
}
