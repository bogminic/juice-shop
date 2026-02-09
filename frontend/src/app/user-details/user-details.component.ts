/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { UserService } from '../Services/user.service'
import { Component, type OnInit, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faArrowCircleLeft } from '@fortawesome/free-solid-svg-icons'
import { MatButtonModule } from '@angular/material/button'
import { TranslateModule } from '@ngx-translate/core'

import { MatDividerModule } from '@angular/material/divider'
import { MatIconModule } from '@angular/material/icon'

library.add(faArrowCircleLeft)

@Component({
  selector: 'app-user-details',
  templateUrl: './user-details.component.html',
  styleUrls: ['./user-details.component.scss'],
  standalone: true,
  imports: [MatDialogModule, MatDividerModule, TranslateModule, MatButtonModule, MatIconModule]
})
export class UserDetailsComponent implements OnInit {
  dialogData = inject<UserDetailsDialogData>(MAT_DIALOG_DATA)
  private readonly userService = inject(UserService)

  public user: any

  ngOnInit (): void {
    const userId = Number(this.dialogData.id)
    this.userService.get(userId).subscribe({
      next: (user) => {
        this.user = user
      },
      error: (err) => { console.log(err) }
    })
  }
}

interface UserDetailsDialogData {
  id: number | string
}
