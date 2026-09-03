// Cliente HTTP compartido con interceptores de JWT y manejo de errores global
import axios, { type AxiosInstance, type AxiosError } from 'axios'
import type {
  ApiResponse,
  PosAccessBootstrapDto,
  PosBranchSummaryDto,
  PosCatalogItemDto,
  PosCatalogItemWithCostsDto,
  PosCredentialSummaryDto,
  PosCustomerDto,
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
  PosPermissionKey,
  PosSessionDto,
  PosSupplierDto,
  PosTerminalDto,
  PosTicketConfigurationDto,
  PosVoucherTemplateDto,
  PosWarehouseRequestCreateDto,
  PosWarehouseRequestDto,
  PosNotificationDto,
} from '@cosmetics/types'

/**
 * Crea una instancia de axios lista para consumir el backend.
 * La URL base se inyecta por variable de entorno en cada app.
 */
export function createApiClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 15_000,
  })

  // Interceptor de solicitud: agrega el JWT en el header Authorization
  client.interceptors.request.use((config) => {
    // El token se lee de localStorage (solo en el browser)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token')
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`
      }
    }
    return config
  })

  // Interceptor de respuesta: manejo de errores globales
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiResponse<unknown>>) => {
      // 401 → limpiar sesión y redirigir al login
      if (error.response?.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('auth_token')
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }
  )

  return client
}

export interface PosApiClientOptions {
  getAccessToken?: () => string | null
  setAccessToken?: (token: string | null) => void
}

export interface PosApiClient {
  login(input: PosLoginRequestDto): Promise<PosSessionDto>
  me(): Promise<PosSessionDto>
  branches(): Promise<PosBranchSummaryDto[]>
  accessBootstrap(): Promise<PosAccessBootstrapDto>
  createAuthorization(input: PosMasterAuthorizationRequestDto): Promise<PosMasterAuthorizationDto>
  verifyAuthorization(authorizationToken: string, purpose: string): Promise<boolean>
  updateRolePermissions(positionId: string, permissions: PosPermissionKey[], authorizationToken: string): Promise<void>
  updateEmployeeCredential(
    employeeId: string,
    input: {
      alias: string
      pin?: string
      active: boolean
      offlineEnabled: boolean
      isMaster: boolean
      authorizationToken: string
    },
  ): Promise<PosCredentialSummaryDto>
  changeTerminalBranch(terminalId: string, branchId: string, authorizationToken: string): Promise<PosTerminalDto>
  catalogItems(input?: { query?: string; page?: number; pageSize?: number }): Promise<{ items: Array<PosCatalogItemDto | PosCatalogItemWithCostsDto>; page: number; pageSize: number; total: number }>
  customerSearch(query: string, page?: number, pageSize?: number): Promise<{ items: PosCustomerDto[]; page: number; pageSize: number; total: number }>
  createCustomer(input: { displayName: string; phone?: string | null; email?: string | null; sourceId?: string | null; notes?: string | null; active?: boolean; branchId?: string | null; employeeId?: string | null }): Promise<PosCustomerDto>
  customerSources(): Promise<PosCustomerSourceDto[]>
  suppliers(): Promise<PosSupplierDto[]>
  ticketConfiguration(): Promise<PosTicketConfigurationDto>
  voucherTemplates(): Promise<PosVoucherTemplateDto[]>
  inventoryLocations(): Promise<PosInventoryLocationDto[]>
  inventoryBalances(locationId?: string): Promise<PosInventoryBalanceDto[]>
  inventoryMovements(input?: { locationId?: string; businessDate?: string; page?: number; pageSize?: number }): Promise<{ items: PosInventoryMovementDto[]; page: number; pageSize: number; total: number }>
  inventoryAdjustmentBatches(): Promise<PosInventoryAdjustmentBatchDto[]>
  createInventoryAdjustmentBatch(input: { notes?: string | null; lines: PosInventoryAdjustmentLineInputDto[] }, idempotencyKey?: string): Promise<PosInventoryAdjustmentBatchDto>
  updateInventoryAdjustmentBatch(id: string, input: { notes?: string | null; lines: PosInventoryAdjustmentLineInputDto[] }, idempotencyKey?: string): Promise<PosInventoryAdjustmentBatchDto>
  approveInventoryAdjustmentBatch(id: string, idempotencyKey?: string): Promise<PosInventoryAdjustmentBatchDto>
  cancelInventoryAdjustmentBatch(id: string, idempotencyKey?: string): Promise<PosInventoryAdjustmentBatchDto>
  createInventoryCount(input: { kind: "OPENING" | "CLOSING"; businessDate: string; locationId: string; notes?: string; lines: Array<{ itemId: string; countedQuantity: string }> }, idempotencyKey?: string): Promise<PosInventoryCountDto | PosAuditedInventoryCountDto>
  inventoryCounts(input: { locationId: string; businessDate: string; kind?: "OPENING" | "CLOSING" }): Promise<Array<PosInventoryCountDto | PosAuditedInventoryCountDto>>
  warehouseRequests(input?: { page?: number; pageSize?: number }): Promise<{ items: PosWarehouseRequestDto[]; page: number; pageSize: number; total: number }>
  createWarehouseRequest(input: PosWarehouseRequestCreateDto, idempotencyKey?: string): Promise<PosWarehouseRequestDto>
  warehouseRequestAction(id: string, action: "approve-creation" | "approve-send" | "receive" | "return-to-requested" | "cancel", notes?: string | null, idempotencyKey?: string): Promise<PosWarehouseRequestDto>
  notifications(input?: { unreadOnly?: boolean; page?: number; pageSize?: number }): Promise<{ items: PosNotificationDto[]; page: number; pageSize: number; total: number }>
  markNotificationRead(id: string): Promise<{ notificationId: string; readAt: string }>
  clearSession(): void
}

/** Cliente aislado del JWT compartido de Envelope/Payroll. */
export function createPosApiClient(baseURL: string, options: PosApiClientOptions = {}): PosApiClient {
  const storageKey = 'pos_access_token'
  const getAccessToken = options.getAccessToken ?? (() =>
    typeof window === 'undefined' ? null : window.sessionStorage.getItem(storageKey))
  const setAccessToken = options.setAccessToken ?? ((token: string | null) => {
    if (typeof window === 'undefined') return
    if (token) window.sessionStorage.setItem(storageKey, token)
    else window.sessionStorage.removeItem(storageKey)
  })
  const client = axios.create({
    baseURL: `${baseURL.replace(/\/$/, '')}/api/pos`,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15_000,
  })

  client.interceptors.request.use((config) => {
    const token = getAccessToken()
    if (token) config.headers['Authorization'] = `Bearer ${token}`
    return config
  })
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiResponse<unknown>>) => {
      if (error.response?.status === 401) setAccessToken(null)
      return Promise.reject(error)
    },
  )

  const data = async <T>(request: Promise<{ data: ApiResponse<T> }>): Promise<T> =>
    (await request).data.data
  const mutationHeaders = (key: string = globalThis.crypto.randomUUID()) => ({ 'Idempotency-Key': key })

  return {
    async login(input) {
      const session = await data<PosSessionDto>(client.post('/auth/login', input))
      setAccessToken(session.accessToken)
      return session
    },
    me: () => data<PosSessionDto>(client.get('/auth/me')),
    branches: () => data<PosBranchSummaryDto[]>(client.get('/branches')),
    accessBootstrap: () => data<PosAccessBootstrapDto>(client.get('/access/bootstrap')),
    createAuthorization: (input) =>
      data<PosMasterAuthorizationDto>(client.post('/authorizations', input)),
    async verifyAuthorization(authorizationToken, purpose) {
      const result = await data<{ verified: boolean }>(
        client.post('/auth/verify', { authorizationToken, purpose }),
      )
      return result.verified
    },
    async updateRolePermissions(positionId, permissions, authorizationToken) {
      await data(client.put(`/access/positions/${positionId}/permissions`, { permissions, authorizationToken }))
    },
    updateEmployeeCredential: (employeeId, input) =>
      data<PosCredentialSummaryDto>(client.put(`/access/employees/${employeeId}/credential`, input)),
    changeTerminalBranch: (terminalId, branchId, authorizationToken) =>
      data<PosTerminalDto>(client.post(`/terminals/${terminalId}/branch`, { branchId, authorizationToken })),
    catalogItems: (input = {}) => data(client.get('/catalog/items', { params: input })),
    customerSearch: (query, page, pageSize) => data(client.get('/customers/search', { params: { query, page, pageSize } })),
    createCustomer: (input) => data<PosCustomerDto>(client.post('/customers', input)),
    customerSources: () => data<PosCustomerSourceDto[]>(client.get('/customers/sources')),
    suppliers: () => data<PosSupplierDto[]>(client.get('/suppliers')),
    ticketConfiguration: () => data<PosTicketConfigurationDto>(client.get('/settings/ticket')),
    voucherTemplates: () => data<PosVoucherTemplateDto[]>(client.get('/settings/vouchers')),
    inventoryLocations: () => data<PosInventoryLocationDto[]>(client.get('/inventory/locations')),
    inventoryBalances: (locationId) => data<PosInventoryBalanceDto[]>(client.get('/inventory/balances', { params: { locationId } })),
    inventoryMovements: (input = {}) => data(client.get('/inventory/movements', { params: input })),
    inventoryAdjustmentBatches: () => data<PosInventoryAdjustmentBatchDto[]>(client.get('/inventory/adjustment-batches', { params: { pageSize: 100 } })),
    createInventoryAdjustmentBatch: (input, key) => data<PosInventoryAdjustmentBatchDto>(client.post('/inventory/adjustment-batches', input, { headers: mutationHeaders(key) })),
    updateInventoryAdjustmentBatch: (id, input, key) => data<PosInventoryAdjustmentBatchDto>(client.put(`/inventory/adjustment-batches/${id}`, input, { headers: mutationHeaders(key) })),
    approveInventoryAdjustmentBatch: (id, key) => data<PosInventoryAdjustmentBatchDto>(client.post(`/inventory/adjustment-batches/${id}/approve`, {}, { headers: mutationHeaders(key) })),
    cancelInventoryAdjustmentBatch: (id, key) => data<PosInventoryAdjustmentBatchDto>(client.post(`/inventory/adjustment-batches/${id}/cancel`, {}, { headers: mutationHeaders(key) })),
    createInventoryCount: (input, key) => data(client.post('/inventory/counts', input, { headers: mutationHeaders(key) })),
    inventoryCounts: (input) => data(client.get('/inventory/counts', { params: input })),
    warehouseRequests: (input = {}) => data(client.get('/warehouse/requests', { params: input })),
    createWarehouseRequest: (input, key) => data<PosWarehouseRequestDto>(client.post('/warehouse/requests', input, { headers: mutationHeaders(key) })),
    warehouseRequestAction: (id, action, notes = null, key) => data<PosWarehouseRequestDto>(client.post(`/warehouse/requests/${id}/${action}`, { notes }, { headers: mutationHeaders(key) })),
    notifications: (input = {}) => data(client.get('/notifications', { params: { ...input, unreadOnly: input.unreadOnly ? 'true' : 'false' } })),
    markNotificationRead: (id) => data(client.put(`/notifications/${id}/read`)),
    clearSession: () => setAccessToken(null),
  }
}
