import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pago } from './pago.entity';
import { Reserva } from '../reserva/reserva.entity';
import { Usuario } from '../usuario/usuario.entity';
import { PagoService } from './pago.service';
import { PagoController } from './pago.controller';

@Module({
  // MailService llega desde MailModule, que es global (ver common/services/mail.module.ts).
  imports: [TypeOrmModule.forFeature([Pago, Reserva, Usuario])],
  controllers: [PagoController],
  providers: [PagoService],
  exports: [PagoService],
})
export class PagoModule {}
