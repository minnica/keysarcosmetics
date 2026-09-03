import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@cosmetics/ui";
import {
  availableBanks,
  cardNetworkLabels,
  paymentBankName,
} from "../bank-catalog";
import type {
  BankCatalogEntry,
  CardNetwork,
  CardType,
  PaymentEntry,
} from "../types";

interface PaymentReferenceFieldsProps {
  payment: PaymentEntry;
  isCard: boolean;
  bankCatalog: BankCatalogEntry[];
  installmentOptions: number[];
  ariaContext: string;
  onChange: (payment: PaymentEntry) => void;
}

export function PaymentReferenceFields({
  payment,
  isCard,
  bankCatalog,
  installmentOptions,
  ariaContext,
  onChange,
}: PaymentReferenceFieldsProps) {
  const banks = availableBanks(
    bankCatalog,
    isCard ? payment.cardType : undefined,
    isCard ? payment.cardNetwork : undefined,
  );
  const selectedBankName = paymentBankName(payment);
  const selectedBank =
    bankCatalog.find((bank) => bank.id === payment.bankId) ??
    bankCatalog.find(
      (bank) =>
        bank.name.toLocaleLowerCase("es-MX") ===
        selectedBankName.toLocaleLowerCase("es-MX"),
    );
  const selectedBankValue = selectedBank?.id ?? "";

  const updateCardType = (cardType: CardType) => {
    const {
      cardNetwork: _cardNetwork,
      bankId: _bankId,
      bankName: _bankName,
      installmentMonths,
      ...paymentWithoutSelection
    } = payment;
    const next: PaymentEntry =
      cardType === "CREDIT" && installmentMonths
        ? {
            ...paymentWithoutSelection,
            cardType,
            cardOrBank: "",
            installmentMonths,
          }
        : { ...paymentWithoutSelection, cardType, cardOrBank: "" };
    onChange(next);
  };

  const updateNetwork = (cardNetwork: CardNetwork) => {
    const {
      bankId: _bankId,
      bankName: _bankName,
      ...paymentWithoutBank
    } = payment;
    onChange({ ...paymentWithoutBank, cardNetwork, cardOrBank: "" });
  };

  const updateBank = (id: string) => {
    const bank = bankCatalog.find((candidate) => candidate.id === id);
    if (!bank) return;
    onChange({
      ...payment,
      bankId: bank.id,
      bankName: bank.name,
      cardOrBank: bank.name,
    });
  };

  return (
    <>
      {isCard && (
        <div className="field-stack">
          <Label>Crédito o débito</Label>
          <Select
            value={payment.cardType ?? ""}
            onValueChange={(value) => updateCardType(value as CardType)}
          >
            <SelectTrigger aria-label={`Crédito o débito ${ariaContext}`}>
              <SelectValue placeholder="Selecciona tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CREDIT">Tarjeta de crédito</SelectItem>
              <SelectItem value="DEBIT">Tarjeta de débito</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {isCard && payment.cardType && (
        <div className="field-stack">
          <Label>Red de la tarjeta</Label>
          <Select
            value={payment.cardNetwork ?? ""}
            onValueChange={(value) => updateNetwork(value as CardNetwork)}
          >
            <SelectTrigger aria-label={`Red de tarjeta ${ariaContext}`}>
              <SelectValue placeholder="Visa o Mastercard" />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(cardNetworkLabels) as [CardNetwork, string][]).map(
                ([id, label]) => (
                  <SelectItem key={id} value={id}>
                    {label}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {(!isCard || (payment.cardType && payment.cardNetwork)) && (
        <div className="field-stack">
          <Label>Banco</Label>
          <Select value={selectedBankValue} onValueChange={updateBank}>
            <SelectTrigger aria-label={`Banco ${ariaContext}`}>
              <SelectValue placeholder="Selecciona banco" />
            </SelectTrigger>
            <SelectContent>
              {banks.map((bank) => (
                <SelectItem key={bank.id} value={bank.id}>
                  {bank.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="field-stack">
        <Label>4 dígitos de autorización</Label>
        <Input
          value={payment.authorizationCode ?? ""}
          inputMode="numeric"
          maxLength={4}
          placeholder="0000"
          aria-label={`Autorización ${ariaContext}`}
          onChange={(event) =>
            onChange({
              ...payment,
              authorizationCode: event.target.value.replace(/\D/g, "").slice(0, 4),
            })
          }
        />
      </div>

      {isCard && payment.cardType === "CREDIT" && (
        <div className="field-stack">
          <Label>Meses sin intereses</Label>
          <Select
            value={payment.installmentMonths?.toString() ?? ""}
            onValueChange={(months) =>
              onChange({ ...payment, installmentMonths: Number(months) })
            }
          >
            <SelectTrigger aria-label={`Meses sin intereses ${ariaContext}`}>
              <SelectValue placeholder="Selecciona plazo" />
            </SelectTrigger>
            <SelectContent>
              {installmentOptions.map((months) => (
                <SelectItem key={months} value={months.toString()}>
                  {months === 1 ? "Una exhibición" : `${months} meses sin intereses`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  );
}
