import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Aplica los decoradores @Exclude() de class-transformer (ej: ocultar el hash
  // de password en las respuestas de /usuario) a todas las respuestas de la API.
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Servir archivos estáticos (comprobantes de transferencia)
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  const apiPrefix = config.get<string>('API_PREFIX', 'api');
  app.setGlobalPrefix(apiPrefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN', 'http://localhost:4200'),
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Hotel Bombay API')
    .setDescription(
      'API REST para el sistema de gestión del Hotel Bombay: usuarios, clientes, empleados, ' +
      'habitaciones, reservas, pagos y recomendaciones turísticas (IA).',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Hotel Bombay API corriendo en: http://localhost:${port}/${apiPrefix}`);
}
bootstrap();
