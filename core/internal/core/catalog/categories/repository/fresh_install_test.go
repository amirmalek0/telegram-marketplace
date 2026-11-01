package repository

import (
	"context"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"telegram-marketplace/internal/core/catalog/categories/model"
)

func TestCreateCategoryWithRequiredLegacySlug(t *testing.T) {
	url := os.Getenv("COUPON_TEST_DATABASE_URL")
	if url == "" {
		t.Skip("set COUPON_TEST_DATABASE_URL for isolated PostgreSQL tests")
	}
	ctx := context.Background()
	db, err := pgxpool.New(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	schema := "category_test_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	quoted := pgx.Identifier{schema}.Sanitize()
	if _, err := db.Exec(ctx, "CREATE SCHEMA "+quoted); err != nil {
		t.Fatal(err)
	}
	defer func() {
		if _, err := db.Exec(ctx, "DROP SCHEMA "+quoted+" CASCADE"); err != nil {
			t.Error(err)
		}
	}()
	if _, err := db.Exec(ctx, "CREATE TABLE "+quoted+".categories (LIKE public.categories INCLUDING ALL)"); err != nil {
		t.Fatal(err)
	}
	config, err := pgxpool.ParseConfig(url)
	if err != nil {
		t.Fatal(err)
	}
	config.ConnConfig.RuntimeParams["search_path"] = schema
	isolated, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		t.Fatal(err)
	}
	defer isolated.Close()
	repo := NewPostgresRepository(isolated)
	for _, title := range []string{"فایل‌های آموزشی", "فایل‌های آموزشی"} {
		category := &model.Category{Title: title, Active: true, CreatedAt: time.Now()}
		if err := repo.Create(ctx, category); err != nil {
			t.Fatalf("create category without client-supplied slug: %v", err)
		}
		if _, err := repo.GetByID(ctx, category.ID); err != nil {
			t.Fatal(err)
		}
	}
	var count int
	if err := isolated.QueryRow(ctx, "SELECT count(DISTINCT slug) FROM categories WHERE slug <> ''").Scan(&count); err != nil || count != 2 {
		t.Fatalf("unique internal slugs: count=%d err=%v", count, err)
	}
}
