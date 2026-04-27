export type ProductType = 'materia-prima' | 'corte' | 'processado'
export type PaymentMethod = 'dinheiro' | 'cartao' | 'pix' | 'fiado'
export type BreakReason = 'vencimento' | 'contaminacao' | 'erro-corte' | 'extravio' | 'outro'
export type TransactionType = 'entrada' | 'saida'

export interface Product {
  id?: number
  name: string
  type: ProductType
  category: string
  unit: string
  originProductId?: number
  desiredMargin: number
  currentPrice: number
  currentStock: number
  minStock: number
  createdAt: Date
}

export interface Purchase {
  id?: number
  supplierId: number
  productId: number
  date: Date
  quantity: number
  pricePerKg: number
  totalCost: number
  paymentMethod: PaymentMethod
  installments: number
  dueDate: Date
  paid: boolean
  notes: string
  createdAt: Date
}

export interface DebossaItem {
  productId: number
  productName: string
  weight: number
  costPerKg: number
  totalCost: number
  suggestedPrice: number
}

export interface Debossa {
  id?: number
  date: Date
  originProductId: number
  originProductName: string
  usedWeight: number
  costPerKg: number
  totalCost: number
  items: DebossaItem[]
  boneWeight: number
  fatWeight: number
  lossWeight: number
  yieldPercent: number
  createdAt: Date
}

export interface SaleItem {
  productId: number
  productName: string
  quantity: number
  pricePerKg: number
  total: number
}

export interface Sale {
  id?: number
  date: Date
  customerId?: number
  items: SaleItem[]
  total: number
  paymentMethod: PaymentMethod
  received: boolean
  createdAt: Date
}

export interface CashFlow {
  id?: number
  date: Date
  type: TransactionType
  category: string
  description: string
  amount: number
  referenceId?: number
  referenceType?: string
  createdAt: Date
}

export interface StockBreak {
  id?: number
  date: Date
  productId: number
  productName: string
  quantity: number
  reason: BreakReason
  notes: string
  cost: number
  createdAt: Date
}

export interface Supplier {
  id?: number
  name: string
  phone: string
  email: string
  notes: string
  createdAt: Date
}

export interface Customer {
  id?: number
  name: string
  phone: string
  totalDebt: number
  createdAt: Date
}
