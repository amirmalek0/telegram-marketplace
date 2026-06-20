package apis

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"telegram-marketplace/internal/core/catalog/apis/model"
	"telegram-marketplace/internal/core/catalog/apis/repository"
	"telegram-marketplace/pkg/pagination"
	"time"

	"github.com/PaesslerAG/jsonpath"
)

// Service holds the business logic for the apis domain.
type Service struct {
	repo repository.Repository
}

// NewService constructs a Service with the given Repository.
func NewService(repo repository.Repository) *Service {
	return &Service{repo: repo}
}

// Create stores a new API configuration with headers.
func (s *Service) Create(ctx context.Context, req CreateRequest) (*model.API, error) {
	// Convert HeaderInput to model.Header
	headers := make([]model.Header, 0, len(req.Headers))
	for _, h := range req.Headers {
		headers = append(headers, model.Header{
			Key:   h.Key,
			Value: h.Value,
		})
	}

	api := &model.API{
		URL:          req.URL,
		Method:       req.Method,
		Body:         req.Body,
		ResponsePath: req.ResponsePath,
		Headers:      headers,
		CreatedAt:    time.Now(),
	}

	if err := s.repo.Create(ctx, api); err != nil {
		return nil, fmt.Errorf("apis.service.Create: %w", err)
	}

	return api, nil
}

// GetByID returns an API by its internal UUID.
func (s *Service) GetByID(ctx context.Context, id string) (*model.API, error) {
	api, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("apis.service.GetByID: %w", err)
	}
	return api, nil
}

// List returns a paginated list of APIs ordered by creation date.
func (s *Service) List(ctx context.Context, params pagination.Params) (*PaginatedResponse, error) {
	apis, err := s.repo.List(ctx, params.PerPage, params.Offset())
	if err != nil {
		return nil, fmt.Errorf("apis.service.List: %w", err)
	}

	total, err := s.repo.Count(ctx)
	if err != nil {
		return nil, fmt.Errorf("apis.service.List count: %w", err)
	}

	data := make([]Response, 0, len(apis))
	for _, api := range apis {
		data = append(data, toResponse(api))
	}

	result := pagination.NewResponse(data, total, params)
	return &result, nil
}

// Update modifies an existing API configuration and replaces all headers.
func (s *Service) Update(ctx context.Context, id string, req UpdateRequest) (*model.API, error) {
	api, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("apis.service.Update: %w", err)
	}

	if req.URL != nil {
		api.URL = *req.URL
	}
	if req.Method != nil {
		api.Method = *req.Method
	}
	if req.Body != nil {
		api.Body = req.Body
	}
	if req.ResponsePath != nil {
		api.ResponsePath = req.ResponsePath
	}

	// Replace headers if provided in request
	if req.Headers != nil {
		headers := make([]model.Header, 0, len(req.Headers))
		for _, h := range req.Headers {
			headers = append(headers, model.Header{
				Key:   h.Key,
				Value: h.Value,
			})
		}
		api.Headers = headers
	}

	if err := s.repo.Update(ctx, api); err != nil {
		return nil, fmt.Errorf("apis.service.Update: %w", err)
	}

	return api, nil
}

// Delete removes an API from the database.
func (s *Service) Delete(ctx context.Context, id string) error {
	if err := s.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("apis.service.Delete: %w", err)
	}
	return nil
}

// ExecuteAPICall executes the configured API call and extracts the value using JSONPath.
func (s *Service) ExecuteAPICall(ctx context.Context, apiID string) (string, error) {
	// Get API configuration
	api, err := s.repo.GetByID(ctx, apiID)
	if err != nil {
		return "", fmt.Errorf("apis.service.ExecuteAPICall: %w", err)
	}

	// Build HTTP request
	var bodyReader io.Reader
	if api.Body != nil && *api.Body != "" {
		bodyReader = bytes.NewBufferString(*api.Body)
	}

	req, err := http.NewRequestWithContext(ctx, api.Method, api.URL, bodyReader)
	if err != nil {
		return "", fmt.Errorf("apis.service.ExecuteAPICall: failed to create request: %w", err)
	}

	// Add headers from API model
	for _, h := range api.Headers {
		req.Header.Set(h.Key, h.Value)
	}

	// Execute request
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("apis.service.ExecuteAPICall: request failed: %w", err)
	}
	defer resp.Body.Close()

	// Read response body
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("apis.service.ExecuteAPICall: failed to read response: %w", err)
	}

	// Check status code
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("apis.service.ExecuteAPICall: API returned status %d: %s", resp.StatusCode, string(respBody))
	}

	// If no response_path is configured, return the raw response
	if api.ResponsePath == nil || *api.ResponsePath == "" {
		return string(respBody), nil
	}

	// Parse JSON response
	var jsonData interface{}
	if err := json.Unmarshal(respBody, &jsonData); err != nil {
		return "", fmt.Errorf("apis.service.ExecuteAPICall: failed to parse JSON response: %w", err)
	}

	// Extract value using JSONPath
	result, err := jsonpath.Get(*api.ResponsePath, jsonData)
	if err != nil {
		return "", fmt.Errorf("apis.service.ExecuteAPICall: JSONPath extraction failed: %w", err)
	}

	// Convert result to string
	switch v := result.(type) {
	case string:
		return v, nil
	case float64:
		return fmt.Sprintf("%v", v), nil
	case bool:
		return fmt.Sprintf("%v", v), nil
	case nil:
		return "", nil
	default:
		// For complex types, marshal back to JSON
		jsonBytes, err := json.Marshal(v)
		if err != nil {
			return "", fmt.Errorf("apis.service.ExecuteAPICall: failed to marshal result: %w", err)
		}
		return string(jsonBytes), nil
	}
}
