export type EmployeeStatus = "Activo" | "Inactivo" | "Vacaciones";

export type Employee = {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
  branch: string;
  shift: string;
  restDay: string;
  birthday: string;
  status: EmployeeStatus;
};

export type CatalogRecord = {
  id: number;
  name: string;
  detail: string;
  extra: string;
  status: "Activo" | "Inactivo" | "Pendiente" | "Autorizado" | "Rechazado";
};

export type MockState = {
  employees: Employee[];
  calendar: CatalogRecord[];
  requests: CatalogRecord[];
  branches: CatalogRecord[];
  positions: CatalogRecord[];
  facialists: CatalogRecord[];
  policies: CatalogRecord[];
  access: CatalogRecord[];
};

export const initialMockState: MockState = {
  employees: [
    {
      id: 1,
      name: "Enrique Galicia Garatachia",
      username: "egali3",
      email: "enrique@keysar.mx",
      role: "Master",
      branch: "Sin asignar",
      shift: "10:00–18:00",
      restDay: "Domingo",
      birthday: "1990-08-24",
      status: "Activo",
    },
    {
      id: 2,
      name: "Marian Vélez Hernández",
      username: "mvele",
      email: "marian@keysar.mx",
      role: "Vendedor",
      branch: "Mitikah",
      shift: "10:00–18:00",
      restDay: "Martes",
      birthday: "1997-09-03",
      status: "Activo",
    },
    {
      id: 3,
      name: "Elizabeth García Hernández",
      username: "egarc",
      email: "elizabeth@keysar.mx",
      role: "Facialista",
      branch: "Opatra",
      shift: "14:00–20:00",
      restDay: "Miércoles",
      birthday: "1995-10-18",
      status: "Activo",
    },
    {
      id: 4,
      name: "Mariana Rodríguez",
      username: "mfall",
      email: "mariana@keysar.mx",
      role: "Facialista",
      branch: "Masaryk",
      shift: "10:00–18:00",
      restDay: "Lunes",
      birthday: "1998-11-26",
      status: "Activo",
    },
    {
      id: 5,
      name: "Renata Morales",
      username: "rmora",
      email: "renata@keysar.mx",
      role: "Gerente",
      branch: "Parque Delta",
      shift: "09:00–17:00",
      restDay: "Jueves",
      birthday: "1994-12-14",
      status: "Activo",
    },
  ],
  calendar: [
    {
      id: 101,
      name: "Marian Vélez Hernández",
      detail: "2026-08-24",
      extra: "Mitikah · 10:00–18:00",
      status: "Activo",
    },
    {
      id: 102,
      name: "Elizabeth García Hernández",
      detail: "2026-08-24",
      extra: "Opatra · 14:00–20:00",
      status: "Activo",
    },
  ],
  requests: [
    {
      id: 201,
      name: "Mariana Rodríguez",
      detail: "Vacaciones · 2026-09-07 al 2026-09-11",
      extra: "Viaje familiar",
      status: "Pendiente",
    },
    {
      id: 202,
      name: "Renata Morales",
      detail: "Permiso · 2026-08-28",
      extra: "Trámite personal",
      status: "Autorizado",
    },
  ],
  branches: [
    {
      id: 301,
      name: "Mitikah",
      detail: "10:00–20:00",
      extra: "Marian Vélez Hernández",
      status: "Activo",
    },
    {
      id: 302,
      name: "Mitikah VIP",
      detail: "10:00–20:00",
      extra: "Sin gerente",
      status: "Activo",
    },
    {
      id: 303,
      name: "Opatra",
      detail: "10:00–20:00",
      extra: "Elizabeth García Hernández",
      status: "Activo",
    },
    {
      id: 304,
      name: "Galerías Insurgentes",
      detail: "11:00–21:00",
      extra: "Sin gerente",
      status: "Activo",
    },
    {
      id: 305,
      name: "Masaryk",
      detail: "10:00–20:00",
      extra: "Mariana Rodríguez",
      status: "Activo",
    },
    {
      id: 306,
      name: "Parque Delta",
      detail: "10:00–21:00",
      extra: "Renata Morales",
      status: "Activo",
    },
  ],
  positions: [
    {
      id: 401,
      name: "Master",
      detail: "Administración general",
      extra: "1 empleado",
      status: "Activo",
    },
    {
      id: 402,
      name: "Gerente",
      detail: "Operación de sucursal",
      extra: "1 empleado",
      status: "Activo",
    },
    {
      id: 403,
      name: "Facialista",
      detail: "Servicios faciales",
      extra: "2 empleados",
      status: "Activo",
    },
    {
      id: 404,
      name: "Vendedor",
      detail: "Venta y atención",
      extra: "1 empleado",
      status: "Activo",
    },
  ],
  facialists: [
    {
      id: 501,
      name: "Elizabeth García Hernández",
      detail: "Lunes a sábado",
      extra: "Opatra · 14:00–20:00",
      status: "Activo",
    },
    {
      id: 502,
      name: "Mariana Rodríguez",
      detail: "Martes a domingo",
      extra: "Masaryk · 10:00–18:00",
      status: "Activo",
    },
  ],
  policies: [
    {
      id: 601,
      name: "Reglamento interno",
      detail: "Versión 3 · Agosto 2026",
      extra: "5 acuses",
      status: "Activo",
    },
    {
      id: 602,
      name: "Política de vacaciones",
      detail: "Versión 1 · Julio 2026",
      extra: "4 acuses",
      status: "Activo",
    },
  ],
  access: [
    {
      id: 701,
      name: "Master",
      detail: "Todos los módulos",
      extra: "Puede editar",
      status: "Activo",
    },
    {
      id: 702,
      name: "Gerente",
      detail: "Personal, calendario y solicitudes",
      extra: "Puede editar",
      status: "Activo",
    },
    {
      id: 703,
      name: "Facialista",
      detail: "Mi perfil y horarios",
      extra: "Solo lectura",
      status: "Activo",
    },
  ],
};
