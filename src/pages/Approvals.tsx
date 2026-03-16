import { useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useBudget } from '@/contexts/BudgetContext'
import { formatCurrency, getMonthName, getCurrentMonth, getCurrentYear } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import type { BudgetApproval } from '@/types'

export function Approvals() {
  const {
    budgets, categories, approvals, selectedBudgetId, setSelectedBudgetId,
    addApproval, updateApproval, deleteApproval,
    getCategorySpent,
  } = useBudget()

  const [month, setMonth] = useState(getCurrentMonth())
  const [year, setYear] = useState(getCurrentYear())
  const [open, setOpen] = useState(false)
  const [editApproval, setEditApproval] = useState<BudgetApproval | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    category_id: '',
    amount: '',
    description: '',
    month: getCurrentMonth(),
    year: getCurrentYear(),
  })

  const budgetCats = categories.filter(c => c.budget_id === selectedBudgetId)
  const monthlyApprovals = approvals.filter(
    a => a.approval_month === month && a.approval_year === year && budgetCats.some(c => c.id === a.category_id)
  )
  const totalMonthlyApproved = monthlyApprovals.reduce((s, a) => s + Number(a.amount), 0)

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  function openAdd() {
    setEditApproval(null)
    setForm({ category_id: '', amount: '', description: '', month, year })
    setOpen(true)
  }

  function openEdit(approval: BudgetApproval) {
    setEditApproval(approval)
    setForm({
      category_id: approval.category_id,
      amount: String(approval.amount),
      description: approval.description ?? '',
      month: approval.approval_month,
      year: approval.approval_year,
    })
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedBudgetId || !form.category_id) return
    setSaving(true)
    if (editApproval) {
      const { error } = await updateApproval(editApproval.id, {
        category_id: form.category_id,
        amount: parseFloat(form.amount) || 0,
        description: form.description || null,
        approval_month: form.month,
        approval_year: form.year,
      })
      if (error) toast.error(error.message)
      else { toast.success('Approval updated'); setOpen(false) }
    } else {
      const { error } = await addApproval({
        budget_id: selectedBudgetId,
        category_id: form.category_id,
        amount: parseFloat(form.amount) || 0,
        description: form.description || null,
        approval_month: form.month,
        approval_year: form.year,
      })
      if (error) toast.error(error.message)
      else { toast.success('Approval added'); setOpen(false) }
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const { error } = await deleteApproval(id)
    if (error) toast.error(error.message)
    else { toast.success('Approval deleted'); setDeleteConfirm(null) }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Budget Approvals</h1>
          <p className="text-muted-foreground text-sm">Manage monthly budget approvals per category</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedBudgetId ?? ''} onValueChange={setSelectedBudgetId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select company" />
            </SelectTrigger>
            <SelectContent>
              {budgets.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={openAdd} disabled={!selectedBudgetId}>
            <Plus className="mr-2 h-4 w-4" /> Add Approval
          </Button>
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
        <Button variant="ghost" size="icon" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <p className="font-semibold text-foreground">{getMonthName(month)} {year}</p>
          <p className="text-sm text-muted-foreground">Total Approved: <span className="text-success font-semibold">{formatCurrency(totalMonthlyApproved)}</span></p>
        </div>
        <Button variant="ghost" size="icon" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {!selectedBudgetId ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground rounded-xl border border-border bg-card">
          <p>Select a company budget to view approvals</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Category approval cards */}
          {budgetCats.map(cat => {
            const catApprovals = monthlyApprovals.filter(a => a.category_id === cat.id)
            const totalApproved = catApprovals.reduce((s, a) => s + Number(a.amount), 0)
            const spent = getCategorySpent(cat.id)

            // Only show categories with approvals or all?
            return (
              <div key={cat.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <h3 className="font-semibold text-foreground">{cat.name}</h3>
                  <div className="ml-auto flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">Budget: <span className="text-foreground font-medium">{formatCurrency(cat.budget_amount)}</span></span>
                    <span className="text-muted-foreground">Approved: <span className="text-success font-medium">{formatCurrency(totalApproved)}</span></span>
                    <span className="text-muted-foreground">Spent: <span className="text-warning font-medium">{formatCurrency(spent)}</span></span>
                  </div>
                </div>

                {catApprovals.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No approvals for this month</p>
                ) : (
                  <div className="space-y-2">
                    {catApprovals.map(approval => (
                      <div key={approval.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium text-foreground">{formatCurrency(approval.amount)}</p>
                          {approval.description && <p className="text-xs text-muted-foreground">{approval.description}</p>}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(approval)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(approval.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {/* Approvals table */}
          {monthlyApprovals.length > 0 && (
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">All Approvals — {getMonthName(month)} {year}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Category</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Amount</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Description</th>
                      <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyApprovals.map(approval => {
                      const cat = categories.find(c => c.id === approval.category_id)
                      return (
                        <tr key={approval.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-3">
                            {cat && (
                              <div className="flex items-center gap-2">
                                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                                <span className="text-sm font-medium text-foreground">{cat.name}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-success">{formatCurrency(approval.amount)}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{approval.description ?? '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(approval)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(approval.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {budgetCats.length === 0 && (
            <div className="flex items-center justify-center h-32 text-muted-foreground rounded-xl border border-border bg-card">
              <p className="text-sm">No categories found. Add categories first.</p>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={v => !v && setOpen(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editApproval ? 'Edit Approval' : 'Add Approval'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {budgetCats.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" min="0" step="0.01" required />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Q1 materials budget" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={String(form.month)} onValueChange={v => setForm(f => ({ ...f, month: parseInt(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{getMonthName(i + 1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: parseInt(e.target.value) }))} min="2020" max="2030" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !form.category_id}>{saving ? 'Saving...' : editApproval ? 'Update' : 'Add Approval'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={v => !v && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Approval?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently remove this approval record.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
