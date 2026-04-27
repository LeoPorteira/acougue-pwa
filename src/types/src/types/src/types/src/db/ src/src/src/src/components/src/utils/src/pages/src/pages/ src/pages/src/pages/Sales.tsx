import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { Sale, SaleItem, PaymentMethod } from '../types'
import { formatCurrency, formatDate } from '../utils/formatters'
import { useState } from 'react'
import { Plus, X, Check, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

const paymentLabels: Record<PaymentMethod, string> = {
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
  pix: 'PIX',
  fiado: 'Fiado'
}

export default function Sales() {
  const sales = useLiveQuery(() =>
    db.sales.orderBy('date').reverse().limit(30).toArray()
  )

  const products = useLiveQuery(() =>
    db.products.filter(p => p.type !== 'materia-prima').toArray()
  )

  const customers = useLiveQuery(() => db.customers.orderBy('name').toArray())

  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [items, setItems] = useState<{ productId: number; quantity: number; pricePerKg: number }[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro')
  const [customerId, setCustomerId] = useState<number>(0)

  function addItem() {
    setItems([...items, { productId: 0, quantity: 0, price

