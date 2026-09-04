import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Eye,
  Gem,
  Layers3,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UnlockKeyhole,
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
} from "@cosmetics/ui";
import { formatCurrency } from "../mock-data";
import type { Product } from "../types";

type CatalogThemeId = "IVORY" | "NOIR" | "MINERAL" | "ROSE";

interface CatalogTheme {
  id: CatalogThemeId;
  name: string;
  description: string;
  number: string;
}

type CatalogPage =
  | { type: "COVER" }
  | { type: "FAMILY"; family: string; products: Product[] }
  | { type: "PRODUCT"; family: string; product: Product }
  | { type: "CLOSING" };

interface DigitalCatalogViewProps {
  products: Product[];
  companyName: string;
  logoUrl: string;
  authorizeExit: (alias: string, code: string) => boolean;
}

const catalogThemes: CatalogTheme[] = [
  {
    id: "IVORY",
    number: "01",
    name: "Editorial Marfil",
    description: "Marfil, champagne y composición de alta joyería.",
  },
  {
    id: "NOIR",
    number: "02",
    name: "Noir Couture",
    description: "Carbón profundo, oro tenue y presencia de pasarela.",
  },
  {
    id: "MINERAL",
    number: "03",
    name: "Galería Mineral",
    description: "Piedra clara, salvia y estética de galería contemporánea.",
  },
  {
    id: "ROSE",
    number: "04",
    name: "Maison Rosé",
    description: "Rosa empolvado, vino y una narrativa más sensorial.",
  },
];

const fallbackDescription = (product: Product) =>
  product.kind === "SERVICE"
    ? `Una experiencia ${product.category.toLocaleLowerCase("es-MX")} diseñada para realzar la belleza natural con atención personalizada y un acabado impecable.`
    : `Una fórmula cuidadosamente seleccionada para elevar la rutina de cuidado personal con una experiencia sensorial refinada y resultados visibles.`;

const fallbackBenefits = (product: Product) =>
  product.kind === "SERVICE"
    ? ["Atención personalizada", "Protocolo profesional", "Resultado de apariencia natural"]
    : ["Experiencia sensorial premium", `Especialidad en ${product.category}`, "Ideal para una rutina de cuidado consciente"];

export function DigitalCatalogView({
  products,
  companyName,
  logoUrl,
  authorizeExit,
}: DigitalCatalogViewProps) {
  const [theme, setTheme] = useState<CatalogThemeId>("IVORY");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageTurnDirection, setPageTurnDirection] = useState<"NEXT" | "PREVIOUS">("NEXT");
  const [pageTurnKey, setPageTurnKey] = useState(0);
  const [presentationMode, setPresentationMode] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockAlias, setUnlockAlias] = useState("");
  const [unlockCode, setUnlockCode] = useState("");
  const [unlockError, setUnlockError] = useState("");

  const visibleProducts = useMemo(
    () =>
      products.filter(
        (product) => product.active && product.showInDigitalCatalog !== false,
      ),
    [products],
  );

  const pages = useMemo<CatalogPage[]>(() => {
    const families = Array.from(
      new Set(visibleProducts.map((product) => product.family)),
    );
    const catalogPages: CatalogPage[] = [{ type: "COVER" }];
    families.forEach((family) => {
      const familyProducts = visibleProducts.filter(
        (product) => product.family === family,
      );
      catalogPages.push({ type: "FAMILY", family, products: familyProducts });
      familyProducts.forEach((product) =>
        catalogPages.push({ type: "PRODUCT", family, product }),
      );
    });
    catalogPages.push({ type: "CLOSING" });
    return catalogPages;
  }, [visibleProducts]);

  const familyPageIndexes = useMemo(
    () =>
      pages.flatMap((page, index) =>
        page.type === "FAMILY" ? [{ family: page.family, index }] : [],
      ),
    [pages],
  );

  const turnToPage = (targetIndex: number) => {
    const safeTarget = Math.max(0, Math.min(pages.length - 1, targetIndex));
    if (safeTarget === pageIndex) return;
    setPageTurnDirection(safeTarget > pageIndex ? "NEXT" : "PREVIOUS");
    setPageTurnKey((current) => current + 1);
    setPageIndex(safeTarget);
  };

  useEffect(() => {
    setPageIndex((current) => Math.min(current, Math.max(0, pages.length - 1)));
  }, [pages.length]);

  useEffect(() => {
    document.body.classList.toggle(
      "catalog-presentation-active",
      presentationMode,
    );
    const backgroundElements = Array.from(
      document.querySelectorAll<HTMLElement>(".pos-sidebar, .page-header"),
    );
    const previousAccessibility = backgroundElements.map((element) => ({
      element,
      ariaHidden: element.getAttribute("aria-hidden"),
      inert: element.hasAttribute("inert"),
    }));
    if (presentationMode) {
      backgroundElements.forEach((element) => {
        element.setAttribute("aria-hidden", "true");
        element.setAttribute("inert", "");
      });
    }
    return () => {
      document.body.classList.remove("catalog-presentation-active");
      previousAccessibility.forEach(({ element, ariaHidden, inert }) => {
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
        if (!inert) element.removeAttribute("inert");
      });
    };
  }, [presentationMode]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        turnToPage(pageIndex - 1);
      }
      if (event.key === "ArrowRight") {
        turnToPage(pageIndex + 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pageIndex, pages.length]);

  const currentPage = pages[pageIndex];
  const selectedTheme = catalogThemes.find((option) => option.id === theme);

  const lockCatalog = () => {
    setPresentationMode(true);
    setPageIndex(0);
  };

  const unlockCatalog = () => {
    if (!authorizeExit(unlockAlias, unlockCode)) {
      setUnlockError("Usuario o código incorrecto. Usa un acceso activo.");
      return;
    }
    setPresentationMode(false);
    setUnlockOpen(false);
    setUnlockAlias("");
    setUnlockCode("");
    setUnlockError("");
  };

  return (
    <div
      className={`digital-catalog-view theme-${theme.toLocaleLowerCase("es-MX")} ${presentationMode ? "is-presentation-mode" : ""}`}
    >
      <section className="digital-catalog-intro">
        <div>
          <span className="digital-catalog-kicker">
            <BookOpen size={15} /> EXPERIENCIA PARA CLIENTE
          </span>
          <h2>Catálogo digital</h2>
          <p>
            Un libro visual por familias con precio de venta, descripción y
            beneficios. Su contenido es únicamente para consulta.
          </p>
        </div>
        <div className="digital-catalog-intro-actions">
          <Badge variant="outline" className="digital-catalog-view-only">
            <Eye size={14} /> SÓLO VISUALIZACIÓN
          </Badge>
          <Button type="button" onClick={lockCatalog}>
            <LockKeyhole size={15} /> Presentar y bloquear
          </Button>
        </div>
      </section>

      <section className="digital-catalog-theme-picker" aria-label="Estilo del catálogo">
        {catalogThemes.map((option) => (
          <button
            key={option.id}
            type="button"
            className={theme === option.id ? "is-active" : ""}
            onClick={() => setTheme(option.id)}
            aria-pressed={theme === option.id}
          >
            <span>{option.number}</span>
            <strong>{option.name}</strong>
            <small>{option.description}</small>
          </button>
        ))}
      </section>

      <section className="digital-catalog-family-index" aria-label="Índice por familia">
        <span><Layers3 size={15} /> ÍNDICE</span>
        <div>
          {familyPageIndexes.map((entry) => (
            <button
              key={entry.family}
              type="button"
              className={
                currentPage &&
                currentPage.type !== "COVER" &&
                currentPage.type !== "CLOSING" &&
                currentPage.family === entry.family
                  ? "is-active"
                  : ""
              }
              onClick={() => turnToPage(entry.index)}
            >
              {entry.family}
            </button>
          ))}
        </div>
        {presentationMode && (
          <button
            type="button"
            className="digital-catalog-index-lock"
            onClick={() => setUnlockOpen(true)}
            aria-label="Desbloquear catálogo"
            title="Desbloquear catálogo"
          >
            <LockKeyhole size={15} />
          </button>
        )}
      </section>

      <section className="digital-catalog-reader">
        <Button
          type="button"
          variant="outline"
          className="digital-catalog-arrow"
          onClick={() => turnToPage(pageIndex - 1)}
          disabled={pageIndex === 0}
          aria-label="Página anterior"
        >
          <ChevronLeft size={20} />
        </Button>

        <div className="digital-catalog-book">
          <div className="digital-catalog-page-edge" aria-hidden="true" />
          <article
            key={`${theme}-${pageIndex}-${pageTurnKey}`}
            className={`digital-catalog-page ${pageTurnDirection === "NEXT" ? "is-turning-next" : "is-turning-previous"}`}
            aria-live="polite"
          >
            {currentPage?.type === "COVER" && (
              <div className="digital-catalog-cover">
                <div className="digital-catalog-cover-mark">
                  {logoUrl ? (
                    <img src={logoUrl} alt={companyName} />
                  ) : (
                    <span>K</span>
                  )}
                </div>
                <span className="digital-catalog-edition">COLECCIÓN · 2026</span>
                <h3>{companyName}</h3>
                <p>Cosmética · rituales · bienestar</p>
                <div className="digital-catalog-cover-rule" />
                <small>{selectedTheme?.name}</small>
              </div>
            )}

            {currentPage?.type === "FAMILY" && (
              <div className="digital-catalog-family-page">
                <div className="digital-catalog-page-header">
                  <span>{companyName}</span>
                  <small>COLECCIÓN POR FAMILIA</small>
                </div>
                <div className="digital-catalog-family-copy">
                  <span>{String(pageIndex).padStart(2, "0")}</span>
                  <h3>{currentPage.family}</h3>
                  <p>
                    Una selección curada de {currentPage.products.length}{" "}
                    {currentPage.products.length === 1 ? "experiencia" : "experiencias"}
                    {" "}para descubrir con calma.
                  </p>
                </div>
                <div className="digital-catalog-family-mosaic">
                  {currentPage.products.slice(0, 3).map((product) => (
                    <figure key={product.id}>
                      <img src={product.image} alt={product.name} />
                      <figcaption>{product.name}</figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            )}

            {currentPage?.type === "PRODUCT" && (
              <div className="digital-catalog-product-page">
                <div className="digital-catalog-page-header">
                  <span>{companyName}</span>
                  <small>{currentPage.family}</small>
                </div>
                <div className="digital-catalog-product-layout">
                  <div className="digital-catalog-product-visual">
                    <span>{currentPage.product.kind === "SERVICE" ? "SERVICIO" : "PRODUCTO"}</span>
                    <img src={currentPage.product.image} alt={currentPage.product.name} />
                  </div>
                  <div className="digital-catalog-product-copy">
                    <span className="digital-catalog-category">
                      {currentPage.product.category}
                    </span>
                    <h3>{currentPage.product.name}</h3>
                    <p className="digital-catalog-description">
                      {currentPage.product.description?.trim() ||
                        fallbackDescription(currentPage.product)}
                    </p>
                    <div className="digital-catalog-benefits">
                      <span>BENEFICIOS</span>
                      <ul>
                        {(currentPage.product.benefits?.filter(Boolean).length
                          ? currentPage.product.benefits.filter(Boolean)
                          : fallbackBenefits(currentPage.product)
                        ).map((benefit) => (
                          <li key={benefit}>{benefit}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="digital-catalog-price">
                      <small>PRECIO DE VENTA</small>
                      <strong>{formatCurrency(currentPage.product.maxPrice)}</strong>
                      <span>MXN · IVA incluido cuando aplica</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentPage?.type === "CLOSING" && (
              <div className="digital-catalog-closing">
                <Gem size={34} />
                <span>KEYSAR EXPERIENCE</span>
                <h3>La belleza vive en los detalles.</h3>
                <p>
                  Solicita a tu asesora una recomendación personalizada para
                  crear tu siguiente ritual.
                </p>
                <Sparkles size={22} />
              </div>
            )}

            <footer className="digital-catalog-page-number">
              <span>{pageIndex + 1}</span>
              <small>DE {pages.length}</small>
            </footer>
          </article>
        </div>

        <Button
          type="button"
          variant="outline"
          className="digital-catalog-arrow"
          onClick={() => turnToPage(pageIndex + 1)}
          disabled={pageIndex >= pages.length - 1}
          aria-label="Página siguiente"
        >
          <ChevronRight size={20} />
        </Button>
      </section>

      <div className="digital-catalog-progress">
        <span>PÁGINA {pageIndex + 1} / {pages.length}</span>
        <div>
          <i style={{ width: `${((pageIndex + 1) / pages.length) * 100}%` }} />
        </div>
        <small>Usa las flechas del teclado o los controles laterales.</small>
      </div>

      <Dialog open={unlockOpen} onOpenChange={setUnlockOpen}>
        <DialogContent className="digital-catalog-unlock-dialog sm:max-w-[430px]">
          <DialogHeader>
            <DialogTitle>Desbloquear catálogo</DialogTitle>
            <DialogDescription>
              Ingresa el alias y código de cualquier usuario activo para volver
              al sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="digital-catalog-unlock-fields">
            <div className="field-stack">
              <Label htmlFor="catalog-unlock-alias">Alias de usuario</Label>
              <Input
                id="catalog-unlock-alias"
                value={unlockAlias}
                autoComplete="off"
                onChange={(event) => {
                  setUnlockAlias(event.target.value);
                  setUnlockError("");
                }}
                placeholder="Ej. ana o master"
              />
            </div>
            <div className="field-stack">
              <Label htmlFor="catalog-unlock-code">Código personal</Label>
              <Input
                id="catalog-unlock-code"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={unlockCode}
                onChange={(event) => {
                  setUnlockCode(event.target.value.replace(/\D/g, "").slice(0, 4));
                  setUnlockError("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") unlockCatalog();
                }}
              />
            </div>
            {unlockError && <p role="alert">{unlockError}</p>}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setUnlockOpen(false)}
            >
              Seguir mostrando catálogo
            </Button>
            <Button
              type="button"
              onClick={unlockCatalog}
              disabled={!unlockAlias.trim() || unlockCode.length !== 4}
            >
              <UnlockKeyhole size={15} /> Desbloquear
            </Button>
          </DialogFooter>
          <div className="digital-catalog-unlock-note">
            <ShieldCheck size={14} /> La salida queda protegida por usuario.
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
