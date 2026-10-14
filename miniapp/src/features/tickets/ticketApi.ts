import { ApiClient } from '../../api/client'
import type {
  CreateTicketInput,
  PaginatedTicketResponse,
  Ticket,
  TicketCategory,
  TicketMessage,
  TicketWithMessages,
} from './types'

export class TicketApi {
  private client: ApiClient

  constructor(initDataRaw: string) {
    this.client = new ApiClient({ initDataRaw })
  }

  listTickets() {
    return this.client.get<PaginatedTicketResponse<Ticket>>('/ticket?per_page=100')
  }

  listCategories() {
    return this.client.get<PaginatedTicketResponse<TicketCategory>>('/ticket/category?per_page=100')
  }

  getTicket(ticketId: string, signal?: AbortSignal) {
    return this.client.get<TicketWithMessages>(`/ticket/${encodeURIComponent(ticketId)}`, signal)
  }

  createTicket(input: CreateTicketInput) {
    return this.client.post<Ticket>('/ticket', input)
  }

  addMessage(ticketId: string, message: string) {
    return this.client.post<TicketMessage>(`/ticket/${encodeURIComponent(ticketId)}/messages`, { message })
  }
}
