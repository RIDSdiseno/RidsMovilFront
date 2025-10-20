import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule  } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AgregarUsuarioPageRoutingModule } from './agregar-usuario-routing.module';

import { AgregarUsuarioPage } from './agregar-usuario.page';
import { SharedModule } from 'src/app/shared/shared-module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AgregarUsuarioPageRoutingModule,
    SharedModule,
    ReactiveFormsModule
  ],
  declarations: [AgregarUsuarioPage]
})
export class AgregarUsuarioPageModule {}
