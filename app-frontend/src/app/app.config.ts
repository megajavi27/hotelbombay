import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MAT_ICON_DEFAULT_OPTIONS } from '@angular/material/icon';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { MatDatepickerIntl } from '@angular/material/datepicker';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

import moment from 'moment';
// Registra el idioma español en moment. En el navegador moment NO carga locales
// bajo demanda (eso solo pasa en Node), así que sin este import el calendario
// seguiría mostrando "January", "Sun", etc. aunque MAT_DATE_LOCALE diga 'es'.
import 'moment/locale/es';

import { routes } from './app.routes';
import { authInterceptor } from '@interceptors/auth.interceptor';
import { HB_MOMENT_DATE_FORMATS } from '@utils/date.util';
import { DatepickerIntlEs } from './core/config/datepicker-es.config';
import { PaginatorIntlEs } from './core/config/paginator-es.config';

// Español como idioma por defecto de moment en toda la aplicación. Los formatos
// de date.util.ts son numéricos (YYYY-MM-DD), así que esto no altera lo que se
// envía al backend; solo afecta a los nombres de meses y días.
moment.locale('es');

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),

    // ── Calendarios en español ────────────────────────────────────────────
    // Aplica a todos los mat-datepicker de la aplicación: no hace falta
    // configurar nada en cada componente.
    //   · MAT_DATE_LOCALE  → nombres de meses y días (vienen de moment)
    //   · MatDatepickerIntl → botones y etiquetas de accesibilidad
    provideMomentDateAdapter(HB_MOMENT_DATE_FORMATS),
    { provide: MAT_DATE_LOCALE, useValue: 'es' },
    { provide: MatDatepickerIntl, useClass: DatepickerIntlEs },

    // ── Paginadores en español ────────────────────────────────────────────
    // Material no traduce el paginador con el locale: hay que sustituir la
    // clase de textos. Registrado aquí, lo heredan todas las listas.
    { provide: MatPaginatorIntl, useClass: PaginatorIntlEs },

    provideCharts(withDefaultRegisterables()),
    { provide: MAT_ICON_DEFAULT_OPTIONS, useValue: { fontSet: 'material-symbols-outlined' } },
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline' } }
  ]
};
