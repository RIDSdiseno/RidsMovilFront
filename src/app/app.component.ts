import { HttpClientModule } from '@angular/common/http';  // Importa HttpClientModule
import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, HttpClientModule, IonRouterOutlet],  // Asegúrate de agregar HttpClientModule en imports

})
export class AppComponent {
  constructor() {}
}