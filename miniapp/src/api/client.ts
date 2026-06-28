const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

export interface ApiClientOptions {
  initDataRaw?: string
}

export class ApiClient {
  private initDataRaw?: string

  constructor(options: ApiClientOptions = {}) {
    this.initDataRaw = options.initDataRaw
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (this.initDataRaw) {
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
}
