"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@cosmetics/ui";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  Info,
  Mail,
  MessageCircle,
  Pause,
  Settings2,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { reservationHistory } from "@/lib/mock-reservation-report-data";
import {
  defaultReminderPeriod,
  demoReminderMessages,
  filterReminderReservations,
  summarizeReminders,
} from "@/lib/reminder-report";
import styles from "./RemindersWorkspace.module.css";

const settingsHref = "/configuraciones?section=reminders";
const money = (amount: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(amount);
const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));

function MetricCard({
  title,
  icon: Icon,
  tone,
  revenue,
  rate,
  rows,
  note,
}: {
  title: string;
  icon: LucideIcon;
  tone: string | undefined;
  revenue: number;
  rate: number;
  rows: { label: string; value: number; total: number }[];
  note: string;
}) {
  return (
    <article className={`${styles.metricCard} ${tone ?? ""}`}>
      <div className={styles.cardHeading}>
        <div>
          <p className={styles.revenue}>{money(revenue)}</p>
          <h3>{title}</h3>
        </div>
        <span className={styles.cardIcon}>
          <Icon size={22} aria-hidden="true" />
        </span>
      </div>
      <div className={styles.confirmationRate}>
        <span>{Math.round(rate)}%</span> de reservas confirmadas
      </div>
      <dl className={styles.metricRows}>
        {rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>
              <span className={styles.miniTrack} aria-hidden="true">
                <span
                  style={{
                    width: `${row.total ? Math.min((row.value / row.total) * 100, 100) : 0}%`,
                  }}
                />
              </span>
              <span>{row.value.toLocaleString("es-MX")}</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className={styles.cardNote}>{note}</p>
    </article>
  );
}

function FailurePanel({
  channel,
  failures,
}: {
  channel: "email" | "whatsapp";
  failures: ReturnType<typeof summarizeReminders>["email"]["failures"];
}) {
  const name = channel === "email" ? "Email" : "WhatsApp";
  const Icon = channel === "email" ? Mail : MessageCircle;
  return (
    <div className={styles.failurePanel}>
      <div className={styles.panelHeading}>
        <h3>Reservas sin recordatorio por {name}</h3>
        <span>
          {failures.length} {failures.length === 1 ? "registro" : "registros"}
        </span>
      </div>
      {failures.length ? (
        <div className={styles.tableScroll}>
          <table>
            <caption className="sr-only">
              Detalle de recordatorios no enviados por {name}
            </caption>
            <thead>
              <tr>
                <th scope="col">Cliente</th>
                <th scope="col">Reserva</th>
                <th scope="col">Local</th>
                <th scope="col">Servicio</th>
                <th scope="col">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {failures.map((failure) => (
                <tr key={failure.id}>
                  <td>{failure.reservation.client}</td>
                  <td>
                    {dateLabel(failure.reservation.performedAt.slice(0, 10))} ·{" "}
                    {failure.reservation.performedAt.slice(11, 16)}
                  </td>
                  <td>{failure.reservation.branch}</td>
                  <td>{failure.reservation.service}</td>
                  <td>{failure.reason || "Motivo no disponible"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <span
            className={`${styles.emptyIcon} ${channel === "email" ? styles.email : styles.whatsapp}`}
          >
            <Icon size={25} aria-hidden="true" />
          </span>
          <h4>Aún no hay registros de {name}</h4>
          <p>
            Los envíos automáticos están pausados en esta vista de demostración.
            Aquí aparecerán las reservas cuyo recordatorio por {name} no se haya
            enviado.
          </p>
          <span className={styles.noSending}>
            <ShieldCheck size={14} aria-hidden="true" />
            No se enviarán mensajes desde esta pantalla
          </span>
        </div>
      )}
    </div>
  );
}

export function RemindersWorkspace() {
  const [period, setPeriod] = useState(defaultReminderPeriod);
  const [draftPeriod, setDraftPeriod] = useState(defaultReminderPeriod);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const reservations = useMemo(
    () =>
      filterReminderReservations(reservationHistory, period.from, period.to),
    [period],
  );
  const summary = useMemo(
    () => summarizeReminders(reservations, demoReminderMessages),
    [reservations],
  );
  const validPeriod = Boolean(
    draftPeriod.from && draftPeriod.to && draftPeriod.from <= draftPeriod.to,
  );

  return (
    <div className={styles.workspace}>
      <header className={styles.header}>
        <div>
          <p className="label-caps">Clientes</p>
          <h1 className={`page-title ${styles.title}`}>Recordatorios</h1>
          <p className={styles.subtitle}>
            Acompaña cada cita, desde el primer aviso hasta la confirmación.
          </p>
        </div>
        <span className={styles.demoBadge}>
          <span />
          Vista de demostración
        </span>
      </header>
      <div className={styles.content}>
        <aside
          className={styles.infoBanner}
          aria-label="Acerca de los recordatorios"
        >
          <Info size={20} aria-hidden="true" />
          <div>
            <h2>Una cita, dos formas de confirmar</h2>
            <p>
              Tus clientes pueden confirmar por Email o WhatsApp. Aquí podrás
              consultar los mensajes enviados y los que no se enviaron. Si la
              cita ya fue confirmada manualmente o por correo, no se enviará
              otro recordatorio por WhatsApp.
            </p>
          </div>
        </aside>

        <section
          className={styles.pausedCard}
          aria-labelledby="reminders-paused-title"
        >
          <div className={styles.pausedMain}>
            <span className={styles.pauseIcon}>
              <Pause size={20} aria-hidden="true" />
            </span>
            <div className={styles.pausedCopy}>
              <span className={styles.statusLabel}>Automatizaciones</span>
              <h2 id="reminders-paused-title">
                El envío de recordatorios está pausado
              </h2>
              <p>
                Tienes <strong>100 mensajes disponibles</strong> en el plan de
                demostración. Los recordatorios automáticos están desactivados;
                puedes revisar sus opciones en Configuraciones.
              </p>
            </div>
            <Link
              href={settingsHref}
              className={styles.activateLink}
              title="Abrir configuración; no activa ni envía mensajes"
            >
              <Settings2 size={16} aria-hidden="true" />
              Configurar recordatorios
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.planFooter}>
            <span>
              <ShieldCheck size={14} aria-hidden="true" />
              Sin envíos reales
            </span>
            <button
              type="button"
              aria-expanded={planOpen}
              aria-controls="reminders-plan-details"
              onClick={() => setPlanOpen(!planOpen)}
            >
              {planOpen ? "Ocultar" : "Mostrar"} información de tu plan
              <ChevronDown
                size={16}
                aria-hidden="true"
                className={planOpen ? styles.rotated : ""}
              />
            </button>
          </div>
          <div
            id="reminders-plan-details"
            hidden={!planOpen}
            className={styles.planDetails}
          >
            <div>
              <span>Plan</span>
              <strong>Demostración</strong>
            </div>
            <div>
              <span>Mensajes disponibles</span>
              <strong>100</strong>
            </div>
            <div>
              <span>Envíos automáticos</span>
              <strong>Desactivados</strong>
            </div>
            <p>
              El saldo es ilustrativo. No corresponde a una suscripción
              contratada ni se consumen mensajes.
            </p>
          </div>
        </section>

        <section
          className={styles.overview}
          aria-labelledby="reminders-overview-title"
        >
          <div className={styles.overviewToolbar}>
            <div>
              <h2 id="reminders-overview-title" className="sr-only">
                Resumen de recordatorios
              </h2>
              <label id="reminders-period-label" className={styles.periodLabel}>
                Periodo de tiempo
              </label>
              <Popover
                open={periodOpen}
                onOpenChange={(open) => {
                  setPeriodOpen(open);
                  if (open) setDraftPeriod(period);
                }}
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-labelledby="reminders-period-label reminders-period-value"
                    className={styles.periodTrigger}
                  >
                    <CalendarDays size={16} aria-hidden="true" />
                    <span id="reminders-period-value">
                      {dateLabel(period.from)} a {dateLabel(period.to)}
                    </span>
                    <ChevronDown size={15} aria-hidden="true" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-[min(330px,calc(100vw-32px))] rounded-2xl border-[#e7ddd4] bg-white p-5 shadow-xl"
                >
                  <form
                    className={styles.periodForm}
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (validPeriod) {
                        setPeriod({ ...draftPeriod });
                        setPeriodOpen(false);
                      }
                    }}
                  >
                    <h3>Selecciona el periodo</h3>
                    <label>
                      Desde
                      <input
                        type="date"
                        required
                        value={draftPeriod.from}
                        max={draftPeriod.to || undefined}
                        onInput={(event) => {
                          const from = event.currentTarget.value;
                          setDraftPeriod((current) => ({
                            ...current,
                            from,
                          }));
                        }}
                      />
                    </label>
                    <label>
                      Hasta
                      <input
                        type="date"
                        required
                        value={draftPeriod.to}
                        min={draftPeriod.from || undefined}
                        onInput={(event) => {
                          const to = event.currentTarget.value;
                          setDraftPeriod((current) => ({
                            ...current,
                            to,
                          }));
                        }}
                      />
                    </label>
                    {!validPeriod ? (
                      <p role="status">
                        Elige una fecha inicial anterior o igual a la final.
                      </p>
                    ) : null}
                    <div>
                      <button
                        type="button"
                        onClick={() => setDraftPeriod(defaultReminderPeriod)}
                      >
                        Restablecer
                      </button>
                      <button type="submit" disabled={!validPeriod}>
                        Aplicar periodo
                      </button>
                    </div>
                  </form>
                </PopoverContent>
              </Popover>
            </div>
            <Link href={settingsHref} className={styles.settingsLink}>
              <Settings2 size={15} aria-hidden="true" />
              Configura los recordatorios aquí
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.metrics} aria-live="polite">
            <MetricCard
              title="Ingresos de reservas confirmadas"
              icon={CalendarDays}
              tone={styles.total}
              revenue={summary.revenue}
              rate={summary.rate}
              rows={[
                {
                  label: "Reservadas",
                  value: summary.reserved,
                  total: summary.reserved,
                },
                {
                  label: "Confirmadas",
                  value: summary.confirmed,
                  total: summary.reserved,
                },
                {
                  label: "Asistidas",
                  value: summary.attended,
                  total: summary.reserved,
                },
              ]}
              note="Incluye confirmaciones manuales, por Email y WhatsApp. Los importes de demostración representan el valor de las reservas, no pagos cobrados."
            />
            <MetricCard
              title="Ingresos confirmados por Email"
              icon={Mail}
              tone={styles.email}
              revenue={summary.email.revenue}
              rate={summary.email.rate}
              rows={[
                {
                  label: "Emails enviados",
                  value: summary.email.sent,
                  total: summary.email.sent,
                },
                {
                  label: "Emails confirmados",
                  value: summary.email.confirmed,
                  total: summary.email.sent,
                },
                {
                  label: "Emails no enviados*",
                  value: summary.email.failures.length,
                  total: summary.email.sent + summary.email.failures.length,
                },
              ]}
              note="* No se envía si la cita ya está confirmada, falta el correo o la dirección es incorrecta o está bloqueada."
            />
            <MetricCard
              title="Ingresos confirmados por WhatsApp"
              icon={MessageCircle}
              tone={styles.whatsapp}
              revenue={summary.whatsapp.revenue}
              rate={summary.whatsapp.rate}
              rows={[
                {
                  label: "WhatsApp enviados",
                  value: summary.whatsapp.sent,
                  total: summary.whatsapp.sent,
                },
                {
                  label: "WhatsApp confirmados",
                  value: summary.whatsapp.confirmed,
                  total: summary.whatsapp.sent,
                },
                {
                  label: "WhatsApp no enviados*",
                  value: summary.whatsapp.failures.length,
                  total:
                    summary.whatsapp.sent + summary.whatsapp.failures.length,
                },
              ]}
              note="* No se envía si falta un teléfono válido o si la reserva ya fue confirmada manualmente o por Email."
            />
          </div>
          {!reservations.length ? (
            <p className={styles.noReservations} role="status">
              No hay reservas de demostración en el periodo seleccionado.
            </p>
          ) : null}
        </section>

        <section
          className={styles.failures}
          aria-labelledby="reminder-failures-title"
        >
          <div className={styles.failuresHeading}>
            <div>
              <p className={styles.eyebrow}>Seguimiento por canal</p>
              <h2 id="reminder-failures-title">Reservas sin recordatorios</h2>
              <p>
                Consulta las reservas en las que el envío de recordatorio no se
                completó correctamente.
              </p>
            </div>
            <span className={styles.helpIcon}>
              <CircleHelp size={20} aria-hidden="true" />
            </span>
          </div>
          <Tabs defaultValue="email">
            <TabsList
              aria-label="Canal de recordatorios"
              className={styles.tabsList}
            >
              <TabsTrigger value="email" className={styles.tab}>
                <Mail size={16} aria-hidden="true" />
                Email<span>{summary.email.failures.length}</span>
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className={styles.tab}>
                <MessageCircle size={16} aria-hidden="true" />
                WhatsApp<span>{summary.whatsapp.failures.length}</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="email" className={styles.tabPanel}>
              <FailurePanel channel="email" failures={summary.email.failures} />
            </TabsContent>
            <TabsContent value="whatsapp" className={styles.tabPanel}>
              <FailurePanel
                channel="whatsapp"
                failures={summary.whatsapp.failures}
              />
            </TabsContent>
          </Tabs>
        </section>
        <p className={styles.footnote}>
          <Bell size={13} aria-hidden="true" />
          Vista local con datos de demostración. La conexión de envíos se
          configurará en una etapa posterior.
        </p>
      </div>
    </div>
  );
}
