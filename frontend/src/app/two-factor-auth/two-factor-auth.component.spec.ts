/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { type ComponentFixture, fakeAsync, flush, TestBed, tick, waitForAsync } from '@angular/core/testing'
import { TwoFactorAuthComponent } from './two-factor-auth.component'

import { ReactiveFormsModule } from '@angular/forms'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'

import { TranslateModule } from '@ngx-translate/core'

import { MatCardModule } from '@angular/material/card'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatButtonModule } from '@angular/material/button'
import { MatInputModule } from '@angular/material/input'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { MatIconModule } from '@angular/material/icon'
import { MatTableModule } from '@angular/material/table'
import { MatPaginatorModule } from '@angular/material/paginator'
import { MatDialogModule } from '@angular/material/dialog'
import { MatDividerModule } from '@angular/material/divider'
import { MatSnackBarModule } from '@angular/material/snack-bar'
import { MatTooltipModule } from '@angular/material/tooltip'

import { of } from 'rxjs'
import { ConfigurationService } from '../Services/configuration.service'
import { TwoFactorAuthService } from '../Services/two-factor-auth-service'
import { throwError } from 'rxjs/internal/observable/throwError'
import { QrCodeComponent } from 'ng-qrcode'
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http'

describe('TwoFactorAuthComponent', () => {
  let component: TwoFactorAuthComponent
  let fixture: ComponentFixture<TwoFactorAuthComponent>
  let twoFactorAuthService: any
  let configurationService: any

  beforeEach(waitForAsync(() => {
    twoFactorAuthService = jasmine.createSpyObj('TwoFactorAuthService', ['status', 'setup', 'disable'])
    configurationService = jasmine.createSpyObj('ConfigurationService', ['getApplicationConfiguration'])
    configurationService.getApplicationConfiguration.and.returnValue(of({ application: { } }))
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule,
        TranslateModule.forRoot(),
        BrowserAnimationsModule,
        MatCheckboxModule,
        MatFormFieldModule,
        MatCardModule,
        MatIconModule,
        MatInputModule,
        MatTableModule,
        MatPaginatorModule,
        MatDialogModule,
        MatDividerModule,
        MatButtonModule,
        QrCodeComponent,
        MatSnackBarModule,
        MatTooltipModule,
        TwoFactorAuthComponent],
      providers: [
        { provide: ConfigurationService, useValue: configurationService },
        { provide: TwoFactorAuthService, useValue: twoFactorAuthService },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting()
      ]
    }).compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(TwoFactorAuthComponent)
    component = fixture.componentInstance
  })

  it('should compile', () => {
    fixture.detectChanges()
    expect(component).toBeTruthy()
  })

  it('should set TOTP secret and URL if 2FA is not already set up', fakeAsync(() => {
    configurationService.getApplicationConfiguration.and.returnValue(of({ application: { name: 'Test App' } }))
    twoFactorAuthService.status.and.returnValue(of({ setup: false, email: 'email', secret: 'secret', setupToken: '12345' }))

    component.updateStatus()
    tick(0)
    fixture.detectChanges()

    expect(component.setupStatus).toBe(false)
    expect(component.totpUrl).toBe('otpauth://totp/Test%20App:email?secret=secret&issuer=Test%20App')
    expect(component.totpSecret).toBe('secret')
  }))

  it('should not set TOTP secret and URL if 2FA is already set up', fakeAsync(() => {
    configurationService.getApplicationConfiguration.and.returnValue(of({ application: { name: 'Test App' } }))
    twoFactorAuthService.status.and.returnValue(of({ setup: true, email: 'email', secret: 'secret', setupToken: '12345' }))

    component.updateStatus()
    tick(0)
    fixture.detectChanges()

    expect(component.setupStatus).toBe(true)
    expect(component.totpUrl).toBe(undefined)
    expect(component.totpSecret).toBe(undefined)
  }))

  it('should confirm successful setup of 2FA', fakeAsync(() => {
    fixture.detectChanges()
    twoFactorAuthService.setup.and.returnValue(of({}))
    component.setupStatus = false
    component.twoFactorSetupForm.get('passwordControl').setValue('password')
    component.twoFactorSetupForm.get('initialTokenControl').setValue('12345')

    component.setup()
    tick(0)

    expect(component.setupStatus).toBe(true)
    expect(twoFactorAuthService.setup).toHaveBeenCalledWith('password', '12345', undefined)
  }))

  it('should reset and mark form as errored when 2FA setup fails', fakeAsync(() => {
    fixture.detectChanges()
    twoFactorAuthService.setup.and.returnValue(throwError(new Error('Error')))
    component.setupStatus = false
    component.errored = false
    component.twoFactorSetupForm.get('passwordControl').markAsDirty()
    component.twoFactorSetupForm.get('initialTokenControl').markAsDirty()

    expect(component.twoFactorSetupForm.get('passwordControl').pristine).toBe(false)
    expect(component.twoFactorSetupForm.get('initialTokenControl').pristine).toBe(false)
    component.setup()
    tick(0)

    expect(component.setupStatus).toBe(false)
    expect(component.errored).toBe(true)
    expect(component.twoFactorSetupForm.get('passwordControl').pristine).toBe(true)
    expect(component.twoFactorSetupForm.get('initialTokenControl').pristine).toBe(true)
  }))

  it('should confirm successfully disabling 2FA', fakeAsync(() => {
    fixture.detectChanges()
    twoFactorAuthService.status.and.returnValue(of({ setup: false, email: 'email', secret: 'secret', setupToken: '12345' }))
    twoFactorAuthService.disable.and.returnValue(of({}))
    component.setupStatus = true
    component.twoFactorDisableForm.get('passwordControl').setValue('password')

    component.disable()
    flush()

    expect(component.setupStatus).toBe(false)
    expect(twoFactorAuthService.disable).toHaveBeenCalledWith('password')
  }))

  it('should reset and mark form as errored when disabling 2FA fails', fakeAsync(() => {
    fixture.detectChanges()
    twoFactorAuthService.disable.and.returnValue(throwError(new Error('Error')))
    component.setupStatus = true
    component.errored = false
    component.twoFactorDisableForm.get('passwordControl').markAsDirty()

    expect(component.twoFactorDisableForm.get('passwordControl').pristine).toBe(false)
    component.disable()
    tick(0)

    expect(component.setupStatus).toBe(true)
    expect(component.errored).toBe(true)
    expect(component.twoFactorDisableForm.get('passwordControl').pristine).toBe(true)
  }))
})
