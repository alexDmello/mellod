import { z } from "zod";

export type TransactionType = "Income" | "Expense" | "Asset" | "Transfer" | "Liability";
export type CostType = "COGS" | "OPEX";
export type PaymentMode = "Cash" | "UPI" | "Bank Transfer" | "Cheque";
export type ReconciliationStatus = "Pending" | "Cleared" | "Reconciled";

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  category: string;
  vendorName?: string | null;
  amount: number;
  reference: string;
  paymentMode?: PaymentMode | null;
  reconciliationStatus: ReconciliationStatus;
  proofName?: string | null;
  proofUrl?: string | null;
  notes?: string;
  costType?: CostType | null;
  taxableAmount?: number | null;
  gstRate?: number | null;
  cgst?: number | null;
  sgst?: number | null;
  igst?: number | null;
  isOpeningBalance?: boolean;
  isVoided?: boolean;
  voidedReason?: string | null;
  voidedAt?: string | null;
}

export const CATEGORIES_BY_TYPE: Record<TransactionType, string[]> = {
  Income: ["Revenue / Oil Sale", "Grant / Subsidy", "Investment", "Other Income"],
  Expense: [
    "FBO Restaurant Payout",
    "Logistics & Fleet",
    "Payroll",
    "Infrastructure",
    "Marketing",
    "Utilities",
    "Procurement",
    "Insurance",
    "Licenses & Compliance",
    "Taxes & Government Fees",
    "Professional Fees (CA/Legal)",
  ],
  Asset: ["Equipment & Vehicles", "Depot Real Estate", "IT Hardware", "Storage Tanks"],
  Transfer: ["Bank Reserve", "Inter-Account Transfer", "Petty Cash"],
  Liability: ["Loan Received", "Loan Repayment (Principal)", "Interest Paid"],
};

export const COST_TYPE_MAP: Record<string, CostType> = {
  "FBO Restaurant Payout": "COGS",
  "Logistics & Fleet": "COGS",
  "Procurement": "COGS",
  "Payroll": "OPEX",
  "Infrastructure": "OPEX",
  "Marketing": "OPEX",
  "Utilities": "OPEX",
  "Insurance": "OPEX",
  "Licenses & Compliance": "OPEX",
  "Taxes & Government Fees": "OPEX",
  "Professional Fees (CA/Legal)": "OPEX",
};

export const GST_RATES = [0, 5, 12, 18, 28];
export const PAYMENT_MODES: PaymentMode[] = ["Cash", "UPI", "Bank Transfer", "Cheque"];
export const RECONCILIATION_STATUSES: ReconciliationStatus[] = ["Pending", "Cleared", "Reconciled"];

export const TYPE_BADGE_COLORS: Record<TransactionType, string> = {
  Income: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Expense: "bg-rose-100 text-rose-800 border-rose-200",
  Asset: "bg-blue-100 text-blue-800 border-blue-200",
  Transfer: "bg-purple-100 text-purple-800 border-purple-200",
  Liability: "bg-amber-100 text-amber-800 border-amber-200",
};

export const TYPE_AMOUNT_COLORS: Record<TransactionType, string> = {
  Income: "text-emerald-700 font-bold",
  Expense: "text-rose-600 font-bold",
  Asset: "text-blue-700 font-bold",
  Transfer: "text-purple-700 font-bold",
  Liability: "text-amber-700 font-bold",
};

export const RECONCILIATION_BADGE_COLORS: Record<ReconciliationStatus, string> = {
  Pending: "bg-amber-50 text-amber-700 border-amber-200/80",
  Cleared: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  Reconciled: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
};

// Zod Validation Schema for Transaction Form
export const transactionSchema = z.object({
  type: z.enum(["Income", "Expense", "Asset", "Transfer", "Liability"]),
  category: z.string().min(1, "Category is required"),
  vendorName: z.string().optional(),
  amount: z
    .number()
    .positive("Amount must be greater than 0"),
  date: z.string().min(1, "Transaction date is required"),
  reference: z
    .string()
    .min(1, "Reference / Invoice ID is required")
    .transform((val) => val.trim().toUpperCase()),
  paymentMode: z.enum(["Cash", "UPI", "Bank Transfer", "Cheque"]).optional(),
  reconciliationStatus: z.enum(["Pending", "Cleared", "Reconciled"]),
  notes: z.string().optional(),
  gstRate: z.number(),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;
