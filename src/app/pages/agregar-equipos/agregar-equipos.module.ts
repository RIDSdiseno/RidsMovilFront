import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AgregarEquiposPageRoutingModule } from './agregar-equipos-routing.module';

import { AgregarEquiposPage } from './agregar-equipos.page';
import { SharedModule } from 'src/app/shared/shared-module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AgregarEquiposPageRoutingModule,
    SharedModule,
    ReactiveFormsModule,
  ],
  declarations: [AgregarEquiposPage]
})
export class AgregarEquiposPageModule {}
