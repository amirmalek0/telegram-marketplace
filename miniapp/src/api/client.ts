const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

export const PHONE_ACCESS_EVENT = 'phone-access-required'

export interface ApiClientOptions {
  initDataRaw?: string
  bearerToken?: string
}

export class ApiClient {
  private initDataRaw?: string
  private bearerToken?: string

  constructor(options: ApiClientOptions = {}) {
    this.initDataRaw = options.initDataRaw
    this.bearerToken = options.bearerToken
  }

  private responseError(error: { error?: string; code?: string }, status: number): Error {
    if (this.bearerToken && status === 401) window.dispatchEvent(new Event('miniapp-editor-auth-required'))
    if (this.initDataRaw && !this.bearerToken && (error.code === 'PHONE_VERIFICATION_REQUIRED' || error.code === 'PHONE_VERIFICATION_UNAVAILABLE')) {
      window.dispatchEvent(new CustomEvent(PHONE_ACCESS_EVENT, { detail: error.code }))
    }
    return new Error(error.error || `HTTP ${status}`)
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (this.bearerToken) {
      headers['Authorization'] = `Bearer ${this.bearerToken}`
    } else if (this.initDataRaw) {
      headers['Authorization'] = `tma ${this.initDataRaw}`
    }

    return headers
  }

  async get<T>(path: string, signal?: AbortSignal): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      signal,
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw this.responseError(error, response.status)
    }

    return response.json()
  }

  async photo(path: string, signal?: AbortSignal): Promise<Blob> {
    if (!/^\/user\/[\da-f-]{36}\/photos\/[\da-f-]{36}\/content$/i.test(path)) throw new Error('Invalid photo path')
    const response = await fetch(`${API_BASE_URL}${path}`, { headers: this.getHeaders(), signal })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Photo unavailable' }))
      throw this.responseError(error, response.status)
    }
    const blob = await response.blob()
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(blob.type)) throw new Error('Invalid photo')
    return blob
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw this.responseError(error, response.status)
    }

    return response.status === 204 ? undefined as T : response.json()
  }

  async upload<T>(path: string, body: FormData): Promise<T> {
    const headers = new Headers(this.getHeaders())
    headers.delete('Content-Type')
    const response = await fetch(`${API_BASE_URL}${path}`, { method: 'POST', headers, body })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'بارگذاری ناموفق بود' }))
      throw this.responseError(error, response.status)
    }
    return response.json()
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw this.responseError(error, response.status)
    }

    return response.json()
  }

  async delete(path: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw this.responseError(error, response.status)
    }
  }
}
