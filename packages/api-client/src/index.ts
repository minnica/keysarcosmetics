// Cliente HTTP compartido con interceptores de JWT y manejo de errores global
import axios, { type AxiosInstance, type AxiosError } from 'axios'
import type { ApiResponse } from '@cosmetics/types'

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
