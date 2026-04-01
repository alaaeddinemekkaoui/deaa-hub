"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const corsOriginConfig = process.env.FRONTEND_URLS ?? process.env.FRONTEND_URL ?? 'http://localhost:3000,http://localhost:3001';
    const corsOrigins = corsOriginConfig === '*' ? true : corsOriginConfig
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
    app.setGlobalPrefix('api');
    app.enableCors({
        origin: corsOrigins,
        credentials: corsOrigins === true ? false : true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
    }));
    const port = process.env.PORT ?? 4000;
    await app.listen(port, '0.0.0.0');
    console.log(`✅ Backend running on http://0.0.0.0:${port}`);
    console.log(`📱 Access from LAN at http://<YOUR_LAN_IP>:${port} (e.g., http://192.168.x.x:${port})`);
}
void bootstrap();
//# sourceMappingURL=main.js.map