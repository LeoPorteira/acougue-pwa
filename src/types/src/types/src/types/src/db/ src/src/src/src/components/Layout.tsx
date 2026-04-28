import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, ShoppingCart, Scissors,
  Store, Wallet, AlertTriangle, BarChart3,
  Truck, Users, Menu, X, Beef
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/products', icon: Package, label: 'Produtos' },
  { to: '/purchases', icon: ShoppingCart, label: 'Compras' },
  { to: '/debossa', icon: Scissors, label: 'Desossa' },
  { to: '/standard-cuts', icon: Beef, label: 'Cortes Padrão' },
  { to: '/sales', icon: Store, label: 'Vendas' },
  { to: '/cashflow', icon: Wallet, label: 'Caixa' },
  { to: '/breaks', icon: AlertTriangle, label: 'Quebras' },
  { to: '/reports', icon: BarChart3, label: 'Relatórios' },
  { to: '/suppliers', icon: Truck, label: 'Fornecedores' },
  { to: '/customers', icon: Users, label: 'Clientes' },
]

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  const currentPage = navItems.find(n => location.pathname.startsWith(n.to))?.label || 'Açougue Manager'

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-primary-700 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 rounded-lg hover:bg-primary-600 transition-colors"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <span className="font-bold text-lg">🥩 {currentPage}</span>
        </div>
      </header>

      {/* Sidebar overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-50
        transform transition-transform duration-300
        ${menuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="bg-primary-700 text-white p-4 pt-6">
          <div className="text-xl font-bold">🥩 Açougue Manager</div>
          <div className="text-primary-200 text-sm mt-1">Gestão completa</div>
        </div>
        <nav className="p-3 overflow-y-auto h-full pb-20">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-3 rounded-lg mb-1
                transition-colors font-medium text-sm
                ${isActive
                  ? 'bg-primary-50 text-primary-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Bottom navigation (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 md:hidden">
        <div className="flex overflow-x-auto">
          {navItems.slice(0, 5).map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `
                flex flex-col items-center py-2 px-3 flex-1 min-w-0
                text-xs transition-colors
                ${isActive ? 'text-primary-700' : 'text-gray-500'}
              `}
            >
              <Icon size={20} />
              <span className="mt-0.5 truncate">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 p-4 pb-20 max-w-2xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  )
}
