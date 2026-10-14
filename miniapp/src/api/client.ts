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

  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw this.responseError(error, response.status)
    }

    return response.json()
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
