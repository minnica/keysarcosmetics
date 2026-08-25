import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  Building2,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  DollarSign,
  HeartCrack,
  LockKeyhole,
  Mail,
  MapPin,
  Plus,
  Power,
  ReceiptText,
  Save,
  ShieldCheck,
  Star,
  Trash2,
  UserRoundCheck,
  UserRound,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  DatePicker,
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
  toast,
} from "@cosmetics/ui";
import type {
  BillingCard,
  BillingHistoryEntry,
  BillingLocation,
  BillingProfile,
  Seller,
} from "../types";
import { HistoryPagination, useHistoryPagination } from "./HistoryPagination";

interface MyAccountViewProps {
  isMasterSession: boolean;
  currentSeller: Seller | null;
  authorized: boolean;
  profile: BillingProfile;
  cards: BillingCard[];
  locations: BillingLocation[];
  history: BillingHistoryEntry[];
  isMasterCode: (code: string) => boolean;
  onAuthorize: () => void;
  onLock: () => void;
  onSaveProfile: (profile: BillingProfile) => void;
  onAddCard: (card: BillingCard) => void;
  onSetDefaultCard: (cardId: string) => void;
  onRemoveCard: (cardId: string) => void;
  onActivateLocation: (
    locationId: string,
    cardId: string,
    billingStartDate: string,
    nextBillingDate: string,
  ) => void;
  onAddLocation: (name: string, costUsd: number) => boolean;
  onDeactivateLocation: (locationId: string) => boolean;
  onSaveSellerAccess: (input: {
    sellerId: string;
    currentCode: string;
    alias: string;
    newCode: string;
  }) => string | null;
}

interface SellerAccessAccountProps {
  seller: Seller | null;
  onSave: MyAccountViewProps["onSaveSellerAccess"];
}

function SellerAccessAccount({ seller, onSave }: SellerAccessAccountProps) {
  const [alias, setAlias] = useState(seller?.alias ?? "");
  const [currentCode, setCurrentCode] = useState("");
  const [newCode, setNewCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setAlias(seller?.alias ?? "");
  }, [seller?.alias]);

  if (!seller) {
    return (
      <Card className="my-account-gate">
        <CardContent>
          <div className="my-account-gate-icon"><AlertTriangle size={27} /></div>
          <span className="section-kicker">CUENTA NO DISPONIBLE</span>
          <h2>No encontramos tu perfil</h2>
          <p>La sesión no está ligada a un vendedor activo. Solicita apoyo a administración.</p>
        </CardContent>
      </Card>
    );
  }

  const hasNewCode = newCode.length > 0 || confirmCode.length > 0;
  const formIsReady =
    alias.trim().length >= 3 &&
    currentCode.length === 4 &&
    (!hasNewCode || (newCode.length === 4 && confirmCode === newCode));

  const saveAccess = () => {
    setFormError("");
    if (hasNewCode && newCode !== confirmCode) {
      setFormError("La confirmación no coincide con la nueva contraseña.");
      return;
    }
    const error = onSave({
      sellerId: seller.id,
      currentCode,
      alias,
      newCode,
    });
    if (error) {
      setFormError(error);
      return;
    }
    setCurrentCode("");
    setNewCode("");
    setConfirmCode("");
    toast.success("Tus accesos generales se actualizaron correctamente.");
  };

  return (
    <div className="seller-access-account">
      <Card className="seller-access-identity-card">
        <CardContent>
          <div className="seller-access-avatar">{seller.initials}</div>
          <div>
            <span className="section-kicker">CUENTA PERSONAL</span>
            <h2>{seller.name}</h2>
            <p>Este nombre seguirá apareciendo en tickets, ventas y reportes.</p>
          </div>
          <Badge variant="outline"><ShieldCheck size={13} /> ACCESO PERSONAL</Badge>
        </CardContent>
      </Card>

      <Card className="seller-access-form-card">
        <CardContent>
          <div className="account-section-heading data-card-heading">
            <div>
              <span className="section-kicker">SEGURIDAD DE LA CUENTA</span>
              <h2>Alias y contraseña personal</h2>
              <p>Los cambios se aplicarán a cualquier pantalla que solicite tu usuario o clave.</p>
            </div>
            <UserRoundCheck size={25} />
          </div>

          <div className="seller-access-fields">
            <div className="field-stack seller-access-alias-field">
              <Label htmlFor="seller-account-alias">Alias de acceso</Label>
              <div className="account-input-icon">
                <UserRound size={16} />
                <Input
                  id="seller-account-alias"
                  value={alias}
                  onChange={(event) => {
                    setAlias(event.target.value.toLocaleLowerCase("es-MX").replace(/\s+/g, ""));
                    setFormError("");
                  }}
                  placeholder="Tu alias"
                  autoComplete="username"
                />
              </div>
              <small>Único, de 3 a 24 caracteres; acepta letras, números, punto, guion y guion bajo.</small>
            </div>

            <div className="field-stack">
              <Label htmlFor="seller-account-current-code">Contraseña personal actual</Label>
              <div className="account-input-icon">
                <LockKeyhole size={16} />
                <Input
                  id="seller-account-current-code"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={currentCode}
                  onChange={(event) => {
                    setCurrentCode(event.target.value.replace(/\D/g, ""));
                    setFormError("");
                  }}
                  placeholder="4 dígitos"
                  autoComplete="current-password"
                />
              </div>
              <small>Confirma tu identidad antes de guardar cualquier modificación.</small>
            </div>

            <div className="field-stack">
              <Label htmlFor="seller-account-new-code">Nueva contraseña personal</Label>
              <div className="account-input-icon">
                <LockKeyhole size={16} />
                <Input
                  id="seller-account-new-code"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={newCode}
                  onChange={(event) => {
                    setNewCode(event.target.value.replace(/\D/g, ""));
                    setFormError("");
                  }}
                  placeholder="4 dígitos"
                  autoComplete="new-password"
                />
              </div>
              <small>Déjala vacía si sólo deseas cambiar el alias.</small>
            </div>

            <div className="field-stack">
              <Label htmlFor="seller-account-confirm-code">Confirmar nueva contraseña</Label>
              <div className="account-input-icon">
                <ShieldCheck size={16} />
                <Input
                  id="seller-account-confirm-code"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={confirmCode}
                  onChange={(event) => {
                    setConfirmCode(event.target.value.replace(/\D/g, ""));
                    setFormError("");
                  }}
                  placeholder="Repite los 4 dígitos"
                  autoComplete="new-password"
                />
              </div>
            </div>
          </div>

          <div className="seller-access-security-note">
            <LockKeyhole size={16} />
            <span>La clave anterior dejará de funcionar inmediatamente después de guardar.</span>
          </div>
          {formError && <div className="seller-access-error"><AlertTriangle size={15} /> {formError}</div>}
          <div className="seller-access-actions">
            <Button type="button" onClick={saveAccess} disabled={!formIsReady}>
              <Save size={16} /> Guardar cambios
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const formatUsd = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);

const getCardBrand = (number: string) => {
  if (number.startsWith("4")) return "VISA";
  if (/^5[1-5]/.test(number)) return "MASTERCARD";
  if (/^3[47]/.test(number)) return "AMEX";
  return "TARJETA";
};

const addMonth = (dateValue: string) => {
  const date = new Date(`${dateValue}T12:00:00`);
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().slice(0, 10);
};

const daysUntil = (dateValue: string) => {
  if (!dateValue) return null;
  const now = new Date();
  const target = new Date(`${dateValue}T23:59:59`);
  return Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
};

export function MyAccountView({
  isMasterSession,
  currentSeller,
  authorized,
  profile,
  cards,
  locations,
  history,
  isMasterCode,
  onAuthorize,
  onLock,
  onSaveProfile,
  onAddCard,
  onSetDefaultCard,
  onRemoveCard,
  onActivateLocation,
  onAddLocation,
  onDeactivateLocation,
  onSaveSellerAccess,
}: MyAccountViewProps) {
  const [accessCode, setAccessCode] = useState("");
  const [accessError, setAccessError] = useState("");
  const [personalName, setPersonalName] = useState(profile.personalName);
  const [companyName, setCompanyName] = useState(profile.companyName);
  const [notificationEmails, setNotificationEmails] = useState(
    profile.notificationEmails,
  );
  const [newEmail, setNewEmail] = useState("");
  const [holderName, setHolderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [authorizationCode, setAuthorizationCode] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [activationLocationId, setActivationLocationId] = useState("");
  const [activationCardId, setActivationCardId] = useState("");
  const [activationStartDate, setActivationStartDate] = useState("");
  const [newLocationOpen, setNewLocationOpen] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationCostUsd, setNewLocationCostUsd] = useState("69");
  const [deactivationLocationId, setDeactivationLocationId] = useState("");
  const billingPagination = useHistoryPagination(history, "billing-history");

  if (!isMasterSession) {
    return <SellerAccessAccount seller={currentSeller} onSave={onSaveSellerAccess} />;
  }

  const authorize = () => {
    if (!isMasterCode(accessCode)) {
      setAccessError("Código master incorrecto.");
      return;
    }
    setAccessCode("");
    setAccessError("");
    onAuthorize();
    toast.success("My Account desbloqueado para Master Keysar.");
  };

  if (!authorized) {
    return (
      <Card className="my-account-gate">
        <CardContent>
          <div className="my-account-gate-icon">
            <LockKeyhole size={27} />
          </div>
          <span className="section-kicker">ACCESO MASTER</span>
          <h2>My Account</h2>
          <p>
            Administra la facturación, ubicaciones y métodos de pago de la
            empresa con el código del usuario master.
          </p>
          <div className="my-account-code-row">
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={accessCode}
              onChange={(event) =>
                setAccessCode(event.target.value.replace(/\D/g, ""))
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") authorize();
              }}
              placeholder="Código master"
              aria-label="Código master para My Account"
            />
            <Button
              type="button"
              onClick={authorize}
              disabled={accessCode.length !== 4}
            >
              <ShieldCheck size={16} /> Acceder
            </Button>
          </div>
          {accessError && <span className="my-account-error">{accessError}</span>}
          <small>Usuario de prueba: Master Keysar · código 2468.</small>
        </CardContent>
      </Card>
    );
  }

  const activeLocations = locations.filter(
    (location) => location.status === "ACTIVE",
  );
  const monthlyTotal = activeLocations.reduce(
    (sum, location) => sum + location.costUsd,
    0,
  );
  const upcomingLocations = activeLocations.filter((location) => {
    const remaining = daysUntil(location.nextBillingDate);
    return remaining !== null && remaining >= 0 && remaining <= 7;
  });
  const cardDigits = cardNumber.replace(/\D/g, "");
  const cardFormIsValid =
    holderName.trim().length >= 3 &&
    cardDigits.length >= 12 &&
    authorizationCode.trim().length >= 3 &&
    Number(expiryMonth) >= 1 &&
    Number(expiryMonth) <= 12 &&
    expiryYear.length === 4;

  const addEmail = () => {
    const email = newEmail.trim().toLocaleLowerCase("es-MX");
    if (!email || !email.includes("@")) {
      toast.error("Ingresa un correo electrónico válido.");
      return;
    }
    if (notificationEmails.includes(email)) {
      toast.error("Ese correo ya está registrado.");
      return;
    }
    setNotificationEmails((current) => [...current, email]);
    setNewEmail("");
  };

  const saveProfile = () => {
    if (!personalName.trim() || !companyName.trim()) {
      toast.error("Nombre personal y empresa son obligatorios.");
      return;
    }
    if (notificationEmails.length === 0) {
      toast.error("Registra al menos un correo para recordatorios.");
      return;
    }
    onSaveProfile({
      personalName: personalName.trim(),
      companyName: companyName.trim(),
      notificationEmails,
    });
    toast.success("Información de facturación guardada.");
  };

  const saveCard = () => {
    if (!cardFormIsValid) return;
    onAddCard({
      id: `billing-card-${Date.now()}`,
      holderName: holderName.trim(),
      brand: getCardBrand(cardDigits),
      last4: cardDigits.slice(-4),
      expiryMonth: expiryMonth.padStart(2, "0"),
      expiryYear,
      authorizationCodeConfigured: true,
      isDefault: cards.length === 0,
    });
    setHolderName("");
    setCardNumber("");
    setAuthorizationCode("");
    setExpiryMonth("");
    setExpiryYear("");
    toast.success("Tarjeta mock registrada para cobro automático.");
  };

  const startActivation = (location: BillingLocation) => {
    setActivationLocationId(location.id);
    setActivationCardId(
      cards.find((card) => card.isDefault)?.id ?? cards[0]?.id ?? "",
    );
    setActivationStartDate(new Date().toISOString().slice(0, 10));
  };

  const activateLocation = () => {
    if (!activationLocationId || !activationCardId || !activationStartDate)
      return;
    onActivateLocation(
      activationLocationId,
      activationCardId,
      activationStartDate,
      addMonth(activationStartDate),
    );
    setActivationLocationId("");
    setActivationCardId("");
    setActivationStartDate("");
    toast.success("Ubicación activada con facturación mensual automática.");
  };

  const addLocation = () => {
    const name = newLocationName.trim();
    const costUsd = Number(newLocationCostUsd);
    if (!name || !Number.isFinite(costUsd) || costUsd <= 0) {
      toast.error("Captura el nombre y un costo mensual válido.");
      return;
    }
    if (
      locations.some(
        (location) =>
          location.name.toLocaleLowerCase("es-MX") ===
          name.toLocaleLowerCase("es-MX"),
      )
    ) {
      toast.error("Ya existe una sucursal con ese nombre.");
      return;
    }
    if (!onAddLocation(name, costUsd)) return;
    setNewLocationName("");
    setNewLocationCostUsd("69");
    setNewLocationOpen(false);
    toast.success(
      `¡Felicidades! Tu negocio está creciendo. ${name} ya forma parte de Keysar Cosmetics.`,
    );
  };

  const deactivateLocation = (location: BillingLocation) => {
    if (!onDeactivateLocation(location.id)) return;
    setActivationLocationId("");
    setDeactivationLocationId("");
    toast.info(
      `Nos da nostalgia despedirnos de ${location.name}. Su historia siempre permanecerá con la empresa.`,
    );
  };

  return (
    <div className="view-stack my-account-view">
      <div className="my-account-summary-row">
        <Card>
          <CardContent>
            <Building2 size={20} />
            <span>EMPRESA</span>
            <strong>{profile.companyName}</strong>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <MapPin size={20} />
            <span>UBICACIONES ACTIVAS</span>
            <strong>{activeLocations.length}</strong>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <DollarSign size={20} />
            <span>COSTO MENSUAL</span>
            <strong>{formatUsd(monthlyTotal)}</strong>
          </CardContent>
        </Card>
        <Card className={upcomingLocations.length > 0 ? "has-reminder" : ""}>
          <CardContent>
            <BellRing size={20} />
            <span>RECORDATORIOS</span>
            <strong>{upcomingLocations.length}</strong>
          </CardContent>
        </Card>
      </div>

      {upcomingLocations.length > 0 && (
        <Card className="billing-reminder-card">
          <CardContent>
            <BellRing size={23} />
            <div>
              <span className="section-kicker">PAGO PRÓXIMO</span>
              <h2>El periodo de facturación está por terminar</h2>
              <p>
                Se enviará un recordatorio a {profile.notificationEmails.join(", ")}.
              </p>
            </div>
            <div>
              {upcomingLocations.map((location) => (
                <Badge key={location.id} variant="outline">
                  {location.name} · {location.nextBillingDate}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="data-card account-profile-card">
        <CardContent>
          <div className="data-card-heading account-section-heading">
            <div>
              <span>DATOS GENERALES</span>
              <h2>Información personal y empresa</h2>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={onLock}>
              <LockKeyhole size={14} /> Bloquear módulo
            </Button>
          </div>
          <div className="account-profile-grid">
            <div className="field-stack">
              <Label htmlFor="account-personal-name">Nombre de la persona</Label>
              <div className="account-input-icon">
                <UserRound size={16} />
                <Input
                  id="account-personal-name"
                  value={personalName}
                  onChange={(event) => setPersonalName(event.target.value)}
                />
              </div>
            </div>
            <div className="field-stack">
              <Label htmlFor="account-company-name">Nombre de la empresa</Label>
              <div className="account-input-icon">
                <Building2 size={16} />
                <Input
                  id="account-company-name"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                />
              </div>
              <small>También actualiza el encabezado y los tickets futuros.</small>
            </div>
          </div>
          <div className="account-email-section">
            <div>
              <Label>Correos para notificaciones de pago</Label>
              <div className="account-email-entry">
                <div className="account-input-icon">
                  <Mail size={16} />
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(event) => setNewEmail(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") addEmail();
                    }}
                    placeholder="facturacion@empresa.com"
                  />
                </div>
                <Button type="button" variant="outline" onClick={addEmail}>
                  <Plus size={15} /> Añadir correo
                </Button>
              </div>
            </div>
            <div className="account-email-list">
              {notificationEmails.map((email) => (
                <span key={email}>
                  <Mail size={13} /> {email}
                  <button
                    type="button"
                    aria-label={`Quitar ${email}`}
                    onClick={() =>
                      setNotificationEmails((current) =>
                        current.filter((item) => item !== email),
                      )
                    }
                  >
                    <Trash2 size={13} />
                  </button>
                </span>
              ))}
            </div>
          </div>
          <Button type="button" onClick={saveProfile}>
            <Save size={15} /> Guardar información
          </Button>
        </CardContent>
      </Card>

      <Card className="data-card account-payment-card">
        <CardContent>
          <div className="data-card-heading account-section-heading">
            <div>
              <span>COBRO AUTOMÁTICO · MOCK</span>
              <h2>Métodos de pago</h2>
            </div>
            <Badge variant="outline">{cards.length} tarjetas</Badge>
          </div>
          <div className="billing-card-layout">
            <div className="billing-card-form">
              <div className="field-stack billing-card-wide">
                <Label htmlFor="billing-holder">Nombre en la tarjeta</Label>
                <Input
                  id="billing-holder"
                  value={holderName}
                  onChange={(event) => setHolderName(event.target.value)}
                  placeholder="Nombre completo"
                />
              </div>
              <div className="field-stack billing-card-wide">
                <Label htmlFor="billing-number">Número de tarjeta</Label>
                <Input
                  id="billing-number"
                  inputMode="numeric"
                  value={cardNumber}
                  onChange={(event) =>
                    setCardNumber(
                      event.target.value.replace(/\D/g, "").slice(0, 19),
                    )
                  }
                  placeholder="0000 0000 0000 0000"
                />
              </div>
              <div className="field-stack">
                <Label htmlFor="billing-month">Mes</Label>
                <Input
                  id="billing-month"
                  inputMode="numeric"
                  maxLength={2}
                  value={expiryMonth}
                  onChange={(event) =>
                    setExpiryMonth(event.target.value.replace(/\D/g, ""))
                  }
                  placeholder="MM"
                />
              </div>
              <div className="field-stack">
                <Label htmlFor="billing-year">Año</Label>
                <Input
                  id="billing-year"
                  inputMode="numeric"
                  maxLength={4}
                  value={expiryYear}
                  onChange={(event) =>
                    setExpiryYear(event.target.value.replace(/\D/g, ""))
                  }
                  placeholder="AAAA"
                />
              </div>
              <div className="field-stack billing-card-wide">
                <Label htmlFor="billing-authorization">
                  Código de autorización
                </Label>
                <Input
                  id="billing-authorization"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={authorizationCode}
                  onChange={(event) =>
                    setAuthorizationCode(
                      event.target.value.replace(/\D/g, ""),
                    )
                  }
                  placeholder="•••"
                />
              </div>
              <div className="billing-security-note billing-card-wide">
                <ShieldCheck size={15} />
                <span>
                  En este frontend de prueba sólo se conserva la terminación;
                  el número y código completos se descartan.
                </span>
              </div>
              <Button
                type="button"
                className="billing-card-wide"
                onClick={saveCard}
                disabled={!cardFormIsValid}
              >
                <CreditCard size={15} /> Registrar tarjeta
              </Button>
            </div>
            <div className="saved-billing-cards">
              {cards.map((card) => (
                <article key={card.id} className={card.isDefault ? "is-default" : ""}>
                  <header>
                    <CreditCard size={20} />
                    <strong>{card.brand}</strong>
                    {card.isDefault && <Badge>PRINCIPAL</Badge>}
                  </header>
                  <h3>•••• •••• •••• {card.last4}</h3>
                  <p>{card.holderName}</p>
                  <footer>
                    <span>VENCE {card.expiryMonth}/{card.expiryYear}</span>
                    <div>
                      {!card.isDefault && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Usar ${card.last4} como principal`}
                          onClick={() => onSetDefaultCard(card.id)}
                        >
                          <Star size={14} />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Eliminar tarjeta ${card.last4}`}
                        onClick={() => onRemoveCard(card.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </footer>
                </article>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="data-card billing-locations-card">
        <CardContent>
          <div className="data-card-heading account-section-heading">
            <div>
              <span>FACTURACIÓN POR UBICACIÓN</span>
              <h2>Ubicaciones y renovaciones</h2>
            </div>
            <div className="billing-location-heading-actions">
              <Badge variant="outline">Precios en USD</Badge>
              <Button
                type="button"
                onClick={() => setNewLocationOpen((current) => !current)}
              >
                <Plus size={15} /> Agregar sucursal
              </Button>
            </div>
          </div>
          {newLocationOpen && (
            <div className="billing-location-create">
              <div>
                <Building2 size={20} />
                <span>
                  <strong>¡Tu negocio está creciendo!</strong>
                  <small>
                    La nueva sucursal aparecerá en todos los módulos y listas
                    desplegables de esta sesión.
                  </small>
                </span>
              </div>
              <div className="field-stack">
                <Label htmlFor="billing-new-location-name">
                  Nombre de la sucursal
                </Label>
                <Input
                  id="billing-new-location-name"
                  value={newLocationName}
                  onChange={(event) => setNewLocationName(event.target.value)}
                  placeholder="Ej. Santa Fe"
                />
              </div>
              <div className="field-stack">
                <Label htmlFor="billing-new-location-cost">
                  Costo mensual USD
                </Label>
                <Input
                  id="billing-new-location-cost"
                  type="number"
                  min="1"
                  step="0.01"
                  value={newLocationCostUsd}
                  onChange={(event) =>
                    setNewLocationCostUsd(event.target.value)
                  }
                />
              </div>
              <div>
                <Button type="button" onClick={addLocation}>
                  <Plus size={15} /> Crear sucursal
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setNewLocationOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
          <div className="billing-location-grid">
            {locations.map((location) => {
              const remaining = daysUntil(location.nextBillingDate);
              const paymentCard = cards.find(
                (card) => card.id === location.paymentCardId,
              );
              const isActivating = activationLocationId === location.id;
              const isDeactivating = deactivationLocationId === location.id;
              return (
                <article
                  key={location.id}
                  className={
                    location.status === "ACTIVE"
                      ? "is-active"
                      : location.status === "INACTIVE"
                        ? "is-inactive"
                        : "is-pending"
                  }
                >
                  <header>
                    <span><MapPin size={18} /></span>
                    <div>
                      <h3>{location.name}</h3>
                      <Badge variant={location.status === "ACTIVE" ? "default" : "outline"}>
                        {location.status === "ACTIVE"
                          ? "ACTIVA"
                          : location.status === "INACTIVE"
                            ? "INACTIVA"
                            : "PENDIENTE"}
                      </Badge>
                    </div>
                    <strong>{formatUsd(location.costUsd)}<small>/mes</small></strong>
                  </header>
                  {location.status === "ACTIVE" ? (
                    <div className="billing-location-details">
                      <span><CalendarClock size={14} /> Inicio: {location.billingStartDate}</span>
                      <span><CreditCard size={14} /> {paymentCard ? `${paymentCard.brand} •••• ${paymentCard.last4}` : "Sin tarjeta"}</span>
                      <span className={remaining !== null && remaining <= 7 ? "is-reminder" : ""}>
                        <BellRing size={14} /> Próximo cobro: {location.nextBillingDate}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDeactivationLocationId(location.id)}
                      >
                        <Power size={14} /> Inactivar sucursal
                      </Button>
                    </div>
                  ) : isActivating ? (
                    <div className="billing-location-activation">
                      <div className="field-stack">
                        <Label>Inicio de facturación</Label>
                        <DatePicker
                          value={activationStartDate}
                          onChange={setActivationStartDate}
                          placeholder="Selecciona fecha"
                        />
                      </div>
                      <div className="field-stack">
                        <Label>Método de pago</Label>
                        <Select value={activationCardId} onValueChange={setActivationCardId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona tarjeta" />
                          </SelectTrigger>
                          <SelectContent>
                            {cards.map((card) => (
                              <SelectItem key={card.id} value={card.id}>
                                {card.brand} •••• {card.last4}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Button type="button" onClick={activateLocation} disabled={!activationCardId || !activationStartDate}>
                          <CheckCircle2 size={15} /> Confirmar activación
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setActivationLocationId("")}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="billing-location-pending">
                      {location.status === "INACTIVE" ? (
                        <HeartCrack size={16} />
                      ) : (
                        <AlertTriangle size={16} />
                      )}
                      <p>
                        {location.status === "INACTIVE"
                          ? "Esta sucursal ya no aparece en la operación actual. Su historia permanece intacta."
                          : "El pago inicial aún no se ha configurado."}
                      </p>
                      <Button type="button" onClick={() => startActivation(location)} disabled={cards.length === 0}>
                        <Power size={15} /> {location.status === "INACTIVE" ? "Reactivar sucursal" : "Activar ubicación"}
                      </Button>
                      {location.status !== "INACTIVE" && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            setDeactivationLocationId(location.id)
                          }
                        >
                          Inactivar
                        </Button>
                      )}
                    </div>
                  )}
                  {isDeactivating && location.status !== "INACTIVE" && (
                    <div className="billing-location-deactivation">
                      <HeartCrack size={23} />
                      <span>
                        <strong>Nos da nostalgia despedirnos de {location.name}.</strong>
                        <small>
                          Sus tickets, clientes, citas y movimientos históricos
                          permanecerán. Sólo dejará de aparecer en la operación
                          y en nuevas capturas.
                        </small>
                      </span>
                      <div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setDeactivationLocationId("")}
                        >
                          Conservar sucursal
                        </Button>
                        <Button
                          type="button"
                          onClick={() => deactivateLocation(location)}
                        >
                          Confirmar inactivación
                        </Button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="data-card billing-history-card">
        <CardContent className="p-0">
          <div className="data-card-heading account-section-heading">
            <div>
              <span>HISTORIAL DE FACTURACIÓN</span>
              <h2>Facturas y pagos</h2>
            </div>
            <ReceiptText size={20} />
          </div>
          <div className="table-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>FACTURA</TableHead>
                  <TableHead>UBICACIÓN</TableHead>
                  <TableHead>PERIODO</TableHead>
                  <TableHead>FECHA FACTURA</TableHead>
                  <TableHead>FECHA PAGO</TableHead>
                  <TableHead>MÉTODO</TableHead>
                  <TableHead>MONTO USD</TableHead>
                  <TableHead>ESTADO</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingPagination.paginatedItems.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell><strong>{entry.invoiceNumber}</strong></TableCell>
                    <TableCell>{entry.locationName}</TableCell>
                    <TableCell>{entry.period}</TableCell>
                    <TableCell>{entry.billedAt}</TableCell>
                    <TableCell>{entry.paidAt ?? "Pendiente"}</TableCell>
                    <TableCell>{entry.cardLast4 ? `•••• ${entry.cardLast4}` : "Sin método"}</TableCell>
                    <TableCell><strong>{formatUsd(entry.totalUsd)}</strong></TableCell>
                    <TableCell>
                      <Badge variant={entry.status === "PAID" ? "default" : "outline"}>
                        {entry.status === "PAID" ? "PAGADA" : entry.status === "PENDING" ? "PENDIENTE" : "FALLIDA"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <HistoryPagination
            total={history.length}
            page={billingPagination.page}
            pageSize={billingPagination.pageSize}
            pageCount={billingPagination.pageCount}
            onPageChange={billingPagination.setPage}
            onPageSizeChange={billingPagination.setPageSize}
          />
        </CardContent>
      </Card>
    </div>
  );
}
