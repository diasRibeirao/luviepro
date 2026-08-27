import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { requestId } from './request-id';
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if(!(exception instanceof HttpException)&&process.env.NODE_ENV!=='production')console.error('[HTTP_ERROR]',exception);
    const ctx=host.switchToHttp(),res=ctx.getResponse(),req=ctx.getRequest();
    const status=exception instanceof HttpException?exception.getStatus():HttpStatus.INTERNAL_SERVER_ERROR;
    const body=exception instanceof HttpException?exception.getResponse():undefined;
    const raw=typeof body==='string'?body:(body as any)?.message;
    const message=Array.isArray(raw)?raw.join('; '):raw??'Erro interno do servidor';
    const correlationId=req.requestId||requestId(req.headers['x-request-id']);
    res.setHeader('x-request-id',correlationId);
    res.status(status).json({statusCode:status,code:(body as any)?.error??'HTTP_ERROR',message,path:req.url,requestId:correlationId,timestamp:new Date().toISOString()});
  }
}
