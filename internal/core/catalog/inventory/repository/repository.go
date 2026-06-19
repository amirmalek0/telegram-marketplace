package repository

import (
	"context"
	"fmt"
	"telegram-marketplace/internal/core/catalog/inventory/model"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrNotFound is returned when a requested inventory does not exist.
var ErrNotFound = fmt.Errorf("inventory not found")

// ErrItemNotFound is returned when a requested inventory item does not exist.
var ErrItemNotFound = fmt.Errorf("inventory item not found")

// ErrNoAvailableItems is returned when no items are available for allocation.
var ErrNoAvailableItems = fmt.Errorf("no available items in inventory")

// Repository defines the data-access contract for the inventory domain.
type Repository interface {
	Create(ctx context.Context, inv *model.Inventory) error
	GetByID(ctx context.Context, id string) (*model.Inventory, error)
	List(ctx context.Context, limit, offset int) ([]*model.Inventory, error)
	Count(ctx context.Context) (int64, error)
	Update(ctx context.Context, inv *model.Inventory) error
	Delete(ctx context.Context, id string) error
	Exists(ctx context.Context, id string) (bool, error)
	BulkAddItems(ctx context.Context, inventoryID string, values []string) error
	ListItems(ctx context.Context, inventoryID string) ([]*model.InventoryItem, error)
	DeleteItem(ctx context.Context, itemID string) error
	// will be used in bot order creation flow later
	CountAvailableItems(ctx context.Context, inventoryID string) (int64, error)
	AllocateNextItem(ctx context.Context, inventoryID, orderID, userID string) (*model.InventoryItem, error)
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

func (r *postgresRepository) Create(ctx context.Context, inv *model.Inventory) error {
	err := r.db.QueryRow(ctx, queryCreateInventory,
		inv.Name, inv.CreatedAt,
	).Scan(&inv.ID)
	if err != nil {
		return fmt.Errorf("inventory.repository.Create: %w", err)
	}
	return nil
}

func (r *postgresRepository) GetByID(ctx context.Context, id string) (*model.Inventory, error) {
	rows, err := r.db.Query(ctx, queryGetInventoryByID, id)
	if err != nil {
		return nil, fmt.Errorf("inventory.repository.GetByID: %w", err)
	}
	inv, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[model.Inventory])
	if err != nil {
		return nil, fmt.Errorf("inventory.repository.GetByID: %w", ErrNotFound)
	}
	return &inv, nil
}

func (r *postgresRepository) List(ctx context.Context, limit, offset int) ([]*model.Inventory, error) {
	rows, err := r.db.Query(ctx, queryListInventories, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("inventory.repository.List: %w", err)
	}
	invs, err := pgx.CollectRows(rows, pgx.RowToStructByName[model.Inventory])
	if err != nil {
		return nil, fmt.Errorf("inventory.repository.List: %w", err)
	}
	result := make([]*model.Inventory, len(invs))
	for i := range invs {
		result[i] = &invs[i]
	}
	return result, nil
}

func (r *postgresRepository) Count(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.QueryRow(ctx, queryCountInventories).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("inventory.repository.Count: %w", err)
	}
	return count, nil
}

func (r *postgresRepository) Update(ctx context.Context, inv *model.Inventory) error {
	_, err := r.db.Exec(ctx, queryUpdateInventory, inv.Name, inv.ID)
	if err != nil {
		return fmt.Errorf("inventory.repository.Update: %w", err)
	}
	return nil
}

func (r *postgresRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, queryDeleteInventory, id)
	if err != nil {
		return fmt.Errorf("inventory.repository.Delete: %w", err)
	}
	return nil
}

func (r *postgresRepository) BulkAddItems(ctx context.Context, inventoryID string, values []string) error {
	if len(values) == 0 {
		return nil
	}
	_, err := r.db.Exec(ctx, queryBulkAddItems, inventoryID, values)
	if err != nil {
		return fmt.Errorf("inventory.repository.BulkAddItems: %w", err)
	}
	return nil
}

func (r *postgresRepository) ListItems(ctx context.Context, inventoryID string) ([]*model.InventoryItem, error) {
	rows, err := r.db.Query(ctx, queryListItems, inventoryID)
	if err != nil {
		return nil, fmt.Errorf("inventory.repository.ListItems: %w", err)
	}
	items, err := pgx.CollectRows(rows, pgx.RowToStructByName[model.InventoryItem])
	if err != nil {
		return nil, fmt.Errorf("inventory.repository.ListItems: %w", err)
	}
	result := make([]*model.InventoryItem, len(items))
	for i := range items {
		result[i] = &items[i]
	}
	return result, nil
}

func (r *postgresRepository) CountAvailableItems(ctx context.Context, inventoryID string) (int64, error) {
	var count int64
	err := r.db.QueryRow(ctx, queryCountAvailableItems, inventoryID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("inventory.repository.CountAvailableItems: %w", err)
	}
	return count, nil
}

func (r *postgresRepository) AllocateNextItem(ctx context.Context, inventoryID, orderID, userID string) (*model.InventoryItem, error) {
	rows, err := r.db.Query(ctx, queryAllocateNextItem, inventoryID, orderID, userID)
	if err != nil {
		return nil, fmt.Errorf("inventory.repository.AllocateNextItem: %w", err)
	}
	item, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[model.InventoryItem])
	if err != nil {
		return nil, fmt.Errorf("inventory.repository.AllocateNextItem: %w", ErrNoAvailableItems)
	}
	return &item, nil
}

func (r *postgresRepository) DeleteItem(ctx context.Context, itemID string) error {
	_, err := r.db.Exec(ctx, queryDeleteItem, itemID)
	if err != nil {
		return fmt.Errorf("inventory.repository.DeleteItem: %w", err)
	}
	return nil
}

func (r *postgresRepository) Exists(ctx context.Context, id string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, queryInventoryExists, id).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("inventory.repository.Exists: %w", err)
	}
	return exists, nil
}
