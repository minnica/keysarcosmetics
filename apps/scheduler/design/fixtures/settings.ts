type SchedulerSettingSection =
  | "company"
  | "website"
  | "agenda"
  | "payments"
  | "reminders"
  | "records"
  | "emails"
  | "integrations"
  | "notifications"
  | "clients"
  | "surveys";

export const schedulerSettingsRv5Documents: Record<
  SchedulerSettingSection,
  Record<string, unknown>
> = {
  company: {
    companyName: "Keysar Cosmetics",
    description: "Cuidado facial con atención personalizada.",
    address: "Polanco, Ciudad de México",
  },
  website: {
    bookingSlug: "keysar-cosmetics",
    siteColor: "#263941",
    modifyColor: "#c3a583",
    cancelColor: "#b45353",
  },
  agenda: {
    requireContact: true,
    requireMedicalRecord: false,
    limitClientBookings: true,
    limitQuantity: 2,
    limitPeriod: 3,
    limitUnit: "months",
  },
  payments: {
    onlinePayments: false,
    paymentLink: "https://pagos.example.test/keysar",
  },
  reminders: {
    emailBookingChanges: true,
    emailReminder: true,
    whatsappBookingCreated: false,
    whatsappReminder: false,
  },
  records: {
    categories: [
      { id: "clinical", name: "Ficha clínica", fields: [] },
      { id: "follow-up", name: "Seguimiento", fields: [] },
    ],
  },
  emails: {
    senders: [
      { id: "sender-rv5", email: "agenda@keysar.example", confirmed: true },
    ],
    signature: "Equipo Keysar Cosmetics",
  },
  integrations: {},
  notifications: {
    bookingCreated: true,
    bookingChanged: true,
    bookingCanceled: true,
    deliveryFailed: true,
  },
  clients: {
    automaticClientNumber: true,
    validateDuplicateEmail: true,
    validateDuplicatePhone: true,
    categories: [{ id: "preferences", name: "Preferencias", fields: [] }],
    filters: [{ id: "source", name: "Procedencia" }],
  },
  surveys: {
    enabled: true,
    sendDelayHours: 24,
  },
};
