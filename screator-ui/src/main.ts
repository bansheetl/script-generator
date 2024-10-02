import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { provideStore } from '@ngrx/store';
import { appReducer } from './app/app.reducers';
import { provideStoreDevtools } from '@ngrx/store-devtools';

bootstrapApplication(AppComponent, {
  providers: [
    provideStore({
      app: appReducer
    }),
    provideStoreDevtools({ maxAge: 25, logOnly: false }),
    appConfig.providers
  ]
})
  .catch((err) => console.error(err));
