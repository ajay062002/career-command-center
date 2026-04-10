import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideCharts } from 'ng2-charts';
import {
  BarController, BarElement,
  DoughnutController, ArcElement,
  CategoryScale, LinearScale,
  Tooltip, Legend, Title
} from 'chart.js';
import { authInterceptor } from './core/interceptors/auth.interceptor';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    provideCharts({
      registerables: [
        BarController, BarElement,
        DoughnutController, ArcElement,
        CategoryScale, LinearScale,
        Tooltip, Legend, Title
      ]
    })
  ]
};
