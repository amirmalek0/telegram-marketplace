export type TicketStatus = 'open' | 'in_progress' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TicketSender = 'user' | 'admin'

export interface PaginatedTicketResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
  has_next_page: boolean
  has_prev_page: boolean
}

export interface Ticket {
  id: string
  user_id: string
  subject: string
  status: TicketStatus
  priority: TicketPriority
  category: string
  created_at: string
  updated_at: string
  closed_at?: string
  last_message_at: string
}

export interface TicketMessage {
  id: string
  ticket_id: string
  sender_type: TicketSender
  sender_id: string
  message: string
  created_at: string
}

export interface TicketWithMessages {
  ticket: Ticket
  messages: TicketMessage[]
}

export interface TicketCategory {
  id: string
  name: string
  created_at: string
}

export interface CreateTicketInput {
  subject: string
  priority: TicketPriority
  category: string
  message: string
}
