/* istanbul ignore file */

import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common/pipes';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.useGlobalPipes(new ValidationPipe());

  const openApiConfig = new DocumentBuilder()
    .addBearerAuth()
    .setTitle('dependabot')
    .setDescription('Api for dependabot poc')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup('api', app, document);

  const configService = app.get(ConfigService);
  await app.listen(configService.getOrThrow<number>('app.port'));
}
bootstrap();
