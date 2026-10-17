package database

import (
	"context"
	"errors"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"os"
	"strings"
	"sync"
	"telegram-marketplace/internal/core/membership/userphotos/model"
	"telegram-marketplace/internal/core/membership/userphotos/repository"
	"testing"
)

func TestUserPhotoArchivePostgres(t *testing.T) {
	url := os.Getenv("COUPON_TEST_DATABASE_URL")
	if url == "" {
		t.Skip("set COUPON_TEST_DATABASE_URL for isolated photo archive tests")
	}
	ctx := context.Background()
	admin, err := pgxpool.New(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	defer admin.Close()
	schema := "photo_test_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	quoted := pgx.Identifier{schema}.Sanitize()
	if _, err = admin.Exec(ctx, "CREATE SCHEMA "+quoted); err != nil {
		t.Fatal(err)
	}
	defer func() {
		if _, err := admin.Exec(ctx, "DROP SCHEMA "+quoted+" CASCADE"); err != nil {
			t.Error(err)
		}
	}()
	cfg, err := pgxpool.ParseConfig(url)
	if err != nil {
		t.Fatal(err)
	}
	cfg.ConnConfig.RuntimeParams["search_path"] = schema
	db, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	exec := func(sql string, args ...any) {
		t.Helper()
		if _, err := db.Exec(ctx, sql, args...); err != nil {
			t.Fatal(err)
		}
	}
	exec(`CREATE TABLE users(id UUID PRIMARY KEY,telegram_id BIGINT NOT NULL,photo_url TEXT NOT NULL DEFAULT '')`)
	for pass := 0; pass < 2; pass++ {
		for _, sql := range userPhotoMigrations {
			exec(sql)
		}
	}
	id := uuid.NewString()
	exec(`INSERT INTO users(id,telegram_id) VALUES($1,42)`, id)
	repo := repository.New(db)
	if err = repo.Seed(ctx); err != nil {
		t.Fatal(err)
	}
	if err = repo.Schedule(ctx, id); err != nil {
		t.Fatal(err)
	}
	job, err := repo.Claim(ctx)
	if err != nil || job.UserID != id || job.TelegramID != 42 || job.Offset != 0 {
		t.Fatal(job, err)
	}
	if _, err = repo.Claim(ctx); !errors.Is(err, pgx.ErrNoRows) {
		t.Fatal("leased job claimed twice", err)
	}
	if err = repo.Request(ctx, id); err != nil {
		t.Fatal(err)
	}
	state, err := repo.State(ctx, id)
	if err != nil || state.Status != "syncing" {
		t.Fatal("manual sync clobbered lease", state, err)
	}
	for i := 0; i < 32; i++ {
		p := model.Photo{ID: uuid.NewString(), UserID: id, UniqueID: uuid.NewString(), StorageKey: uuid.NewString(), ContentType: "image/jpeg", Width: 640, Height: 640, Position: i}
		if err = repo.Save(ctx, p); err != nil {
			t.Fatal(err)
		}
		if err = repo.Save(ctx, p); err != nil {
			t.Fatal("dedup failed", err)
		}
		if i == 0 {
			if err = repo.Current(ctx, id, "/api/v1/user/"+id+"/photos/"+p.ID+"/content"); err != nil {
				t.Fatal(err)
			}
		}
	}
	photos, total, err := repo.List(ctx, id, 30, 0)
	if err != nil || total != 32 || len(photos) != 30 || !photos[0].Current || photos[1].Position != 1 {
		t.Fatal("gallery ordering/count", total, err)
	}
	photos, total, err = repo.List(ctx, id, 30, 30)
	if err != nil || total != 32 || len(photos) != 2 || photos[0].Position != 30 {
		t.Fatal("pagination", total, err)
	}
	if _, err = repo.Get(ctx, uuid.NewString(), photos[0].ID); !errors.Is(err, pgx.ErrNoRows) {
		t.Fatal("cross-user photo returned", err)
	}
	if err = repo.Finish(ctx, id, "pending", 100, ""); err != nil {
		t.Fatal(err)
	}
	job, err = repo.Claim(ctx)
	if err != nil || job.Offset != 100 {
		t.Fatal("checkpoint", job, err)
	}
	if err = repo.Finish(ctx, id, "error", 100, "retry"); err != nil {
		t.Fatal(err)
	}
	if _, err = repo.Claim(ctx); !errors.Is(err, pgx.ErrNoRows) {
		t.Fatal("retry not delayed", err)
	}
	exec(`UPDATE user_photo_sync SET last_attempt_at=now()-interval '2 minutes'`)
	if err = repo.Request(ctx, id); err != nil {
		t.Fatal(err)
	}
	job, err = repo.Claim(ctx)
	if err != nil || job.Offset != 0 {
		t.Fatal("refresh did not restart", err)
	}
	if err = repo.Finish(ctx, id, "ready", 0, ""); err != nil {
		t.Fatal(err)
	}
	state, err = repo.State(ctx, id)
	if err != nil || state.LastSyncedAt == nil {
		t.Fatal("sync timestamp", err)
	}
	t.Run("visit refresh cooldown and queue safety", func(t *testing.T) {
		snapshot := func() string {
			t.Helper()
			var value string
			if err := db.QueryRow(ctx, `SELECT row_to_json(s)::text FROM user_photo_sync s WHERE user_id=$1`, id).Scan(&value); err != nil {
				t.Fatal(err)
			}
			return value
		}
		for _, tc := range []struct{ name, setup string }{
			{"recent success", `last_synced_at=now()-interval '14 minutes'`},
			{"recent attempt", `last_attempt_at=now()-interval '14 minutes'`},
			{"active lease", `locked_until=now()+interval '1 minute'`},
			{"queued page", `status='pending',next_offset=100,next_at=now()`},
			{"in progress", `status='syncing',next_offset=100`},
			{"failed retry", `status='error',next_offset=100,error='retry',next_at=now()+interval '15 minutes'`},
		} {
			t.Run(tc.name, func(t *testing.T) {
				exec(`UPDATE user_photo_sync SET status='ready',last_synced_at=now()-interval '16 minutes',last_attempt_at=now()-interval '16 minutes',locked_until=NULL,next_offset=0,error='',next_at=now()+interval '24 hours' WHERE user_id=$1`, id)
				exec(`UPDATE user_photo_sync SET `+tc.setup+` WHERE user_id=$1`, id)
				before := snapshot()
				if err := repo.ScheduleVisit(ctx, id); err != nil {
					t.Fatal(err)
				}
				if after := snapshot(); before != after {
					t.Fatal("visit changed a protected sync job")
				}
			})
		}
		exec(`UPDATE user_photo_sync SET status='ready',last_synced_at=now()-interval '16 minutes',last_attempt_at=now()-interval '16 minutes',locked_until=NULL,next_offset=0,error='',next_at=now()+interval '24 hours' WHERE user_id=$1`, id)
		var callers sync.WaitGroup
		errors := make(chan error, 20)
		for i := 0; i < 20; i++ {
			callers.Add(1)
			go func() { defer callers.Done(); errors <- repository.New(db).ScheduleVisit(ctx, id) }()
		}
		callers.Wait()
		close(errors)
		for err := range errors {
			if err != nil {
				t.Fatal(err)
			}
		}
		queued := snapshot()
		if err := repo.ScheduleVisit(ctx, id); err != nil {
			t.Fatal(err)
		}
		if queued != snapshot() {
			t.Fatal("repeated visit rescheduled pending work")
		}
		job, err := repo.Claim(ctx)
		if err != nil || job.UserID != id || job.Offset != 0 {
			t.Fatal("stale visit did not queue refresh", job, err)
		}
		if _, err := repo.Claim(ctx); err != pgx.ErrNoRows {
			t.Fatal("duplicate visit job", err)
		}
		if err := repo.Finish(ctx, id, "ready", 0, ""); err != nil {
			t.Fatal(err)
		}
		before := snapshot()
		if err := repository.New(db).ScheduleVisit(ctx, id); err != nil {
			t.Fatal(err)
		}
		if before != snapshot() {
			t.Fatal("new repository instance bypassed cooldown")
		}
		// A first-time Mini App visitor is queued without waiting for seeding.
		exec(`DELETE FROM user_photo_sync WHERE user_id=$1`, id)
		if err := repo.ScheduleVisit(ctx, id); err != nil {
			t.Fatal(err)
		}
		job, err = repo.Claim(ctx)
		if err != nil || job.UserID != id || job.Offset != 0 {
			t.Fatal("initial visit not queued", job, err)
		}
	})
	exec(`DELETE FROM users WHERE id=$1`, id)
	var count int
	err = db.QueryRow(ctx, `SELECT count(*) FROM user_profile_photos`).Scan(&count)
	if err != nil || count != 0 {
		t.Fatal("user photo rows retained", err)
	}
	keys, err := repo.Deletions(ctx)
	if err != nil || len(keys) != 30 {
		t.Fatal("object cleanup not queued", len(keys), err)
	}
	for _, key := range keys {
		if err = repo.Deleted(ctx, key); err != nil {
			t.Fatal(err)
		}
	}
	keys, err = repo.Deletions(ctx)
	if err != nil || len(keys) != 2 {
		t.Fatal("cleanup acknowledgement", len(keys), err)
	}
}
