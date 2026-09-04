import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Ban,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardPlus,
  Filter,
  FileText,
  FileSpreadsheet,
  Eye,
  Lightbulb,
  LockKeyhole,
  PackageCheck,
  PackageSearch,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  DatePicker,
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
import type {
  BranchInventory,
  InventoryAdjustmentBatch,
  InventoryMovement,
  InventoryMovementDirection,
  InventoryMovementDraft,
  InventoryMovementReason,
  OwedProductRecord,
  Product,
  Seller,
  Ticket,
} from "../types";
import {
  compareTableValues,
  SortableTableHead,
  type TableSortDirection,
} from "./SortableTableHead";
import { HistoryPagination, useHistoryPagination } from "./HistoryPagination";

interface InventoryMovementsViewProps {
  products: Product[];
  reasons: InventoryMovementReason[];
  movements: InventoryMovement[];
  branchInventory: BranchInventory;
  owedProducts: OwedProductRecord[];
  batches: InventoryAdjustmentBatch[];
  tickets: Ticket[];
  sellers: Seller[];
  onRequestBatch: (adjustments: InventoryMovementDraft[]) => void;
  onApproveBatch: (batchId: string) => void;
  onCancelBatch: (batchId: string) => void;
  onUpdateBatch: (
    batchId: string,
    adjustments: InventoryMovementDraft[],
  ) => void;
  onFulfillOwedProduct: (owedProductId: string) => void;
  costAccessAuthorized: boolean;
  onAuthorizeCostAccess: (code: string) => boolean;
  onLockCostAccess: () => void;
}

interface PendingAdjustment extends InventoryMovementDraft {
  draftId: string;
}
type MovementFilter = "ALL" | InventoryMovementDirection;
type MovementHistorySortKey =
  | "folio"
  | "product"
  | "direction"
  | "route"
  | "quantity"
  | "stock"
  | "reason"
  | "participant"
  | "cost";

interface MovementFolioGroup {
  key: string;
  folio: string;
  createdAt: string;
  createdAtIso: string;
  movements: InventoryMovement[];
  totalQuantity: number;
  totalCostUsd: number;
  totalCostMxn: number;
}
const movementLabels: Record<InventoryMovementDirection, string> = {
  ADD: "SUMA",
  REMOVE: "BAJA",
  TRANSFER: "TRANSFERENCIA",
};
const movementCategoryLabels: Record<InventoryMovement["category"], string> = {
  SALE: "VENTA",
  WRITE_OFF: "BAJA",
  DEMO: "DEMO / TESTER",
  ADJUSTMENT: "AJUSTE",
  TRANSFER: "TRANSFERENCIA",
  RETURN: "DEVOLUCIÓN",
  DELIVERY: "ENTREGA",
};
const stockKey = (branch: string, productId: string) =>
  `${branch}:${productId}`;
const spreadsheetEscape = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const getMovementBusinessDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

export function InventoryMovementsView({
  products,
  reasons,
  movements,
  branchInventory,
  owedProducts,
  batches,
  tickets,
  sellers,
  onRequestBatch,
  onApproveBatch,
  onCancelBatch,
  onUpdateBatch,
  onFulfillOwedProduct,
  costAccessAuthorized,
  onAuthorizeCostAccess,
  onLockCostAccess,
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
  const branchKey = branches.join("\u0000");
  const [reasonId, setReasonId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [comment, setComment] = useState("");
  const [settlementOwedProductId, setSettlementOwedProductId] = useState<
    string | null
  >(null);
  const [pendingAdjustments, setPendingAdjustments] = useState<
    PendingAdjustment[]
  >([]);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [expandedBatchIds, setExpandedBatchIds] = useState<string[]>([]);
  const [editingBatchAdjustment, setEditingBatchAdjustment] = useState<{
    batchId: string;
    index: number;
    draft: InventoryMovementDraft;
  } | null>(null);
  const movementBusinessToday = getMovementBusinessDate();
  const [filterDate, setFilterDate] = useState(getMovementBusinessDate);
  const [filterSearch, setFilterSearch] = useState("");
  const [movementFilter, setMovementFilter] = useState<MovementFilter>("ALL");
  const [reportBranch, setReportBranch] = useState("ALL");
  const [historySort, setHistorySort] = useState<{
    key: MovementHistorySortKey;
    direction: TableSortDirection;
  }>({ key: "folio", direction: "DESC" });
  const [selectedMovementGroupKey, setSelectedMovementGroupKey] = useState<
    string | null
  >(null);
  const [costAccessCode, setCostAccessCode] = useState("");

  useEffect(() => {
    if (!branches.includes(sourceBranch)) {
      setSourceBranch(branches[0] ?? "");
    }
    if (
      !branches.includes(destinationBranch) ||
      destinationBranch === sourceBranch
    ) {
      setDestinationBranch(
        branches.find((branch) => branch !== sourceBranch) ?? "",
      );
    }
    if (reportBranch !== "ALL" && !branches.includes(reportBranch))
      setReportBranch("ALL");
  }, [branchKey, destinationBranch, reportBranch, sourceBranch]);
  const [reportMonth, setReportMonth] = useState(() =>
    new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
    })
      .format(new Date())
      .slice(0, 7),
  );
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
  const settlementBranch =
    direction === "ADD"
      ? sourceBranch
      : direction === "TRANSFER"
        ? destinationBranch
        : null;
  const eligibleSettlementDebts = owedProducts.filter(
    (record) =>
      record.status === "PENDING" &&
      record.productId === productId &&
      record.branch === settlementBranch &&
      record.deliveredQuantity < record.quantity,
  );

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

  const movementFolioGroups = useMemo(() => {
    const batchFolioById = new Map(
      batches.map((batch) => [batch.id, batch.folio]),
    );
    const grouped = new Map<string, MovementFolioGroup>();

    movements.forEach((movement) => {
      const isBatchReversal = Boolean(
        movement.approvalBatchId && movement.reversalOfMovementId,
      );
      const batchFolio = movement.approvalBatchId
        ? batchFolioById.get(movement.approvalBatchId)
        : null;
      const key = movement.approvalBatchId
        ? `${isBatchReversal ? "batch-reversal" : "batch"}:${movement.approvalBatchId}`
        : `movement:${movement.folio}`;
      const folio = batchFolio
        ? `${isBatchReversal ? "REV-" : ""}${batchFolio}`
        : movement.folio;
      const current = grouped.get(key);

      if (current) {
        current.movements.push(movement);
        current.totalQuantity += movement.quantity;
        current.totalCostUsd += movement.totalCostUsd;
        current.totalCostMxn += movement.totalCostMxn;
        if (movement.createdAtIso > current.createdAtIso) {
          current.createdAt = movement.createdAt;
          current.createdAtIso = movement.createdAtIso;
        }
        return;
      }

      grouped.set(key, {
        key,
        folio,
        createdAt: movement.createdAt,
        createdAtIso: movement.createdAtIso,
        movements: [movement],
        totalQuantity: movement.quantity,
        totalCostUsd: movement.totalCostUsd,
        totalCostMxn: movement.totalCostMxn,
      });
    });

    return Array.from(grouped.values());
  }, [batches, movements]);

  const filteredMovementGroups = useMemo(() => {
    const query = filterSearch.trim().toLocaleLowerCase("es-MX");
    const visibleGroups = movementFolioGroups.filter((group) => {
      const matchesDate = group.movements.some((movement) => {
        const date = new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Mexico_City",
        }).format(new Date(movement.createdAtIso));
        return !filterDate || date === filterDate;
      });
      const matchesMovement =
        movementFilter === "ALL" ||
        group.movements.some(
          (movement) => movement.direction === movementFilter,
        );
      const matchesBranch =
        reportBranch === "ALL" ||
        group.movements.some(
          (movement) =>
            movement.sourceBranch === reportBranch ||
            movement.destinationBranch === reportBranch,
        );
      const values = [
        group.folio,
        ...group.movements.flatMap((movement) => [
          movement.folio,
          movement.productName,
          movement.reason,
          movement.comment,
          movement.sourceBranch,
          movement.destinationBranch ?? "",
          movement.settledClientName ?? "",
          ...(movement.settledSellerNames ?? []),
        ]),
      ];
      const matchesSearch =
        !query ||
        values.some((value) =>
          value.toLocaleLowerCase("es-MX").includes(query),
        );
      return matchesDate && matchesMovement && matchesBranch && matchesSearch;
    });

    const uniqueText = (values: string[]) =>
      Array.from(new Set(values.filter(Boolean))).join(" · ");
    const sortValue = (group: MovementFolioGroup): string | number => {
      switch (historySort.key) {
        case "folio":
          return `${group.createdAtIso} ${group.folio}`;
        case "product":
          return uniqueText(group.movements.map((movement) => movement.productName));
        case "direction":
          return uniqueText(
            group.movements.map(
              (movement) => movementLabels[movement.direction],
            ),
          );
        case "route":
          return uniqueText(
            group.movements.map((movement) =>
              movement.destinationBranch
                ? `${movement.sourceBranch} ${movement.destinationBranch}`
                : movement.sourceBranch,
            ),
          );
        case "quantity":
          return group.totalQuantity;
        case "stock":
          return Math.min(
            ...group.movements.flatMap((movement) => [
              movement.newStock,
              ...(movement.destinationNewStock === null
                ? []
                : [movement.destinationNewStock]),
            ]),
          );
        case "reason":
          return uniqueText(group.movements.map((movement) => movement.reason));
        case "participant":
          return uniqueText(
            group.movements.flatMap((movement) => [
              movement.settledClientName ?? "",
              ...(movement.settledSellerNames ?? []),
            ]),
          );
        case "cost":
          return group.totalCostMxn;
      }
    };

    return [...visibleGroups].sort((left, right) => {
      const comparison = compareTableValues(sortValue(left), sortValue(right));
      return historySort.direction === "ASC" ? comparison : -comparison;
    });
  }, [
    filterDate,
    filterSearch,
    historySort,
    movementFilter,
    movementFolioGroups,
    reportBranch,
  ]);
  const movementHistoryPagination = useHistoryPagination(
    filteredMovementGroups,
    `${filterDate}|${filterSearch}|${movementFilter}|${reportBranch}|${historySort.key}|${historySort.direction}`,
  );

  const selectedMovementGroup = movementFolioGroups.find(
    (group) => group.key === selectedMovementGroupKey,
  );
  const selectedMovementTotals = selectedMovementGroup
    ? {
        additions: selectedMovementGroup.movements
          .filter((movement) => movement.direction === "ADD")
          .reduce((sum, movement) => sum + movement.quantity, 0),
        removals: selectedMovementGroup.movements
          .filter((movement) => movement.direction === "REMOVE")
          .reduce((sum, movement) => sum + movement.quantity, 0),
        transfers: selectedMovementGroup.movements
          .filter((movement) => movement.direction === "TRANSFER")
          .reduce((sum, movement) => sum + movement.quantity, 0),
      }
    : null;
  const toggleHistorySort = (key: MovementHistorySortKey) => {
    setHistorySort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "ASC" ? "DESC" : "ASC",
    }));
  };

  const monthlyCostMovements = useMemo(
    () =>
      movements.filter(
        (movement) =>
          movement.createdAtIso.slice(0, 7) === reportMonth &&
          (reportBranch === "ALL" ||
            movement.sourceBranch === reportBranch ||
            movement.destinationBranch === reportBranch),
      ),
    [movements, reportBranch, reportMonth],
  );
  const monthlyBranchCosts = useMemo(
    () =>
      Array.from(
        monthlyCostMovements
          .reduce<Map<string, { usd: number; mxn: number; movements: number }>>(
            (summary, movement) => {
              const current = summary.get(movement.sourceBranch) ?? {
                usd: 0,
                mxn: 0,
                movements: 0,
              };
              summary.set(movement.sourceBranch, {
                usd: current.usd + movement.totalCostUsd,
                mxn: current.mxn + movement.totalCostMxn,
                movements: current.movements + 1,
              });
              return summary;
            },
            new Map(),
          )
          .entries(),
      ),
    [monthlyCostMovements],
  );
  const monthlyCategoryCosts = useMemo(
    () =>
      Array.from(
        monthlyCostMovements
          .reduce<
            Map<
              InventoryMovement["category"],
              { usd: number; mxn: number; movements: number }
            >
          >((summary, movement) => {
            const current = summary.get(movement.category) ?? {
              usd: 0,
              mxn: 0,
              movements: 0,
            };
            summary.set(movement.category, {
              usd: current.usd + movement.totalCostUsd,
              mxn: current.mxn + movement.totalCostMxn,
              movements: current.movements + 1,
            });
            return summary;
          }, new Map())
          .entries(),
      ),
    [monthlyCostMovements],
  );
  const monthlySalesDashboard = useMemo(() => {
    const saleTickets = tickets.filter(
      (ticket) =>
        ticket.createdAtIso.slice(0, 7) === reportMonth &&
        ticket.ticketType !== "LAYAWAY_PAYMENT" &&
        (reportBranch === "ALL" || ticket.branchName === reportBranch),
    );
    const totalRevenue = saleTickets.reduce(
      (sum, ticket) => sum + ticket.total,
      0,
    );
    const itemSales = saleTickets
      .flatMap((ticket) => ticket.products)
      .reduce<
        Map<
          string,
          {
            id: string;
            name: string;
            quantity: number;
            revenue: number;
            kind: Product["kind"] | "UNKNOWN";
          }
        >
      >((summary, line) => {
        const product = products.find((item) => item.id === line.productId);
        const current = summary.get(line.productId) ?? {
          id: line.productId,
          name: line.name,
          quantity: 0,
          revenue: 0,
          kind: product?.kind ?? "UNKNOWN",
        };
        summary.set(line.productId, {
          ...current,
          quantity: current.quantity + line.quantity,
          revenue: current.revenue + line.total,
        });
        return summary;
      }, new Map());
    const rankedItems = Array.from(itemSales.values()).sort(
      (a, b) => b.quantity - a.quantity || b.revenue - a.revenue,
    );
    const sellerRevenue = saleTickets
      .flatMap((ticket) => ticket.sellerSales)
      .reduce<Map<string, number>>((summary, sale) => {
        summary.set(
          sale.sellerId,
          (summary.get(sale.sellerId) ?? 0) + sale.amount,
        );
        return summary;
      }, new Map());
    const sellerRates = sellers
      .filter((seller) => seller.active)
      .map((seller) => {
        const revenue = sellerRevenue.get(seller.id) ?? 0;
        return {
          id: seller.id,
          name: seller.name,
          revenue,
          rate: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0,
        };
      })
      .sort((a, b) => b.rate - a.rate);
    return {
      tickets: saleTickets.length,
      totalRevenue,
      averageTicket: saleTickets.length
        ? totalRevenue / saleTickets.length
        : 0,
      topProduct:
        rankedItems.find((item) => item.kind === "PRODUCT") ?? null,
      topService:
        rankedItems.find((item) => item.kind === "SERVICE") ?? null,
      highestSeller: sellerRates[0] ?? null,
      lowestSeller: sellerRates.at(-1) ?? null,
    };
  }, [products, reportBranch, reportMonth, sellers, tickets]);
  const monthlySalesStrategy = useMemo(() => {
    const topProduct = monthlySalesDashboard.topProduct?.name ??
      "el producto con mayor rotación";
    const topService = monthlySalesDashboard.topService?.name ??
      "un facial de seguimiento";
    const highSeller = monthlySalesDashboard.highestSeller?.name ??
      "el vendedor con mejor resultado";
    const lowSeller = monthlySalesDashboard.lowestSeller?.name ??
      "el vendedor con menor participación";
    const highestCostBranch = [...monthlyBranchCosts].sort(
      (a, b) => b[1].mxn - a[1].mxn,
    )[0]?.[0];
    return [
      `Paquete del mes: combinar ${topProduct} con ${topService} y ofrecer un beneficio condicionado a mantener el piso global del ticket.`,
      `Elevar el ticket promedio 12%, de ${new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(monthlySalesDashboard.averageTicket)} a ${new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(monthlySalesDashboard.averageTicket * 1.12)} mediante venta complementaria.`,
      `Replicar con ${lowSeller} el guion comercial y seguimiento de ${highSeller}; revisar semanalmente su participación en la venta total.`,
      highestCostBranch
        ? `Auditar bajas, demos y rotación en ${highestCostBranch}, la sucursal con mayor costo de movimientos del periodo.`
        : "Revisar semanalmente el costo por sucursal antes del siguiente cierre.",
    ];
  }, [monthlyBranchCosts, monthlySalesDashboard]);

  const clearForm = () => {
    setProductId(stockProducts[0]?.id ?? "");
    setDirection("ADD");
    setSourceBranch(branches[0] ?? "Polanco");
    setDestinationBranch(branches[1] ?? "Satélite");
    setReasonId("");
    setQuantity(1);
    setComment("");
    setSettlementOwedProductId(null);
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
    setSettlementOwedProductId(draft.settlementOwedProductId);
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
      settlementOwedProductId:
        direction !== "REMOVE" &&
        eligibleSettlementDebts.some(
          (record) => record.id === settlementOwedProductId,
        )
          ? settlementOwedProductId
          : null,
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

  const toggleBatch = (batchId: string) => {
    setExpandedBatchIds((current) =>
      current.includes(batchId)
        ? current.filter((id) => id !== batchId)
        : [...current, batchId],
    );
  };

  const saveBatchAdjustment = (batch: InventoryAdjustmentBatch) => {
    if (
      !editingBatchAdjustment ||
      editingBatchAdjustment.batchId !== batch.id
    )
      return;
    const { index, draft } = editingBatchAdjustment;
    if (draft.quantity < 1) {
      toast.error("La cantidad debe ser mayor a cero.");
      return;
    }
    if (
      draft.direction === "TRANSFER" &&
      (!draft.destinationBranch ||
        draft.destinationBranch === draft.sourceBranch)
    ) {
      toast.error("Selecciona una sucursal de destino distinta.");
      return;
    }
    const normalizedDraft: InventoryMovementDraft = {
      ...draft,
      reason:
        draft.direction === "TRANSFER" && draft.destinationBranch
          ? `Transferencia ${draft.sourceBranch} → ${draft.destinationBranch}`
          : draft.reason,
    };
    onUpdateBatch(
      batch.id,
      batch.adjustments.map((adjustment, adjustmentIndex) =>
        adjustmentIndex === index ? normalizedDraft : adjustment,
      ),
    );
    setEditingBatchAdjustment(null);
  };

  const exportMonthlyCostReport = () => {
    if (!costAccessAuthorized) {
      toast.error("Se requiere acceso autorizado para exportar costos.");
      return;
    }
    if (monthlyCostMovements.length === 0) {
      toast.error("No hay movimientos para el mes seleccionado.");
      return;
    }
    const scopeLabel =
      reportBranch === "ALL" ? "Todas las sucursales" : reportBranch;
    const scopeFileName =
      reportBranch === "ALL"
        ? "todas-las-sucursales"
        : reportBranch.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const summaryRows = monthlyBranchCosts
      .map(
        ([branch, totals]) => `<tr><td>${spreadsheetEscape(branch)}</td><td>${totals.movements}</td><td>${totals.usd.toFixed(2)}</td><td>${totals.mxn.toFixed(2)}</td></tr>`,
      )
      .join("");
    const detailRows = monthlyCostMovements
      .map(
        (movement) => `<tr>
          <td>${spreadsheetEscape(movement.createdAt)}</td>
          <td>${spreadsheetEscape(movement.folio)}</td>
          <td>${spreadsheetEscape(movement.sourceBranch)}</td>
          <td>${spreadsheetEscape(movement.destinationBranch ?? "")}</td>
          <td>${spreadsheetEscape(movement.productName)}</td>
          <td>${spreadsheetEscape(movementCategoryLabels[movement.category])}</td>
          <td>${spreadsheetEscape(movement.reason)}</td>
          <td>${movement.quantity}</td>
          <td>${movement.previousStock}</td>
          <td>${movement.newStock}</td>
          <td>${movement.unitCostUsd.toFixed(2)}</td>
          <td>${movement.totalCostUsd.toFixed(2)}</td>
          <td>${movement.unitCostMxn.toFixed(2)}</td>
          <td>${movement.totalCostMxn.toFixed(2)}</td>
          <td>${spreadsheetEscape(movement.comment)}</td>
        </tr>`,
      )
      .join("");
    const categoryRows = monthlyCategoryCosts
      .map(
        ([category, totals]) => `<tr><td>${spreadsheetEscape(movementCategoryLabels[category])}</td><td>${totals.movements}</td><td>${totals.usd.toFixed(2)}</td><td>${totals.mxn.toFixed(2)}</td></tr>`,
      )
      .join("");
    const workbook = `<!doctype html><html><head><meta charset="utf-8"></head><body>
      <h1>Reporte mensual de costos de inventario</h1>
      <p>Periodo: ${spreadsheetEscape(reportMonth)} · Alcance: ${spreadsheetEscape(scopeLabel)}</p>
      <h2>Resumen por sucursal</h2>
      <table border="1"><thead><tr><th>Sucursal</th><th>Movimientos</th><th>Costo USD</th><th>Costo MXN</th></tr></thead><tbody>${summaryRows}</tbody></table>
      <h2>Resumen por tipo de movimiento</h2>
      <table border="1"><thead><tr><th>Tipo</th><th>Movimientos</th><th>Costo USD</th><th>Costo MXN</th></tr></thead><tbody>${categoryRows}</tbody></table>
      <h2>Dashboard comercial</h2>
      <table border="1"><thead><tr><th>Tickets</th><th>Venta total MXN</th><th>Ticket promedio MXN</th><th>Producto más vendido</th><th>Servicio más vendido</th><th>Mayor tasa</th><th>Menor tasa</th></tr></thead><tbody><tr><td>${monthlySalesDashboard.tickets}</td><td>${monthlySalesDashboard.totalRevenue.toFixed(2)}</td><td>${monthlySalesDashboard.averageTicket.toFixed(2)}</td><td>${spreadsheetEscape(monthlySalesDashboard.topProduct?.name ?? "Sin datos")}</td><td>${spreadsheetEscape(monthlySalesDashboard.topService?.name ?? "Sin datos")}</td><td>${spreadsheetEscape(monthlySalesDashboard.highestSeller ? `${monthlySalesDashboard.highestSeller.name} ${monthlySalesDashboard.highestSeller.rate.toFixed(1)}%` : "Sin datos")}</td><td>${spreadsheetEscape(monthlySalesDashboard.lowestSeller ? `${monthlySalesDashboard.lowestSeller.name} ${monthlySalesDashboard.lowestSeller.rate.toFixed(1)}%` : "Sin datos")}</td></tr></tbody></table>
      <h2>Estrategia sugerida del mes</h2><ol>${monthlySalesStrategy.map((strategy) => `<li>${spreadsheetEscape(strategy)}</li>`).join("")}</ol>
      <h2>Detalle de movimientos</h2>
      <table border="1"><thead><tr><th>Fecha</th><th>Folio</th><th>Sucursal</th><th>Destino</th><th>Producto</th><th>Tipo</th><th>Motivo</th><th>Cantidad</th><th>Stock anterior</th><th>Stock nuevo</th><th>Costo unitario USD</th><th>Costo total USD</th><th>Costo unitario MXN</th><th>Costo total MXN</th><th>Comentario</th></tr></thead><tbody>${detailRows}</tbody></table>
    </body></html>`;
    const blob = new Blob(["\uFEFF", workbook], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reporte-costos-${reportMonth}-${scopeFileName}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success(
      `Reporte mensual ${reportMonth} · ${scopeLabel} generado para Excel.`,
    );
  };

  const exportMonthlyCostPdf = () => {
    if (!costAccessAuthorized) {
      toast.error("Se requiere acceso autorizado para exportar costos.");
      return;
    }
    if (monthlyCostMovements.length === 0) {
      toast.error("No hay movimientos para el mes seleccionado.");
      return;
    }
    const scopeLabel =
      reportBranch === "ALL" ? "Todas las sucursales" : reportBranch;
    const printWindow = window.open(
      "",
      "_blank",
      "width=1280,height=850",
    );
    if (!printWindow) {
      toast.error("Permite ventanas emergentes para generar el PDF.");
      return;
    }
    printWindow.opener = null;
    const totalUsd = monthlyCostMovements.reduce(
      (sum, movement) => sum + movement.totalCostUsd,
      0,
    );
    const totalMxn = monthlyCostMovements.reduce(
      (sum, movement) => sum + movement.totalCostMxn,
      0,
    );
    const summaryRows = monthlyBranchCosts
      .map(
        ([branch, totals]) => `<tr><td>${spreadsheetEscape(branch)}</td><td>${totals.movements}</td><td>$${totals.usd.toFixed(2)}</td><td>${new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(totals.mxn)}</td></tr>`,
      )
      .join("");
    const detailRows = monthlyCostMovements
      .map(
        (movement) => `<tr>
          <td>${spreadsheetEscape(movement.createdAt)}</td>
          <td>${spreadsheetEscape(movement.folio)}</td>
          <td>${spreadsheetEscape(movement.sourceBranch)}${movement.destinationBranch ? ` → ${spreadsheetEscape(movement.destinationBranch)}` : ""}</td>
          <td>${spreadsheetEscape(movement.productName)}</td>
          <td>${spreadsheetEscape(movementCategoryLabels[movement.category])}</td>
          <td>${spreadsheetEscape(movement.reason)}</td>
          <td>${movement.quantity}</td>
          <td>${movement.previousStock} → ${movement.newStock}</td>
          <td>$${movement.unitCostUsd.toFixed(2)}</td>
          <td>$${movement.totalCostUsd.toFixed(2)}</td>
          <td>${new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(movement.unitCostMxn)}</td>
          <td>${new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(movement.totalCostMxn)}</td>
          <td>${spreadsheetEscape(movement.comment || "—")}</td>
        </tr>`,
      )
      .join("");
    const categoryRows = monthlyCategoryCosts
      .map(
        ([category, totals]) => `<tr><td>${spreadsheetEscape(movementCategoryLabels[category])}</td><td>${totals.movements}</td><td>$${totals.usd.toFixed(2)}</td><td>${new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(totals.mxn)}</td></tr>`,
      )
      .join("");
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Reporte de costos ${spreadsheetEscape(reportMonth)}</title><style>
      @page{size:landscape;margin:10mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#171717;margin:0}header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #171717;padding-bottom:12px;margin-bottom:18px}h1{font-size:22px;margin:0 0 5px}h2{font-size:14px;margin:18px 0 8px}.meta{font-size:10px;color:#555}.totals{display:flex;gap:10px}.total{min-width:150px;border:1px solid #bbb;padding:9px}.total span{display:block;font-size:8px;color:#666}.total strong{display:block;margin-top:3px;font-size:15px}table{width:100%;border-collapse:collapse;font-size:8px}th{background:#eee;text-align:left}th,td{border:1px solid #bbb;padding:5px;vertical-align:top}tbody tr:nth-child(even){background:#fafafa}.footer{margin-top:12px;font-size:8px;color:#666}
    </style></head><body>
      <header><div><h1>Reporte mensual de costos de inventario</h1><div class="meta">KEYSAR COSMETICS · Periodo ${spreadsheetEscape(reportMonth)} · Alcance ${spreadsheetEscape(scopeLabel)} · Generado ${new Date().toLocaleString("es-MX")}</div></div><div class="totals"><div class="total"><span>COSTO TOTAL USD</span><strong>$${totalUsd.toFixed(2)}</strong></div><div class="total"><span>COSTO TOTAL MXN</span><strong>${new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(totalMxn)}</strong></div></div></header>
      <h2>Resumen por sucursal</h2><table><thead><tr><th>Sucursal</th><th>Movimientos</th><th>Costo USD</th><th>Costo MXN</th></tr></thead><tbody>${summaryRows}</tbody></table>
      <h2>Resumen por tipo de movimiento</h2><table><thead><tr><th>Tipo</th><th>Movimientos</th><th>Costo USD</th><th>Costo MXN</th></tr></thead><tbody>${categoryRows}</tbody></table>
      <h2>Dashboard comercial</h2><table><thead><tr><th>Tickets</th><th>Venta total</th><th>Ticket promedio</th><th>Producto más vendido</th><th>Servicio más vendido</th><th>Mayor tasa</th><th>Menor tasa</th></tr></thead><tbody><tr><td>${monthlySalesDashboard.tickets}</td><td>${new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(monthlySalesDashboard.totalRevenue)}</td><td>${new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(monthlySalesDashboard.averageTicket)}</td><td>${spreadsheetEscape(monthlySalesDashboard.topProduct?.name ?? "Sin datos")}</td><td>${spreadsheetEscape(monthlySalesDashboard.topService?.name ?? "Sin datos")}</td><td>${spreadsheetEscape(monthlySalesDashboard.highestSeller ? `${monthlySalesDashboard.highestSeller.name} · ${monthlySalesDashboard.highestSeller.rate.toFixed(1)}%` : "Sin datos")}</td><td>${spreadsheetEscape(monthlySalesDashboard.lowestSeller ? `${monthlySalesDashboard.lowestSeller.name} · ${monthlySalesDashboard.lowestSeller.rate.toFixed(1)}%` : "Sin datos")}</td></tr></tbody></table>
      <h2>Estrategia sugerida del mes</h2><ol>${monthlySalesStrategy.map((strategy) => `<li>${spreadsheetEscape(strategy)}</li>`).join("")}</ol>
      <h2>Detalle de ventas, bajas, demos y movimientos</h2><table><thead><tr><th>Fecha</th><th>Folio</th><th>Sucursal / destino</th><th>Producto</th><th>Tipo</th><th>Motivo</th><th>Cant.</th><th>Stock</th><th>Costo unit. USD</th><th>Total USD</th><th>Costo unit. MXN</th><th>Total MXN</th><th>Comentario</th></tr></thead><tbody>${detailRows}</tbody></table>
      <div class="footer">Información confidencial · Reporte generado desde el frontend mock del POS.</div>
    </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), 300);
    toast.success(
      `Reporte mensual ${reportMonth} · ${scopeLabel} listo; selecciona “Guardar como PDF”.`,
    );
  };

  return (
    <div className="inventory-movements-view">
      <div className="seller-sales-metrics">
        {branches.map((branch) => (
          <Card key={branch}>
            <CardContent>
              <PackageSearch size={19} />
              <span>Existencia · {branch}</span>
              <strong
                className={
                  Object.values(branchInventory[branch] ?? {}).some(
                    (stock) => stock < 0,
                  )
                    ? "is-negative"
                    : ""
                }
              >
                {Object.values(branchInventory[branch] ?? {}).reduce(
                  (sum, stock) => sum + stock,
                  0,
                )}
              </strong>
              {Object.values(branchInventory[branch] ?? {}).some(
                (stock) => stock < 0,
              ) && <small className="is-negative">CON DEUDA</small>}
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
          <div
            className={`inventory-movement-form is-${direction.toLocaleLowerCase("en-US")}`}
          >
            <div className="field-stack movement-product-field">
              <Label>Producto</Label>
              <Select
                value={productId}
                onValueChange={(value) => {
                  setProductId(value);
                  setSettlementOwedProductId(null);
                }}
              >
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
                  onClick={() => {
                    setDirection("ADD");
                    setSettlementOwedProductId(null);
                  }}
                >
                  <ArrowDownToLine size={16} /> Sumar
                </button>
                <button
                  type="button"
                  className={direction === "REMOVE" ? "is-active" : ""}
                  onClick={() => {
                    setDirection("REMOVE");
                    setSettlementOwedProductId(null);
                  }}
                >
                  <ArrowUpFromLine size={16} /> Baja
                </button>
                <button
                  type="button"
                  className={direction === "TRANSFER" ? "is-active" : ""}
                  onClick={() => {
                    setDirection("TRANSFER");
                    setSettlementOwedProductId(null);
                  }}
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
                  setSettlementOwedProductId(null);
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
                  onValueChange={(branch) => {
                    setDestinationBranch(branch);
                    setSettlementOwedProductId(null);
                  }}
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
              <div className="field-stack movement-reason-field">
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
            {direction !== "REMOVE" && (
              <div className="field-stack movement-settlement-field">
                <Label>Cliente a quien se entrega (opcional)</Label>
                <Select
                  value={settlementOwedProductId ?? "UNASSIGNED"}
                  onValueChange={(value) =>
                    setSettlementOwedProductId(
                      value === "UNASSIGNED" ? null : value,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNASSIGNED">
                      No asignar · mantener alerta pendiente
                    </SelectItem>
                    {eligibleSettlementDebts.map((record) => (
                      <SelectItem key={record.id} value={record.id}>
                        {record.clientName} · {record.clientPhone} · debe {record.quantity - record.deliveredQuantity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <small>
                  {eligibleSettlementDebts.length > 0
                    ? `${eligibleSettlementDebts.length} clienta(s) esperan este producto en ${settlementBranch}. Si no eliges una, el inventario se actualiza pero la alerta continúa.`
                    : `No hay deudas pendientes de este producto en ${settlementBranch}.`}
                </small>
              </div>
            )}
          </div>
          <div className="movement-stock-preview">
            <PackageSearch size={18} />
            <span>
              {sourceBranch}:{" "}
              <strong className={sourceResult < 0 ? "is-negative" : ""}>
                {availableSource} → {sourceResult}
              </strong>
            </span>
            {direction === "TRANSFER" && (
              <span>
                {destinationBranch}:{" "}
                <strong
                  className={destinationResult < 0 ? "is-negative" : ""}
                >
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
                  <TableHead>ENTREGA A CLIENTE</TableHead>
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
                    <TableCell className={row.newStock < 0 ? "is-negative" : ""}>
                      {row.previousStock} → {row.newStock}
                      {row.destinationPreviousStock !== null
                        ? ` / destino ${row.destinationPreviousStock} → ${row.destinationNewStock}`
                        : ""}
                    </TableCell>
                    <TableCell>
                      {row.settlementOwedProductId ? (
                        <span className="movement-settlement-summary">
                          <strong>
                            {owedProducts.find(
                              (record) =>
                                record.id === row.settlementOwedProductId,
                            )?.clientName ?? "Cliente"}
                          </strong>
                          <small>Se registra al aprobar</small>
                        </span>
                      ) : (
                        <span className="is-negative">Sin asignar</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="movement-draft-actions">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="icon-action-button"
                          aria-label={`Editar movimiento ${row.draftId}`}
                          title="Editar"
                          onClick={() =>
                            editDraft(
                              pendingAdjustments.find(
                                (draft) => draft.draftId === row.draftId,
                              ) ?? row,
                            )
                          }
                        >
                          <Pencil size={15} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="icon-action-button is-danger"
                          aria-label={`Quitar movimiento ${row.draftId}`}
                          title="Quitar"
                          onClick={() => removeDraft(row.draftId)}
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!queueRows.length && (
                  <TableRow>
                    <TableCell colSpan={7}>
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
            {batches.map((batch) => {
              const expanded = expandedBatchIds.includes(batch.id);
              return (
                <article key={batch.id} className="inventory-approval-batch">
                  <header>
                    <button
                      type="button"
                      className="inventory-batch-folio-button"
                      onClick={() => toggleBatch(batch.id)}
                      aria-expanded={expanded}
                    >
                      {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                      <span>
                        <strong>{batch.folio}</strong>
                        <small>
                          {batch.createdAt} · {batch.adjustments.length} producto
                          {batch.adjustments.length === 1 ? "" : "s"} en una partida
                        </small>
                      </span>
                    </button>
                    <Badge
                      variant={batch.status === "APPROVED" ? "default" : "outline"}
                    >
                      {batch.status === "PENDING"
                        ? "ESPERA DE APROBACIÓN"
                        : batch.status === "APPROVED"
                          ? "APROBADO"
                          : batch.status === "REVERSED"
                            ? "APROBACIÓN REVERTIDA"
                            : "CANCELADO"}
                    </Badge>
                  </header>
                  {expanded && (
                    <div className="inventory-approval-products">
                      {batch.adjustments.map((adjustment, index) => {
                        const product = stockProducts.find(
                          (item) => item.id === adjustment.productId,
                        );
                        const editing =
                          editingBatchAdjustment?.batchId === batch.id &&
                          editingBatchAdjustment.index === index;
                        if (editing && editingBatchAdjustment) {
                          const draft = editingBatchAdjustment.draft;
                          return (
                            <div
                              key={`${batch.id}-${index}`}
                              className="inventory-batch-inline-edit"
                            >
                              <strong>{product?.name ?? "Producto"}</strong>
                              <Select
                                value={draft.sourceBranch}
                                onValueChange={(branch) =>
                                  setEditingBatchAdjustment({
                                    ...editingBatchAdjustment,
                                    draft: {
                                      ...draft,
                                      sourceBranch: branch,
                                      settlementOwedProductId: null,
                                      destinationBranch:
                                        draft.direction === "TRANSFER" &&
                                        draft.destinationBranch === branch
                                          ? branches.find(
                                              (candidate) => candidate !== branch,
                                            ) ?? null
                                          : draft.destinationBranch,
                                    },
                                  })
                                }
                              >
                                <SelectTrigger aria-label="Sucursal del movimiento">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {branches.map((branch) => (
                                    <SelectItem key={branch} value={branch}>
                                      {branch}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {draft.direction === "TRANSFER" && (
                                <Select
                                  value={draft.destinationBranch ?? ""}
                                  onValueChange={(branch) =>
                                    setEditingBatchAdjustment({
                                      ...editingBatchAdjustment,
                                      draft: {
                                        ...draft,
                                        destinationBranch: branch,
                                        settlementOwedProductId: null,
                                      },
                                    })
                                  }
                                >
                                  <SelectTrigger aria-label="Sucursal destino">
                                    <SelectValue placeholder="Destino" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {branches
                                      .filter(
                                        (branch) => branch !== draft.sourceBranch,
                                      )
                                      .map((branch) => (
                                        <SelectItem key={branch} value={branch}>
                                          {branch}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              )}
                              <Input
                                type="number"
                                min="1"
                                value={draft.quantity}
                                aria-label="Cantidad del movimiento"
                                onChange={(event) =>
                                  setEditingBatchAdjustment({
                                    ...editingBatchAdjustment,
                                    draft: {
                                      ...draft,
                                      quantity: Number(event.target.value),
                                    },
                                  })
                                }
                              />
                              <div className="movement-draft-actions">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => saveBatchAdjustment(batch)}
                                >
                                  <Save size={14} /> Guardar
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingBatchAdjustment(null)}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div key={`${batch.id}-${index}`}>
                            <span>
                              <strong>{product?.name ?? "Producto"}</strong>
                              <small>
                                {adjustment.sourceBranch}
                                {adjustment.destinationBranch
                                  ? ` → ${adjustment.destinationBranch}`
                                  : ""}
                                {adjustment.settlementOwedProductId
                                  ? ` · entrega a ${owedProducts.find((record) => record.id === adjustment.settlementOwedProductId)?.clientName ?? "cliente"}`
                                  : adjustment.direction !== "REMOVE"
                                    ? " · sin cliente asignado"
                                    : ""}
                              </small>
                            </span>
                            <Badge variant="outline">
                              {movementLabels[adjustment.direction]} · {adjustment.quantity}
                            </Badge>
                            {batch.status === "PENDING" && (
                              <div className="movement-draft-actions">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="icon-action-button"
                                  aria-label={`Editar ${product?.name ?? "producto"}`}
                                  title="Editar"
                                  onClick={() =>
                                    setEditingBatchAdjustment({
                                      batchId: batch.id,
                                      index,
                                      draft: { ...adjustment },
                                    })
                                  }
                                >
                                  <Pencil size={15} />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="icon-action-button is-danger"
                                  aria-label={`Borrar ${product?.name ?? "producto"}`}
                                  title="Borrar"
                                  onClick={() =>
                                    onUpdateBatch(
                                      batch.id,
                                      batch.adjustments.filter(
                                        (_item, adjustmentIndex) =>
                                          adjustmentIndex !== index,
                                      ),
                                    )
                                  }
                                >
                                  <Trash2 size={15} />
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
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
                          <Ban size={15} /> Cancelar partida
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
                  {batch.status === "APPROVED" && (
                    <footer>
                      <span>
                        <PackageCheck size={15} /> Inventario aplicado
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onCancelBatch(batch.id)}
                      >
                        <Ban size={15} /> Cancelar aprobación y revertir
                      </Button>
                    </footer>
                  )}
                  {batch.resolvedAt && (
                    <small className="inventory-approval-resolved">
                      Resolución: {batch.resolvedAt}
                    </small>
                  )}
                </article>
              );
            })}
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

      <Card className="data-card monthly-cost-report-card">
        <CardContent className="p-0">
          <div className="data-card-heading">
            <div>
              <span>CIERRE MENSUAL PROTEGIDO</span>
              <h2>Reporte de costos por sucursal</h2>
            </div>
            {costAccessAuthorized ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onLockCostAccess}
              >
                <LockKeyhole size={14} /> Bloquear costos
              </Button>
            ) : (
              <Badge variant="outline">ACCESO RESTRINGIDO</Badge>
            )}
          </div>
          {!costAccessAuthorized ? (
            <div className="monthly-cost-lock">
              <LockKeyhole size={24} />
              <div>
                <strong>Información confidencial</strong>
                <p>
                  Solo usuarios master o autorizados pueden consultar y
                  descargar costos.
                </p>
              </div>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={costAccessCode}
                onChange={(event) =>
                  setCostAccessCode(
                    event.target.value.replace(/\D/g, "").slice(0, 4),
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    onAuthorizeCostAccess(costAccessCode)
                  )
                    setCostAccessCode("");
                }}
                placeholder="Código master o autorizado"
                aria-label="Código para reporte mensual de costos"
              />
              <Button
                type="button"
                disabled={costAccessCode.length !== 4}
                onClick={() => {
                  if (onAuthorizeCostAccess(costAccessCode))
                    setCostAccessCode("");
                }}
              >
                <ShieldCheck size={15} /> Desbloquear
              </Button>
            </div>
          ) : (
            <div className="monthly-cost-report-content">
              <div className="monthly-cost-toolbar">
                <div className="field-stack">
                  <Label htmlFor="monthly-cost-period">Mes del reporte</Label>
                  <Input
                    id="monthly-cost-period"
                    type="month"
                    value={reportMonth}
                    onChange={(event) => setReportMonth(event.target.value)}
                  />
                </div>
                <div className="monthly-cost-total">
                  <span>COSTO TOTAL USD</span>
                  <strong>
                    $
                    {monthlyCostMovements
                      .reduce((sum, movement) => sum + movement.totalCostUsd, 0)
                      .toFixed(2)}
                  </strong>
                </div>
                <div className="monthly-cost-total">
                  <span>COSTO TOTAL MXN</span>
                  <strong>
                    {new Intl.NumberFormat("es-MX", {
                      style: "currency",
                      currency: "MXN",
                    }).format(
                      monthlyCostMovements.reduce(
                        (sum, movement) => sum + movement.totalCostMxn,
                        0,
                      ),
                    )}
                  </strong>
                </div>
                <Button
                  type="button"
                  onClick={exportMonthlyCostReport}
                  disabled={monthlyCostMovements.length === 0}
                >
                  <FileSpreadsheet size={16} /> Exportar Excel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={exportMonthlyCostPdf}
                  disabled={monthlyCostMovements.length === 0}
                >
                  <FileText size={16} /> Exportar PDF
                </Button>
              </div>
              <div className="monthly-commercial-dashboard">
                <div>
                  <PackageSearch size={18} />
                  <span>PRODUCTO MÁS VENDIDO</span>
                  <strong>
                    {monthlySalesDashboard.topProduct?.name ?? "Sin datos"}
                  </strong>
                  <small>
                    {monthlySalesDashboard.topProduct?.quantity ?? 0} unidades
                  </small>
                </div>
                <div>
                  <CheckCircle2 size={18} />
                  <span>SERVICIO MÁS VENDIDO</span>
                  <strong>
                    {monthlySalesDashboard.topService?.name ?? "Sin datos"}
                  </strong>
                  <small>
                    {monthlySalesDashboard.topService?.quantity ?? 0} servicios
                  </small>
                </div>
                <div>
                  <FileSpreadsheet size={18} />
                  <span>TICKET PROMEDIO</span>
                  <strong>
                    {new Intl.NumberFormat("es-MX", {
                      style: "currency",
                      currency: "MXN",
                    }).format(monthlySalesDashboard.averageTicket)}
                  </strong>
                  <small>{monthlySalesDashboard.tickets} tickets</small>
                </div>
                <div className="is-positive">
                  <TrendingUp size={18} />
                  <span>MAYOR TASA DE VENTA</span>
                  <strong>
                    {monthlySalesDashboard.highestSeller?.name ?? "Sin datos"}
                  </strong>
                  <small>
                    {monthlySalesDashboard.highestSeller?.rate.toFixed(1) ??
                      "0.0"}
                    % de participación
                  </small>
                </div>
                <div className="is-negative">
                  <TrendingDown size={18} />
                  <span>MENOR TASA DE VENTA</span>
                  <strong>
                    {monthlySalesDashboard.lowestSeller?.name ?? "Sin datos"}
                  </strong>
                  <small>
                    {monthlySalesDashboard.lowestSeller?.rate.toFixed(1) ??
                      "0.0"}
                    % de participación
                  </small>
                </div>
              </div>
              <div className="monthly-sales-strategy">
                <div>
                  <Lightbulb size={21} />
                  <span>
                    <small>ESTRATEGIA AUTOMÁTICA DEL MES</small>
                    <strong>Productos, paquetes y desempeño comercial</strong>
                  </span>
                </div>
                <ol>
                  {monthlySalesStrategy.map((strategy) => (
                    <li key={strategy}>{strategy}</li>
                  ))}
                </ol>
              </div>
              <div className="monthly-branch-cost-grid">
                {monthlyBranchCosts.map(([branch, totals]) => (
                  <div key={branch}>
                    <span>{branch}</span>
                    <strong>
                      {new Intl.NumberFormat("es-MX", {
                        style: "currency",
                        currency: "MXN",
                      }).format(totals.mxn)}
                    </strong>
                    <small>
                      ${totals.usd.toFixed(2)} USD · {totals.movements}{" "}
                      movimientos
                    </small>
                  </div>
                ))}
                {monthlyBranchCosts.length === 0 && (
                  <p>No hay movimientos valorizados para este mes.</p>
                )}
              </div>
              <div className="monthly-category-cost-grid">
                {monthlyCategoryCosts.map(([category, totals]) => (
                  <div key={category}>
                    <Badge variant="outline">
                      {movementCategoryLabels[category]}
                    </Badge>
                    <strong>
                      {new Intl.NumberFormat("es-MX", {
                        style: "currency",
                        currency: "MXN",
                      }).format(totals.mxn)}
                    </strong>
                    <small>
                      ${totals.usd.toFixed(2)} USD · {totals.movements}{" "}
                      movimientos
                    </small>
                  </div>
                ))}
              </div>
              <div className="table-scroll">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>FECHA / FOLIO</TableHead>
                      <TableHead>SUCURSAL</TableHead>
                      <TableHead>PRODUCTO</TableHead>
                      <TableHead>MOVIMIENTO</TableHead>
                      <TableHead>CANTIDAD</TableHead>
                      <TableHead>COSTO USD</TableHead>
                      <TableHead>COSTO MXN</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyCostMovements.map((movement) => (
                      <TableRow key={`cost-${movement.id}`}>
                        <TableCell>
                          <strong>{movement.createdAt}</strong>
                          <small className="seller-payment-methods">
                            {movement.folio}
                          </small>
                        </TableCell>
                        <TableCell>
                          {movement.sourceBranch}
                          {movement.destinationBranch
                            ? ` → ${movement.destinationBranch}`
                            : ""}
                        </TableCell>
                        <TableCell>{movement.productName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {movementCategoryLabels[movement.category]}
                          </Badge>
                          <small className="seller-payment-methods">
                            {movement.reason}
                          </small>
                        </TableCell>
                        <TableCell>{movement.quantity}</TableCell>
                        <TableCell>
                          ${movement.totalCostUsd.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {new Intl.NumberFormat("es-MX", {
                            style: "currency",
                            currency: "MXN",
                          }).format(movement.totalCostMxn)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
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
                  <TableHead>VENDEDOR</TableHead>
                  <TableHead>TICKET</TableHead>
                  <TableHead>PRODUCTO</TableHead>
                  <TableHead>SUCURSAL</TableHead>
                  <TableHead>DEUDA / ENTREGADO</TableHead>
                  <TableHead>ESTADO</TableHead>
                  <TableHead>ACCIÓN</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {owedProducts.map((record) => {
                  const available =
                    branchInventory[record.branch]?.[record.productId] ?? 0;
                  const pendingCommitted = owedProducts
                    .filter(
                      (item) =>
                        item.status === "PENDING" &&
                        item.inventoryCommitted &&
                        item.branch === record.branch &&
                        item.productId === record.productId,
                    )
                    .reduce(
                      (sum, item) =>
                        sum +
                        Math.max(
                          0,
                          item.quantity - item.deliveredQuantity,
                        ),
                      0,
                    );
                  const assignable = record.inventoryCommitted
                    ? Math.max(
                        0,
                        pendingCommitted - Math.max(0, -available),
                      )
                    : Math.max(available, 0);
                  const remaining = Math.max(
                    0,
                    record.quantity - record.deliveredQuantity,
                  );
                  return (
                    <TableRow key={record.id}>
                      <TableCell>
                        <strong>{record.clientName}</strong>
                        <small className="seller-payment-methods">
                          {record.clientPhone}
                        </small>
                      </TableCell>
                      <TableCell>
                        <strong>{record.sellerNames.join(" / ") || "Empresa"}</strong>
                        <small className="seller-payment-methods">
                          Seguimiento de entrega
                        </small>
                      </TableCell>
                      <TableCell>
                        <strong>{record.ticketId}</strong>
                        <small className="seller-payment-methods">
                          Alta {record.createdAt}
                        </small>
                      </TableCell>
                      <TableCell>{record.productName}</TableCell>
                      <TableCell>
                        <strong>{record.branch}</strong>
                        <small
                          className={`seller-payment-methods ${available < 0 ? "is-negative" : ""}`}
                        >
                          Stock {available}
                        </small>
                      </TableCell>
                      <TableCell>
                        <strong className={remaining > 0 ? "is-negative" : ""}>
                          {remaining} pendiente{remaining === 1 ? "" : "s"}
                        </strong>
                        <small className="seller-payment-methods">
                          {record.deliveredQuantity} de {record.quantity} entregado(s)
                        </small>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            record.status === "PENDING" ? "outline" : "default"
                          }
                        >
                          {record.status === "PENDING"
                            ? "POR ENTREGAR"
                            : record.status === "FULFILLED"
                              ? "ENTREGADO"
                              : "CANCELADO"}
                        </Badge>
                        <small className="seller-payment-methods owed-delivery-dates">
                          {record.deliveryHistory.length > 0
                            ? record.deliveryHistory
                                .map(
                                  (delivery) =>
                                    `${delivery.quantity} pza · ${delivery.deliveredAt}`,
                                )
                                .join(" | ")
                            : "Sin entrega registrada"}
                        </small>
                      </TableCell>
                      <TableCell>
                        {record.status === "PENDING" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={assignable < 1}
                            onClick={() => onFulfillOwedProduct(record.id)}
                          >
                            {assignable > 0
                              ? `Entregar ${Math.min(assignable, remaining)}`
                              : "Esperando entrada"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!owedProducts.length && (
                  <TableRow>
                    <TableCell colSpan={8}>
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
              onChange={(date) =>
                setFilterDate(date || movementBusinessToday)
              }
              placeholder="Fecha del historial"
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
          <div className="movement-filter-field">
            <Building2 size={17} />
            <Select value={reportBranch} onValueChange={setReportBranch}>
              <SelectTrigger aria-label="Filtrar movimientos por sucursal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas las sucursales</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="data-card">
        <CardContent className="p-0">
          <div className="data-card-heading">
            <div>
              <span>
                BITÁCORA MOCK ·{" "}
                {filterDate === movementBusinessToday
                  ? "MOVIMIENTOS DE HOY"
                  : filterDate}
              </span>
              <h2>Historial de movimientos</h2>
            </div>
            <Badge variant="outline">
              {filteredMovementGroups.length} folios
            </Badge>
          </div>
          <div className="table-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    label="FOLIO / FECHA"
                    active={historySort.key === "folio"}
                    direction={historySort.direction}
                    onSort={() => toggleHistorySort("folio")}
                  />
                  <SortableTableHead
                    label="PRODUCTO"
                    active={historySort.key === "product"}
                    direction={historySort.direction}
                    onSort={() => toggleHistorySort("product")}
                  />
                  <SortableTableHead
                    label="TIPO"
                    active={historySort.key === "direction"}
                    direction={historySort.direction}
                    onSort={() => toggleHistorySort("direction")}
                  />
                  <SortableTableHead
                    label="SUCURSAL / RUTA"
                    active={historySort.key === "route"}
                    direction={historySort.direction}
                    onSort={() => toggleHistorySort("route")}
                  />
                  <SortableTableHead
                    label="CANTIDAD TOTAL"
                    active={historySort.key === "quantity"}
                    direction={historySort.direction}
                    onSort={() => toggleHistorySort("quantity")}
                  />
                  <SortableTableHead
                    label="EXISTENCIA"
                    active={historySort.key === "stock"}
                    direction={historySort.direction}
                    onSort={() => toggleHistorySort("stock")}
                  />
                  <SortableTableHead
                    label="MOTIVO"
                    active={historySort.key === "reason"}
                    direction={historySort.direction}
                    onSort={() => toggleHistorySort("reason")}
                  />
                  <SortableTableHead
                    label="CLIENTE / VENDEDOR"
                    active={historySort.key === "participant"}
                    direction={historySort.direction}
                    onSort={() => toggleHistorySort("participant")}
                  />
                  {costAccessAuthorized && (
                    <SortableTableHead
                      label="COSTO TOTAL"
                      active={historySort.key === "cost"}
                      direction={historySort.direction}
                      onSort={() => toggleHistorySort("cost")}
                    />
                  )}
                  <TableHead>VER</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movementHistoryPagination.paginatedItems.map((group) => {
                  const productNames = Array.from(
                    new Set(
                      group.movements.map((movement) => movement.productName),
                    ),
                  );
                  const directions = Array.from(
                    new Set(
                      group.movements.map(
                        (movement) => movementLabels[movement.direction],
                      ),
                    ),
                  );
                  const routes = Array.from(
                    new Set(
                      group.movements.map((movement) =>
                        movement.destinationBranch
                          ? `${movement.sourceBranch} → ${movement.destinationBranch}`
                          : movement.sourceBranch,
                      ),
                    ),
                  );
                  const reasons = Array.from(
                    new Set(
                      group.movements.map((movement) => movement.reason),
                    ),
                  );
                  const participants = Array.from(
                    new Set(
                      group.movements.flatMap((movement) => [
                        movement.settledClientName ?? "",
                        ...(movement.settledSellerNames ?? []),
                      ]),
                    ),
                  ).filter(Boolean);
                  const firstMovement = group.movements[0]!;

                  return (
                    <TableRow key={group.key}>
                      <TableCell>
                        <strong>{group.folio}</strong>
                        <small className="seller-payment-methods">
                          {group.createdAt} · {group.movements.length}{" "}
                          {group.movements.length === 1
                            ? "partida"
                            : "partidas"}
                        </small>
                      </TableCell>
                      <TableCell>
                        <strong>
                          {productNames.length === 1
                            ? productNames[0]
                            : `${productNames.length} productos`}
                        </strong>
                        {productNames.length > 1 && (
                          <small className="seller-payment-methods">
                            {productNames.join(" · ")}
                          </small>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {directions.length === 1 ? directions[0] : "MIXTO"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {routes.length === 1
                          ? routes[0]
                          : `${routes.length} rutas`}
                      </TableCell>
                      <TableCell>
                        <strong>{group.totalQuantity}</strong>
                      </TableCell>
                      <TableCell
                        className={
                          group.movements.some(
                            (movement) =>
                              movement.newStock < 0 ||
                              (movement.destinationNewStock ?? 0) < 0,
                          )
                            ? "is-negative"
                            : ""
                        }
                      >
                        {group.movements.length === 1 ? (
                          <>
                            {firstMovement.previousStock} →{" "}
                            {firstMovement.newStock}
                            {firstMovement.destinationPreviousStock !== null
                              ? ` / ${firstMovement.destinationPreviousStock} → ${firstMovement.destinationNewStock}`
                              : ""}
                          </>
                        ) : (
                          `${group.movements.length} resultados`
                        )}
                      </TableCell>
                      <TableCell>
                        {reasons.length === 1
                          ? reasons[0]
                          : `${reasons.length} motivos`}
                      </TableCell>
                      <TableCell>
                        {participants.length > 0 ? (
                          participants.join(" · ")
                        ) : (
                          <span>—</span>
                        )}
                      </TableCell>
                      {costAccessAuthorized && (
                        <TableCell>
                          <strong>
                            {new Intl.NumberFormat("es-MX", {
                              style: "currency",
                              currency: "MXN",
                            }).format(group.totalCostMxn)}
                          </strong>
                          <small className="seller-payment-methods">
                            ${group.totalCostUsd.toFixed(2)} USD
                          </small>
                        </TableCell>
                      )}
                      <TableCell>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="movement-eye-button"
                          onClick={() => setSelectedMovementGroupKey(group.key)}
                          aria-label={`Visualizar folio ${group.folio}`}
                          title={`Visualizar folio ${group.folio}`}
                        >
                          <Eye size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!filteredMovementGroups.length && (
                  <TableRow>
                    <TableCell colSpan={costAccessAuthorized ? 10 : 9}>
                      No hay movimientos registrados el {filterDate} que
                      coincidan con los filtros.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <HistoryPagination
            total={filteredMovementGroups.length}
            page={movementHistoryPagination.page}
            pageSize={movementHistoryPagination.pageSize}
            pageCount={movementHistoryPagination.pageCount}
            onPageChange={movementHistoryPagination.setPage}
            onPageSizeChange={movementHistoryPagination.setPageSize}
          />
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selectedMovementGroup)}
        onOpenChange={(open) => {
          if (!open) setSelectedMovementGroupKey(null);
        }}
      >
        <DialogContent className="movement-folio-dialog sm:max-w-[1040px]">
          {selectedMovementGroup && selectedMovementTotals && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Detalle del folio {selectedMovementGroup.folio}
                </DialogTitle>
                <DialogDescription>
                  {selectedMovementGroup.createdAt} · Movimiento consolidado con{" "}
                  {selectedMovementGroup.movements.length}{" "}
                  {selectedMovementGroup.movements.length === 1
                    ? "partida"
                    : "partidas"}
                  .
                </DialogDescription>
              </DialogHeader>

              <div className="movement-folio-summary">
                <article>
                  <span>TOTAL DEL MOVIMIENTO</span>
                  <strong>{selectedMovementGroup.totalQuantity}</strong>
                  <small>unidades registradas</small>
                </article>
                <article>
                  <span>SUMAS</span>
                  <strong>{selectedMovementTotals.additions}</strong>
                  <small>unidades de entrada</small>
                </article>
                <article>
                  <span>BAJAS</span>
                  <strong>{selectedMovementTotals.removals}</strong>
                  <small>unidades de salida</small>
                </article>
                <article>
                  <span>TRANSFERENCIAS</span>
                  <strong>{selectedMovementTotals.transfers}</strong>
                  <small>unidades trasladadas</small>
                </article>
              </div>

              <div className="table-scroll movement-folio-lines">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PRODUCTO</TableHead>
                      <TableHead>TIPO</TableHead>
                      <TableHead>SUCURSAL / RUTA</TableHead>
                      <TableHead>CANTIDAD</TableHead>
                      <TableHead>EXISTENCIA</TableHead>
                      <TableHead>MOTIVO / COMENTARIO</TableHead>
                      {costAccessAuthorized && <TableHead>COSTO</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedMovementGroup.movements.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell>
                          <strong>{movement.productName}</strong>
                          <small className="seller-payment-methods">
                            {movement.folio}
                          </small>
                        </TableCell>
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
                        <TableCell>
                          <strong>{movement.quantity}</strong>
                        </TableCell>
                        <TableCell>
                          {movement.previousStock} → {movement.newStock}
                          {movement.destinationPreviousStock !== null
                            ? ` / ${movement.destinationPreviousStock} → ${movement.destinationNewStock}`
                            : ""}
                        </TableCell>
                        <TableCell>
                          {movement.reason}
                          {movement.comment && (
                            <small className="seller-payment-methods">
                              {movement.comment}
                            </small>
                          )}
                        </TableCell>
                        {costAccessAuthorized && (
                          <TableCell>
                            <strong>
                              {new Intl.NumberFormat("es-MX", {
                                style: "currency",
                                currency: "MXN",
                              }).format(movement.totalCostMxn)}
                            </strong>
                            <small className="seller-payment-methods">
                              ${movement.totalCostUsd.toFixed(2)} USD
                            </small>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  onClick={() => setSelectedMovementGroupKey(null)}
                >
                  Cerrar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
