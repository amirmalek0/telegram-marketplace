package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"telegram-marketplace/internal/core/membership/tickets/model"
)

// ErrNotFound is returned when a requested ticket does not exist.
var ErrNotFound = fmt.Errorf("ticket not found")

// TicketFilters defines optional filters for listing tickets.
type TicketFilters struct {
	Status   *string
	Priority *string
	Category *string
	UserID   *string
}

// Repository defines the data-access contract for the tickets domain.
type Repository interface {
	// --- Ticket operations ---
	Create(ctx context.Context, t *model.Ticket) error
	Update(ctx context.Context, t *model.Ticket) error
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*model.Ticket, error)
	ListByUser(ctx context.Context, userID string, limit, offset int) ([]*model.Ticket, error)
	CountByUser(ctx context.Context, userID string) (int64, error)
	ListAll(ctx context.Context, filters TicketFilters, limit, offset int) ([]*model.Ticket, error)
	CountAll(ctx context.Context, filters TicketFilters) (int64, error)
	UpdateLastMessageAt(ctx context.Context, ticketID string, timestamp time.Time) error

	// --- Message operations ---
	CreateMessage(ctx context.Context, m *model.TicketMessage) error
	ListMessages(ctx context.Context, ticketID string) ([]*model.TicketMessage, error)
	GetLatestMessage(ctx context.Context, ticketID string) (*model.TicketMessage, error)
}

// postgresRepository is the Postgres implementation of Repository.
type postgresRepository struct {
	db *pgxpool.Pool
}

// NewPostgresRepository constructs a Postgres-backed Repository.
func NewPostgresRepository(db *pgxpool.Pool) Repository {
	return &postgresRepository{db: db}
}

// compile-time interface check
var _ Repository = (*postgresRepository)(nil)

// ============================================================
// Ticket operations
// ============================================================

func (r *postgresRepository) Create(ctx context.Context, t *model.Ticket) error {
	err := r.db.QueryRow(ctx, queryCreateTicket,
		t.UserID, t.Subject, t.Status, t.Priority, t.Category,
		t.CreatedAt, t.UpdatedAt, t.LastMessageAt,
	).Scan(&t.ID)
	if err != nil {
		return fmt.Errorf("tickets.repository.Create: %w", err)
	}
	return nil
}

func (r *postgresRepository) Update(ctx context.Context, t *model.Ticket) error {
	_, err := r.db.Exec(ctx, queryUpdateTicket,
		t.Subject, t.Status, t.Priority, t.Category, t.UpdatedAt, t.ClosedAt, t.ID,
	)
	if err != nil {
		return fmt.Errorf("tickets.repository.Update: %w", err)
	}
	return nil
}

func (r *postgresRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, queryDeleteTicket, id)
	if err != nil {
		return fmt.Errorf("tickets.repository.Delete: %w", err)
	}
	return nil
}

func (r *postgresRepository) GetByID(ctx context.Context, id string) (*model.Ticket, error) {
	rows, err := r.db.Query(ctx, queryGetTicketByID, id)
	if err != nil {
		return nil, fmt.Errorf("tickets.repository.GetByID: %w", err)
	}

	t, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[model.Ticket])
	if err != nil {
		return nil, fmt.Errorf("tickets.repository.GetByID: %w", err)
	}
	return &t, nil
}

func (r *postgresRepository) ListByUser(ctx context.Context, userID string, limit, offset int) ([]*model.Ticket, error) {
	rows, err := r.db.Query(ctx, queryListTicketsByUser, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("tickets.repository.ListByUser: %w", err)
	}

	tickets, err := pgx.CollectRows(rows, pgx.RowToStructByName[model.Ticket])
	if err != nil {
		return nil, fmt.Errorf("tickets.repository.ListByUser: %w", err)
	}

	result := make([]*model.Ticket, len(tickets))
	for i := range tickets {
		result[i] = &tickets[i]
	}
	return result, nil
}

func (r *postgresRepository) CountByUser(ctx context.Context, userID string) (int64, error) {
	var total int64
	err := r.db.QueryRow(ctx, queryCountTicketsByUser, userID).Scan(&total)
	if err != nil {
		return 0, fmt.Errorf("tickets.repository.CountByUser: %w", err)
	}
	return total, nil
}

func (r *postgresRepository) ListAll(ctx context.Context, filters TicketFilters, limit, offset int) ([]*model.Ticket, error) {
	rows, err := r.db.Query(ctx, queryListAllTickets,
		filters.Status, filters.Priority, filters.Category, filters.UserID, limit, offset,
	)
	if err != nil {
		return nil, fmt.Errorf("tickets.repository.ListAll: %w", err)
	}

	tickets, err := pgx.CollectRows(rows, pgx.RowToStructByName[model.Ticket])
	if err != nil {
		return nil, fmt.Errorf("tickets.repository.ListAll: %w", err)
	}

	result := make([]*model.Ticket, len(tickets))
	for i := range tickets {
		result[i] = &tickets[i]
	}
	return result, nil
}

func (r *postgresRepository) CountAll(ctx context.Context, filters TicketFilters) (int64, error) {
	var total int64
	err := r.db.QueryRow(ctx, queryCountAllTickets,
		filters.Status, filters.Priority, filters.Category, filters.UserID,
	).Scan(&total)
	if err != nil {
		return 0, fmt.Errorf("tickets.repository.CountAll: %w", err)
	}
	return total, nil
}

func (r *postgresRepository) UpdateLastMessageAt(ctx context.Context, ticketID string, timestamp time.Time) error {
	_, err := r.db.Exec(ctx, queryUpdateLastMessageAt, timestamp, timestamp, ticketID)
	if err != nil {
		return fmt.Errorf("tickets.repository.UpdateLastMessageAt: %w", err)
	}
	return nil
}

// ============================================================
// Message operations
// ============================================================

func (r *postgresRepository) CreateMessage(ctx context.Context, m *model.TicketMessage) error {
	err := r.db.QueryRow(ctx, queryCreateMessage,
		m.TicketID, m.SenderType, m.SenderID, m.Message, m.CreatedAt,
	).Scan(&m.ID)
	if err != nil {
		return fmt.Errorf("tickets.repository.CreateMessage: %w", err)
	}
	return nil
}

func (r *postgresRepository) ListMessages(ctx context.Context, ticketID string) ([]*model.TicketMessage, error) {
	rows, err := r.db.Query(ctx, queryListMessagesByTicket, ticketID)
	if err != nil {
		return nil, fmt.Errorf("tickets.repository.ListMessages: %w", err)
	}

	messages, err := pgx.CollectRows(rows, pgx.RowToStructByName[model.TicketMessage])
	if err != nil {
		return nil, fmt.Errorf("tickets.repository.ListMessages: %w", err)
	}

	result := make([]*model.TicketMessage, len(messages))
	for i := range messages {
		result[i] = &messages[i]
	}
	return result, nil
}

func (r *postgresRepository) GetLatestMessage(ctx context.Context, ticketID string) (*model.TicketMessage, error) {
	rows, err := r.db.Query(ctx, queryGetLatestMessage, ticketID)
	if err != nil {
		return nil, fmt.Errorf("tickets.repository.GetLatestMessage: %w", err)
	}

	m, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[model.TicketMessage])
	if err != nil {
		return nil, fmt.Errorf("tickets.repository.GetLatestMessage: %w", err)
	}
	return &m, nil
}
