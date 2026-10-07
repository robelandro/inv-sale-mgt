import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getProducts } from "@/services/products.service";
import { getSales } from "@/services/sales.service";
import { getDebts } from "@/services/payments.service";
import { getStockMovements } from "@/services/stock.service";
import { can, PERMISSIONS } from "@/lib/permissions";

function arrayToCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escapeCell = (cell: any) => {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell).replace(/"/g, '""');
    return `"${str}"`;
  };

  const lines = [headers.map(escapeCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(","));
  }
  return lines.join("\r\n");
}

export async function GET(
  req: NextRequest,
  { params }: { params: { type: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { type } = params;

  if (type === "products") {
    if (!can(user, PERMISSIONS.PRODUCTS_VIEW)) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    const canViewCost = can(user, PERMISSIONS.PRODUCTS_VIEW_COST);
    const { items } = await getProducts({
      pageSize: 5000,
      canViewCost,
    });

    const headers = ["Name", "SKU", "Barcode", "Category", "Unit", "Selling Price", "Stock Qty", "Status"];
    if (canViewCost) headers.splice(5, 0, "Cost Price");

    const rows = items.map((p) => {
      const row = [
        p.name,
        p.sku,
        p.barcode || "",
        p.categoryName || "",
        p.unitShortName || "",
        p.sellingPrice,
        p.stockQty,
        p.stockStatus,
      ];
      if (canViewCost) row.splice(5, 0, p.costPrice);
      return row;
    });

    const csv = arrayToCsv(headers, rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="products_${Date.now()}.csv"`,
      },
    });
  }

  if (type === "sales") {
    if (!can(user, PERMISSIONS.SALES_VIEW)) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    const isCashierOnly = user.roleKey === "cashier";
    const { items } = await getSales({
      pageSize: 5000,
      userIdOnly: isCashierOnly ? user.id : undefined,
    });

    const headers = ["Invoice No", "Customer", "Total", "Amount Paid", "Balance Due", "Status", "Date", "Cashier"];
    const rows = items.map((s) => [
      s.invoiceNo,
      s.customerName,
      s.total,
      s.amountPaid,
      s.balanceDue,
      s.paymentStatus,
      new Date(s.createdAt).toISOString(),
      s.creatorName || "",
    ]);

    const csv = arrayToCsv(headers, rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="sales_${Date.now()}.csv"`,
      },
    });
  }

  if (type === "debts") {
    if (!can(user, PERMISSIONS.DEBTS_VIEW)) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    const { items } = await getDebts({ pageSize: 5000 });
    const headers = ["Customer", "Phone", "Email", "Total Owed", "Oldest Unpaid Date", "Overdue"];
    const rows = items.map((d) => [
      d.customerName,
      d.customerPhone || "",
      d.customerEmail || "",
      d.totalOwed,
      d.oldestUnpaidDate ? new Date(d.oldestUnpaidDate).toISOString().split("T")[0] : "",
      d.isOverdue ? "Yes" : "No",
    ]);

    const csv = arrayToCsv(headers, rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="debts_${Date.now()}.csv"`,
      },
    });
  }

  if (type === "movements") {
    if (!can(user, PERMISSIONS.PRODUCTS_VIEW)) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    const { items } = await getStockMovements({ pageSize: 5000 });
    const headers = ["Product", "SKU", "Type", "Change", "Stock After", "Reason", "Date"];
    const rows = items.map((m) => [
      m.productName,
      m.productSku,
      m.type,
      m.qtyChange,
      m.qtyAfter,
      m.reason || "",
      new Date(m.createdAt).toISOString(),
    ]);

    const csv = arrayToCsv(headers, rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="stock_movements_${Date.now()}.csv"`,
      },
    });
  }

  return new NextResponse("Invalid export type", { status: 400 });
}
