import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts'
import { useBudget } from '@/contexts/BudgetContext'
import { formatCurrency, getMonthName, getCurrentMonth, getCurrentYear } from '@/lib/utils'
import { ChevronLeft, ChevronRight, TrendingUp, DollarSign, Receipt, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

export function Dashboard() {
  const {
    budgets, categories, invoices, invoiceItems, changeOrders, approvals,
    selectedBudgetId, setSelectedBudgetId,
    getCategorySpent, getCategoryApproved, getBudgetChangeOrders,
  } = useBudget()

  const [month, setMonth] = useState(getCurrentMonth())
  const [year, setYear] = useState(getCurrentYear())

  const budget = budgets.find(b => b.id === selectedBudgetId)
  const budgetCats = categories.filter(c => c.budget_id === selectedBudgetId)
  const budgetChangeOrders = selectedBudgetId ? getBudgetChangeOrders(selectedBudgetId) : []
  const totalChangeOrders = budgetChangeOrders.reduce((s, co) => s + Number(co.amount), 0)
  const adjustedBudget = Number(budget?.base_amount ?? 0) + totalChangeOrders
  const totalAllocated = budgetCats.reduce((s, c) => s + Number(c.budget_amount), 0)
  const totalSpent = budgetCats.reduce((s, c) => s + getCategorySpent(c.id), 0)
  const remaining = adjustedBudget - totalSpent

  const usagePct = adjustedBudget > 0 ? (totalSpent / adjustedBudget) * 100 : 0
  const barColor = usagePct >= 90 ? '#ef4444' : usagePct >= 70 ? '#f59e0b' : '#22c55e'

  // Monthly approved per category
  const monthlyApprovals = approvals.filter(
    a => a.approval_month === month && a.approval_year === year && budgetCats.some(c => c.id === a.category_id)
  )

  // Chart data
  const chartData = budgetCats.map(cat => ({
    name: cat.name.length > 12 ? cat.name.slice(0, 12) + '…' : cat.name,
    Budget: Number(cat.budget_amount),
    Approved: getCategoryApproved(cat.id, month, year),
    Spent: getCategorySpent(cat.id),
    color: cat.color,
  }))

  const pieData = budgetCats
    .map(cat => ({ name: cat.name, value: getCategorySpent(cat.id), color: cat.color }))
    .filter(d => d.value > 0)

  // Recent invoices
  const budgetInvoices = invoices
    .filter(inv => inv.budget_id === selectedBudgetId)
    .slice(0, 5)

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const statCards = [
    { label: 'Total Budget', value: formatCurrency(adjustedBudget), icon: DollarSign, color: 'text-primary' },
    { label: 'Change Orders', value: formatCurrency(totalChangeOrders), icon: TrendingUp, color: totalChangeOrders >= 0 ? 'text-success' : 'text-destructive' },
    { label: 'Total Spent', value: formatCurrency(totalSpent), icon: Receipt, color: 'text-warning' },
    { label: 'Remaining', value: formatCurrency(remaining), icon: AlertCircle, color: remaining >= 0 ? 'text-success' : 'text-destructive' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Overview of your budget performance</p>
        </div>
        <Select value={selectedBudgetId ?? ''} onValueChange={setSelectedBudgetId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Select company" />
          </SelectTrigger>
          <SelectContent>
            {budgets.map(b => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!budget ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <p className="text-lg">No company budget selected</p>
          <p className="text-sm mt-1">Create a company budget to get started</p>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{card.label}</p>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
                <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Overall usage bar */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm font-medium text-foreground">Overall Budget Usage</p>
              <span className="text-sm font-bold" style={{ color: barColor }}>{usagePct.toFixed(1)}%</span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 progress-animated"
                style={{
                  '--progress-width': `${Math.min(usagePct, 100)}%`,
                  backgroundColor: barColor,
                } as React.CSSProperties}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>Spent: {formatCurrency(totalSpent)}</span>
              <span>Budget: {formatCurrency(adjustedBudget)}</span>
            </div>
          </div>

          {/* Monthly Approved Section */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Monthly Approved Budget</h2>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={prevMonth} className="h-7 w-7">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[100px] text-center">
                  {getMonthName(month)} {year}
                </span>
                <Button variant="ghost" size="icon" onClick={nextMonth} className="h-7 w-7">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {monthlyApprovals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No approvals for this month</p>
            ) : (
              <div className="space-y-3">
                {budgetCats.map(cat => {
                  const approved = getCategoryApproved(cat.id, month, year)
                  const spent = getCategorySpent(cat.id)
                  if (approved === 0) return null
                  const pct = approved > 0 ? Math.min((spent / approved) * 100, 100) : 0
                  return (
                    <div key={cat.id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium" style={{ color: cat.color }}>{cat.name}</span>
                        <span className="text-muted-foreground">{formatCurrency(spent)} / {formatCurrency(approved)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full progress-animated"
                          style={{
                            '--progress-width': `${pct}%`,
                            backgroundColor: cat.color,
                          } as React.CSSProperties}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground mb-4">Budget vs Approved vs Spent</h2>
              {chartData.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No categories yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,60%,18%)" />
                    <XAxis dataKey="name" tick={{ fill: 'hsl(215,20%,65%)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'hsl(215,20%,65%)', fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(222,47%,10%)', border: '1px solid hsl(220,60%,18%)', borderRadius: '8px' }}
                      labelStyle={{ color: 'hsl(210,40%,98%)' }}
                      formatter={(value: unknown) => formatCurrency(Number(value))}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="Budget" fill="#6366f1" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Approved" fill="#22c55e" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Spent" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Pie Chart */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground mb-4">Spending Distribution</h2>
              {pieData.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No spending data yet</div>
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="60%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(222,47%,10%)', border: '1px solid hsl(220,60%,18%)', borderRadius: '8px' }}
                        formatter={(value: unknown) => formatCurrency(Number(value))}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {pieData.map((entry, idx) => {
                      const pct = totalSpent > 0 ? (entry.value / totalSpent * 100).toFixed(1) : '0'
                      return (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                          <span className="text-muted-foreground truncate flex-1">{entry.name}</span>
                          <span className="font-medium text-foreground">{pct}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Category cards */}
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">Category Budget Usage</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {budgetCats.map(cat => {
                const catCOs = changeOrders.filter(co => co.category_id === cat.id)
                const catCOTotal = catCOs.reduce((s, co) => s + Number(co.amount), 0)
                const adjustedCatBudget = Number(cat.budget_amount) + catCOTotal
                const spent = getCategorySpent(cat.id)
                const approved = getCategoryApproved(cat.id)
                const remaining = adjustedCatBudget - spent
                const pct = adjustedCatBudget > 0 ? Math.min((spent / adjustedCatBudget) * 100, 100) : 0
                const barClr = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : cat.color
                return (
                  <div key={cat.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <p className="text-sm font-semibold text-foreground truncate">{cat.name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3">
                      <span className="text-muted-foreground">Spent</span>
                      <span className="text-right font-medium text-warning">{formatCurrency(spent)}</span>
                      <span className="text-muted-foreground">Budget</span>
                      <span className="text-right font-medium">{formatCurrency(adjustedCatBudget)}</span>
                      <span className="text-muted-foreground">Approved</span>
                      <span className="text-right font-medium text-success">{formatCurrency(approved)}</span>
                      <span className="text-muted-foreground">Remaining</span>
                      <span className={`text-right font-medium ${remaining >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(remaining)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full progress-animated"
                        style={{
                          '--progress-width': `${pct}%`,
                          backgroundColor: barClr,
                        } as React.CSSProperties}
                      />
                    </div>
                    <p className="text-right text-xs text-muted-foreground mt-1">{pct.toFixed(1)}%</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recent Invoices */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground mb-4">Recent Invoices</h2>
            {budgetInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No invoices yet</p>
            ) : (
              <div className="space-y-2">
                {budgetInvoices.map(inv => {
                  const items = invoiceItems.filter(i => i.invoice_id === inv.id)
                  const catIds = [...new Set(items.map(i => i.category_id).filter(Boolean))]
                  const catNames = catIds.map(cid => categories.find(c => c.id === cid)?.name).filter(Boolean)
                  return (
                    <div key={inv.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{inv.title}</p>
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground">{new Date(inv.invoice_date).toLocaleDateString()}</span>
                          {catNames.slice(0, 2).map((name, i) => (
                            <Badge key={i} variant="secondary" className="text-xs py-0 px-1.5">{name}</Badge>
                          ))}
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-foreground ml-4">{formatCurrency(inv.total_amount)}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Allocated vs budget check */}
          {totalAllocated > adjustedBudget && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              ⚠️ Category allocations ({formatCurrency(totalAllocated)}) exceed adjusted budget ({formatCurrency(adjustedBudget)})
            </div>
          )}
        </>
      )}
    </motion.div>
  )
}
