"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@cosmetics/ui";
import {
  CalendarDays,
  CalendarCheck2,
  Check,
  ChevronDown,
  ChevronsUpDown,
  Clock3,
  Download,
  HeartHandshake,
  MessageSquareText,
  Percent,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Smile,
  Sparkles,
  Star,
  ThumbsUp,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  schedulerProfessionals,
  schedulerServices,
} from "@/lib/mock-scheduler-data";
import {
  buildSurveyReport,
  demoSurveyDeliveries,
  filterSurveyDeliveries,
  getSurveyDateRange,
  reportSurveys,
  surveyReportCsv,
  surveyReportReferenceDate,
  type RatingSummary,
  type SurveyPeriod,
  type SurveyReportFilters,
} from "@/lib/survey-report";
import styles from "./SurveyReportWorkspace.module.css";

const professionalOptions = schedulerProfessionals.map((item) => ({
  value: item.id,
  label: item.name,
}));
const serviceOptions = schedulerServices.map((item) => ({
  value: item.id,
  label: item.name,
}));
const defaultFilters: SurveyReportFilters = {
  surveyId: reportSurveys[0]!.id,
  period: "30",
  professionalIds: professionalOptions.map((item) => item.value),
  serviceIds: serviceOptions.map((item) => item.value),
  from: "",
  to: "",
};
const categoryIcons: Record<string, LucideIcon> = {
  Calidad: Sparkles,
  Puntualidad: Clock3,
  "Limpieza y orden": ShieldCheck,
  Recomendabilidad: ThumbsUp,
  "Atención del personal": HeartHandshake,
  Agendamiento: CalendarCheck2,
};
const periodOptions = [
  { value: "7", label: "Últimos 7 días" },
  { value: "30", label: "Últimos 30 días" },
  { value: "90", label: "Últimos 90 días" },
  { value: "all", label: "Todo el historial" },
  { value: "custom", label: "Periodo personalizado" },
];
const formatDate = (date: string) =>
  new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));

function SelectField({
  label,
  icon: Icon,
  value,
  onChange,
  children,
}: {
  label: string;
  icon: LucideIcon;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className={styles.filterField}>
      <span>{label}</span>
      <span className={styles.selectWrap}>
        <Icon aria-hidden="true" size={17} />
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {children}
        </select>
        <ChevronDown aria-hidden="true" size={15} />
      </span>
    </label>
  );
}

function MultiSelectField({
  label,
  icon: Icon,
  options,
  selected,
  onChange,
}: {
  label: string;
  icon: LucideIcon;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const id = useId();
  const allSelected = selected.length === options.length;
  const summary = allSelected
    ? "Todos seleccionados"
    : selected.length
      ? `${selected.length} ${selected.length === 1 ? "seleccionado" : "seleccionados"}`
      : "Ninguno seleccionado";
  const visible = options.filter((option) =>
    option.label
      .toLocaleLowerCase("es-MX")
      .includes(query.toLocaleLowerCase("es-MX")),
  );
  return (
    <div className={styles.filterField}>
      <span id={id}>{label}</span>
      <Popover
        onOpenChange={(open) => {
          if (!open) setQuery("");
        }}
      >
        <PopoverTrigger asChild>
          <button
            className={styles.multiTrigger}
            type="button"
            aria-label={`${label}: ${summary}`}
          >
            <Icon aria-hidden="true" size={17} />
            <span>{summary}</span>
            <ChevronDown aria-hidden="true" size={15} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[min(320px,calc(100vw-32px))] rounded-2xl border-[#e7ddd4] bg-white p-3 shadow-xl"
        >
          <div role="group" aria-labelledby={id} className={styles.multiMenu}>
            <label className={styles.optionSearch}>
              <Search aria-hidden="true" size={15} />
              <input
                aria-label={`Buscar ${label.toLowerCase()}`}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar..."
              />
            </label>
            <button
              type="button"
              className={styles.selectAll}
              onClick={() =>
                onChange(
                  allSelected ? [] : options.map((option) => option.value),
                )
              }
            >
              <Check aria-hidden="true" size={15} />
              {allSelected ? "Deseleccionar todos" : "Seleccionar todos"}
            </button>
            <div className={styles.optionList}>
              {visible.map((option) => (
                <label key={option.value} className={styles.checkOption}>
                  <input
                    type="checkbox"
                    checked={selected.includes(option.value)}
                    onChange={(event) =>
                      onChange(
                        event.target.checked
                          ? [...selected, option.value]
                          : selected.filter((value) => value !== option.value),
                      )
                    }
                  />
                  <span>{option.label}</span>
                </label>
              ))}
              {!visible.length ? (
                <p className={styles.noOptions}>No hay coincidencias.</p>
              ) : null}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function RatingDistribution({
  summary,
  label,
}: {
  summary: RatingSummary;
  label: string;
}) {
  return (
    <div className={styles.distribution}>
      <div className={styles.distributionHeading}>
        <span>Distribución de valoraciones</span>
        <span>
          {summary.count} {summary.count === 1 ? "valoración" : "valoraciones"}
        </span>
      </div>
      <ol aria-label={`Distribución de ${label}`} className={styles.ratingBars}>
        {summary.distribution.map(({ rating, count, percentage }) => (
          <li
            key={rating}
            aria-label={`${rating} ${rating === 1 ? "estrella" : "estrellas"}: ${count} ${count === 1 ? "valoración" : "valoraciones"}, ${Math.round(percentage)}%`}
          >
            <span className={styles.ratingLabel}>
              {rating}
              <Star aria-hidden="true" size={14} fill="currentColor" />
            </span>
            <span className={styles.barTrack}>
              <span
                className={styles.barFill}
                style={{ width: `${percentage}%` }}
              />
            </span>
            <span className={styles.ratingCount}>{count}</span>
            <span className={styles.ratingPercent}>
              {Math.round(percentage)}%
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function SurveyReportWorkspace() {
  const [filters, setFilters] = useState(defaultFilters);
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [openQuestions, setOpenQuestions] = useState<string[]>([]);
  const survey =
    reportSurveys.find((item) => item.id === filters.surveyId) ??
    reportSurveys[0]!;
  const report = useMemo(
    () =>
      buildSurveyReport(
        survey,
        filterSurveyDeliveries(demoSurveyDeliveries, filters),
      ),
    [survey, filters],
  );
  const dateRange = getSurveyDateRange(
    filters.period,
    filters.from,
    filters.to,
  );
  const allExpanded =
    report.categories.length > 0 &&
    report.categories.every(
      (category) =>
        openCategories.includes(category.id) &&
        category.questions.every((question) =>
          openQuestions.includes(question.id),
        ),
    );
  const changedFilters =
    filters.surveyId !== defaultFilters.surveyId ||
    filters.period !== "30" ||
    filters.professionalIds.length !== professionalOptions.length ||
    filters.serviceIds.length !== serviceOptions.length;
  const metricCards = [
    {
      label: "Encuestas enviadas",
      value: report.sent,
      icon: Send,
      tone: styles.blue,
      description: `${report.sent - report.responded} ${report.sent - report.responded === 1 ? "pendiente de respuesta" : "pendientes de respuesta"}`,
    },
    {
      label: "Encuestas respondidas",
      value: report.responded,
      icon: Smile,
      tone: styles.green,
      description: report.responded
        ? "Experiencias compartidas"
        : "Aún no hay respuestas",
    },
    {
      label: "Porcentaje de respuesta",
      value: `${Number(report.responseRate.toFixed(1))}%`,
      icon: Percent,
      tone: styles.rose,
      description: "Del total de encuestas enviadas",
    },
  ];

  function updateFilter<K extends keyof SurveyReportFilters>(
    key: K,
    value: SurveyReportFilters[K],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
    if (key === "surveyId") {
      setOpenCategories([]);
      setOpenQuestions([]);
    }
  }
  function toggleCategory(id: string) {
    setOpenCategories((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }
  function toggleQuestion(id: string) {
    setOpenQuestions((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }
  function toggleAll() {
    setOpenCategories(
      allExpanded ? [] : report.categories.map((category) => category.id),
    );
    setOpenQuestions(
      allExpanded
        ? []
        : report.categories.flatMap((category) =>
            category.questions.map((question) => question.id),
          ),
    );
  }
  function exportReport() {
    const url = URL.createObjectURL(
      new Blob([surveyReportCsv(survey, report, filters)], {
        type: "text/csv;charset=utf-8;",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `reporte-encuestas-${survey.id}-${surveyReportReferenceDate}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className={styles.workspace}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div>
            <p className="label-caps">Clientes</p>
            <h1 className={`page-title ${styles.title}`}>
              Reporte de encuestas
            </h1>
            <p className={styles.subtitle}>
              Cada opinión cuenta. Conoce la experiencia de tus clientes.
            </p>
          </div>
          <button
            type="button"
            className={styles.exportButton}
            onClick={exportReport}
            disabled={!dateRange.valid}
          >
            <Download aria-hidden="true" size={17} />
            Exportar reporte
          </button>
        </div>
      </header>
      <div className={styles.content}>
        <section aria-label="Filtros del reporte" className={styles.filters}>
          <div className={styles.filterHeading}>
            <span>
              <SlidersHorizontal aria-hidden="true" size={15} />
              Personaliza tu reporte
            </span>
            {changedFilters ? (
              <button
                type="button"
                onClick={() => {
                  setFilters(defaultFilters);
                  setOpenCategories([]);
                  setOpenQuestions([]);
                }}
              >
                <X aria-hidden="true" size={13} />
                Restablecer
              </button>
            ) : null}
          </div>
          <div className={styles.filterGrid}>
            <SelectField
              label="Encuesta"
              icon={MessageSquareText}
              value={filters.surveyId}
              onChange={(value) => updateFilter("surveyId", value)}
            >
              {reportSurveys.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Periodo"
              icon={CalendarDays}
              value={filters.period}
              onChange={(value) =>
                updateFilter("period", value as SurveyPeriod)
              }
            >
              {periodOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </SelectField>
            <MultiSelectField
              label="Especialista"
              icon={UsersRound}
              options={professionalOptions}
              selected={filters.professionalIds}
              onChange={(values) => updateFilter("professionalIds", values)}
            />
            <MultiSelectField
              label="Servicios"
              icon={Sparkles}
              options={serviceOptions}
              selected={filters.serviceIds}
              onChange={(values) => updateFilter("serviceIds", values)}
            />
          </div>
          {filters.period === "custom" ? (
            <div className={styles.customDates}>
              <label>
                Desde
                <input
                  type="date"
                  value={filters.from}
                  max={filters.to || undefined}
                  onChange={(event) => updateFilter("from", event.target.value)}
                />
              </label>
              <label>
                Hasta
                <input
                  type="date"
                  value={filters.to}
                  min={filters.from || undefined}
                  onChange={(event) => updateFilter("to", event.target.value)}
                />
              </label>
              {!dateRange.valid ? (
                <p role="status">
                  Selecciona un rango de fechas válido para consultar el
                  reporte.
                </p>
              ) : null}
            </div>
          ) : null}
        </section>

        <div className={styles.reportContext}>
          <span className={styles.demoBadge}>
            <span />
            Datos de demostración
          </span>
          <span>
            {dateRange.valid
              ? `${dateRange.from ? formatDate(dateRange.from) : "Todo el historial"} — ${formatDate(dateRange.to)}`
              : "Periodo por definir"}
          </span>
        </div>
        <section
          aria-label="Resumen de encuestas"
          aria-live="polite"
          className={styles.metrics}
        >
          <article className={`${styles.metric} ${styles.featuredMetric}`}>
            <div className={styles.metricHeading}>
              <h2>Valoración promedio</h2>
              <span className={styles.metricIcon}>
                <Star aria-hidden="true" size={19} />
              </span>
            </div>
            <p className={styles.metricValue}>
              {report.average.toFixed(1)}
              <span>/ 5.0</span>
            </p>
            <div className={styles.averageFooter}>
              <div aria-hidden="true" className={styles.stars}>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <Star
                    key={rating}
                    size={14}
                    fill={
                      rating <= Math.round(report.average)
                        ? "currentColor"
                        : "none"
                    }
                  />
                ))}
              </div>
              <span>
                {report.count
                  ? `${report.count} ${report.count === 1 ? "valoración" : "valoraciones"}`
                  : "Sin valoraciones todavía"}
              </span>
            </div>
          </article>
          {metricCards.map(
            ({ label, value, icon: Icon, tone, description }) => (
              <article key={label} className={styles.metric}>
                <div className={styles.metricHeading}>
                  <h2>{label}</h2>
                  <span className={`${styles.metricIcon} ${tone}`}>
                    <Icon aria-hidden="true" size={19} />
                  </span>
                </div>
                <p className={styles.metricValue}>{value}</p>
                <p className={styles.metricDescription}>{description}</p>
              </article>
            ),
          )}
        </section>

        <section
          className={styles.results}
          aria-labelledby="survey-results-title"
        >
          <div className={styles.resultsHeading}>
            <div>
              <p className={styles.eyebrow}>La experiencia, en detalle</p>
              <h2 id="survey-results-title">
                Resultados por categoría <span>{report.categories.length}</span>
              </h2>
            </div>
            <button
              type="button"
              className={styles.expandAll}
              onClick={toggleAll}
              disabled={!report.categories.length}
            >
              <ChevronsUpDown aria-hidden="true" size={15} />
              {allExpanded ? "Contraer todo" : "Expandir todo"}
            </button>
          </div>
          {!report.sent && dateRange.valid ? (
            <p className={styles.emptyNotice} role="status">
              <MessageSquareText aria-hidden="true" size={17} />
              No hay envíos que coincidan con los filtros seleccionados.
            </p>
          ) : null}
          <div className={styles.categories}>
            {report.categories.map((category) => {
              const expanded = openCategories.includes(category.id);
              const Icon = categoryIcons[category.name] ?? MessageSquareText;
              return (
                <article
                  key={`${survey.id}-${category.id}`}
                  className={`${styles.category} ${expanded ? styles.categoryOpen : ""}`}
                >
                  <h3>
                    <button
                      type="button"
                      id={`trigger-${category.id}`}
                      aria-expanded={expanded}
                      aria-controls={`panel-${category.id}`}
                      className={styles.categoryTrigger}
                      onClick={() => toggleCategory(category.id)}
                    >
                      <span className={styles.categoryIcon}>
                        <Icon aria-hidden="true" size={20} />
                      </span>
                      <span className={styles.categoryName}>
                        <span>{category.name}</span>
                        <small>
                          {category.questions.length}{" "}
                          {category.questions.length === 1
                            ? "pregunta"
                            : "preguntas"}
                        </small>
                      </span>
                      <span className={styles.categoryStatus}>
                        {category.count
                          ? `${category.count} valoraciones`
                          : "Sin respuestas"}
                      </span>
                      <span className={styles.scoreBadge}>
                        <Star
                          aria-hidden="true"
                          size={15}
                          fill="currentColor"
                        />
                        {category.average.toFixed(1)}
                      </span>
                      <ChevronDown
                        aria-hidden="true"
                        size={18}
                        className={styles.chevron}
                      />
                    </button>
                  </h3>
                  <div
                    id={`panel-${category.id}`}
                    hidden={!expanded}
                    role="region"
                    aria-labelledby={`trigger-${category.id}`}
                  >
                    <div className={styles.categoryDistribution}>
                      <RatingDistribution
                        summary={category}
                        label={category.name}
                      />
                    </div>
                    <section
                      className={styles.questionSection}
                      aria-label={`Detalle de preguntas de ${category.name}`}
                    >
                      <div className={styles.questionHeading}>
                        <MessageSquareText aria-hidden="true" size={15} />
                        <h4>Detalle de preguntas</h4>
                        <span>{category.questions.length}</span>
                      </div>
                      <div className={styles.questions}>
                        {category.questions.map((question) => {
                          const questionExpanded = openQuestions.includes(
                            question.id,
                          );
                          return (
                            <article
                              className={styles.question}
                              key={question.id}
                            >
                              <h5>
                                <button
                                  id={`trigger-${question.id}`}
                                  type="button"
                                  aria-expanded={questionExpanded}
                                  aria-controls={`panel-${question.id}`}
                                  className={styles.questionTrigger}
                                  onClick={() => toggleQuestion(question.id)}
                                >
                                  <span className={styles.questionScore}>
                                    <Star
                                      aria-hidden="true"
                                      size={13}
                                      fill="currentColor"
                                    />
                                    {question.average.toFixed(1)}
                                  </span>
                                  <span>{question.text}</span>
                                  <ChevronDown
                                    aria-hidden="true"
                                    size={16}
                                    className={styles.chevron}
                                  />
                                </button>
                              </h5>
                              <div
                                id={`panel-${question.id}`}
                                hidden={!questionExpanded}
                                role="region"
                                aria-labelledby={`trigger-${question.id}`}
                                className={styles.questionBody}
                              >
                                <p>{question.description}</p>
                                <RatingDistribution
                                  summary={question}
                                  label={question.text}
                                />
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  </div>
                </article>
              );
            })}
          </div>
          <p className={styles.footnote}>
            Escala de 1 a 5 estrellas. Las valoraciones se mostrarán cuando tus
            clientes respondan.
          </p>
        </section>
      </div>
    </div>
  );
}
