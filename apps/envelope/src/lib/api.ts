// Cliente HTTP de la app envelope — apunta al backend vía variable de entorno
import { createApiClient } from '@cosmetics/api-client'

const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000'

export const api = createApiClient(apiUrl)
