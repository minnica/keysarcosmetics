export const whatsappPhoneNumber = "525580561135";

export const privacyContact = {
  name: "Liron Keysar",
  address: "Shakespeare 21, colonia Anzures, alcaldía Miguel Hidalgo, C.P. 11590, Ciudad de México, México",
  phone: "55 2745 8767",
  phoneHref: "tel:+525527458767",
} as const;

export const defaultWhatsAppMessage =
  "Hola, me gustaría recibir información sobre los tratamientos de Keysar Cosmetics.";

export const defaultWhatsAppUrl = `https://wa.me/${whatsappPhoneNumber}?text=${encodeURIComponent(defaultWhatsAppMessage)}`;
