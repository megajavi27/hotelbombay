import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';

/**
 * MailService abre una conexión SMTP al arrancar, así que debe existir una sola
 * instancia en toda la aplicación. Declararlo en cada módulo que lo usa crearía
 * una por módulo. Al ser global, basta importar este módulo una vez en
 * AppModule y queda disponible en todos los demás.
 */
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
