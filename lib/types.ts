export type Party = {
  id: string;
  name: string;
  mobile: string | null;
  email: string | null;
  address: string | null;
  gstNumber: string | null;
  openingBalance: number;
  creditLimit?: number;
  notes: string | null;
  balance: number;
  createdAt?: string;
};

export type Txn = {
  id: string;
  type: "OPENING" | "CREDIT" | "PAYMENT" | "SALE" | "PURCHASE" | "ADJUSTMENT";
  direction: "CREDIT" | "DEBIT";
  amount: number;
  transactionDate: string;
  referenceNumber: string | null;
  notes: string | null;
  customer: { id: string; name: string } | null;
  supplier: { id: string; name: string } | null;
};

export type Dashboard = {
  business: { id: string; name: string };
  receivable: number;
  payable: number;
  sales: number;
  expense: number;
  series: { key: string; date: string; sales: number; expense: number }[];
  pending: { id: string; name: string; mobile: string | null; balance: number }[];
  lowStock: Product[];
  counts: { customers: number; suppliers: number; products: number };
  transactions: Txn[];
};

export type Product = {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  lowStockThreshold: number;
  stock: number;
  low: boolean;
};

export type Invoice = {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  status: "DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED";
  total: number;
  dueDate: string | null;
  createdAt: string;
  itemCount: number;
};

export type Expense = {
  id: string;
  category: string;
  amount: number;
  date: string;
  paymentMethod: string;
  notes: string | null;
};

export type Report = {
  months: { key: string; label: string; sales: number; purchases: number; expenses: number; received: number; paid: number }[];
  totals: { sales: number; purchases: number; expenses: number; profit: number; cashIn: number; cashOut: number };
  expenseByCategory: { category: string; amount: number }[];
  receivables: { id: string; name: string; balance: number }[];
  payables: { id: string; name: string; balance: number }[];
};
