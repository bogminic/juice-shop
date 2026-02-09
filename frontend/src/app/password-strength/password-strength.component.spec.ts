/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { type ComponentFixture, TestBed } from '@angular/core/testing'

import { PasswordStrengthComponent } from './password-strength.component'

describe('PasswordStrengthComponent', () => {
  let component: PasswordStrengthComponent
  let fixture: ComponentFixture<PasswordStrengthComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PasswordStrengthComponent]
    }).compileComponents()

    fixture = TestBed.createComponent(PasswordStrengthComponent)
    component = fixture.componentInstance
  })

  it('should create', () => {
    fixture.detectChanges()
    expect(component).toBeTruthy()
  })

  it('should render mat-progress-bar', () => {
    component.password = 'a'
    fixture.detectChanges()
    const progressBar = fixture.nativeElement.querySelector('mat-progress-bar')
    expect(progressBar).toBeTruthy()
  })

  it('should bind progress input to mat-progress-bar value', () => {
    component.password = 'Aa1!Aa1!'
    fixture.detectChanges()

    const progressBarDebug =
      fixture.debugElement.nativeElement.querySelector('mat-progress-bar')
    expect(progressBarDebug).toBeTruthy()

    const matProgressBarInstance = fixture.debugElement.children.find(
      (el) => el.nativeElement.tagName.toLowerCase() === 'mat-progress-bar'
    )?.componentInstance

    expect(matProgressBarInstance.value).toBe(100)
  })

  it('should apply correct class based on progress value', () => {
    const cases = [
      { password: 'aaaaaaaa', expected: 'low-medium' },
      { password: 'Aaaaaaaa', expected: 'medium' },
      { password: 'Aaaaaaa1', expected: 'high-medium' },
      { password: 'Aaaaaaa1!', expected: 'high' },
      { password: 'Aa1!Aa1!', expected: 'high' }
    ]

    for (const testCase of cases) {
      fixture = TestBed.createComponent(PasswordStrengthComponent)
      component = fixture.componentInstance
      component.password = testCase.password
      fixture.detectChanges()
      const progressBar = fixture.nativeElement.querySelector('mat-progress-bar')
      expect(progressBar.classList).toContain(testCase.expected)
      fixture.destroy()
    }
  })

  it('should have correct ARIA attributes for accessibility', () => {
    component.password = 'a'
    fixture.detectChanges()
    const progressBar = fixture.nativeElement.querySelector('mat-progress-bar')
    expect(progressBar.getAttribute('role')).toBe('progressbar')
    expect(progressBar.getAttribute('aria-valuemin')).toBe('0')
    expect(progressBar.getAttribute('aria-valuemax')).toBe('100')
  })

  it('should update aria-valuenow based on progress value', () => {
    component.password = 'Aaaaaaa1'
    fixture.detectChanges()
    const progressBar = fixture.nativeElement.querySelector('mat-progress-bar')
    expect(progressBar.getAttribute('aria-valuenow')).toBe('80')
  })
})
