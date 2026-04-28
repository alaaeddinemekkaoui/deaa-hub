import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import compression from 'compression';
import { getCorsOptions } from './common/cors';
import { MessagingService } from './modules/messaging/messaging.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.use(compression());
  app.enableCors(getCorsOptions());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT ?? 4000;
  await app.listen(port, '0.0.0.0');

  // Seed only from primary process (or single process mode) to avoid duplicate seeds.
  const isWorker = process.env.NODE_CLUSTER_WORKER === '1';
  const workerId = process.env.WORKER_ID ? Number(process.env.WORKER_ID) : 0;
  if (!isWorker || workerId === 1) {
    const messaging = app.get(MessagingService);
    void messaging
      .seedSystemGroups()
      .catch((e) => console.warn('Messaging seed failed (non-fatal):', e));
  }

  console.log(`✅ Backend running on http://0.0.0.0:${port}`);
  console.log(
    `📱 Access from LAN at http://<YOUR_LAN_IP>:${port} (e.g., http://192.168.x.x:${port})`,
  );
}
void bootstrap();
