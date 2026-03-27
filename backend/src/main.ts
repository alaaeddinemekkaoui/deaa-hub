import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const corsOriginConfig = process.env.FRONTEND_URLS ?? process.env.FRONTEND_URL ?? 'http://localhost:3000,http://localhost:3001';
  
  // Handle wildcard CORS
  const corsOrigins = corsOriginConfig === '*' ? true : corsOriginConfig
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: corsOrigins,
    credentials: corsOrigins === true ? false : true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT ?? 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`✅ Backend running on http://0.0.0.0:${port}`);
  console.log(`📱 Access from LAN at http://<YOUR_LAN_IP>:${port} (e.g., http://192.168.x.x:${port})`);
}
void bootstrap();
