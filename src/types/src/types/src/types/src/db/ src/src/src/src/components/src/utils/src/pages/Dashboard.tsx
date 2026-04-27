import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { formatCurrency, formatWeight, todayStart, todayEnd } from '../utils/formatters'
import {
  TrendingUp, TrendingDown, Package,
  AlertTriangle, Scissors, ShoppingCart
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { startOfWeek, eachDayOfInterval, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function Dashboard() {
  const today = todayStart()
  const todayE = todayEnd()

  const todaySales = useLiveQuery(() =>
    db.cashFlows
      .where('date').between(today, todayE)
      .and(c => c.type === 'entrada' && c.category === 'venda')
      .toArray()
  )

  const todayExpenses = useLiveQuery(() =>
    db.cashFlows
      .where('date').between(today, todayE)
      .and(c => c.type === 'saida')
      .toArray()
  )

  const lowStockProducts = useLiveQuery(() =>
    db.products
      .filter(p => p.currentStock <= p.minStock && p.type !== 'materia-prima')
      .toArray()
  )

  const recentBreaks = useLiveQuery(() =>
    db.stockBreaks.orderBy('date').reverse().limit(3).toArray()
  )

  const weekStart = startOfWeek(new Date(), { locale: ptBR })
  const weekDays = eachDayOfInterval({ start: weekStart, end: new Date() })

  const weekSales = useLiveQuery(async () => {
    const data = await Promise.all(weekDays.map(async day => {
      const start = new Date(day); start.setHours(0, 0, 0, 0)
      const end = new Date(day); end.setHours(23, 59, 59, 999)
      const flows = await db.cashFlows
        .where('date').between(start, end)
        .and(c => c.type === 'entrada' && c.category === 'venda')
        .toArray()
      return {
        day: format(day, 'EEE', { locale: ptBR }),
        total: flows.reduce((s, f) => s + f.amount, 0)
      }
    }))
    return data
  })

  const totalSales = todaySales?.reduce((s, c) => s + c.amount, 0) ?? 0
  const totalExpenses = todayExpenses?.reduce((s, c) => s + c.amount, 0) ?? 0
  const balance = totalSales - totalExpenses

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">Resumo do Dia</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <TrendingUp size={18} />
            <span className="text-xs font-medium">Vendas Hoje</span>
          </div>
          <div className="text-xl font-bold text-gray-900">{formatCurrency(totalSales)}</div>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 text-red-600 mb-1">
            <TrendingDown size={18} />
            <span className="text-xs font-medium">Saídas Hoje</span>
          </div>
          <div className="text-xl font-bold text-gray-900">{formatCurrency(totalExpenses)}</div>
        </div>
        <div className="card col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Saldo do Dia</div>
              <div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(balance)}
              </div>
            </div>
            <div className={`text-4xl ${balance >= 0 ? '📈' : '📉'}`} />
          </div>
        </div>
      </div>

      {/* Gráfico semanal */}
      {weekSales && weekSales.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-700 mb-3">Vendas da Semana</h2>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={weekSales}>
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `R$${v}`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="total" fill="#b91c1c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Alertas de estoque */}
      {lowStockProducts && lowStockProducts.length > 0 && (
        <div className="card border-yellow-200 bg-yellow-50">
          <div className="flex items-center gap-2 text-yellow-700 mb-2">
            <AlertTriangle size={18} />
            <span className="font-semibold text-sm">Estoque Baixo</span>
          </div>
          <div className="space-y-1">
            {lowStockProducts.map(p => (
              <div key={p.id} className="flex justify-between text-sm">
                <span className="text-gray-700">{p.name}</span>
                <span className="badge-yellow">{formatWeight(p.currentStock)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quebras recentes */}
      {recentBreaks && recentBreaks.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <AlertTriangle size={18} />
            <span className="font-semibold text-sm">Últimas Quebras</span>
          </div>
          <div className="space-y-1">
            {recentBreaks.map(b => (
              <div key={b.id} className="flex justify-between text-sm">
                <span className="text-gray-700">{b.productName}</span>
                <span className="badge-red">{formatWeight(b.quantity)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Atalhos rápidos */}
      <div className="card">
        <h2 className="font-semibold text-gray-700 mb-3">Ações Rápidas</h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            { href: '/sales', icon: ShoppingCart, label: 'Nova Venda' },
            { href: '/debossa', icon: Scissors, label: 'Desossa' },
            { href: '/breaks', icon: AlertTriangle, label: 'Quebra' },
          ].map(({ href, icon: Icon, label }) => (
            <a
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 p-3 bg-gray-50 rounded-lg
                         hover:bg-primary-50 hover:text-primary-700 transition-colors text-gray-600"
            >
              <Icon size={22} />
              <span className="text-xs font-medium text-center">{label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
