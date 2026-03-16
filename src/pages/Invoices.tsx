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
import { Badge } from '@/components/ui/badge'
import { FilePreviewDialog } from '@/components/FilePreviewDialog'
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, FileText, X } from 'lucide-react'
import type { Invoice } from '@/types'

interface LineItem {
  description: string
  amount: string
  category_id: string
}

export function Invoices() {
  const { user } = useAuth()
  const {
    budgets, categories, invoices, invoiceItems, selectedBudgetId, setSelectedBudgetId,
    addInvoice, updateInvoice, deleteInvoice, getInvoiceItems,
  } = useBudget()

  const [open, setOpen] = useState(false)
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [expandedInv, setExpandedInv] = useState<Set<string>>(new Set())
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    title: '',
    invoice_date: new Date().toISOString().split('T')[0],
    budget_id: selectedBudgetId ?? '',
    file: null as File | null,
  })
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: '', amount: '', category_id: '' }])

  const filteredInvoices = invoices.filter(inv => !selectedBudgetId || inv.budget_id === selectedBudgetId)
  const budgetCategories = categories.filter(c => c.budget_id === (form.budget_id || selectedBudgetId))

  function openAdd() {
    setEditInvoice(null)
    setForm({ title: '', invoice_date: new Date().toISOString().split('T')[0], budget_id: selectedBudgetId ?? '', file: null })
    setLineItems([{ description: '', amount: '', category_id: '' }])
    setOpen(true)
  }

  function openEdit(inv: Invoice) {
    setEditInvoice(inv)
    const items = invoiceItems.filter(i => i.invoice_id === inv.id)
    setForm({ title: inv.title, invoice_date: inv.invoice_date, budget_id: inv.budget_id, file: null })
    setLineItems(items.map(i => ({ description: i.description, amount: String(i.amount), category_id: i.category_id ?? '' })))
    if (items.length === 0) setLineItems([{ description: '', amount: '', category_id: '' }])
    setOpen(true)
  }

  function addLineItem() {
    setLineItems(prev => [...prev, { description: '', amount: '', category_id: '' }])
  }

  function removeLineItem(index: number) {
    setLineItems(prev => prev.filter((_, i) => i !== index))
  }

  function updateLineItem(index: number, field: keyof LineItem, value: string) {
    setLineItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const total = lineItems.reduce((s, item) => s + (parseFloat(item.amount) || 0), 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)

    let fileUrl: string | null = null
    let fileName: string | null = null

    if (form.file) {
      const path = `${user.id}/${Date.now()}-${form.file.name}`
      const { error: uploadErr } = await supabase.storage.from('invoice-files').upload(path, form.file)
      if (!uploadErr) {
        const { data } = supabase.storage.from('invoice-files').getPublicUrl(path)
        fileUrl = data.publicUrl
        fileName = form.file.name
      }
    }

    const validItems = lineItems.filter(i => i.description.trim() && parseFloat(i.amount) > 0)
    const itemsPayload = validItems.map(i => ({
      description: i.description,
      amount: parseFloat(i.amount),
      category_id: i.category_id || null,
    }))

    if (editInvoice) {
      const updates: Partial<Invoice> = {
        title: form.title,
        invoice_date: form.invoice_date,
        budget_id: form.budget_id,
        total_amount: total,
      }
      if (fileUrl) { updates.file_url = fileUrl; updates.file_name = fileName }
      const { error } = await updateInvoice(editInvoice.id, updates, itemsPayload)
      if (error) toast.error(error.message)
      else { toast.success('Invoice updated'); setOpen(false) }
    } else {
      const { error } = await addInvoice({
        title: form.title,
        invoice_date: form.invoice_date,
        budget_id: form.budget_id,
        total_amount: total,
        file_url: fileUrl,
        file_name: fileName,
      }, itemsPayload)
      if (error) toast.error(error.message)
      else { toast.success('Invoice created'); setOpen(false) }
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const { error } = await deleteInvoice(id)
    if (error) toast.error(error.message)
    else { toast.success('Invoice deleted'); setDeleteConfirm(null) }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground text-sm">Track all your invoices and spending</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedBudgetId ?? ''} onValueChange={setSelectedBudgetId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All companies" />
            </SelectTrigger>
            <SelectContent>
              {budgets.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" /> Add Invoice
          </Button>
        </div>
      </div>

      {filteredInvoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground rounded-xl border border-border bg-card">
          <p className="text-lg">No invoices yet</p>
          <p className="text-sm mt-1">Add your first invoice to start tracking spending</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Title</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Categories</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Amount</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Items</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map(inv => {
                  const items = getInvoiceItems(inv.id)
                  const catIds = [...new Set(items.map(i => i.category_id).filter(Boolean))]
                  const catNames = catIds.map(cid => categories.find(c => c.id === cid))
                  const expanded = expandedInv.has(inv.id)

                  return (
                    <>
                      <tr key={inv.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{formatDate(inv.invoice_date)}</td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-foreground">{inv.title}</p>
                          {inv.file_url && (
                            <button
                              onClick={() => setPreviewFile({ url: inv.file_url!, name: inv.file_name! })}
                              className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5"
                            >
                              <FileText className="h-3 w-3" /> {inv.file_name ?? 'View file'}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {catNames.slice(0, 3).map((cat, i) => cat && (
                              <Badge key={i} variant="secondary" style={{ backgroundColor: `${cat.color}20`, color: cat.color, borderColor: `${cat.color}40` }} className="text-xs border py-0">
                                {cat.name}
                              </Badge>
                            ))}
                            {catNames.length > 3 && <span className="text-xs text-muted-foreground">+{catNames.length - 3}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-foreground whitespace-nowrap">{formatCurrency(inv.total_amount)}</td>
                        <td className="px-4 py-3 text-center hidden sm:table-cell">
                          <button
                            onClick={() => setExpandedInv(prev => {
                              const next = new Set(prev)
                              if (next.has(inv.id)) next.delete(inv.id)
                              else next.add(inv.id)
                              return next
                            })}
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mx-auto"
                          >
                            {items.length} items
                            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(inv)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(inv.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {expanded && (
                        <tr key={`${inv.id}-expanded`} className="bg-muted/10">
                          <td colSpan={6} className="px-6 py-3">
                            <div className="space-y-1.5">
                              {items.map(item => {
                                const cat = categories.find(c => c.id === item.category_id)
                                return (
                                  <div key={item.id} className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">{item.description}</span>
                                    <div className="flex items-center gap-3">
                                      {cat && (
                                        <Badge variant="secondary" style={{ backgroundColor: `${cat.color}20`, color: cat.color }} className="text-xs py-0">
                                          {cat.name}
                                        </Badge>
                                      )}
                                      <span className="font-medium">{formatCurrency(item.amount)}</span>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Invoice Dialog */}
      <Dialog open={open} onOpenChange={v => !v && setOpen(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editInvoice ? 'Edit Invoice' : 'Add Invoice'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Invoice Title</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Office Supplies" required />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={form.invoice_date} onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Company Budget</Label>
                <Select value={form.budget_id} onValueChange={v => setForm(f => ({ ...f, budget_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                  <SelectContent>
                    {budgets.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Line Items</Label>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={addLineItem}>
                  <Plus className="mr-1 h-3 w-3" /> Add Item
                </Button>
              </div>
              {lineItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-5">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={e => updateLineItem(idx, 'description', e.target.value)}
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={item.amount}
                      onChange={e => updateLineItem(idx, 'amount', e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="col-span-3">
                    <Select value={item.category_id} onValueChange={v => updateLineItem(idx, 'category_id', v)}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent>
                        {budgetCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 flex justify-center pt-2">
                    {lineItems.length > 1 && (
                      <button type="button" onClick={() => removeLineItem(idx)} className="text-muted-foreground hover:text-destructive">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex justify-end">
                <p className="text-sm font-semibold">Total: {formatCurrency(total)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Invoice File (optional)</Label>
              <Input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e => setForm(f => ({ ...f, file: e.target.files?.[0] ?? null }))} />
              {editInvoice?.file_name && !form.file && (
                <p className="text-xs text-muted-foreground">Current: {editInvoice.file_name}</p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : editInvoice ? 'Update Invoice' : 'Create Invoice'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={v => !v && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Invoice?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently delete the invoice and all its line items.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FilePreviewDialog open={!!previewFile} onOpenChange={v => !v && setPreviewFile(null)} fileUrl={previewFile?.url ?? null} fileName={previewFile?.name ?? null} />
    </motion.div>
  )
}
