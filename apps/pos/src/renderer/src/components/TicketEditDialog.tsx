import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import {
  Button,
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
} from "@cosmetics/ui";
import type { Seller, Ticket } from "../types";

interface TicketEditDialogProps {
  open: boolean;
  ticket: Ticket | null;
  sellers: Seller[];
  onOpenChange: (open: boolean) => void;
  onSave: (ticketId: string, changes: Partial<Ticket>) => void;
}

export function TicketEditDialog({
  open,
  ticket,
  sellers,
  onOpenChange,
  onSave,
}: TicketEditDialogProps) {
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [sellerSummary, setSellerSummary] = useState("");

  useEffect(() => {
    if (!ticket || !open) return;
    setClientName(ticket.clientName);
    setClientPhone(ticket.clientPhone);
    setSellerSummary(ticket.sellerSummary);
  }, [open, ticket]);

  if (!ticket) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Editar ticket {ticket.id}</DialogTitle>
          <DialogDescription>
            Ajusta los datos de identificación del comprobante mock.
          </DialogDescription>
        </DialogHeader>
        <div className="ticket-edit-form">
          <div className="field-stack">
            <Label htmlFor="ticket-client-name">Nombre del cliente</Label>
            <Input
              id="ticket-client-name"
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
            />
          </div>
          <div className="field-stack">
            <Label htmlFor="ticket-client-phone">Teléfono del cliente</Label>
            <Input
              id="ticket-client-phone"
              type="tel"
              value={clientPhone}
              onChange={(event) => setClientPhone(event.target.value)}
            />
          </div>
          <div className="field-stack">
            <Label htmlFor="ticket-seller">Vendedor principal</Label>
            <Select value={sellerSummary} onValueChange={setSellerSummary}>
              <SelectTrigger id="ticket-seller">
                <SelectValue placeholder="Selecciona vendedor" />
              </SelectTrigger>
              <SelectContent>
                {sellers
                  .filter((seller) => seller.active)
                  .map((seller) => (
                    <SelectItem key={seller.id} value={seller.name}>
                      {seller.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!clientName.trim() || !sellerSummary}
            onClick={() => {
              onSave(ticket.id, {
                clientName: clientName.trim(),
                clientPhone: clientPhone.trim(),
                sellerSummary,
              });
              onOpenChange(false);
            }}
          >
            <Save size={16} /> Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
