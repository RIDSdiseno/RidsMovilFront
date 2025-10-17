import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AgregarEquiposPage } from './agregar-equipos.page';

describe('AgregarEquiposPage', () => {
  let component: AgregarEquiposPage;
  let fixture: ComponentFixture<AgregarEquiposPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AgregarEquiposPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
