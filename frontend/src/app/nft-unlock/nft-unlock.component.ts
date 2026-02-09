import { Component, inject, OnInit } from '@angular/core'
import { KeysService } from '../Services/keys.service'
import { MatDividerModule } from '@angular/material/divider'
import { MatInputModule } from '@angular/material/input'
import { MatFormFieldModule } from '@angular/material/form-field'
import { FormsModule } from '@angular/forms'

import { TranslateModule } from '@ngx-translate/core'
import { MatButtonModule } from '@angular/material/button'

import { MatCardModule } from '@angular/material/card'
import { catchError } from 'rxjs/operators'
import { of } from 'rxjs'

@Component({
  selector: 'app-nft-unlock',
  templateUrl: './nft-unlock.component.html',
  styleUrls: ['./nft-unlock.component.scss'],
  standalone: true,
  imports: [MatCardModule, MatButtonModule, TranslateModule, FormsModule, MatFormFieldModule, MatInputModule, MatDividerModule]
})
export class NFTUnlockComponent implements OnInit {
  private readonly keysService = inject(KeysService)

  privateKey: string
  formSubmitted = false
  successResponse = false
  errorMessage = ''

  // Params for translation with HTML link
  i18nParams = {
    link: '<a target="_blank" rel="noopener noreferrer" href="https://testnets.opensea.io/assets/mumbai/0xf4817631372dca68a25a18eb7a0b36d54f3dbcf7/0">Opensea</a>'
  }

  ngOnInit (): void {
    this.checkChallengeStatus()
  }

  checkChallengeStatus () {
    this.keysService.nftUnlocked()
      .pipe(catchError((error) => {
        console.log(error)
        this.successResponse = false
        return of({ status: false })
      }))
      .subscribe((response) => {
        this.successResponse = response.status
      })
  }

  submitForm () {
    this.formSubmitted = true
    this.keysService.submitKey(this.privateKey).subscribe({
      next:
      (response) => {
        if (response.success) {
          this.successResponse = true
          this.errorMessage = response.message
        } else {
          this.successResponse = false
        }
      },
      error: (error) => {
        this.successResponse = false
        this.errorMessage = error.error.message
      }
    }
    )
  }
}
