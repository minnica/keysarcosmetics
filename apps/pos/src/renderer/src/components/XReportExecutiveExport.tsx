import { useMemo, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Store,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  DatePicker,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@cosmetics/ui";
import { formatCurrency } from "../mock-data";
import { getTicketSpare } from "../spare";
import { getTicketTaxSummary, roundCurrency } from "../tax";
import {
  getStoredInterfaceLanguage,
  translateInterfaceRecord,
  translateInterfaceText,
} from "../i18n";
import type {
  InventoryMovement,
  PaymentMethodOption,
  Product,
  ReceiptSettings,
  Ticket,
} from "../types";

interface XReportExecutiveExportProps {
  tickets: Ticket[];
  products: Product[];
  movements: InventoryMovement[];
  paymentMethods: PaymentMethodOption[];
  branches: string[];
  receiptSettings: ReceiptSettings;
}

const getBusinessToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const getBusinessDate = (createdAtIso: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(createdAtIso));

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const movementTypeLabel = (movement: InventoryMovement) => {
  if (movement.direction === "TRANSFER") return "Transferencia";
  if (movement.direction === "ADD") return "Entrada / suma";
  return "Baja / salida";
};

export function XReportExecutiveExport({
  tickets,
  products,
  movements,
  paymentMethods,
  branches,
  receiptSettings,
}: XReportExecutiveExportProps) {
  const [dateFrom, setDateFrom] = useState(getBusinessToday);
  const [dateTo, setDateTo] = useState(getBusinessToday);
  const [selectedBranch, setSelectedBranch] = useState("ALL");
  const [exporting, setExporting] = useState<"EXCEL" | "PDF" | null>(null);

  const branchOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...branches,
          receiptSettings.branchName,
          ...tickets.flatMap((ticket) =>
            ticket.branchName ? [ticket.branchName] : [],
          ),
          ...movements.flatMap((movement) => [
            movement.sourceBranch,
            ...(movement.destinationBranch
              ? [movement.destinationBranch]
              : []),
          ]),
        ]),
      ).sort((left, right) => left.localeCompare(right, "es-MX")),
    [branches, movements, receiptSettings.branchName, tickets],
  );
  const validPeriod = Boolean(dateFrom && dateTo && dateFrom <= dateTo);
  const ticketBranch = (ticket: Ticket) =>
    ticket.branchName ?? receiptSettings.branchName;
  const inSelectedBranch = (branch: string) =>
    selectedBranch === "ALL" || branch === selectedBranch;
  const inPeriod = (createdAtIso: string) => {
    const date = getBusinessDate(createdAtIso);
    return date >= dateFrom && date <= dateTo;
  };

  const periodTickets = useMemo(
    () =>
      validPeriod
        ? tickets.filter(
            (ticket) =>
              inPeriod(ticket.createdAtIso) &&
              inSelectedBranch(ticketBranch(ticket)),
          )
        : [],
    // The helpers intentionally derive from the current period and branch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dateFrom, dateTo, receiptSettings.branchName, selectedBranch, tickets],
  );
  const activePeriodTickets = periodTickets.filter(
    (ticket) => ticket.status === "COMPLETED",
  );
  const saleTickets = activePeriodTickets.filter(
    (ticket) => ticket.ticketType !== "LAYAWAY_PAYMENT",
  );
  const cancelledSaleTickets = periodTickets.filter(
    (ticket) =>
      ticket.status === "REFUNDED" &&
      ticket.ticketType !== "LAYAWAY_PAYMENT",
  );
  const periodMovements = useMemo(
    () =>
      validPeriod
        ? movements.filter(
            (movement) =>
              inPeriod(movement.createdAtIso) &&
              (selectedBranch === "ALL" ||
                movement.sourceBranch === selectedBranch ||
                movement.destinationBranch === selectedBranch),
          )
        : [],
    // The helpers intentionally derive from the current period and branch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dateFrom, dateTo, movements, selectedBranch],
  );

  const totalSales = saleTickets.reduce(
    (sum, ticket) => sum + ticket.total,
    0,
  );
  const totalNetSales = saleTickets.reduce(
    (sum, ticket) => sum + getTicketTaxSummary(ticket).net,
    0,
  );
  const totalVat = saleTickets.reduce(
    (sum, ticket) => sum + getTicketTaxSummary(ticket).vat,
    0,
  );
  const totalCollected = activePeriodTickets.reduce(
    (sum, ticket) =>
      sum +
      ticket.payments.reduce(
        (paymentSum, payment) => paymentSum + payment.amount,
        0,
      ),
    0,
  );
  const totalPending = saleTickets.reduce(
    (sum, ticket) => sum + ticket.balanceDue,
    0,
  );
  const totalDiscounts = saleTickets.reduce(
    (sum, ticket) => sum + ticket.discountAmount,
    0,
  );
  const totalSpare = saleTickets.reduce(
    (sum, ticket) => sum + getTicketSpare(ticket, products),
    0,
  );
  const refundedAmount = cancelledSaleTickets.reduce(
    (sum, ticket) => sum + (ticket.refundAmount ?? ticket.amountPaid),
    0,
  );
  const soldUnits = saleTickets.reduce(
    (sum, ticket) =>
      sum +
      ticket.products.reduce(
        (productSum, product) => productSum + product.quantity,
        0,
      ),
    0,
  );
  const addedUnits = periodMovements
    .filter((movement) => movement.direction === "ADD")
    .reduce((sum, movement) => sum + movement.quantity, 0);
  const removedUnits = periodMovements
    .filter((movement) => movement.direction === "REMOVE")
    .reduce((sum, movement) => sum + movement.quantity, 0);
  const transferredUnits = periodMovements
    .filter((movement) => movement.direction === "TRANSFER")
    .reduce((sum, movement) => sum + movement.quantity, 0);

  const sellerRows = Array.from(
    saleTickets
      .flatMap((ticket) => ticket.sellerSales)
      .reduce<
        Map<string, { Vendedor: string; Tickets: number; Venta: number }>
      >((summary, sale) => {
        const current = summary.get(sale.sellerId) ?? {
          Vendedor: sale.sellerName,
          Tickets: 0,
          Venta: 0,
        };
        summary.set(sale.sellerId, {
          ...current,
          Venta: current.Venta + sale.amount,
        });
        return summary;
      }, new Map())
      .entries(),
  )
    .map(([sellerId, row]) => ({
      ...row,
      Tickets: saleTickets.filter((ticket) =>
        ticket.sellerSales.some((sale) => sale.sellerId === sellerId),
      ).length,
    }))
    .sort((left, right) => right.Venta - left.Venta);

  const productRows = Array.from(
    saleTickets
      .flatMap((ticket) => {
        const ticketTax = getTicketTaxSummary(ticket);
        const discountRatio =
          ticket.subtotal > 0 ? ticket.total / ticket.subtotal : 1;
        return ticket.products.map((product) => {
          const gross = roundCurrency(product.total * discountRatio);
          const net =
            typeof product.netTotal === "number"
              ? product.netTotal
              : ticket.total > 0
                ? roundCurrency(gross * (ticketTax.net / ticket.total))
                : 0;
          return {
            ...product,
            reportGross: gross,
            reportNet: net,
            reportVat: roundCurrency(gross - net),
          };
        });
      })
      .reduce<
        Map<
          string,
          {
            Producto: string;
            Unidades: number;
            "Precio completo": number;
            "Precio sin IVA": number;
            IVA: number;
          }
        >
      >((summary, product) => {
        const current = summary.get(product.productId) ?? {
          Producto: product.name,
          Unidades: 0,
          "Precio completo": 0,
          "Precio sin IVA": 0,
          IVA: 0,
        };
        summary.set(product.productId, {
          Producto: product.name,
          Unidades: current.Unidades + product.quantity,
          "Precio completo":
            current["Precio completo"] + product.reportGross,
          "Precio sin IVA":
            current["Precio sin IVA"] + product.reportNet,
          IVA: current.IVA + product.reportVat,
        });
        return summary;
      }, new Map())
      .values(),
  ).sort((left, right) => right.Unidades - left.Unidades);

  const paymentRows = paymentMethods.map((method) => ({
    "Método de pago": method.label,
    Cobrado: activePeriodTickets.reduce(
      (sum, ticket) =>
        sum +
        ticket.payments.reduce(
          (paymentSum, payment) =>
            paymentSum +
            (payment.methodId === method.id ? payment.amount : 0),
          0,
        ),
      0,
    ),
  }));

  const reportBranches =
    selectedBranch === "ALL" ? branchOptions : [selectedBranch];
  const branchRows = reportBranches.map((branch) => {
    const branchActiveTickets = activePeriodTickets.filter(
      (ticket) => ticketBranch(ticket) === branch,
    );
    const branchSales = branchActiveTickets.filter(
      (ticket) => ticket.ticketType !== "LAYAWAY_PAYMENT",
    );
    const branchCancelled = periodTickets.filter(
      (ticket) =>
        ticketBranch(ticket) === branch &&
        ticket.status === "REFUNDED" &&
        ticket.ticketType !== "LAYAWAY_PAYMENT",
    );
    const branchMovements = periodMovements.filter(
      (movement) =>
        movement.sourceBranch === branch ||
        movement.destinationBranch === branch,
    );
    return {
      Sucursal: branch,
      Tickets: branchSales.length,
      Cancelaciones: branchCancelled.length,
      Venta: branchSales.reduce((sum, ticket) => sum + ticket.total, 0),
      "Venta sin IVA": branchSales.reduce(
        (sum, ticket) => sum + getTicketTaxSummary(ticket).net,
        0,
      ),
      IVA: branchSales.reduce(
        (sum, ticket) => sum + getTicketTaxSummary(ticket).vat,
        0,
      ),
      Cobrado: branchActiveTickets.reduce(
        (sum, ticket) =>
          sum +
          ticket.payments.reduce(
            (paymentSum, payment) => paymentSum + payment.amount,
            0,
          ),
        0,
      ),
      Pendiente: branchSales.reduce(
        (sum, ticket) => sum + ticket.balanceDue,
        0,
      ),
      Descuentos: branchSales.reduce(
        (sum, ticket) => sum + ticket.discountAmount,
        0,
      ),
      Entradas: branchMovements
        .filter(
          (movement) =>
            movement.direction === "ADD" &&
            movement.sourceBranch === branch,
        )
        .reduce((sum, movement) => sum + movement.quantity, 0),
      Bajas: branchMovements
        .filter(
          (movement) =>
            movement.direction === "REMOVE" &&
            movement.sourceBranch === branch,
        )
        .reduce((sum, movement) => sum + movement.quantity, 0),
      Transferencias: branchMovements
        .filter((movement) => movement.direction === "TRANSFER")
        .reduce((sum, movement) => sum + movement.quantity, 0),
    };
  });

  const ticketRows = periodTickets.map((ticket) => ({
    Fecha: getBusinessDate(ticket.createdAtIso),
    Folio: ticket.id,
    Sucursal: ticketBranch(ticket),
    Cliente: ticket.clientName,
    Vendedor: ticket.sellerSummary,
    Tipo:
      ticket.ticketType === "LAYAWAY_PAYMENT" ? "Abono" : "Venta",
    Estado: ticket.status === "COMPLETED" ? "Activo" : "Cancelado",
    Productos: ticket.products
      .map((product) => `${product.quantity} × ${product.name}`)
      .join(" | "),
    Subtotal: ticket.subtotal,
    Descuento: ticket.discountAmount,
    Total: ticket.total,
    "Precio sin IVA": getTicketTaxSummary(ticket).net,
    IVA: getTicketTaxSummary(ticket).vat,
    Cobrado: ticket.payments.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    ),
    Saldo: ticket.ticketType === "LAYAWAY_PAYMENT" ? 0 : ticket.balanceDue,
    SPARE: getTicketSpare(ticket, products),
  }));

  const movementRows = periodMovements.map((movement) => ({
    Fecha: getBusinessDate(movement.createdAtIso),
    Folio: movement.folio,
    Tipo: movementTypeLabel(movement),
    Producto: movement.productName,
    Origen: movement.sourceBranch,
    Destino: movement.destinationBranch ?? "",
    Cantidad: movement.quantity,
    Existencia: `${movement.previousStock} → ${movement.newStock}`,
    Motivo: movement.reason,
    Comentario: movement.comment,
    Cliente: movement.settledClientName ?? "",
    Vendedores: (movement.settledSellerNames ?? []).join(" / "),
  }));

  const summaryRows = [
    { Concepto: "Empresa", Valor: receiptSettings.companyName },
    {
      Concepto: "Sucursal",
      Valor:
        selectedBranch === "ALL" ? "Todas las sucursales" : selectedBranch,
    },
    { Concepto: "Periodo", Valor: `${dateFrom} al ${dateTo}` },
    { Concepto: "Tickets de venta", Valor: saleTickets.length },
    { Concepto: "Cancelaciones", Valor: cancelledSaleTickets.length },
    { Concepto: "Venta total MXN", Valor: totalSales },
    { Concepto: "Venta sin IVA MXN", Valor: totalNetSales },
    { Concepto: "IVA incluido MXN", Valor: totalVat },
    { Concepto: "Cobrado MXN", Valor: totalCollected },
    { Concepto: "Saldo pendiente MXN", Valor: totalPending },
    { Concepto: "Descuentos MXN", Valor: totalDiscounts },
    { Concepto: "Devoluciones MXN", Valor: refundedAmount },
    { Concepto: "SPARE MXN", Valor: totalSpare },
    { Concepto: "Unidades vendidas", Valor: soldUnits },
    { Concepto: "Entradas de inventario", Valor: addedUnits },
    { Concepto: "Bajas de inventario", Valor: removedUnits },
    { Concepto: "Unidades transferidas", Valor: transferredUnits },
  ];

  const filename = `x-report-ejecutivo-${slugify(
    selectedBranch === "ALL" ? "todas-sucursales" : selectedBranch,
  )}-${dateFrom}-${dateTo}`;

  const exportExcel = async () => {
    if (!validPeriod) {
      toast.error("La fecha inicial no puede ser posterior a la fecha final.");
      return;
    }
    setExporting("EXCEL");
    try {
      const exportLanguage = getStoredInterfaceLanguage();
      const XLSX = await import("xlsx");
      const workbook = XLSX.utils.book_new();
      const appendSheet = (
        name: string,
        rows: Array<Record<string, string | number>>,
      ) => {
        const worksheet = XLSX.utils.json_to_sheet(
          rows.length > 0
            ? rows.map((row) => translateInterfaceRecord(row, exportLanguage))
            : [translateInterfaceRecord({ Resultado: "Sin operaciones" }, exportLanguage)],
        );
        if (worksheet["!ref"])
          worksheet["!autofilter"] = { ref: worksheet["!ref"] };
        worksheet["!cols"] = Array.from({ length: 15 }, () => ({ wch: 22 }));
        XLSX.utils.book_append_sheet(workbook, worksheet, translateInterfaceText(name, exportLanguage));
      };
      appendSheet("Resumen ejecutivo", summaryRows);
      appendSheet("Sucursales", branchRows);
      appendSheet("Tickets", ticketRows);
      appendSheet("Vendedores", sellerRows);
      appendSheet("Productos", productRows);
      appendSheet("Métodos de pago", paymentRows);
      appendSheet("Inventario", movementRows);
      XLSX.writeFile(workbook, `${filename}.xlsx`, { compression: true });
      toast.success("Reporte ejecutivo descargado en Excel.");
    } catch {
      toast.error("No fue posible generar el reporte de Excel.");
    } finally {
      setExporting(null);
    }
  };

  const exportPdf = async () => {
    if (!validPeriod) {
      toast.error("La fecha inicial no puede ser posterior a la fecha final.");
      return;
    }
    setExporting("PDF");
    try {
      const exportLanguage = getStoredInterfaceLanguage();
      const tr = (value: string) => translateInterfaceText(value, exportLanguage);
      const [{ jsPDF }, { autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.setTextColor(40, 33, 28);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(19);
      doc.text(receiptSettings.companyName.toUpperCase(), 36, 36);
      doc.setFontSize(15);
      doc.text(exportLanguage === "EN" ? "EXECUTIVE OPERATIONS X-REPORT" : "X-REPORT EJECUTIVO DE OPERACIONES", 36, 58);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(
        `${selectedBranch === "ALL" ? tr("Todas las sucursales") : selectedBranch} · ${dateFrom} ${exportLanguage === "EN" ? "to" : "al"} ${dateTo}`,
        36,
        75,
      );
      doc.text(
        `${exportLanguage === "EN" ? "Generated" : "Generado"} ${new Date().toLocaleString(exportLanguage === "EN" ? "en-US" : "es-MX")} · ${receiptSettings.address}`,
        36,
        88,
      );
      doc.setDrawColor(174, 139, 104);
      doc.line(36, 98, pageWidth - 36, 98);

      let cursorY = 112;
      const tableDoc = doc as typeof doc & {
        lastAutoTable?: { finalY: number };
      };
      const addSection = (
        title: string,
        headers: string[],
        rows: Array<Array<string | number>>,
      ) => {
        if (cursorY > 500) {
          doc.addPage();
          cursorY = 36;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(tr(title), 36, cursorY);
        autoTable(doc, {
          startY: cursorY + 7,
          head: [headers.map(tr)],
          body: rows.length > 0
            ? rows.map((row) => row.map((value) => typeof value === "string" ? tr(value) : value))
            : [[tr("Sin operaciones")]],
          theme: "grid",
          margin: { left: 36, right: 36 },
          styles: {
            font: "helvetica",
            fontSize: 6.5,
            cellPadding: 3,
            textColor: [42, 36, 31],
            lineColor: [214, 201, 190],
            lineWidth: 0.3,
          },
          headStyles: {
            fillColor: [83, 67, 55],
            textColor: [255, 255, 255],
            fontStyle: "bold",
          },
          alternateRowStyles: { fillColor: [249, 246, 243] },
        });
        cursorY = (tableDoc.lastAutoTable?.finalY ?? cursorY + 35) + 18;
      };

      addSection(
        "Resumen ejecutivo",
        ["Venta", "Sin IVA", "IVA", "Cobrado", "Pendiente", "Descuentos", "SPARE", "Tickets", "Cancelaciones", "Unidades", "Entradas", "Bajas", "Transferencias"],
        [[
          formatCurrency(totalSales),
          formatCurrency(totalNetSales),
          formatCurrency(totalVat),
          formatCurrency(totalCollected),
          formatCurrency(totalPending),
          formatCurrency(totalDiscounts),
          formatCurrency(totalSpare),
          saleTickets.length,
          cancelledSaleTickets.length,
          soldUnits,
          addedUnits,
          removedUnits,
          transferredUnits,
        ]],
      );
      addSection(
        "Operación por sucursal",
        ["Sucursal", "Tickets", "Cancel.", "Venta", "Sin IVA", "IVA", "Cobrado", "Pendiente", "Descuentos", "Entradas", "Bajas", "Transf."],
        branchRows.map((row) => [
          row.Sucursal,
          row.Tickets,
          row.Cancelaciones,
          formatCurrency(row.Venta),
          formatCurrency(row["Venta sin IVA"]),
          formatCurrency(row.IVA),
          formatCurrency(row.Cobrado),
          formatCurrency(row.Pendiente),
          formatCurrency(row.Descuentos),
          row.Entradas,
          row.Bajas,
          row.Transferencias,
        ]),
      );
      addSection(
        "Vendedores",
        ["Vendedor", "Tickets", "Venta"],
        sellerRows.map((row) => [
          row.Vendedor,
          row.Tickets,
          formatCurrency(row.Venta),
        ]),
      );
      addSection(
        "Productos y servicios",
        ["Producto / servicio", "Unidades", "Precio completo", "Sin IVA", "IVA"],
        productRows.map((row) => [
          row.Producto,
          row.Unidades,
          formatCurrency(row["Precio completo"]),
          formatCurrency(row["Precio sin IVA"]),
          formatCurrency(row.IVA),
        ]),
      );
      addSection(
        "Métodos de pago",
        ["Método", "Cobrado"],
        paymentRows.map((row) => [
          row["Método de pago"],
          formatCurrency(row.Cobrado),
        ]),
      );
      addSection(
        "Detalle de tickets",
        ["Fecha", "Folio", "Sucursal", "Cliente", "Vendedor", "Tipo", "Estado", "Total", "Sin IVA", "IVA", "Cobrado", "Saldo", "SPARE"],
        ticketRows.map((row) => [
          row.Fecha,
          row.Folio,
          row.Sucursal,
          row.Cliente,
          row.Vendedor,
          row.Tipo,
          row.Estado,
          formatCurrency(row.Total),
          formatCurrency(row["Precio sin IVA"]),
          formatCurrency(row.IVA),
          formatCurrency(row.Cobrado),
          formatCurrency(row.Saldo),
          formatCurrency(row.SPARE),
        ]),
      );
      addSection(
        "Movimientos de inventario",
        ["Fecha", "Folio", "Tipo", "Producto", "Origen", "Destino", "Cantidad", "Existencia", "Motivo", "Cliente"],
        movementRows.map((row) => [
          row.Fecha,
          row.Folio,
          row.Tipo,
          row.Producto,
          row.Origen,
          row.Destino,
          row.Cantidad,
          row.Existencia,
          row.Motivo,
          row.Cliente,
        ]),
      );
      doc.save(`${filename}.pdf`);
      toast.success("Reporte ejecutivo descargado en PDF.");
    } catch {
      toast.error("No fue posible generar el reporte PDF.");
    } finally {
      setExporting(null);
    }
  };

  return (
    <Card className="x-report-executive-export-card">
      <CardContent>
        <div className="x-report-export-heading">
          <div>
            <span className="section-kicker">DESCARGA EJECUTIVA</span>
            <h2>Reporte general de operaciones</h2>
            <p>
              El mismo periodo y sucursal se aplican al Excel y al PDF.
            </p>
          </div>
          <Download size={23} />
        </div>
        <div className="x-report-export-controls">
          <div className="field-stack">
            <Label>Desde</Label>
            <div className="x-report-export-date">
              <DatePicker
                value={dateFrom}
                onChange={(value) => setDateFrom(value || getBusinessToday())}
                placeholder="Fecha inicial"
              />
            </div>
          </div>
          <div className="field-stack">
            <Label>Hasta</Label>
            <div className="x-report-export-date">
              <DatePicker
                value={dateTo}
                onChange={(value) => setDateTo(value || getBusinessToday())}
                placeholder="Fecha final"
              />
            </div>
          </div>
          <div className="field-stack">
            <Label>Sucursal</Label>
            <div className="x-report-export-date">
              <Store size={16} />
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger aria-label="Sucursal del reporte ejecutivo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas las sucursales</SelectItem>
                  {branchOptions.map((branch) => (
                    <SelectItem key={branch} value={branch}>
                      {branch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="x-report-export-actions">
            <Button
              type="button"
              variant="outline"
              onClick={exportExcel}
              disabled={!validPeriod || Boolean(exporting)}
            >
              <FileSpreadsheet size={16} />
              {exporting === "EXCEL" ? "Generando…" : "Excel"}
            </Button>
            <Button
              type="button"
              onClick={exportPdf}
              disabled={!validPeriod || Boolean(exporting)}
            >
              <FileText size={16} />
              {exporting === "PDF" ? "Generando…" : "PDF"}
            </Button>
          </div>
        </div>
        {!validPeriod && (
          <p className="x-report-export-error">
            La fecha inicial debe ser igual o anterior a la fecha final.
          </p>
        )}
        <div className="x-report-export-preview">
          <span>
            <small>VENTA</small>
            <strong>{formatCurrency(totalSales)}</strong>
          </span>
          <span>
            <small>COBRADO</small>
            <strong>{formatCurrency(totalCollected)}</strong>
          </span>
          <span>
            <small>SIN IVA</small>
            <strong>{formatCurrency(totalNetSales)}</strong>
          </span>
          <span>
            <small>IVA</small>
            <strong>{formatCurrency(totalVat)}</strong>
          </span>
          <span>
            <small>SALDO</small>
            <strong>{formatCurrency(totalPending)}</strong>
          </span>
          <span>
            <small>OPERACIONES</small>
            <strong>{saleTickets.length + periodMovements.length}</strong>
          </span>
          <Badge variant="outline">
            {selectedBranch === "ALL" ? "TODAS" : selectedBranch}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
