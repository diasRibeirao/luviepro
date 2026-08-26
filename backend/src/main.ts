import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
async function bootstrap(){
  const app=await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({origin:true,credentials:true});
  app.useGlobalPipes(new ValidationPipe({whitelist:true,transform:true}));
  await app.listen(Number(process.env.PORT ?? 3333));
  console.log(`LuviePro API: http://localhost:${process.env.PORT ?? 3333}/api`);
}
bootstrap();
