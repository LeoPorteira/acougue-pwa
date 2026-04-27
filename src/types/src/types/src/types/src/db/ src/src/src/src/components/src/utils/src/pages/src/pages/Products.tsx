import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { Product, ProductType } from '../types'
import { formatCurrency, formatWeight } from '../utils/formatters'
import { useState } from 'react'
import { Plus, Edit2, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'

const productTypeLabel: Record<ProductType, string> = {
  'materia-prima': 'Matéria-prima',
  'corte': 'Corte',
  'processado': 'Processado'
}

const emptyProduct: Omit<Product, 'id' | 'createdAt'> = {
  name: '',
  type: 'corte',
  category: 'bovino',
  unit: 'kg',
  desiredMargin: 30,
  currentPrice: 0,
  currentStock: 0,
  minStock: 2,
}

export default function Products() {
  const products = useLiveQuery(() => db.products.orderBy('name').toArray())
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState(emptyProduct)
  const [filterType, setFilterType] = useState<string>('todos')

  const filtered = products?.filter(p =>
    filterType === 'todos' ? true : p.type === filterType
  )

  function openNew() {
    setForm(emptyProduct)
    setEditing(null)
    setShowForm(true)
  }

  function openEdit(p: Product) {
    setForm({ ...p })
    setEditing(p)
    setShowForm(true)
  }

  async function save() {
    if (!form.name.trim()) return toast.error('Nome obrigatório')
    if (editing?.id) {
      await db.products.update(editing.id, { ...form })
      toast.success('Produto atualizado!')
    } else {
      await db.products.add({ ...form, createdAt: new Date() })
      toast.success('Produto cadastrado!')
    }
    setShowForm(false)
  }

  async function remove(id: number) {
    if (!confirm('Excluir produto?')) return
    await db.products.delete(id)
    toast.success('Removido!')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Produtos</h1>
        <button onClick={openNew} className="btn-primary flex items-center gap-1 text-sm">
          <Plus size={16} /> Novo
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {['todos', 'materia-prima', 'corte', 'processado'].map(f => (
          <button
            key={f}
            onClick={() => setFilterType(f)}
            className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors
              ${filterType === f
                ? 'bg-primary-700 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
          >
            {f === 'todos' ? 'Todos' : productTypeLabel[f as ProductType]}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {filtered?.map(p => (
          <div key={p.id} className="card flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate">{p.name}</div>
              <div className="flex gap-2 mt-1 flex-wrap">
                <span className={`badge-${p.type === 'materia-prima' ? 'yellow' : p.type === 'corte' ? 'green' : 'red'}`}>
                  {productTypeLabel[p.type]}
                </span>
                <span className="text-xs text-gray-500">{p.category}</span>
              </div>
              <div className="flex gap-3 mt-1 text-xs text-gray-600">
                <span>Preço: {formatCurrency(p.currentPrice)}/kg</span>
                <span>Estoque: {formatWeight(p.currentStock)}</span>
                <span>Margem: {p.desiredMargin}%</span>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => openEdit(p)} className="p-2 text-gray-500 hover:text-primary-700">
                <Edit2 size={16} />
              </button>
              <button onClick={() => remove(p.id!)} className="p-2 text-gray-500 hover:text-red-600">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {filtered?.length === 0 && (
          <div className="text-center text-gray-400 py-8">Nenhum produto cadastrado</div>
        )}
      </div>

      {/* Modal formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">
                {editing ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <button onClick={() => setShowForm(false)}><X size={24} /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label">Nome *</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Picanha"
                />
              </div>
              <div>
                <label className="label">Tipo</label>
                <select
                  className="input"
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value as ProductType })}
                >
                  <option value="materia-prima">Matéria-prima</option>
                  <option value="corte">Corte</option>
                  <option value="processado">Processado</option>
                </select>
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
                  <option value="outro">Outro</option>
                </select>
              </div>
              {form.type !== 'materia-prima' && (
                <div>
                  <label className="label">Margem desejada (%)</label>
                  <input
                    type="number"
                    className="input"
                    value={form.desiredMargin}
                    onChange={e => setForm({ ...form, desiredMargin: Number(e.target.value) })}
                    min={0}
                    max={99}
                  />
                </div>
              )}
              <div>
                <label className="label">Estoque mínimo (kg)</label>
                <input
                  type="number"
                  className="input"
                  value={form.minStock}
                  onChange={e => setForm({ ...form, minStock: Number(e.target.value) })}
                  min={0}
                  step={0.1}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">
                Cancelar
              </button>
              <button onClick={save} className="btn-primary flex-1">
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
