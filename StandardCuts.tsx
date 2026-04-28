import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { StandardCut, CarcassType, CutTemplate } from '../types'
import { useState } from 'react'
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react'
import toast from 'react-hot-toast'

const carcassLabels: Record<CarcassType, string> = {
  'traseiro': 'Traseiro',
  'dianteiro': 'Dianteiro',
  'carcaca-completa': 'Carcaça Completa'
}

const templateLabels: Record<CutTemplate, string> = {
  'serrote': 'Corte Serrote',
  'normal': 'Corte Normal'
}

const emptyForm: Omit<StandardCut, 'id'> = {
  name: '',
  carcassType: 'traseiro',
  cutTemplate: 'serrote',
  defaultPercentage: 0,
  category: 'bovino'
}

export default function StandardCuts() {
  const allCuts = useLiveQuery(() =>
    db.standardCuts.orderBy('name').toArray()
  )

  const [filterCarcass, setFilterCarcass] = useState<CarcassType | 'todos'>('todos')
  const [filterTemplate, setFilterTemplate] = useState<CutTemplate | 'todos'>('todos')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<StandardCut | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [showImportModal, setShowImportModal] = useState(false)

  const filtered = allCuts?.filter(c => {
    const matchCarcass = filterCarcass === 'todos' || c.carcassType === filterCarcass
    const matchTemplate = filterTemplate === 'todos' || c.cutTemplate === filterTemplate
    return matchCarcass && matchTemplate
  })

  // Agrupar por tipo de carcaça + template
  const grouped = filtered?.reduce((acc, cut) => {
    const key = `${carcassLabels[cut.carcassType]} — ${templateLabels[cut.cutTemplate]}`
    if (!acc[key]) acc[key] = []
    acc[key].push(cut)
    return acc
  }, {} as Record<string, StandardCut[]>)

  // Somar percentuais por grupo
  const groupTotals = grouped
    ? Object.fromEntries(
        Object.entries(grouped).map(([key, cuts]) => [
          key,
          cuts.reduce((s, c) => s + c.defaultPercentage, 0)
        ])
      )
    : {}

  function openNew() {
    setForm(emptyForm)
    setEditing(null)
    setShowForm(true)
  }

  function openEdit(cut: StandardCut) {
    setForm({ ...cut })
    setEditing(cut)
    setShowForm(true)
  }

  async function save() {
    if (!form.name.trim()) return toast.error('Nome do corte obrigatório')
    if (form.defaultPercentage <= 0) return toast.error('Percentual deve ser maior que zero')
    if (form.defaultPercentage > 100) return toast.error('Percentual não pode ultrapassar 100%')

    if (editing?.id) {
      await db.standardCuts.update(editing.id, { ...form })
      toast.success('Corte atualizado!')
    } else {
      await db.standardCuts.add({ ...form })
      toast.success('Corte cadastrado!')
    }
    setShowForm(false)
  }

  async function remove(id: number, name: string) {
    if (!confirm(`Excluir o corte "${name}"?`)) return
    await db.standardCuts.delete(id)
    toast.success('Corte removido!')
  }

  // Edição rápida de percentual inline
  async function updatePercentageInline(cut: StandardCut, value: number) {
    if (!cut.id) return
    if (value <= 0 || value > 100) return
    await db.standardCuts.update(cut.id, { defaultPercentage: value })
    toast.success(`${cut.name} atualizado para ${value}%`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Cortes Padrão</h1>
        <button onClick={openNew} className="btn-primary flex items-center gap-1 text-sm">
          <Plus size={16} /> Novo corte
        </button>
      </div>

      {/* Explicação */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
        Os percentuais abaixo são usados na desossa para calcular automaticamente
        o peso esperado de cada corte. Ajuste de acordo com o rendimento real
        do seu açougue.
      </div>

      {/* Filtros */}
      <div className="space-y-2">
        <div>
          <label className="label text-xs">Tipo de carcaça</label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(['todos', 'traseiro', 'dianteiro', 'carcaca-completa'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilterCarcass(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors
                  ${filterCarcass === f
                    ? 'bg-primary-700 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                {f === 'todos' ? 'Todos' : carcassLabels[f]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label text-xs">Template de corte</label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(['todos', 'serrote', 'normal'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilterTemplate(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors
                  ${filterTemplate === f
                    ? 'bg-primary-700 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                {f === 'todos' ? 'Todos' : templateLabels[f]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista agrupada */}
      {grouped && Object.entries(grouped).map(([group, cuts]) => {
        const total = groupTotals[group] || 0
        const isOver = total > 100
        const isUnder = total < 100

        return (
          <div key={group} className="card space-y-2">
            {/* Cabeçalho do grupo */}
            <div className="flex justify-between items-center border-b pb-2">
              <div>
                <div className="font-semibold text-sm text-gray-800">{group}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {cuts.length} cortes cadastrados
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${
                  isOver ? 'text-red-600' :
                  isUnder ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {total.toFixed(1)}%
                </div>
                <div className="text-[10px] text-gray-500">
                  {isOver ? '⚠️ acima de 100%' :
                   isUnder ? `faltam ${(100 - total).toFixed(1)}%` :
                   '✅ total ok'}
                </div>
              </div>
            </div>

            {/* Cortes do grupo */}
            {cuts
              .sort((a, b) => b.defaultPercentage - a.defaultPercentage)
              .map(cut => (
                <div key={cut.id} className="flex items-center gap-2">
                  {/* Barra visual */}
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-sm text-gray-800">{cut.name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(cut)}
                          className="p-1 text-gray-400 hover:text-primary-700 transition-colors"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => remove(cut.id!, cut.name)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            cut.defaultPercentage > 15 ? 'bg-primary-700' :
                            cut.defaultPercentage > 8 ? 'bg-primary-500' :
                            'bg-primary-300'
                          }`}
                          style={{ width: `${Math.min(cut.defaultPercentage, 100)}%` }}
                        />
                      </div>
                      {/* Campo de percentual editável inline */}
                      <div className="flex items-center gap-1 w-20">
                        <input
                          type="number"
                          className="input text-center text-xs py-0.5 px-1 w-14"
                          defaultValue={cut.defaultPercentage}
                          min={0.1}
                          max={100}
                          step={0.1}
                          onBlur={e => {
                            const val = parseFloat(e.target.value)
                            if (val !== cut.defaultPercentage) {
                              updatePercentageInline(cut, val)
                            }
                          }}
                        />
                        <span className="text-xs text-gray-500">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

            {/* Dica se total diferente de 100% */}
            {(isOver || isUnder) && (
              <div className={`text-xs p-2 rounded ${
                isOver ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
              }`}>
                {isOver
                  ? `Total ${total.toFixed(1)}% — reduza algum corte para fechar em 100%.`
                  : `Total ${total.toFixed(1)}% — os ${(100 - total).toFixed(1)}% restantes serão computados como perda/osso/sebo na desossa.`
                }
              </div>
            )}
          </div>
        )
      })}

      {filtered?.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          Nenhum corte cadastrado para este filtro.
        </div>
      )}

      {/* Modal formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">
                {editing ? 'Editar Corte' : 'Novo Corte Padrão'}
              </h2>
              <button onClick={() => setShowForm(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label">Nome do corte *</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Picanha"
                />
              </div>

              <div>
                <label className="label">Tipo de carcaça</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['traseiro', 'dianteiro', 'carcaca-completa'] as CarcassType[]).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, carcassType: t })}
                      className={`py-2 px-2 rounded-lg text-xs font-medium border transition-colors
                        ${form.carcassType === t
                          ? 'bg-primary-700 text-white border-primary-700'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
                        }`}
                    >
                      {carcassLabels[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Template de corte</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['serrote', 'normal'] as CutTemplate[]).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, cutTemplate: t })}
                      className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors
                        ${form.cutTemplate === t
                          ? 'bg-primary-700 text-white border-primary-700'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
                        }`}
                    >
                      {templateLabels[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">
                  Percentual padrão (%)
                  <span className="text-gray-400 font-normal ml-1 text-xs">
                    — rendimento esperado deste corte
                  </span>
                </label>
                <input
                  type="number"
                  className="input"
                  value={form.defaultPercentage || ''}
                  onChange={e => setForm({ ...form, defaultPercentage: parseFloat(e.target.value) })}
                  min={0.1}
                  max={100}
                  step={0.1}
                  placeholder="Ex: 4.5"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Exemplo: se uma carcaça de 100kg normalmente rende 4kg de Picanha, coloque 4%.
                </p>
              </div>

              <div>
                <label className="label">Categoria</label>
                <select
                  className="input"
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                >
                  <option value="bovino">Bovino</option>
                  <option value="suino">Suíno</option>
                  <option value="frango">Frango</option>
                  <option value="ovino">Ovino</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">
                Cancelar
              </button>
              <button onClick={save} className="btn-primary flex-1 flex items-center justify-center gap-1">
                <Check size={16} /> Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
