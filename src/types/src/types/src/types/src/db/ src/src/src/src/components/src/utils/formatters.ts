export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR').format(d)
}

export function formatWeight(value: number): string {
  return `${value.toFixed(3)} kg`
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function calcSuggestedPrice(costPerKg: number, margin: number): number {
  if (margin >= 100) return costPerKg * 2
  return costPerKg / (1 - margin / 100)
}

export function calcMargin(salePrice: number, costPrice: number): number {
  if (salePrice === 0) return 0
  return ((salePrice - costPrice) / salePrice) * 100
}

export function todayStart(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function todayEnd(): Date {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}
