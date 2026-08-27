import 'dotenv/config';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
async function bootstrap(){
  const app=await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  const allowedOrigins=(process.env.CORS_ORIGINS??'http://localhost:8081,http://localhost:19006,http://localhost:3000').split(',').map(v=>v.trim()).filter(Boolean);
  app.enableCors({origin:process.env.NODE_ENV==='production'?allowedOrigins:true,credentials:true});
  app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));
  app.useGlobalFilters(new HttpExceptionFilter());
  const port=Number(process.env.PORT ?? 3333);
  await app.listen(port,'0.0.0.0');
  console.log(`LuviePro API: http://0.0.0.0:${port}/api`);
}
bootstrap();
