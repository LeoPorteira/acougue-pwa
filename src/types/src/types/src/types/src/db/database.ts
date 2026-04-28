import Dexie, { Table } from 'dexie'
import {
  Product,
  Purchase,
  Debossa,
  Sale,
  CashFlow,
  StockBreak,
  Supplier,
  Customer,
  StandardCut,
  CarcassTemplate,
  CarcassType,
  CutTemplate
} from '../types'

export class AcougueDatabase extends Dexie {
  products!: Table<Product>
  purchases!: Table<Purchase>
  debossas!: Table<Debossa>
  sales!: Table<Sale>
  cashFlows!: Table<CashFlow>
  stockBreaks!: Table<StockBreak>
  suppliers!: Table<Supplier>
  customers!: Table<Customer>

  standardCuts!: Table<StandardCut>
  carcassTemplates!: Table<CarcassTemplate>

  constructor() {
    super('AcougueDB')

    // Versão 1 (tabelas básicas)
    this.version(1).stores({
      products: '++id, name, type, category',
      purchases: '++id, supplierId, productId, date, paid',
      debossas: '++id, date, originProductId',
      sales: '++id, date, customerId, paymentMethod, received',
      cashFlows: '++id, date, type, category',
      stockBreaks: '++id, date, productId',
      suppliers: '++id, name',
      customers: '++id, name'
    })

    // Versão 2 (templates de carcaça e cortes padrão)
    this.version(2).stores({
      products: '++id, name, type, category',
      purchases: '++id, supplierId, productId, date, paid',
      debossas: '++id, date, originProductId',
      sales: '++id, date, customerId, paymentMethod, received',
      cashFlows: '++id, date, type, category',
      stockBreaks: '++id, date, productId',
      suppliers: '++id, name',
      customers: '++id, name',
      standardCuts: '++id, carcassType, cutTemplate, name',
      carcassTemplates: '++id, carcassType, cutTemplate, name'
    }).upgrade(async (tx) => {
      // Nada destrutivo aqui, só garante que as tabelas existam.
      // Os dados iniciais serão preenchidos pelo seedDatabase().
      const standardCutsCount = await tx.table('standardCuts').count()
      if (standardCutsCount === 0) {
        await seedStandardCuts(tx as any)
      }

      const templatesCount = await tx.table('carcassTemplates').count()
      if (templatesCount === 0) {
        await seedCarcassTemplates(tx as any)
      }
    })
  }
}

export const db = new AcougueDatabase()

// Função de seed geral (chamada em main.tsx)
export async function seedDatabase() {
  // Produtos
  const productCount = await db.products.count()
  if (productCount === 0) {
    await seedProducts()
  }

  // Fornecedor padrão
  const supplierCount = await db.suppliers.count()
  if (supplierCount === 0) {
    const defaultSupplier: Supplier = {
      name: 'Fornecedor Padrão',
      phone: '',
      email: '',
      notes: '',
      createdAt: new Date()
    }
    await db.suppliers.add(defaultSupplier)
  }

  // Tabelas de cortes padrão
  const standardCutsCount = await db.standardCuts.count()
  if (standardCutsCount === 0) {
    await seedStandardCuts(db)
  }

  const templatesCount = await db.carcassTemplates.count()
  if (templatesCount === 0) {
    await seedCarcassTemplates(db)
  }
}

/**
 * Produtos base (matéria-prima e cortes principais)
 */
async function seedProducts() {
  const defaultProducts: Product[] = [
    // Matérias-primas
    {
      name: 'Carcaça Bovina Completa',
      type: 'materia-prima',
      category: 'bovino',
      unit: 'kg',
      desiredMargin: 0,
      currentPrice: 0,
      currentStock: 0,
      minStock: 0,
      createdAt: new Date()
    },
    {
      name: 'Traseiro Bovino',
      type: 'materia-prima',
      category: 'bovino',
      unit: 'kg',
      desiredMargin: 0,
      currentPrice: 0,
      currentStock: 0,
      minStock: 0,
      createdAt: new Date()
    },
    {
      name: 'Dianteiro Bovino',
      type: 'materia-prima',
      category: 'bovino',
      unit: 'kg',
      desiredMargin: 0,
      currentPrice: 0,
      currentStock: 0,
      minStock: 0,
      createdAt: new Date()
    },

    // Alguns cortes principais (você pode depois cadastrar mais na tela de Produtos)
    {
      name: 'Picanha',
      type: 'corte',
      category: 'bovino',
      unit: 'kg',
      desiredMargin: 40,
      currentPrice: 0,
      currentStock: 0,
      minStock: 2,
      createdAt: new Date()
    },
    {
      name: 'Alcatra',
      type: 'corte',
      category: 'bovino',
      unit: 'kg',
      desiredMargin: 35,
      currentPrice: 0,
      currentStock: 0,
      minStock: 2,
      createdAt: new Date()
    },
    {
      name: 'Filé Mignon',
      type: 'corte',
      category: 'bovino',
      unit: 'kg',
      desiredMargin: 45,
      currentPrice: 0,
      currentStock: 0,
      minStock: 1,
      createdAt: new Date()
    },
    {
      name: 'Chã de Dentro',
      type: 'corte',
      category: 'bovino',
      unit: 'kg',
      desiredMargin: 30,
      currentPrice: 0,
      currentStock: 0,
      minStock: 2,
      createdAt: new Date()
    },
    {
      name: 'Chã de Fora',
      type: 'corte',
      category: 'bovino',
      unit: 'kg',
      desiredMargin: 30,
      currentPrice: 0,
      currentStock: 0,
      minStock: 2,
      createdAt: new Date()
    },
    {
      name: 'Paulista',
      type: 'corte',
      category: 'bovino',
      unit: 'kg',
      desiredMargin: 30,
      currentPrice: 0,
      currentStock: 0,
      minStock: 2,
      createdAt: new Date()
    },
    {
      name: 'Músculo Tortuguita',
      type: 'corte',
      category: 'bovino',
      unit: 'kg',
      desiredMargin: 28,
      currentPrice: 0,
      currentStock: 0,
      minStock: 1,
      createdAt: new Date()
    },
    {
      name: 'Músculo Traseiro',
      type: 'corte',
      category: 'bovino',
      unit: 'kg',
      desiredMargin: 28,
      currentPrice: 0,
      currentStock: 0,
      minStock: 1,
      createdAt: new Date()
    },
    {
      name: 'Patinho',
      type: 'corte',
      category: 'bovino',
      unit: 'kg',
      desiredMargin: 32,
      currentPrice: 0,
      currentStock: 0,
      minStock: 2,
      createdAt: new Date()
    },
    {
      name: 'Maminha',
      type: 'corte',
      category: 'bovino',
      unit: 'kg',
      desiredMargin: 34,
      currentPrice: 0,
      currentStock: 0,
      minStock: 2,
      createdAt: new Date()
    },
    {
      name: 'Lombo da Agulha',
      type: 'corte',
      category: 'bovino',
      unit: 'kg',
      desiredMargin: 30,
      currentPrice: 0,
      currentStock: 0,
      minStock: 2,
      createdAt: new Date()
    },
    {
      name: 'Contra Filé',
      type: 'corte',
      category: 'bovino',
      unit: 'kg',
      desiredMargin: 35,
      currentPrice: 0,
      currentStock: 0,
      minStock: 2,
      createdAt: new Date()
    },
    {
      name: 'Costela Ponta de Agulha',
      type: 'corte',
      category: 'bovino',
      unit: 'kg',
      desiredMargin: 25,
      currentPrice: 0,
      currentStock: 0,
      minStock: 3,
      createdAt: new Date()
    },
    {
      name: 'Fraldinha',
      type: 'corte',
      category: 'bovino',
      unit: 'kg',
      desiredMargin: 35,
      currentPrice: 0,
      currentStock: 0,
      minStock: 2,
      createdAt: new Date()
    },
    {
      name: 'Acém e Pescoço',
      type: 'corte',
      category: 'bovino',
      unit: 'kg',
      desiredMargin: 25,
      currentPrice: 0,
      currentStock: 0,
      minStock: 3,
      createdAt: new Date()
    },
    {
      name: 'Posta Gorda',
      type: 'corte',
      category: 'bovino',
      unit: 'kg',
      desiredMargin: 28,
      currentPrice: 0,
      currentStock: 0,
      minStock: 2,
      createdAt: new Date()
    },
    {
      name: 'Miolo da Paleta',
      type: 'corte',
      category: 'bovino',
      unit: 'kg',
      desiredMargin: 30,
      currentPrice: 0,
      currentStock: 0,
      minStock: 2,
      createdAt: new Date()
    },
    {
      name: 'Músculo Dianteiro',
      type: 'corte',
      category: 'bovino',
      unit: 'kg',
      desiredMargin: 28,
      currentPrice: 0,
      currentStock: 0,
      minStock: 2,
      createdAt: new Date()
    },
    {
      name: 'Traíra',
      type: 'corte',
      category: 'bovino',
      unit: 'kg',
      desiredMargin: 25,
      currentPrice: 0,
      currentStock: 0,
      minStock: 2,
      createdAt: new Date()
    },
    {
      name: 'Costela Dianteira',
      type: 'corte',
      category: 'bovino',
      unit: 'kg',
      desiredMargin: 24,
      currentPrice: 0,
      currentStock: 0,
      minStock: 3,
      createdAt: new Date()
    }
  ]

  await db.products.bulkAdd(defaultProducts)
}

/**
 * Tabela de cortes padrão com percentual de rendimento por tipo de corte
 * (Serrote / Normal) e tipo de carcaça (traseiro / dianteiro).
 */
async function seedStandardCuts(cx: Dexie | any) {
  const table = cx.table ? cx.table('standardCuts') : db.standardCuts

  const cuts: StandardCut[] = [
    // TRASEIRO - CORTE SERROTE
    { name: 'Alcatra', carcassType: 'traseiro', cutTemplate: 'serrote', defaultPercentage: 8, category: 'bovino' },
    { name: 'Picanha', carcassType: 'traseiro', cutTemplate: 'serrote', defaultPercentage: 4, category: 'bovino' },
    { name: 'Filé Mignon', carcassType: 'traseiro', cutTemplate: 'serrote', defaultPercentage: 3, category: 'bovino' },
    { name: 'Chã de Dentro', carcassType: 'traseiro', cutTemplate: 'serrote', defaultPercentage: 7, category: 'bovino' },
    { name: 'Chã de Fora', carcassType: 'traseiro', cutTemplate: 'serrote', defaultPercentage: 7, category: 'bovino' },
    { name: 'Paulista', carcassType: 'traseiro', cutTemplate: 'serrote', defaultPercentage: 5, category: 'bovino' },
    { name: 'Músculo Tortuguita', carcassType: 'traseiro', cutTemplate: 'serrote', defaultPercentage: 4, category: 'bovino' },
    { name: 'Músculo Traseiro', carcassType: 'traseiro', cutTemplate: 'serrote', defaultPercentage: 5, category: 'bovino' },
    { name: 'Patinho', carcassType: 'traseiro', cutTemplate: 'serrote', defaultPercentage: 10, category: 'bovino' },
    { name: 'Maminha', carcassType: 'traseiro', cutTemplate: 'serrote', defaultPercentage: 4, category: 'bovino' },
    { name: 'Lombo da Agulha', carcassType: 'traseiro', cutTemplate: 'serrote', defaultPercentage: 6, category: 'bovino' },
    { name: 'Contra Filé', carcassType: 'traseiro', cutTemplate: 'serrote', defaultPercentage: 10, category: 'bovino' },
    { name: 'Costela Ponta de Agulha', carcassType: 'traseiro', cutTemplate: 'serrote', defaultPercentage: 12, category: 'bovino' },
    { name: 'Fraldinha', carcassType: 'traseiro', cutTemplate: 'serrote', defaultPercentage: 5, category: 'bovino' },

    // DIANTEIRO - CORTE SERROTE
    { name: 'Acém e Pescoço', carcassType: 'dianteiro', cutTemplate: 'serrote', defaultPercentage: 18, category: 'bovino' },
    { name: 'Posta Gorda', carcassType: 'dianteiro', cutTemplate: 'serrote', defaultPercentage: 8, category: 'bovino' },
    { name: 'Miolo da Paleta', carcassType: 'dianteiro', cutTemplate: 'serrote', defaultPercentage: 7, category: 'bovino' },
    { name: 'Músculo Dianteiro', carcassType: 'dianteiro', cutTemplate: 'serrote', defaultPercentage: 6, category: 'bovino' },
    { name: 'Traíra', carcassType: 'dianteiro', cutTemplate: 'serrote', defaultPercentage: 6, category: 'bovino' },
    { name: 'Costela Dianteira', carcassType: 'dianteiro', cutTemplate: 'serrote', defaultPercentage: 15, category: 'bovino' },

    // TRASEIRO - CORTE NORMAL (sem lombo/contra filé/costela/fraldinha)
    { name: 'Alcatra', carcassType: 'traseiro', cutTemplate: 'normal', defaultPercentage: 9, category: 'bovino' },
    { name: 'Picanha', carcassType: 'traseiro', cutTemplate: 'normal', defaultPercentage: 4, category: 'bovino' },
    { name: 'Filé Mignon', carcassType: 'traseiro', cutTemplate: 'normal', defaultPercentage: 3, category: 'bovino' },
    { name: 'Chã de Dentro', carcassType: 'traseiro', cutTemplate: 'normal', defaultPercentage: 8, category: 'bovino' },
    { name: 'Chã de Fora', carcassType: 'traseiro', cutTemplate: 'normal', defaultPercentage: 8, category: 'bovino' },
    { name: 'Paulista', carcassType: 'traseiro', cutTemplate: 'normal', defaultPercentage: 6, category: 'bovino' },
    { name: 'Músculo Tortuguita', carcassType: 'traseiro', cutTemplate: 'normal', defaultPercentage: 4, category: 'bovino' },
    { name: 'Músculo Traseiro', carcassType: 'traseiro', cutTemplate: 'normal', defaultPercentage: 5, category: 'bovino' },
    { name: 'Patinho', carcassType: 'traseiro', cutTemplate: 'normal', defaultPercentage: 12, category: 'bovino' },
    { name: 'Maminha', carcassType: 'traseiro', cutTemplate: 'normal', defaultPercentage: 5, category: 'bovino' },

    // DIANTEIRO - CORTE NORMAL (inclui lombo, contra filé, costela, fraldinha)
    { name: 'Acém e Pescoço', carcassType: 'dianteiro', cutTemplate: 'normal', defaultPercentage: 16, category: 'bovino' },
    { name: 'Posta Gorda', carcassType: 'dianteiro', cutTemplate: 'normal', defaultPercentage: 8, category: 'bovino' },
    { name: 'Miolo da Paleta', carcassType: 'dianteiro', cutTemplate: 'normal', defaultPercentage: 7, category: 'bovino' },
    { name: 'Músculo Dianteiro', carcassType: 'dianteiro', cutTemplate: 'normal', defaultPercentage: 6, category: 'bovino' },
    { name: 'Traíra', carcassType: 'dianteiro', cutTemplate: 'normal', defaultPercentage: 6, category: 'bovino' },
    { name: 'Lombo da Agulha', carcassType: 'dianteiro', cutTemplate: 'normal', defaultPercentage: 6, category: 'bovino' },
    { name: 'Contra Filé', carcassType: 'dianteiro', cutTemplate: 'normal', defaultPercentage: 6, category: 'bovino' },
    { name: 'Costela Ponta de Agulha', carcassType: 'dianteiro', cutTemplate: 'normal', defaultPercentage: 10, category: 'bovino' },
    { name: 'Fraldinha', carcassType: 'dianteiro', cutTemplate: 'normal', defaultPercentage: 6, category: 'bovino' },
    { name: 'Costela Dianteira', carcassType: 'dianteiro', cutTemplate: 'normal', defaultPercentage: 12, category: 'bovino' },
  ]

  await table.bulkAdd(cuts)
}

/**
 * Templates de carcaça (para facilitar a escolha na desossa)
 * Ex.: Corte Serrote Traseiro/Dianteiro, Corte Normal Traseiro/Dianteiro, Carcaça Completa
 */
async function seedCarcassTemplates(cx: Dexie | any) {
  const table = cx.table ? cx.table('carcassTemplates') : db.carcassTemplates

  const templates: CarcassTemplate[] = [
    {
      name: 'Traseiro - Corte Serrote',
      description: 'Traseiro bovino com cortes no padrão Serrote',
      carcassType: 'traseiro',
      cutTemplate: 'serrote',
      createdAt: new Date()
    },
    {
      name: 'Dianteiro - Corte Serrote',
      description: 'Dianteiro bovino com cortes no padrão Serrote',
      carcassType: 'dianteiro',
      cutTemplate: 'serrote',
      createdAt: new Date()
    },
    {
      name: 'Traseiro - Corte Normal',
      description: 'Traseiro bovino com cortes no padrão Normal',
      carcassType: 'traseiro',
      cutTemplate: 'normal',
      createdAt: new Date()
    },
    {
      name: 'Dianteiro - Corte Normal',
      description: 'Dianteiro bovino com cortes no padrão Normal',
      carcassType: 'dianteiro',
      cutTemplate: 'normal',
      createdAt: new Date()
    },
    {
      name: 'Carcaça Completa - Serrote',
      description: 'Carcaça bovina completa com 2 traseiros e 2 dianteiros (Corte Serrote)',
      carcassType: 'carcaca-completa',
      cutTemplate: 'serrote',
      createdAt: new Date()
    },
    {
      name: 'Carcaça Completa - Normal',
      description: 'Carcaça bovina completa com 2 traseiros e 2 dianteiros (Corte Normal)',
      carcassType: 'carcaca-completa',
      cutTemplate: 'normal',
      createdAt: new Date()
    }
  ]

  await table.bulkAdd(templates)
}
