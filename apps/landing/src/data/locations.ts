export const bookingBranches = {
  "sucursal-1": "Sucursal Masaryk",
  "sucursal-2": "Keysar Cosmétics Mítikah Luxury",
  "sucursal-3": "Sucursal Parque Delta Beauty Córner",
  "sucursal-4": "Opatra Galería Insurgentes",
} as const;

export const openingHours = {
  opens: "11:00",
  closes: "20:00",
  dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
};

interface Location {
  slug: string;
  bookingValue: keyof typeof bookingBranches;
  name: string;
  businessName: string;
  address: string;
  street: string;
  district: string;
  postalCode: string;
  directions: string;
  mapUrl: string;
  directionsUrl?: string;
}

export const locations: Location[] = [
  {
    slug: "masaryk",
    bookingValue: "sucursal-1",
    name: bookingBranches["sucursal-1"],
    businessName: "Keysar Cosmetics Masaryk",
    address: "Presidente Masaryk 407, Polanco III Secc, Miguel Hidalgo, 11540 CDMX",
    street: "Presidente Masaryk 407, Polanco III Sección",
    district: "Miguel Hidalgo",
    postalCode: "11540",
    directions:
      "La sucursal está en Polanco III Sección, sobre Presidente Masaryk. Busca el número 407 para llegar a tu cita.",
    mapUrl: "https://maps.app.goo.gl/F1WFQTv1jn2vUycj6",
  },
  {
    slug: "mitikah",
    bookingValue: "sucursal-2",
    name: bookingBranches["sucursal-2"],
    businessName: "Keysar Cosmetics Mítikah",
    address: "Av. Río Churubusco 601, Centro Comercial Mítikah, Mezzanine PB, Benito Juárez, CDMX",
    street: "Av. Río Churubusco 601, Centro Comercial Mítikah, Mezzanine PB",
    district: "Benito Juárez",
    postalCode: "03330",
    directions:
      "La atención es en el mezzanine de planta baja del Centro Comercial Mítikah. Para llegar al centro comercial, toma como referencia la entrada de Av. Río Churubusco 601.",
    mapUrl:
      "https://www.google.com/maps/search/?api=1&query=Keysar+Cosmetics+Mitikah&query_place_id=ChIJo-5--wxMGqERT8Z1-t4gvL4",
    directionsUrl:
      "https://www.google.com/maps/dir/?api=1&destination=Centro+Comercial+Mitikah%2C+Av.+R%C3%ADo+Churubusco+601%2C+CDMX",
  },
  {
    slug: "parque-delta",
    bookingValue: "sucursal-3",
    name: "Parque Delta Beauty Córner",
    businessName: "Parque Delta Beauty Córner",
    address: "Av. Cuauhtémoc 462, Piedad Narvarte, Benito Juárez, 03000, CDMX — Local K17",
    street: "Av. Cuauhtémoc 462, local K17, Piedad Narvarte",
    district: "Benito Juárez",
    postalCode: "03000",
    directions:
      "Dentro de Parque Delta, busca el local K17. Puedes usar la entrada de Av. Cuauhtémoc 462 como punto de llegada y pedir indicaciones al módulo de información.",
    mapUrl:
      "https://www.google.com/maps/dir/?api=1&destination=Av.+Cuauht%C3%A9moc+462%2C+Parque+Delta%2C+Piedad+Narvarte%2C+03000%2C+CDMX",
  },
  {
    slug: "galerias-insurgentes",
    bookingValue: "sucursal-4",
    name: bookingBranches["sucursal-4"],
    businessName: "Opatra Spa Galerías Insurgentes",
    address: "Galería Insurgentes, Ciudad de México",
    street: "Parroquia 179, Galerías Insurgentes, Colonia del Valle Centro",
    district: "Benito Juárez",
    postalCode: "03230",
    directions:
      "La ficha de Opatra Spa en Google Maps indica la entrada de Parroquia 179, en Galerías Insurgentes. Dentro de la plaza, busca Opatra Spa.",
    mapUrl: "https://maps.app.goo.gl/fG5fEZa4ZTY1ibYH6",
  },
];
