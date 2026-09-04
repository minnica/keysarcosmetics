// Cliente HTTP compartido con interceptores de JWT y manejo de errores global
import axios, { type AxiosInstance, type AxiosError } from "axios";
import type {
  ApiResponse,
  PosAccessBootstrapDto,
  PosBranchSummaryDto,
  PosCatalogItemDto,
  PosCatalogItemWithCostsDto,
  PosCredentialSummaryDto,
  PosCustomerDto,
  PosCustomerRequiredFieldDto,
  PosCustomerSourceDto,
  PosLoginRequestDto,
  PosInventoryAdjustmentBatchDto,
  PosInventoryAdjustmentLineInputDto,
  PosInventoryBalanceDto,
  PosInventoryCountDto,
  PosInventoryLocationDto,
  PosInventoryMovementDto,
  PosAuditedInventoryCountDto,
  PosMasterAuthorizationDto,
  PosMasterAuthorizationRequestDto,
  PosPersonalAuthorizationDto,
  PosPersonalAuthorizationRequestDto,
  PosPermissionKey,
  PosSessionDto,
  PosSalesCompetitionDto,
  PosSupplierDto,
  PosTerminalDto,
  PosTicketConfigurationDto,
  PosVoucherTemplateDto,
  PosWarehouseRequestCreateDto,
  PosWarehouseRequestDto,
  PosNotificationDto,
  PosNotificationPreferenceDto,
  PosPaymentMethodDto,
  PosPaymentCatalogsDto,
  PosBankDto,
  PosCardNetworkDto,
  PosInstallmentOptionDto,
  PosCourtesyConfigurationDto,
  PosCourtesyProductDto,
  PosCourtesyPackageDto,
  PosCommercialCompanyDto,
  PosPackageDto,
  PosTicketCreateRequestDto,
  PosTicketDto,
  PosTicketEventDto,
  PosTicketEventRequestDto,
  PosTicketQuoteDto,
  PosTicketQuoteRequestDto,
  PosTicketPaymentInputDto,
  PosVoucherIssueDto,
  PosBusinessDayDto,
  PosBusinessDayCountInputDto,
  PosAttendanceDto,
  PosExpenseTypeDto,
  PosCashExpenseDto,
  PosCashExpenseWriteDto,
  PosCashExpenseCorrectionDto,
  PosCashExpenseVoidDto,
  PosOperationalSummaryDto,
  PosOfflineBootstrapDto,
  PosOfflineOperationDto,
  PosOfflinePushResultDto,
  PosReportDatasetDto,
  PosDataScopeDto,
  PosReportKey,
  PosSaleSellerDto,
  PosClientMembershipDto,
  PosMembershipAttendanceRequestDto,
  PosMembershipClosureRequestDto,
  PosMembershipListRequest,
  PosMembershipProfileRequestDto,
  PosMembershipSalesClosureDto,
  PosMembershipSellerChangeRequestDto,
  PosMembershipStatusChangeRequestDto,
  PosAgendaAvailabilityRequestDto,
  PosAgendaConflictDto,
  PosAgendaMembershipReservationRequestDto,
  PosAgendaSlotDto,
  SchedulerAccessManagementDto,
  SchedulerAuthorizationDto,
  SchedulerAuthorizationConsumeRequestDto,
  SchedulerAuthorizationRequestDto,
  SchedulerBootstrapDto,
  SchedulerManagedPositionDto,
  SchedulerPermissionDto,
  SchedulerSecondarySecretRequestDto,
} from "@cosmetics/types";

/**
 * Crea una instancia de axios lista para consumir el backend.
 * La URL base se inyecta por variable de entorno en cada app.
 */
export function createApiClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    headers: {
      "Content-Type": "application/json",
    },
    timeout: 15_000,
  });

  // Interceptor de solicitud: agrega el JWT en el header Authorization
  client.interceptors.request.use((config) => {
    // El token se lee de localStorage (solo en el browser)
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token");
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return config;
  });

  // Interceptor de respuesta: manejo de errores globales
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiResponse<unknown>>) => {
      // 401 → limpiar sesión y redirigir al login
      if (error.response?.status === 401 && typeof window !== "undefined") {
        localStorage.removeItem("auth_token");
        window.location.href = "/login";
      }
      return Promise.reject(error);
    },
  );

  return client;
}

export interface SchedulerApiClientOptions {
  getAccessToken?: () => string | null;
  setAccessToken?: (token: string | null) => void;
}

export interface SchedulerApiClient {
  login(email: string, password: string): Promise<SchedulerBootstrapDto>;
  bootstrap(): Promise<SchedulerBootstrapDto>;
  updateSecondarySecret(
    input: SchedulerSecondarySecretRequestDto,
  ): Promise<{ configured: true }>;
  createAuthorization(
    input: SchedulerAuthorizationRequestDto,
  ): Promise<SchedulerAuthorizationDto>;
  consumeAuthorization(
    input: SchedulerAuthorizationConsumeRequestDto,
  ): Promise<{ authorized: true }>;
  accessManagement(): Promise<SchedulerAccessManagementDto>;
  updatePositionPermissions(
    positionId: string,
    input: {
      canManageSchedulerAccess?: boolean;
      selfProfessionalOnly: boolean;
      permissions: SchedulerPermissionDto[];
    },
  ): Promise<SchedulerManagedPositionDto>;
  updatePositionBranches(
    positionId: string,
    branchIds: string[],
  ): Promise<SchedulerManagedPositionDto>;
  logout(): void;
}

export function createSchedulerApiClient(
  baseURL: string,
  options: SchedulerApiClientOptions = {},
): SchedulerApiClient {
  const storageKey = "auth_token";
  const getAccessToken =
    options.getAccessToken ??
    (() =>
      typeof window === "undefined"
        ? null
        : window.localStorage.getItem(storageKey));
  const setAccessToken =
    options.setAccessToken ??
    ((token: string | null) => {
      if (typeof window === "undefined") return;
      if (token) window.localStorage.setItem(storageKey, token);
      else window.localStorage.removeItem(storageKey);
    });
  const client = axios.create({
    baseURL: baseURL.replace(/\/$/, ""),
    headers: { "Content-Type": "application/json" },
    timeout: 15_000,
  });
  client.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) config.headers["Authorization"] = `Bearer ${token}`;
    return config;
  });
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiResponse<unknown>>) => {
      if (error.response?.status === 401) setAccessToken(null);
      return Promise.reject(error);
    },
  );
  const data = async <T>(
    request: Promise<{ data: ApiResponse<T> }>,
  ): Promise<T> => (await request).data.data;

  return {
    async login(email, password) {
      const login = await data<{ token: string }>(
        client.post("/api/auth/login", { email, password }),
      );
      setAccessToken(login.token);
      try {
        return await data<SchedulerBootstrapDto>(
          client.get("/api/scheduler/bootstrap"),
        );
      } catch (error) {
        setAccessToken(null);
        throw error;
      }
    },
    bootstrap: () =>
      data<SchedulerBootstrapDto>(client.get("/api/scheduler/bootstrap")),
    updateSecondarySecret: (input) =>
      data(client.put("/api/scheduler/security/secondary-secret", input)),
    createAuthorization: (input) =>
      data<SchedulerAuthorizationDto>(
        client.post("/api/scheduler/authorizations", input),
      ),
    consumeAuthorization: (input) =>
      data(client.post("/api/scheduler/authorizations/consume", input)),
    accessManagement: () =>
      data<SchedulerAccessManagementDto>(client.get("/api/scheduler/access")),
    updatePositionPermissions: (positionId, input) =>
      data<SchedulerManagedPositionDto>(
        client.put(
          `/api/scheduler/access/positions/${positionId}/permissions`,
          input,
        ),
      ),
    updatePositionBranches: (positionId, branchIds) =>
      data<SchedulerManagedPositionDto>(
        client.put(`/api/scheduler/access/positions/${positionId}/branches`, {
          branchIds,
        }),
      ),
    logout: () => setAccessToken(null),
  };
}

export interface PosApiClientOptions {
  getAccessToken?: () => string | null;
  setAccessToken?: (token: string | null) => void;
}

export interface PosApiClient {
  login(input: PosLoginRequestDto): Promise<PosSessionDto>;
  me(): Promise<PosSessionDto>;
  branches(): Promise<PosBranchSummaryDto[]>;
  accessBootstrap(): Promise<PosAccessBootstrapDto>;
  createAuthorization(
    input: PosMasterAuthorizationRequestDto,
  ): Promise<PosMasterAuthorizationDto>;
  verifyAuthorization(
    authorizationToken: string,
    purpose: string,
  ): Promise<boolean>;
  createPersonalAuthorization(
    input: PosPersonalAuthorizationRequestDto,
  ): Promise<PosPersonalAuthorizationDto>;
  verifyPersonalAuthorization(
    authorizationToken: string,
    purpose: string,
  ): Promise<boolean>;
  exitSession(): Promise<{ revokedAt: string }>;
  updateRolePermissions(
    positionId: string,
    permissions: PosPermissionKey[],
    authorizationToken: string,
  ): Promise<void>;
  updateRoleBranches(
    positionId: string,
    branchIds: string[],
    authorizationToken: string,
  ): Promise<void>;
  updateCredentialBranches(
    credentialId: string,
    branchIds: string[],
    authorizationToken: string,
  ): Promise<void>;
  updateEmployeeCredential(
    employeeId: string,
    input: {
      alias: string;
      pin?: string;
      active: boolean;
      offlineEnabled: boolean;
      isMaster: boolean;
      authorizationToken: string;
    },
  ): Promise<PosCredentialSummaryDto>;
  changeTerminalBranch(
    terminalId: string,
    branchId: string,
    authorizationToken: string,
  ): Promise<PosTerminalDto>;
  catalogItems(input?: {
    query?: string;
    kind?: "PRODUCT" | "SERVICE" | "SUPPLY" | "MACHINE" | "MEMBERSHIP";
    page?: number;
    pageSize?: number;
  }): Promise<{
    items: Array<PosCatalogItemDto | PosCatalogItemWithCostsDto>;
    page: number;
    pageSize: number;
    total: number;
  }>;
  customerSearch(
    query: string,
    page?: number,
    pageSize?: number,
  ): Promise<{
    items: PosCustomerDto[];
    page: number;
    pageSize: number;
    total: number;
  }>;
  createCustomer(input: {
    displayName: string;
    phone?: string | null;
    email?: string | null;
    sourceId?: string | null;
    notes?: string | null;
    active?: boolean;
    branchId?: string | null;
    employeeId?: string | null;
  }): Promise<PosCustomerDto>;
  updateCustomer(
    id: string,
    input: {
      displayName: string;
      phone?: string | null;
      email?: string | null;
      sourceId?: string | null;
      notes?: string | null;
      active?: boolean;
      branchId?: string | null;
      employeeId?: string | null;
    },
  ): Promise<PosCustomerDto>;
  customerSources(): Promise<PosCustomerSourceDto[]>;
  createCustomerSource(input: {
    name: string;
    active?: boolean;
    companyOwnedByDefault?: boolean;
  }): Promise<PosCustomerSourceDto>;
  updateCustomerSource(
    id: string,
    input: {
      name: string;
      active?: boolean;
      companyOwnedByDefault?: boolean;
    },
  ): Promise<PosCustomerSourceDto>;
  suppliers(): Promise<PosSupplierDto[]>;
  ticketConfiguration(): Promise<PosTicketConfigurationDto>;
  customerRequiredFields(): Promise<PosCustomerRequiredFieldDto[]>;
  updateCustomerRequiredField(
    key: string,
    input: {
      label: string;
      required: boolean;
      active: boolean;
      sortOrder: number;
    },
  ): Promise<PosCustomerRequiredFieldDto>;
  voucherTemplates(): Promise<PosVoucherTemplateDto[]>;
  paymentMethods(): Promise<PosPaymentMethodDto[]>;
  createPaymentMethod(input: {
    name: string;
    type: "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "OTRO";
    active: boolean;
    activeForPos: boolean;
    requiresReference: boolean;
    referenceLabel?: string | null;
    minAmount?: string | null;
    maxAmount?: string | null;
  }): Promise<PosPaymentMethodDto>;
  updatePaymentMethod(
    id: string,
    input: {
      name: string;
      type: "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "OTRO";
      active: boolean;
      activeForPos: boolean;
      requiresReference: boolean;
      referenceLabel?: string | null;
      minAmount?: string | null;
      maxAmount?: string | null;
    },
  ): Promise<PosPaymentMethodDto>;
  paymentCatalogs(): Promise<PosPaymentCatalogsDto>;
  createBank(input: {
    name: string;
    active?: boolean;
    sourceName?: string;
    sourceReviewedAt: string;
  }): Promise<PosBankDto>;
  updateBank(
    id: string,
    input: {
      name: string;
      active?: boolean;
      sourceName?: string;
      sourceReviewedAt: string;
    },
  ): Promise<PosBankDto>;
  createCardNetwork(input: {
    name: string;
    active?: boolean;
    sourceName?: string;
    sourceReviewedAt: string;
  }): Promise<PosCardNetworkDto>;
  updateCardNetwork(
    id: string,
    input: {
      name: string;
      active?: boolean;
      sourceName?: string;
      sourceReviewedAt: string;
    },
  ): Promise<PosCardNetworkDto>;
  createInstallmentOption(input: {
    months: number;
    label: string;
    active?: boolean;
    sourceName?: string;
    sourceReviewedAt: string;
  }): Promise<PosInstallmentOptionDto>;
  updateInstallmentOption(
    id: string,
    input: {
      months: number;
      label: string;
      active?: boolean;
      sourceName?: string;
      sourceReviewedAt: string;
    },
  ): Promise<PosInstallmentOptionDto>;
  courtesyConfiguration(): Promise<PosCourtesyConfigurationDto>;
  createCourtesyProduct(input: {
    name: string;
    type: "FACIAL" | "BODY";
    active?: boolean;
  }): Promise<PosCourtesyProductDto>;
  updateCourtesyProduct(
    id: string,
    input: { name: string; type: "FACIAL" | "BODY"; active?: boolean },
  ): Promise<PosCourtesyProductDto>;
  createCourtesyPackage(input: {
    name: string;
    productIds: string[];
    active?: boolean;
  }): Promise<PosCourtesyPackageDto>;
  updateCourtesyPackage(
    id: string,
    input: { name: string; productIds: string[]; active?: boolean },
  ): Promise<PosCourtesyPackageDto>;
  updateCourtesyConfiguration(input: {
    required: boolean;
    defaultPackageId: string | null;
  }): Promise<PosCourtesyConfigurationDto>;
  commercialCompany(): Promise<PosCommercialCompanyDto | null>;
  updateCommercialCompany(input: {
    name: string;
    salesNumber: string;
    active?: boolean;
  }): Promise<PosCommercialCompanyDto>;
  updateEmployeeStatus(
    employeeId: string,
    input: {
      active: boolean;
      reason: string;
      authorizationToken: string;
    },
  ): Promise<{
    employeeId: string;
    active: boolean;
    transferredCustomers: number;
  }>;
  packages(): Promise<PosPackageDto[]>;
  competitions(): Promise<PosSalesCompetitionDto[]>;
  createCompetition(
    input: Omit<PosSalesCompetitionDto, "id" | "creadoEn">,
  ): Promise<PosSalesCompetitionDto>;
  updateCompetition(
    id: string,
    input: Omit<PosSalesCompetitionDto, "id" | "creadoEn">,
  ): Promise<PosSalesCompetitionDto>;
  deleteCompetition(id: string): Promise<{ id: string }>;
  saleSellers(input?: {
    query?: string;
    customerId?: string;
  }): Promise<PosSaleSellerDto[]>;
  inventoryLocations(): Promise<PosInventoryLocationDto[]>;
  inventoryBalances(locationId?: string): Promise<PosInventoryBalanceDto[]>;
  inventoryMovements(input?: {
    locationId?: string;
    businessDate?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{
    items: PosInventoryMovementDto[];
    page: number;
    pageSize: number;
    total: number;
  }>;
  inventoryAdjustmentBatches(): Promise<PosInventoryAdjustmentBatchDto[]>;
  createInventoryAdjustmentBatch(
    input: {
      notes?: string | null;
      lines: PosInventoryAdjustmentLineInputDto[];
    },
    idempotencyKey?: string,
  ): Promise<PosInventoryAdjustmentBatchDto>;
  updateInventoryAdjustmentBatch(
    id: string,
    input: {
      notes?: string | null;
      lines: PosInventoryAdjustmentLineInputDto[];
    },
    idempotencyKey?: string,
  ): Promise<PosInventoryAdjustmentBatchDto>;
  approveInventoryAdjustmentBatch(
    id: string,
    idempotencyKey?: string,
  ): Promise<PosInventoryAdjustmentBatchDto>;
  cancelInventoryAdjustmentBatch(
    id: string,
    idempotencyKey?: string,
  ): Promise<PosInventoryAdjustmentBatchDto>;
  createInventoryCount(
    input: {
      kind: "OPENING" | "CLOSING";
      businessDate: string;
      locationId: string;
      notes?: string;
      lines: Array<{ itemId: string; countedQuantity: string }>;
    },
    idempotencyKey?: string,
  ): Promise<PosInventoryCountDto | PosAuditedInventoryCountDto>;
  inventoryCounts(input: {
    locationId: string;
    businessDate: string;
    kind?: "OPENING" | "CLOSING";
  }): Promise<Array<PosInventoryCountDto | PosAuditedInventoryCountDto>>;
  warehouseRequests(input?: { page?: number; pageSize?: number }): Promise<{
    items: PosWarehouseRequestDto[];
    page: number;
    pageSize: number;
    total: number;
  }>;
  createWarehouseRequest(
    input: PosWarehouseRequestCreateDto,
    idempotencyKey?: string,
  ): Promise<PosWarehouseRequestDto>;
  warehouseRequestAction(
    id: string,
    action:
      | "approve-creation"
      | "approve-send"
      | "receive"
      | "return-to-requested"
      | "cancel",
    notes?: string | null,
    idempotencyKey?: string,
  ): Promise<PosWarehouseRequestDto>;
  notifications(input?: {
    unreadOnly?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<{
    items: PosNotificationDto[];
    page: number;
    pageSize: number;
    total: number;
  }>;
  markNotificationRead(
    id: string,
  ): Promise<{ notificationId: string; readAt: string }>;
  markAllNotificationsRead(): Promise<{ count: number }>;
  notificationPreferences(): Promise<PosNotificationPreferenceDto[]>;
  updateNotificationPreferences(
    preferences: Array<{
      kind: PosNotificationDto["kind"];
      recipients: Array<{ actorId: string; access: "VIEW" | "EDIT" }>;
    }>,
  ): Promise<{ updated: boolean }>;
  quoteTicket(input: PosTicketQuoteRequestDto): Promise<PosTicketQuoteDto>;
  createTicket(
    input: PosTicketCreateRequestDto,
    idempotencyKey?: string,
  ): Promise<PosTicketDto>;
  agendaAvailability(
    input: PosAgendaAvailabilityRequestDto,
  ): Promise<PosAgendaSlotDto[]>;
  reserveMembershipAppointment(
    input: PosAgendaMembershipReservationRequestDto,
    personalAuthorizationToken: string,
    idempotencyKey?: string,
  ): Promise<PosTicketDto["appointments"][number]>;
  agendaConflicts(input?: {
    status?: "PENDING" | "FAILED" | "CONFLICT";
    page?: number;
    pageSize?: number;
  }): Promise<{
    items: PosAgendaConflictDto[];
    page: number;
    pageSize: number;
    total: number;
  }>;
  retryAgendaConflicts(eventId?: string): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
  }>;
  resolveAgendaAttendanceCorrection(input: {
    eventId: string;
    authorizationToken: string;
    reason: string;
  }): Promise<{ eventId: string; appointmentId: string; corrected: boolean }>;
  tickets(input?: {
    businessDate?: string;
    customerId?: string;
    branchIds?: string[];
    page?: number;
    pageSize?: number;
  }): Promise<{
    scope: PosDataScopeDto;
    identityResolution: {
      strategy: "CANONICAL_IDS";
      legacyFallbackMatches: number;
    };
    items: PosTicketDto[];
    page: number;
    pageSize: number;
    total: number;
  }>;
  ticket(id: string): Promise<PosTicketDto>;
  addLayawayPayment(
    id: string,
    payments: PosTicketPaymentInputDto[],
    deliveredTicketLineIds?: string[],
    idempotencyKey?: string,
  ): Promise<PosTicketDto>;
  deliverOwedProduct(
    id: string,
    quantity: string,
    idempotencyKey?: string,
  ): Promise<{
    id: string;
    folio: string;
    businessDate: string;
    createdAt: string;
  }>;
  reviseTicket(
    id: string,
    input: PosTicketEventRequestDto,
    idempotencyKey?: string,
  ): Promise<PosTicketEventDto>;
  cancelTicket(
    id: string,
    input: PosTicketEventRequestDto,
    idempotencyKey?: string,
  ): Promise<PosTicketEventDto>;
  vouchers(input?: { page?: number; pageSize?: number }): Promise<{
    items: PosVoucherIssueDto[];
    page: number;
    pageSize: number;
    total: number;
  }>;
  issueVoucher(
    ticketId: string,
    templateId: string,
    idempotencyKey?: string,
  ): Promise<PosVoucherIssueDto>;
  printVoucher(
    issueId: string,
    idempotencyKey?: string,
  ): Promise<{ issueId: string; copyNumber: number; printedAt: string }>;
  memberships(input: PosMembershipListRequest): Promise<{
    scope: PosDataScopeDto;
    identityResolution: {
      strategy: "CANONICAL_IDS";
      legacyFallbackMatches: number;
    };
    items: PosClientMembershipDto[];
    page: number;
    pageSize: number;
    total: number;
  }>;
  membership(
    id: string,
    personalAuthorizationToken: string,
  ): Promise<PosClientMembershipDto>;
  updateMembershipProfile(
    id: string,
    input: PosMembershipProfileRequestDto,
    idempotencyKey?: string,
  ): Promise<PosClientMembershipDto>;
  changeMembershipSeller(
    id: string,
    input: PosMembershipSellerChangeRequestDto,
    idempotencyKey?: string,
  ): Promise<PosClientMembershipDto>;
  changeMembershipStatus(
    id: string,
    input: PosMembershipStatusChangeRequestDto,
    idempotencyKey?: string,
  ): Promise<PosClientMembershipDto>;
  recordMembershipAttendance(
    id: string,
    input: PosMembershipAttendanceRequestDto,
    idempotencyKey?: string,
  ): Promise<PosClientMembershipDto>;
  exportMemberships(
    input: Omit<
      PosMembershipListRequest,
      "branchIds" | "page" | "pageSize" | "followUpOnly"
    > & { branchIds: string[] },
  ): Promise<{
    generatedAt: string;
    scope: PosDataScopeDto;
    identityResolution: {
      strategy: "CANONICAL_IDS";
      legacyFallbackMatches: number;
    };
    items: PosClientMembershipDto[];
  }>;
  createMembershipClosure(
    input: PosMembershipClosureRequestDto,
    idempotencyKey?: string,
  ): Promise<PosMembershipSalesClosureDto>;
  membershipClosures(input: {
    branchIds: string[];
    personalAuthorizationToken: string;
    month?: string;
  }): Promise<PosMembershipSalesClosureDto[]>;
  currentBusinessDay(): Promise<PosBusinessDayDto | null>;
  openBusinessDay(
    input: PosBusinessDayCountInputDto,
    idempotencyKey?: string,
  ): Promise<PosBusinessDayDto>;
  submitClosingCount(
    id: string,
    input: PosBusinessDayCountInputDto,
    idempotencyKey?: string,
  ): Promise<PosBusinessDayDto>;
  closeBusinessDay(
    id: string,
    authorizationToken: string,
    idempotencyKey?: string,
  ): Promise<PosBusinessDayDto>;
  attendance(input?: {
    businessDate?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{
    items: PosAttendanceDto[];
    page: number;
    pageSize: number;
    total: number;
  }>;
  clockIn(
    pin: string,
    branchId?: string,
    idempotencyKey?: string,
  ): Promise<PosAttendanceDto>;
  clockOut(
    attendanceId: string,
    pin: string,
    idempotencyKey?: string,
  ): Promise<PosAttendanceDto>;
  expenseTypes(): Promise<PosExpenseTypeDto[]>;
  createExpenseType(input: {
    name: string;
    active?: boolean;
  }): Promise<PosExpenseTypeDto>;
  updateExpenseType(
    id: string,
    input: { name: string; active?: boolean },
  ): Promise<PosExpenseTypeDto>;
  deleteExpenseType(id: string): Promise<{ id: string }>;
  expenses(input?: {
    businessDate?: string;
    branchId?: string;
    status?: "ACTIVE" | "VOIDED";
    page?: number;
    pageSize?: number;
  }): Promise<{
    items: PosCashExpenseDto[];
    page: number;
    pageSize: number;
    total: number;
  }>;
  createExpense(
    input: PosCashExpenseWriteDto,
    idempotencyKey?: string,
  ): Promise<PosCashExpenseDto>;
  correctExpense(
    id: string,
    input: PosCashExpenseCorrectionDto,
    idempotencyKey?: string,
  ): Promise<PosCashExpenseDto>;
  voidExpense(
    id: string,
    input: PosCashExpenseVoidDto,
    idempotencyKey?: string,
  ): Promise<PosCashExpenseDto>;
  dashboard(input?: {
    businessDate?: string;
    branchId?: string;
  }): Promise<PosOperationalSummaryDto>;
  xReport(input?: {
    businessDate?: string;
    branchId?: string;
  }): Promise<PosOperationalSummaryDto>;
  reportDataset(
    key: PosReportKey,
    input: {
      dateFrom?: string;
      dateTo?: string;
      month?: string;
      branchIds?: string[];
      sellerId?: string;
      paymentMethodId?: string;
      bankId?: string;
      cardType?: "CREDIT" | "DEBIT";
      installmentMonths?: number;
      operationKind?: "SALE" | "LAYAWAY_PAYMENT" | "REFUND" | "REVISION";
      search?: string;
      page?: number;
      pageSize?: number;
    },
  ): Promise<PosReportDatasetDto>;
  exportDataset(
    key: PosReportKey,
    input: {
      dateFrom?: string;
      dateTo?: string;
      month?: string;
      branchIds?: string[];
      sellerId?: string;
      paymentMethodId?: string;
      bankId?: string;
      cardType?: "CREDIT" | "DEBIT";
      installmentMonths?: number;
      operationKind?: "SALE" | "LAYAWAY_PAYMENT" | "REFUND" | "REVISION";
      search?: string;
      page?: number;
      pageSize?: number;
    },
  ): Promise<PosReportDatasetDto>;
  offlineBootstrap(): Promise<PosOfflineBootstrapDto>;
  pushOfflineOperations(
    grantToken: string,
    operations: PosOfflineOperationDto[],
  ): Promise<PosOfflinePushResultDto>;
  clearSession(): void;
}

/** Cliente aislado del JWT compartido de Envelope/Payroll. */
export function createPosApiClient(
  baseURL: string,
  options: PosApiClientOptions = {},
): PosApiClient {
  const storageKey = "pos_access_token";
  const getAccessToken =
    options.getAccessToken ??
    (() =>
      typeof window === "undefined"
        ? null
        : window.sessionStorage.getItem(storageKey));
  const setAccessToken =
    options.setAccessToken ??
    ((token: string | null) => {
      if (typeof window === "undefined") return;
      if (token) window.sessionStorage.setItem(storageKey, token);
      else window.sessionStorage.removeItem(storageKey);
    });
  const client = axios.create({
    baseURL: `${baseURL.replace(/\/$/, "")}/api/pos`,
    headers: { "Content-Type": "application/json" },
    timeout: 15_000,
  });

  client.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) config.headers["Authorization"] = `Bearer ${token}`;
    return config;
  });
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiResponse<unknown>>) => {
      if (error.response?.status === 401) setAccessToken(null);
      return Promise.reject(error);
    },
  );

  const data = async <T>(
    request: Promise<{ data: ApiResponse<T> }>,
  ): Promise<T> => (await request).data.data;
  const mutationHeaders = (key: string = globalThis.crypto.randomUUID()) => ({
    "Idempotency-Key": key,
  });

  return {
    async login(input) {
      const session = await data<PosSessionDto>(
        client.post("/auth/login", input),
      );
      setAccessToken(session.accessToken);
      return session;
    },
    me: () => data<PosSessionDto>(client.get("/auth/me")),
    branches: () => data<PosBranchSummaryDto[]>(client.get("/branches")),
    accessBootstrap: () =>
      data<PosAccessBootstrapDto>(client.get("/access/bootstrap")),
    createAuthorization: (input) =>
      data<PosMasterAuthorizationDto>(client.post("/authorizations", input)),
    async verifyAuthorization(authorizationToken, purpose) {
      const result = await data<{ verified: boolean }>(
        client.post("/auth/verify", { authorizationToken, purpose }),
      );
      return result.verified;
    },
    createPersonalAuthorization: (input) =>
      data<PosPersonalAuthorizationDto>(
        client.post("/personal-authorizations", input),
      ),
    async verifyPersonalAuthorization(authorizationToken, purpose) {
      const result = await data<{ verified: boolean }>(
        client.post("/personal-authorizations/verify", {
          authorizationToken,
          purpose,
        }),
      );
      return result.verified;
    },
    async exitSession() {
      const result = await data<{ revokedAt: string }>(
        client.post("/session/exit"),
      );
      setAccessToken(null);
      return result;
    },
    async updateRolePermissions(positionId, permissions, authorizationToken) {
      await data(
        client.put(`/access/positions/${positionId}/permissions`, {
          permissions,
          authorizationToken,
        }),
      );
    },
    async updateRoleBranches(positionId, branchIds, authorizationToken) {
      await data(
        client.put(`/access/positions/${positionId}/branches`, {
          branchIds,
          authorizationToken,
        }),
      );
    },
    async updateCredentialBranches(
      credentialId,
      branchIds,
      authorizationToken,
    ) {
      await data(
        client.put(`/access/credentials/${credentialId}/branches`, {
          branchIds,
          authorizationToken,
        }),
      );
    },
    updateEmployeeCredential: (employeeId, input) =>
      data<PosCredentialSummaryDto>(
        client.put(`/access/employees/${employeeId}/credential`, input),
      ),
    changeTerminalBranch: (terminalId, branchId, authorizationToken) =>
      data<PosTerminalDto>(
        client.post(`/terminals/${terminalId}/branch`, {
          branchId,
          authorizationToken,
        }),
      ),
    catalogItems: (input = {}) =>
      data(client.get("/catalog/items", { params: input })),
    customerSearch: (query, page, pageSize) =>
      data(
        client.get("/customers/search", { params: { query, page, pageSize } }),
      ),
    createCustomer: (input) =>
      data<PosCustomerDto>(client.post("/customers", input)),
    updateCustomer: (id, input) =>
      data<PosCustomerDto>(client.put(`/customers/${id}`, input)),
    customerSources: () =>
      data<PosCustomerSourceDto[]>(client.get("/customers/sources")),
    createCustomerSource: (input) =>
      data<PosCustomerSourceDto>(client.post("/customers/sources", input)),
    updateCustomerSource: (id, input) =>
      data<PosCustomerSourceDto>(client.put(`/customers/sources/${id}`, input)),
    suppliers: () => data<PosSupplierDto[]>(client.get("/suppliers")),
    ticketConfiguration: () =>
      data<PosTicketConfigurationDto>(client.get("/settings/ticket")),
    customerRequiredFields: () =>
      data<PosCustomerRequiredFieldDto[]>(
        client.get("/settings/customer-fields"),
      ),
    updateCustomerRequiredField: (key, input) =>
      data<PosCustomerRequiredFieldDto>(
        client.put(
          `/settings/customer-fields/${encodeURIComponent(key)}`,
          input,
        ),
      ),
    voucherTemplates: () =>
      data<PosVoucherTemplateDto[]>(client.get("/settings/vouchers")),
    paymentMethods: () =>
      data<PosPaymentMethodDto[]>(client.get("/settings/payment-methods")),
    createPaymentMethod: (input) =>
      data<PosPaymentMethodDto>(
        client.post("/settings/payment-methods", input),
      ),
    updatePaymentMethod: (id, input) =>
      data<PosPaymentMethodDto>(
        client.put(`/settings/payment-methods/${id}`, input),
      ),
    paymentCatalogs: () =>
      data<PosPaymentCatalogsDto>(client.get("/settings/payment-catalogs")),
    createBank: (input) =>
      data<PosBankDto>(client.post("/settings/banks", input)),
    updateBank: (id, input) =>
      data<PosBankDto>(client.put(`/settings/banks/${id}`, input)),
    createCardNetwork: (input) =>
      data<PosCardNetworkDto>(client.post("/settings/card-networks", input)),
    updateCardNetwork: (id, input) =>
      data<PosCardNetworkDto>(
        client.put(`/settings/card-networks/${id}`, input),
      ),
    createInstallmentOption: (input) =>
      data<PosInstallmentOptionDto>(
        client.post("/settings/installment-options", input),
      ),
    updateInstallmentOption: (id, input) =>
      data<PosInstallmentOptionDto>(
        client.put(`/settings/installment-options/${id}`, input),
      ),
    courtesyConfiguration: () =>
      data<PosCourtesyConfigurationDto>(
        client.get("/settings/courtesy-configuration"),
      ),
    createCourtesyProduct: (input) =>
      data<PosCourtesyProductDto>(
        client.post("/settings/courtesy-products", input),
      ),
    updateCourtesyProduct: (id, input) =>
      data<PosCourtesyProductDto>(
        client.put(`/settings/courtesy-products/${id}`, input),
      ),
    createCourtesyPackage: (input) =>
      data<PosCourtesyPackageDto>(
        client.post("/settings/courtesy-packages", input),
      ),
    updateCourtesyPackage: (id, input) =>
      data<PosCourtesyPackageDto>(
        client.put(`/settings/courtesy-packages/${id}`, input),
      ),
    updateCourtesyConfiguration: (input) =>
      data<PosCourtesyConfigurationDto>(
        client.put("/settings/courtesy-configuration", input),
      ),
    commercialCompany: () =>
      data<PosCommercialCompanyDto | null>(
        client.get("/settings/commercial-company"),
      ),
    updateCommercialCompany: (input) =>
      data<PosCommercialCompanyDto>(
        client.put("/settings/commercial-company", input),
      ),
    updateEmployeeStatus: (employeeId, input) =>
      data(client.put(`/access/employees/${employeeId}/status`, input)),
    packages: () => data<PosPackageDto[]>(client.get("/packages")),
    competitions: () =>
      data<PosSalesCompetitionDto[]>(client.get("/competitions")),
    createCompetition: (input) =>
      data<PosSalesCompetitionDto>(client.post("/competitions", input)),
    updateCompetition: (id, input) =>
      data<PosSalesCompetitionDto>(client.put(`/competitions/${id}`, input)),
    deleteCompetition: (id) =>
      data<{ id: string }>(client.delete(`/competitions/${id}`)),
    saleSellers: (input = {}) =>
      data<PosSaleSellerDto[]>(client.get("/sale/sellers", { params: input })),
    inventoryLocations: () =>
      data<PosInventoryLocationDto[]>(client.get("/inventory/locations")),
    inventoryBalances: (locationId) =>
      data<PosInventoryBalanceDto[]>(
        client.get("/inventory/balances", { params: { locationId } }),
      ),
    inventoryMovements: (input = {}) =>
      data(client.get("/inventory/movements", { params: input })),
    inventoryAdjustmentBatches: () =>
      data<PosInventoryAdjustmentBatchDto[]>(
        client.get("/inventory/adjustment-batches", {
          params: { pageSize: 100 },
        }),
      ),
    createInventoryAdjustmentBatch: (input, key) =>
      data<PosInventoryAdjustmentBatchDto>(
        client.post("/inventory/adjustment-batches", input, {
          headers: mutationHeaders(key),
        }),
      ),
    updateInventoryAdjustmentBatch: (id, input, key) =>
      data<PosInventoryAdjustmentBatchDto>(
        client.put(`/inventory/adjustment-batches/${id}`, input, {
          headers: mutationHeaders(key),
        }),
      ),
    approveInventoryAdjustmentBatch: (id, key) =>
      data<PosInventoryAdjustmentBatchDto>(
        client.post(
          `/inventory/adjustment-batches/${id}/approve`,
          {},
          { headers: mutationHeaders(key) },
        ),
      ),
    cancelInventoryAdjustmentBatch: (id, key) =>
      data<PosInventoryAdjustmentBatchDto>(
        client.post(
          `/inventory/adjustment-batches/${id}/cancel`,
          {},
          { headers: mutationHeaders(key) },
        ),
      ),
    createInventoryCount: (input, key) =>
      data(
        client.post("/inventory/counts", input, {
          headers: mutationHeaders(key),
        }),
      ),
    inventoryCounts: (input) =>
      data(client.get("/inventory/counts", { params: input })),
    warehouseRequests: (input = {}) =>
      data(client.get("/warehouse/requests", { params: input })),
    createWarehouseRequest: (input, key) =>
      data<PosWarehouseRequestDto>(
        client.post("/warehouse/requests", input, {
          headers: mutationHeaders(key),
        }),
      ),
    warehouseRequestAction: (id, action, notes = null, key) =>
      data<PosWarehouseRequestDto>(
        client.post(
          `/warehouse/requests/${id}/${action}`,
          { notes },
          { headers: mutationHeaders(key) },
        ),
      ),
    notifications: (input = {}) =>
      data(
        client.get("/notifications", {
          params: { ...input, unreadOnly: input.unreadOnly ? "true" : "false" },
        }),
      ),
    markNotificationRead: (id) => data(client.put(`/notifications/${id}/read`)),
    markAllNotificationsRead: () => data(client.put("/notifications/read-all")),
    notificationPreferences: () =>
      data<PosNotificationPreferenceDto[]>(
        client.get("/notifications/preferences"),
      ),
    updateNotificationPreferences: (preferences) =>
      data(client.put("/notifications/preferences", { preferences })),
    quoteTicket: (input) =>
      data<PosTicketQuoteDto>(client.post("/tickets/quote", input)),
    createTicket: (input, key) =>
      data<PosTicketDto>(
        client.post("/tickets", input, { headers: mutationHeaders(key) }),
      ),
    agendaAvailability: (input) =>
      data<PosAgendaSlotDto[]>(
        client.get("/agenda/availability", { params: input }),
      ),
    reserveMembershipAppointment: (input, personalAuthorizationToken, key) =>
      data<PosTicketDto["appointments"][number]>(
        client.post("/agenda/membership-reservations", input, {
          headers: {
            ...mutationHeaders(key),
            "X-POS-Personal-Authorization": personalAuthorizationToken,
          },
        }),
      ),
    agendaConflicts: (input = {}) =>
      data(client.get("/agenda/conflicts", { params: input })),
    retryAgendaConflicts: (eventId) =>
      data(
        client.post("/agenda/conflicts/retry", {
          ...(eventId ? { eventId } : {}),
        }),
      ),
    resolveAgendaAttendanceCorrection: (input) =>
      data(client.post("/agenda/attendance-corrections", input)),
    tickets: (input = {}) =>
      data(
        client.get("/tickets", {
          params: { ...input, branchIds: input.branchIds?.join(",") },
        }),
      ),
    ticket: (id) => data<PosTicketDto>(client.get(`/tickets/${id}`)),
    addLayawayPayment: (id, payments, deliveredTicketLineIds = [], key) =>
      data<PosTicketDto>(
        client.post(
          `/layaways/${id}/payments`,
          { payments, deliveredTicketLineIds },
          { headers: mutationHeaders(key) },
        ),
      ),
    deliverOwedProduct: (id, quantity, key) =>
      data(
        client.post(
          `/owed-products/${id}/deliveries`,
          { quantity },
          { headers: mutationHeaders(key) },
        ),
      ),
    reviseTicket: (id, input, key) =>
      data<PosTicketEventDto>(
        client.post(`/tickets/${id}/revisions`, input, {
          headers: mutationHeaders(key),
        }),
      ),
    cancelTicket: (id, input, key) =>
      data<PosTicketEventDto>(
        client.post(`/tickets/${id}/cancellations`, input, {
          headers: mutationHeaders(key),
        }),
      ),
    vouchers: (input = {}) => data(client.get("/vouchers", { params: input })),
    issueVoucher: (ticketId, templateId, key) =>
      data<PosVoucherIssueDto>(
        client.post(
          `/tickets/${ticketId}/vouchers`,
          { templateId },
          { headers: mutationHeaders(key) },
        ),
      ),
    printVoucher: (issueId, key) =>
      data(
        client.post(
          `/vouchers/${issueId}/print`,
          {},
          { headers: mutationHeaders(key) },
        ),
      ),
    memberships: ({ personalAuthorizationToken, ...input }) =>
      data(
        client.get("/memberships", {
          params: { ...input, branchIds: input.branchIds?.join(",") },
          headers: {
            "X-POS-Personal-Authorization": personalAuthorizationToken,
          },
        }),
      ),
    membership: (id, personalAuthorizationToken) =>
      data<PosClientMembershipDto>(
        client.get(`/memberships/${id}`, {
          headers: {
            "X-POS-Personal-Authorization": personalAuthorizationToken,
          },
        }),
      ),
    updateMembershipProfile: (id, input, key) =>
      data<PosClientMembershipDto>(
        client.post(`/memberships/${id}/profile`, input, {
          headers: mutationHeaders(key),
        }),
      ),
    changeMembershipSeller: (id, input, key) =>
      data<PosClientMembershipDto>(
        client.post(`/memberships/${id}/seller`, input, {
          headers: mutationHeaders(key),
        }),
      ),
    changeMembershipStatus: (id, input, key) =>
      data<PosClientMembershipDto>(
        client.post(`/memberships/${id}/status`, input, {
          headers: mutationHeaders(key),
        }),
      ),
    recordMembershipAttendance: (id, input, key) =>
      data<PosClientMembershipDto>(
        client.post(`/memberships/${id}/attendance`, input, {
          headers: mutationHeaders(key),
        }),
      ),
    exportMemberships: (input) =>
      data(client.post("/memberships/export", input)),
    createMembershipClosure: (input, key) =>
      data<PosMembershipSalesClosureDto>(
        client.post("/memberships/closures", input, {
          headers: mutationHeaders(key),
        }),
      ),
    membershipClosures: ({ personalAuthorizationToken, branchIds, month }) =>
      data<PosMembershipSalesClosureDto[]>(
        client.get("/memberships/closures/history", {
          params: {
            branchIds: branchIds.join(","),
            ...(month ? { month } : {}),
          },
          headers: {
            "X-POS-Personal-Authorization": personalAuthorizationToken,
          },
        }),
      ),
    currentBusinessDay: () =>
      data<PosBusinessDayDto | null>(client.get("/business-days/current")),
    openBusinessDay: (input, key) =>
      data<PosBusinessDayDto>(
        client.post("/business-days/open", input, {
          headers: mutationHeaders(key),
        }),
      ),
    submitClosingCount: (id, input, key) =>
      data<PosBusinessDayDto>(
        client.post(`/business-days/${id}/closing-count`, input, {
          headers: mutationHeaders(key),
        }),
      ),
    closeBusinessDay: (id, authorizationToken, key) =>
      data<PosBusinessDayDto>(
        client.post(
          `/business-days/${id}/close`,
          { authorizationToken },
          { headers: mutationHeaders(key) },
        ),
      ),
    attendance: (input = {}) =>
      data(client.get("/attendance", { params: input })),
    clockIn: (pin, branchId, key) =>
      data<PosAttendanceDto>(
        client.post(
          "/attendance/clock-in",
          { pin, ...(branchId ? { branchId } : {}) },
          { headers: mutationHeaders(key) },
        ),
      ),
    clockOut: (attendanceId, pin, key) =>
      data<PosAttendanceDto>(
        client.post(
          `/attendance/${attendanceId}/clock-out`,
          { pin },
          { headers: mutationHeaders(key) },
        ),
      ),
    expenseTypes: () => data<PosExpenseTypeDto[]>(client.get("/expense-types")),
    createExpenseType: (input) =>
      data<PosExpenseTypeDto>(client.post("/expense-types", input)),
    updateExpenseType: (id, input) =>
      data<PosExpenseTypeDto>(client.put(`/expense-types/${id}`, input)),
    deleteExpenseType: (id) =>
      data<{ id: string }>(client.delete(`/expense-types/${id}`)),
    expenses: (input = {}) => data(client.get("/expenses", { params: input })),
    createExpense: (input, key) =>
      data<PosCashExpenseDto>(
        client.post("/expenses", input, { headers: mutationHeaders(key) }),
      ),
    correctExpense: (id, input, key) =>
      data<PosCashExpenseDto>(
        client.put(`/expenses/${id}`, input, { headers: mutationHeaders(key) }),
      ),
    voidExpense: (id, input, key) =>
      data<PosCashExpenseDto>(
        client.post(`/expenses/${id}/void`, input, {
          headers: mutationHeaders(key),
        }),
      ),
    dashboard: (input = {}) =>
      data<PosOperationalSummaryDto>(
        client.get("/dashboard", { params: input }),
      ),
    xReport: (input = {}) =>
      data<PosOperationalSummaryDto>(
        client.get("/reports/x-report", { params: input }),
      ),
    reportDataset: (key, input) =>
      data<PosReportDatasetDto>(
        client.get(`/reports/${key}`, {
          params: { ...input, branchIds: input.branchIds?.join(",") },
        }),
      ),
    exportDataset: (key, input) =>
      data<PosReportDatasetDto>(
        client.get(`/exports/${key}`, {
          params: { ...input, branchIds: input.branchIds?.join(",") },
        }),
      ),
    offlineBootstrap: () =>
      data<PosOfflineBootstrapDto>(client.get("/sync/bootstrap")),
    pushOfflineOperations: (grantToken, operations) =>
      data<PosOfflinePushResultDto>(
        client.post(
          "/sync/push",
          { operations },
          {
            headers: {
              Authorization: `Bearer ${grantToken}`,
              ...mutationHeaders(),
            },
          },
        ),
      ),
    clearSession: () => setAccessToken(null),
  };
}
