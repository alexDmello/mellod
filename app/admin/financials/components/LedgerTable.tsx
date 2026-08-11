"use client";

import { useState, useMemo } from "react";
import {
  Transaction,
  TYPE_BADGE_COLORS,
  TYPE_AMOUNT_COLORS,
  RECONCILIATION_BADGE_COLORS,
} from "../types";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
  Ban,
  Trash2,
  Eye,
  FileText,
  Lock,
  ChevronLeft,
  ChevronRight,
  User,
  AlertCircle,
  Building,
} from "lucide-react";

export type SortField = "date" | "amount";
export type SortOrder = "asc" | "desc";

interface LedgerTableProps {
  loading: boolean;
  transactions: Transaction[];
  onEdit: (tx: Transaction) => void;
  onVoid: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  onViewProof: (tx: Transaction) => void;
}

const ITEMS_PER_PAGE = 20;

export function LedgerTable({
  loading,
  transactions,
  onEdit,
  onVoid,
  onDelete,
  onViewProof,
}: LedgerTableProps) {
  // Sort State
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // Handle header sort click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  // Sorted Transactions
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      let result = 0;
      if (sortField === "date") {
        result = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === "amount") {
        result = a.amount - b.amount;
      }
      return sortOrder === "asc" ? result : -result;
    });
  }, [transactions, sortField, sortOrder]);

  // Paginated Slice
  const totalPages = Math.ceil(sortedTransactions.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTransactions = sortedTransactions.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/80 overflow-hidden flex flex-col justify-between min-h-[400px]">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 text-gray-600 text-[11px] font-bold uppercase tracking-wider border-b border-gray-200">
              {/* Date Header with Sort */}
              <th className="py-3.5 px-4 cursor-pointer hover:bg-gray-100/80 transition-colors" onClick={() => handleSort("date")}>
                <div className="flex items-center gap-1.5">
                  <span>Date</span>
                  {sortField === "date" ? (
                    sortOrder === "asc" ? (
                      <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                    )
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </div>
              </th>

              <th className="py-3.5 px-4">Type</th>
              <th className="py-3.5 px-4">Category & Vendor</th>
              <th className="py-3.5 px-4">Reference / Notes</th>
              <th className="py-3.5 px-4">Payment Mode</th>

              {/* Amount Header with Sort */}
              <th className="py-3.5 px-4 text-right cursor-pointer hover:bg-gray-100/80 transition-colors" onClick={() => handleSort("amount")}>
                <div className="flex items-center justify-end gap-1.5">
                  <span>Amount</span>
                  {sortField === "amount" ? (
                    sortOrder === "asc" ? (
                      <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                    )
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </div>
              </th>

              <th className="py-3.5 px-4 text-center">Status</th>
              <th className="py-3.5 px-4 text-center">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 text-xs font-medium">
            {loading ? (
              // Skeleton Loaders
              Array.from({ length: 6 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="py-4 px-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                  <td className="py-4 px-4"><div className="h-5 bg-gray-200 rounded-full w-16" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-gray-200 rounded w-32 mb-1" /><div className="h-3 bg-gray-100 rounded w-24" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                  <td className="py-4 px-4 text-right"><div className="h-4 bg-gray-200 rounded w-20 ml-auto" /></td>
                  <td className="py-4 px-4 text-center"><div className="h-5 bg-gray-200 rounded-full w-20 mx-auto" /></td>
                  <td className="py-4 px-4 text-center"><div className="h-6 bg-gray-200 rounded w-24 mx-auto" /></td>
                </tr>
              ))
            ) : paginatedTransactions.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-gray-400">
                  <FileText className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                  <p className="font-bold text-gray-700 text-sm">No ledger transactions match the current query.</p>
                  <p className="text-xs text-gray-400 mt-1">Try resetting search parameters or log a new transaction.</p>
                </td>
              </tr>
            ) : (
              paginatedTransactions.map((tx) => {
                const isExpense = tx.type === "Expense";
                const isIncome = tx.type === "Income";

                return (
                  <tr
                    key={tx.id}
                    className={`hover:bg-gray-50/80 transition-colors ${
                      tx.isVoided ? "bg-amber-50/30" : ""
                    }`}
                  >
                    {/* Date */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-gray-700 whitespace-nowrap">
                      {formatDate(tx.date)}
                    </td>

                    {/* Type Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                          TYPE_BADGE_COLORS[tx.type] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>

                    {/* Category & Vendor */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          {tx.isOpeningBalance && (
                            <Lock className="w-3 h-3 text-amber-600 flex-shrink-0" />
                          )}
                          <span
                            className={`font-bold text-gray-900 ${
                              tx.isVoided ? "line-through text-gray-400" : ""
                            }`}
                          >
                            {tx.category}
                          </span>
                        </div>

                        {/* Vendor Name */}
                        {tx.vendorName && (
                          <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1 mt-0.5">
                            <Building className="w-3 h-3 text-gray-400" />
                            {tx.vendorName}
                          </span>
                        )}

                        {/* Cost Type (OPEX / COGS) */}
                        {tx.costType && (
                          <span className="text-[10px] font-mono text-gray-400 mt-0.5">
                            [{tx.costType}]
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Reference & Notes */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-xs font-bold text-gray-800">
                        {tx.reference}
                      </div>
                      {tx.notes && (
                        <p className="text-[11px] text-gray-500 truncate max-w-[200px] italic">
                          {tx.notes}
                        </p>
                      )}
                      {/* Voided Details */}
                      {tx.isVoided && (
                        <div className="mt-1 text-[10px] text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 inline-block">
                          Voided: {tx.voidedReason}
                        </div>
                      )}
                    </td>

                    {/* Payment Mode & GST */}
                    <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap">
                      <div>{tx.paymentMode || "—"}</div>
                      {Boolean(tx.gstRate && tx.gstRate > 0) && (
                        <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                          GST {tx.gstRate}%
                        </span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div
                        className={`font-mono text-sm font-black ${
                          tx.isVoided
                            ? "line-through text-gray-400"
                            : TYPE_AMOUNT_COLORS[tx.type] || "text-gray-900"
                        }`}
                      >
                        {isExpense ? "-" : isIncome ? "+" : ""}
                        {formatCurrency(tx.amount)}
                      </div>
                    </td>

                    {/* Reconciliation Status Badge */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          RECONCILIATION_BADGE_COLORS[tx.reconciliationStatus] ||
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {tx.reconciliationStatus}
                      </span>
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {/* Proof Button */}
                        {tx.proofUrl && (
                          <button
                            onClick={() => onViewProof(tx)}
                            className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="View Attached Proof / Receipt"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Edit Button */}
                        {!tx.isVoided && (
                          <button
                            onClick={() => onEdit(tx)}
                            className="p-1.5 text-gray-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Transaction"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Void Button */}
                        {!tx.isVoided ? (
                          <button
                            onClick={() => onVoid(tx)}
                            className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Void Transaction"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 px-1.5 py-0.5 bg-amber-50 rounded">
                            Voided
                          </span>
                        )}

                        {/* Delete Button */}
                        <button
                          onClick={() => onDelete(tx)}
                          className="p-1.5 text-gray-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Permanent Record"
                          aria-label="Delete Permanent Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!loading && sortedTransactions.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-gray-50/80 border-t border-gray-100 text-xs text-gray-500 font-medium">
          <div>
            Showing <span className="font-bold text-gray-800">{startIndex + 1}</span> to{" "}
            <span className="font-bold text-gray-800">
              {Math.min(startIndex + ITEMS_PER_PAGE, sortedTransactions.length)}
            </span>{" "}
            of <span className="font-bold text-gray-800">{sortedTransactions.length}</span> entries
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 font-mono font-bold text-gray-800 bg-white border border-gray-200 rounded-lg">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
