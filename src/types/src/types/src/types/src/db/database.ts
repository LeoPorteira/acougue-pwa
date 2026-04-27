import Dexie, { Table } from 'dexie'
import {
  Product, Purchase, Debossa, Sale,
  CashFlow, StockBreak, Supplier, Customer
} from '../types'

export class AcougueDatabase extends Dexie {
  products!: Table<Product>
  purchases!: Table<Purchase>
  debossas!: Table<Debossa>
  sales!: Table<Sale>
  cashFlows!: Table<CashFlow>
  stockBreaks!: Table<StockBreak>
  suppliers!: Table<Supplier>
  customers!: Table<Customer>

  constructor() {
    super('AcougueDB')
    this.version(1).stores({
      products: '++id, name, type, category',
      purchases: '++id, supplierId, productId, date, paid',
      debossas: '++id, date, originProductId',
      sales: '++id, date, customerId, paymentMethod, received',
      cashFlows: '++id, date, type, category',
      stockBreaks: '++id, date, productId',
      suppliers: '++id, name',
      customers: '++id, name'
    })
  }
}

export const db = new AcougueDatabase()

// Seed inicial com alguns produtos padrão
export async function seedDatabase() {
  const count = await db.products.count()
  if (count > 0) return

  const defaultSupplier: Supplier = {
    name: 'Fornecedor Padrão',
    phone: '',
    email: '',
    notes: '',
    createdAt: new Date()
  }
  await db.suppliers.add(defaultSupplier)

  const defaultProducts: Product[] = [
    {
      name: 'Traseiro Bovino',
      type: 'materia-prima',
      category: 'bovino',
      unit: 'kg',
      desiredMargin: 0,
      currentPrice: 0,
      currentStock: 0,
      minStock: 10,
      createdAt: new Date()
    },
    {
      name: 'Dianteiro Bovino',
      type: 'materia-prima',
      category: 'bovino',
      unit: 'kg',
      desiredMargin: 0,
      currentPrice: 0,
      currentStock: 0,
      minStock: 10,
      createdAt: new Date()
    },
    {
      name: 'Picanha',
      type: 'corte',
      category: 'bovino',
      unit: 'kg',
      desiredMargin: 40,
      currentPrice: 0,
      currentStock: 0,
      minStock: 2,
      createdAt: new Date()
    },
    {
      name: 'Alcatra',
      type: 'corte',
      category: 'bovino',
      unit: 'kg',
      desiredMargin: 35,
      currentPrice: 0,
      currentStock: 0,
      minStock: 2,
      createdAt: new Date()
    },
    {
      name: 'Contrafilé',
      type: 'corte',
      category: 'bovino',
      unit: 'kg',
      desiredMargin: 35,
      currentPrice: 0,
      currentStock: 0,
      minStock: 2,
      createdAt: new Date()
    },
    {
      name: 'Coxão Duro',
      type: 'corte',
      category: 'bovino',
      unit: 'kg',
      desiredMargin: 30,
      currentPrice: 0,
      currentStock: 0,
      minStock: 2,
      createdAt: new Date()
    },
    {
      name: 'Coxão Mole',
      type: 'corte',
      category: 'bovino',
      unit: 'kg',
      desiredMargin: 30,
      currentPrice: 0,
      currentStock: 0,
      minStock: 2,
      createdAt: new Date()
    },
    {
      name: 'Patinho',
      type: 'corte',
      category: 'bovino',
      unit: 'kg',
      desiredMargin: 30,
      currentPrice: 0,
      currentStock: 0,
      minStock: 2,
      createdAt: new Date()
    },
    {
      name: 'Acém',
      type: 'corte',
      category: 'bovino',
      unit: 'kg',
      desiredMargin: 30,
      currentPrice: 0,
      currentStock: 0,
      minStock: 2,
      createdAt: new Date()
    },
    {
      name: 'Carne Moída',
      type: 'processado',
      category: 'bovino',
      unit: 'kg',
      desiredMargin: 35,
      currentPrice: 0,
      currentStock: 0,
      minStock: 3,
      createdAt: new Date()
    },
  ]

  await db.products.bulkAdd(defaultProducts)
}
