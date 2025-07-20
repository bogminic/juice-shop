/*
 * Copyright (c) 2014-2025 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { Component, EventEmitter, Input, OnInit, Output, OnDestroy, signal } from '@angular/core'
import { BasketService } from '../Services/basket.service'
import { UserService } from '../Services/user.service'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faTrashAlt } from '@fortawesome/free-regular-svg-icons/'
import { faMinusSquare, faPlusSquare } from '@fortawesome/free-solid-svg-icons'
import { DeluxeGuard } from '../app.guard'
import { SnackBarHelperService } from '../Services/snack-bar-helper.service'
import { TranslateModule } from '@ngx-translate/core'
import { MatIconButton } from '@angular/material/button'
import { NgIf } from '@angular/common'
import { FlexModule } from '@angular/flex-layout/flex'
import { ExtendedModule } from '@angular/flex-layout/extended'
import { MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, MatFooterCellDef, MatFooterCell, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatFooterRowDef, MatFooterRow } from '@angular/material/table'
import { Subscription } from 'rxjs'

library.add(faTrashAlt, faMinusSquare, faPlusSquare)

@Component({
  selector: 'app-purchase-basket',
  templateUrl: './purchase-basket.component.html',
  styleUrls: ['./purchase-basket.component.scss'],
  imports: [MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell, ExtendedModule, FlexModule, MatFooterCellDef, MatFooterCell, NgIf, MatIconButton, MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatFooterRowDef, MatFooterRow, TranslateModule]
})
export class PurchaseBasketComponent implements OnInit, OnDestroy {
  @Input('allowEdit') public allowEdit: boolean = false
  @Input('displayTotal') public displayTotal: boolean = false
  @Input('totalPrice') public totalPrice: boolean = true
  @Output() emitTotal = new EventEmitter()
  @Output() emitProductCount = new EventEmitter()
  public tableColumns = ['image', 'product', 'quantity', 'price']

  // Signals for state
  public dataSource = signal<any[]>([])
  public bonus = signal<number>(0)
  public itemTotal = signal<number>(0)
  public userEmail = signal<string>('')

  private subscriptions: Subscription[] = []

  constructor (
    private readonly deluxeGuard: DeluxeGuard,
    private readonly basketService: BasketService,
    private readonly userService: UserService,
    private readonly snackBarHelperService: SnackBarHelperService
  ) { }

  ngOnInit (): void {
    if (this.allowEdit && !this.tableColumns.includes('remove')) {
      this.tableColumns.push('remove')
    }
    this.load()
    const userSub = this.userService.whoAmI().subscribe({
      next: (data) => {
        const email = data.email || 'anonymous'
        this.userEmail.set('(' + email + ')')
      },
      error: (err) => { console.log(err) }
    })
    this.subscriptions.push(userSub)
  }

  load () {
    const basketSub = this.basketService.find(parseInt(sessionStorage.getItem('bid'), 10)).subscribe({
      next: (basket) => {
        if (this.isDeluxe()) {
          basket.Products.forEach(product => {
            product.price = product.deluxePrice
          })
        }
        this.dataSource.set(basket.Products)
        this.itemTotal.set(
          basket.Products.reduce((itemTotal, product) => itemTotal + product.price * product.BasketItem.quantity, 0)
        )
        this.bonus.set(
          basket.Products.reduce((bonusPoints, product) => bonusPoints + Math.round(product.price / 10) * product.BasketItem.quantity, 0)
        )
        this.sendToParent(this.dataSource().length)
      },
      error: (err) => { console.log(err); this.dataSource.set([]) }
    })
    this.subscriptions.push(basketSub)
  }

  delete (id: number) {
    const delSub = this.basketService.del(id).subscribe({
      next: () => {
        this.load()
        this.basketService.updateNumberOfCartItems()
      },
      error: (err) => { console.log(err) }
    })
    this.subscriptions.push(delSub)
  }

  inc (id: number) {
    this.addToQuantity(id, 1)
  }

  dec (id: number) {
    this.addToQuantity(id, -1)
  }

  addToQuantity (id: number, value: number) {
    const getSub = this.basketService.get(id).subscribe({
      next: (basketItem) => {
        const newQuantity = basketItem.quantity + value
        const putSub = this.basketService.put(id, { quantity: newQuantity < 1 ? 1 : newQuantity }).subscribe({
          next: () => {
            this.load()
            this.basketService.updateNumberOfCartItems()
          },
          error: (err) => {
            this.snackBarHelperService.open(err.error?.error, 'errorBar')
            console.log(err)
          }
        })
        this.subscriptions.push(putSub)
      },
      error: (err) => { console.log(err) }
    })
    this.subscriptions.push(getSub)
  }

  sendToParent (count: number) {
    this.emitTotal.emit([this.itemTotal(), this.bonus()])
    this.emitProductCount.emit(count)
  }

  isDeluxe () {
    return this.deluxeGuard.isDeluxe()
  }

  ngOnDestroy (): void {
    this.subscriptions.forEach(sub => sub.unsubscribe())
  }
}
