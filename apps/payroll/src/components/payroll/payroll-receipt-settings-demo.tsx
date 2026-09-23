"use client";

import { useEffect, useState } from "react";
import {
  Eye,
  FileText,
  LockKeyhole,
  MessageSquareText,
  Save,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  toast,
} from "@cosmetics/ui";
import {
  type DemoReceiptConfiguration,
  usePayrollDemo,
} from "./payroll-demo-context";

type ReceiptBooleanField = Exclude<
  keyof DemoReceiptConfiguration,
  "title" | "subtitle"
>;

const configurableFields: Array<{
  key: ReceiptBooleanField;
  label: string;
  description: string;
}> = [
  {
    key: "showSales",
    label: "Ventas del periodo",
    description: "Base de venta utilizada para determinar la comisión.",
  },
  {
    key: "showScheme",
    label: "Esquema y tasa",
    description: "Nombre del esquema, porcentaje y tratamiento de IVA.",
  },
  {
    key: "showTemporaryBonusProgress",
    label: "Avance de bonos temporales",
    description: "Progreso, posición y monto faltante para obtener el bono.",
  },
  {
    key: "showBankAccount",
    label: "Cuenta de pago",
    description: "Banco y terminación de la cuenta registrada.",
  },
];

function ConfigurationToggle({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  label: string;
  description: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex min-h-24 w-full items-center justify-between gap-4 rounded-xl border p-4 text-left transition-colors ${
        checked
          ? "border-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/25"
          : "border-[color:var(--border-color)] bg-[color:var(--bg-card)]"
      }`}
    >
      <span>
        <strong className="block text-sm">{label}</strong>
        <span className="mt-1 block text-xs text-[color:var(--text-muted)]">
          {description}
        </span>
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-emerald-600" : "bg-stone-300 dark:bg-stone-700"}`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`}
        />
      </span>
    </button>
  );
}

export function PayrollReceiptSettingsDemo() {
  const { state, updateReceiptConfiguration } = usePayrollDemo();
  const [draft, setDraft] = useState(state.receiptConfiguration);

  useEffect(() => {
    setDraft(state.receiptConfiguration);
  }, [state.receiptConfiguration]);

  function save() {
    if (!draft.title.trim() || !draft.subtitle.trim()) {
      toast.error("Captura el título y la descripción del recibo.");
      return;
    }
    updateReceiptConfiguration(draft);
    toast.success("Configuración aplicada a todos los recibos personales.");
  }

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">CONFIGURACIÓN MÁSTER</Badge>
            <span className="text-xs text-[color:var(--text-muted)]">
              Fuente única para portal, historial y vista administrativa
            </span>
          </div>
          <h1 className="page-title">Configuración de recibos</h1>
          <p className="mt-1 max-w-3xl text-sm text-[color:var(--text-muted)]">
            Define qué información verá el empleado y si el sueldo base debe
            formar parte del pago mostrado en su recibo.
          </p>
        </div>
        <Button onClick={save}>
          <Save className="mr-2 h-4 w-4" /> Aplicar configuración
        </Button>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <Card className="border-[color:var(--border-color)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-[color:var(--accent)]" />
              Encabezado del documento
            </CardTitle>
            <CardDescription>
              El cambio se refleja inmediatamente en los recibos de la sesión.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="receipt-title">Título</Label>
              <Input
                id="receipt-title"
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receipt-subtitle">Descripción</Label>
              <Input
                id="receipt-subtitle"
                value={draft.subtitle}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    subtitle: event.target.value,
                  }))
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-300/70 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LockKeyhole className="h-4 w-4 text-emerald-700" />
              Información obligatoria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="flex items-start gap-2">
              <Eye className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
              Comisión personal y total neto del recibo.
            </p>
            <p className="flex items-start gap-2">
              <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
              Motivo de toda multa, bono o ajuste aplicado.
            </p>
            <p className="text-xs text-[color:var(--text-muted)]">
              Estos datos no pueden ocultarse porque explican el pago y permiten
              solicitar una aclaración.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-amber-300/70 bg-amber-50/45 dark:border-amber-800 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle className="text-base">Regla del sueldo base</CardTitle>
          <CardDescription>
            Este interruptor cambia tanto la información visible como el total
            pagable del recibo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConfigurationToggle
            checked={draft.includeBaseSalaryInReceipt}
            label={
              draft.includeBaseSalaryInReceipt
                ? "MOSTRAR Y SUMAR SUELDO EN EL RECIBO"
                : "OCULTAR SUELDO DEL RECIBO"
            }
            description={
              draft.includeBaseSalaryInReceipt
                ? "El sueldo del periodo aparece como percepción y se suma al neto del recibo."
                : "El sueldo no se muestra ni participa en el total; el recibo conserva únicamente comisiones y movimientos."
            }
            onChange={(checked) =>
              setDraft((current) => ({
                ...current,
                includeBaseSalaryInReceipt: checked,
              }))
            }
          />
        </CardContent>
      </Card>

      <Card className="border-[color:var(--border-color)]">
        <CardHeader>
          <CardTitle className="text-base">Información configurable</CardTitle>
          <CardDescription>
            Activa únicamente los bloques que deben aparecer en la vista,
            historial e impresión del recibo.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {configurableFields.map((field) => (
            <ConfigurationToggle
              key={field.key}
              checked={draft[field.key]}
              label={field.label}
              description={field.description}
              onChange={(checked) =>
                setDraft((current) => ({
                  ...current,
                  [field.key]: checked,
                }))
              }
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
