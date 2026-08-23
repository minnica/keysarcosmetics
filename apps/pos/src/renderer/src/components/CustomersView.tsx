import { useMemo, useState } from "react";
import {
  Building2,
  Cake,
  KeyRound,
  LogOut,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Button, Card, CardContent, Input } from "@cosmetics/ui";
import type { Client, Seller } from "../types";

type AccessMode = "phone" | "seller";

interface CustomersViewProps {
  clients: Client[];
  sellers: Seller[];
}

const normalizePhone = (value: string) => value.replace(/\D/g, "");
const sourceLabels: Record<Client["source"], string> = {
  APPROACH: "Abordaje",
  LEAD: "Lead",
  REFERRAL: "Recomendado",
  SOCIAL: "Redes sociales",
};

export function CustomersView({ clients, sellers }: CustomersViewProps) {
  const [accessMode, setAccessMode] = useState<AccessMode>("phone");
  const [phoneSearch, setPhoneSearch] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [authorizedSellerId, setAuthorizedSellerId] = useState("");
  const [accessError, setAccessError] = useState("");

  const activeSellers = useMemo(
    () => sellers.filter((seller) => seller.active),
    [sellers],
  );
  const authorizedSeller = activeSellers.find(
    (seller) => seller.id === authorizedSellerId,
  );
  const normalizedSearch = normalizePhone(phoneSearch);
  const phoneResults = useMemo(() => {
    if (normalizedSearch.length < 4) return [];
    return clients.filter((client) =>
      normalizePhone(client.phone).includes(normalizedSearch),
    );
  }, [clients, normalizedSearch]);
  const sellerResults = useMemo(() => {
    if (!authorizedSellerId) return [];
    return clients.filter((client) =>
      client.saleSellerIds.includes(authorizedSellerId),
    );
  }, [authorizedSellerId, clients]);
  const visibleClients = accessMode === "phone" ? phoneResults : sellerResults;

  const getClientOwner = (client: Client) => {
    if (client.companyLocked) return client.companyName;
    const owner = client.ownerId
      ? sellers.find((seller) => seller.id === client.ownerId)
      : null;
    return owner?.active ? owner.name : "Keysar Cosmetics";
  };

  const authorizeSeller = () => {
    const seller = activeSellers.find(
      (candidate) => candidate.accessCode === accessCode.trim(),
    );
    if (!seller) {
      setAuthorizedSellerId("");
      setAccessError("Clave inválida o vendedor inactivo.");
      return;
    }
    setAuthorizedSellerId(seller.id);
    setAccessError("");
    setAccessCode("");
  };

  const changeAccessMode = (mode: AccessMode) => {
    setAccessMode(mode);
    setPhoneSearch("");
    setAccessCode("");
    setAuthorizedSellerId("");
    setAccessError("");
  };

  const emptyMessage =
    accessMode === "phone"
      ? normalizedSearch.length < 4
        ? "Escribe al menos 4 dígitos del teléfono para consultar un registro."
        : "No se encontró ningún cliente con ese teléfono."
      : authorizedSeller
        ? "Este vendedor todavía no participa en ventas con clientes registrados."
        : "Ingresa la clave personal del vendedor para consultar sus registros.";

  return (
    <div className="view-stack">
      <Card className="customer-access-card">
        <CardContent>
          <div className="customer-access-heading">
            <div>
              <span className="section-kicker">ACCESO RESTRINGIDO</span>
              <h2>Consulta de clientes</h2>
              <p>
                No se muestra el directorio completo. Consulta por teléfono o
                entra con la clave personal del vendedor.
              </p>
            </div>
            <ShieldCheck size={28} />
          </div>

          <div className="segmented-control customer-access-tabs">
            <button
              type="button"
              className={accessMode === "phone" ? "is-active" : ""}
              onClick={() => changeAccessMode("phone")}
            >
              <Phone size={16} /> Buscar por teléfono
            </button>
            <button
              type="button"
              className={accessMode === "seller" ? "is-active" : ""}
              onClick={() => changeAccessMode("seller")}
            >
              <KeyRound size={16} /> Acceso de vendedor
            </button>
          </div>

          {accessMode === "phone" ? (
            <div className="customer-access-controls">
              <div className="search-input-wrap">
                <Search size={17} />
                <Input
                  type="tel"
                  inputMode="numeric"
                  value={phoneSearch}
                  onChange={(event) => setPhoneSearch(event.target.value)}
                  placeholder="Número telefónico"
                  aria-label="Buscar cliente por número telefónico"
                />
              </div>
              <span className="customer-access-note">
                La búsqueda por nombre está deshabilitada en esta pantalla.
              </span>
            </div>
          ) : authorizedSeller ? (
            <div className="customer-access-session">
              <div>
                <span className="seller-avatar">
                  {authorizedSeller.initials}
                </span>
                <span>
                  <strong>{authorizedSeller.name}</strong>
                  <small>
                    Sólo puede ver clientes donde participa en la venta.
                  </small>
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAuthorizedSellerId("")}
              >
                <LogOut size={15} /> Cerrar acceso
              </Button>
            </div>
          ) : (
            <div className="customer-access-controls">
              <div className="customer-access-code-row">
                <div className="search-input-wrap">
                  <KeyRound size={17} />
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={accessCode}
                    onChange={(event) => setAccessCode(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") authorizeSeller();
                    }}
                    placeholder="Clave de 4 dígitos"
                    aria-label="Clave de acceso del vendedor"
                  />
                </div>
                <Button
                  type="button"
                  onClick={authorizeSeller}
                  disabled={accessCode.trim().length !== 4}
                >
                  Consultar
                </Button>
              </div>
              {accessError ? (
                <span className="customer-access-error" role="alert">
                  {accessError}
                </span>
              ) : (
                <span className="customer-access-note">
                  Claves mock: Ana 1101 · Sofía 2202 · Daniela 3303.
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {visibleClients.length > 0 ? (
        <>
          <div className="customer-results-heading">
            <div>
              <span className="section-kicker">RESULTADOS AUTORIZADOS</span>
              <h2>
                {accessMode === "seller" && authorizedSeller
                  ? `Clientes de ${authorizedSeller.name}`
                  : "Coincidencias por teléfono"}
              </h2>
            </div>
            <strong>{visibleClients.length}</strong>
          </div>
          <div className="customer-grid">
            {visibleClients.map((client) => (
              <Card key={client.id} className="customer-card">
                <CardContent>
                  <div className="customer-card-head">
                    <span className="customer-avatar">
                      {client.firstName.charAt(0)}
                      {client.lastName.charAt(0)}
                    </span>
                    <div>
                      <h3>
                        {client.firstName} {client.lastName}
                      </h3>
                      <span>{client.gender || "Sin género capturado"}</span>
                    </div>
                  </div>
                  <div className="customer-details">
                    <span>
                      <Phone size={15} /> {client.phone || "Sin teléfono"}
                    </span>
                    <span>
                      <MessageCircle size={15} />{" "}
                      {client.whatsapp || "Sin WhatsApp"}
                    </span>
                    <span>
                      <Cake size={15} /> {client.birthday || "Sin cumpleaños"}
                    </span>
                    <span>
                      <Building2 size={15} /> Procedencia:{" "}
                      {sourceLabels[client.source]}
                    </span>
                  </div>
                  <div className="customer-owner">
                    {getClientOwner(client) === "Keysar Cosmetics" ||
                    client.companyLocked ? (
                      <Building2 size={16} />
                    ) : (
                      <UserRound size={16} />
                    )}
                    <span>
                      <small>PERTENECE A</small>
                      <strong>{getClientOwner(client)}</strong>
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <div className="customer-locked-empty">
          {accessMode === "phone" ? (
            <Phone size={28} />
          ) : (
            <KeyRound size={28} />
          )}
          <h3>Directorio protegido</h3>
          <p>{emptyMessage}</p>
        </div>
      )}
    </div>
  );
}
