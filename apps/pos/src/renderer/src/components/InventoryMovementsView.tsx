import { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Ban,
  CalendarDays,
  CheckCircle2,
  ClipboardPlus,
  Filter,
  PackageCheck,
  PackageSearch,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  DatePicker,
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
import type {
  BranchInventory,
  InventoryAdjustmentBatch,
  InventoryMovement,
  InventoryMovementDirection,
  InventoryMovementDraft,
  InventoryMovementReason,
  OwedProductRecord,
  Product,
} from "../types";

interface InventoryMovementsViewProps {
  products: Product[];
  reasons: InventoryMovementReason[];
  movements: InventoryMovement[];
  branchInventory: BranchInventory;
  owedProducts: OwedProductRecord[];
  batches: InventoryAdjustmentBatch[];
  onRequestBatch: (adjustments: InventoryMovementDraft[]) => void;
  onApproveBatch: (batchId: string) => void;
  onCancelBatch: (batchId: string) => void;
  onFulfillOwedProduct: (owedProductId: string) => void;
}

interface PendingAdjustment extends InventoryMovementDraft {
  draftId: string;
}
type MovementFilter = "ALL" | InventoryMovementDirection;
const movementLabels: Record<InventoryMovementDirection, string> = {
  ADD: "SUMA",
  REMOVE: "BAJA",
  TRANSFER: "TRANSFERENCIA",
};
const stockKey = (branch: string, productId: string) =>
  `${branch}:${productId}`;

export function InventoryMovementsView({
  products,
  reasons,
  movements,
  branchInventory,
  owedProducts,
  batches,
  onRequestBatch,
  onApproveBatch,
  onCancelBatch,
  onFulfillOwedProduct,
}: InventoryMovementsViewProps) {
  const stockProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          product.active &&
          product.kind === "PRODUCT" &&
          product.stock !== null,
      ),
    [products],
  );
  const branches = Object.keys(branchInventory);
  const [productId, setProductId] = useState(stockProducts[0]?.id ?? "");
  const [direction, setDirection] = useState<InventoryMovementDirection>("ADD");
  const [sourceBranch, setSourceBranch] = useState(branches[0] ?? "Polanco");
  const [destinationBranch, setDestinationBranch] = useState(
    branches[1] ?? "Satélite",
  );
  const [reasonId, setReasonId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [comment, setComment] = useState("");
  const [pendingAdjustments, setPendingAdjustments] = useState<
    PendingAdjustment[]
  >([]);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [movementFilter, setMovementFilter] = useState<MovementFilter>("ALL");
  const activeReasons = reasons.filter((reason) => reason.active);
  const pendingProductCount = new Set(
    pendingAdjustments.map((adjustment) => adjustment.productId),
  ).size;

  const runningStock = useMemo(() => {
    const stock = new Map<string, number>();
    branches.forEach((branch) =>
      stockProducts.forEach((product) =>
        stock.set(
          stockKey(branch, product.id),
          branchInventory[branch]?.[product.id] ?? 0,
        ),
      ),
    );
    pendingAdjustments
      .filter((adjustment) => adjustment.draftId !== editingDraftId)
      .forEach((adjustment) => {
        const sourceKey = stockKey(
          adjustment.sourceBranch,
          adjustment.productId,
        );
        const source = stock.get(sourceKey) ?? 0;
        if (adjustment.direction === "ADD")
          stock.set(sourceKey, source + adjustment.quantity);
        if (adjustment.direction === "REMOVE")
          stock.set(sourceKey, source - adjustment.quantity);
        if (
          adjustment.direction === "TRANSFER" &&
          adjustment.destinationBranch
        ) {
          const destinationKey = stockKey(
            adjustment.destinationBranch,
            adjustment.productId,
          );
          stock.set(sourceKey, source - adjustment.quantity);
          stock.set(
            destinationKey,
            (stock.get(destinationKey) ?? 0) + adjustment.quantity,
          );
        }
      });
    return stock;
  }, [
    branchInventory,
    branches,
    editingDraftId,
    pendingAdjustments,
    stockProducts,
  ]);

  const availableSource =
    runningStock.get(stockKey(sourceBranch, productId)) ?? 0;
  const availableDestination =
    runningStock.get(stockKey(destinationBranch, productId)) ?? 0;
  const sourceResult =
    direction === "ADD"
      ? availableSource + quantity
      : availableSource - quantity;
  const destinationResult = availableDestination + quantity;

  const queueRows = useMemo(() => {
    const stock = new Map<string, number>();
    branches.forEach((branch) =>
      stockProducts.forEach((product) =>
        stock.set(
          stockKey(branch, product.id),
          branchInventory[branch]?.[product.id] ?? 0,
        ),
      ),
    );
    return pendingAdjustments.map((adjustment) => {
      const product = stockProducts.find(
        (item) => item.id === adjustment.productId,
      );
      const sourceKey = stockKey(adjustment.sourceBranch, adjustment.productId);
      const previousStock = stock.get(sourceKey) ?? 0;
      const newStock =
        adjustment.direction === "ADD"
          ? previousStock + adjustment.quantity
          : previousStock - adjustment.quantity;
      stock.set(sourceKey, newStock);
      let destinationPreviousStock: number | null = null;
      let destinationNewStock: number | null = null;
      if (adjustment.direction === "TRANSFER" && adjustment.destinationBranch) {
        const destinationKey = stockKey(
          adjustment.destinationBranch,
          adjustment.productId,
        );
        destinationPreviousStock = stock.get(destinationKey) ?? 0;
        destinationNewStock = destinationPreviousStock + adjustment.quantity;
        stock.set(destinationKey, destinationNewStock);
      }
      return {
        ...adjustment,
        productName: product?.name ?? "Producto",
        previousStock,
        newStock,
        destinationPreviousStock,
        destinationNewStock,
      };
    });
  }, [branchInventory, branches, pendingAdjustments, stockProducts]);

  const filteredMovements = useMemo(() => {
    const query = filterSearch.trim().toLocaleLowerCase("es-MX");
    return movements.filter((movement) => {
      const date = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Mexico_City",
      }).format(new Date(movement.createdAtIso));
      const values = [
        movement.folio,
        movement.productName,
        movement.reason,
        movement.comment,
        movement.sourceBranch,
        movement.destinationBranch ?? "",
      ];
      return (
        (!filterDate || date === filterDate) &&
        (movementFilter === "ALL" || movement.direction === movementFilter) &&
        (!query ||
          values.some((value) =>
            value.toLocaleLowerCase("es-MX").includes(query),
          ))
      );
    });
  }, [filterDate, filterSearch, movementFilter, movements]);

  const clearForm = () => {
    setProductId(stockProducts[0]?.id ?? "");
    setDirection("ADD");
    setSourceBranch(branches[0] ?? "Polanco");
    setDestinationBranch(branches[1] ?? "Satélite");
    setReasonId("");
    setQuantity(1);
    setComment("");
    setEditingDraftId(null);
  };

  const editDraft = (draft: PendingAdjustment) => {
    setEditingDraftId(draft.draftId);
    setProductId(draft.productId);
    setDirection(draft.direction);
    setSourceBranch(draft.sourceBranch);
    setDestinationBranch(
      draft.destinationBranch ??
        branches.find((branch) => branch !== draft.sourceBranch) ??
        "",
    );
    setReasonId(
      draft.direction === "REMOVE"
        ? (activeReasons.find((reason) => reason.name === draft.reason)?.id ??
            "")
        : "",
    );
    setQuantity(draft.quantity);
    setComment(draft.comment);
  };

  const removeDraft = (draftId: string) => {
    setPendingAdjustments((current) =>
      current.filter((item) => item.draftId !== draftId),
    );
    if (editingDraftId === draftId) clearForm();
  };

  const addToBatch = () => {
    const product = stockProducts.find((item) => item.id === productId);
    if (!product || quantity < 1) {
      toast.error("Selecciona producto y una cantidad válida.");
      return;
    }
    if (direction === "REMOVE" && !reasonId) {
      toast.error("Selecciona el motivo de la baja.");
      return;
    }
    if (direction === "TRANSFER" && sourceBranch === destinationBranch) {
      toast.error("La sucursal de destino debe ser distinta al origen.");
      return;
    }
    if (direction !== "ADD" && quantity > availableSource) {
      toast.error(
        "El movimiento supera la existencia disponible en la sucursal de origen.",
      );
      return;
    }
    const reason =
      direction === "ADD"
        ? "Entrada / ajuste positivo"
        : direction === "TRANSFER"
          ? `Transferencia ${sourceBranch} → ${destinationBranch}`
          : (activeReasons.find((item) => item.id === reasonId)?.name ?? "");
    const draft: PendingAdjustment = {
      draftId: editingDraftId ?? crypto.randomUUID(),
      productId,
      direction,
      reason,
      quantity,
      sourceBranch,
      destinationBranch: direction === "TRANSFER" ? destinationBranch : null,
      comment: comment.trim(),
    };
    setPendingAdjustments((current) =>
      editingDraftId
        ? current.map((item) =>
            item.draftId === editingDraftId ? draft : item,
          )
        : [...current, draft],
    );
    toast.info(
      editingDraftId
        ? `${product.name} se actualizó en el lote.`
        : `${product.name} se añadió al lote. Puedes agregar otro movimiento.`,
    );
    clearForm();
  };

  const requestBatchApproval = () => {
    onRequestBatch(
      pendingAdjustments.map(({ draftId: _draftId, ...draft }) => draft),
    );
    setPendingAdjustments([]);
    clearForm();
  };

  return (
    <div className="inventory-movements-view">
      <div className="seller-sales-metrics">
        {branches.map((branch) => (
          <Card key={branch}>
            <CardContent>
              <PackageSearch size={19} />
              <span>Existencia · {branch}</span>
              <strong>
                {Object.values(branchInventory[branch] ?? {}).reduce(
                  (sum, stock) => sum + stock,
                  0,
                )}
              </strong>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent>
            <PackageCheck size={19} />
            <span>Por entregar</span>
            <strong>
              {
                owedProducts.filter((record) => record.status === "PENDING")
                  .length
              }
            </strong>
          </CardContent>
        </Card>
      </div>

      <Card className="inventory-movement-form-card">
        <CardContent>
          <div className="inventory-movement-heading">
            <div>
              <span className="section-kicker">AJUSTE POR LOTE</span>
              <h2>
                {editingDraftId
                  ? "Editar movimiento preparado"
                  : "Entradas, bajas y transferencias"}
              </h2>
            </div>
            {editingDraftId ? (
              <Badge variant="outline">EDITANDO</Badge>
            ) : (
              <ClipboardPlus size={24} />
            )}
          </div>
          <div className="inventory-movement-form">
            <div className="field-stack movement-product-field">
              <Label>Producto</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stockProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="field-stack">
              <Label>Movimiento</Label>
              <div className="movement-direction-switch">
                <button
                  type="button"
                  className={direction === "ADD" ? "is-active" : ""}
                  onClick={() => setDirection("ADD")}
                >
                  <ArrowDownToLine size={16} /> Sumar
                </button>
                <button
                  type="button"
                  className={direction === "REMOVE" ? "is-active" : ""}
                  onClick={() => setDirection("REMOVE")}
                >
                  <ArrowUpFromLine size={16} /> Baja
                </button>
                <button
                  type="button"
                  className={direction === "TRANSFER" ? "is-active" : ""}
                  onClick={() => setDirection("TRANSFER")}
                >
                  <ArrowLeftRight size={16} /> Transferir
                </button>
              </div>
            </div>
            <div className="field-stack">
              <Label>
                {direction === "TRANSFER" ? "Sucursal origen" : "Sucursal"}
              </Label>
              <Select
                value={sourceBranch}
                onValueChange={(branch) => {
                  setSourceBranch(branch);
                  if (branch === destinationBranch) {
                    setDestinationBranch(
                      branches.find((candidate) => candidate !== branch) ?? "",
                    );
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch} value={branch}>
                      {branch} · {branchInventory[branch]?.[productId] ?? 0}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {direction === "TRANSFER" && (
              <div className="field-stack">
                <Label>Sucursal destino</Label>
                <Select
                  value={destinationBranch}
                  onValueChange={setDestinationBranch}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {branches
                      .filter((branch) => branch !== sourceBranch)
                      .map((branch) => (
                        <SelectItem key={branch} value={branch}>
                          {branch} · {branchInventory[branch]?.[productId] ?? 0}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {direction === "REMOVE" && (
              <div className="field-stack">
                <Label>Motivo</Label>
                <Select value={reasonId} onValueChange={setReasonId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeReasons.map((reason) => (
                      <SelectItem key={reason.id} value={reason.id}>
                        {reason.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="field-stack">
              <Label>Cantidad</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
              />
            </div>
            <div className="field-stack movement-comment-field">
              <Label>Comentario</Label>
              <Input
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Detalle opcional"
              />
            </div>
          </div>
          <div className="movement-stock-preview">
            <PackageSearch size={18} />
            <span>
              {sourceBranch}:{" "}
              <strong>
                {availableSource} → {sourceResult}
              </strong>
            </span>
            {direction === "TRANSFER" && (
              <span>
                {destinationBranch}:{" "}
                <strong>
                  {availableDestination} → {destinationResult}
                </strong>
              </span>
            )}
            <div className="movement-form-actions">
              <Button type="button" variant="outline" onClick={clearForm}>
                <RotateCcw size={16} /> Limpiar formulario
              </Button>
              <Button type="button" onClick={addToBatch}>
                {editingDraftId ? <Save size={16} /> : <Plus size={16} />}
                {editingDraftId
                  ? "Guardar cambios"
                  : pendingAdjustments.length
                    ? "Agregar otro producto"
                    : "Agregar producto"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="data-card">
        <CardContent className="p-0">
          <div className="data-card-heading">
            <div>
              <span>PRODUCTOS DEL MOVIMIENTO</span>
              <h2>
                {pendingAdjustments.length} movimiento
                {pendingAdjustments.length === 1 ? "" : "s"} ·{" "}
                {pendingProductCount} producto
                {pendingProductCount === 1 ? "" : "s"}
              </h2>
            </div>
            <div className="inventory-batch-actions">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPendingAdjustments([]);
                  clearForm();
                }}
                disabled={!pendingAdjustments.length}
              >
                <Trash2 size={15} /> Limpiar lote
              </Button>
              <Button
                type="button"
                onClick={requestBatchApproval}
                disabled={!pendingAdjustments.length || Boolean(editingDraftId)}
              >
                <Send size={16} /> Solicitar aprobación
              </Button>
            </div>
          </div>
          <div className="table-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PRODUCTO</TableHead>
                  <TableHead>TIPO</TableHead>
                  <TableHead>SUCURSAL / RUTA</TableHead>
                  <TableHead>CANTIDAD</TableHead>
                  <TableHead>RESULTADO</TableHead>
                  <TableHead>ACCIONES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queueRows.map((row) => (
                  <TableRow key={row.draftId}>
                    <TableCell>
                      <strong>{row.productName}</strong>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {movementLabels[row.direction]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {row.sourceBranch}
                      {row.destinationBranch
                        ? ` → ${row.destinationBranch}`
                        : ""}
                    </TableCell>
                    <TableCell>{row.quantity}</TableCell>
                    <TableCell>
                      {row.previousStock} → {row.newStock}
                      {row.destinationPreviousStock !== null
                        ? ` / destino ${row.destinationPreviousStock} → ${row.destinationNewStock}`
                        : ""}
                    </TableCell>
                    <TableCell>
                      <div className="movement-draft-actions">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            editDraft(
                              pendingAdjustments.find(
                                (draft) => draft.draftId === row.draftId,
                              ) ?? row,
                            )
                          }
                        >
                          <Pencil size={14} /> Editar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDraft(row.draftId)}
                        >
                          <Trash2 size={14} /> Quitar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!queueRows.length && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      Agrega productos de distintas sucursales y movimientos;
                      después solicita la aprobación del lote completo.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="data-card inventory-approval-card">
        <CardContent className="p-0">
          <div className="data-card-heading">
            <div>
              <span>CONTROL DE APROBACIONES</span>
              <h2>Lotes solicitados</h2>
            </div>
            <Badge variant="outline">
              {batches.filter((batch) => batch.status === "PENDING").length}{" "}
              pendientes
            </Badge>
          </div>
          <div className="inventory-approval-list">
            {batches.map((batch) => (
              <article key={batch.id} className="inventory-approval-batch">
                <header>
                  <div>
                    <strong>{batch.folio}</strong>
                    <small>
                      {batch.createdAt} · {batch.adjustments.length} movimientos
                    </small>
                  </div>
                  <Badge
                    variant={batch.status === "APPROVED" ? "default" : "outline"}
                  >
                    {batch.status === "PENDING"
                      ? "ESPERA DE APROBACIÓN"
                      : batch.status === "APPROVED"
                        ? "APROBADO"
                        : "CANCELADO"}
                  </Badge>
                </header>
                <div className="inventory-approval-products">
                  {batch.adjustments.map((adjustment, index) => {
                    const product = stockProducts.find(
                      (item) => item.id === adjustment.productId,
                    );
                    return (
                      <div key={`${batch.id}-${index}`}>
                        <span>
                          <strong>{product?.name ?? "Producto"}</strong>
                          <small>
                            {adjustment.sourceBranch}
                            {adjustment.destinationBranch
                              ? ` → ${adjustment.destinationBranch}`
                              : ""}
                          </small>
                        </span>
                        <Badge variant="outline">
                          {movementLabels[adjustment.direction]} · {adjustment.quantity}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
                {batch.status === "PENDING" && (
                  <footer>
                    <span>
                      <PackageSearch size={15} /> Sin cambios en inventario
                    </span>
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onCancelBatch(batch.id)}
                      >
                        <Ban size={15} /> Cancelar
                      </Button>
                      <Button
                        type="button"
                        onClick={() => onApproveBatch(batch.id)}
                      >
                        <CheckCircle2 size={15} /> Aprobar y aplicar
                      </Button>
                    </div>
                  </footer>
                )}
                {batch.resolvedAt && (
                  <small className="inventory-approval-resolved">
                    Resolución: {batch.resolvedAt}
                  </small>
                )}
              </article>
            ))}
            {batches.length === 0 && (
              <div className="inventory-approval-empty">
                <PackageCheck size={22} />
                <p>
                  Los lotes enviados aparecerán aquí y no cambiarán el stock
                  hasta ser aprobados.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="data-card">
        <CardContent className="p-0">
          <div className="data-card-heading">
            <div>
              <span>COMPROMISOS DE ENTREGA</span>
              <h2>Productos que se deben al cliente</h2>
            </div>
            <Badge variant="outline">
              {
                owedProducts.filter((record) => record.status === "PENDING")
                  .length
              }{" "}
              pendientes
            </Badge>
          </div>
          <div className="table-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CLIENTE</TableHead>
                  <TableHead>TICKET</TableHead>
                  <TableHead>PRODUCTO</TableHead>
                  <TableHead>SUCURSAL</TableHead>
                  <TableHead>CANTIDAD</TableHead>
                  <TableHead>ESTADO</TableHead>
                  <TableHead>ACCIÓN</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {owedProducts.map((record) => {
                  const available =
                    branchInventory[record.branch]?.[record.productId] ?? 0;
                  return (
                    <TableRow key={record.id}>
                      <TableCell>
                        <strong>{record.clientName}</strong>
                        <small className="seller-payment-methods">
                          {record.clientPhone}
                        </small>
                      </TableCell>
                      <TableCell>{record.ticketId}</TableCell>
                      <TableCell>{record.productName}</TableCell>
                      <TableCell>{record.branch}</TableCell>
                      <TableCell>{record.quantity}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            record.status === "PENDING" ? "outline" : "default"
                          }
                        >
                          {record.status === "PENDING"
                            ? "POR ENTREGAR"
                            : "ENTREGADO"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.status === "PENDING" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={available < record.quantity}
                            onClick={() => onFulfillOwedProduct(record.id)}
                          >
                            Entregar{" "}
                            {available < record.quantity
                              ? `(stock ${available})`
                              : ""}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!owedProducts.length && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      No hay productos pendientes de entrega.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="movement-history-filter-card">
        <CardContent>
          <div className="movement-filter-field">
            <CalendarDays size={17} />
            <DatePicker
              value={filterDate}
              onChange={setFilterDate}
              placeholder="Filtrar por fecha"
            />
          </div>
          <div className="movement-filter-field">
            <Search size={17} />
            <Input
              value={filterSearch}
              onChange={(event) => setFilterSearch(event.target.value)}
              placeholder="Buscar producto, folio o sucursal"
            />
          </div>
          <div className="movement-filter-field">
            <Filter size={17} />
            <Select
              value={movementFilter}
              onValueChange={(value) =>
                setMovementFilter(value as MovementFilter)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="ADD">Sumas</SelectItem>
                <SelectItem value="REMOVE">Bajas</SelectItem>
                <SelectItem value="TRANSFER">Transferencias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="data-card">
        <CardContent className="p-0">
          <div className="data-card-heading">
            <div>
              <span>BITÁCORA MOCK</span>
              <h2>Historial de movimientos</h2>
            </div>
            <Badge variant="outline">
              {filteredMovements.length} registros
            </Badge>
          </div>
          <div className="table-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>FOLIO / FECHA</TableHead>
                  <TableHead>PRODUCTO</TableHead>
                  <TableHead>TIPO</TableHead>
                  <TableHead>SUCURSAL / RUTA</TableHead>
                  <TableHead>CANTIDAD</TableHead>
                  <TableHead>EXISTENCIA</TableHead>
                  <TableHead>MOTIVO</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>
                      <strong>{movement.folio}</strong>
                      <small className="seller-payment-methods">
                        {movement.createdAt}
                      </small>
                    </TableCell>
                    <TableCell>{movement.productName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {movementLabels[movement.direction]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {movement.sourceBranch}
                      {movement.destinationBranch
                        ? ` → ${movement.destinationBranch}`
                        : ""}
                    </TableCell>
                    <TableCell>{movement.quantity}</TableCell>
                    <TableCell>
                      {movement.previousStock} → {movement.newStock}
                      {movement.destinationPreviousStock !== null
                        ? ` / ${movement.destinationPreviousStock} → ${movement.destinationNewStock}`
                        : ""}
                    </TableCell>
                    <TableCell>{movement.reason}</TableCell>
                  </TableRow>
                ))}
                {!filteredMovements.length && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      No hay movimientos que coincidan con los filtros.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
