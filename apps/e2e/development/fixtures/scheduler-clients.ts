export function schedulerCustomerPageFixture(branchId: string) {
  return {
    items: [
      {
        id: "customer-rv3-maria",
        displayName: "María Camila Celis",
        preferredName: "Camila",
        phone: "+52 55 5100 0280",
        email: "camila.celis@example.com",
        source: {
          id: "source-rv3-referral",
          name: "Recomendación",
          active: true,
          companyOwnedByDefault: false,
        },
        active: true,
        version: 7,
        aliases: ["María Celis"],
        currentPortfolios: [
          {
            id: "portfolio-rv3",
            branchId,
            branchName: "Sucursal autorizada",
            employeeId: null,
            ownerName: "Keysar Cosmetics",
            effectiveFrom: "2026-01-01T00:00:00.000Z",
            effectiveTo: null,
          },
        ],
      },
    ],
    page: 1,
    pageSize: 25,
    total: 1,
  };
}
