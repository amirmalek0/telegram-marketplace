package storage

import (
	"context"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// S3Client is a Storage implementation backed by any S3-compatible store
type S3Client struct {
	client    *s3.Client
	presigner *s3.PresignClient
	bucket    string
	publicURL string // base URL, e.g. "http://localhost:9000/marketplace"
}

// NewS3Client constructs an S3Client pointed at the given endpoint.
func NewS3Client(endpoint, accessKey, secretKey, bucket, region, publicURL string) *S3Client {
	cfg := aws.Config{
		Region:      region,
		Credentials: credentials.NewStaticCredentialsProvider(accessKey, secretKey, ""),
	}

	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(endpoint)
		o.UsePathStyle = true
	})

	return &S3Client{
		client:    client,
		presigner: s3.NewPresignClient(client),
		bucket:    bucket,
		publicURL: strings.TrimRight(publicURL, "/"),
	}
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
