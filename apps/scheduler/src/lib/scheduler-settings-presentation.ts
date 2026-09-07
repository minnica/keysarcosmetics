import type {
  SchedulerResolvedSettingDto,
  SchedulerSettingScope,
  SchedulerSettingSection,
} from "@cosmetics/types";

export type SchedulerSettingFieldKind =
  | "boolean"
  | "color"
  | "email-list"
  | "integer"
  | "object-list"
  | "select"
  | "text"
  | "textarea"
  | "url";

export interface SchedulerSettingFieldDefinition {
  path: string;
  label: string;
  description: string;
  kind: SchedulerSettingFieldKind;
  group: string;
  placeholder?: string;
  min?: number;
  max?: number;
  options?: Array<{ value: string; label: string }>;
  itemLabel?: string;
  itemValueKey?: string;
}

export interface SchedulerSettingSectionDefinition {
  title: string;
  eyebrow: string;
  description: string;
  consumer: string;
  fields: SchedulerSettingFieldDefinition[];
  defaults: Record<string, unknown>;
}

const toggle = (
  path: string,
  label: string,
  description: string,
  group: string,
): SchedulerSettingFieldDefinition => ({
  path,
  label,
  description,
  group,
  kind: "boolean",
});

export const schedulerSettingDefinitions: Record<
  SchedulerSettingSection,
  SchedulerSettingSectionDefinition
> = {
  company: {
    title: "Empresa",
    eyebrow: "Información básica",
    description:
      "Mantén la identidad pública que usarán las superficies de reservación cuando exista un consumidor conectado.",
    consumer:
      "Documento versionado sin consumidor operativo conectado. Comercio, sucursales y contacto canónicos se administran en Administración.",
    defaults: { companyName: "", description: "", logoUrl: "", address: "" },
    fields: [
      {
        path: "companyName",
        label: "Nombre público",
        description: "Nombre comercial mostrado a clientes.",
        kind: "text",
        group: "Identidad",
      },
      {
        path: "description",
        label: "Descripción",
        description: "Texto breve para explicar la propuesta de la empresa.",
        kind: "textarea",
        group: "Identidad",
      },
      {
        path: "logoUrl",
        label: "URL del logotipo",
        description:
          "Referencia pública; este formulario no carga archivos privados.",
        kind: "url",
        group: "Identidad",
        placeholder: "https://…",
      },
      {
        path: "address",
        label: "Dirección pública",
        description:
          "Texto informativo; no reemplaza el catálogo canónico de sucursales.",
        kind: "textarea",
        group: "Contacto",
      },
    ],
  },
  website: {
    title: "Sitio web",
    eyebrow: "Reservas online",
    description:
      "Configura la presentación y los enlaces previstos para el sitio público de reservas.",
    consumer:
      "Preferencias versionadas sin sitio público conectado en este repositorio.",
    defaults: {
      bookingSlug: "",
      siteColor: "#263941",
      modifyColor: "#c3a583",
      cancelColor: "#b45353",
      linkProSlug: "",
      linkProGreeting: "",
      instagram: "",
      facebook: "",
      website: "",
      tiktok: "",
      youtube: "",
      whatsapp: "",
    },
    fields: [
      {
        path: "bookingSlug",
        label: "Dirección de reservaciones",
        description: "Identificador legible del futuro sitio público.",
        kind: "text",
        group: "Dirección",
      },
      {
        path: "siteColor",
        label: "Color principal",
        description: "Color base de la experiencia pública.",
        kind: "color",
        group: "Apariencia",
      },
      {
        path: "modifyColor",
        label: "Color para modificar",
        description: "Tratamiento previsto para acciones de edición.",
        kind: "color",
        group: "Apariencia",
      },
      {
        path: "cancelColor",
        label: "Color para cancelar",
        description: "Tratamiento previsto para acciones destructivas.",
        kind: "color",
        group: "Apariencia",
      },
      {
        path: "linkProSlug",
        label: "Identificador LinkPro",
        description: "Ruta prevista para la tarjeta social.",
        kind: "text",
        group: "LinkPro",
      },
      {
        path: "linkProGreeting",
        label: "Saludo",
        description: "Mensaje principal de la tarjeta social.",
        kind: "text",
        group: "LinkPro",
      },
      {
        path: "instagram",
        label: "Instagram",
        description: "Enlace al perfil oficial.",
        kind: "url",
        group: "Redes",
      },
      {
        path: "facebook",
        label: "Facebook",
        description: "Enlace al perfil oficial.",
        kind: "url",
        group: "Redes",
      },
      {
        path: "website",
        label: "Sitio principal",
        description: "Enlace al sitio institucional.",
        kind: "url",
        group: "Redes",
      },
      {
        path: "tiktok",
        label: "TikTok",
        description: "Enlace al perfil oficial.",
        kind: "url",
        group: "Redes",
      },
      {
        path: "youtube",
        label: "YouTube",
        description: "Enlace al canal oficial.",
        kind: "url",
        group: "Redes",
      },
      {
        path: "whatsapp",
        label: "WhatsApp",
        description: "Número público con código de país.",
        kind: "text",
        group: "Redes",
      },
    ],
  },
  agenda: {
    title: "Agenda",
    eyebrow: "Comportamiento de reservas",
    description:
      "Define preferencias previstas para la captura y validación de reservaciones.",
    consumer:
      "Documento versionado sin conexión al motor de disponibilidad. Horarios, capacidad, bloqueos y excepciones canónicos prevalecen.",
    defaults: {
      allowOverlapping: false,
      allowClientSimultaneous: false,
      allowResourceOverload: false,
      requireContact: true,
      requireMedicalRecord: false,
      limitClientBookings: false,
      limitQuantity: 2,
      limitPeriod: 3,
      limitUnit: "months",
      allowBlockedTimeBookings: false,
      allowExtendedHours: false,
      additionalFields: {
        email: { enabled: true, required: false },
        phone: { enabled: true, required: true },
        birthDate: { enabled: false, required: false },
      },
    },
    fields: [
      toggle(
        "allowOverlapping",
        "Permitir reservas superpuestas",
        "No autoriza disponibilidad por sí sola.",
        "Reglas",
      ),
      toggle(
        "allowClientSimultaneous",
        "Permitir citas simultáneas por cliente",
        "Preferencia prevista para validación del cliente.",
        "Reglas",
      ),
      toggle(
        "allowResourceOverload",
        "Permitir sobrecarga de recursos",
        "El backend sigue validando capacidad y recursos.",
        "Reglas",
      ),
      toggle(
        "requireContact",
        "Solicitar datos de contacto",
        "Marca la intención de captura de teléfono o correo.",
        "Captura",
      ),
      toggle(
        "requireMedicalRecord",
        "Solicitar ficha médica",
        "Marca la intención de captura clínica.",
        "Captura",
      ),
      toggle(
        "limitClientBookings",
        "Limitar reservas por cliente",
        "Activa los valores de cantidad y periodo del documento.",
        "Límites",
      ),
      {
        path: "limitQuantity",
        label: "Cantidad máxima",
        description: "Número previsto de citas dentro del periodo.",
        kind: "integer",
        min: 1,
        max: 100,
        group: "Límites",
      },
      {
        path: "limitPeriod",
        label: "Duración del periodo",
        description: "Cantidad de semanas o meses.",
        kind: "integer",
        min: 1,
        max: 24,
        group: "Límites",
      },
      {
        path: "limitUnit",
        label: "Unidad",
        description: "Unidad del periodo configurado.",
        kind: "select",
        group: "Límites",
        options: [
          { value: "weeks", label: "Semanas" },
          { value: "months", label: "Meses" },
        ],
      },
      toggle(
        "allowBlockedTimeBookings",
        "Permitir reservar en bloqueos",
        "Las excepciones reales continúan requiriendo autorización.",
        "Excepciones",
      ),
      toggle(
        "allowExtendedHours",
        "Permitir horarios extendidos",
        "No amplía los horarios canónicos hasta conectar un consumidor.",
        "Excepciones",
      ),
      toggle(
        "additionalFields.email.enabled",
        "Pedir e-mail",
        "Muestra la preferencia del campo de contacto.",
        "Campos adicionales",
      ),
      toggle(
        "additionalFields.email.required",
        "E-mail obligatorio",
        "Requiere que el campo esté habilitado.",
        "Campos adicionales",
      ),
      toggle(
        "additionalFields.phone.enabled",
        "Pedir teléfono",
        "Muestra la preferencia del campo de contacto.",
        "Campos adicionales",
      ),
      toggle(
        "additionalFields.phone.required",
        "Teléfono obligatorio",
        "Requiere que el campo esté habilitado.",
        "Campos adicionales",
      ),
      toggle(
        "additionalFields.birthDate.enabled",
        "Pedir fecha de nacimiento",
        "Muestra la preferencia en captura.",
        "Campos adicionales",
      ),
    ],
  },
  payments: {
    title: "Pagos Keysar",
    eyebrow: "Cobro online",
    description:
      "Mantén referencias públicas de cobro sin almacenar credenciales de proveedores.",
    consumer:
      "Documento versionado sin consumidor de cobro. POS conserva métodos, políticas, tickets y pagos; secretos viven en infraestructura.",
    defaults: {
      bankName: "",
      bankInstitution: "",
      bankClabe: "",
      onlinePayments: false,
      paymentLink: "",
      allowOnlineStatusEdit: false,
    },
    fields: [
      {
        path: "bankName",
        label: "Titular",
        description: "Nombre público del titular de la cuenta.",
        kind: "text",
        group: "Datos bancarios",
      },
      {
        path: "bankInstitution",
        label: "Institución bancaria",
        description: "Banco mostrado al cliente.",
        kind: "text",
        group: "Datos bancarios",
      },
      {
        path: "bankClabe",
        label: "CLABE",
        description: "Referencia pública de 18 dígitos; no es una credencial.",
        kind: "text",
        group: "Datos bancarios",
      },
      toggle(
        "onlinePayments",
        "Mostrar opción de pago online",
        "No activa un proveedor ni procesa cobros.",
        "Pago online",
      ),
      {
        path: "paymentLink",
        label: "Enlace de cobro",
        description: "URL pública administrada por el proveedor autorizado.",
        kind: "url",
        group: "Pago online",
      },
      toggle(
        "allowOnlineStatusEdit",
        "Permitir cambios posteriores",
        "Preferencia prevista para el sitio de reservas.",
        "Pago online",
      ),
    ],
  },
  reminders: {
    title: "Recordatorios",
    eyebrow: "Mensajes a clientes",
    description:
      "Define preferencias de comunicación para los eventos de una cita.",
    consumer:
      "Preferencias sin consumidor conectado. El outbox, plantillas, consentimiento y proveedor real se administran en Comunicaciones.",
    defaults: {
      emailBookingChanges: false,
      emailReminder: false,
      whatsappBookingCreated: false,
      whatsappReminder: false,
    },
    fields: [
      toggle(
        "emailBookingChanges",
        "Cambios de cita por e-mail",
        "Creación, edición o cancelación.",
        "E-mail",
      ),
      toggle(
        "emailReminder",
        "Recordatorio por e-mail",
        "Preferencia previa al envío programado.",
        "E-mail",
      ),
      toggle(
        "whatsappBookingCreated",
        "Confirmación por WhatsApp",
        "Preferencia posterior a crear una cita.",
        "WhatsApp",
      ),
      toggle(
        "whatsappReminder",
        "Recordatorio por WhatsApp",
        "Preferencia previa al envío programado.",
        "WhatsApp",
      ),
    ],
  },
  records: {
    title: "Fichas médicas",
    eyebrow: "Expediente clínico",
    description:
      "Organiza categorías de captura sin incluir respuestas clínicas de clientes.",
    consumer:
      "Definición almacenada sin consumidor conectado. Expedientes y documentos reales siguen cifrados y bajo autorización secundaria.",
    defaults: { categories: [] },
    fields: [
      {
        path: "categories",
        label: "Categorías de ficha",
        description:
          "Cada categoría conserva sus campos desconocidos al cambiar el nombre.",
        kind: "object-list",
        group: "Estructura",
        itemLabel: "Categoría",
        itemValueKey: "name",
      },
    ],
  },
  emails: {
    title: "E-mails",
    eyebrow: "Identidad de correo",
    description:
      "Configura remitentes públicos, firma y contenido de cumpleaños.",
    consumer: "Documento versionado sin conexión al proveedor de mensajería.",
    defaults: {
      senders: [],
      signature: "",
      birthdayEnabled: false,
      birthdaySubject: "",
      birthdayBody: "",
      birthdayLink: "",
    },
    fields: [
      {
        path: "senders",
        label: "Remitentes",
        description:
          "Direcciones públicas; no incluye contraseñas ni tokens SMTP.",
        kind: "email-list",
        group: "Remitentes",
        itemLabel: "Correo",
        itemValueKey: "email",
      },
      {
        path: "signature",
        label: "Firma",
        description: "Cierre previsto para mensajes enviados.",
        kind: "textarea",
        group: "Contenido",
      },
      toggle(
        "birthdayEnabled",
        "Mensaje de cumpleaños",
        "Activa la preferencia del contenido de cumpleaños.",
        "Cumpleaños",
      ),
      {
        path: "birthdaySubject",
        label: "Asunto",
        description: "Asunto del mensaje de cumpleaños.",
        kind: "text",
        group: "Cumpleaños",
      },
      {
        path: "birthdayBody",
        label: "Mensaje",
        description: "Cuerpo del mensaje de cumpleaños.",
        kind: "textarea",
        group: "Cumpleaños",
      },
      {
        path: "birthdayLink",
        label: "Enlace",
        description: "Destino público incluido en el mensaje.",
        kind: "url",
        group: "Cumpleaños",
      },
    ],
  },
  integrations: {
    title: "Integraciones",
    eyebrow: "Infraestructura",
    description:
      "Consulta los límites de configuración de conectores externos.",
    consumer:
      "No admite campos documentales: proveedor, credenciales, API keys y webhook secrets se configuran únicamente en infraestructura.",
    defaults: {},
    fields: [],
  },
  notifications: {
    title: "Notificaciones",
    eyebrow: "Avisos al equipo",
    description:
      "Define qué eventos deberían generar avisos internos para el equipo.",
    consumer:
      "Preferencias versionadas sin centro de notificaciones conectado.",
    defaults: {
      bookingCreated: false,
      bookingChanged: false,
      bookingCanceled: false,
      deliveryFailed: true,
    },
    fields: [
      toggle(
        "bookingCreated",
        "Nueva cita",
        "Aviso previsto cuando se registra una cita.",
        "Agenda",
      ),
      toggle(
        "bookingChanged",
        "Cita modificada",
        "Aviso previsto cuando cambia fecha, servicio o responsable.",
        "Agenda",
      ),
      toggle(
        "bookingCanceled",
        "Cita cancelada",
        "Aviso previsto ante una cancelación.",
        "Agenda",
      ),
      toggle(
        "deliveryFailed",
        "Fallo de entrega",
        "Aviso previsto cuando el outbox agota reintentos.",
        "Comunicaciones",
      ),
    ],
  },
  clients: {
    title: "Clientes",
    eyebrow: "Captura de datos",
    description:
      "Configura reglas previstas de duplicados, numeración y categorías de campos.",
    consumer:
      "Documento sin consumidor conectado. La identidad compartida, teléfono normalizado y definiciones canónicas siguen en Clientes.",
    defaults: {
      automaticClientNumber: false,
      validateDuplicateEmail: true,
      validateDuplicatePhone: true,
      categories: [],
      filters: [],
    },
    fields: [
      toggle(
        "automaticClientNumber",
        "Número automático",
        "Preferencia para asignar un folio visible.",
        "Validación",
      ),
      toggle(
        "validateDuplicateEmail",
        "Validar e-mail duplicado",
        "Preferencia previa a crear o editar.",
        "Validación",
      ),
      toggle(
        "validateDuplicatePhone",
        "Validar teléfono duplicado",
        "Preferencia previa a crear o editar.",
        "Validación",
      ),
      {
        path: "categories",
        label: "Categorías de campos",
        description:
          "Agrupaciones de captura; conserva propiedades no editadas.",
        kind: "object-list",
        group: "Campos personalizados",
        itemLabel: "Categoría",
        itemValueKey: "name",
      },
      {
        path: "filters",
        label: "Filtros guardados",
        description: "Nombres de filtros disponibles para el equipo.",
        kind: "object-list",
        group: "Filtros",
        itemLabel: "Filtro",
        itemValueKey: "name",
      },
    ],
  },
  surveys: {
    title: "Encuestas",
    eyebrow: "Seguimiento",
    description: "Define la preferencia de envío posterior a una cita.",
    consumer:
      "Preferencia sin consumidor conectado. Definiciones, tokens y respuestas inmutables se administran en Encuestas.",
    defaults: { enabled: false, sendDelayHours: 0 },
    fields: [
      toggle(
        "enabled",
        "Enviar encuesta",
        "Preferencia general posterior a una atención.",
        "Envío",
      ),
      {
        path: "sendDelayHours",
        label: "Espera en horas",
        description: "Retraso previsto antes de encolar la encuesta.",
        kind: "integer",
        min: 0,
        max: 720,
        group: "Envío",
      },
    ],
  },
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function mergeSchedulerSettingDocuments(
  ...documents: Array<Record<string, unknown> | undefined>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const document of documents) {
    if (!document) continue;
    for (const [key, value] of Object.entries(document)) {
      result[key] =
        isObject(result[key]) && isObject(value)
          ? mergeSchedulerSettingDocuments(
              result[key] as Record<string, unknown>,
              value,
            )
          : value;
    }
  }
  return result;
}

const scopeIndex: Record<SchedulerSettingScope, number> = {
  COMMERCE: 0,
  BRANCH: 1,
  USER: 2,
};

export function resolveSchedulerSettingDocumentForScope(
  resolved: SchedulerResolvedSettingDto,
  scope: SchedulerSettingScope,
  defaults: Record<string, unknown>,
) {
  const documents = resolved.layers
    .filter((layer) => scopeIndex[layer.scope] <= scopeIndex[scope])
    .sort((left, right) => scopeIndex[left.scope] - scopeIndex[right.scope])
    .map((layer) => layer.document);
  return mergeSchedulerSettingDocuments(defaults, ...documents);
}

export function getSchedulerSettingValue(
  document: Record<string, unknown>,
  path: string,
): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    return isObject(current) ? current[key] : undefined;
  }, document);
}

export function setSchedulerSettingValue(
  document: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const keys = path.split(".");
  const result = { ...document };
  let cursor = result;
  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      cursor[key] = value;
      return;
    }
    const next = isObject(cursor[key]) ? { ...cursor[key] } : {};
    cursor[key] = next;
    cursor = next;
  });
  return result;
}

function sameValue(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function buildSchedulerSettingLayerDocument(input: {
  currentLayer: Record<string, unknown>;
  initialEffective: Record<string, unknown>;
  editedEffective: Record<string, unknown>;
  fieldPaths: string[];
}) {
  let next = structuredClone(input.currentLayer);
  for (const path of input.fieldPaths) {
    const before = getSchedulerSettingValue(input.initialEffective, path);
    const after = getSchedulerSettingValue(input.editedEffective, path);
    if (!sameValue(before, after)) {
      next = setSchedulerSettingValue(next, path, after);
    }
  }
  return next;
}

export function validateSchedulerSettingDocument(
  definition: SchedulerSettingSectionDefinition,
  document: Record<string, unknown>,
) {
  for (const field of definition.fields) {
    const value = getSchedulerSettingValue(document, field.path);
    if (field.kind === "integer") {
      if (!Number.isInteger(value))
        return `${field.label} debe ser un número entero.`;
      if (field.min !== undefined && Number(value) < field.min)
        return `${field.label} debe ser mayor o igual a ${field.min}.`;
      if (field.max !== undefined && Number(value) > field.max)
        return `${field.label} debe ser menor o igual a ${field.max}.`;
    }
    if (field.kind === "url" && value) {
      try {
        const url = new URL(String(value));
        if (url.protocol !== "https:" && url.protocol !== "http:")
          throw new Error();
      } catch {
        return `${field.label} debe ser una URL http o https válida.`;
      }
    }
    if (field.kind === "email-list" && Array.isArray(value)) {
      const invalid = value.some((item) => {
        const email = isObject(item)
          ? String(item[field.itemValueKey ?? "email"] ?? "")
          : "";
        return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      });
      if (invalid) return `${field.label} contiene un correo inválido.`;
    }
  }
  const bankClabe = getSchedulerSettingValue(document, "bankClabe");
  if (bankClabe && !/^\d{18}$/.test(String(bankClabe)))
    return "La CLABE debe contener exactamente 18 dígitos.";
  return null;
}
