import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Purchases from './pages/Purchases'
import Debossa from './pages/Debossa'
import Sales from './pages/Sales'
import CashFlowPage from './pages/CashFlow'
import StockBreaks from './pages/StockBreaks'
import Reports from './pages/Reports'
import Suppliers from './pages/Suppliers'
import Customers from './pages/Customers'
import StandardCutsPage from './pages/StandardCuts'

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="purchases" element={<Purchases />} />
          <Route path="debossa" element={<Debossa />} />
          <Route path="sales" element={<Sales />} />
          <Route path="cashflow" element={<CashFlowPage />} />
          <Route path="breaks" element={<StockBreaks />} />
          <Route path="reports" element={<Reports />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="customers" element={<Customers />} />
          <Route path="standard-cuts" element={<StandardCutsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
