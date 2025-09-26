import { NgModule } from '@angular/core';
import { CommonModule, DatePipe  } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { PerfilPageRoutingModule } from './perfil-routing.module';
import { PerfilPage } from './perfil.page';
import { FooterMenuComponent } from 'src/app/components/footer-menu/footer-menu.component'; 
import { SharedModule } from 'src/app/shared/shared-module';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PerfilPageRoutingModule,
    SharedModule
  ],
  declarations: [PerfilPage],
  providers:[DatePipe],
})
export class PerfilPageModule { }
