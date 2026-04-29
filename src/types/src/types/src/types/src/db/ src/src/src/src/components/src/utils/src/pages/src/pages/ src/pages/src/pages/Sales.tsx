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
    setItems([...items, { productId: 0, quantity: 0, pricePerKg: 0 }])
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index))
  }

  function updateItem(index: number, field: string, value: number) {
    const updated = items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    )
    setItems(updated)
  }

  function calcTotal() {
    return items.reduce((acc, item) => acc + item.quantity * item.pricePerKg, 0)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (items.length === 0) {
      toast.error('Adicione pelo menos um item à venda.')
      return
    }

    const saleItems: SaleItem[] = items.map(item => {
      const product = products?.find(p => p.id === item.productId)
      return {
        productId: item.productId,
        productName: product?.name ?? 'Produto',
        quantity: item.quantity,
        pricePerKg: item.pricePerKg,
        total: item.quantity * item.pricePerKg
      }
    })

    const sale: Omit<Sale, 'id'> = {
      date,
      items: saleItems,
      total: calcTotal(),
      paymentMethod,
      customerId: customerId || undefined
    }

    await db.sales.add(sale as Sale)
    toast.success('Venda registrada com sucesso!')
    setShowForm(false)
    setItems([])
    setCustomerId(0)
    setPaymentMethod('dinheiro')
    setDate(new Date().toISOString().split('T')[0])
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Vendas</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700"
        >
          <Plus size={16} /> Nova Venda
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white shadow rounded p-4 mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Data</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="border rounded px-3 py-2 w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Cliente (opcional)</label>
            <select
              value={customerId}
              onChange={e => setCustomerId(Number(e.target.value))}
              className="border rounded px-3 py-2 w-full"
            >
              <option value={0}>Sem cliente</option>
              {customers?.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">Itens</label>
              <button
                type="button"
                onClick={addItem}
                className="text-sm text-green-600 hover:underline flex items-center gap-1"
              >
                <Plus size={14} /> Adicionar item
              </button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="flex gap-2 mb-2 items-center">
                <select
                  value={item.productId}
                  onChange={e => updateItem(index, 'productId', Number(e.target.value))}
                  className="border rounded px-2 py-1 flex-1"
                  required
                >
                  <option value={0}>Selecione</option>
                  {products?.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Kg"
                  value={item.quantity || ''}
                  onChange={e => updateItem(index, 'quantity', parseFloat(e.target.value))}
                  className="border rounded px-2 py-1 w-20"
                  step="0.01"
                  min="0"
                  required
                />
                <input
                  type="number"
                  placeholder="R$/Kg"
                  value={item.pricePerKg || ''}
                  onChange={e => updateItem(index, 'pricePerKg', parseFloat(e.target.value))}
                  className="border rounded px-2 py-1 w-24"
                  step="0.01"
                  min="0"
                  required
                />
                <button type="button" onClick={() => removeItem(index)}>
                  <X size={16} className="text-red-500" />
                </button>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Pagamento</label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
              className="border rounded px-3 py-2 w-full"
            >
              {Object.entries(paymentLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-between items-center">
            <span className="font-semibold">Total: {formatCurrency(calcTotal())}</span>
            <button
              type="submit"
              className="flex items-center gap-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              <Check size={16} /> Confirmar Venda
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {sales?.map(sale => (
          <div key={sale.id} className="bg-white shadow rounded p-4">
            <div
              className="flex justify-between items-center cursor-pointer"
              onClick={() => setExpandedId(expandedId === sale.id ? null : sale.id ?? null)}
            >
              <div>
                <p className="font-medium">{formatDate(sale.date)}</p>
                <p className="text-sm text-gray-500">{paymentLabels[sale.paymentMethod]}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-green-700">{formatCurrency(sale.total)}</span>
                {expandedId === sale.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>

            {expandedId === sale.id && (
              <div className="mt-3 border-t pt-3 text-sm space-y-1">
                {sale.items.map((item, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{item.productName} — {item.quantity}kg × {formatCurrency(item.pricePerKg)}/kg</span>
                    <span>{formatCurrency(item.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
