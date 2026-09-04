import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  BadgeDollarSign,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Eye,
  FileDown,
  FileSpreadsheet,
  Filter,
  FlaskConical,
  LockKeyhole,
  PackageCheck,
  PackagePlus,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Search,
  ShoppingBasket,
  Send,
  ShieldCheck,
  Trash2,
  TrendingDown,
  TrendingUp,
  Truck,
  Upload,
  Warehouse,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
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
  Textarea,
  toast,
} from "@cosmetics/ui";
import { formatCurrency } from "../mock-data";
import { WarehousePriceLists } from "./WarehousePriceLists";
import { WarehouseStockView } from "./WarehouseStockView";
import type {
  Client,
  Product,
  Ticket,
  WarehouseMovement,
  WarehouseMovementCategory,
  WarehouseMovementKind,
  WarehouseMovementLine,
  WarehouseMovementStatus,
  WarehousePriceList,
  WarehousePricingSelection,
  WarehouseRequestType,
  WarehouseSupplyItem,
  WarehouseStock,
  WarehouseSupplier,
} from "../types";

type WarehouseTab = "STOCK" | "PURCHASE_ORDERS" | "ENTRY" | "BRANCH_ORDERS" | "SHIPMENTS" | "REQUEST_PRODUCTS" | "REQUEST_TESTERS" | "REQUEST_SUPPLIES" | "PRICE_LISTS" | "REPORT";
export type WarehouseScope = "MATRIX" | "BRANCHES";
type WarehouseApprovalAction = "CREATION" | "SEND" | "RECEIVE" | "CANCEL" | "DELETE";
type WarehouseSortKey = "folio" | "date" | "type" | "branch" | "status" | "units" | "value";

interface DraftLine {
  productId: string;
  quantity: number;
  partnerCost: number;
}

interface WarehouseViewProps {
  scope: WarehouseScope;
  initialRequestType?: WarehouseRequestType;
  products: Product[];
  tickets: Ticket[];
  branches: string[];
  stock: WarehouseStock;
  movements: WarehouseMovement[];
  categories: WarehouseMovementCategory[];
  supplies: WarehouseSupplyItem[];
  suppliers: WarehouseSupplier[];
  priceLists: WarehousePriceList[];
  clients: Client[];
  canManage: boolean;
  canViewCosts: boolean;
  canRequest: boolean;
  currentUserName: string;
  onCreateEntry: (lines: WarehouseMovementLine[], comment: string, code: string) => boolean;
  onCreateMovement: (
    kind: "SHIPMENT" | "BRANCH_REQUEST",
    requestType: WarehouseRequestType,
    categoryId: string,
    branch: string,
    lines: WarehouseMovementLine[],
    comment: string,
    pricing: WarehousePricingSelection,
  ) => boolean;
  onEditMovement: (
    id: string,
    categoryId: string,
    branch: string,
    lines: WarehouseMovementLine[],
    comment: string,
    pricing: WarehousePricingSelection,
  ) => boolean;
  onApproveCreation: (id: string, code: string) => boolean;
  onApproveSend: (id: string, code: string) => boolean;
  onReceive: (id: string, code: string) => boolean;
  onCancel: (id: string, code: string) => boolean;
  onDelete: (id: string, code: string) => boolean;
  onToggleSupplyVisibility: (id: string) => void;
  onSaveSupply: (item: WarehouseSupplyItem) => boolean;
  onDeleteSupply: (id: string) => void;
  onCreateRestockOrder: (supplierId: string, lines: WarehouseMovementLine[], comment: string) => boolean;
  onSavePriceList: (list: WarehousePriceList) => boolean;
  onTogglePriceList: (id: string) => void;
  onDeletePriceList: (id: string) => void;
}

const statusLabels: Record<WarehouseMovementStatus, string> = {
  DRAFT: "Borrador",
  REQUESTED: "Solicitado",
  CREATION_APPROVED: "Creación aprobada",
  SENT: "Enviado",
  RECEIVED: "Entregado en sucursal",
  CANCELLED: "Cancelado",
};

const kindLabels: Record<WarehouseMovementKind, string> = {
  ENTRY: "Ingreso de mercancía",
  SHIPMENT: "Envío de bodega",
  BRANCH_REQUEST: "Pedido de sucursal",
  PURCHASE_ORDER: "Pedido de resurtido a proveedor",
};

const requestTypeLabels: Record<WarehouseRequestType, string> = {
  PRODUCT: "Pedido de productos",
  TESTER: "Pedido de testers",
  SUPPLY: "Pedido de insumos",
};

const movementUnits = (movement: WarehouseMovement) =>
  movement.lines.reduce((sum, line) => sum + line.quantity, 0);

const movementValue = (movement: WarehouseMovement) =>
  movement.lines.reduce((sum, line) => sum + line.quantity * (movement.kind === "BRANCH_REQUEST" ? line.partnerCost : line.unitCostMxn), 0);

const movementValueUsd = (movement: WarehouseMovement) =>
  movement.lines.reduce((sum, line) => sum + line.quantity * (movement.kind === "BRANCH_REQUEST" ? (line.partnerCostUsd ?? line.unitCostUsd) : line.unitCostUsd), 0);

const createLines = (
  draftLines: DraftLine[],
  products: Product[],
  supplies: WarehouseSupplyItem[],
): WarehouseMovementLine[] =>
  draftLines.reduce<WarehouseMovementLine[]>((result, line) => {
    const product = products.find((candidate) => candidate.id === line.productId);
    if (product?.kind === "PRODUCT") {
      result.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        itemType: "PRODUCT",
        quantity: line.quantity,
        unitCostUsd: product.costUsd,
        unitCostMxn: product.costMxn,
        partnerCost: Math.max(product.costMxn, line.partnerCost || product.partnerCost || product.costMxn),
        partnerCostUsd: Math.max(product.costUsd, product.costUsd * ((line.partnerCost || product.partnerCost || product.costMxn) / Math.max(1, product.costMxn))),
        retailPrice: product.maxPrice,
        family: product.family,
        category: product.category,
        supplierId: product.supplierId ?? null,
        supplierName: product.supplierName ?? null,
        presentation: product.presentation ?? "Pieza individual",
        unitsPerPackage: product.unitsPerPackage ?? 1,
      });
      return result;
    }
    const supply = supplies.find((candidate) => candidate.id === line.productId);
    if (!supply) return result;
    result.push({
      productId: supply.id,
      productName: supply.name,
      sku: supply.sku,
      itemType: "SUPPLY",
      quantity: line.quantity,
      unitCostUsd: supply.costUsd,
      unitCostMxn: supply.costMxn,
      partnerCost: supply.partnerCost,
      partnerCostUsd: Math.max(supply.costUsd, supply.costUsd * (supply.partnerCost / Math.max(1, supply.costMxn))),
      retailPrice: supply.retailPrice,
      family: supply.family,
      category: supply.category,
      supplierId: supply.supplierId,
      supplierName: supply.supplierName,
      presentation: supply.presentation,
      unitsPerPackage: supply.unitsPerPackage,
    });
    return result;
  }, []);

const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  }).format(new Date(iso));

export function WarehouseView({
  scope,
  initialRequestType = "PRODUCT",
  products,
  tickets,
  branches,
  stock,
  movements,
  categories,
  supplies,
  suppliers,
  priceLists,
  clients,
  canManage,
  canViewCosts,
  canRequest,
  currentUserName,
  onCreateEntry,
  onCreateMovement,
  onEditMovement,
  onApproveCreation,
  onApproveSend,
  onReceive,
  onCancel,
  onDelete,
  onToggleSupplyVisibility,
  onSaveSupply,
  onDeleteSupply,
  onCreateRestockOrder,
  onSavePriceList,
  onTogglePriceList,
  onDeletePriceList,
}: WarehouseViewProps) {
  const physicalProducts = products.filter((product) => product.kind === "PRODUCT" && product.active);
  const activeCategories = categories.filter((category) => category.active);
  const [tab, setTab] = useState<WarehouseTab>(
    scope === "MATRIX"
      ? "STOCK"
      : initialRequestType === "TESTER"
        ? "REQUEST_TESTERS"
        : initialRequestType === "SUPPLY"
          ? "REQUEST_SUPPLIES"
          : "REQUEST_PRODUCTS",
  );
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [formOpen, setFormOpen] = useState(false);
  const [formKind, setFormKind] = useState<WarehouseMovementKind>("ENTRY");
  const [formRequestType, setFormRequestType] = useState<WarehouseRequestType>("PRODUCT");
  const [editingMovementId, setEditingMovementId] = useState<string | null>(null);
  const [destinationBranch, setDestinationBranch] = useState(branches[0] ?? "");
  const [categoryId, setCategoryId] = useState(activeCategories[0]?.id ?? "");
  const [comment, setComment] = useState("");
  const [authorizationCode, setAuthorizationCode] = useState("");
  const [draftLines, setDraftLines] = useState<DraftLine[]>([]);
  const [lineProductId, setLineProductId] = useState(physicalProducts[0]?.id ?? "");
  const [lineQuantity, setLineQuantity] = useState(1);
  const [linePartnerCost, setLinePartnerCost] = useState(physicalProducts[0]?.partnerCost ?? physicalProducts[0]?.costMxn ?? 0);
  const [selectedPriceListId, setSelectedPriceListId] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("NONE");
  const [partnerAdjustmentMode, setPartnerAdjustmentMode] = useState<"PERCENT" | "AMOUNT">("PERCENT");
  const [partnerAdjustmentValue, setPartnerAdjustmentValue] = useState(22);
  const [approval, setApproval] = useState<{ action: WarehouseApprovalAction; movement: WarehouseMovement } | null>(null);
  const [approvalCode, setApprovalCode] = useState("");
  const [finalConfirmation, setFinalConfirmation] = useState(false);
  const [branchOrderRequestType, setBranchOrderRequestType] = useState<WarehouseRequestType>("PRODUCT");
  const [detailMovement, setDetailMovement] = useState<WarehouseMovement | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [supplierFilter, setSupplierFilter] = useState("ALL");
  const [historyTypeFilter, setHistoryTypeFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState<{ key: WarehouseSortKey; direction: "asc" | "desc" }>({ key: "date", direction: "desc" });
  const branchKey = branches.join("\u0000");

  useEffect(() => {
    if (!branches.includes(destinationBranch))
      setDestinationBranch(branches[0] ?? "");
    if (branchFilter !== "ALL" && !branches.includes(branchFilter))
      setBranchFilter("ALL");
  }, [branchFilter, branchKey, destinationBranch]);

  const visibleSupplies = supplies.filter((supply) => supply.active && supply.branchVisible);
  const testerProducts = physicalProducts.filter((product) => product.testerOrderEnabled);
  const formItems = formKind !== "BRANCH_REQUEST" || formRequestType === "PRODUCT"
    ? physicalProducts.map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        image: product.image,
        costMxn: product.costMxn,
        partnerCost: product.partnerCost ?? product.costMxn,
      }))
    : formRequestType === "TESTER"
      ? testerProducts.map((product) => ({
          id: product.id,
          name: product.name,
          sku: product.sku,
          image: product.image,
          costMxn: product.costMxn,
          partnerCost: product.partnerCost ?? product.costMxn,
        }))
      : visibleSupplies.map((supply) => ({
          id: supply.id,
          name: supply.name,
          sku: supply.sku,
          image: supply.image,
          costMxn: supply.costMxn,
          partnerCost: supply.partnerCost,
        }));

  const findWarehouseItem = (id: string) => formItems.find((item) => item.id === id)
    ?? physicalProducts.map((product) => ({ id: product.id, name: product.name, sku: product.sku, image: product.image, costMxn: product.costMxn, partnerCost: product.partnerCost ?? product.costMxn })).find((item) => item.id === id)
    ?? supplies.map((supply) => ({ id: supply.id, name: supply.name, sku: supply.sku, image: supply.image, costMxn: supply.costMxn, partnerCost: supply.partnerCost })).find((item) => item.id === id);

  const eligiblePriceLists = priceLists.filter((list) => {
    if (!list.active || !list.branchNames.includes(destinationBranch)) return false;
    if (selectedCustomerId === "NONE") return list.clientIds.length === 0;
    return list.clientIds.length === 0 || list.clientIds.includes(selectedCustomerId);
  });
  const selectedPriceList = priceLists.find((list) => list.id === selectedPriceListId) ?? null;

  const selectBranchForOrder = (branch: string) => {
    setDestinationBranch(branch);
    if (formKind !== "BRANCH_REQUEST") return;
    const eligible = priceLists.filter((list) => list.active && list.branchNames.includes(branch) && (
      selectedCustomerId === "NONE" ? list.clientIds.length === 0 : list.clientIds.length === 0 || list.clientIds.includes(selectedCustomerId)
    ));
    setSelectedPriceListId(eligible[0]?.id ?? "");
  };

  const selectCustomerForOrder = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const eligible = priceLists.filter((list) => list.active && list.branchNames.includes(destinationBranch) && (
      customerId === "NONE" ? list.clientIds.length === 0 : list.clientIds.length === 0 || list.clientIds.includes(customerId)
    ));
    setSelectedPriceListId(eligible[0]?.id ?? "");
  };

  const salesByProduct = useMemo(() => {
    const summary = new Map<string, number>();
    tickets.filter((ticket) => ticket.status === "COMPLETED").forEach((ticket) => {
      ticket.products.forEach((line) => summary.set(line.productId, (summary.get(line.productId) ?? 0) + line.quantity));
    });
    return summary;
  }, [tickets]);

  const stockRows = physicalProducts.map((product) => {
    const quantity = stock[product.id] ?? 0;
    const entries = movements.filter((movement) => movement.kind === "ENTRY" && movement.status === "RECEIVED").flatMap((movement) => movement.lines).filter((line) => line.productId === product.id).reduce((sum, line) => sum + line.quantity, 0);
    const outputs = movements.filter((movement) => movement.kind !== "ENTRY" && ["SENT", "RECEIVED"].includes(movement.status)).flatMap((movement) => movement.lines).filter((line) => line.productId === product.id).reduce((sum, line) => sum + line.quantity, 0);
    const partnerCost = product.partnerCost ?? Math.max(product.costMxn, Math.round(product.costMxn * 1.22));
    return {
      product,
      quantity,
      entries,
      outputs,
      partnerCost,
      sold: salesByProduct.get(product.id) ?? 0,
      utility: Math.max(0, partnerCost - product.costMxn),
    };
  });
  const supplyRows = supplies.map((supply) => {
    const entries = movements.filter((movement) => movement.kind === "ENTRY" && movement.status === "RECEIVED").flatMap((movement) => movement.lines).filter((line) => line.productId === supply.id).reduce((sum, line) => sum + line.quantity, 0);
    const outputs = movements.filter((movement) => movement.requestType === "SUPPLY" && ["SENT", "RECEIVED"].includes(movement.status)).flatMap((movement) => movement.lines).filter((line) => line.productId === supply.id).reduce((sum, line) => sum + line.quantity, 0);
    return { supply, quantity: stock[supply.id] ?? 0, entries, outputs };
  });
  const totalUnits = stockRows.reduce((sum, row) => sum + row.quantity, 0) + supplyRows.reduce((sum, row) => sum + row.quantity, 0);
  const totalMxn = stockRows.reduce((sum, row) => sum + row.quantity * row.product.costMxn, 0) + supplyRows.reduce((sum, row) => sum + row.quantity * row.supply.costMxn, 0);
  const totalUsd = stockRows.reduce((sum, row) => sum + row.quantity * row.product.costUsd, 0) + supplyRows.reduce((sum, row) => sum + row.quantity * row.supply.costUsd, 0);
  const partnerValue = stockRows.reduce((sum, row) => sum + row.quantity * row.partnerCost, 0) + supplyRows.reduce((sum, row) => sum + row.quantity * row.supply.partnerCost, 0);
  const topProduct = [...stockRows].sort((left, right) => right.sold - left.sold)[0];
  const slowProduct = [...stockRows].sort((left, right) => left.sold - right.sold)[0];

  const filteredMovements = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("es-MX");
    const rows = movements.filter((movement) => {
      const isAuthorizedBranch = movement.destinationBranch
        ? branches.includes(movement.destinationBranch)
        : scope === "MATRIX";
      if (!isAuthorizedBranch) return false;
      if (selectedCategory !== "ALL" && movement.categoryId !== selectedCategory) return false;
      if (statusFilter !== "ALL" && movement.status !== statusFilter) return false;
      if (branchFilter !== "ALL" && movement.destinationBranch !== branchFilter) return false;
      if (supplierFilter !== "ALL" && movement.supplierId !== supplierFilter && !movement.lines.some((line) => line.supplierId === supplierFilter)) return false;
      if (historyTypeFilter === "PRODUCT" && (movement.requestType ?? "PRODUCT") !== "PRODUCT") return false;
      if (historyTypeFilter === "TESTER" && movement.requestType !== "TESTER") return false;
      if (historyTypeFilter === "SUPPLY" && movement.requestType !== "SUPPLY") return false;
      if (historyTypeFilter === "AUTHORIZED" && !["SENT", "RECEIVED"].includes(movement.status)) return false;
      if (historyTypeFilter === "PENDING" && !["DRAFT", "REQUESTED", "CREATION_APPROVED"].includes(movement.status)) return false;
      const date = movement.createdAtIso.slice(0, 10);
      if (dateFrom && date < dateFrom) return false;
      if (dateTo && date > dateTo) return false;
      if (!normalizedSearch) return true;
      return [movement.folio, movement.categoryLabel, movement.destinationBranch ?? "Bodega", movement.createdByName, movement.priceListName ?? "", movement.customerName ?? "", ...movement.lines.flatMap((line) => [line.productName, line.sku])].some((value) => value.toLocaleLowerCase("es-MX").includes(normalizedSearch));
    });
    return rows.sort((left, right) => {
      const values: Record<WarehouseSortKey, [string | number, string | number]> = {
        folio: [left.folio, right.folio],
        date: [left.createdAtIso, right.createdAtIso],
        type: [left.categoryLabel, right.categoryLabel],
        branch: [left.destinationBranch ?? "", right.destinationBranch ?? ""],
        status: [left.status, right.status],
        units: [movementUnits(left), movementUnits(right)],
        value: [movementValue(left), movementValue(right)],
      };
      const [a, b] = values[sort.key];
      const comparison = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), "es-MX");
      return sort.direction === "asc" ? comparison : -comparison;
    });
  }, [branchFilter, branches, dateFrom, dateTo, historyTypeFilter, movements, scope, search, selectedCategory, sort, statusFilter, supplierFilter]);

  const shipments = movements.filter((movement) =>
    ["SHIPMENT", "BRANCH_REQUEST"].includes(movement.kind) &&
    ["SENT", "RECEIVED"].includes(movement.status) &&
    Boolean(
      movement.destinationBranch &&
        branches.includes(movement.destinationBranch),
    ),
  );
  const requests = movements.filter(
    (movement) =>
      movement.kind === "BRANCH_REQUEST" &&
      Boolean(
        movement.destinationBranch &&
          branches.includes(movement.destinationBranch),
      ),
  );
  const pendingBranchOrders = movements.filter(
    (movement) =>
      ["BRANCH_REQUEST", "SHIPMENT"].includes(movement.kind) &&
      ["DRAFT", "REQUESTED", "CREATION_APPROVED"].includes(
        movement.status,
      ) &&
      Boolean(
        movement.destinationBranch &&
          branches.includes(movement.destinationBranch),
      ),
  );
  const newBranchRequests = requests.filter(
    (movement) => movement.status === "REQUESTED",
  );
  const purchaseOrders = movements.filter((movement) => movement.kind === "PURCHASE_ORDER");
  const productRequests = requests.filter((movement) => (movement.requestType ?? "PRODUCT") === "PRODUCT");
  const testerRequests = requests.filter((movement) => movement.requestType === "TESTER");
  const supplyRequests = requests.filter((movement) => movement.requestType === "SUPPLY");

  const resetForm = () => {
    setEditingMovementId(null);
    setDraftLines([]);
    setComment("");
    setAuthorizationCode("");
    setLineQuantity(1);
    setDestinationBranch(branches[0] ?? "");
    setCategoryId(activeCategories[0]?.id ?? "");
    setSelectedCustomerId("NONE");
    setSelectedPriceListId(priceLists.find((list) => list.active && list.branchNames.includes(branches[0] ?? "") && list.clientIds.length === 0)?.id ?? "");
  };

  const openForm = (kind: WarehouseMovementKind, requestType: WarehouseRequestType = "PRODUCT") => {
    resetForm();
    setFormKind(kind);
    setFormRequestType(requestType);
    const initialItem = requestType === "SUPPLY"
      ? visibleSupplies[0]
      : requestType === "TESTER"
        ? testerProducts[0]
        : physicalProducts[0];
    setLineProductId(initialItem?.id ?? "");
    setLinePartnerCost(initialItem?.partnerCost ?? initialItem?.costMxn ?? 0);
    if (kind === "BRANCH_REQUEST") {
      setCategoryId(requestType === "TESTER" ? "warehouse-testers" : requestType === "SUPPLY" ? "warehouse-supplies" : "warehouse-products");
      setSelectedPriceListId(priceLists.find((list) => list.active && list.branchNames.includes(branches[0] ?? "") && list.clientIds.length === 0)?.id ?? "");
    }
    setFormOpen(true);
  };

  const openEdit = (movement: WarehouseMovement) => {
    setEditingMovementId(movement.id);
    setFormKind(movement.kind);
    setFormRequestType(movement.requestType ?? "PRODUCT");
    setDestinationBranch(movement.destinationBranch ?? branches[0] ?? "");
    setCategoryId(movement.categoryId);
    setComment(movement.comment);
    setDraftLines(movement.lines.map((line) => ({ productId: line.productId, quantity: line.quantity, partnerCost: line.partnerCost })));
    setSelectedCustomerId(movement.customerId ?? "NONE");
    setSelectedPriceListId(movement.priceListId ?? "");
    setAuthorizationCode("");
    setFormOpen(true);
  };

  const addDraftLine = () => {
    const item = findWarehouseItem(lineProductId);
    if (!item || lineQuantity <= 0) return;
    setDraftLines((current) => {
      const existing = current.find((line) => line.productId === item.id);
      if (existing) return current.map((line) => line.productId === item.id ? { ...line, quantity: line.quantity + lineQuantity, partnerCost: Math.max(item.costMxn, linePartnerCost) } : line);
      return [...current, { productId: item.id, quantity: lineQuantity, partnerCost: Math.max(item.costMxn, linePartnerCost || item.partnerCost || item.costMxn) }];
    });
    setLineQuantity(1);
  };

  const applyPartnerAdjustment = () => {
    if (draftLines.length === 0) {
      toast.error("Agrega productos antes de calcular el costo socio.");
      return;
    }
    setDraftLines((current) => current.map((line) => {
      const product = physicalProducts.find((candidate) => candidate.id === line.productId);
      const cost = product?.costMxn ?? 0;
      const partnerCost = partnerAdjustmentMode === "PERCENT"
        ? cost * (1 + Math.max(0, partnerAdjustmentValue) / 100)
        : cost + Math.max(0, partnerAdjustmentValue);
      return { ...line, partnerCost: Math.round(partnerCost * 100) / 100 };
    }));
    toast.success(`Costo socio aplicado por ${partnerAdjustmentMode === "PERCENT" ? "porcentaje" : "importe"}.`);
  };

  const submitForm = () => {
    const lines = createLines(draftLines, products, supplies);
    if (lines.length === 0) {
      toast.error("Agrega por lo menos un producto al movimiento.");
      return;
    }
    let saved = false;
    const pricing: WarehousePricingSelection = {
      priceListId: formKind === "BRANCH_REQUEST" ? selectedPriceListId || null : null,
      customerId: selectedCustomerId === "NONE" ? null : selectedCustomerId,
    };
    if (formKind === "BRANCH_REQUEST" && !pricing.priceListId) {
      toast.error("Selecciona una lista de precios válida para la sucursal y el cliente.");
      return;
    }
    if (editingMovementId) saved = onEditMovement(editingMovementId, categoryId, destinationBranch, lines, comment, pricing);
    else if (formKind === "ENTRY") saved = onCreateEntry(lines, comment, authorizationCode);
    else if (formKind === "SHIPMENT" || formKind === "BRANCH_REQUEST") saved = onCreateMovement(formKind, formRequestType, categoryId, destinationBranch, lines, comment, pricing);
    if (!saved) return;
    setFormOpen(false);
    resetForm();
  };

  const runApproval = () => {
    if (!approval) return;
    if (approval.action === "SEND" && !finalConfirmation) {
      toast.error("Confirma que el movimiento está listo para finalizarse.");
      return;
    }
    const succeeded = approval.action === "CREATION"
      ? onApproveCreation(approval.movement.id, approvalCode)
      : approval.action === "SEND"
        ? onApproveSend(approval.movement.id, approvalCode)
        : approval.action === "RECEIVE"
          ? onReceive(approval.movement.id, approvalCode)
        : approval.action === "CANCEL"
          ? onCancel(approval.movement.id, approvalCode)
          : onDelete(approval.movement.id, approvalCode);
    if (!succeeded) return;
    if (approval.action === "SEND") {
      void exportMovementPdf({
        ...approval.movement,
        status: "SENT",
        sentAtIso: new Date().toISOString(),
      });
    }
    setApproval(null);
    setApprovalCode("");
    setFinalConfirmation(false);
  };

  const openApproval = (action: WarehouseApprovalAction, movement: WarehouseMovement) => {
    setApproval({ action, movement });
    setApprovalCode("");
    setFinalConfirmation(false);
  };

  const exportMovementPdf = async (movement: WarehouseMovement) => {
    const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFontSize(17);
    doc.text("KEYSAR · MOVIMIENTO DE ALMACÉN", 40, 45);
    doc.setFontSize(9);
    doc.text(`${movement.folio} · ${movement.requestType ? requestTypeLabels[movement.requestType] : kindLabels[movement.kind]} · ${statusLabels[movement.status]}`, 40, 64);
    doc.text(`Destino: ${movement.destinationBranch ?? "Bodega matriz"} · Creado por: ${movement.createdByName}`, 40, 80);
    doc.text(`${canViewCosts ? `Lista: ${movement.priceListName ?? "Costo base de bodega"} · ` : ""}Cliente: ${movement.customerName ?? "General"} · Proveedor: ${movement.supplierName ?? movement.lines.find((line) => line.supplierName)?.supplierName ?? "—"}`, 40, 94);
    autoTable(doc, {
      startY: 108,
      head: [["SKU", "Producto", "Cantidad", ...(canViewCosts ? ["Costo base", "Precio lista MXN", "Precio lista USD", "Total lista"] : [])]],
      body: movement.lines.map((line) => [line.sku, line.productName, line.quantity, ...(canViewCosts ? [formatCurrency(line.unitCostMxn), formatCurrency(line.partnerCost), `$${(line.partnerCostUsd ?? line.unitCostUsd).toFixed(2)}`, formatCurrency(line.quantity * (movement.kind === "BRANCH_REQUEST" ? line.partnerCost : line.unitCostMxn))] : [])]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [109, 82, 61] },
    });
    doc.save(`${movement.folio}.pdf`);
  };

  const exportReportExcel = async (
    reportRows: WarehouseMovement[] = filteredMovements,
    fileLabel = "almacen-reporte",
  ) => {
    const XLSX = await import("xlsx");
    const rows = reportRows.map((movement) => ({
      Folio: movement.folio,
      Fecha: formatDateTime(movement.createdAtIso),
      Movimiento: movement.requestType ? requestTypeLabels[movement.requestType] : kindLabels[movement.kind],
      Concepto: movement.categoryLabel,
      Sucursal: movement.destinationBranch ?? "Bodega matriz",
      Estatus: statusLabels[movement.status],
      Productos: movement.lines.length,
      Unidades: movementUnits(movement),
      ...(canViewCosts ? { "Lista de precios": movement.priceListName ?? "Costo base de bodega" } : {}),
      Cliente: movement.customerName ?? "General",
      Proveedor: movement.supplierName ?? ([...new Set(movement.lines.map((line) => line.supplierName).filter(Boolean))].join(" · ") || "—"),
      ...(canViewCosts ? { "Total listado MXN": movementValue(movement), "Total listado USD": movementValueUsd(movement) } : {}),
      "Creado por": movement.createdByName,
    }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), "Movimientos");
    XLSX.writeFile(book, `${fileLabel}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportReportPdf = async (
    reportRows: WarehouseMovement[] = filteredMovements,
    reportTitle = "REPORTE GENERAL DE ALMACÉN",
    fileLabel = "almacen-reporte",
  ) => {
    const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
    doc.setFontSize(18);
    doc.text(`KEYSAR · ${reportTitle}`, 38, 42);
    doc.setFontSize(9);
    doc.text(`${reportRows.length} movimientos · ${totalUnits} piezas en bodega${canViewCosts ? ` · Valor ${formatCurrency(totalMxn)}` : ""}`, 38, 59);
    autoTable(doc, {
      startY: 75,
      head: [["Folio", "Fecha", "Concepto", "Sucursal", "Cliente", "Estatus", "Unidades", ...(canViewCosts ? ["Total MXN", "Total USD"] : [])]],
      body: reportRows.map((movement) => [movement.folio, formatDateTime(movement.createdAtIso), movement.categoryLabel, movement.destinationBranch ?? "Bodega", movement.customerName ?? "General", statusLabels[movement.status], movementUnits(movement), ...(canViewCosts ? [formatCurrency(movementValue(movement)), `$${movementValueUsd(movement).toFixed(2)}`] : [])]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [109, 82, 61] },
    });
    doc.save(`${fileLabel}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const downloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const sheet = XLSX.utils.json_to_sheet([{ SKU: physicalProducts[0]?.sku ?? "KSR-SER-001", Cantidad: 10, "Costo socio MXN": physicalProducts[0]?.partnerCost ?? physicalProducts[0]?.costMxn ?? 0 }]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Carga almacén");
    XLSX.writeFile(book, "plantilla-carga-almacen.xlsx");
  };

  const importTemplate = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) throw new Error("Plantilla sin hojas");
      const firstSheet = workbook.Sheets[firstSheetName];
      if (!firstSheet) throw new Error("Plantilla sin datos");
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });
      const importedRows = rows.flatMap((row) => {
        const product = physicalProducts.find((candidate) => candidate.sku.toLocaleLowerCase("es-MX") === String(row.SKU ?? "").trim().toLocaleLowerCase("es-MX"));
        const quantity = Number(row.Cantidad);
        if (!product || !Number.isFinite(quantity) || quantity <= 0) return [];
        return [{ productId: product.id, quantity, partnerCost: Math.max(product.costMxn, Number(row["Costo socio MXN"]) || product.partnerCost || product.costMxn) }];
      });
      const imported = [...importedRows.reduce((summary, line) => {
        const existing = summary.get(line.productId);
        summary.set(line.productId, existing
          ? { ...line, quantity: existing.quantity + line.quantity }
          : line);
        return summary;
      }, new Map<string, DraftLine>()).values()];
      setDraftLines(imported);
      toast.success(`${imported.length} productos cargados desde la plantilla.`);
    } catch {
      toast.error("No fue posible leer la plantilla de almacén.");
    }
  };

  const sortButton = (key: WarehouseSortKey, label: string) => (
    <button type="button" className="warehouse-sort-button" onClick={() => setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }))}>
      {label} {sort.key === key ? (sort.direction === "asc" ? "↑" : "↓") : "↕"}
    </button>
  );

  const actionButtons = (movement: WarehouseMovement) => (
    <div className="warehouse-row-actions">
      <Button type="button" size="sm" variant="outline" onClick={() => setDetailMovement(movement)}><Eye size={14} /></Button>
      <Button type="button" size="sm" variant="outline" onClick={() => void exportMovementPdf(movement)}><FileDown size={14} /></Button>
      {canManage && ["DRAFT", "REQUESTED"].includes(movement.status) && <Button type="button" size="sm" variant="outline" onClick={() => openEdit(movement)}><Pencil size={14} /></Button>}
      {canManage && ["DRAFT", "REQUESTED"].includes(movement.status) && <Button type="button" size="sm" onClick={() => openApproval("CREATION", movement)}><ShieldCheck size={14} /> Aprobar creación</Button>}
      {canManage && movement.status === "CREATION_APPROVED" && <Button type="button" size="sm" onClick={() => openApproval("SEND", movement)}><Send size={14} /> Aprobar envío</Button>}
      {canManage && movement.status === "SENT" && <Button type="button" size="sm" onClick={() => openApproval("RECEIVE", movement)}><PackageCheck size={14} /> {movement.kind === "PURCHASE_ORDER" ? "Recibir en bodega" : "Cargar mercancía"}</Button>}
      {canManage && !["CANCELLED", "DRAFT", "RECEIVED"].includes(movement.status) && <Button type="button" size="sm" variant="outline" onClick={() => openApproval("CANCEL", movement)}><RotateCcw size={14} /> {movement.status === "SENT" && movement.kind !== "PURCHASE_ORDER" ? "Regresar a pedidos" : "Cancelar"}</Button>}
      {canManage && ["DRAFT", "REQUESTED", "CANCELLED"].includes(movement.status) && <Button type="button" size="sm" variant="outline" onClick={() => openApproval("DELETE", movement)}><Trash2 size={14} /></Button>}
    </div>
  );

  const movementTable = (rows: WarehouseMovement[]) => (
    <div className="warehouse-table-wrap">
      <Table>
        <TableHeader><TableRow><TableHead>{sortButton("folio", "Folio / fecha")}</TableHead><TableHead>{sortButton("type", "Movimiento")}</TableHead><TableHead>{sortButton("branch", "Sucursal")}</TableHead><TableHead>Productos</TableHead><TableHead>{sortButton("units", "Unidades")}</TableHead>{canViewCosts && <TableHead>{sortButton("value", "Costo")}</TableHead>}<TableHead>{sortButton("status", "Estatus")}</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.map((movement) => <TableRow key={movement.id}>
            <TableCell><strong>{movement.folio}</strong><small>{formatDateTime(movement.createdAtIso)}</small></TableCell>
            <TableCell><strong>{movement.categoryLabel}</strong><small>{movement.requestType ? requestTypeLabels[movement.requestType] : kindLabels[movement.kind]}</small></TableCell>
            <TableCell><strong>{movement.destinationBranch ?? "Bodega matriz"}</strong><small>{movement.supplierName ?? movement.priceListName ?? "Costo base"}{movement.customerName ? ` · ${movement.customerName}` : ""}</small></TableCell>
            <TableCell>{movement.lines.length}</TableCell>
            <TableCell><strong>{movementUnits(movement)}</strong></TableCell>
            {canViewCosts && <TableCell><strong>{formatCurrency(movementValue(movement))}</strong><small>USD ${movementValueUsd(movement).toFixed(2)}</small></TableCell>}
            <TableCell><Badge variant="outline" className={`warehouse-status is-${movement.status.toLocaleLowerCase()}`}>{movement.kind === "PURCHASE_ORDER" && movement.status === "RECEIVED" ? "Recibido en bodega" : movement.status === "RECEIVED" ? "Entregado" : statusLabels[movement.status]}</Badge></TableCell>
            <TableCell>{actionButtons(movement)}</TableCell>
          </TableRow>)}
          {rows.length === 0 && <TableRow><TableCell colSpan={canViewCosts ? 8 : 7}>No hay movimientos para los filtros seleccionados.</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );

  const filterRequestRows = (rows: WarehouseMovement[]) => {
    const normalizedSearch = search.trim().toLocaleLowerCase("es-MX");
    return rows.filter((movement) => {
      if (statusFilter !== "ALL" && movement.status !== statusFilter) return false;
      if (branchFilter !== "ALL" && movement.destinationBranch !== branchFilter) return false;
      const movementDate = movement.createdAtIso.slice(0, 10);
      if (dateFrom && movementDate < dateFrom) return false;
      if (dateTo && movementDate > dateTo) return false;
      if (!normalizedSearch) return true;
      return [movement.folio, movement.destinationBranch ?? "", movement.createdByName, movement.priceListName ?? "", movement.customerName ?? "", ...movement.lines.flatMap((line) => [line.productName, line.sku])]
        .some((value) => value.toLocaleLowerCase("es-MX").includes(normalizedSearch));
    });
  };

  const renderRequestModule = (
    requestType: WarehouseRequestType,
    rows: WarehouseMovement[],
    title: string,
    description: string,
    Icon: typeof PackagePlus,
  ) => {
    const visibleRows = filterRequestRows(rows);
    const totalRequestedUnits = visibleRows.reduce((sum, movement) => sum + movementUnits(movement), 0);
    const receivedUnits = visibleRows.filter((movement) => movement.status === "RECEIVED").reduce((sum, movement) => sum + movementUnits(movement), 0);
    const pendingUnits = visibleRows.filter((movement) => ["DRAFT", "REQUESTED", "CREATION_APPROVED", "SENT"].includes(movement.status)).reduce((sum, movement) => sum + movementUnits(movement), 0);
    const fileLabel = requestType === "TESTER" ? "pedidos-testers" : requestType === "SUPPLY" ? "pedidos-insumos" : "pedidos-productos";
    return (
      <div className="view-stack warehouse-request-module">
        <Card className="warehouse-panel">
          <CardContent>
            <div className="warehouse-panel-heading">
              <div><span>SOLICITUDES DE SUCURSALES</span><h2>{title}</h2><p>{description}</p></div>
              <div>
                <Button type="button" variant="outline" onClick={() => void exportReportExcel(visibleRows, fileLabel)}><FileSpreadsheet size={16} /> Excel</Button>
                <Button type="button" variant="outline" onClick={() => void exportReportPdf(visibleRows, `REPORTE DE ${title.toLocaleUpperCase("es-MX")}`, fileLabel)}><FileDown size={16} /> PDF</Button>
                <Button type="button" variant="outline" onClick={() => window.print()}><Printer size={16} /> Imprimir</Button>
                {canRequest && <Button type="button" onClick={() => openForm("BRANCH_REQUEST", requestType)}><Plus size={16} /> Nuevo pedido</Button>}
              </div>
            </div>
            <section className="warehouse-request-dashboard">
              <div><Icon size={19} /><span>FOLIOS</span><strong>{visibleRows.length}</strong><small>Solicitudes filtradas</small></div>
              <div><Boxes size={19} /><span>UNIDADES</span><strong>{totalRequestedUnits}</strong><small>Volumen solicitado</small></div>
              <div><Truck size={19} /><span>PENDIENTES</span><strong>{pendingUnits}</strong><small>Por autorizar o recibir</small></div>
              <div><PackageCheck size={19} /><span>RECIBIDAS</span><strong>{receivedUnits}</strong><small>{requestType === "PRODUCT" ? "Sumaron inventario" : "Histórico no vendible"}</small></div>
              <div><TrendingUp size={19} /><span>VALOR LISTADO</span><strong>{formatCurrency(visibleRows.reduce((sum, movement) => sum + movementValue(movement), 0))}</strong><small>USD ${visibleRows.reduce((sum, movement) => sum + movementValueUsd(movement), 0).toFixed(2)}</small></div>
            </section>
            <div className="warehouse-request-filters">
              <div className="search-input-wrap"><Search size={16} /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Folio, artículo, SKU, sucursal o usuario" /></div>
              <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Todos los estatus</SelectItem>{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
              <Select value={branchFilter} onValueChange={setBranchFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Todas las sucursales</SelectItem>{branches.map((branch) => <SelectItem key={branch} value={branch}>{branch}</SelectItem>)}</SelectContent></Select>
              <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} aria-label="Fecha inicial" />
              <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} aria-label="Fecha final" />
            </div>
            {movementTable(visibleRows)}
          </CardContent>
        </Card>
      </div>
    );
  };

  const matrixTabs: Array<[WarehouseTab, string, typeof Warehouse]> = [
    ["STOCK", "Inventario en bodega", Warehouse],
    ["PURCHASE_ORDERS", "Pedidos a proveedores", PackagePlus],
    ["ENTRY", "Ingreso de mercancía", ArrowDownToLine],
    ["BRANCH_ORDERS", "Solicitudes de sucursales", ClipboardCheck],
    ["SHIPMENTS", "Envíos", Truck],
    ["PRICE_LISTS", "Listas de precios", BadgeDollarSign],
    ["REPORT", "Reporte general", BarChart3],
  ];
  const branchTabs: Array<[WarehouseTab, string, typeof Warehouse]> = [
    ["REQUEST_PRODUCTS", "Solicitar productos", ClipboardCheck],
    ["REQUEST_TESTERS", "Solicitar testers", FlaskConical],
    ["REQUEST_SUPPLIES", "Solicitar insumos", ShoppingBasket],
  ];
  const availableTabs = scope === "MATRIX" ? matrixTabs : branchTabs;
  const branchRequestUnits = requests.reduce(
    (sum, movement) => sum + movementUnits(movement),
    0,
  );
  const branchPendingUnits = requests
    .filter((movement) =>
      ["DRAFT", "REQUESTED", "CREATION_APPROVED", "SENT"].includes(
        movement.status,
      ),
    )
    .reduce((sum, movement) => sum + movementUnits(movement), 0);
  const branchReceivedUnits = requests
    .filter((movement) => movement.status === "RECEIVED")
    .reduce((sum, movement) => sum + movementUnits(movement), 0);

  return (
    <div className="warehouse-view view-stack">
      <section className="warehouse-hero">
        <div>
          <span className="section-kicker">
            {scope === "MATRIX" ? "CENTRO DE DISTRIBUCIÓN" : "OPERACIÓN DE TIENDAS"}
          </span>
          <h2>
            {scope === "MATRIX"
              ? "Almacén bodega matriz"
              : "Inventario y solicitudes de sucursales"}
          </h2>
          <p>
            {scope === "MATRIX"
              ? "Controla existencias, compras, entradas, solicitudes recibidas y envíos con trazabilidad por sucursal."
              : "Genera pedidos de productos, testers e insumos; cada folio llegará automáticamente a bodega matriz."}
          </p>
        </div>
        <div className="warehouse-hero-actions">
          {scope === "MATRIX" && (
            <button
              type="button"
              className={`warehouse-order-bell ${newBranchRequests.length > 0 ? "has-alerts" : ""}`}
              onClick={() => {
                setTab("BRANCH_ORDERS");
                setSelectedCategory("ALL");
              }}
              aria-label={`${newBranchRequests.length} pedidos nuevos de sucursales`}
              title="Nuevos pedidos de sucursales"
            >
              <Bell size={19} />
              {newBranchRequests.length > 0 && (
                <b>{newBranchRequests.length}</b>
              )}
            </button>
          )}
          <span className="status-dot" />
          <strong>REPORTE EN VIVO</strong>
          <small>Operador: {currentUserName}</small>
        </div>
      </section>

      {scope === "MATRIX" && !canManage && <div className="warehouse-readonly"><LockKeyhole size={18} /><span><strong>Consulta autorizada en modo lectura</strong><small>Solicita el permiso “Movimientos de almacén” para crear, aprobar, editar o cancelar.</small></span></div>}
      {scope === "BRANCHES" && !canRequest && <div className="warehouse-readonly"><LockKeyhole size={18} /><span><strong>Solicitudes deshabilitadas para este rol</strong><small>Un usuario master puede habilitar Pedido sucursales desde Employees.</small></span></div>}

      {scope === "MATRIX" && (
        <nav className="warehouse-tabs" aria-label="Secciones de almacén">
          {availableTabs.map(([id, label, Icon]) => <button type="button" key={id} className={tab === id ? "is-active" : ""} onClick={() => { setTab(id); setSelectedCategory("ALL"); }}><Icon size={18} /><span>{label}</span></button>)}
        </nav>
      )}

      {scope === "MATRIX" ? <section className="warehouse-metrics">
        <Card><CardContent className="warehouse-metric-content"><Boxes size={20} /><span>STOCK GENERAL</span><strong>{totalUnits}</strong><small>{stockRows.length} productos · {supplyRows.length} insumos</small></CardContent></Card>
        {canViewCosts ? <><Card><CardContent className="warehouse-metric-content"><TrendingDown size={20} /><span>COSTO ALMACÉN MXN</span><strong>{formatCurrency(totalMxn)}</strong><small>Base de costo</small></CardContent></Card><Card><CardContent className="warehouse-metric-content"><Building2 size={20} /><span>COSTO ALMACÉN USD</span><strong>${totalUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong><small>Costo unitario acumulado</small></CardContent></Card><Card><CardContent className="warehouse-metric-content"><TrendingUp size={20} /><span>VALOR PRECIO SOCIO</span><strong>{formatCurrency(partnerValue)}</strong><small>Utilidad potencial {formatCurrency(partnerValue - totalMxn)}</small></CardContent></Card></> : <Card><CardContent className="warehouse-metric-content"><LockKeyhole size={20} /><span>COSTOS PROTEGIDOS</span><strong>OCULTOS</strong><small>Requiere permiso por rol</small></CardContent></Card>}
      </section> : <section className="warehouse-metrics warehouse-branch-metrics">
        <Card><CardContent className="warehouse-metric-content"><ClipboardCheck size={20} /><span>FOLIOS GENERADOS</span><strong>{requests.length}</strong><small>{branches.length === 1 ? branches[0] : `${branches.length} sucursales`}</small></CardContent></Card>
        <Card><CardContent className="warehouse-metric-content"><Boxes size={20} /><span>UNIDADES SOLICITADAS</span><strong>{branchRequestUnits}</strong><small>Productos, testers e insumos</small></CardContent></Card>
        <Card><CardContent className="warehouse-metric-content"><Truck size={20} /><span>PENDIENTES</span><strong>{branchPendingUnits}</strong><small>Por aprobar, enviar o recibir</small></CardContent></Card>
        <Card><CardContent className="warehouse-metric-content"><PackageCheck size={20} /><span>RECIBIDAS</span><strong>{branchReceivedUnits}</strong><small>Historial conectado con matriz</small></CardContent></Card>
      </section>}

      {tab === "STOCK" && <WarehouseStockView products={products} supplies={supplies} suppliers={suppliers} stock={stock} movements={movements} canManage={canManage} canViewCosts={canViewCosts} onToggleVisibility={onToggleSupplyVisibility} onSaveSupply={onSaveSupply} onDeleteSupply={onDeleteSupply} onCreateRestockOrder={onCreateRestockOrder} />}

      {tab === "PURCHASE_ORDERS" && <Card className="warehouse-panel"><CardContent><div className="warehouse-panel-heading"><div><span>COMPRAS A PROVEEDORES</span><h2>Pedidos y resurtidos de bodega</h2><p>Propuestas generadas desde stock máximo con doble aprobación y recepción en matriz.</p></div><Badge variant="outline">{purchaseOrders.length} folios</Badge></div>{movementTable(purchaseOrders)}</CardContent></Card>}

      {tab === "ENTRY" && <Card className="warehouse-panel"><CardContent><div className="warehouse-panel-heading"><div><span>ABASTECIMIENTO MATRIZ</span><h2>Ingresos de mercancía</h2><p>Carga varios productos y actualiza su costo socio.</p></div><div>{canViewCosts && <><Button type="button" variant="outline" onClick={downloadTemplate}><Download size={16} /> Plantilla</Button><label className="warehouse-upload-button"><Upload size={16} /> Carga masiva<input type="file" accept=".xlsx,.xls" onChange={importTemplate} /></label></>}{canManage && <Button type="button" onClick={() => openForm("ENTRY")}><PackagePlus size={16} /> Ingreso de mercancía</Button>}</div></div>{movementTable(movements.filter((movement) => movement.kind === "ENTRY"))}</CardContent></Card>}

      {tab === "BRANCH_ORDERS" && <Card className="warehouse-panel"><CardContent><div className="warehouse-panel-heading"><div><span>CENTRO DE SOLICITUDES</span><h2>Pedidos de sucursales</h2><p>Concentra todas las solicitudes de tienda y permite crear pedidos para cualquier sucursal. Después de dos aprobaciones el folio pasa automáticamente a Envíos.</p></div><div className="warehouse-branch-order-create">{canRequest && <><Select value={branchOrderRequestType} onValueChange={(value) => setBranchOrderRequestType(value as WarehouseRequestType)}><SelectTrigger aria-label="Tipo de pedido"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PRODUCT">Productos</SelectItem><SelectItem value="TESTER">Testers</SelectItem><SelectItem value="SUPPLY">Insumos</SelectItem></SelectContent></Select><Button type="button" onClick={() => openForm("BRANCH_REQUEST", branchOrderRequestType)}><Plus size={16} /> Generar pedido</Button></>}<Badge variant="outline">{pendingBranchOrders.length} pendientes</Badge></div></div>{movementTable(pendingBranchOrders)}</CardContent></Card>}

      {tab === "SHIPMENTS" && <Card className="warehouse-panel"><CardContent><div className="warehouse-panel-heading"><div><span>DISTRIBUCIÓN</span><h2>Envíos desde bodega</h2><p>Los pedidos aparecen después de la doble aprobación y permanecen aquí como enviados o entregados. Si se regresa un envío pendiente, vuelve a Pedidos de sucursales sin perder el folio.</p></div>{canManage && <Button type="button" onClick={() => openForm("SHIPMENT")}><Plus size={16} /> Crear envío</Button>}</div><div className="warehouse-category-menu"><button type="button" className={selectedCategory === "ALL" ? "is-active" : ""} onClick={() => setSelectedCategory("ALL")}>Todos</button>{activeCategories.map((category) => <button type="button" key={category.id} className={selectedCategory === category.id ? "is-active" : ""} onClick={() => setSelectedCategory(category.id)}>{category.name}</button>)}</div>{movementTable(shipments.filter((movement) => selectedCategory === "ALL" || movement.categoryId === selectedCategory))}</CardContent></Card>}

      {tab === "REQUEST_PRODUCTS" && renderRequestModule("PRODUCT", productRequests, "Pedidos de productos", "Mercancía vendible: al recibirla sí aumenta la existencia de la sucursal.", ClipboardCheck)}
      {tab === "REQUEST_TESTERS" && renderRequestModule("TESTER", testerRequests, "Pedidos de testers", "Sólo aparecen productos autorizados desde Catálogo. Su recepción genera historial, pero no inventario vendible.", FlaskConical)}
      {tab === "REQUEST_SUPPLIES" && renderRequestModule("SUPPLY", supplyRequests, "Pedidos de insumos", "Utiliza únicamente insumos visibles de la lista precargada. Su recepción no aumenta el inventario de venta.", ShoppingBasket)}

      {tab === "PRICE_LISTS" && (canViewCosts ? <WarehousePriceLists lists={priceLists} products={products} supplies={supplies} branches={branches} clients={clients} canManage={canManage} onSave={onSavePriceList} onToggle={onTogglePriceList} onDelete={onDeletePriceList} /> : <div className="warehouse-readonly"><LockKeyhole size={18} /><span><strong>Listas de precios protegidas</strong><small>Este rol no tiene autorización para visualizar costos ni precios internos.</small></span></div>)}

      {tab === "REPORT" && <div className="view-stack"><Card className="warehouse-panel"><CardContent><div className="warehouse-panel-heading"><div><span>HISTORIAL COMPLETO</span><h2>Reporte general de almacén y tiendas</h2><p>Pedidos autorizados, salidas, pendientes, productos, testers, insumos y ventas completas.</p></div><div><Button type="button" variant="outline" onClick={() => void exportReportExcel()}><FileSpreadsheet size={16} /> Excel</Button><Button type="button" variant="outline" onClick={() => void exportReportPdf()}><FileDown size={16} /> PDF</Button><Button type="button" variant="outline" onClick={() => window.print()}><Printer size={16} /> Imprimir</Button></div></div><div className="warehouse-filters is-advanced"><div className="search-input-wrap"><Search size={16} /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Folio, producto, proveedor, sucursal o usuario" /></div><Select value={historyTypeFilter} onValueChange={setHistoryTypeFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Historial general</SelectItem><SelectItem value="AUTHORIZED">Pedidos autorizados / salidas</SelectItem><SelectItem value="PENDING">Pendientes</SelectItem><SelectItem value="PRODUCT">Productos / ventas completas</SelectItem><SelectItem value="TESTER">Testers</SelectItem><SelectItem value="SUPPLY">Insumos</SelectItem></SelectContent></Select><Select value={selectedCategory} onValueChange={setSelectedCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Todos los conceptos</SelectItem>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}{category.active ? "" : " · Inactivo"}</SelectItem>)}</SelectContent></Select><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Todos los estatus</SelectItem>{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><Select value={supplierFilter} onValueChange={setSupplierFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Todos los proveedores</SelectItem>{suppliers.map((supplier) => <SelectItem key={supplier.id} value={supplier.id}>{supplier.businessName}</SelectItem>)}</SelectContent></Select><Select value={branchFilter} onValueChange={setBranchFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Todas las sucursales</SelectItem>{branches.map((branch) => <SelectItem key={branch} value={branch}>{branch}</SelectItem>)}</SelectContent></Select><Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} aria-label="Fecha inicial" /><Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} aria-label="Fecha final" /></div>{movementTable(filteredMovements)}</CardContent></Card><section className="warehouse-analytics"><Card><CardContent className="warehouse-metric-content"><TrendingUp size={20} /><span>PRODUCTO MÁS VENDIDO</span><strong>{topProduct?.product.name ?? "Sin datos"}</strong><small>{topProduct?.sold ?? 0} unidades</small></CardContent></Card><Card><CardContent className="warehouse-metric-content"><TrendingDown size={20} /><span>MENOR ROTACIÓN</span><strong>{slowProduct?.product.name ?? "Sin datos"}</strong><small>{slowProduct?.sold ?? 0} unidades</small></CardContent></Card><Card className="warehouse-flow-chart"><CardContent><div><span>GRÁFICA ANALÍTICA DE COSTOS Y FLUJO</span><h2>Entradas contra salidas</h2></div>{stockRows.slice(0, 6).map((row) => <div key={row.product.id}><span>{row.product.name}</span><i><b style={{ width: `${Math.min(100, (row.entries / Math.max(1, row.entries + row.outputs)) * 100)}%` }} /></i><small>+{row.entries} / -{row.outputs}</small></div>)}</CardContent></Card></section></div>}

      <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent className="warehouse-form-dialog sm:max-w-[900px]"><DialogHeader><DialogTitle>{editingMovementId ? formKind === "PURCHASE_ORDER" ? "Editar pedido de resurtido" : "Editar movimiento" : formKind === "ENTRY" ? "Ingreso de mercancía" : formKind === "BRANCH_REQUEST" ? formRequestType === "TESTER" ? "Pedido de testers" : formRequestType === "SUPPLY" ? "Pedido de insumos" : "Pedido de productos" : "Nuevo envío de bodega"}</DialogTitle><DialogDescription>Agrega varios artículos en una sola partida. El folio y su historial permanecerán separados por tipo de pedido.</DialogDescription></DialogHeader><div className="warehouse-form-grid">{formKind !== "ENTRY" && formKind !== "PURCHASE_ORDER" && <><div className="field-stack"><Label>Sucursal destino</Label><Select value={destinationBranch} onValueChange={selectBranchForOrder}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{branches.map((branch) => <SelectItem key={branch} value={branch}>{branch}</SelectItem>)}</SelectContent></Select></div><div className="field-stack"><Label>Concepto de movimiento</Label><Select value={categoryId} onValueChange={setCategoryId} disabled={formKind === "BRANCH_REQUEST"}><SelectTrigger><SelectValue placeholder="Selecciona concepto" /></SelectTrigger><SelectContent>{activeCategories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent></Select></div></>}
        {formKind === "BRANCH_REQUEST" && <><div className="field-stack"><Label>Cliente del listado</Label><Select value={selectedCustomerId} onValueChange={selectCustomerForOrder}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NONE">Pedido general de sucursal</SelectItem>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.firstName} {client.lastName}</SelectItem>)}</SelectContent></Select></div><div className="field-stack"><Label>Lista de precios MXN / USD</Label><Select value={selectedPriceListId} onValueChange={setSelectedPriceListId}><SelectTrigger><SelectValue placeholder="Selecciona lista" /></SelectTrigger><SelectContent>{eligiblePriceLists.map((list) => <SelectItem key={list.id} value={list.id}>{list.name}</SelectItem>)}</SelectContent></Select>{eligiblePriceLists.length === 0 && <small className="warehouse-price-warning">No hay una lista activa para esta sucursal y cliente.</small>}</div></>}
        {formItems.length === 0 && <div className="warehouse-empty-authorization"><AlertTriangle size={18} /><span><strong>No hay artículos autorizados disponibles</strong><small>{formRequestType === "TESTER" ? "Activa el switch de tester en Catálogo." : "Activa la visibilidad del insumo en Inventario de bodega."}</small></span></div>}
        <div className="warehouse-line-builder"><div className="field-stack"><Label>{formRequestType === "SUPPLY" ? "Insumo" : "Producto"}</Label><Select value={lineProductId} onValueChange={(value) => { setLineProductId(value); const item = findWarehouseItem(value); setLinePartnerCost(item?.partnerCost ?? item?.costMxn ?? 0); }} disabled={formItems.length === 0}><SelectTrigger><SelectValue placeholder="Selecciona un artículo" /></SelectTrigger><SelectContent>{formItems.map((item) => <SelectItem key={item.id} value={item.id}>{item.name} · {item.sku}</SelectItem>)}</SelectContent></Select></div><div className="field-stack"><Label>Cantidad</Label><Input type="number" min="1" value={lineQuantity} onChange={(event) => setLineQuantity(Math.max(1, Number(event.target.value) || 1))} /></div>{formKind === "ENTRY" && canViewCosts && <div className="field-stack"><Label>Costo socio MXN</Label><Input type="number" min="0" step="0.01" value={linePartnerCost} onChange={(event) => setLinePartnerCost(Math.max(0, Number(event.target.value) || 0))} /></div>}<Button type="button" onClick={addDraftLine} disabled={formItems.length === 0}><Plus size={16} /> Agregar artículo</Button></div>
        <div className="warehouse-draft-lines">{draftLines.map((line) => { const item = findWarehouseItem(line.productId); const listPrice = selectedPriceList?.items.find((price) => price.productId === line.productId); return <div key={line.productId}><img src={item?.image} alt="" /><span><strong>{item?.name}</strong><small>{item?.sku}{canViewCosts ? ` · ${formKind === "BRANCH_REQUEST" && listPrice ? `${formatCurrency(listPrice.priceMxn)} / USD $${listPrice.priceUsd.toFixed(2)} · ${selectedPriceList?.name}` : `${formatCurrency(item?.costMxn ?? 0)} costo`}` : ""}</small></span><Input type="number" min="1" value={line.quantity} onChange={(event) => setDraftLines((current) => current.map((candidate) => candidate.productId === line.productId ? { ...candidate, quantity: Math.max(1, Number(event.target.value) || 1) } : candidate))} />{formKind === "ENTRY" && canViewCosts && <Input type="number" min={item?.costMxn ?? 0} value={line.partnerCost} onChange={(event) => setDraftLines((current) => current.map((candidate) => candidate.productId === line.productId ? { ...candidate, partnerCost: Math.max(item?.costMxn ?? 0, Number(event.target.value) || 0) } : candidate))} />}<Button type="button" variant="outline" onClick={() => setDraftLines((current) => current.filter((candidate) => candidate.productId !== line.productId))}><X size={14} /></Button></div>})}{draftLines.length === 0 && <p>Agrega artículos autorizados para preparar la solicitud.</p>}</div>
        {formKind === "ENTRY" && canViewCosts && <div className="warehouse-partner-adjustment"><span><strong>Ganancia interna / socio</strong><small>Calcula el costo socio desde el costo MXN de cada producto.</small></span><Select value={partnerAdjustmentMode} onValueChange={(value) => setPartnerAdjustmentMode(value as "PERCENT" | "AMOUNT")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PERCENT">Porcentaje</SelectItem><SelectItem value="AMOUNT">Importe MXN</SelectItem></SelectContent></Select><Input type="number" min="0" step="0.01" value={partnerAdjustmentValue} onChange={(event) => setPartnerAdjustmentValue(Math.max(0, Number(event.target.value) || 0))} /><Button type="button" variant="outline" onClick={applyPartnerAdjustment}>Aplicar a partida</Button></div>}
        <div className="field-stack warehouse-comment"><Label>Comentarios</Label><Textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Proveedor, guía, responsable o detalle del movimiento…" /></div>{formKind === "ENTRY" && !editingMovementId && <div className="field-stack"><Label>Código de autorización</Label><Input type="password" inputMode="numeric" value={authorizationCode} onChange={(event) => setAuthorizationCode(event.target.value)} placeholder="Código de usuario autorizado" /></div>}</div><DialogFooter><Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button><Button type="button" onClick={submitForm} disabled={draftLines.length === 0 || (formKind === "BRANCH_REQUEST" && !selectedPriceListId) || (formKind === "ENTRY" && !editingMovementId && !authorizationCode.trim())}>{editingMovementId ? "Guardar edición" : formKind === "ENTRY" ? "Registrar ingreso" : "Crear para aprobación"}</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={Boolean(approval)} onOpenChange={(open) => !open && setApproval(null)}><DialogContent className="warehouse-approval-dialog sm:max-w-[520px]"><DialogHeader><DialogTitle>{approval?.action === "CREATION" ? "Primera validación · aprobar creación" : approval?.action === "SEND" ? "Segunda validación · aprobar envío" : approval?.action === "RECEIVE" ? "Autorizar carga de mercancía" : approval?.action === "CANCEL" ? approval.movement.status === "SENT" && approval.movement.kind !== "PURCHASE_ORDER" ? "Regresar envío a pedidos" : "Cancelar y revertir movimiento" : "Borrar movimiento"}</DialogTitle><DialogDescription>{approval?.action === "SEND" ? "La segunda validación moverá el pedido al módulo de Envíos y descontará bodega cuando corresponda." : approval?.action === "RECEIVE" ? "La autorización marcará el folio como entregado y cargará la mercancía en la sucursal destino o en bodega matriz." : approval?.action === "CANCEL" ? approval.movement.status === "SENT" && approval.movement.kind !== "PURCHASE_ORDER" ? "El folio regresará a Pedidos de sucursales, quedará editable y el producto reservado volverá a bodega." : "La mercancía será retirada de la sucursal cuando corresponda y regresará al almacén matriz." : "Ingresa un código con el rol de movimientos de almacén."}</DialogDescription></DialogHeader>{approval && <div className="warehouse-approval-summary"><strong>{approval.movement.folio}</strong><span>{approval.movement.lines.length} productos · {movementUnits(approval.movement)} unidades · {approval.movement.destinationBranch ?? approval.movement.supplierName ?? "Bodega"}</span></div>}{approval?.action === "SEND" && <button type="button" className={`warehouse-final-confirmation ${finalConfirmation ? "is-checked" : ""}`} onClick={() => setFinalConfirmation((current) => !current)}><AlertTriangle size={18} /><span><strong>Finalizar movimiento</strong><small>Confirmo que productos, cantidades y destino fueron revisados.</small></span><CheckCircle2 size={19} /></button>}<div className="field-stack"><Label>Código de autorización</Label><Input type="password" inputMode="numeric" value={approvalCode} onChange={(event) => setApprovalCode(event.target.value)} placeholder="••••" /></div><DialogFooter><Button type="button" variant="outline" onClick={() => setApproval(null)}>{approval?.action === "RECEIVE" ? "Conservar en envíos" : "Cancelar"}</Button><Button type="button" onClick={runApproval} disabled={!approvalCode.trim() || (approval?.action === "SEND" && !finalConfirmation)}><ShieldCheck size={16} /> Confirmar acción</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={Boolean(detailMovement)} onOpenChange={(open) => !open && setDetailMovement(null)}><DialogContent className="sm:max-w-[720px]"><DialogHeader><DialogTitle>{detailMovement?.folio}</DialogTitle><DialogDescription>{detailMovement ? `${detailMovement.requestType ? requestTypeLabels[detailMovement.requestType] : kindLabels[detailMovement.kind]} · ${statusLabels[detailMovement.status]} · ${detailMovement.destinationBranch ?? "Bodega matriz"}` : ""}</DialogDescription></DialogHeader>{detailMovement && <>{canViewCosts && <div className="warehouse-detail-pricing"><BadgeDollarSign size={18} /><span><strong>{detailMovement.priceListName ?? "Costo base de bodega"}</strong><small>{detailMovement.customerName ? `Cliente: ${detailMovement.customerName}` : "Pedido general de sucursal"}</small></span><b>{formatCurrency(movementValue(detailMovement))}<small>USD ${movementValueUsd(detailMovement).toFixed(2)}</small></b></div>}{detailMovement.returnedToOrdersAtIso && <div className="warehouse-return-notice"><RotateCcw size={17} /><span><strong>Envío regresado a pedidos</strong><small>{formatDateTime(detailMovement.returnedToOrdersAtIso)} · {detailMovement.returnedToOrdersByName}</small></span></div>}<div className="warehouse-detail-timeline"><span className="is-done">Creado<br /><small>{formatDateTime(detailMovement.createdAtIso)}</small></span><span className={detailMovement.creationApprovedAtIso ? "is-done" : ""}>Aprobación 1<br /><small>{detailMovement.creationApprovedByName ?? "Pendiente"}</small></span><span className={detailMovement.sentAtIso ? "is-done" : ""}>Aprobación 2<br /><small>{detailMovement.sentByName ?? "Pendiente"}</small></span><span className={detailMovement.receivedAtIso ? "is-done" : ""}>Entrega<br /><small>{detailMovement.receivedByName ?? "Pendiente"}</small></span></div><div className="warehouse-detail-lines">{detailMovement.lines.map((line) => <div key={line.productId}><span><strong>{line.productName}</strong><small>{line.sku}{canViewCosts ? ` · USD ${(line.partnerCostUsd ?? line.unitCostUsd).toFixed(2)}` : ""}</small></span><b>{line.quantity} pz</b>{canViewCosts && <span>{formatCurrency(line.quantity * (detailMovement.kind === "BRANCH_REQUEST" ? line.partnerCost : line.unitCostMxn))}</span>}</div>)}</div>{detailMovement.comment && <p className="warehouse-detail-comment">{detailMovement.comment}</p>}</>}<DialogFooter><Button type="button" variant="outline" onClick={() => detailMovement && void exportMovementPdf(detailMovement)}><FileDown size={16} /> Descargar PDF</Button><Button type="button" onClick={() => setDetailMovement(null)}>Cerrar</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
