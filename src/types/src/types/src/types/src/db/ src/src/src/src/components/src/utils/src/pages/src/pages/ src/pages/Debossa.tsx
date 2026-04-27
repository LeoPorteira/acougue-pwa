import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { Debossa as DebossaType, DebossaItem } from '../types'
import { formatCurrency, formatWeight, formatPercent, calcSuggestedPrice, formatDate } from '../utils/formatters'
import { useState } from 'react'
import { Plus, X, Check, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Debossa() {
  const debossas = useLiveQuery(() =>
    db.debossas.orderBy('date').reverse().limit(20).toArray()
  )

  const rawMaterials = useLiveQuery(() =>
    db.products.where('type').equals('materia-prima').toArray()
  )

  const cutProducts = useLiveQuery(() =>
    db.products.filter(p => p.type === 'corte' || p.type === 'processado').toArray()
  )

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // Step 1
  const [originId, setOriginId] = useState<number>(0)
  const [usedWeight, setUsedWeight] = useState<number>(0)
  const [costPerKg, setCostPerKg] = useState<number>(0)
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])

  // Step 2
  const [items, setItems] = useState<{ productId: number; weight: number }[]>([])
  const [boneWeight, setBoneWeight] = useState<number>(0)
  const [fatWeight, setFatWeight] = useState<number>(0)

  function startNew() {
    setStep(1)
    setOriginId(0)
    setUsedWeight(0)
    setCostPerKg(0)
    setDate(new Date().toISOString().split('T')[0])
    setItems([])
    setBoneWeight(0)
    setFatWeight(0)
    setShowForm(true)
  }

  function addItem() {
    setItems([...items, { productId: 0, weight: 0 }])
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx))
  }

  function updateItem(idx: number, field: 'productId' | 'weight', value: number) {
    const updated = [...items]
    updated[idx] = { ...updated[idx], [field]: value }
    setItems(updated)
  }

  const totalCost = usedWeight * costPerKg
  const totalSellableWeight = items.reduce((s, i) => s + i.weight, 0)
  const lossWeight = usedWeight - totalSellableWeight - boneWeight - fatWeight
  const yieldPercent = usedWeight > 0 ? (totalSellableWeight / usedWeight) * 100 : 0

  async function saveDebossa() {
    if (!originId) return toast.error('Selecione a matéria-prima')
    if (usedWeight <= 0) return toast.error('Informe o peso utilizado')
    if (items.length === 0) return toast.error('Adicione pelo menos um corte')
    if (items.some(i => !i.productId || i.weight <= 0)) return toast.error('Preencha todos os cortes')

    const origin = rawMaterials?.find(p => p.id === originId)
    if (!origin) return

    // Calcular custo por corte (rateio pelo peso)
    const debossaItems: DebossaItem[] = await Promise.all(
      items.map(async (item) => {
        const product = cutProducts?.find(p => p.id === item.productId)
        const proportion = totalSellableWeight > 0 ? item.weight / totalSellableWeight : 0
        const itemTotalCost = proportion * totalCost
        const itemCostPerKg = item.weight > 0 ? itemTotalCost / item.weight : 0
        const suggestedPrice = calcSuggestedPrice(itemCostPerKg, product?.desiredMargin || 30)
        return {
          productId: item.productId,
          productName: product?.name || '',
          weight: item.weight,
          costPerKg: itemCostPerKg,
          totalCost: itemTotalCost,
          suggestedPrice
        }
      })
    )

    const debossa: DebossaType = {
      date: new Date(date),
      originProductId: originId,
      originProductName: origin.name,
      usedWeight,
      costPerKg,
      totalCost,
      items: debossaItems,
      boneWeight,
      fatWeight,
      lossWeight,
      yieldPercent,
      createdAt: new Date()
    }

    await db.debossas.add(debossa)

    // Baixar estoque de matéria-prima
    if (origin.id) {
      await db.products.update(origin.id, {
        currentStock: Math.max(0, origin.currentStock - usedWeight)
      })
    }

    // Adicionar estoque dos cortes e atualizar preço
    for (const item of debossaItems) {
      const product = cutProducts?.find(p => p.id === item.productId)
      if (product?.id) {
        await db.products.update(product.id, {
          currentStock: product.currentStock + item.weight,
          currentPrice: item.suggestedPrice
        })
      }
    }

    // Registrar no fluxo de caixa como custo
    await db.cashFlows.add({
      date: new Date(date),
      type: 'saida',
      category: 'desossa',
      description: `Desossa: ${origin.name} - ${formatWeight(usedWeight)}`,
      amount: 0,
      createdAt: new Date()
    })

    toast.success('Desossa registrada!')
    setShowForm(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Desossa</h1>
        <button onClick={startNew} className="btn-primary flex items-center gap-1 text-sm">
          <Plus size={16} /> Nova
        </button>
      </div>

      {/* Histórico */}
      <div className="space-y-2">
        {debossas?.map(d => (
          <div key={d.id} className="card">
            <div
              className="flex justify-between items-start cursor-pointer"
              onClick={() => setExpandedId(expandedId === d.id ? null : d.id!)}
            >
              <div>
                <div className="font-medium">{d.originProductName}</div>
                <div className="text-xs text-gray-500">
                  {formatDate(d.date)} · {formatWeight(d.usedWeight)} · Rendimento: {formatPercent(d.yieldPercent)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">{formatCurrency(d.totalCost)}</span>
                {expandedId === d.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>

            {expandedId === d.id && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 mb-2">
                  <div>Osso: {formatWeight(d.boneWeight)}</div>
                  <div>Sebo: {formatWeight(d.fatWeight)}</div>
                  <div>Perda: {formatWeight(d.lossWeight)}</div>
                </div>
                <div className="space-y-1">
                  {d.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm bg-gray-50 rounded p-2">
                      <span>{item.productName}</span>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">{formatWeight(item.weight)}</div>
                        <div className="font-medium">{formatCurrency(item.suggestedPrice)}/kg</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {debossas?.length === 0 && (
          <div className="text-center text-gray-400 py-8">Nenhuma desossa registrada</div>
        )}
      </div>

      {/* Modal nova desossa */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-4 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">Nova Desossa</h2>
              <button onClick={() => setShowForm(false)}><X size={24} /></button>
            </div>

            {/* Step 1 */}
            <div className="space-y-3 mb-4">
              <h3 className="font-semibold text-gray-700 border-b pb-1">1. Matéria-prima</h3>
              <div>
                <label className="label">Data</label>
                <input type="date" className="input" value={date}
                  onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <label className="label">Produto de origem</label>
                <select className="input" value={originId}
                  onChange={e => setOriginId(Number(e.target.value))}>
                  <option value={0}>Selecione...</option>
                  {rawMaterials?.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (estoque: {formatWeight(p.currentStock)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Peso utilizado (kg)</label>
                  <input type="number" className="input" value={usedWeight || ''}
                    onChange={e => setUsedWeight(Number(e.target.value))} min={0} step={0.1} />
                </div>
                <div>
                  <label className="label">Custo por kg (R$)</label>
                  <input type="number" className="input" value={costPerKg || ''}
                    onChange={e => setCostPerKg(Number(e.target.value))} min={0} step={0.01} />
                </div>
              </div>
              <div className="bg-gray-50 rounded p-2 text-sm">
                <span className="text-gray-600">Custo total: </span>
                <span className="font-bold">{formatCurrency(totalCost)}</span>
              </div>
            </div>

            {/* Step 2 - Cortes */}
            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center border-b pb-1">
                <h3 className="font-semibold text-gray-700">2. Cortes obtidos</h3>
                <button onClick={addItem} className="text-primary-700 text-sm font-medium flex items-center gap-1">
                  <Plus size={14} /> Adicionar
                </button>
              </div>

              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="label">Corte</label>
                    <select className="input" value={item.productId}
                      onChange={e => updateItem(idx, 'productId', Number(e.target.value))}>
                      <option value={0}>Selecione...</option>
                      {cutProducts?.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="label">Peso (kg)</label>
                    <input type="number" className="input" value={item.weight || ''}
                      onChange={e => updateItem(idx, 'weight', Number(e.target.value))}
                      min={0} step={0.1} />
                  </div>
                  <button onClick={() => removeItem(idx)} className="mb-2 text-red-500">
                    <X size={16} />
                  </button>
                </div>
              ))}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Osso (kg)</label>
                  <input type="number" className="input" value={boneWeight || ''}
                    onChange={e => setBoneWeight(Number(e.target.value))} min={0} step={0.1} />
                </div>
                <div>
                  <label className="label">Sebo/Aparas (kg)</label>
                  <input type="number" className="input" value={fatWeight || ''}
                    onChange={e => setFatWeight(Number(e.target.value))} min={0} step={0.1} />
                </div>
              </div>
            </div>

            {/* Step 3 - Resumo */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-1 text-sm">
              <h3 className="font-semibold text-gray-700 mb-2">3. Resumo e Precificação</h3>
              <div className="flex justify-between">
                <span className="text-gray-600">Peso total utilizado:</span>
                <span>{formatWeight(usedWeight)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total vendável:</span>
                <span>{formatWeight(totalSellableWeight)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Rendimento:</span>
                <span className={yieldPercent > 70 ? 'text-green-600 font-medium' : 'text-yellow-600 font-medium'}>
                  {formatPercent(yieldPercent)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Perda total:</span>
                <span className="text-red-600">{formatWeight(lossWeight < 0 ? 0 : lossWeight)}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                {items.map((item, idx) => {
                  const product = cutProducts?.find(p => p.id === item.productId)
                  const proportion = totalSellableWeight > 0 ? item.weight / totalSellableWeight : 0
                  const itemCost = proportion * totalCost
                  const costKg = item.weight > 0 ? itemCost / item.weight : 0
                  const suggested = calcSuggestedPrice(costKg, product?.desiredMargin || 30)
                  return (
                    <div key={idx} className="flex justify-between py-0.5">
                      <span className="text-gray-700">{product?.name || '-'}</span>
                      <div className="text-right">
                        <span className="text-xs text-gray-500 mr-2">custo {formatCurrency(costKg)}/kg</span>
                        <span className="font-semibold text-green-700">{formatCurrency(suggested)}/kg</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={saveDebossa} className="btn-primary flex-1 flex items-center justify-center gap-1">
                <Check size={16} /> Confirmar Desossa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
