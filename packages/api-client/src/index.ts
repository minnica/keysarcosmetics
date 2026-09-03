// Cliente HTTP compartido con interceptores de JWT y manejo de errores global
import axios, { type AxiosInstance, type AxiosError } from 'axios'
import type {
  ApiResponse,
  PosAccessBootstrapDto,
  PosBranchSummaryDto,
  PosCredentialSummaryDto,
  PosLoginRequestDto,
  PosMasterAuthorizationDto,
  PosMasterAuthorizationRequestDto,
  PosPermissionKey,
  PosSessionDto,
  PosTerminalDto,
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
    clearSession: () => setAccessToken(null),
  }
}
