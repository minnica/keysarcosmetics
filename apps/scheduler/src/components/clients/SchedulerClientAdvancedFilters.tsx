"use client";

import type {
  SchedulerAppointmentStatus,
  SchedulerCustomerFieldDefinitionDto,
} from "@cosmetics/types";
import {
  Badge,
  Button,
  Input,
  Label,
  MultiCombobox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@cosmetics/ui";
import {
  ChevronDown,
  Filter,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";

export interface SchedulerClientAdvancedFilterValue {
  noAppointmentWithinDays: number | null;
  appointmentStatuses: SchedulerAppointmentStatus[];
  serviceProfileIds: string[];
  birthdayMonth: number | null;
  sellerNames: string[];
  customFields: Record<string, string>;
}

interface FilterOption {
  id: string;
  name: string;
}

interface SchedulerClientAdvancedFiltersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: SchedulerClientAdvancedFilterValue;
  onChange: (value: SchedulerClientAdvancedFilterValue) => void;
  definitions: SchedulerCustomerFieldDefinitionDto[];
  services: FilterOption[];
  sellers: string[];
  activeCount: number;
  onClear: () => void;
}

const statuses: Array<{ value: SchedulerAppointmentStatus; label: string }> = [
  { value: "PENDING", label: "Pendiente" },
  { value: "RESERVED", label: "Reservada" },
  { value: "CONFIRMED", label: "Confirmada" },
  { value: "ARRIVED", label: "Llegó" },
  { value: "WAITING", label: "En espera" },
  { value: "ATTENDED", label: "Atendida" },
  { value: "NO_SHOW", label: "No asistió" },
  { value: "CANCELED", label: "Cancelada" },
];

const months = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export function SchedulerClientAdvancedFilters({
  open,
  onOpenChange,
  value,
  onChange,
  definitions,
  services,
  sellers,
  activeCount,
  onClear,
}: SchedulerClientAdvancedFiltersProps) {
  const customDefinitions = definitions.filter(
    (definition) => !["birthDate", "salesOwner"].includes(definition.key),
  );

  return (
    <div className="border-t border-[#eee6df] bg-[#fcfaf8]">
      <button
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        onClick={() => onOpenChange(!open)}
        type="button"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f3e8dc] text-[#9b7652]">
            <SlidersHorizontal className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-[#263649]">
              Filtros inteligentes
            </span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Combina actividad, estatus, servicio, cumpleaños, vendedor y
              campos personalizados.
            </span>
          </span>
        </span>
        <span className="flex items-center gap-2">
          {activeCount > 0 ? (
            <Badge className="rounded-full border-0 bg-[#263649] px-2.5 text-white">
              {activeCount}
            </Badge>
          ) : null}
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {open ? (
        <div className="space-y-6 border-t border-[#eee6df] px-5 py-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <Label className="font-semibold text-[#364152]">
                Sin citas recientes
              </Label>
              <Select
                value={String(value.noAppointmentWithinDays ?? "ALL")}
                onValueChange={(next) =>
                  onChange({
                    ...value,
                    noAppointmentWithinDays:
                      next === "ALL" ? null : Number(next),
                  })
                }
              >
                <SelectTrigger className="h-11 rounded-xl border-[#dfd5cc] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Cualquier actividad</SelectItem>
                  {[30, 60, 90, 180, 365].map((days) => (
                    <SelectItem key={days} value={String(days)}>
                      Sin citas en {days} días
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="font-semibold text-[#364152]">
                Mes de cumpleaños
              </Label>
              <Select
                value={String(value.birthdayMonth ?? "ALL")}
                onValueChange={(next) =>
                  onChange({
                    ...value,
                    birthdayMonth: next === "ALL" ? null : Number(next),
                  })
                }
              >
                <SelectTrigger className="h-11 rounded-xl border-[#dfd5cc] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los meses</SelectItem>
                  {months.map((month, index) => (
                    <SelectItem key={month} value={String(index + 1)}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end justify-start xl:justify-end">
              <Button
                className="h-11 rounded-xl border-[#dfd5cc] bg-white text-slate-600"
                disabled={activeCount === 0}
                onClick={onClear}
                type="button"
                variant="outline"
              >
                <RotateCcw className="mr-2 h-4 w-4" /> Limpiar filtros
              </Button>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <div className="rounded-2xl border border-[#e8ded5] bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9b7652]">
                Estatus en agenda
              </p>
              <MultiCombobox
                className="mt-3 h-11 rounded-xl border-[#dfd5cc] bg-white"
                emptyMessage="No encontramos ese estatus"
                id="customer-appointment-statuses"
                onValueChange={(appointmentStatuses) =>
                  onChange({
                    ...value,
                    appointmentStatuses:
                      appointmentStatuses as SchedulerAppointmentStatus[],
                  })
                }
                options={statuses}
                placeholder="Todos los estatus"
                searchPlaceholder="Escribe un estatus..."
                selectedCountLabel="estatus seleccionados"
                value={value.appointmentStatuses}
              />
            </div>

            <div className="rounded-2xl border border-[#e8ded5] bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9b7652]">
                Servicios
              </p>
              <MultiCombobox
                className="mt-3 h-11 rounded-xl border-[#dfd5cc] bg-white"
                emptyMessage="No encontramos ese servicio"
                id="customer-services"
                onValueChange={(serviceProfileIds) =>
                  onChange({ ...value, serviceProfileIds })
                }
                options={services.map((service) => ({
                  value: service.id,
                  label: service.name,
                }))}
                placeholder="Todos los servicios"
                searchPlaceholder="Escribe un servicio..."
                selectedCountLabel="servicios seleccionados"
                value={value.serviceProfileIds}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-[#e8ded5] bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9b7652]">
              Vendedor asignado
            </p>
            <MultiCombobox
              className="mt-3 h-11 rounded-xl border-[#dfd5cc] bg-white"
              emptyMessage="No encontramos ese vendedor"
              id="customer-sellers"
              onValueChange={(sellerNames) =>
                onChange({ ...value, sellerNames })
              }
              options={sellers.map((seller) => ({
                value: seller,
                label: seller,
              }))}
              placeholder="Todos los vendedores"
              searchPlaceholder="Escribe el nombre del vendedor..."
              selectedCountLabel="vendedores seleccionados"
              value={value.sellerNames}
            />
          </div>

          {customDefinitions.length ? (
            <div className="rounded-2xl border border-[#e8ded5] bg-white p-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-[#9b7652]" />
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9b7652]">
                  Campos personalizados
                </p>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {customDefinitions.map((definition) => (
                  <div className="space-y-2" key={definition.id}>
                    <Label className="text-xs font-semibold text-slate-600">
                      {definition.label}
                    </Label>
                    {definition.type === "SELECT" ||
                    definition.type === "BOOLEAN" ? (
                      <Select
                        value={value.customFields[definition.id] || "ALL"}
                        onValueChange={(next) =>
                          onChange({
                            ...value,
                            customFields: {
                              ...value.customFields,
                              [definition.id]: next === "ALL" ? "" : next,
                            },
                          })
                        }
                      >
                        <SelectTrigger className="h-10 rounded-xl border-[#dfd5cc]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">Cualquier valor</SelectItem>
                          {(definition.type === "BOOLEAN"
                            ? ["true", "false"]
                            : (definition.options ?? [])
                          ).map((option) => (
                            <SelectItem key={option} value={option}>
                              {definition.type === "BOOLEAN"
                                ? option === "true"
                                  ? "Sí"
                                  : "No"
                                : option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        className="h-10 rounded-xl border-[#dfd5cc]"
                        onChange={(event) =>
                          onChange({
                            ...value,
                            customFields: {
                              ...value.customFields,
                              [definition.id]: event.target.value,
                            },
                          })
                        }
                        placeholder="Filtrar valor"
                        type={
                          definition.type === "DATE"
                            ? "date"
                            : definition.type === "NUMBER"
                              ? "number"
                              : "text"
                        }
                        value={value.customFields[definition.id] ?? ""}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
