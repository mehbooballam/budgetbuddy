import React, { createContext, useContext, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthContext'
import type {
  Budget,
  Category,
  Invoice,
  InvoiceItem,
  BudgetApproval,
  ChangeOrder,
} from '@/types'

interface BudgetContextType {
  budgets: Budget[]
  categories: Category[]
  invoices: Invoice[]
  invoiceItems: InvoiceItem[]
  approvals: BudgetApproval[]
  changeOrders: ChangeOrder[]
  loading: boolean
  getCategorySpent: (categoryId: string) => number
  getCategoryApproved: (categoryId: string, month?: number, year?: number) => number
  getBudgetChangeOrders: (budgetId: string) => ChangeOrder[]
  selectedBudgetId: string | null
  setSelectedBudgetId: (id: string | null) => void
  fetchBudgets: () => Promise<void>
  fetchCategories: (budgetId: string) => Promise<void>
  fetchInvoices: (budgetId: string) => Promise<void>
  fetchApprovals: (budgetId: string) => Promise<void>
  fetchChangeOrders: (budgetId: string) => Promise<void>
  createBudget: (name: string, baseAmount: number) => Promise<{ data: Budget | null; error: Error | null }>
  updateBudget: (id: string, updates: Partial<Budget>) => Promise<{ error: Error | null }>
  deleteBudget: (id: string) => Promise<{ error: Error | null }>
  createCategory: (budgetId: string, name: string, budgetAmount: number, color: string) => Promise<{ error: Error | null }>
  updateCategory: (id: string, updates: Partial<Category>) => Promise<{ error: Error | null }>
  deleteCategory: (id: string) => Promise<{ error: Error | null }>
  createInvoice: (invoice: Omit<Invoice, 'id' | 'user_id' | 'created_at' | 'updated_at'>, items: Omit<InvoiceItem, 'id' | 'user_id' | 'invoice_id' | 'created_at'>[]) => Promise<{ error: Error | null }>
  deleteInvoice: (id: string) => Promise<{ error: Error | null }>
  createApproval: (approval: Omit<BudgetApproval, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<{ error: Error | null }>
  deleteApproval: (id: string) => Promise<{ error: Error | null }>
  createChangeOrder: (co: Omit<ChangeOrder, 'id' | 'user_id' | 'created_at'>) => Promise<{ error: Error | null }>
  deleteChangeOrder: (id: string) => Promise<{ error: Error | null }>
  // Aliases
  addBudget: (name: string, baseAmount: number) => Promise<{ data: Budget | null; error: Error | null }>
  addCategory: (budgetId: string, name: string, budgetAmount: number, color?: string) => Promise<{ error: Error | null }>
  addChangeOrder: (co: Omit<ChangeOrder, 'id' | 'user_id' | 'created_at'>) => Promise<{ error: Error | null }>
  updateChangeOrder: (id: string, updates: Partial<ChangeOrder>) => Promise<{ error: Error | null }>
  addInvoice: (invoice: Omit<Invoice, 'id' | 'user_id' | 'created_at' | 'updated_at'>, items: Omit<InvoiceItem, 'id' | 'user_id' | 'invoice_id' | 'created_at'>[]) => Promise<{ error: Error | null }>
  updateInvoice: (id: string, updates: Partial<Invoice>, items?: Omit<InvoiceItem, 'id' | 'user_id' | 'invoice_id' | 'created_at'>[]) => Promise<{ error: Error | null }>
  getInvoiceItems: (invoiceId: string) => InvoiceItem[]
  addApproval: (approval: Omit<BudgetApproval, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<{ error: Error | null }>
  updateApproval: (id: string, updates: Partial<BudgetApproval>) => Promise<{ error: Error | null }>
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined)

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([])
  const [approvals, setApprovals] = useState<BudgetApproval[]>([])
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null)

  const fetchBudgets = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setBudgets(data)
        if (data.length > 0 && !selectedBudgetId) {
          setSelectedBudgetId(data[0].id)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [user, selectedBudgetId])

  const fetchCategories = useCallback(async (budgetId: string) => {
    if (!user) return
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('budget_id', budgetId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (!error && data) setCategories(data)
  }, [user])

  const fetchInvoices = useCallback(async (budgetId: string) => {
    if (!user) return
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('budget_id', budgetId)
      .eq('user_id', user.id)
      .order('invoice_date', { ascending: false })

    if (!invoiceError && invoiceData) {
      setInvoices(invoiceData)

      if (invoiceData.length > 0) {
        const invoiceIds = invoiceData.map(inv => inv.id)
        const { data: itemData } = await supabase
          .from('invoice_items')
          .select('*')
          .in('invoice_id', invoiceIds)

        if (itemData) setInvoiceItems(itemData)
      } else {
        setInvoiceItems([])
      }
    }
  }, [user])

  const fetchApprovals = useCallback(async (budgetId: string) => {
    if (!user) return
    const { data, error } = await supabase
      .from('budget_approvals')
      .select('*')
      .eq('budget_id', budgetId)
      .eq('user_id', user.id)
      .order('approval_year', { ascending: false })

    if (!error && data) setApprovals(data)
  }, [user])

  const fetchChangeOrders = useCallback(async (budgetId: string) => {
    if (!user) return
    const { data, error } = await supabase
      .from('change_orders')
      .select('*')
      .eq('budget_id', budgetId)
      .eq('user_id', user.id)
      .order('order_date', { ascending: false })

    if (!error && data) setChangeOrders(data)
  }, [user])

  async function createBudget(name: string, baseAmount: number) {
    if (!user) return { data: null, error: new Error('Not authenticated') }
    const { data, error } = await supabase
      .from('budgets')
      .insert({ name, base_amount: baseAmount, user_id: user.id })
      .select()
      .single()

    if (!error && data) {
      setBudgets(prev => [data, ...prev])
      if (!selectedBudgetId) setSelectedBudgetId(data.id)
    }

    return { data: data as Budget | null, error }
  }

  async function updateBudget(id: string, updates: Partial<Budget>) {
    const { error } = await supabase
      .from('budgets')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (!error) {
      setBudgets(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b))
    }

    return { error }
  }

  async function deleteBudget(id: string) {
    const { error } = await supabase.from('budgets').delete().eq('id', id)

    if (!error) {
      setBudgets(prev => prev.filter(b => b.id !== id))
      if (selectedBudgetId === id) {
        const remaining = budgets.filter(b => b.id !== id)
        setSelectedBudgetId(remaining.length > 0 ? remaining[0].id : null)
      }
    }

    return { error }
  }

  async function createCategory(budgetId: string, name: string, budgetAmount: number, color: string) {
    if (!user) return { error: new Error('Not authenticated') }
    const { data, error } = await supabase
      .from('categories')
      .insert({ budget_id: budgetId, user_id: user.id, name, budget_amount: budgetAmount, color })
      .select()
      .single()

    if (!error && data) setCategories(prev => [...prev, data])

    return { error }
  }

  async function updateCategory(id: string, updates: Partial<Category>) {
    const { error } = await supabase
      .from('categories')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (!error) {
      setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
    }

    return { error }
  }

  async function deleteCategory(id: string) {
    const { error } = await supabase.from('categories').delete().eq('id', id)

    if (!error) setCategories(prev => prev.filter(c => c.id !== id))

    return { error }
  }

  async function createInvoice(
    invoice: Omit<Invoice, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
    items: Omit<InvoiceItem, 'id' | 'user_id' | 'invoice_id' | 'created_at'>[]
  ) {
    if (!user) return { error: new Error('Not authenticated') }

    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .insert({ ...invoice, user_id: user.id })
      .select()
      .single()

    if (invoiceError || !invoiceData) return { error: invoiceError }

    if (items.length > 0) {
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(items.map(item => ({
          ...item,
          invoice_id: invoiceData.id,
          user_id: user.id,
        })))

      if (itemsError) return { error: itemsError }
    }

    setInvoices(prev => [invoiceData, ...prev])
    await fetchInvoices(invoice.budget_id)

    return { error: null }
  }

  async function deleteInvoice(id: string) {
    const { error } = await supabase.from('invoices').delete().eq('id', id)

    if (!error) {
      setInvoices(prev => prev.filter(inv => inv.id !== id))
      setInvoiceItems(prev => prev.filter(item => item.invoice_id !== id))
    }

    return { error }
  }

  async function createApproval(approval: Omit<BudgetApproval, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    if (!user) return { error: new Error('Not authenticated') }

    const { data, error } = await supabase
      .from('budget_approvals')
      .insert({ ...approval, user_id: user.id })
      .select()
      .single()

    if (!error && data) setApprovals(prev => [data, ...prev])

    return { error }
  }

  async function deleteApproval(id: string) {
    const { error } = await supabase.from('budget_approvals').delete().eq('id', id)

    if (!error) setApprovals(prev => prev.filter(a => a.id !== id))

    return { error }
  }

  async function createChangeOrder(co: Omit<ChangeOrder, 'id' | 'user_id' | 'created_at'>) {
    if (!user) return { error: new Error('Not authenticated') }

    const { data, error } = await supabase
      .from('change_orders')
      .insert({ ...co, user_id: user.id })
      .select()
      .single()

    if (!error && data) setChangeOrders(prev => [data, ...prev])

    return { error }
  }

  async function deleteChangeOrder(id: string) {
    const { error } = await supabase.from('change_orders').delete().eq('id', id)

    if (!error) setChangeOrders(prev => prev.filter(co => co.id !== id))

    return { error }
  }

  function getCategorySpent(categoryId: string): number {
    return invoiceItems
      .filter(item => item.category_id === categoryId)
      .reduce((sum, item) => sum + Number(item.amount), 0)
  }

  function getCategoryApproved(categoryId: string, month?: number, year?: number): number {
    return approvals
      .filter(a =>
        a.category_id === categoryId &&
        (month === undefined || a.approval_month === month) &&
        (year === undefined || a.approval_year === year)
      )
      .reduce((sum, a) => sum + Number(a.amount), 0)
  }

  function getBudgetChangeOrders(budgetId: string): ChangeOrder[] {
    return changeOrders.filter(co => co.budget_id === budgetId)
  }

  function getInvoiceItems(invoiceId: string): InvoiceItem[] {
    return invoiceItems.filter(item => item.invoice_id === invoiceId)
  }

  async function updateChangeOrder(id: string, updates: Partial<ChangeOrder>) {
    const { error } = await supabase
      .from('change_orders')
      .update(updates)
      .eq('id', id)

    if (!error) {
      setChangeOrders(prev => prev.map(co => co.id === id ? { ...co, ...updates } : co))
    }
    return { error }
  }

  async function updateInvoice(
    id: string,
    updates: Partial<Invoice>,
    items?: Omit<InvoiceItem, 'id' | 'user_id' | 'invoice_id' | 'created_at'>[]
  ) {
    if (!user) return { error: new Error('Not authenticated') }

    const { error } = await supabase
      .from('invoices')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return { error }

    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, ...updates } : inv))

    if (items) {
      await supabase.from('invoice_items').delete().eq('invoice_id', id)
      if (items.length > 0) {
        const { data: newItems } = await supabase
          .from('invoice_items')
          .insert(items.map(item => ({ ...item, invoice_id: id, user_id: user.id })))
          .select()
        if (newItems) {
          setInvoiceItems(prev => [
            ...prev.filter(i => i.invoice_id !== id),
            ...newItems,
          ])
        }
      }
    }

    return { error: null }
  }

  async function updateApproval(id: string, updates: Partial<BudgetApproval>) {
    const { error } = await supabase
      .from('budget_approvals')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (!error) {
      setApprovals(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a))
    }
    return { error }
  }

  return (
    <BudgetContext.Provider value={{
      budgets,
      categories,
      invoices,
      invoiceItems,
      approvals,
      changeOrders,
      loading,
      selectedBudgetId,
      setSelectedBudgetId,
      fetchBudgets,
      fetchCategories,
      fetchInvoices,
      fetchApprovals,
      fetchChangeOrders,
      createBudget,
      updateBudget,
      deleteBudget,
      createCategory,
      updateCategory,
      deleteCategory,
      createInvoice,
      deleteInvoice,
      createApproval,
      deleteApproval,
      createChangeOrder,
      deleteChangeOrder,
      getCategorySpent,
      getCategoryApproved,
      getBudgetChangeOrders,
      addBudget: createBudget,
      addCategory: (budgetId, name, budgetAmount, color = '#6366f1') => createCategory(budgetId, name, budgetAmount, color),
      addChangeOrder: createChangeOrder,
      updateChangeOrder,
      addInvoice: createInvoice,
      updateInvoice,
      getInvoiceItems,
      addApproval: createApproval,
      updateApproval,
    }}>
      {children}
    </BudgetContext.Provider>
  )
}

export function useBudget() {
  const context = useContext(BudgetContext)
  if (context === undefined) {
    throw new Error('useBudget must be used within a BudgetProvider')
  }
  return context
}
