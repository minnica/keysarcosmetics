const _formatMoney = value =>
  `$${Number(value || 0).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const chatColors = [
  'rgba(255, 99, 132, 0.7)',
  'rgba(54, 162, 235, 0.7)',
  'rgba(255, 206, 86, 0.7)',
  'rgba(75, 192, 192, 0.7)',
  'rgba(153, 102, 255, 0.7)',
  'rgba(255, 159, 64, 0.7)',
  'rgba(99, 255, 132, 0.7)',
  'rgba(196, 109, 245, 0.7)',
  'rgba(123, 232, 50, 0.7)',
  'rgba(245, 178, 66, 0.7)',
];

export const columnsEmployee = [
  'ID',
  'Nombre Completo',
  'Apellido Paterno',
  'Apellido Materno',
  'Nombre',
  'Banco',
  'Numero de Cuenta',
  'Puesto',
  {
    name: 'Meta Individual',
    formatter: (_, row) => _formatMoney(row?.cells?.[8]?.data),
  },
];

export const columnsBranch = ['ID', 'Sucursal'];

export const columnsSalesBranch = [
  'ID',
  { name: 'idBranch', hidden: true },
  'Sucursal',
  'Fecha',
  'Total Ventas',
  'Notas',
];

export const columnsPaymentMethod = ['ID', 'Tipo de Pago'];

export const columnTotalSales = [
  {
    name: 'FECHA',
  },
  {
    name: 'GALERIAS INSURGENTES',
    formatter: (_, row) => _formatMoney(row?.cells?.[1]?.data),
  },
  {
    name: 'OPATRA',
    formatter: (_, row) => _formatMoney(row?.cells?.[2]?.data),
  },
  {
    name: 'MITIKAH',
    formatter: (_, row) => _formatMoney(row?.cells?.[3]?.data),
  },
  {
    name: 'DELTA',
    formatter: (_, row) => _formatMoney(row?.cells?.[4]?.data),
  },
  {
    name: 'MITIKAH 2',
    formatter: (_, row) => _formatMoney(row?.cells?.[5]?.data),
  },
  {
    name: 'MIYANA',
    formatter: (_, row) => _formatMoney(row?.cells?.[6]?.data),
  },
  {
    name: 'MASARYK',
    formatter: (_, row) => _formatMoney(row?.cells?.[7]?.data),
  },
  {
    name: 'NEW_BRANCH',
    formatter: (_, row) => _formatMoney(row?.cells?.[8]?.data),
  },
  {
    name: 'PRUEBA POST',
    formatter: (_, row) => _formatMoney(row?.cells?.[9]?.data),
  },
  {
    name: 'POST',
    formatter: (_, row) => _formatMoney(row?.cells?.[10]?.data),
  },
  {
    name: 'POSTZZZ',
    formatter: (_, row) => _formatMoney(row?.cells?.[11]?.data),
  },
  {
    name: 'TOTAL',
    formatter: (_, row) => _formatMoney(row?.cells?.[12]?.data),
  },
];

export const columnsSalesSeller = [
  {
    name: 'EMPLOYEE',
    width: '200px',
  },
  {
    name: 'GALERIAS INSURGENTES',
    width: '200px',
    formatter: (_, row) => _formatMoney(row?.cells?.[1]?.data),
  },
  {
    name: 'OPATRA',
    width: '150px',
    formatter: (_, row) => _formatMoney(row?.cells?.[2]?.data),
  },
  {
    name: 'MITIKAH',
    width: '150px',
    formatter: (_, row) => _formatMoney(row?.cells?.[3]?.data),
  },
  {
    name: 'DELTA',
    width: '150px',
    formatter: (_, row) => _formatMoney(row?.cells?.[4]?.data),
  },
  {
    name: 'MITIKAH 2',
    width: '150px',
    formatter: (_, row) => _formatMoney(row?.cells?.[5]?.data),
  },
  {
    name: 'MIYANA',
    width: '150px',
    formatter: (_, row) => _formatMoney(row?.cells?.[6]?.data),
  },
  {
    name: 'MASARYK',
    width: '150px',
    formatter: (_, row) => _formatMoney(row?.cells?.[7]?.data),
  },
  {
    name: 'NEW BRANCH',
    width: '200px',
    formatter: (_, row) => _formatMoney(row?.cells?.[8]?.data),
  },
  {
    name: 'PRUEBA POST',
    width: '200px',
    formatter: (_, row) => _formatMoney(row?.cells?.[9]?.data),
  },
  {
    name: 'POST',
    width: '150px',
    formatter: (_, row) => _formatMoney(row?.cells?.[10]?.data),
  },
  {
    name: 'POSTZZZ',
    width: '150px',
    formatter: (_, row) => _formatMoney(row?.cells?.[11]?.data),
  },
  {
    name: 'TOTAL',
    width: '150px',
    formatter: (_, row) => _formatMoney(row?.cells?.[12]?.data),
  },
  {
    name: 'META MENSUAL',
    width: '200px',
    formatter: (_, row) => _formatMoney(row?.cells?.[13]?.data),
  },
  {
    name: 'POR LLEGAR',
    width: '150px',
    formatter: (_, row) => _formatMoney(row?.cells?.[14]?.data),
  },
];

export const columnsPaymentMethodReport = [
  {
    name: 'sucursal',
  },
  {
    name: 'EFECTIVO',
    formatter: (_, row) => _formatMoney(row?.cells?.[1]?.data),
  },
  {
    name: 'TARJETA',
    formatter: (_, row) => _formatMoney(row?.cells?.[2]?.data),
  },
  {
    name: 'NETPAY LINK',
    formatter: (_, row) => _formatMoney(row?.cells?.[3]?.data),
  },
  {
    name: 'TRANSFERENCIA',
    formatter: (_, row) => _formatMoney(row?.cells?.[4]?.data),
  },
  {
    name: 'NEW METHOD',
    formatter: (_, row) => _formatMoney(row?.cells?.[5]?.data),
  },
  {
    name: 'PRUEBA POST',
    formatter: (_, row) => _formatMoney(row?.cells?.[6]?.data),
  },
  {
    name: 'POSTZZZ',
    formatter: (_, row) => _formatMoney(row?.cells?.[7]?.data),
  },
  {
    name: 'TOTAL',
    formatter: (_, row) => _formatMoney(row?.cells?.[8]?.data),
  },
];

export const columnsPaymentMethodReportDaily = [
  {
    name: 'fecha',
  },
  {
    name: 'MITIKAH',
    formatter: (_, row) => _formatMoney(row?.cells?.[1]?.data),
  },
  {
    name: 'DELTA',
    formatter: (_, row) => _formatMoney(row?.cells?.[2]?.data),
  },
  {
    name: 'GALERIAS_INSURGENTES',
    formatter: (_, row) => _formatMoney(row?.cells?.[3]?.data),
  },
  {
    name: 'OPATRA',
    formatter: (_, row) => _formatMoney(row?.cells?.[4]?.data),
  },
  {
    name: 'MIYANA',
    formatter: (_, row) => _formatMoney(row?.cells?.[5]?.data),
  },
  {
    name: 'MASARYK',
    formatter: (_, row) => _formatMoney(row?.cells?.[6]?.data),
  },
  {
    name: 'MITIKAH_2',
    formatter: (_, row) => _formatMoney(row?.cells?.[7]?.data),
  },
  {
    name: 'NEW_BRANCH',
    formatter: (_, row) => _formatMoney(row?.cells?.[8]?.data),
  },
  {
    name: 'PRUEBA_POST',
    formatter: (_, row) => _formatMoney(row?.cells?.[9]?.data),
  },
  {
    name: 'POST',
    formatter: (_, row) => _formatMoney(row?.cells?.[10]?.data),
  },
  {
    name: 'POSTZZZ',
    formatter: (_, row) => _formatMoney(row?.cells?.[11]?.data),
  },
  {
    name: 'TOTAL',
    formatter: (_, row) => _formatMoney(row?.cells?.[12]?.data),
  },
];

export const tableConfig = {
  className: {
    thead: '!bg-black !text-white',
    th: '!bg-black !text-white !uppercase',
  },
  language: {
    search: {
      placeholder: 'Buscar',
    },
    pagination: {
      to: '-',
      of: 'de',
      previous: 'Anterior',
      next: 'Siguiente',
      showing: 'Mostrando',
      results: () => 'Registros',
    },
  },
};
