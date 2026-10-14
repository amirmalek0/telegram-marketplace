package repository

import (
	"context"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"reflect"
	"testing"
)

type fileRows struct {
	pgx.Rows
	ids    []string
	cursor int
}

func (r *fileRows) Next() bool             { r.cursor++; return r.cursor < len(r.ids) }
func (r *fileRows) Scan(dest ...any) error { *dest[0].(*string) = r.ids[r.cursor]; return nil }
func (r *fileRows) Close()                 {}
func (r *fileRows) Err() error             { return nil }

type deliveryRow struct{}

func (deliveryRow) Scan(dest ...any) error { *dest[0].(*string) = "delivery"; return nil }

type snapshotTx struct {
	pgx.Tx
	files     []string
	added     []string
	positions []int
	missing   string
}

func (tx *snapshotTx) QueryRow(context.Context, string, ...any) pgx.Row { return deliveryRow{} }
func (tx *snapshotTx) Query(context.Context, string, ...any) (pgx.Rows, error) {
	return &fileRows{ids: tx.files, cursor: -1}, nil
}
func (tx *snapshotTx) Exec(_ context.Context, query string, args ...any) (pgconn.CommandTag, error) {
	if query != queryAddDeliveryFile {
		panic("unexpected snapshot query")
	}
	id := args[1].(string)
	if id == tx.missing {
		return pgconn.NewCommandTag("INSERT 0 0"), nil
	}
	tx.added = append(tx.added, id)
	tx.positions = append(tx.positions, args[2].(int))
	return pgconn.NewCommandTag("INSERT 0 1"), nil
}

func TestSnapshotIncludesEveryFileInSelectionOrder(t *testing.T) {
	tx := &snapshotTx{files: []string{"second", "first", "third"}}
	_, err := createDeliverySnapshot(context.Background(), tx, "order", "user", &CheckoutProduct{ID: "product", DeliveryType: "file"})
	if err != nil || !reflect.DeepEqual(tx.added, tx.files) || !reflect.DeepEqual(tx.positions, []int{0, 1, 2}) {
		t.Fatalf("incomplete snapshot: %v, %v", tx.added, err)
	}
}

func TestSnapshotSupportsLegacyAndRejectsIncompleteDelivery(t *testing.T) {
	id := "legacy"
	tx := &snapshotTx{}
	if _, err := createDeliverySnapshot(context.Background(), tx, "order", "user", &CheckoutProduct{DeliveryType: "file", FileID: &id}); err != nil || len(tx.added) != 1 {
		t.Fatalf("legacy delivery: %v", err)
	}
	tx = &snapshotTx{files: []string{"first", "missing"}, missing: "missing"}
	if _, err := createDeliverySnapshot(context.Background(), tx, "order", "user", &CheckoutProduct{DeliveryType: "file"}); err == nil {
		t.Fatal("partial delivery should roll back checkout")
	}
	if _, err := createDeliverySnapshot(context.Background(), &snapshotTx{}, "order", "user", &CheckoutProduct{DeliveryType: "file"}); err == nil {
		t.Fatal("empty delivery allowed")
	}
}
