import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import {
  Debossa as DebossaType,
  DebossaItem,
  CarcassTemplate,
  StandardCut,
  CarcassType,
  CutTemplate
} from '../types'
import {
  formatCurrency,
  formatWeight,
  formatPercent,
  calcSuggestedPrice,
  formatDate
} from '../utils/formatters'
import { useEffect, useState } from 'react'
import {
  Plus, X, Check, ChevronDown, ChevronUp,
  Beef, Scissors
} from 'lucide-react'
import toast from 'react-hot-toast'

type Step = 1 | 2 | 3 | 4

interface ItemState {
  productId: number
  weight: number
  expectedWeight: number
}

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

  const carcassTemplates = useLiveQuery(() =>
    db.carcassTemplates.toArray()
  )

  const standardCuts = useLiveQuery(() =>
    db.standardCuts.toArray()
  )

  const [step, setStep] = useState<Step>(1)
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // Dados principais
  const [originId, setOriginId] = useState<number>(0)
  const [carcassType, setCarcassType] = useState<CarcassType>('traseiro')
  const [cutTemplate, setCutTemplate] = useState<CutTemplate>('serrote')
  const [templateId, setTemplateId] = useState<number | null>(null)

  const [usedWeight, setUsedWeight] = useState<number>(0)
  const [costPerKg, setCostPerKg] = useState<number>(0)
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])

  const [items, setItems] = useState<ItemState[]>([])
  const [boneWeight, setBoneWeight] = useState<number>(0)
  const [fatWeight, setFatWeight] = useState<number>(0)

  function startNew() {
    setStep(1)
    setOriginId(0)
    setCarcassType('traseiro')
    setCutTemplate('serrote')
    setTemplateId(null)
    setUsedWeight(0)
    setCostPerKg(0)
    setDate(new Date().toISOString().split('T')[0])
    setItems([])
    setBoneWeight(0)
    setFatWeight(0)
    setShowForm(true)
  }

  const totalCost = usedWeight * costPerKg
  const totalSellableWeight = items.reduce((s, i) => s + i.weight, 0)
  const lossWeight = usedWeight - totalSellableWeight - boneWeight - fatWeight
  const yieldPercent = usedWeight > 0 ? (totalSellableWeight / usedWeight) * 100 : 0

  // Quando escolhe matéria-prima, definimos o tipo de carcaça
  useEffect(() => {
    if (!originId || !rawMaterials) return
    const origin = rawMaterials.find(p => p.id === originId)
    if (!origin) return

    if (origin.name.toLowerCase().includes('carcaça')) {
      setCarcassType('carcaca-completa')
    } else if (origin.name.toLowerCase().includes('traseiro')) {
      setCarcassType('traseiro')
    } else if (origin.name.toLowerCase().includes('dianteiro')) {
      setCarcassType('dianteiro')
    }
  }, [originId, rawMaterials])

  // Quando escolhe tipo de corte ou tipo de carcaça, escolhe automaticamente um template compatível
  useEffect(() => {
    if (!carcassTemplates || !carcassType || !cutTemplate) return
    const tpl = carcassTemplates.find(t =>
      t.carcassType === carcassType && t.cutTemplate === cutTemplate
    )
    setTemplateId(tpl?.id ?? null)
  }, [carcassType, cutTemplate, carcassTemplates])

  // Quando temos peso usado + template definido, preenchermos itens com base nos percentuais padrão
  useEffect(() => {
    if (!templateId || !standardCuts || usedWeight <= 0) return

    const template = carcassTemplates?.find(t => t.id === templateId)
    if (!template) return

    // Se carcaça completa: metade peso traseiro + metade dianteiro (2 traseiros + 2 dianteiros)
    const parts: { type: CarcassType; weight: number }[] = []

    if (template.carcassType === 'carcaca-completa') {
      // Supondo carcaça completa com 2 traseiros e 2 dianteiros -> 50/50
      parts.push({ type: 'traseiro', weight: usedWeight * 0.5 })
      parts.push({ type: 'dianteiro', weight: usedWeight * 0.5 })
    } else {
      parts.push({ type: template.carcassType, weight: usedWeight })
    }

    const newItems: ItemState[] = []

    for (const part of parts) {
      const cutsForPart = standardCuts.filter(
        c => c.carcassType === part.type && c.cutTemplate === template.cutTemplate
      )
      for (const sc of cutsForPart) {
        // Encontrar produto correspondente
        const product = cutProducts?.find(p => p.name.toLowerCase() === sc.name.toLowerCase())
        if (!product) continue

        const expWeight = part.weight * (sc.defaultPercentage / 100)

        const existing = newItems.find(i => i.productId === product.id)
        if (existing) {
          existing.weight += expWeight
          existing.expectedWeight += expWeight
        } else {
          newItems.push({
            productId: product.id!,
            weight: expWeight,
            expectedWeight: expWeight
          })
        }
      }
    }

    setItems(newItems)
  }, [templateId, standardCuts, carcassTemplates, usedWeight, cutProducts])

  function updateItem(idx: number, field: 'weight', value: number) {
    const updated = [...items]
    updated[idx] = { ...updated[idx], [field]: value }
    setItems(updated)
  }

  async function saveDebossa() {
    if (!originId) return toast.error('Selecione a matéria-prima')
    if (usedWeight <= 0) return toast.error('Informe o peso utilizado')
    if (items.length === 0) return toast.error('Não há cortes calculados para esta combinação')

    const origin = rawMaterials?.find(p => p.id === originId)
    if (!origin) return

    // Calcular custo por corte (rateio pelo peso real)
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
          expectedWeight: item.expectedWeight,
          costPerKg: itemCostPerKg,
          totalCost: itemTotalCost,
          suggestedPrice
        }
      })
    )

    const debossa: DebossaType = {
      date: new Date(date),
      carcassType,
      cutTemplate,
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

    // Registrar custo no fluxo de caixa (opcional, aqui só registro descritivo)
    await db.cashFlows.add({
      date: new Date(date),
      type: 'saida',
      category: 'desossa',
      description: `Desossa: ${origin.name} - ${formatWeight(usedWeight)}`,
      amount: 0,
      createdAt: new Date()
    })

    toast.success('Desossa registrada com sucesso!')
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
                <div className="mt-1 text-[11px] text-gray-500 uppercase">
                  {d.carcassType === 'carcaca-completa' ? 'Carcaça Completa' :
                    d.carcassType === 'traseiro' ? 'Traseiro' : 'Dianteiro'} ·
                  {' '}
                  {d.cutTemplate === 'serrote' ? 'Corte Serrote' : 'Corte Normal'}
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
                      <div>
                        <div className="font-medium">{item.productName}</div>
                        <div className="text-xs text-gray-500">
                          Esperado: {formatWeight(item.expectedWeight)} · Real: {formatWeight(item.weight)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">{formatCurrency(item.costPerKg)}/kg</div>
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
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Scissors size={20} /> Nova Desossa
              </h2>
              <button onClick={() => setShowForm(false)}><X size={24} /></button>
            </div>

            {/* Steps */}
            <div className="flex justify-between mb-4 text-xs">
              {[
                { stepNum: 1, label: 'Origem' },
                { stepNum: 2, label: 'Tipo de corte' },
                { stepNum: 3, label: 'Resíduos' },
                { stepNum: 4, label: 'Ajustes' }
              ].map(s => (
                <div key={s.stepNum} className="flex-1 flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                    ${step === s.stepNum ? 'bg-primary-700 text-white' :
                      step > s.stepNum ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {step > s.stepNum ? '✓' : s.stepNum}
                  </div>
                  <span className="mt-1">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Step 1 - Origem */}
            {step === 1 && (
              <div className="space-y-3 mb-4">
                <h3 className="font-semibold text-gray-700 border-b pb-1">
                  1. Matéria-prima
                </h3>
                <div>
                  <label className="label">Data</label>
                  <input
                    type="date"
                    className="input"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">Produto de origem</label>
                  <select
                    className="input"
                    value={originId}
                    onChange={e => setOriginId(Number(e.target.value))}
                  >
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
                    <input
                      type="number"
                      className="input"
                      value={usedWeight || ''}
                      onChange={e => setUsedWeight(Number(e.target.value))}
                      min={0}
                      step={0.1}
                    />
                  </div>
                  <div>
                    <label className="label">Custo por kg (R$)</label>
                    <input
                      type="number"
                      className="input"
                      value={costPerKg || ''}
                      onChange={e => setCostPerKg(Number(e.target.value))}
                      min={0}
                      step={0.01}
                    />
                  </div>
                </div>

                <div className="bg-gray-50 rounded p-2 text-sm flex justify-between">
                  <span className="text-gray-600">Custo total:</span>
                  <span className="font-bold">{formatCurrency(totalCost)}</span>
                </div>

                <button
                  onClick={() => {
                    if (!originId || usedWeight <= 0 || costPerKg <= 0) {
                      toast.error('Preencha origem, peso e custo antes de avançar')
                      return
                    }
                    setStep(2)
                  }}
                  className="btn-primary w-full mt-2"
                >
                  Continuar
                </button>
              </div>
            )}

            {/* Step 2 - Tipo de corte */}
            {step === 2 && (
              <div className="space-y-3 mb-4">
                <h3 className="font-semibold text-gray-700 border-b pb-1">
                  2. Tipo de corte
                </h3>

                <div>
                  <label className="label">Tipo de carcaça</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      className={`card text-center py-2 text-xs ${carcassType === 'traseiro' ? 'ring-2 ring-primary-600' : ''}`}
                      onClick={() => setCarcassType('traseiro')}
                    >
                      Traseiro
                    </button>
                    <button
                      type="button"
                      className={`card text-center py-2 text-xs ${carcassType === 'dianteiro' ? 'ring-2 ring-primary-600' : ''}`}
                      onClick={() => setCarcassType('dianteiro')}
                    >
                      Dianteiro
                    </button>
                    <button
                      type="button"
                      className={`card text-center py-2 text-xs ${carcassType === 'carcaca-completa' ? 'ring-2 ring-primary-600' : ''}`}
                      onClick={() => setCarcassType('carcaca-completa')}
                    >
                      Carcaça completa
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label">Template de corte</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className={`card text-center py-2 text-xs ${cutTemplate === 'serrote' ? 'ring-2 ring-primary-600' : ''}`}
                      onClick={() => setCutTemplate('serrote')}
                    >
                      Corte Serrote
                    </button>
                    <button
                      type="button"
                      className={`card text-center py-2 text-xs ${cutTemplate === 'normal' ? 'ring-2 ring-primary-600' : ''}`}
                      onClick={() => setCutTemplate('normal')}
                    >
                      Corte Normal
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <Beef size={14} />
                    <span className="font-semibold">Sugestão:</span>
                  </div>
                  <p className="text-gray-600">
                    O sistema vai calcular automaticamente os pesos dos cortes
                    com base nos percentuais padrão do frigorífico para
                    {carcassType === 'carcaca-completa'
                      ? ' carcaça completa'
                      : carcassType === 'traseiro'
                        ? ' traseiro'
                        : ' dianteiro'} em
                    {' '}{cutTemplate === 'serrote' ? 'Corte Serrote' : 'Corte Normal'}.
                    Depois você poderá ajustar o peso real de cada corte.
                  </p>
                </div>

                <button
                  onClick={() => {
                    if (!templateId) {
                      toast.error('Não há template compatível encontrado')
                      return
                    }
                    if (items.length === 0) {
                      toast.error('Ainda não foi possível calcular os cortes. Verifique peso e tente novamente.')
                      return
                    }
                    setStep(3)
                  }}
                  className="btn-primary w-full mt-2"
                >
                  Continuar
                </button>
              </div>
            )}

            {/* Step 3 - Resíduos */}
            {step === 3 && (
              <div className="space-y-3 mb-4">
                <h3 className="font-semibold text-gray-700 border-b pb-1">
                  3. Osso e sebo
                </h3>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label">Osso (kg)</label>
                    <input
                      type="number"
                      className="input"
                      value={boneWeight || ''}
                      onChange={e => setBoneWeight(Number(e.target.value))}
                      min={0}
                      step={0.1}
                    />
                  </div>
                  <div>
                    <label className="label">Sebo/Aparas (kg)</label>
                    <input
                      type="number"
                      className="input"
                      value={fatWeight || ''}
                      onChange={e => setFatWeight(Number(e.target.value))}
                      min={0}
                      step={0.1}
                    />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Total utilizado:</span>
                    <span>{formatWeight(usedWeight)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total cortes calculados:</span>
                    <span>{formatWeight(totalSellableWeight)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Perdas (aprox.):</span>
                    <span className="text-red-600">
                      {formatWeight(lossWeight < 0 ? 0 : lossWeight)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rendimento:</span>
                    <span className={yieldPercent > 70 ? 'text-green-600 font-semibold' : 'text-yellow-600 font-semibold'}>
                      {formatPercent(yieldPercent)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setStep(4)}
                  className="btn-primary w-full mt-2"
                >
                  Continuar
                </button>
              </div>
            )}

            {/* Step 4 - Ajustes finais */}
            {step === 4 && (
              <div className="space-y-3 mb-4">
                <h3 className="font-semibold text-gray-700 border-b pb-1">
                  4. Ajuste os cortes
                </h3>

                {items.map((item, idx) => {
                  const product = cutProducts?.find(p => p.id === item.productId)
                  const exp = item.expectedWeight || 0
                  const diff = item.weight - exp
                  const diffPercent = exp ? (diff / exp) * 100 : 0

                  return (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded p-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{product?.name}</div>
                        <div className="text-[11px] text-gray-500">
                          Esperado: {formatWeight(exp)}
                        </div>
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          className="input text-center text-xs"
                          value={item.weight || ''}
                          onChange={e => updateItem(idx, 'weight', Number(e.target.value))}
                          min={0}
                          step={0.1}
                        />
                      </div>
                      <div
                        className={`w-16 text-right text-[11px] ${
                          diffPercent > 5 ? 'text-red-600' :
                            diffPercent < -5 ? 'text-yellow-600' : 'text-green-600'
                        }`}
                      >
                        {isNaN(diffPercent) ? '' : `${diffPercent.toFixed(1)}%`}
                      </div>
                    </div>
                  )
                })}

                <div className="bg-white border rounded-lg p-3 text-sm mt-2">
                  <div className="flex justify-between mb-1">
                    <span>Total esperado cortes:</span>
                    <span>
                      {formatWeight(items.reduce((s, i) => s + (i.expectedWeight || 0), 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total real cortes:</span>
                    <span className="font-semibold">
                      {formatWeight(totalSellableWeight)}
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t">
                    <span className="block text-center text-xs text-gray-600">
                      Ajuste os pesos para refletir o que realmente saiu da desossa.
                    </span>
                  </div>
                </div>

                <button
                  onClick={saveDebossa}
                  className="btn-primary w-full flex items-center justify-center gap-1 mt-3"
                >
                  <Check size={16} /> Confirmar Desossa
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
