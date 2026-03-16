export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Budget {
  id: string
  user_id: string
  name: string
  base_amount: number
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  budget_id: string
  user_id: string
  name: string
  budget_amount: number
  color: string
  created_at: string
  updated_at: string
}

export interface ChangeOrder {
  id: string
  budget_id: string | null
  category_id: string | null
  user_id: string
  description: string
  amount: number
  order_date: string
  file_url: string | null
  file_name: string | null
  created_at: string
}

export interface Invoice {
  id: string
  budget_id: string
  user_id: string
  title: string
  invoice_date: string
  file_url: string | null
  file_name: string | null
  total_amount: number
  created_at: string
  updated_at: string
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  category_id: string | null
  user_id: string
  description: string
  amount: number
  created_at: string
}

export interface BudgetApproval {
  id: string
  budget_id: string
  category_id: string
  user_id: string
  amount: number
  description: string | null
  approval_month: number
  approval_year: number
  created_at: string
  updated_at: string
}

export interface BudgetWithStats extends Budget {
  categories: Category[]
  total_allocated: number
  total_spent: number
  total_approved: number
  remaining: number
}

export interface CategoryWithStats extends Category {
  spent: number
  approved: number
  remaining: number
}
