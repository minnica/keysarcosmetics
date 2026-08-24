import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  FileText,
  PackagePlus,
  Pencil,
  Plus,
  Printer,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from "@cosmetics/ui";
import type { BranchInventory, Product } from "../types";

type OrderStep = "SCOPE" | "REVIEW" | "APPROVED";
type OrderScope = "TOTAL" | "BRANCH";

interface InventoryOrderLine {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  branch: string;
  currentStock: number;
  maximumStock: number;
  quantity: number;
  manual: boolean;
}

interface InventoryOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  branchInventory: BranchInventory;
  defaultBranches: string[];
  isMasterCode: (code: string) => boolean;
}

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export function InventoryOrderDialog({
  open,
  onOpenChange,
  products,
  branchInventory,
  defaultBranches,
  isMasterCode,
}: InventoryOrderDialogProps) {
  const branches = useMemo(
    () => Object.keys(branchInventory),
    [branchInventory],
  );
  const physicalProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          product.active &&
          product.kind === "PRODUCT" &&
          product.stockMax !== null,
      ),
    [products],
  );
  const [step, setStep] = useState<OrderStep>("SCOPE");
  const [scope, setScope] = useState<OrderScope>("TOTAL");
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [lines, setLines] = useState<InventoryOrderLine[]>([]);
  const [folio, setFolio] = useState("");
  const [approvalCode, setApprovalCode] = useState("");
  const [manualProductId, setManualProductId] = useState("");
  const [manualBranch, setManualBranch] = useState("");
  const [manualQuantity, setManualQuantity] = useState(1);

  useEffect(() => {
    if (!open) return;
    const initialBranches = defaultBranches.filter((branch) =>
      branches.includes(branch),
    );
    setStep("SCOPE");
    setScope("TOTAL");
    setSelectedBranches(
      initialBranches.length > 0 ? initialBranches : branches.slice(0, 1),
    );
    setLines([]);
    setFolio("");
    setApprovalCode("");
    setManualProductId(physicalProducts[0]?.id ?? "");
    setManualBranch(initialBranches[0] ?? branches[0] ?? "");
    setManualQuantity(1);
  }, [branches, defaultBranches, open, physicalProducts]);

  const orderBranches = scope === "TOTAL" ? branches : selectedBranches;
  const totalUnits = lines.reduce((sum, line) => sum + line.quantity, 0);
  const totalProducts = new Set(lines.map((line) => line.productId)).size;

  const toggleBranch = (branch: string) => {
    setSelectedBranches((current) => {
      if (current.includes(branch)) {
        if (current.length === 1) {
          toast.info("El pedido debe conservar al menos una sucursal.");
          return current;
        }
        return current.filter((candidate) => candidate !== branch);
      }
      return [...current, branch];
    });
  };

  const generateSuggestedOrder = () => {
    if (orderBranches.length === 0) {
      toast.error("Selecciona al menos una sucursal.");
      return;
    }
    const suggestedLines = orderBranches.flatMap((branch) =>
      physicalProducts.flatMap((product) => {
        if (!product.branches.includes(branch) || product.stockMax === null)
          return [];
        const currentStock = branchInventory[branch]?.[product.id] ?? 0;
        const quantity = Math.max(0, product.stockMax - currentStock);
        return quantity > 0
          ? [
              {
                id: crypto.randomUUID(),
                productId: product.id,
                productName: product.name,
                sku: product.sku,
                branch,
                currentStock,
                maximumStock: product.stockMax,
                quantity,
                manual: false,
              },
            ]
          : [];
      }),
    );
    if (suggestedLines.length === 0) {
      toast.info(
        "Las sucursales elegidas ya se encuentran en su stock máximo.",
      );
      return;
    }
    setLines(suggestedLines);
    setFolio(`PED-${Date.now().toString(36).toUpperCase()}`);
    setManualBranch(orderBranches[0] ?? branches[0] ?? "");
    setStep("REVIEW");
  };

  const updateLineQuantity = (id: string, quantity: number) => {
    setLines((current) =>
      current.map((line) =>
        line.id === id
          ? { ...line, quantity: Math.max(1, Math.floor(quantity || 1)) }
          : line,
      ),
    );
  };

  const addManualLine = () => {
    const product = physicalProducts.find(
      (candidate) => candidate.id === manualProductId,
    );
    if (!product || !manualBranch || manualQuantity < 1) {
      toast.error("Selecciona producto, sucursal y una cantidad válida.");
      return;
    }
    const currentStock = branchInventory[manualBranch]?.[product.id] ?? 0;
    setLines((current) => {
      const existing = current.find(
        (line) =>
          line.productId === product.id && line.branch === manualBranch,
      );
      if (existing) {
        return current.map((line) =>
          line.id === existing.id
            ? {
                ...line,
                quantity: line.quantity + manualQuantity,
                manual: true,
              }
            : line,
        );
      }
      return [
        ...current,
        {
          id: crypto.randomUUID(),
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          branch: manualBranch,
          currentStock,
          maximumStock: product.stockMax ?? currentStock,
          quantity: manualQuantity,
          manual: true,
        },
      ];
    });
    setManualQuantity(1);
    toast.success(`${product.name} se añadió manualmente al pedido.`);
  };

  const approveOrder = () => {
    if (lines.length === 0) {
      toast.error("El pedido no contiene productos.");
      return;
    }
    if (!isMasterCode(approvalCode)) {
      toast.error("Código master incorrecto para aprobar el pedido.");
      return;
    }
    setApprovalCode("");
    setStep("APPROVED");
    toast.success(`${folio} aprobado con ${totalUnits} piezas.`);
  };

  const exportOrderPdf = async () => {
    try {
      const [{ jsPDF }, { autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("KEYSAR COSMETICS", 36, 38);
      doc.setFontSize(12);
      doc.text(`Pedido de inventario ${folio}`, 36, 58);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(
        `Aprobado ${new Date().toLocaleString("es-MX")} · ${totalUnits} piezas`,
        36,
        74,
      );
      autoTable(doc, {
        startY: 90,
        head: [["SKU", "Producto", "Sucursal", "Actual", "Máximo", "Pedido"]],
        body: lines.map((line) => [
          line.sku,
          line.productName,
          line.branch,
          String(line.currentStock),
          String(line.maximumStock),
          String(line.quantity),
        ]),
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 5 },
        headStyles: { fillColor: [83, 67, 55] },
      });
      doc.save(`${folio.toLocaleLowerCase("es-MX")}.pdf`);
      toast.success("PDF del pedido generado.");
    } catch {
      toast.error("No fue posible generar el PDF del pedido.");
    }
  };

  const printOrder = () => {
    const printWindow = window.open("", "_blank", "width=760,height=900");
    if (!printWindow) {
      toast.error("El navegador bloqueó la ventana de impresión.");
      return;
    }
    const rows = lines
      .map(
        (line) => `<tr><td>${escapeHtml(line.sku)}</td><td>${escapeHtml(line.productName)}</td><td>${escapeHtml(line.branch)}</td><td>${line.currentStock}</td><td>${line.maximumStock}</td><td><strong>${line.quantity}</strong></td></tr>`,
      )
      .join("");
    printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(folio)}</title><style>body{font-family:Arial,sans-serif;color:#171513;padding:28px}h1{font-size:22px;margin:0}h2{font-size:15px;margin:6px 0 4px}p{font-size:11px;color:#665f59}table{width:100%;border-collapse:collapse;margin-top:20px;font-size:11px}th,td{border:1px solid #bdb4ac;padding:7px;text-align:left}th{background:#2d2926;color:white}@media print{button{display:none}}</style></head><body><h1>KEYSAR COSMETICS</h1><h2>Pedido de inventario ${escapeHtml(folio)}</h2><p>${new Date().toLocaleString("es-MX")} · ${totalUnits} piezas · ${totalProducts} productos</p><table><thead><tr><th>SKU</th><th>Producto</th><th>Sucursal</th><th>Actual</th><th>Máximo</th><th>Pedido</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>{window.print();window.close();}</script></body></html>`);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="inventory-order-dialog sm:max-w-[920px]">
        <DialogHeader>
          <DialogTitle>Generar pedido de inventario</DialogTitle>
          <DialogDescription>
            Completa cada sucursal hasta el stock máximo configurado y autoriza
            cualquier ajuste manual antes de emitir el pedido.
          </DialogDescription>
        </DialogHeader>

        <div className="inventory-order-steps" aria-label="Pasos del pedido">
          <span className={step === "SCOPE" ? "is-active" : "is-complete"}>
            1 · Alcance
          </span>
          <span
            className={
              step === "REVIEW"
                ? "is-active"
                : step === "APPROVED"
                  ? "is-complete"
                  : ""
            }
          >
            2 · Editar y aprobar
          </span>
          <span className={step === "APPROVED" ? "is-active" : ""}>
            3 · Emitir
          </span>
        </div>

        {step === "SCOPE" && (
          <div className="inventory-order-scope">
            <button
              type="button"
              className={scope === "TOTAL" ? "is-active" : ""}
              onClick={() => setScope("TOTAL")}
            >
              <PackagePlus size={21} />
              <span>
                <strong>Pedido total</strong>
                <small>Todas las sucursales hasta su máximo.</small>
              </span>
            </button>
            <button
              type="button"
              className={scope === "BRANCH" ? "is-active" : ""}
              onClick={() => setScope("BRANCH")}
            >
              <PackagePlus size={21} />
              <span>
                <strong>Por sucursal</strong>
                <small>Elige una o varias ubicaciones.</small>
              </span>
            </button>
            {scope === "BRANCH" && (
              <div className="inventory-order-branches">
                {branches.map((branch) => (
                  <button
                    key={branch}
                    type="button"
                    className={
                      selectedBranches.includes(branch) ? "is-active" : ""
                    }
                    onClick={() => toggleBranch(branch)}
                    aria-pressed={selectedBranches.includes(branch)}
                  >
                    {branch}
                  </button>
                ))}
              </div>
            )}
            <div className="inventory-order-rule">
              <CheckCircle2 size={18} />
              <span>
                <strong>Primera propuesta automática</strong>
                <small>
                  Cantidad = stock máximo menos existencia actual. Los productos
                  completos no se incluyen.
                </small>
              </span>
            </div>
          </div>
        )}

        {(step === "REVIEW" || step === "APPROVED") && (
          <div className="inventory-order-review">
            <div className="inventory-order-summary">
              <span>
                <small>FOLIO</small>
                <strong>{folio}</strong>
              </span>
              <Badge variant="outline">{lines.length} partidas</Badge>
              <Badge>{totalUnits} piezas</Badge>
            </div>
            <div className="table-scroll inventory-order-table">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PRODUCTO</TableHead>
                    <TableHead>SUCURSAL</TableHead>
                    <TableHead>ACTUAL / MÁXIMO</TableHead>
                    <TableHead>PEDIDO</TableHead>
                    {step === "REVIEW" && <TableHead>ACCIÓN</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        <strong>{line.productName}</strong>
                        <small className="inventory-order-sku">{line.sku}</small>
                      </TableCell>
                      <TableCell>{line.branch}</TableCell>
                      <TableCell>
                        {line.currentStock} / {line.maximumStock}
                        {line.manual && <Badge variant="outline">MANUAL</Badge>}
                      </TableCell>
                      <TableCell>
                        {step === "REVIEW" ? (
                          <Input
                            type="number"
                            min="1"
                            value={line.quantity}
                            aria-label={`Cantidad de ${line.productName} en ${line.branch}`}
                            onChange={(event) =>
                              updateLineQuantity(line.id, Number(event.target.value))
                            }
                          />
                        ) : (
                          <strong>{line.quantity}</strong>
                        )}
                      </TableCell>
                      {step === "REVIEW" && (
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Borrar ${line.productName} de ${line.branch}`}
                            onClick={() =>
                              setLines((current) =>
                                current.filter((candidate) => candidate.id !== line.id),
                              )
                            }
                          >
                            <Trash2 size={15} />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {step === "REVIEW" && (
              <>
                <div className="inventory-order-manual">
                  <span>
                    <Pencil size={17} />
                    <strong>Editar pedido y añadir manualmente</strong>
                  </span>
                  <div>
                    <Select
                      value={manualProductId}
                      onValueChange={setManualProductId}
                    >
                      <SelectTrigger aria-label="Producto manual">
                        <SelectValue placeholder="Producto" />
                      </SelectTrigger>
                      <SelectContent>
                        {physicalProducts.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={manualBranch} onValueChange={setManualBranch}>
                      <SelectTrigger aria-label="Sucursal manual">
                        <SelectValue placeholder="Sucursal" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem key={branch} value={branch}>
                            {branch}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="1"
                      value={manualQuantity}
                      aria-label="Cantidad manual"
                      onChange={(event) =>
                        setManualQuantity(Math.max(1, Number(event.target.value)))
                      }
                    />
                    <Button type="button" variant="outline" onClick={addManualLine}>
                      <Plus size={15} /> Añadir
                    </Button>
                  </div>
                </div>
                <div className="inventory-order-approval">
                  <ShieldCheck size={20} />
                  <div>
                    <Label htmlFor="inventory-order-code">Aprobación master</Label>
                    <Input
                      id="inventory-order-code"
                      type="password"
                      value={approvalCode}
                      onChange={(event) => setApprovalCode(event.target.value)}
                      placeholder="Código master"
                    />
                  </div>
                  <Button type="button" onClick={approveOrder} disabled={!approvalCode}>
                    <CheckCircle2 size={16} /> Aprobar pedido
                  </Button>
                </div>
              </>
            )}

            {step === "APPROVED" && (
              <div className="inventory-order-approved">
                <CheckCircle2 size={22} />
                <span>
                  <strong>Pedido aprobado</strong>
                  <small>
                    Listo para descargar o enviar a la impresora. No modifica
                    existencias hasta registrar la entrada en Movimientos.
                  </small>
                </span>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "SCOPE" && (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={generateSuggestedOrder}>
                <PackagePlus size={16} /> Generar propuesta
              </Button>
            </>
          )}
          {step === "REVIEW" && (
            <Button type="button" variant="outline" onClick={() => setStep("SCOPE")}>
              Cambiar alcance
            </Button>
          )}
          {step === "APPROVED" && (
            <>
              <Button type="button" variant="outline" onClick={exportOrderPdf}>
                <FileText size={16} /> Descargar PDF
              </Button>
              <Button type="button" onClick={printOrder}>
                <Printer size={16} /> Imprimir pedido
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
