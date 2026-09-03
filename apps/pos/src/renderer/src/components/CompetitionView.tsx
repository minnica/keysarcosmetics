import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarRange,
  Crown,
  Medal,
  PackageCheck,
  Settings2,
  ShoppingBag,
  Sparkles,
  Store,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@cosmetics/ui";
import { formatCurrency } from "../mock-data";
import type {
  Product,
  SalesCompetition,
  Seller,
  Ticket,
} from "../types";

interface CompetitionViewProps {
  competitions: SalesCompetition[];
  tickets: Ticket[];
  sellers: Seller[];
  products: Product[];
  onOpenSettings: () => void;
}

interface SellerRanking {
  id: string;
  name: string;
  initials: string;
  score: number;
  sales: number;
  tickets: number;
}

const getBusinessDate = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));

const formatShortDate = (value: string) =>
  new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));

const typeLabels: Record<SalesCompetition["type"], string> = {
  AMOUNT: "Por monto",
  PRODUCT: "Por producto",
  PACKAGE: "Por paquete",
  PERIOD: "Por periodo",
};

const calculatePackageCount = (
  ticket: Ticket,
  productIds: string[],
) => {
  if (productIds.length === 0) return 0;
  const quantities = productIds.map((productId) =>
    ticket.products
      .filter((product) => product.productId === productId)
      .reduce((sum, product) => sum + product.quantity, 0),
  );
  return quantities.some((quantity) => quantity === 0)
    ? 0
    : Math.min(...quantities);
};

export function CompetitionView({
  competitions,
  tickets,
  sellers,
  products,
  onOpenSettings,
}: CompetitionViewProps) {
  const activeCompetitions = competitions.filter((competition) => competition.active);
  const [selectedId, setSelectedId] = useState(activeCompetitions[0]?.id ?? "");

  useEffect(() => {
    if (activeCompetitions.some((competition) => competition.id === selectedId))
      return;
    setSelectedId(activeCompetitions[0]?.id ?? "");
  }, [activeCompetitions, selectedId]);

  const selectedCompetition =
    activeCompetitions.find((competition) => competition.id === selectedId) ??
    activeCompetitions[0];

  const competitionTickets = useMemo(() => {
    if (!selectedCompetition) return [];
    return tickets.filter((ticket) => {
      const businessDate = getBusinessDate(ticket.createdAtIso);
      return (
        ticket.status === "COMPLETED" &&
        ticket.ticketType !== "LAYAWAY_PAYMENT" &&
        businessDate >= selectedCompetition.dateFrom &&
        businessDate <= selectedCompetition.dateTo &&
        (selectedCompetition.branch === "ALL" ||
          ticket.branchName === selectedCompetition.branch)
      );
    });
  }, [selectedCompetition, tickets]);

  const ranking = useMemo<SellerRanking[]>(() => {
    if (!selectedCompetition) return [];
    const sellerMap = new Map(
      sellers
        .filter((seller) => seller.active)
        .map((seller) => [
          seller.id,
          {
            id: seller.id,
            name: seller.name,
            initials: seller.initials,
            score: 0,
            sales: 0,
            ticketIds: new Set<string>(),
          },
        ]),
    );

    competitionTickets.forEach((ticket) => {
      ticket.sellerSales.forEach((sellerSale) => {
        const current = sellerMap.get(sellerSale.sellerId);
        if (!current) return;
        current.sales += sellerSale.amount;
        current.ticketIds.add(ticket.id);
        if (
          selectedCompetition.type === "AMOUNT" ||
          selectedCompetition.type === "PERIOD"
        ) {
          current.score += sellerSale.amount;
          return;
        }
        if (selectedCompetition.type === "PRODUCT") {
          current.score += ticket.products
            .filter(
              (product) => product.productId === selectedCompetition.productId,
            )
            .reduce((sum, product) => sum + product.quantity, 0);
          return;
        }
        current.score += calculatePackageCount(
          ticket,
          selectedCompetition.packageProductIds,
        );
      });
    });

    return Array.from(sellerMap.values())
      .map(({ ticketIds, ...seller }) => ({
        ...seller,
        tickets: ticketIds.size,
      }))
      .sort(
        (left, right) =>
          right.score - left.score ||
          right.sales - left.sales ||
          left.name.localeCompare(right.name, "es-MX"),
      );
  }, [competitionTickets, selectedCompetition, sellers]);

  if (!selectedCompetition) {
    return (
      <Card className="competition-empty-card">
        <CardContent>
          <Trophy size={38} />
          <span className="section-kicker">COMPETICIONES</span>
          <h2>No hay competencias activas</h2>
          <p>Crea o activa una competencia desde Settings para comenzar el conteo.</p>
          <Button type="button" onClick={onOpenSettings}>
            <Settings2 size={16} /> Abrir configuración
          </Button>
        </CardContent>
      </Card>
    );
  }

  const winner = ranking[0] ?? {
    id: "competition-no-seller",
    name: "Sin ventas registradas",
    initials: "—",
    score: 0,
    sales: 0,
    tickets: 0,
  };
  const isMoneyCompetition =
    selectedCompetition.type === "AMOUNT" ||
    selectedCompetition.type === "PERIOD";
  const scoreLabel = (value: number) => {
    if (isMoneyCompetition) return formatCurrency(value);
    return `${value} ${selectedCompetition.type === "PACKAGE" ? "paquetes" : "pzas"}`;
  };
  const target = selectedCompetition.targetAmount ?? 0;
  const winnerProgress = target > 0 ? Math.min(100, (winner.score / target) * 100) : 0;
  const totalSales = competitionTickets.reduce((sum, ticket) => sum + ticket.total, 0);
  const productName = products.find(
    (product) => product.id === selectedCompetition.productId,
  )?.name;
  const packageNames = selectedCompetition.packageProductIds
    .map((id) => products.find((product) => product.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  const subtitle =
    selectedCompetition.type === "PRODUCT"
      ? productName ?? "Producto sin asignar"
      : selectedCompetition.type === "PACKAGE"
        ? packageNames.join(" + ") || "Paquete sin productos"
        : selectedCompetition.branch === "ALL"
          ? "Todas las sucursales"
          : selectedCompetition.branch;
  const periodText =
    selectedCompetition.dateFrom === selectedCompetition.dateTo
      ? formatShortDate(selectedCompetition.dateFrom)
      : `${formatShortDate(selectedCompetition.dateFrom)} — ${formatShortDate(selectedCompetition.dateTo)}`;

  return (
    <div className="competition-view">
      <div className="competition-toolbar">
        <div>
          <span className="section-kicker">TABLERO DE RESULTADOS</span>
          <h2>Competencias comerciales</h2>
          <p>El conteo usa únicamente tickets vigentes dentro de las reglas configuradas.</p>
        </div>
        <div className="competition-toolbar-actions">
          <Select value={selectedCompetition.id} onValueChange={setSelectedId}>
            <SelectTrigger aria-label="Seleccionar competencia">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {activeCompetitions.map((competition) => (
                <SelectItem key={competition.id} value={competition.id}>
                  {competition.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" onClick={onOpenSettings}>
            <Settings2 size={16} /> Configurar
          </Button>
        </div>
      </div>

      <Card className="competition-winner-card">
        <CardContent>
          <div className="competition-winner-copy">
            <div className="competition-live-pill">
              <i /> CONTEO EN VIVO · {typeLabels[selectedCompetition.type]}
            </div>
            <span className="competition-winner-label">
              <Crown size={15} /> LÍDER ACTUAL
            </span>
            <h2>{winner.name}</h2>
            <strong>{scoreLabel(winner.score)}</strong>
            <p>{selectedCompetition.name} · {subtitle}</p>
            {target > 0 && isMoneyCompetition && (
              <div className="competition-target-progress">
                <div>
                  <span>Avance a la meta</span>
                  <strong>{Math.round(winnerProgress)}%</strong>
                </div>
                <i><b style={{ width: `${winnerProgress}%` }} /></i>
                <small>Meta individual {formatCurrency(target)}</small>
              </div>
            )}
          </div>
          <div className="competition-winner-visual" aria-hidden="true">
            <span className="competition-trophy-halo" />
            <Trophy size={90} strokeWidth={1.35} />
            <div className="competition-winner-avatar">{winner.initials}</div>
          </div>
          <div className="competition-winner-facts">
            <span><CalendarRange size={15} /> {periodText}</span>
            <span><Store size={15} /> {selectedCompetition.branch === "ALL" ? "Todas las sucursales" : selectedCompetition.branch}</span>
            <span><ShoppingBag size={15} /> {winner.tickets} tickets del líder</span>
          </div>
        </CardContent>
      </Card>

      <div className="competition-metrics">
        <Card><CardContent><Users size={19} /><span>Vendedores con venta</span><strong>{ranking.filter((seller) => seller.score > 0).length}</strong></CardContent></Card>
        <Card><CardContent><ShoppingBag size={19} /><span>Tickets participantes</span><strong>{competitionTickets.length}</strong></CardContent></Card>
        <Card><CardContent><Target size={19} /><span>Venta del periodo</span><strong>{formatCurrency(totalSales)}</strong></CardContent></Card>
        <Card><CardContent><Sparkles size={19} /><span>Tipo de competencia</span><strong>{typeLabels[selectedCompetition.type]}</strong></CardContent></Card>
      </div>

      <section className="competition-podium-section">
        <div className="competition-section-heading">
          <div>
            <span className="section-kicker">PODIO ACTUAL</span>
            <h2>Vendedores con mayor resultado</h2>
          </div>
          <Badge variant="outline">{periodText}</Badge>
        </div>
        <div className="competition-podium">
          {ranking.slice(0, 3).map((seller, index) => (
            <Card key={seller.id} className={`competition-podium-card is-rank-${index + 1}`}>
              <CardContent>
                <div className="competition-rank-badge">#{index + 1}</div>
                <div className="competition-seller-avatar">{seller.initials}</div>
                <Medal size={18} />
                <h3>{seller.name}</h3>
                <strong>{scoreLabel(seller.score)}</strong>
                <span>{seller.tickets} tickets · {formatCurrency(seller.sales)} en venta</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Card className="competition-ranking-card">
        <CardContent>
          <div className="competition-section-heading">
            <div>
              <span className="section-kicker">CLASIFICACIÓN COMPLETA</span>
              <h2>Conteo de la competencia</h2>
            </div>
            <Badge>{ranking.length} vendedores</Badge>
          </div>
          <div className="competition-ranking-list">
            {ranking.map((seller, index) => {
              const maxScore = Math.max(ranking[0]?.score ?? 0, 1);
              return (
                <article key={seller.id} className={index === 0 ? "is-leader" : ""}>
                  <span className="competition-ranking-position">{index + 1}</span>
                  <div className="competition-ranking-avatar">{seller.initials}</div>
                  <div className="competition-ranking-name">
                    <strong>{seller.name}</strong>
                    <small>{seller.tickets} tickets · {formatCurrency(seller.sales)} vendidos</small>
                  </div>
                  <div className="competition-ranking-progress"><i style={{ width: `${(seller.score / maxScore) * 100}%` }} /></div>
                  <strong className="competition-ranking-score">{scoreLabel(seller.score)}</strong>
                  <ArrowRight size={15} />
                </article>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
