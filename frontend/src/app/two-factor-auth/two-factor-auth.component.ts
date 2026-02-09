/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { Component, inject, OnInit } from '@angular/core'
import { UntypedFormControl, UntypedFormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms'

import { TwoFactorAuthService } from '../Services/two-factor-auth-service'
import { ConfigurationService } from '../Services/configuration.service'

import { library } from '@fortawesome/fontawesome-svg-core'
import { faSave, faUnlockAlt } from '@fortawesome/free-solid-svg-icons'

import { forkJoin } from 'rxjs'
import { TranslateService, TranslateModule } from '@ngx-translate/core'
import { MatSnackBar } from '@angular/material/snack-bar'
import { SnackBarHelperService } from '../Services/snack-bar-helper.service'
import { MatTooltipModule } from '@angular/material/tooltip'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import { MatInputModule } from '@angular/material/input'
import { MatFormFieldModule } from '@angular/material/form-field'

import { MatCardModule } from '@angular/material/card'
import { QrCodeComponent } from 'ng-qrcode'

library.add(faUnlockAlt, faSave)

@Component({
  selector: 'app-two-factor-auth',
  templateUrl: './two-factor-auth.component.html',
  styleUrls: ['./two-factor-auth.component.scss'],
  standalone: true,
  imports: [MatCardModule, TranslateModule, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, QrCodeComponent, MatIconModule, MatTooltipModule]
})
export class TwoFactorAuthComponent implements OnInit {
  private readonly twoFactorAuthService = inject(TwoFactorAuthService)
  private readonly configurationService = inject(ConfigurationService)
  private readonly snackBar = inject(MatSnackBar)
  private readonly translateService = inject(TranslateService)
  private readonly snackBarHelperService = inject(SnackBarHelperService)

  public data?: string

  public twoFactorSetupForm: UntypedFormGroup = new UntypedFormGroup({
    passwordControl: new UntypedFormControl('', [Validators.required]),
    initialTokenControl: new UntypedFormControl('', [Validators.required, Validators.pattern('^[\\d]{6}$')])
  })

  public twoFactorDisableForm: UntypedFormGroup = new UntypedFormGroup({
    passwordControl: new UntypedFormControl('', [Validators.required])
  })

  public setupStatus = false
  public errored = false

  public totpUrl?: string
  public totpSecret?: string
  private setupToken?: string

  private appName = 'OWASP Juice Shop'

  ngOnInit (): void {
    setTimeout(() => this.updateStatus(), 0)
  }

  updateStatus () {
    const status = this.twoFactorAuthService.status()
    const config = this.configurationService.getApplicationConfiguration()

    forkJoin([status, config]).subscribe({
      next: ([{ setup, email, secret, setupToken }, config]) => {
        setTimeout(() => {
          this.setupStatus = setup
          this.appName = config.application.name
          if (!setup) {
            const encodedAppName = encodeURIComponent(this.appName)
            this.totpUrl = `otpauth://totp/${encodedAppName}:${email}?secret=${secret}&issuer=${encodedAppName}`
            this.totpSecret = secret
            this.setupToken = setupToken
          }
        }, 0)
      },
      error: () => {
        console.log('Failed to fetch 2fa status')
      }
    })
    return status
  }

  setup () {
    this.twoFactorAuthService.setup(
      this.twoFactorSetupForm.get('passwordControl')?.value,
      this.twoFactorSetupForm.get('initialTokenControl')?.value,
      this.setupToken
    ).subscribe({
      next: () => {
        setTimeout(() => {
          this.setupStatus = true
        }, 0)
        this.snackBarHelperService.open('CONFIRM_2FA_SETUP')
      },
      error: () => {
        setTimeout(() => {
          this.twoFactorSetupForm.get('passwordControl')?.markAsPristine()
          this.twoFactorSetupForm.get('initialTokenControl')?.markAsPristine()
          this.errored = true
        }, 0)
      }
    })
  }

  disable () {
    this.twoFactorAuthService.disable(
      this.twoFactorDisableForm.get('passwordControl')?.value
    ).subscribe({
      next: () => {
        this.updateStatus().subscribe()
        this.snackBarHelperService.open('CONFIRM_2FA_DISABLE')
      },
      error: () => {
        setTimeout(() => {
          this.twoFactorDisableForm.get('passwordControl')?.markAsPristine()
          this.errored = true
        }, 0)
      }
    })
  }
}
