package database

import (
	"context"
	"log"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

// SeedAdmin ensures a default admin account exists.
// Uses a seed marker to guarantee the seed runs exactly once in the database's lifetime.
// Even if the admin is later deleted, the seed will not recreate it.
func SeedAdmin(ctx context.Context, db *pgxpool.Pool, username, password string) {
	const seedName = "default_admin"

	if isSeeded(ctx, db, seedName) {
		log.Printf("seed: %q already executed, skipping", seedName)
		return
	}

	createAdmin(ctx, db, username, password)
	markSeeded(ctx, db, seedName)

	log.Printf("seed: default admin %q created and marked", username)
}

// isSeeded checks whether a seed with the given name has already been executed.
func isSeeded(ctx context.Context, db *pgxpool.Pool, seedName string) bool {
	var seeded bool
	err := db.QueryRow(ctx,
		"SELECT EXISTS(SELECT 1 FROM seed_markers WHERE seed_name = $1)", seedName,
	).Scan(&seeded)
	if err != nil {
		log.Fatalf("seed: failed to check seed marker: %v", err)
	}
	return seeded
}

// createAdmin inserts a new admin with a bcrypt-hashed password.
func createAdmin(ctx context.Context, db *pgxpool.Pool, username, password string) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("seed: failed to hash password: %v", err)
	}

	_, err = db.Exec(ctx,
		`INSERT INTO admins (id, username, password_hash, is_active, created_at, updated_at)
		 VALUES ($1, $2, $3, true, now(), now())`,
		uuid.New().String(), username, string(hash),
	)
	if err != nil {
		log.Fatalf("seed: failed to create seed admin: %v", err)
	}
}

// markSeeded records that a seed has been executed so it will not run again.
func markSeeded(ctx context.Context, db *pgxpool.Pool, seedName string) {
	_, err := db.Exec(ctx,
		`INSERT INTO seed_markers (seed_name) VALUES ($1)`,
		seedName,
	)
	if err != nil {
		log.Fatalf("seed: failed to insert seed marker: %v", err)
	}
}

// SeedTicketCategories ensures default ticket categories exist.
// Uses a seed marker to guarantee the seed runs exactly once in the database's lifetime.
func SeedTicketCategories(ctx context.Context, db *pgxpool.Pool) {
	const seedName = "default_ticket_categories"

	if isSeeded(ctx, db, seedName) {
		log.Printf("seed: %q already executed, skipping", seedName)
		return
	}

	createTicketCategories(ctx, db)
	markSeeded(ctx, db, seedName)

	log.Printf("seed: default ticket categories created and marked")
}

// createTicketCategories inserts the default ticket categories.
func createTicketCategories(ctx context.Context, db *pgxpool.Pool) {
	categories := []string{
		"general",
		"billing",
		"technical",
		"account",
		"other",
	}

	for _, name := range categories {
		_, err := db.Exec(ctx,
			`INSERT INTO ticket_categories (id, name, created_at)
			 VALUES ($1, $2, now())
			 ON CONFLICT (name) DO NOTHING`,
			uuid.New().String(), name,
		)
		if err != nil {
			log.Fatalf("seed: failed to create ticket category %q: %v", name, err)
		}
	}
}
