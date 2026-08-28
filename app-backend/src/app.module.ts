import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from './modules/auth/auth.module';
import { UsuarioModule } from './modules/usuario/usuario.module';
import { ClienteModule } from './modules/cliente/cliente.module';
import { EmpleadoModule } from './modules/empleado/empleado.module';
import { PerfilModule } from './modules/perfil/perfil.module';
import { TiposHabitacionModule } from './modules/tipos-habitacion/tipos-habitacion.module';
import { HabitacionModule } from './modules/habitacion/habitacion.module';
import { ReservaModule } from './modules/reserva/reserva.module';
import { PagoModule } from './modules/pago/pago.module';
import { RecomendacionIaModule } from './modules/recomendacion-ia/recomendacion-ia.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ChatModule } from './modules/chat/chat.module';
import { ReporteModule } from './modules/reporte/reporte.module';
import { PublicModule } from './modules/public/public.module';
import { MailModule } from './common/services/mail.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST', '127.0.0.1'),
        port: config.get<number>('DB_PORT', 3306),
        username: config.get<string>('DB_USERNAME', 'root'),
        password: config.get<string>('DB_PASSWORD', ''),
        database: config.get<string>('DB_DATABASE', 'hotel'),
        autoLoadEntities: true,
        // El esquema se crea con database/hotel_schema.sql. No usamos sincronización
        // automática para que la base de datos sea la fuente de verdad del modelo.
        synchronize: false,
      }),
    }),
    MailModule,
    AuthModule,
    UsuarioModule,
    ClienteModule,
    EmpleadoModule,
    PerfilModule,
    TiposHabitacionModule,
    HabitacionModule,
    ReservaModule,
    PagoModule,
    RecomendacionIaModule,
    DashboardModule,
    ChatModule,
    ReporteModule,
    PublicModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
