import { Injectable } from '@nestjs/common';
import { v4 } from 'uuid';

import { Order } from '../models';
import { pool } from '../../pg-pool';

@Injectable()
export class OrderService {
  private orders: Record<string, Order> = {};

  findById(orderId: string): Order {
    return this.orders[orderId];
  }

  async findByUserId(userId): Promise<any> {
    const res = await pool.query(
      `select orders.id, orders.user_id, orders.cart_id, orders.status, orders.delivery,orders.payment, orders.comments, orders.total from orders
       where orders.user_id = $1;`,
      [userId],
    );
    console.log(res.rows);
    return await Promise.all(
      res.rows.map(async ({ id, cart_id, delivery, status, comments }) => {
        const itemsRaw = await pool.query(
          `select carts.id, carts.user_id, cart_items.product_id, cart_items.count from carts, cart_items
           where cart_items.cart_id  = carts.id and carts.id = $1`,
          [cart_id],
        );
        const items = itemsRaw.rows.map(({ product_id, count }) => {
          return { product_id, count };
        });
        return {
          id,
          address: delivery,
          items,
          statusHistory: [{ status, comment: comments }],
        };
      }),
    );
  }

  async create(data: any): Promise<Order> {
    const id = v4(v4());
    const order = {
      ...data,
      id,
      status: 'inProgress',
    };
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `insert into orders (id, user_id, cart_id, payment, delivery, comments, status, total) values ($1, $2, $3, $4, $5, $6, $7, $8);`,
        [
          order.id,
          order.userId,
          order.cartId,
          JSON.stringify(order.payment),
          JSON.stringify(order.address),
          order.comments,
          order.status,
          order.total,
        ],
      );
      await client.query(
        `update carts
       set "status" = 'ORDERED', "updated_at" = current_date
       where carts.user_id = $1 and carts.status = 'OPEN'`,
        [order.userId],
      );
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    return order;
  }

  update(orderId, data) {
    const order = this.findById(orderId);

    if (!order) {
      throw new Error('Order does not exist.');
    }

    this.orders[orderId] = {
      ...data,
      id: orderId,
    };
  }
}
