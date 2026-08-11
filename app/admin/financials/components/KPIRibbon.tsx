"use client";

import { useMemo } from "react";
import { Transaction } from "../types";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
} from "lucide-react";

interface KPIRibbonProps {
  transactions: Transaction[];
}

export function KPIRibbon({ transactions }: KPIRibbonProps) {
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    let opex = 0;
    let cogs = 0;
    let liabilities = 0;
    let pendingCount = 0;

    transactions.forEach((tx) => {
      if (tx.isVoided) return;

      if (tx.type === "Income") {
        income += tx.amount;
      } else if (tx.type === "Expense") {
        expense += tx.amount;
        if (tx.costType === "COGS") {
          cogs += tx.amount;
        } else if (tx.costType === "OPEX") {
          opex += tx.amount;
        }
      } else if (tx.type === "Liability") {
        liabilities += tx.amount;
      }

      if (tx.reconciliationStatus === "Pending") {
        pendingCount++;
      }
    });

    const netCashFlow = income - expense;

    return {
      income,
      expense,
      opex,
      cogs,
      netCashFlow,
      liabilities,
      pendingCount,
    };
  }, [transactions]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Income */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xl shadow-gray-200/50 hover:border-emerald-200 transition-colors relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold font-mono text-emerald-800 uppercase tracking-wider">
            Total Income
          </span>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
            {formatCurrency(stats.income)}
          </div>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" />
            Inflows
          </span>
        </div>
        <p className="text-[11px] text-gray-400 mt-2 font-medium">
          Filtered gross revenue & grants
        </p>
      </div>

      {/* 2. Total Expenses (OPEX vs COGS) */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xl shadow-gray-200/50 hover:border-rose-200 transition-colors relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold font-mono text-rose-800 uppercase tracking-wider">
            Total Expenses
          </span>
          <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
            {formatCurrency(stats.expense)}
          </div>
          <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
            <ArrowDownRight className="w-3 h-3" />
            Outflows
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-500 font-mono font-medium border-t border-gray-100 pt-2">
          <span className="text-rose-700">COGS: {formatCurrency(stats.cogs)}</span>
          <span className="text-gray-300">•</span>
          <span className="text-amber-700">OPEX: {formatCurrency(stats.opex)}</span>
        </div>
      </div>

      {/* 3. Net Cash Flow */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xl shadow-gray-200/50 hover:border-blue-200 transition-colors relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold font-mono text-blue-800 uppercase tracking-wider">
            Net Cash Flow
          </span>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
            stats.netCashFlow >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
          }`}>
            <Scale className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div className={`text-2xl font-black tracking-tight font-mono ${
            stats.netCashFlow >= 0 ? "text-emerald-700" : "text-rose-600"
          }`}>
            {stats.netCashFlow >= 0 ? "+" : ""}{formatCurrency(stats.netCashFlow)}
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            stats.netCashFlow >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          }`}>
            {stats.netCashFlow >= 0 ? "Surplus" : "Deficit"}
          </span>
        </div>
        <p className="text-[11px] text-gray-400 mt-2 font-medium">
          Income less operating expenses
        </p>
      </div>

      {/* 4. Pending Liabilities & Reconciliations */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xl shadow-gray-200/50 hover:border-amber-200 transition-colors relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold font-mono text-amber-800 uppercase tracking-wider">
            Pending Liabilities
          </span>
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">
            {formatCurrency(stats.liabilities)}
          </div>
          {stats.pendingCount > 0 ? (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-amber-600" />
              {stats.pendingCount} Pending
            </span>
          ) : (
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              Reconciled
            </span>
          )}
        </div>
        <p className="text-[11px] text-gray-400 mt-2 font-medium">
          Loans & uncleared bank entries
        </p>
      </div>
    </div>
  );
}
