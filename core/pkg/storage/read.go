package storage

import (
	"context"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"io"
)

// Reader serves private objects through an authenticated application endpoint.
type Reader interface {
	Open(context.Context, string) (io.ReadCloser, int64, string, error)
}

func (c *S3Client) Open(ctx context.Context, key string) (io.ReadCloser, int64, string, error) {
	result, err := c.client.GetObject(ctx, &s3.GetObjectInput{Bucket: aws.String(c.bucket), Key: aws.String(key)})
	if err != nil {
		return nil, 0, "", err
	}
	return result.Body, aws.ToInt64(result.ContentLength), aws.ToString(result.ContentType), nil
}
