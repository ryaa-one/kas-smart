import { formatActivityAction } from "@/lib/dashboard-api";

export interface SerializedActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  action: string;
  action_label: string;
  description: string;
  created_at: string;
}

export interface ActivityLogsPagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface ActivityLogsResponseData {
  logs: SerializedActivityLog[];
  pagination: ActivityLogsPagination;
  users: Array<{ id: string; name: string; role: string }>;
  actions: Array<{ action: string; label: string }>;
}

export function getActivityActionColor(action: string): string {
  switch (action) {
    case "login":
      return "bg-blue-600/10 text-blue-600";
    case "logout":
      return "bg-zinc-500/10 text-muted";
    case "productAdd":
    case "productEdit":
    case "productDeactivate":
    case "categoryCreate":
    case "categoryAdd":
    case "categoryUpdate":
    case "categoryEdit":
    case "categoryDelete":
    case "supplierAdd":
    case "supplierCreate":
    case "supplierUpdate":
    case "supplierDelete":
    case "customerAdd":
    case "customerCreate":
    case "customerUpdate":
    case "customerEdit":
    case "customerDelete":
    case "cashierAdd":
    case "cashierEdit":
    case "cashierDeactivate":
    case "cashierActivate":
    case "storeInfoChange":
      return "bg-primary/10 text-primary";
    case "purchase":
    case "purchaseCreate":
    case "purchaseUpdate":
    case "purchaseDelete":
    case "sale":
    case "saleCreate":
      return "bg-amber-600/10 text-amber-600";
    case "qrisConfirm":
      return "bg-purple-600/10 text-purple-600";
    case "debtAdd":
    case "debtEdit":
    case "debtDelete":
      return "bg-rose-600/10 text-rose-600";
    case "debtPayment":
    case "profileChange":
      return "bg-success/10 text-success";
    case "stockAdjustment":
      return "bg-warning/10 text-warning";
    case "saleCancel":
      return "bg-danger/10 text-danger";
    default:
      return "bg-zinc-500/10 text-muted";
  }
}

export { formatActivityAction };
