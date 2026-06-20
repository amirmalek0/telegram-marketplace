package database

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Connect creates and validates a pgxpool connection pool.
func Connect(ctx context.Context, dsn string) *pgxpool.Pool {
	db, err := pgxpool.New(ctx, dsn)
	if err != nil {
		log.Fatalf("database: cannot create pool: %v", err)
	}

	if err := db.Ping(ctx); err != nil {
		log.Fatalf("database: ping failed: %v", err)
	}

	log.Println("database: connected")
	return db
}

// MustClose closes the pool and logs any error. Intended for use with defer.
func MustClose(db *pgxpool.Pool) {
	if db == nil {
		return
	}
	db.Close()
	log.Println(fmt.Sprintf("database: pool closed"))
}
