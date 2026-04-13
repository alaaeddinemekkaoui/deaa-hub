import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { type Express } from 'express';
import type { IncomingMessage, ServerResponse } from 'http';
import { AppModule } from '../src/app.module';
import { getCorsOptions } from '../src/common/cors';

let cachedApp: INestApplication | null = null;
let cachedExpress: Express | null = null;

async function getExpressApp(): Promise<Express> {
  if (cachedExpress) {
    return cachedExpress;
  }

  const expressApp = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));

  app.setGlobalPrefix('api');
  app.enableCors(getCorsOptions());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.init();

  cachedApp = app;
  cachedExpress = expressApp;
  return expressApp;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  const expressApp = await getExpressApp();
  return expressApp(req, res);
}
