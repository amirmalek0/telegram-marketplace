package server

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
)

const (
	readTimeout  = 10 * time.Second
	writeTimeout = 30 * time.Second
	idleTimeout  = 60 * time.Second
	shutdownWait = 10 * time.Second
)

// Run starts the HTTP server on the given address and blocks until
// SIGINT or SIGTERM is received, then performs a graceful shutdown.
func Run(addr string, r *gin.Engine) {
	srv := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  readTimeout,
		WriteTimeout: writeTimeout,
		IdleTimeout:  idleTimeout,
	}

	go func() {
		log.Printf("server: listening on %s", addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server: listen error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("server: shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), shutdownWait)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("server: forced shutdown: %v", err)
	}
	log.Println("server: stopped")
}
