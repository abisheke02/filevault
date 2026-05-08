import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api', { exclude: ['metrics'] });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  app.enableCors({
    origin: process.env.NODE_ENV === 'production'
      ? process.env.PUBLIC_URL || 'http://localhost:5173'
      : true,
    credentials: true,
  });

  const doc = new DocumentBuilder()
    .setTitle('FileVault API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, doc));

  await app.listen(process.env.PORT ?? 3001);
  console.log(`FileVault API listening on :${process.env.PORT ?? 3001}`);
}
bootstrap();
