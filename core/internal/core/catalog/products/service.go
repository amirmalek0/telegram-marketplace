package products

import (
	"context"
	"errors"
	"fmt"
	"mime/multipart"
	"strings"
	apisrepo "telegram-marketplace/internal/core/catalog/apis/repository"
	bundlesrepo "telegram-marketplace/internal/core/catalog/bundles/repository"
	filesrepo "telegram-marketplace/internal/core/catalog/files/repository"
	inventoryrepo "telegram-marketplace/internal/core/catalog/inventory/repository"
	messagesrepo "telegram-marketplace/internal/core/catalog/messages/repository"
	"telegram-marketplace/internal/core/catalog/products/model"
	"telegram-marketplace/internal/core/catalog/products/repository"
	"telegram-marketplace/pkg/pagination"
	"telegram-marketplace/pkg/storage"
	"time"
)

// ErrInvalidDeliveryType is returned when delivery type validation fails.
var ErrInvalidDeliveryType = errors.New("invalid delivery type configuration")

// ErrInvalidFileID is returned when the file_id does not exist.
var ErrInvalidFileID = errors.New("selected file is not valid")

// ErrInvalidMessageID is returned when the message_id does not exist.
var ErrInvalidMessageID = errors.New("selected message is not valid")

// ErrInvalidInventoryID is returned when the inventory_id does not exist.
var ErrInvalidInventoryID = errors.New("selected inventory is not valid")

// ErrInvalidBundleID is returned when the bundle_id does not exist.
var ErrInvalidBundleID = errors.New("selected bundle is not valid")

// ErrInvalidAPIID is returned when the api_id does not exist.
var ErrInvalidAPIID = errors.New("selected api is not valid")

// ErrInvalidImage is returned when an uploaded product image is not an image.
var ErrInvalidImage = errors.New("product image must be an image file")

// ErrImageTooLarge is returned when an uploaded image exceeds 5 MiB.
var ErrImageTooLarge = errors.New("product image must not exceed 5 MB")

// Service holds the business logic for the products domain.
type Service struct {
	repo          repository.Repository
	filesRepo     filesrepo.Repository
	messagesRepo  messagesrepo.Repository
	inventoryRepo inventoryrepo.Repository
	bundlesRepo   bundlesrepo.Repository
	apisRepo      apisrepo.Repository
	imageStorage  storage.Storage
}

// NewService constructs a Service with the given repositories.
func NewService(
	repo repository.Repository,
	filesRepo filesrepo.Repository,
	messagesRepo messagesrepo.Repository,
	inventoryRepo inventoryrepo.Repository,
	bundlesRepo bundlesrepo.Repository,
	apisRepo apisrepo.Repository,
	imageStorage storage.Storage,
) *Service {
	return &Service{
		repo:          repo,
		filesRepo:     filesRepo,
		messagesRepo:  messagesRepo,
		inventoryRepo: inventoryRepo,
		bundlesRepo:   bundlesRepo,
		apisRepo:      apisRepo,
		imageStorage:  imageStorage,
	}
}

// Create stores a new product.
func (s *Service) Create(ctx context.Context, req CreateRequest) (*model.Product, error) {
	deliveryType := model.DeliveryType(req.DeliveryType)

	// Validate delivery type configuration
	if err := validateDeliveryType(deliveryType, req.FileID, req.MessageID, req.InventoryID, req.BundleID, req.APIID); err != nil {
		return nil, err
	}

	// Validate foreign key references
	if err := s.validateReferences(ctx, req.FileID, req.MessageID, req.InventoryID, req.BundleID, req.APIID); err != nil {
		return nil, err
	}

	product := &model.Product{
		Title:        req.Title,
		Description:  req.Description,
		Price:        req.Price,
		CategoryID:   req.CategoryID,
		DeliveryType: deliveryType,
		FileID:       req.FileID,
		MessageID:    req.MessageID,
		InventoryID:  req.InventoryID,
		BundleID:     req.BundleID,
		APIID:        req.APIID,
		DemoURL:      req.DemoURL,
		VIPOnly:      req.VIPOnly,
		ViewsCount:   0,
		Status:       "active",
		CreatedAt:    time.Now(),
	}

	if err := s.repo.Create(ctx, product); err != nil {
		return nil, fmt.Errorf("products.service.Create: %w", err)
	}

	return product, nil
}

// GetByID returns a product by its internal UUID.
func (s *Service) GetByID(ctx context.Context, id string) (*model.Product, error) {
	product, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("products.service.GetByID: %w", err)
	}
	return product, nil
}

// List returns a paginated list of products ordered by creation date.
func (s *Service) List(ctx context.Context, params pagination.Params) (*PaginatedResponse, error) {
	products, err := s.repo.List(ctx, params.PerPage, params.Offset())
	if err != nil {
		return nil, fmt.Errorf("products.service.List: %w", err)
	}

	total, err := s.repo.Count(ctx)
	if err != nil {
		return nil, fmt.Errorf("products.service.List count: %w", err)
	}

	data := make([]Response, 0, len(products))
	for _, p := range products {
		response, err := s.toResponse(ctx, p)
		if err != nil {
			return nil, fmt.Errorf("products.service.List image URL: %w", err)
		}
		data = append(data, response)
	}

	result := pagination.NewResponse(data, total, params)
	return &result, nil
}

// UploadImage replaces the storefront image for an existing product.
func (s *Service) UploadImage(ctx context.Context, id string, image *multipart.FileHeader) (*model.Product, error) {
	product, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("products.service.UploadImage: %w", err)
	}

	if !strings.HasPrefix(strings.ToLower(image.Header.Get("Content-Type")), "image/") {
		return nil, ErrInvalidImage
	}
	if image.Size > 5*1024*1024 {
		return nil, ErrImageTooLarge
	}

	storageID, err := storage.UploadFile(ctx, s.imageStorage, image)
	if err != nil {
		return nil, fmt.Errorf("products.service.UploadImage: %w", err)
	}

	if err := s.repo.UpdateImageStorageID(ctx, id, storageID); err != nil {
		_ = storage.DeleteFile(ctx, s.imageStorage, storageID)
		return nil, fmt.Errorf("products.service.UploadImage: %w", err)
	}

	_ = storage.DeleteFile(ctx, s.imageStorage, product.ImageStorageID)
	product.ImageStorageID = storageID
	return product, nil
}

// Update modifies an existing product.
func (s *Service) Update(ctx context.Context, id string, req UpdateRequest) (*model.Product, error) {
	product, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("products.service.Update: %w", err)
	}

	if req.Title != nil {
		product.Title = *req.Title
	}
	if req.Description != nil {
		product.Description = *req.Description
	}
	if req.Price != nil {
		product.Price = *req.Price
	}
	if req.CategoryID != nil {
		product.CategoryID = *req.CategoryID
	}
	if req.DeliveryType != nil {
		product.DeliveryType = model.DeliveryType(*req.DeliveryType)
	}
	if req.FileID != nil {
		product.FileID = req.FileID
	}
	if req.MessageID != nil {
		product.MessageID = req.MessageID
	}
	if req.InventoryID != nil {
		product.InventoryID = req.InventoryID
	}
	if req.BundleID != nil {
		product.BundleID = req.BundleID
	}
	if req.APIID != nil {
		product.APIID = req.APIID
	}
	if req.DemoURL != nil {
		product.DemoURL = req.DemoURL
	}
	if req.VIPOnly != nil {
		product.VIPOnly = *req.VIPOnly
	}
	if req.Status != nil {
		product.Status = *req.Status
	}

	// Validate delivery type configuration after update
	if err := validateDeliveryType(product.DeliveryType, product.FileID, product.MessageID, product.InventoryID, product.BundleID, product.APIID); err != nil {
		return nil, err
	}

	// Validate foreign key references
	if err := s.validateReferences(ctx, product.FileID, product.MessageID, product.InventoryID, product.BundleID, product.APIID); err != nil {
		return nil, err
	}

	if err := s.repo.Update(ctx, product); err != nil {
		return nil, fmt.Errorf("products.service.Update: %w", err)
	}

	return product, nil
}

// Delete removes a product from the database.
func (s *Service) Delete(ctx context.Context, id string) error {
	product, getErr := s.repo.GetByID(ctx, id)
	if err := s.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("products.service.Delete: %w", err)
	}
	if getErr == nil {
		_ = storage.DeleteFile(ctx, s.imageStorage, product.ImageStorageID)
	}
	return nil
}

// IncrementViews increments the views_count for a product.
func (s *Service) IncrementViews(ctx context.Context, id string) error {
	if err := s.repo.IncrementViews(ctx, id); err != nil {
		return fmt.Errorf("products.service.IncrementViews: %w", err)
	}
	return nil
}

// validateDeliveryType ensures only the matching ID field is set for the delivery_type.
func validateDeliveryType(deliveryType model.DeliveryType, fileID, messageID, inventoryID, bundleID, apiID *string) error {
	// Count how many IDs are set
	setCount := 0
	if fileID != nil {
		setCount++
	}
	if messageID != nil {
		setCount++
	}
	if inventoryID != nil {
		setCount++
	}
	if bundleID != nil {
		setCount++
	}
	if apiID != nil {
		setCount++
	}

	// Exactly one ID should be set
	if setCount != 1 {
		return fmt.Errorf("%w: exactly one delivery ID must be set, got %d", ErrInvalidDeliveryType, setCount)
	}

	// Validate the correct ID is set for the delivery type
	switch deliveryType {
	case model.DeliveryTypeFile:
		if fileID == nil {
			return fmt.Errorf("%w: file delivery requires file_id", ErrInvalidDeliveryType)
		}
	case model.DeliveryTypeMessage:
		if messageID == nil {
			return fmt.Errorf("%w: message delivery requires message_id", ErrInvalidDeliveryType)
		}
	case model.DeliveryTypeInventory:
		if inventoryID == nil {
			return fmt.Errorf("%w: inventory delivery requires inventory_id", ErrInvalidDeliveryType)
		}
	case model.DeliveryTypeBundle:
		if bundleID == nil {
			return fmt.Errorf("%w: bundle delivery requires bundle_id", ErrInvalidDeliveryType)
		}
	case model.DeliveryTypeAPI:
		if apiID == nil {
			return fmt.Errorf("%w: api delivery requires api_id", ErrInvalidDeliveryType)
		}
	default:
		return fmt.Errorf("%w: unknown delivery type %q", ErrInvalidDeliveryType, deliveryType)
	}

	return nil
}

// validateReferences checks if all provided foreign key IDs exist in their respective tables.
func (s *Service) validateReferences(ctx context.Context, fileID, messageID, inventoryID, bundleID, apiID *string) error {
	if fileID != nil {
		exists, err := s.filesRepo.Exists(ctx, *fileID)
		if err != nil {
			return fmt.Errorf("products.service.validateReferences: %w", err)
		}
		if !exists {
			return ErrInvalidFileID
		}
	}

	if messageID != nil {
		exists, err := s.messagesRepo.Exists(ctx, *messageID)
		if err != nil {
			return fmt.Errorf("products.service.validateReferences: %w", err)
		}
		if !exists {
			return ErrInvalidMessageID
		}
	}

	if inventoryID != nil {
		exists, err := s.inventoryRepo.Exists(ctx, *inventoryID)
		if err != nil {
			return fmt.Errorf("products.service.validateReferences: %w", err)
		}
		if !exists {
			return ErrInvalidInventoryID
		}
	}

	if bundleID != nil {
		exists, err := s.bundlesRepo.Exists(ctx, *bundleID)
		if err != nil {
			return fmt.Errorf("products.service.validateReferences: %w", err)
		}
		if !exists {
			return ErrInvalidBundleID
		}
	}

	if apiID != nil {
		exists, err := s.apisRepo.Exists(ctx, *apiID)
		if err != nil {
			return fmt.Errorf("products.service.validateReferences: %w", err)
		}
		if !exists {
			return ErrInvalidAPIID
		}
	}

	return nil
}
