const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

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
      throw new Error(error.error || `HTTP ${response.status}`)
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
      throw new Error(error.error || `HTTP ${response.status}`)
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
      throw new Error(error.error || `HTTP ${response.status}`)
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
      throw new Error(error.error || `HTTP ${response.status}`)
    }
  }
}
