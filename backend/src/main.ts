import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { getCorsOptions } from './common/cors';
import { MessagingService } from './modules/messaging/messaging.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors(getCorsOptions());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Seed default message groups (EVERYONE, ADMINS_ONLY, per dept/filière/cycle)
  const messaging = app.get(MessagingService);
  await messaging.seedSystemGroups().catch((e) =>
    console.warn('⚠️  Messaging seed failed (non-fatal):', e),
  );

  const port = process.env.PORT ?? 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`✅ Backend running on http://0.0.0.0:${port}`);
  console.log(
    `📱 Access from LAN at http://<YOUR_LAN_IP>:${port} (e.g., http://192.168.x.x:${port})`,
  );
}
void bootstrap();
