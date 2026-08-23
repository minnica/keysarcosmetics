"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  cn,
} from "@cosmetics/ui";

export type HrButtonTone = "default" | "gold" | "danger" | "green";

const toneClasses: Record<HrButtonTone, string> = {
  default:
    "border-[#675a42] bg-[#222] text-[#e6dfd2] hover:border-[#c4a052] hover:bg-[#28251f] hover:text-white",
  gold: "border-[#c4a052] bg-[#c4a052] font-bold text-[#111] hover:bg-[#dfbd68] hover:text-[#090806]",
  danger:
    "border-[#695b45] bg-[#222] text-[#e8cfc8] hover:border-[#b96550] hover:bg-[#381c17] hover:text-white",
  green: "border-[#c4a052] bg-[#174c3c] text-white hover:bg-[#1f624e]",
};

export function HrButton({
  tone = "default",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: HrButtonTone }) {
  return (
    <Button
      {...props}
      className={cn(
        "h-8 rounded-none border px-3 text-[8px] font-normal transition-colors focus-visible:ring-[#dfbd68] [&_svg]:size-3",
        toneClasses[tone],
        className,
      )}
    />
  );
}

export function HrStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const classes =
    normalized === "activo" || normalized === "autorizado"
      ? "border-transparent bg-[#dfe9df] text-[#24543f]"
      : normalized === "inactivo" || normalized === "rechazado"
        ? "border-transparent bg-[#4a2822] text-[#ffd8ce]"
        : "border-transparent bg-[#6a5630] text-[#fff0c7]";
  return (
    <Badge
      className={cn(
        "min-w-[66px] justify-center rounded-full px-2 py-1 text-[7px] font-normal",
        classes,
      )}
    >
      {status}
    </Badge>
  );
}

export function HrFormDialog({
  open,
  onOpenChange,
  title,
  description = "Los cambios se guardan únicamente en los mocks locales de HR.",
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[720px] gap-0 rounded-none border-[#c4a052] bg-[#171717] p-0 text-[#eee9df] shadow-brand-md">
        <DialogHeader className="border-b border-[#c4a052] bg-[#0e0e0e] px-6 py-5">
          <p className="text-[8px] font-bold uppercase tracking-[.16em] text-[#c4a052]">
            Datos de demostración
          </p>
          <DialogTitle className="font-brand text-2xl font-normal">
            {title}
          </DialogTitle>
          <DialogDescription className="text-[10px] text-[#b9ad98]">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <DialogFooter className="border-t border-[#51452f] px-6 py-4">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function HrConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Eliminar",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-none border-[#c4a052] bg-[#171717] text-[#eee9df] shadow-brand-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-brand text-2xl font-normal">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-[#b9ad98]">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-none border-[#675a42] bg-[#222] text-[#eee9df] hover:bg-[#28251f] hover:text-white">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="rounded-none bg-[#9f4436] text-white hover:bg-[#b64e3d]"
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function HrIconButton({
  label,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
}) {
  return (
    <TooltipProvider delayDuration={250}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={label}
            {...props}
            className="h-8 w-8 rounded-none text-[#c4a052] hover:bg-[#2a261f] hover:text-[#dfbd68]"
          >
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent className="rounded-none border border-[#c4a052] bg-[#101010] text-[#eee9df]">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
