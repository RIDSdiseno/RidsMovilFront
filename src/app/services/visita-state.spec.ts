import { TestBed } from '@angular/core/testing';

import { VisitaState } from './visita-state';

describe('VisitaState', () => {
  let service: VisitaState;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VisitaState);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
