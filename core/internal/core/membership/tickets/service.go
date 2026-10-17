package tickets

import (
	"context"
	"errors"
	"fmt"
	"time"

	categoryrepo "telegram-marketplace/internal/core/membership/ticket-categories/repository"
	"telegram-marketplace/internal/core/membership/tickets/model"
	ticketrepo "telegram-marketplace/internal/core/membership/tickets/repository"
	"telegram-marketplace/internal/core/membership/users"
	"telegram-marketplace/pkg/pagination"
)

// ErrInvalidCategory is returned when a ticket category does not exist.
var ErrInvalidCategory = fmt.Errorf("invalid ticket category")

// ErrTicketAccessDenied is returned when a Telegram user tries to access
// a ticket that belongs to another user.
var ErrTicketAccessDenied = fmt.Errorf("ticket access denied")

// Service holds the business logic for the tickets domain.
type Service struct {
	repo         ticketrepo.Repository
	userService  *users.Service
	categoryRepo categoryrepo.Repository
}

// NewService constructs a Service with the given Repository and UserService.
func NewService(repo ticketrepo.Repository, userService *users.Service, categoryRepo categoryrepo.Repository) *Service {
	return &Service{repo: repo, userService: userService, categoryRepo: categoryRepo}
}

// CreateTicket creates a new ticket with an initial message.
// telegramID is the Telegram user ID (int64 as string), which will be resolved to internal user UUID.
func (s *Service) CreateTicket(ctx context.Context, telegramID int64, req CreateTicketRequest) (*model.Ticket, error) {
	user, err := s.userService.GetByTelegramID(ctx, telegramID)
	if err != nil {
		return nil, fmt.Errorf("tickets.service.CreateTicket: user not found: %w", err)
	}

	now := time.Now()
	priority := req.Priority
	if priority == "" {
		priority = model.DefaultPriority
	}
	category := req.Category
	if category == "" {
		category = model.DefaultCategory
	}

	// Validate category exists
	if _, err := s.categoryRepo.GetByName(ctx, category); err != nil {
		if errors.Is(err, categoryrepo.ErrNotFound) {
			return nil, fmt.Errorf("tickets.service.CreateTicket: %w: %s", ErrInvalidCategory, category)
		}
		return nil, fmt.Errorf("tickets.service.CreateTicket: %w", err)
	}

	ticket := &model.Ticket{
		UserID:        user.ID,
		Subject:       req.Subject,
		Status:        model.DefaultStatus,
		Priority:      priority,
		Category:      category,
		CreatedAt:     now,
		UpdatedAt:     now,
		LastMessageAt: now,
	}

	if err := s.repo.Create(ctx, ticket); err != nil {
		return nil, fmt.Errorf("tickets.service.CreateTicket: %w", err)
	}

	// Create initial message
	message := &model.TicketMessage{
		TicketID:   ticket.ID,
		SenderType: model.SenderTypeUser,
		SenderID:   user.ID,
		Message:    req.Message,
		CreatedAt:  now,
	}

	if err := s.repo.CreateMessage(ctx, message); err != nil {
		return nil, fmt.Errorf("tickets.service.CreateTicket message: %w", err)
	}

	return ticket, nil
}

// GetTicket retrieves a ticket by ID.
func (s *Service) GetTicket(ctx context.Context, id string) (*model.Ticket, error) {
	ticket, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("tickets.service.GetTicket: %w", err)
	}
	return ticket, nil
}

// GetTicketWithMessages retrieves a ticket and all its messages. Telegram users
// may only access their own tickets, while authenticated admins may access any ticket.
func (s *Service) GetTicketWithMessages(ctx context.Context, id string, adminID string, telegramID int64) (*TicketWithMessagesResponse, error) {
	ticket, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("tickets.service.GetTicketWithMessages: %w", err)
	}

	if adminID == "" {
		if err := s.ensureUserOwnsTicket(ctx, ticket, telegramID); err != nil {
			return nil, fmt.Errorf("tickets.service.GetTicketWithMessages: %w", err)
		}
	}

	messages, err := s.repo.ListMessages(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("tickets.service.GetTicketWithMessages messages: %w", err)
	}

	msgResponses := make([]TicketMessageResponse, len(messages))
	for i, msg := range messages {
		msgResponses[i] = toTicketMessageResponse(msg)
	}

	ticketResponse := toTicketResponse(ticket)
	if adminID != "" {
		if err := s.attachUser(ctx, &ticketResponse); err != nil {
			return nil, fmt.Errorf("tickets.service.GetTicketWithMessages user: %w", err)
		}
	}

	return &TicketWithMessagesResponse{
		Ticket:   ticketResponse,
		Messages: msgResponses,
	}, nil
}

// UpdateTicket updates ticket fields.
func (s *Service) UpdateTicket(ctx context.Context, id string, req UpdateTicketRequest) (*model.Ticket, error) {
	ticket, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("tickets.service.UpdateTicket: %w", err)
	}

	if req.Subject != nil {
		ticket.Subject = *req.Subject
	}
	if req.Status != nil {
		oldStatus := ticket.Status
		ticket.Status = *req.Status
		// Handle closing: set closed_at timestamp
		if *req.Status == model.StatusClosed && ticket.ClosedAt == nil {
			now := time.Now()
			ticket.ClosedAt = &now
		}
		// Handle reopening: clear closed_at timestamp
		if oldStatus == model.StatusClosed && (*req.Status == model.StatusOpen || *req.Status == model.StatusInProgress) {
			ticket.ClosedAt = nil
		}
	}
	if req.Priority != nil {
		ticket.Priority = *req.Priority
	}
	if req.Category != nil {
		// Validate category exists
		if _, err := s.categoryRepo.GetByName(ctx, *req.Category); err != nil {
			if errors.Is(err, categoryrepo.ErrNotFound) {
				return nil, fmt.Errorf("tickets.service.UpdateTicket: %w: %s", ErrInvalidCategory, *req.Category)
			}
			return nil, fmt.Errorf("tickets.service.UpdateTicket: %w", err)
		}
		ticket.Category = *req.Category
	}

	ticket.UpdatedAt = time.Now()

	if err := s.repo.Update(ctx, ticket); err != nil {
		return nil, fmt.Errorf("tickets.service.UpdateTicket: %w", err)
	}
	return ticket, nil
}

// DeleteTicket permanently removes a ticket.
func (s *Service) DeleteTicket(ctx context.Context, id string) error {
	if err := s.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("tickets.service.DeleteTicket: %w", err)
	}
	return nil
}

// AddMessage adds a message to a ticket.
// Determines sender type and resolves sender ID from the provided adminID or telegramID.
// Exactly one of adminID or telegramID must be non-zero.
func (s *Service) AddMessage(ctx context.Context, ticketID string, adminID string, telegramID int64, message string) (*model.TicketMessage, error) {
	// Verify ticket exists
	ticket, err := s.repo.GetByID(ctx, ticketID)
	if err != nil {
		return nil, fmt.Errorf("tickets.service.AddMessage: %w", err)
	}

	// Determine sender type and resolve sender ID
	var senderType, senderID string
	if adminID != "" {
		senderType = model.SenderTypeAdmin
		senderID = adminID
	} else {
		senderType = model.SenderTypeUser
		user, err := s.userService.GetByTelegramID(ctx, telegramID)
		if err != nil {
			return nil, fmt.Errorf("tickets.service.AddMessage: user not found: %w", err)
		}
		if ticket.UserID != user.ID {
			return nil, fmt.Errorf("tickets.service.AddMessage: %w", ErrTicketAccessDenied)
		}
		senderID = user.ID
	}

	now := time.Now()
	msg := &model.TicketMessage{
		TicketID:   ticketID,
		SenderType: senderType,
		SenderID:   senderID,
		Message:    message,
		CreatedAt:  now,
	}

	if err := s.repo.CreateMessage(ctx, msg); err != nil {
		return nil, fmt.Errorf("tickets.service.AddMessage: %w", err)
	}

	// The repository inserts the message and updates the ticket atomically,
	// while holding the ticket lock so a concurrent close cannot be bypassed.

	return msg, nil
}

// ListMessages retrieves all messages for a Telegram user's ticket.
func (s *Service) ListMessages(ctx context.Context, ticketID string, telegramID int64) ([]*model.TicketMessage, error) {
	ticket, err := s.repo.GetByID(ctx, ticketID)
	if err != nil {
		return nil, fmt.Errorf("tickets.service.ListMessages: %w", err)
	}
	if err := s.ensureUserOwnsTicket(ctx, ticket, telegramID); err != nil {
		return nil, fmt.Errorf("tickets.service.ListMessages: %w", err)
	}

	messages, err := s.repo.ListMessages(ctx, ticketID)
	if err != nil {
		return nil, fmt.Errorf("tickets.service.ListMessages: %w", err)
	}
	return messages, nil
}

func (s *Service) ensureUserOwnsTicket(ctx context.Context, ticket *model.Ticket, telegramID int64) error {
	user, err := s.userService.GetByTelegramID(ctx, telegramID)
	if err != nil {
		return fmt.Errorf("resolve user: %w", err)
	}
	if ticket.UserID != user.ID {
		return ErrTicketAccessDenied
	}
	return nil
}

// ListTickets retrieves tickets based on the caller's role.
// If adminID is provided, returns all tickets with optional filters.
// If telegramID is provided, returns only that user's tickets.
// Exactly one of adminID or telegramID must be valid.
func (s *Service) ListTickets(ctx context.Context, adminID string, telegramID int64, filters TicketListFilters, params pagination.Params) (*PaginatedTicketResponse, error) {
	// Admin listing all tickets with filters
	if adminID != "" {
		return s.listAllTickets(ctx, filters, params)
	}

	// User listing their own tickets
	return s.listTicketsByUser(ctx, telegramID, params)
}

// listTicketsByUser retrieves tickets for a specific user with pagination.
// telegramID is the Telegram user ID, which will be resolved to internal user UUID.
func (s *Service) listTicketsByUser(ctx context.Context, telegramID int64, params pagination.Params) (*PaginatedTicketResponse, error) {
	// Resolve Telegram ID to internal user UUID
	user, err := s.userService.GetByTelegramID(ctx, telegramID)
	if err != nil {
		return nil, fmt.Errorf("tickets.service.listTicketsByUser: user not found: %w", err)
	}

	tickets, err := s.repo.ListByUser(ctx, user.ID, params.PerPage, params.Offset())
	if err != nil {
		return nil, fmt.Errorf("tickets.service.listTicketsByUser: %w", err)
	}

	total, err := s.repo.CountByUser(ctx, user.ID)
	if err != nil {
		return nil, fmt.Errorf("tickets.service.listTicketsByUser count: %w", err)
	}

	data := make([]TicketResponse, len(tickets))
	for i, t := range tickets {
		data[i] = toTicketResponse(t)
	}

	result := pagination.NewResponse(data, total, params)
	return &result, nil
}

// listAllTickets retrieves all tickets with optional filters and pagination.
func (s *Service) listAllTickets(ctx context.Context, filters TicketListFilters, params pagination.Params) (*PaginatedTicketResponse, error) {
	repoFilters := ticketrepo.TicketFilters{
		Status:   filters.Status,
		Priority: filters.Priority,
		Category: filters.Category,
		UserID:   filters.UserID,
	}

	tickets, err := s.repo.ListAll(ctx, repoFilters, params.PerPage, params.Offset())
	if err != nil {
		return nil, fmt.Errorf("tickets.service.listAllTickets: %w", err)
	}

	total, err := s.repo.CountAll(ctx, repoFilters)
	if err != nil {
		return nil, fmt.Errorf("tickets.service.listAllTickets count: %w", err)
	}

	data := make([]TicketResponse, len(tickets))
	for i, t := range tickets {
		data[i] = toTicketResponse(t)
		if err := s.attachUser(ctx, &data[i]); err != nil {
			return nil, fmt.Errorf("tickets.service.listAllTickets user: %w", err)
		}
	}

	result := pagination.NewResponse(data, total, params)
	return &result, nil
}

func (s *Service) attachUser(ctx context.Context, ticket *TicketResponse) error {
	user, err := s.userService.GetByID(ctx, ticket.UserID)
	if err != nil {
		return err
	}

	ticket.User = &TicketUserResponse{
		ID:            user.ID,
		FirstName:     user.FirstName,
		LastName:      user.LastName,
		Username:      user.Username,
		TelegramID:    user.TelegramID,
		PhoneNumber:   user.PhoneNumber,
		HasActivePlan: user.HasActivePlan,
		ActivePlanID:  user.ActivePlanID,
		PlanExpireAt:  user.PlanExpireAt,
		ReferredBy:    user.ReferredBy,
		IsBanned:      user.IsBanned,
		CreatedAt:     user.CreatedAt,
	}
	return nil
}
