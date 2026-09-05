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
  SchedulerAvailabilityExceptionsWriteDto,
  SchedulerAvailabilityRulesWriteDto,
  SchedulerBranchProfileWriteDto,
  SchedulerCommerceDto,
  SchedulerCommerceWriteDto,
  SchedulerOperationalCandidatesDto,
  SchedulerOperationalCatalogDto,
  SchedulerMutationResultDto,
  SchedulerProfessionalGroupWriteDto,
  SchedulerProfessionalProfileWriteDto,
  SchedulerProfessionalServiceWriteDto,
  SchedulerResourceWriteDto,
  SchedulerServiceProfileWriteDto,
  SchedulerServiceResourceRequirementWriteDto,
  SchedulerSpecialtyWriteDto,
  SchedulerCustomerDetailDto,
  SchedulerCustomerFieldDefinitionDto,
  SchedulerCustomerFieldDefinitionWriteDto,
  SchedulerCustomerFinancialHistoryDto,
  SchedulerCustomerMergeRequestDto,
  SchedulerCustomerMergeResultDto,
  SchedulerCustomerPageDto,
  SchedulerCustomerSearchRequest,
  SchedulerCustomerSourceDto,
  SchedulerCustomerSummaryDto,
  SchedulerCustomerVisitHistoryDto,
  SchedulerCustomerWriteDto,
  SchedulerAppointmentCreateDto,
  SchedulerAppointmentDto,
  SchedulerAppointmentListRequest,
  SchedulerAppointmentMoveDto,
  SchedulerAppointmentPageDto,
  SchedulerAppointmentStatusWriteDto,
  SchedulerAppointmentUpdateDto,
  SchedulerAvailabilityDto,
  SchedulerAvailabilityRequestDto,
  SchedulerScheduleBlockDto,
  SchedulerScheduleBlockWriteDto,
  SchedulerAdministrationCatalogDto,
  SchedulerAddonProfileWriteDto,
  SchedulerClassSchedulesWriteDto,
  SchedulerCommissionPolicyWriteDto,
  SchedulerGiftCardTemplateWriteDto,
  SchedulerPackageProfileWriteDto,
  SchedulerPosReferencesDto,
  SchedulerResolvedSettingDto,
  SchedulerSettingSection,
  SchedulerSettingWriteDto,
  SchedulerStatusColorDto,
  SchedulerStatusColorsWriteDto,
  SchedulerContactChannelDto,
  SchedulerContactChannelStatus,
  SchedulerConsentRecordDto,
  SchedulerConsentTemplateDto,
  SchedulerDocumentDto,
  SchedulerMedicalRecordDto,
  SchedulerMessageChannel,
  SchedulerMessageOutboxDto,
  SchedulerMessageTemplateDto,
  SchedulerMessageTemplateWriteDto,
  SchedulerSurveyDto,
  SchedulerSurveyPublicDto,
  SchedulerSurveyWriteDto,
  SchedulerReportDatasetDto,
  SchedulerReportKey,
  SchedulerReportRequest,
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
  operationalCandidates(): Promise<SchedulerOperationalCandidatesDto>;
  operationalCatalog(): Promise<SchedulerOperationalCatalogDto>;
  createCommerce(
    input: SchedulerCommerceWriteDto,
  ): Promise<SchedulerCommerceDto>;
  updateCommerce(
    id: string,
    input: SchedulerCommerceWriteDto,
  ): Promise<SchedulerCommerceDto>;
  updateBranchProfile(
    branchId: string,
    input: SchedulerBranchProfileWriteDto,
  ): Promise<SchedulerMutationResultDto>;
  updateProfessionalProfile(
    employeeId: string,
    input: SchedulerProfessionalProfileWriteDto,
  ): Promise<SchedulerMutationResultDto>;
  updateServiceProfile(
    catalogItemId: string,
    input: SchedulerServiceProfileWriteDto,
  ): Promise<SchedulerMutationResultDto>;
  createResource(
    input: SchedulerResourceWriteDto,
  ): Promise<SchedulerMutationResultDto>;
  updateResource(
    id: string,
    input: SchedulerResourceWriteDto,
  ): Promise<SchedulerMutationResultDto>;
  createSpecialty(
    input: SchedulerSpecialtyWriteDto,
  ): Promise<SchedulerMutationResultDto>;
  updateSpecialty(
    id: string,
    input: SchedulerSpecialtyWriteDto,
  ): Promise<SchedulerMutationResultDto>;
  createProfessionalGroup(
    input: SchedulerProfessionalGroupWriteDto,
  ): Promise<SchedulerMutationResultDto>;
  updateProfessionalGroup(
    id: string,
    input: SchedulerProfessionalGroupWriteDto,
  ): Promise<SchedulerMutationResultDto>;
  updateProfessionalService(
    input: SchedulerProfessionalServiceWriteDto,
  ): Promise<SchedulerMutationResultDto>;
  updateResourceRequirement(
    input: SchedulerServiceResourceRequirementWriteDto,
  ): Promise<SchedulerMutationResultDto>;
  replaceAvailabilityRules(
    input: SchedulerAvailabilityRulesWriteDto,
  ): Promise<SchedulerMutationResultDto[]>;
  replaceAvailabilityExceptions(
    input: SchedulerAvailabilityExceptionsWriteDto,
  ): Promise<SchedulerMutationResultDto[]>;
  searchCustomers(
    input: SchedulerCustomerSearchRequest,
  ): Promise<SchedulerCustomerPageDto>;
  customerSources(): Promise<SchedulerCustomerSourceDto[]>;
  customerFieldDefinitions(): Promise<SchedulerCustomerFieldDefinitionDto[]>;
  createCustomerFieldDefinition(
    input: SchedulerCustomerFieldDefinitionWriteDto,
  ): Promise<SchedulerCustomerFieldDefinitionDto>;
  updateCustomerFieldDefinition(
    id: string,
    input: SchedulerCustomerFieldDefinitionWriteDto,
  ): Promise<SchedulerCustomerFieldDefinitionDto>;
  createCustomer(
    input: SchedulerCustomerWriteDto,
  ): Promise<SchedulerCustomerSummaryDto>;
  updateCustomer(
    id: string,
    input: SchedulerCustomerWriteDto,
  ): Promise<SchedulerCustomerSummaryDto>;
  customerDetail(
    id: string,
    authorizationToken: string,
  ): Promise<SchedulerCustomerDetailDto>;
  customerVisits(
    id: string,
    authorizationToken: string,
    input?: { page?: number; pageSize?: number; branchId?: string },
  ): Promise<SchedulerCustomerVisitHistoryDto>;
  customerFinancialHistory(
    id: string,
    authorizationToken: string,
    input?: { page?: number; pageSize?: number; branchId?: string },
  ): Promise<SchedulerCustomerFinancialHistoryDto>;
  mergeCustomers(
    input: SchedulerCustomerMergeRequestDto,
  ): Promise<SchedulerCustomerMergeResultDto>;
  availability(
    input: SchedulerAvailabilityRequestDto,
  ): Promise<SchedulerAvailabilityDto>;
  appointments(
    input: SchedulerAppointmentListRequest,
  ): Promise<SchedulerAppointmentPageDto>;
  appointment(id: string): Promise<SchedulerAppointmentDto>;
  createAppointment(
    input: SchedulerAppointmentCreateDto,
    idempotencyKey: string,
  ): Promise<SchedulerAppointmentDto>;
  updateAppointment(
    id: string,
    input: SchedulerAppointmentUpdateDto,
  ): Promise<SchedulerAppointmentDto>;
  moveAppointment(
    id: string,
    input: SchedulerAppointmentMoveDto,
  ): Promise<SchedulerAppointmentDto>;
  changeAppointmentStatus(
    id: string,
    input: SchedulerAppointmentStatusWriteDto,
  ): Promise<SchedulerAppointmentDto>;
  cancelAppointment(
    id: string,
    input: { expectedVersion: number; reason: string },
  ): Promise<SchedulerAppointmentDto>;
  scheduleBlocks(input: {
    branchId: string;
    from: string;
    to: string;
  }): Promise<SchedulerScheduleBlockDto[]>;
  createScheduleBlock(
    input: SchedulerScheduleBlockWriteDto,
  ): Promise<SchedulerScheduleBlockDto>;
  updateScheduleBlock(
    id: string,
    input: SchedulerScheduleBlockWriteDto & { expectedVersion: number },
  ): Promise<SchedulerScheduleBlockDto>;
  cancelScheduleBlock(
    id: string,
    input: { expectedVersion: number; reason: string },
  ): Promise<SchedulerScheduleBlockDto>;
  administrationCatalog(): Promise<SchedulerAdministrationCatalogDto>;
  updatePackageProfile(
    posPackageId: string,
    input: SchedulerPackageProfileWriteDto,
  ): Promise<{ id: string; version: number }>;
  updateAddonProfile(
    catalogItemId: string,
    input: SchedulerAddonProfileWriteDto,
  ): Promise<{ id: string; version: number }>;
  replaceClassSchedules(
    serviceProfileId: string,
    input: SchedulerClassSchedulesWriteDto,
  ): Promise<{ ids: string[] }>;
  updateCommissionPolicy(
    input: SchedulerCommissionPolicyWriteDto,
  ): Promise<{ id: string; version: number }>;
  createGiftCard(
    input: SchedulerGiftCardTemplateWriteDto,
  ): Promise<{ id: string; version: number }>;
  updateGiftCard(
    id: string,
    input: SchedulerGiftCardTemplateWriteDto,
  ): Promise<{ id: string; version: number }>;
  updateStatusColors(
    commerceId: string,
    input: SchedulerStatusColorsWriteDto,
  ): Promise<SchedulerStatusColorDto[]>;
  resolvedSetting(
    section: SchedulerSettingSection,
    input: { commerceId: string; branchProfileId?: string },
  ): Promise<SchedulerResolvedSettingDto>;
  updateSetting(
    section: SchedulerSettingSection,
    input: SchedulerSettingWriteDto,
  ): Promise<{ id: string; version: number }>;
  posReferences(branchId?: string): Promise<SchedulerPosReferencesDto>;
  messageTemplates(): Promise<SchedulerMessageTemplateDto[]>;
  createMessageTemplate(
    input: SchedulerMessageTemplateWriteDto,
  ): Promise<{ id: string; version: number }>;
  updateMessageTemplate(
    id: string,
    input: SchedulerMessageTemplateWriteDto,
  ): Promise<{ id: string; version: number }>;
  contactChannels(customerId: string): Promise<SchedulerContactChannelDto[]>;
  updateContactChannel(
    customerId: string,
    input: {
      channel: SchedulerMessageChannel;
      status: SchedulerContactChannelStatus;
      source?: string | null;
      expectedVersion?: number;
    },
  ): Promise<{ version: number }>;
  enqueueMessage(
    input: {
      templateId: string;
      customerId: string;
      branchId: string;
      appointmentId?: string | null;
      scheduledAt: string;
      variables: Record<string, string>;
    },
    idempotencyKey: string,
  ): Promise<{ id: string; status: SchedulerMessageOutboxDto["status"] }>;
  messageOutbox(): Promise<SchedulerMessageOutboxDto[]>;
  retryMessage(id: string): Promise<{ id: string }>;
  consentTemplates(): Promise<SchedulerConsentTemplateDto[]>;
  uploadConsentTemplate(
    form: FormData,
    id?: string,
  ): Promise<{ id: string; documentId: string; version: number }>;
  assignConsent(input: {
    templateVersionId: string;
    customerId: string;
    branchId: string;
    appointmentId?: string | null;
  }): Promise<SchedulerConsentRecordDto>;
  consentRecords(input: {
    customerId: string;
    branchId: string;
  }): Promise<SchedulerConsentRecordDto[]>;
  updateConsentStatus(
    id: string,
    form: FormData,
  ): Promise<SchedulerConsentRecordDto>;
  uploadCustomerDocument(
    customerId: string,
    form: FormData,
  ): Promise<{ id: string; sha256: string }>;
  customerDocuments(
    customerId: string,
    branchId: string,
    authorizationToken: string,
  ): Promise<SchedulerDocumentDto[]>;
  privateDocumentUrl(
    kind: "consent" | "signed-consent" | "customer",
    id: string,
    authorizationToken: string,
  ): Promise<{ url: string; expiresInSeconds: number }>;
  medicalRecord(
    customerId: string,
    commerceId: string,
    authorizationToken: string,
  ): Promise<SchedulerMedicalRecordDto>;
  updateMedicalRecord(
    customerId: string,
    input: {
      commerceId: string;
      fields: Record<string, unknown>;
      expectedVersion?: number;
      authorizationToken: string;
    },
  ): Promise<{ version: number; updatedAt: string }>;
  surveys(): Promise<SchedulerSurveyDto[]>;
  createSurvey(
    input: SchedulerSurveyWriteDto,
  ): Promise<{ id: string; version: number; versionId: string }>;
  updateSurvey(
    id: string,
    input: SchedulerSurveyWriteDto,
  ): Promise<{ id: string; version: number; versionId: string }>;
  issueSurveyToken(
    id: string,
    input: {
      customerId: string;
      appointmentId?: string | null;
      expiresAt: string;
    },
  ): Promise<{ token: string; expiresAt: string }>;
  publicSurvey(token: string): Promise<SchedulerSurveyPublicDto>;
  submitSurvey(
    token: string,
    answers: Array<{ questionId: string; value: unknown }>,
  ): Promise<{ id: string }>;
  report(
    key: SchedulerReportKey,
    input: SchedulerReportRequest,
  ): Promise<SchedulerReportDatasetDto>;
  exportReport(
    key: SchedulerReportKey,
    input: SchedulerReportRequest,
    authorizationToken?: string,
  ): Promise<SchedulerReportDatasetDto>;
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
    operationalCandidates: () =>
      data<SchedulerOperationalCandidatesDto>(
        client.get("/api/scheduler/operations/candidates"),
      ),
    operationalCatalog: () =>
      data<SchedulerOperationalCatalogDto>(
        client.get("/api/scheduler/operations/catalog"),
      ),
    createCommerce: (input) =>
      data(client.post("/api/scheduler/operations/commerces", input)),
    updateCommerce: (id, input) =>
      data(client.put(`/api/scheduler/operations/commerces/${id}`, input)),
    updateBranchProfile: (branchId, input) =>
      data(client.put(`/api/scheduler/operations/branches/${branchId}`, input)),
    updateProfessionalProfile: (employeeId, input) =>
      data(
        client.put(
          `/api/scheduler/operations/professionals/${employeeId}`,
          input,
        ),
      ),
    updateServiceProfile: (catalogItemId, input) =>
      data(
        client.put(
          `/api/scheduler/operations/services/${catalogItemId}`,
          input,
        ),
      ),
    createResource: (input) =>
      data(client.post("/api/scheduler/operations/resources", input)),
    updateResource: (id, input) =>
      data(client.put(`/api/scheduler/operations/resources/${id}`, input)),
    createSpecialty: (input) =>
      data(client.post("/api/scheduler/operations/specialties", input)),
    updateSpecialty: (id, input) =>
      data(client.put(`/api/scheduler/operations/specialties/${id}`, input)),
    createProfessionalGroup: (input) =>
      data(client.post("/api/scheduler/operations/groups", input)),
    updateProfessionalGroup: (id, input) =>
      data(client.put(`/api/scheduler/operations/groups/${id}`, input)),
    updateProfessionalService: (input) =>
      data(
        client.put("/api/scheduler/operations/professional-services", input),
      ),
    updateResourceRequirement: (input) =>
      data(
        client.put("/api/scheduler/operations/resource-requirements", input),
      ),
    replaceAvailabilityRules: (input) =>
      data(client.put("/api/scheduler/operations/availability/rules", input)),
    replaceAvailabilityExceptions: (input) =>
      data(
        client.put("/api/scheduler/operations/availability/exceptions", input),
      ),
    searchCustomers: (input) =>
      data<SchedulerCustomerPageDto>(
        client.get("/api/scheduler/clients/search", { params: input }),
      ),
    customerSources: () =>
      data<SchedulerCustomerSourceDto[]>(
        client.get("/api/scheduler/clients/sources"),
      ),
    customerFieldDefinitions: () =>
      data<SchedulerCustomerFieldDefinitionDto[]>(
        client.get("/api/scheduler/clients/field-definitions"),
      ),
    createCustomerFieldDefinition: (input) =>
      data<SchedulerCustomerFieldDefinitionDto>(
        client.post("/api/scheduler/clients/field-definitions", input),
      ),
    updateCustomerFieldDefinition: (id, input) =>
      data<SchedulerCustomerFieldDefinitionDto>(
        client.put(`/api/scheduler/clients/field-definitions/${id}`, input),
      ),
    createCustomer: (input) =>
      data<SchedulerCustomerSummaryDto>(
        client.post("/api/scheduler/clients", input),
      ),
    updateCustomer: (id, input) =>
      data<SchedulerCustomerSummaryDto>(
        client.put(`/api/scheduler/clients/${id}`, input),
      ),
    customerDetail: (id, authorizationToken) =>
      data<SchedulerCustomerDetailDto>(
        client.get(`/api/scheduler/clients/${id}`, {
          headers: { "x-scheduler-authorization": authorizationToken },
        }),
      ),
    customerVisits: (id, authorizationToken, input = {}) =>
      data<SchedulerCustomerVisitHistoryDto>(
        client.get(`/api/scheduler/clients/${id}/visits`, {
          params: input,
          headers: { "x-scheduler-authorization": authorizationToken },
        }),
      ),
    customerFinancialHistory: (id, authorizationToken, input = {}) =>
      data<SchedulerCustomerFinancialHistoryDto>(
        client.get(`/api/scheduler/clients/${id}/financial-history`, {
          params: input,
          headers: { "x-scheduler-authorization": authorizationToken },
        }),
      ),
    mergeCustomers: (input) =>
      data<SchedulerCustomerMergeResultDto>(
        client.post("/api/scheduler/clients/merge", input),
      ),
    availability: (input) =>
      data<SchedulerAvailabilityDto>(
        client.get("/api/scheduler/availability", { params: input }),
      ),
    appointments: (input) =>
      data<SchedulerAppointmentPageDto>(
        client.get("/api/scheduler/appointments", { params: input }),
      ),
    appointment: (id) =>
      data<SchedulerAppointmentDto>(
        client.get(`/api/scheduler/appointments/${id}`),
      ),
    createAppointment: (input, key) =>
      data<SchedulerAppointmentDto>(
        client.post("/api/scheduler/appointments", input, {
          headers: { "Idempotency-Key": key },
        }),
      ),
    updateAppointment: (id, input) =>
      data<SchedulerAppointmentDto>(
        client.put(`/api/scheduler/appointments/${id}`, input),
      ),
    moveAppointment: (id, input) =>
      data<SchedulerAppointmentDto>(
        client.post(`/api/scheduler/appointments/${id}/move`, input),
      ),
    changeAppointmentStatus: (id, input) =>
      data<SchedulerAppointmentDto>(
        client.post(`/api/scheduler/appointments/${id}/status`, input),
      ),
    cancelAppointment: (id, input) =>
      data<SchedulerAppointmentDto>(
        client.post(`/api/scheduler/appointments/${id}/cancel`, input),
      ),
    scheduleBlocks: (input) =>
      data<SchedulerScheduleBlockDto[]>(
        client.get("/api/scheduler/blocks", { params: input }),
      ),
    createScheduleBlock: (input) =>
      data<SchedulerScheduleBlockDto>(
        client.post("/api/scheduler/blocks", input),
      ),
    updateScheduleBlock: (id, input) =>
      data<SchedulerScheduleBlockDto>(
        client.put(`/api/scheduler/blocks/${id}`, input),
      ),
    cancelScheduleBlock: (id, input) =>
      data<SchedulerScheduleBlockDto>(
        client.post(`/api/scheduler/blocks/${id}/cancel`, input),
      ),
    administrationCatalog: () =>
      data<SchedulerAdministrationCatalogDto>(
        client.get("/api/scheduler/administration/catalog"),
      ),
    updatePackageProfile: (posPackageId, input) =>
      data<{ id: string; version: number }>(
        client.put(
          `/api/scheduler/administration/packages/${posPackageId}`,
          input,
        ),
      ),
    updateAddonProfile: (catalogItemId, input) =>
      data<{ id: string; version: number }>(
        client.put(
          `/api/scheduler/administration/addons/${catalogItemId}`,
          input,
        ),
      ),
    replaceClassSchedules: (serviceProfileId, input) =>
      data<{ ids: string[] }>(
        client.put(
          `/api/scheduler/administration/classes/${serviceProfileId}/schedules`,
          input,
        ),
      ),
    updateCommissionPolicy: (input) =>
      data<{ id: string; version: number }>(
        client.put("/api/scheduler/administration/commission-policies", input),
      ),
    createGiftCard: (input) =>
      data<{ id: string; version: number }>(
        client.post("/api/scheduler/administration/gift-cards", input),
      ),
    updateGiftCard: (id, input) =>
      data<{ id: string; version: number }>(
        client.put(`/api/scheduler/administration/gift-cards/${id}`, input),
      ),
    updateStatusColors: (commerceId, input) =>
      data<SchedulerStatusColorDto[]>(
        client.put(
          `/api/scheduler/administration/status-colors/${commerceId}`,
          input,
        ),
      ),
    resolvedSetting: (section, input) =>
      data<SchedulerResolvedSettingDto>(
        client.get(
          `/api/scheduler/administration/settings/${section}/resolved`,
          {
            params: input,
          },
        ),
      ),
    updateSetting: (section, input) =>
      data<{ id: string; version: number }>(
        client.put(`/api/scheduler/administration/settings/${section}`, input),
      ),
    posReferences: (branchId) =>
      data<SchedulerPosReferencesDto>(
        client.get("/api/scheduler/administration/pos-references", {
          params: branchId ? { branchId } : undefined,
        }),
      ),
    messageTemplates: () =>
      data<SchedulerMessageTemplateDto[]>(
        client.get("/api/scheduler/communications/templates"),
      ),
    createMessageTemplate: (input) =>
      data<{ id: string; version: number }>(
        client.post("/api/scheduler/communications/templates", input),
      ),
    updateMessageTemplate: (id, input) =>
      data<{ id: string; version: number }>(
        client.put(`/api/scheduler/communications/templates/${id}`, input),
      ),
    contactChannels: (customerId) =>
      data<SchedulerContactChannelDto[]>(
        client.get(
          `/api/scheduler/communications/customers/${customerId}/contact-channels`,
        ),
      ),
    updateContactChannel: (customerId, input) =>
      data<{ version: number }>(
        client.put(
          `/api/scheduler/communications/customers/${customerId}/contact-channels`,
          input,
        ),
      ),
    enqueueMessage: (input, idempotencyKey) =>
      data<{ id: string; status: SchedulerMessageOutboxDto["status"] }>(
        client.post("/api/scheduler/communications/outbox", input, {
          headers: { "Idempotency-Key": idempotencyKey },
        }),
      ),
    messageOutbox: () =>
      data<SchedulerMessageOutboxDto[]>(
        client.get("/api/scheduler/communications/outbox"),
      ),
    retryMessage: (id) =>
      data<{ id: string }>(
        client.post(`/api/scheduler/communications/outbox/${id}/retry`),
      ),
    consentTemplates: () =>
      data<SchedulerConsentTemplateDto[]>(
        client.get("/api/scheduler/documents/consent-templates"),
      ),
    uploadConsentTemplate: (form, id) =>
      data<{ id: string; documentId: string; version: number }>(
        client.post(
          `/api/scheduler/documents/consent-templates${id ? `/${id}` : ""}`,
          form,
          { headers: { "Content-Type": "multipart/form-data" } },
        ),
      ),
    assignConsent: (input) =>
      data<SchedulerConsentRecordDto>(
        client.post("/api/scheduler/documents/consent-records", input),
      ),
    consentRecords: (input) =>
      data<SchedulerConsentRecordDto[]>(
        client.get("/api/scheduler/documents/consent-records", {
          params: input,
        }),
      ),
    updateConsentStatus: (id, form) =>
      data<SchedulerConsentRecordDto>(
        client.post(
          `/api/scheduler/documents/consent-records/${id}/status`,
          form,
          { headers: { "Content-Type": "multipart/form-data" } },
        ),
      ),
    uploadCustomerDocument: (customerId, form) =>
      data<{ id: string; sha256: string }>(
        client.post(`/api/scheduler/documents/customers/${customerId}`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        }),
      ),
    customerDocuments: (customerId, branchId, authorizationToken) =>
      data<SchedulerDocumentDto[]>(
        client.get(`/api/scheduler/documents/customers/${customerId}`, {
          params: { branchId },
          headers: { "x-scheduler-authorization": authorizationToken },
        }),
      ),
    privateDocumentUrl: (kind, id, authorizationToken) =>
      data<{ url: string; expiresInSeconds: number }>(
        client.post(`/api/scheduler/documents/${kind}/${id}/signed-url`, {
          authorizationToken,
        }),
      ),
    medicalRecord: (customerId, commerceId, authorizationToken) =>
      data<SchedulerMedicalRecordDto>(
        client.get(`/api/scheduler/medical-records/${customerId}`, {
          params: { commerceId },
          headers: { "x-scheduler-authorization": authorizationToken },
        }),
      ),
    updateMedicalRecord: (customerId, input) =>
      data<{ version: number; updatedAt: string }>(
        client.put(`/api/scheduler/medical-records/${customerId}`, input),
      ),
    surveys: () =>
      data<SchedulerSurveyDto[]>(client.get("/api/scheduler/surveys")),
    createSurvey: (input) =>
      data<{ id: string; version: number; versionId: string }>(
        client.post("/api/scheduler/surveys", input),
      ),
    updateSurvey: (id, input) =>
      data<{ id: string; version: number; versionId: string }>(
        client.put(`/api/scheduler/surveys/${id}`, input),
      ),
    issueSurveyToken: (id, input) =>
      data<{ token: string; expiresAt: string }>(
        client.post(`/api/scheduler/surveys/${id}/tokens`, input),
      ),
    publicSurvey: (token) =>
      data<SchedulerSurveyPublicDto>(
        client.get(`/api/scheduler/surveys/respond/${token}`),
      ),
    submitSurvey: (token, answers) =>
      data<{ id: string }>(
        client.post(`/api/scheduler/surveys/respond/${token}`, { answers }),
      ),
    report: (key, input) =>
      data<SchedulerReportDatasetDto>(
        client.get(`/api/scheduler/reports/${key}`, {
          params: {
            ...input,
            branchIds: input.branchIds?.join(","),
          },
        }),
      ),
    exportReport: (key, input, authorizationToken) =>
      data<SchedulerReportDatasetDto>(
        client.get(`/api/scheduler/exports/${key}`, {
          params: {
            ...input,
            branchIds: input.branchIds?.join(","),
          },
          ...(authorizationToken
            ? {
                headers: {
                  "x-scheduler-authorization": authorizationToken,
                },
              }
            : {}),
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
