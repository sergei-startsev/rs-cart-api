import { Injectable } from '@nestjs/common';

import { v4 } from 'uuid';

import { Cart, CartItem, Product } from '../models';
import { pool } from '../../pg-pool';

@Injectable()
export class CartService {
  async findByUserId(userId: string): Promise<Cart> {
    const res = await pool.query(
      `select carts.id, carts.user_id, cart_items.product_id, cart_items.count from carts, cart_items
       where carts.status = 'OPEN' and carts.user_id = $1 and carts.id = cart_items.cart_id`,
      [userId],
    );

    if (!res?.rows?.length) {
      return null;
    }

    const items: CartItem[] = ((
      await Promise.all(
        res.rows.map(
          async ({ product_id, count }): Promise<CartItem> => {
            const res = await fetch(
              `${process.env.PRODUCTS_API}/products/${product_id}`,
            );
            if (res.ok) {
              const product: Product = await res.json();
              return { count: parseInt(count, 10), product };
            }
            return null;
          },
        ),
      )
    ).filter(Boolean) as CartItem[]).sort((i1, i2) =>
      i1.product.title.localeCompare(i2.product.title),
    );

    return { id: res.rows[0].id, items };
  }

  async createByUserId(userId: string): Promise<Cart> {
    const id = v4(v4());
    await pool.query(
      `insert into carts (id, user_id, created_at, updated_at, status) values ($1, $2, current_date, current_date, 'OPEN');`,
      [id, userId],
    );
    return { id, items: [] };
  }

  async updateByUserId(userId: string, item: CartItem): Promise<Cart> {
    let cart = await this.findByUserId(userId);
    if (!cart) {
      cart = await this.createByUserId(userId);
    }

    const hasProduct = cart.items.some(i => i.product.id === item.product.id);
    if (!hasProduct) {
      await pool.query(
        `insert into cart_items (cart_id, product_id, count) values ($1, $2, $3)`,
        [cart.id, item.product.id, item.count],
      );
      cart.items.push(item);
      return cart;
    }
    if (item.count > 0) {
      await pool.query(
        `update cart_items as I 
         set "count" = $3
         from carts as C
         where I.cart_id  = C.id and C.status = 'OPEN' and C.user_id = $1 and I.product_id=$2`,
        [userId, item.product.id, item.count],
      );
      cart.items.find(i => i.product.id === item.product.id).count = item.count;
    } else {
      await pool.query(
        `delete from cart_items where cart_id = $1 and product_id = $2`,
        [cart.id, item.product.id],
      );
      cart.items = cart.items.filter(i => i.product.id !== item.product.id);
    }

    return cart;
  }
}
