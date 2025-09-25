import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FooterMenuComponent } from '../components/footer-menu/footer-menu.component';
import { IonicModule } from '@ionic/angular';

@NgModule({
  declarations: [FooterMenuComponent],
  imports: [CommonModule,IonicModule],
  exports: [FooterMenuComponent]  // Exportamos FooterMenuComponent para usarlo en otros módulos
})
export class SharedModule {}
