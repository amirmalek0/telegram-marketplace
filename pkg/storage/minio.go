package storage

import (
	"context"
	"errors"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
)

// Client is a connection-level factory backed by any S3-compatible store.
// It holds the underlying AWS S3 client but is not tied to any bucket.
// Call Bucket to obtain a bucket-scoped Storage instance.
type Client struct {
	client    *s3.Client
	presigner *s3.PresignClient
}

// NewClient constructs a Client pointed at the given endpoint.
func NewClient(endpoint, accessKey, secretKey, region string) *Client {
	cfg := aws.Config{
		Region:      region,
		Credentials: credentials.NewStaticCredentialsProvider(accessKey, secretKey, ""),
	}

	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(endpoint)
		o.UsePathStyle = true
	})

	return &Client{
		client:    client,
		presigner: s3.NewPresignClient(client),
	}
}

// Bucket returns a Storage scoped to the given bucket name.
// publicURL is the base URL used to build public object URLs,
// e.g. "http://localhost:9000/categories-icons".
func (c *Client) Bucket(name, publicURL string) Storage {
	return &S3Client{
		client:    c.client,
		presigner: c.presigner,
		bucket:    name,
		publicURL: strings.TrimRight(publicURL, "/"),
	}
}

// EnsureBucket creates the bucket if it doesn't already exist.
// This is called automatically during application startup to ensure
// all required buckets are available.
func (c *Client) EnsureBucket(ctx context.Context, name string) error {
	// Check if bucket exists
	_, err := c.client.HeadBucket(ctx, &s3.HeadBucketInput{
		Bucket: aws.String(name),
	})
	if err == nil {
		// Bucket exists
		return nil
	}

	// Check if error is "bucket not found" (NoSuchBucket or NotFound)
	var notFoundErr *s3types.NotFound
	if !errors.As(err, &notFoundErr) {
		// Some other error occurred
		return fmt.Errorf("storage.EnsureBucket: failed to check bucket %q: %w", name, err)
	}

	// Create the bucket
	_, err = c.client.CreateBucket(ctx, &s3.CreateBucketInput{
		Bucket: aws.String(name),
	})
	if err != nil {
		return fmt.Errorf("storage.EnsureBucket: failed to create bucket %q: %w", name, err)
	}

	return nil
}

// S3Client is a Storage implementation scoped to a single bucket.
type S3Client struct {
	client    *s3.Client
	presigner *s3.PresignClient
	bucket    string
	publicURL string // base URL, e.g. "http://localhost:9000/categories-icons"
}

var _ Storage = (*S3Client)(nil)

// Upload stores r under key in the configured bucket and returns the key.
func (c *S3Client) Upload(ctx context.Context, key string, r io.Reader, size int64, contentType string) (string, error) {
	_, err := c.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:        aws.String(c.bucket),
		Key:           aws.String(key),
		Body:          r,
		ContentLength: aws.Int64(size),
		ContentType:   aws.String(contentType),
	})
	if err != nil {
		return "", fmt.Errorf("storage.Upload: %w", err)
	}
	return key, nil
}

// Delete removes the object identified by key from the configured bucket.
func (c *S3Client) Delete(ctx context.Context, key string) error {
	_, err := c.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return fmt.Errorf("storage.Delete: %w", err)
	}
	return nil
}

// PublicURL resolves a stored key to a full public-facing URL.
func (c *S3Client) PublicURL(key string) string {
	if key == "" {
		return ""
	}
	return c.publicURL + "/" + strings.TrimLeft(key, "/")
}

// PresignedURL generates a time-limited pre-signed GET URL for the given key.
func (c *S3Client) PresignedURL(ctx context.Context, key string, ttl time.Duration) (string, error) {
	req, err := c.presigner.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
	}, s3.WithPresignExpires(ttl))
	if err != nil {
		return "", fmt.Errorf("storage.PresignedURL: %w", err)
	}
	return req.URL, nil
}
