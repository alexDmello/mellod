"use client";

import {
  Search,
  Download,
  Plus,
  RefreshCw,
  FilterX,
  Calendar,
  Layers,
  CheckCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { TransactionType, ReconciliationStatus } from "../types";

interface FilterBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  typeFilter: string;
  setTypeFilter: (type: string) => void;
  dateFilter: string;
  setDateFilter: (date: string) => void;
  reconciliationFilter: string;
  setReconciliationFilter: (status: string) => void;
  showVoided: boolean;
  setShowVoided: (show: boolean) => void;
  onRefresh: () => void;
  onExportCSV: () => void;
  onOpenNewDrawer: () => void;
  totalFilteredCount: number;
}

export function FilterBar({
  searchQuery,
  setSearchQuery,
  typeFilter,
  setTypeFilter,
  dateFilter,
  setDateFilter,
  reconciliationFilter,
  setReconciliationFilter,
  showVoided,
  setShowVoided,
  onRefresh,
  onExportCSV,
  onOpenNewDrawer,
  totalFilteredCount,
}: FilterBarProps) {
  const transactionTypes: ("All" | TransactionType)[] = [
    "All",
    "Income",
    "Expense",
    "Asset",
    "Transfer",
    "Liability",
  ];

  const reconciliationStatuses: ("All" | ReconciliationStatus)[] = [
    "All",
    "Pending",
    "Cleared",
    "Reconciled",
  ];

  const dateOptions = ["All", "This Month", "This Year"];

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    typeFilter !== "All" ||
    dateFilter !== "All" ||
    reconciliationFilter !== "All" ||
    showVoided;

  const resetFilters = () => {
    setSearchQuery("");
    setTypeFilter("All");
    setDateFilter("All");
    setReconciliationFilter("All");
    setShowVoided(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xl shadow-gray-200/50 space-y-4">
      {/* Top Controls Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by reference, vendor, category, or notes..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
            >
              ×
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Reset Filters button */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center gap-1.5 transition-colors"
              title="Reset all filters"
            >
              <FilterX className="w-3.5 h-3.5" />
              Reset
            </button>
          )}

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            className="p-2 text-gray-600 hover:text-emerald-700 bg-gray-50 hover:bg-emerald-50 border border-gray-200 rounded-xl transition-colors"
            title="Refresh Ledger Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Export CSV button */}
          <button
            onClick={onExportCSV}
            className="px-3.5 py-2 text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            Export CSV
          </button>

          {/* Log New Transaction Button */}
          <button
            onClick={onOpenNewDrawer}
            className="px-4 py-2 text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all transform active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Log New Transaction
          </button>
        </div>
      </div>

      {/* Filter Options Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100 text-xs">
        {/* Type Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Layers className="w-3 h-3" /> Type:
          </span>
          {transactionTypes.map((type) => {
            const isActive = typeFilter === type;
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap text-[11px] ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-gray-100/80 text-gray-600 hover:bg-gray-200/80"
                }`}
              >
                {type}
              </button>
            );
          })}
        </div>

        {/* Dropdown Filters & Void Toggle */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Date Filter */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {dateOptions.map((opt) => (
                <option key={opt} value={opt}>
                  Date: {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Reconciliation Filter */}
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={reconciliationFilter}
              onChange={(e) => setReconciliationFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {reconciliationStatuses.map((st) => (
                <option key={st} value={st}>
                  Status: {st}
                </option>
              ))}
            </select>
          </div>

          {/* Show Voided Toggle */}
          <button
            onClick={() => setShowVoided(!showVoided)}
            className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-colors text-xs border ${
              showVoided
                ? "bg-amber-50 text-amber-800 border-amber-300"
                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
            }`}
          >
            {showVoided ? <Eye className="w-3.5 h-3.5 text-amber-600" /> : <EyeOff className="w-3.5 h-3.5 text-gray-400" />}
            Voided ({showVoided ? "Shown" : "Hidden"})
          </button>
        </div>
      </div>
    </div>
  );
}
