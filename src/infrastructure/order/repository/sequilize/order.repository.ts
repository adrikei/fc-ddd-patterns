import Order from '../../../../domain/checkout/entity/order'
import OrderItem from '../../../../domain/checkout/entity/order_item'
import OrderRepositoryInterface from '../../../../domain/checkout/repository/order-repository.interface'
import OrderItemModel from './order-item.model'
import OrderModel from './order.model'

export default class OrderRepository implements OrderRepositoryInterface {
  async create(entity: Order): Promise<void> {
    await OrderModel.create(
      {
        id: entity.id,
        customer_id: entity.customerId,
        total: entity.total(),
        items: entity.items.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          product_id: item.productId,
          quantity: item.quantity,
        })),
      },
      {
        include: [{ model: OrderItemModel }],
      }
    )
  }

  async update(entity: Order): Promise<void> {
    const transaction = await OrderModel.sequelize.transaction()
    try {
      await OrderModel.update(
        {
          customer_id: entity.customerId,
          total: entity.total(),
        },
        {
          where: {
            id: entity.id,
          },
        }
      )
      entity.items.forEach(async (itemEntity: OrderItem) => {
        await OrderItemModel.update(
          {
            product_id: itemEntity.productId,
            quantity: itemEntity.quantity,
            name: itemEntity.name,
            price: itemEntity.price,
          },
          {
            where: {
              id: itemEntity.id,
            },
          }
        )
      })
      transaction.commit()
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  }

  async find(id: string): Promise<Order> {
    let orderModel
    try {
      orderModel = await OrderModel.findOne({
        where: { id },
        include: ['items'],
        rejectOnEmpty: true,
      })
    } catch (error) {
      throw new Error('Order not found')
    }

    const orderItems = orderModel.items.map(
      (item: OrderItemModel) =>
        new OrderItem(
          item.id,
          item.name,
          item.price,
          item.product_id,
          item.quantity
        )
    )
    return new Order(orderModel.id, orderModel.customer_id, orderItems)
  }

  //findAll
  async findAll(): Promise<Order[]> {
    const orderModels = await OrderModel.findAll({
      include: ['items'],
    })
    return orderModels.map((order) => {
      const orderItems = order.items.map(
        (item: OrderItemModel) =>
          new OrderItem(
            item.id,
            item.name,
            item.price,
            item.product_id,
            item.quantity
          )
      )
      return new Order(order.id, order.customer_id, orderItems)
    })
  }
}
