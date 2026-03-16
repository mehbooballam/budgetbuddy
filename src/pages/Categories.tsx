import { useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useBudget } from '@/contexts/BudgetContext'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { FilePreviewDialog } from '@/components/FilePreviewDialog'
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, FileText } from 'lucide-react'
import type { Category, ChangeOrder } from '@/types'

export function Categories() {
  const { user } = useAuth()
  const {
    budgets, categories, changeOrders, selectedBudgetId, setSelectedBudgetId,
    addCategory, updateCategory, deleteCategory,
    addChangeOrder, deleteChangeOrder,
    getCategorySpent,
  } = useBudget()

  const [addOpen, setAddOpen] = useState(false)
  const [editCat, setEditCat] = useState<Category | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', budget_amount: '' })
  const [saving, setSaving] = useState(false)

  const [coOpen, setCoOpen] = useState<string | null>(null) // category id
  const [expandedCOs, setExpandedCOs] = useState<Set<string>>(new Set())
  const [coForm, setCoForm] = useState({ description: '', amount: '', order_date: new Date().toISOString().split('T')[0], file: null as File | null })
  const [savingCO, setSavingCO] = useState(false)

  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null)

  const budgetCats = categories.filter(c => c.budget_id === selectedBudgetId)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedBudgetId) return
    setSaving(true)
    const { error } = await addCategory(selectedBudgetId, form.name, parseFloat(form.budget_amount) || 0)
    setSaving(false)
    if (error) toast.error(error.message)
    else { toast.success('Category added'); setAddOpen(false); setForm({ name: '', budget_amount: '' }) }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editCat) return
    setSaving(true)
    const { error } = await updateCategory(editCat.id, { name: editCat.name, budget_amount: editCat.budget_amount })
    setSaving(false)
    if (error) toast.error(error.message)
    else { toast.success('Category updated'); setEditCat(null) }
  }

  async function handleDelete(id: string) {
    const { error } = await deleteCategory(id)
    if (error) toast.error(error.message)
    else { toast.success('Category deleted'); setDeleteConfirm(null) }
  }

  async function handleAddCO(categoryId: string) {
    if (!user || !selectedBudgetId) return
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

    const { error } = await addChangeOrder({
      budget_id: selectedBudgetId,
      category_id: categoryId,
      description: coForm.description,
      amount: parseFloat(coForm.amount) || 0,
      order_date: coForm.order_date,
      file_url: fileUrl,
      file_name: fileName,
    })
    setSavingCO(false)
    if (error) toast.error(error.message)
    else { toast.success('Change order added'); setCoOpen(null); setCoForm({ description: '', amount: '', order_date: new Date().toISOString().split('T')[0], file: null }) }
  }

  async function handleDeleteCO(id: string) {
    const { error } = await deleteChangeOrder(id)
    if (error) toast.error(error.message)
    else toast.success('Change order deleted')
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Budget Categories</h1>
          <p className="text-muted-foreground text-sm">Manage spending categories for your budgets</p>
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
          <Button onClick={() => setAddOpen(true)} disabled={!selectedBudgetId}>
            <Plus className="mr-2 h-4 w-4" /> Add Category
          </Button>
        </div>
      </div>

      {!selectedBudgetId ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground rounded-xl border border-border bg-card">
          <p>Select a company budget to view categories</p>
        </div>
      ) : budgetCats.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground rounded-xl border border-border bg-card">
          <p className="text-lg">No categories yet</p>
          <p className="text-sm mt-1">Add categories to start tracking spending</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgetCats.map((cat, i) => {
            const catCOs = changeOrders.filter(co => co.category_id === cat.id)
            const catCOTotal = catCOs.reduce((s, co) => s + Number(co.amount), 0)
            const adjustedBudget = Number(cat.budget_amount) + catCOTotal
            const spent = getCategorySpent(cat.id)
            const remaining = adjustedBudget - spent
            const pct = adjustedBudget > 0 ? Math.min((spent / adjustedBudget) * 100, 100) : 0
            const barColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : cat.color
            const expanded = expandedCOs.has(cat.id)

            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <h3 className="font-semibold text-foreground">{cat.name}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditCat({ ...cat, budget_amount: cat.budget_amount })}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(cat.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                  {[
                    { label: 'Original Budget', value: formatCurrency(cat.budget_amount) },
                    { label: 'Change Orders', value: formatCurrency(catCOTotal), color: catCOTotal >= 0 ? 'text-success' : 'text-destructive' },
                    { label: 'Adjusted Budget', value: formatCurrency(adjustedBudget), color: 'text-primary' },
                    { label: 'Spent', value: formatCurrency(spent), color: 'text-warning' },
                    { label: 'Remaining', value: formatCurrency(remaining), color: remaining >= 0 ? 'text-success' : 'text-destructive' },
                  ].map(s => (
                    <div key={s.label} className="rounded-lg bg-muted/40 p-2">
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className={`text-sm font-semibold mt-0.5 ${s.color ?? 'text-foreground'}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Usage</span>
                    <span className="font-medium" style={{ color: barColor }}>{pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full progress-animated"
                      style={{ '--progress-width': `${pct}%`, backgroundColor: barColor } as React.CSSProperties}
                    />
                  </div>
                </div>

                {/* Category Change Orders */}
                <div className="border-t border-border/50 pt-3">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setExpandedCOs(prev => {
                        const next = new Set(prev)
                        if (next.has(cat.id)) next.delete(cat.id)
                        else next.add(cat.id)
                        return next
                      })}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      Change Orders ({catCOs.length})
                    </button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => {
                      setCoOpen(cat.id)
                      setCoForm({ description: '', amount: '', order_date: new Date().toISOString().split('T')[0], file: null })
                    }}>
                      <Plus className="mr-1 h-3 w-3" /> Add CO
                    </Button>
                  </div>
                  {expanded && catCOs.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {catCOs.map((co: ChangeOrder) => (
                        <div key={co.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-1.5 text-xs">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{co.description}</p>
                            <p className="text-muted-foreground">{formatDate(co.order_date)}</p>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <span className={`font-semibold ${Number(co.amount) >= 0 ? 'text-success' : 'text-destructive'}`}>
                              {Number(co.amount) >= 0 ? '+' : ''}{formatCurrency(co.amount)}
                            </span>
                            {co.file_url && (
                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setPreviewFile({ url: co.file_url!, name: co.file_name! })}>
                                <FileText className="h-3 w-3" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:text-destructive" onClick={() => handleDeleteCO(co.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Add Category Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Category</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label>Category Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Materials, Labor" required />
            </div>
            <div className="space-y-2">
              <Label>Budget Amount</Label>
              <Input type="number" value={form.budget_amount} onChange={e => setForm(f => ({ ...f, budget_amount: e.target.value }))} placeholder="0.00" min="0" step="0.01" required />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Adding...' : 'Add Category'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={!!editCat} onOpenChange={v => !v && setEditCat(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Category</DialogTitle></DialogHeader>
          {editCat && (
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="space-y-2">
                <Label>Category Name</Label>
                <Input value={editCat.name} onChange={e => setEditCat(ec => ec ? { ...ec, name: e.target.value } : null)} required />
              </div>
              <div className="space-y-2">
                <Label>Budget Amount</Label>
                <Input type="number" value={editCat.budget_amount} onChange={e => setEditCat(ec => ec ? { ...ec, budget_amount: parseFloat(e.target.value) || 0 } : null)} min="0" step="0.01" required />
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setEditCat(null)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={v => !v && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Category?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will delete the category and all associated change orders.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add CO Dialog */}
      <Dialog open={!!coOpen} onOpenChange={v => !v && setCoOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Change Order</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={coForm.description} onChange={e => setCoForm(f => ({ ...f, description: e.target.value }))} placeholder="Change order description" />
            </div>
            <div className="space-y-2">
              <Label>Amount (negative for reductions)</Label>
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
              <Button onClick={() => coOpen && handleAddCO(coOpen)} disabled={savingCO}>{savingCO ? 'Saving...' : 'Add'}</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <FilePreviewDialog open={!!previewFile} onOpenChange={v => !v && setPreviewFile(null)} fileUrl={previewFile?.url ?? null} fileName={previewFile?.name ?? null} />
    </motion.div>
  )
}
