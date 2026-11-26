import React, { useMemo, useState } from 'react';
import {
  IndianRupee,
  Plus,
  Receipt,
  Sparkles,
  Trash2,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { LiquidGlassCard } from '../LiquidGlassCard';
import {
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
  type ExpenseEntry,
} from '../../data/localLifeData';

interface ExpenseTrackerPanelProps {
  expenses: ExpenseEntry[];
  budgetGoalInr: number;
  onBudgetGoalChange: (next: number) => void;
  onAddExpense: (entry: Omit<ExpenseEntry, 'id' | 'date'>) => void;
  onDeleteExpense: (id: string) => void;
}

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  'Food & Cafes': '#f59e0b',
  'Local Transport & Fuel': '#0ea5e9',
  'Travel Tickets': '#4F5BD5',
  'Turf & Lifestyle': '#10b981',
  'Education & Books': '#8b5cf6',
  'Healthcare & OP': '#e11d48',
};

export const ExpenseTrackerPanel: React.FC<ExpenseTrackerPanelProps> = ({
  expenses,
  budgetGoalInr,
  onBudgetGoalChange,
  onAddExpense,
  onDeleteExpense,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Food & Cafes');
  const [amountInr, setAmountInr] = useState('');
  const [note, setNote] = useState('');

  const totalSpent = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amountInr, 0),
    [expenses]
  );

  const remaining = budgetGoalInr - totalSpent;
  const pct = budgetGoalInr > 0 ? Math.min(100, Math.round((totalSpent / budgetGoalInr) * 100)) : 0;

  const categoryTotals = useMemo(() => {
    return EXPENSE_CATEGORIES.map((cat) => {
      const sum = expenses
        .filter((e) => e.category === cat)
        .reduce((acc, e) => acc + e.amountInr, 0);
      return {
        category: cat,
        total: sum,
        pct: totalSpent > 0 ? Math.round((sum / totalSpent) * 100) : 0,
        color: CATEGORY_COLORS[cat],
      };
    });
  }, [expenses, totalSpent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amountInr);
    if (!title.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) return;
    onAddExpense({
      title: title.trim(),
      category,
      amountInr: Math.round(numericAmount),
      source: 'Manual',
      note: note.trim() || undefined,
    });
    setTitle('');
    setAmountInr('');
    setNote('');
  };

  return (
    <div className="space-y-5">
      {/* Budget Gauge + Editable Goal */}
      <LiquidGlassCard interactive={false} strong className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#4F5BD5] dark:text-[#A5B4FC] flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" />
              <span>Expense Planner &amp; Live Budget Tracker</span>
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-mono text-[#111315] dark:text-white tabular-nums">
              ₹{totalSpent.toLocaleString('en-IN')}{' '}
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                / ₹{budgetGoalInr.toLocaleString('en-IN')}
              </span>
            </h2>
            <p
              className={`text-xs font-bold ${
                remaining >= 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {remaining >= 0
                ? `₹${remaining.toLocaleString('en-IN')} remaining in monthly / trip budget`
                : `Over budget by ₹${Math.abs(remaining).toLocaleString('en-IN')}`}
            </p>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="budget-goal-input"
              className="text-[10.5px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400 block"
            >
              Edit Budget Goal (₹)
            </label>
            <div className="flex items-center gap-1.5">
              <IndianRupee className="w-3.5 h-3.5 text-[#4F5BD5]" />
              <input
                id="budget-goal-input"
                type="number"
                min={1000}
                step={500}
                value={budgetGoalInr}
                onChange={(e) =>
                  onBudgetGoalChange(Math.max(1000, Number(e.target.value) || 10000))
                }
                className="w-32 glass-pill-input px-3 py-2 text-xs font-mono font-bold tabular-nums"
              />
            </div>
          </div>
        </div>

        {/* Visual Budget Progress Bar */}
        <div className="space-y-1.5">
          <div className="h-3 rounded-full bg-black/8 dark:bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                remaining < 0
                  ? 'bg-gradient-to-r from-rose-500 to-orange-500'
                  : 'bg-gradient-to-r from-[#4F5BD5] via-[#7B83EB] to-emerald-500'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#4F5BD5]" />
              Booked flights, trains, buses &amp; feeder passes auto-log here!
            </span>
            <span className="font-mono font-bold tabular-nums">{pct}% used</span>
          </div>
        </div>

        {/* Category Breakdown Bars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
          {categoryTotals.map((item) => (
            <div
              key={item.category}
              className="p-3 rounded-2xl bg-[#EFECE8]/80 dark:bg-slate-800/75 border border-black/5 dark:border-white/10 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
                <span className="text-[#111315] dark:text-white truncate">{item.category}</span>
                <span className="font-mono text-slate-700 dark:text-slate-200 tabular-nums">
                  ₹{item.total.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-black/8 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </LiquidGlassCard>

      {/* Quick-Add Expense Form */}
      <LiquidGlassCard interactive={false} className="p-5 space-y-3">
        <h3 className="text-sm font-extrabold text-[#111315] dark:text-white flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-[#4F5BD5]" />
          Quick-Add Expense
        </h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (e.g. Thiruvalla Coffee, EV Auto)"
            className="sm:col-span-4 glass-pill-input px-3.5 py-2.5 text-xs font-medium"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            className="sm:col-span-3 glass-pill-input px-3 py-2.5 text-xs font-semibold cursor-pointer"
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            type="number"
            required
            min={1}
            value={amountInr}
            onChange={(e) => setAmountInr(e.target.value)}
            placeholder="Amount ₹"
            className="sm:col-span-2 glass-pill-input px-3 py-2.5 text-xs font-mono font-bold"
          />
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note"
            className="sm:col-span-2 glass-pill-input px-3 py-2.5 text-xs"
          />
          <button
            type="submit"
            className="sm:col-span-1 inline-flex items-center justify-center gap-1 px-3 py-2.5 rounded-full bg-[#111315] dark:bg-white text-white dark:text-slate-950 text-xs font-bold shadow-sm cursor-pointer"
            aria-label="Add expense"
          >
            <Plus className="w-4 h-4" />
          </button>
        </form>
      </LiquidGlassCard>

      {/* Expense Ledger List */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Logged Transactions ({expenses.length})
        </h3>
        {expenses.length === 0 ? (
          <LiquidGlassCard interactive={false} className="p-8 text-center space-y-2">
            <Receipt className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-[#111315] dark:text-white">
              No expenses logged yet
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Add an expense above, log a Food Spot, import a Weekend Plan, or book any travel ticket.
            </p>
          </LiquidGlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {expenses.map((exp, idx) => (
              <LiquidGlassCard key={exp.id} delay={idx * 0.03} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: CATEGORY_COLORS[exp.category] }}
                      />
                      <span className="text-[10.5px] font-bold text-slate-600 dark:text-slate-300">
                        {exp.category}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9.5px] font-mono font-bold ${
                          exp.source === 'Auto-Booked'
                            ? 'bg-[#4F5BD5]/15 text-[#4F5BD5] dark:text-[#A5B4FC]'
                            : exp.source === 'Weekend Plan'
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              : 'bg-black/6 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {exp.source}
                      </span>
                    </div>
                    <h4 className="text-sm font-extrabold text-[#111315] dark:text-white truncate">
                      {exp.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {exp.date}
                      {exp.note ? ` · ${exp.note}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-sm font-extrabold text-[#111315] dark:text-white tabular-nums">
                      ₹{exp.amountInr.toLocaleString('en-IN')}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteExpense(exp.id)}
                      aria-label={`Delete expense ${exp.title}`}
                      className="p-1.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </LiquidGlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
