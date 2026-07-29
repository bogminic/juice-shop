/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */
import { Component, OnInit, inject, ChangeDetectionStrategy, signal, viewChild, ElementRef } from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { ProductService } from '../Services/product.service'
import { BasketService } from '../Services/basket.service'
import { ProductReviewService } from '../Services/product-review.service'
import { UserService } from '../Services/user.service'
import { SnackBarHelperService } from '../Services/snack-bar-helper.service'
import { TranslateModule, TranslateService } from '@ngx-translate/core'
import { CommonModule } from '@angular/common'
import { MatCardModule } from '@angular/material/card'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatExpansionModule } from '@angular/material/expansion'
import { MatTabsModule } from '@angular/material/tabs'
import { MatDialog, MatDialogModule } from '@angular/material/dialog'
import { MatTooltipModule } from '@angular/material/tooltip'
import { FormsModule, ReactiveFormsModule, UntypedFormControl, Validators } from '@angular/forms'
import { ProductComponent } from '../product/product.component'
import { ProductReviewEditComponent } from '../product-review-edit/product-review-edit.component'
import { type Product } from '../Models/product.model'
import { type Review } from '../Models/review.model'
import { Observable } from 'rxjs'

@Component({
  selector: 'app-product-details',
  standalone: true,
  templateUrl: './product-details.component.html',
  styleUrl: './product-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    TranslateModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatExpansionModule,
    MatTabsModule,
    MatDialogModule,
    MatTooltipModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    ProductComponent
  ]
})
export class ProductDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly productService = inject(ProductService)
  private readonly basketService = inject(BasketService)
  private readonly productReviewService = inject(ProductReviewService)
  private readonly userService = inject(UserService)
  private readonly dialog = inject(MatDialog)
  private readonly snackBarHelperService = inject(SnackBarHelperService)
  private readonly translateService = inject(TranslateService)

  product = signal<Product | null>(null)
  similarProducts = signal<Product[]>([])
  quantity = signal(1)
  loading = signal(true)
  notFound = signal(false)
  isLoggedIn = signal(false)
  isDeluxe = signal(false)
  canScrollLeft = signal(false)
  canScrollRight = signal(true)
  author = 'Anonymous'
  reviews$!: Observable<Review[]>
  reviewControl: UntypedFormControl = new UntypedFormControl('', [Validators.maxLength(160)])

  readonly slider = viewChild<ElementRef>('slider')

  ngOnInit (): void {
    this.route.params.subscribe(params => {
      const productId = params['id']
      if (productId) {
        this.productService.get(productId).subscribe({
          next: (product) => {
            this.product.set(product)
            this.loading.set(false)
            this.isLoggedIn.set(!!localStorage.getItem('token'))
            this.reviews$ = this.productReviewService.get(product.id)
            this.userService.whoAmI(['email']).subscribe({
              next: (user: any) => {
                if (user?.email) {
                  this.author = user.email
                }
              },
              error: () => {}
            })
            this.fetchSimilarProducts(product)
          },
          error: () => {
            this.notFound.set(true)
            this.loading.set(false)
          }
        })
      }
    })
  }

  fetchSimilarProducts (product: Product): void {
    this.productService.find(null).subscribe({
      next: (products) => {
        const mapProducts = mapProductsToTableEntries(product)
        this.similarProducts.set(mapProducts(products))
      }
    })
  }

  addToBasket (): void {
    const productId = this.product()?.id
    if (!productId || this.quantity() < 1) return

    if (!this.isLoggedIn()) {
      this.basketService.addToGuestBasket(productId, this.quantity())
      this.translateService.get('BASKET_ADD_PRODUCT', { product: this.product()?.name }).subscribe({
        next: (msg) => this.snackBarHelperService.open(msg, 'confirmBar')
      })
      return
    }

    const basketId = Number(sessionStorage.getItem('bid'))
    this.basketService.find(basketId).subscribe({
      next: (basket) => {
        const existingItem = basket.Products?.find(p => p.id === productId)
        if (existingItem) {
          this.basketService.get(existingItem.BasketItem.id).subscribe({
            next: (item) => {
              this.basketService.put(item.id, { quantity: item.quantity + this.quantity() }).subscribe({
                next: () => {
                  this.translateService.get('BASKET_ADD_SAME_PRODUCT', { product: this.product()?.name }).subscribe({
                    next: (msg) => this.snackBarHelperService.open(msg, 'confirmBar')
                  })
                }
              })
            }
          })
        } else {
          this.basketService.save({ BasketId: basketId, ProductId: productId, quantity: this.quantity() }).subscribe({
            next: () => {
              this.translateService.get('BASKET_ADD_PRODUCT', { product: this.product()?.name }).subscribe({
                next: (msg) => this.snackBarHelperService.open(msg, 'confirmBar')
              })
            }
          })
        }
      }
    })
  }

  addReview (textPut: HTMLTextAreaElement): void {
    const productId = this.product()?.id
    if (!productId) return
    const review = { message: textPut.value, author: this.author }
    textPut.value = ''
    this.productReviewService.create(productId, review).subscribe({
      next: () => {
        this.reviews$ = this.productReviewService.get(productId)
      },
      error: (err) => { console.log(err) }
    })
    this.snackBarHelperService.open('CONFIRM_REVIEW_SAVED')
  }

  editReview (review: Review): void {
    const productId = this.product()?.id
    if (!productId) return
    this.dialog.open(ProductReviewEditComponent, {
      width: '500px',
      height: 'max-content',
      data: { reviewData: review }
    }).afterClosed().subscribe(() => {
      this.reviews$ = this.productReviewService.get(productId)
    })
  }

  likeReview (review: Review): void {
    const productId = this.product()?.id
    if (!productId) return
    this.productReviewService.like(review._id).subscribe(() => {
      console.log('Liked ' + review._id)
    })
    setTimeout(() => {
      this.reviews$ = this.productReviewService.get(productId)
    }, 200)
  }

  backToSearch (): void {
    this.router.navigate(['/search'])
  }

  scrollSimilar (direction: number): void {
    const el = this.slider()?.nativeElement
    if (!el) return
    const cardWidth = 260
    const gap = 24
    const scrollAmount = (cardWidth + gap) * direction
    el.scrollBy({ left: scrollAmount, behavior: 'smooth' })
  }

  onSliderScroll (): void {
    const el = this.slider()?.nativeElement
    if (!el) return
    this.canScrollLeft.set(el.scrollLeft > 0)
    this.canScrollRight.set(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }
}

function mapProductsToTableEntries (currentProduct: Product) {
  return (products: Product[]) => {
    const similar = products
      .filter((product) => product.id !== currentProduct.id)
      .filter((product) => {
        if (product.price == null || currentProduct.price == null) {
          return false
        }
        const priceDelta = Math.abs(product.price - currentProduct.price)
        return priceDelta <= 2 || product.price === currentProduct.price
      })

    if (similar.length >= 6) {
      return similar.slice(0, 6).map((product) => ({ ...product }))
    }

    const fallback = products.filter((product) => product.id !== currentProduct.id)
    const shuffled = [...fallback].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 6).map((product) => ({ ...product }))
  }
}