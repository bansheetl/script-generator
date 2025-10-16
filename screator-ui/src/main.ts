import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { provideStore } from '@ngrx/store';
import { appReducer } from './app/app.reducers';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { providePrimeNG } from 'primeng/config';
import Lara from '@primeng/themes/lara';

bootstrapApplication(AppComponent, {
  providers: [
    provideStore({
      app: appReducer
    }),
    provideStoreDevtools({ maxAge: 25, logOnly: false }),
    providePrimeNG({
      ripple: true,
      theme: {
        options: {
          darkModeSelector: 'none',
          cssLayer: {
            name: 'primeng'
          }
        }
      }
    }),
    appConfig.providers
  ]
})
  .catch((err) => console.error(err));
