import { useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { useBudget } from '@/contexts/BudgetContext'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { FilePreviewDialog } from '@/components/FilePreviewDialog'
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, FileText, LayoutDashboard, FolderKanban } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { ChangeOrder } from '@/types'

interface COFormState {
  description: string
  amount: string
  order_date: string
  file: File | null
}

export function Companies() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const {
    budgets, categories, changeOrders, approvals,
    addBudget, updateBudget, deleteBudget,
    addChangeOrder, updateChangeOrder, deleteChangeOrder,
    getCategorySpent, setSelectedBudgetId,
  } = useBudget()

  const [addOpen, setAddOpen] = useState(false)
  const [editBudget, setEditBudget] = useState<{ id: string; name: string; base_amount: string } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', base_amount: '' })
  const [saving, setSaving] = useState(false)

  // Change orders
  const [coOpen, setCoOpen] = useState<string | null>(null) // budget id
  const [expandedCOs, setExpandedCOs] = useState<Set<string>>(new Set())
  const [coForm, setCoForm] = useState<COFormState>({ description: '', amount: '', order_date: new Date().toISOString().split('T')[0], file: null })
  const [editCO, setEditCO] = useState<ChangeOrder | null>(null)
  const [savingCO, setSavingCO] = useState(false)

  // File preview
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null)

  async function handleAddBudget(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await addBudget(form.name, parseFloat(form.base_amount) || 0)
    setSaving(false)
    if (error) toast.error(error.message)
    else { toast.success('Budget created'); setAddOpen(false); setForm({ name: '', base_amount: '' }) }
  }

  async function handleEditBudget(e: React.FormEvent) {
    e.preventDefault()
    if (!editBudget) return
    setSaving(true)
    const { error } = await updateBudget(editBudget.id, { name: editBudget.name, base_amount: parseFloat(editBudget.base_amount) || 0 })
    setSaving(false)
    if (error) toast.error(error.message)
    else { toast.success('Budget updated'); setEditBudget(null) }
  }

  async function handleDeleteBudget(id: string) {
    const { error } = await deleteBudget(id)
    if (error) toast.error(error.message)
    else { toast.success('Budget deleted'); setDeleteConfirm(null) }
  }

  async function handleAddCO(budgetId: string) {
    if (!user) return
    setSavingCO(true)
    let fileUrl: string | null = null
    let fileName: string | null = null

    if (coForm.file) {
      const path = `${user.id}/${Date.now()}-${coForm.file.name}`
      const { error: uploadErr } = await supabase.storage.from('change-order-files').upload(path, coForm.file)
      if (!uploadErr) {
        const { data } = supabase.storage.from('change-order-files').getPublicUrl(path)
        fileUrl = data.publicUrl
        fileName = coForm.file.name
      }
    }

    if (editCO) {
      const updates: Partial<ChangeOrder> = {
        description: coForm.description,
        amount: parseFloat(coForm.amount) || 0,
        order_date: coForm.order_date,
      }
      if (fileUrl) { updates.file_url = fileUrl; updates.file_name = fileName }
      const { error } = await updateChangeOrder(editCO.id, updates)
      if (error) toast.error(error.message)
      else toast.success('Change order updated')
      setEditCO(null)
    } else {
      const { error } = await addChangeOrder({
        budget_id: budgetId,
        category_id: null,
        description: coForm.description,
        amount: parseFloat(coForm.amount) || 0,
        order_date: coForm.order_date,
        file_url: fileUrl,
        file_name: fileName,
      })
      if (error) toast.error(error.message)
      else toast.success('Change order added')
    }
    setSavingCO(false)
    setCoForm({ description: '', amount: '', order_date: new Date().toISOString().split('T')[0], file: null })
    setCoOpen(null)
  }

  async function handleDeleteCO(id: string) {
    const { error } = await deleteChangeOrder(id)
    if (error) toast.error(error.message)
    else toast.success('Change order deleted')
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Companies Budget</h1>
          <p className="text-muted-foreground text-sm">Manage your company budgets</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Budget
        </Button>
      </div>

      {budgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground rounded-xl border border-border bg-card">
          <p className="text-lg">No budgets yet</p>
          <p className="text-sm mt-1">Create your first company budget to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {budgets.map((budget, i) => {
            const budgetCats = categories.filter(c => c.budget_id === budget.id)
            const budgetCOs = changeOrders.filter(co => co.budget_id === budget.id && !co.category_id)
            const totalCOs = budgetCOs.reduce((s, co) => s + Number(co.amount), 0)
            const adjustedBudget = Number(budget.base_amount) + totalCOs
            const totalAllocated = budgetCats.reduce((s, c) => s + Number(c.budget_amount), 0)
            const totalSpent = budgetCats.reduce((s, c) => s + getCategorySpent(c.id), 0)

            // Monthly approved (current month)
            const now = new Date()
            const monthlyApproved = approvals
              .filter(a => a.budget_id === budget.id && a.approval_month === now.getMonth() + 1 && a.approval_year === now.getFullYear())
              .reduce((s, a) => s + Number(a.amount), 0)

            const remaining = adjustedBudget - totalSpent
            const expanded = expandedCOs.has(budget.id)

            return (
              <motion.div
                key={budget.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">{budget.name}</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Created {formatDate(budget.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedBudgetId(budget.id); navigate('/dashboard') }} title="Dashboard">
                        <LayoutDashboard className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedBudgetId(budget.id); navigate('/categories') }} title="Categories">
                        <FolderKanban className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setEditBudget({ id: budget.id, name: budget.name, base_amount: String(budget.base_amount) })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(budget.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
                    {[
                      { label: 'Categories', value: budgetCats.length.toString() },
                      { label: 'Base Budget', value: formatCurrency(budget.base_amount) },
                      { label: 'Change Orders', value: formatCurrency(totalCOs), color: totalCOs >= 0 ? 'text-success' : 'text-destructive' },
                      { label: 'Adjusted Budget', value: formatCurrency(adjustedBudget), color: 'text-primary' },
                      { label: 'Total Spent', value: formatCurrency(totalSpent), color: 'text-warning' },
                      { label: 'Remaining', value: formatCurrency(remaining), color: remaining >= 0 ? 'text-success' : 'text-destructive' },
                    ].map(s => (
                      <div key={s.label} className="rounded-lg bg-muted/50 p-3">
                        <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                        <p className={`font-semibold ${s.color ?? 'text-foreground'}`}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 rounded-lg bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Monthly Approved ({new Date().toLocaleString('en-US', { month: 'long' })} {new Date().getFullYear()})
                    </p>
                    <p className="text-sm font-semibold text-success">{formatCurrency(monthlyApproved)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Allocated: {formatCurrency(totalAllocated)}</p>
                  </div>

                  {/* Change orders section */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setExpandedCOs(prev => {
                          const next = new Set(prev)
                          if (next.has(budget.id)) next.delete(budget.id)
                          else next.add(budget.id)
                          return next
                        })}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        Change Orders ({budgetCOs.length})
                      </button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => {
                        setCoOpen(budget.id)
                        setEditCO(null)
                        setCoForm({ description: '', amount: '', order_date: new Date().toISOString().split('T')[0], file: null })
                      }}>
                        <Plus className="mr-1 h-3 w-3" /> Add CO
                      </Button>
                    </div>
                    {expanded && budgetCOs.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {budgetCOs.map(co => (
                          <div key={co.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground truncate">{co.description}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(co.order_date)}</p>
                            </div>
                            <div className="flex items-center gap-2 ml-3">
                              <span className={`font-semibold text-sm ${Number(co.amount) >= 0 ? 'text-success' : 'text-destructive'}`}>
                                {Number(co.amount) >= 0 ? '+' : ''}{formatCurrency(co.amount)}
                              </span>
                              {co.file_url && (
                                <Button variant="ghost" size="icon" className="h-6 w-6"
                                  onClick={() => setPreviewFile({ url: co.file_url!, name: co.file_name! })}>
                                  <FileText className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                                setEditCO(co)
                                setCoForm({ description: co.description, amount: String(co.amount), order_date: co.order_date, file: null })
                                setCoOpen(budget.id)
                              }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleDeleteCO(co.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Add Budget Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Company Budget</DialogTitle></DialogHeader>
          <form onSubmit={handleAddBudget} className="space-y-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. DEL's Construction Budget" required />
            </div>
            <div className="space-y-2">
              <Label>Base Budget Amount</Label>
              <Input type="number" value={form.base_amount} onChange={e => setForm(f => ({ ...f, base_amount: e.target.value }))} placeholder="0.00" min="0" step="0.01" required />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Budget'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Budget Dialog */}
      <Dialog open={!!editBudget} onOpenChange={v => !v && setEditBudget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Budget</DialogTitle></DialogHeader>
          {editBudget && (
            <form onSubmit={handleEditBudget} className="space-y-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input value={editBudget.name} onChange={e => setEditBudget(eb => eb ? { ...eb, name: e.target.value } : null)} required />
              </div>
              <div className="space-y-2">
                <Label>Base Budget Amount</Label>
                <Input type="number" value={editBudget.base_amount} onChange={e => setEditBudget(eb => eb ? { ...eb, base_amount: e.target.value } : null)} min="0" step="0.01" required />
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setEditBudget(null)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={v => !v && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Budget?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently delete the budget and all its categories, invoices, and change orders.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDeleteBudget(deleteConfirm)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit CO Dialog */}
      <Dialog open={!!coOpen} onOpenChange={v => !v && setCoOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editCO ? 'Edit Change Order' : 'Add Change Order'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={coForm.description} onChange={e => setCoForm(f => ({ ...f, description: e.target.value }))} placeholder="Change order description" required />
            </div>
            <div className="space-y-2">
              <Label>Amount (use negative for reductions)</Label>
              <Input type="number" value={coForm.amount} onChange={e => setCoForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" step="0.01" />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={coForm.order_date} onChange={e => setCoForm(f => ({ ...f, order_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Attachment (optional)</Label>
              <Input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e => setCoForm(f => ({ ...f, file: e.target.files?.[0] ?? null }))} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCoOpen(null)}>Cancel</Button>
              <Button onClick={() => coOpen && handleAddCO(coOpen)} disabled={savingCO}>
                {savingCO ? 'Saving...' : editCO ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* File Preview */}
      <FilePreviewDialog
        open={!!previewFile}
        onOpenChange={v => !v && setPreviewFile(null)}
        fileUrl={previewFile?.url ?? null}
        fileName={previewFile?.name ?? null}
      />
    </motion.div>
  )
}
