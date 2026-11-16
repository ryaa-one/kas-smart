export type ReportTab =
  | "sales"
  | "purchases"
  | "profit"
  | "stock"
  | "suppliers"
  | "debt"
  | "adjustments";

export interface SalesReportRow {
  id: string;
  invoice_number: string;
  transaction_date: string;
  user_name: string;
  total: number;
}

export interface PurchasesReportRow {
  id: string;
  supplier_name: string;
  purchase_date: string;
  items_count: number;
  total: number;
}

export interface StockReportRow {
  id: string;
  name: string;
  stock: number;
  minimum_stock: number;
  unit_value: number;
}

export interface SupplierReportRow {
  name: string;
  count: number;
  total: number;
}

export interface DebtReportRow {
  debt_id: string;
  customer_name: string;
  invoice_number: string;
  total_debt: number;
  remaining_debt: number;
}

export interface AdjustmentReportRow {
  id: string;
  adjustment_date: string;
  product_name: string;
  quantity_change: number;
  reason: string;
}

export interface ReportResponseData {
  tab: ReportTab;
  from?: string;
  to?: string;
  sales?: {
    revenue: number;
    count: number;
    debtCount: number;
    rows: SalesReportRow[];
  };
  purchases?: {
    total: number;
    count: number;
    rows: PurchasesReportRow[];
  };
  profit?: {
    salesRevenue: number;
    salesCost: number;
    grossProfit: number;
    margin: number;
  };
  stock?: {
    totalProducts: number;
    totalUnits: number;
    totalValue: number;
    lowCount: number;
    rows: StockReportRow[];
  };
  suppliers?: {
    rows: SupplierReportRow[];
  };
  debt?: {
    total: number;
    remaining: number;
    paid: number;
    rows: DebtReportRow[];
  };
  adjustments?: {
    rows: AdjustmentReportRow[];
  };
}
