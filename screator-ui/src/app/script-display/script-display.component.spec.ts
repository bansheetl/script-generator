import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScriptDisplayComponent } from './script-display.component';

describe('ScriptDisplayComponent', () => {
  let component: ScriptDisplayComponent;
  let fixture: ComponentFixture<ScriptDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScriptDisplayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScriptDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
