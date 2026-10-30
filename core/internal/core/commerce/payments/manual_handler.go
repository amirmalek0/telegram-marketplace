package payments

import (
	"errors"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/commerce/payments/manual"
	paymentsrepo "telegram-marketplace/internal/core/commerce/payments/repository"
	"telegram-marketplace/pkg/pagination"
)

func manualIdentity(c *gin.Context) int64 {
	if middleware.GetAdminClaims(c) != nil {
		return 0
	}
	id, ok := middleware.GetTelegramUserID(c)
	if !ok || id <= 0 {
		return -1
	} // zero is reserved exclusively for the admin repository scope
	return id
}
func (h *Handler) manualError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, paymentsrepo.ErrNotFound):
		c.JSON(404, gin.H{"error": "پرداخت پیدا نشد"})
	case errors.Is(err, manual.ErrConflict):
		c.JSON(409, gin.H{"error": err.Error()})
	case errors.Is(err, manual.ErrInvalid), errors.Is(err, ErrInvalidReceipt):
		c.JSON(422, gin.H{"error": err.Error()})
	case errors.Is(err, manual.ErrUnavailable):
		c.JSON(422, gin.H{"error": err.Error()})
	default:
		h.writeCheckoutError(c, err)
	}
}

func (h *Handler) AdminManualConfig(c *gin.Context) {
	value, err := h.service.ManualConfig(c.Request.Context())
	if err != nil {
		h.manualError(c, err)
		return
	}
	c.JSON(200, value)
}
func (h *Handler) AdminSaveManualConfig(c *gin.Context) {
	var config manual.Config
	if err := c.ShouldBindJSON(&config); err != nil {
		h.manualError(c, manual.ErrInvalid)
		return
	}
	value, err := h.service.SaveManualConfig(c.Request.Context(), config, middleware.GetAdminClaims(c).AdminID)
	if err != nil {
		h.manualError(c, err)
		return
	}
	c.JSON(200, value)
}
func (h *Handler) AdminDetectBank(c *gin.Context) {
	var input struct {
		Number string `json:"number"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		h.manualError(c, manual.ErrInvalid)
		return
	}
	number, bank, err := manual.DetectCard(input.Number)
	if err != nil {
		h.manualError(c, err)
		return
	}
	c.JSON(200, gin.H{"number": number, "bank": bank})
}
func (h *Handler) AdminManualPrices(c *gin.Context) {
	p := pagination.FromQuery(c)
	value, err := h.service.ManualPrices(c.Request.Context(), p.PerPage, p.Offset())
	if err != nil {
		h.manualError(c, err)
		return
	}
	c.JSON(200, value)
}
func (h *Handler) AdminSetManualPrice(c *gin.Context) {
	var input struct {
		Toman int64 `json:"toman_price"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		h.manualError(c, manual.ErrInvalid)
		return
	}
	err := h.service.SetManualPrice(c.Request.Context(), c.Param("purpose"), c.Param("target_id"), input.Toman)
	if err != nil {
		h.manualError(c, err)
		return
	}
	c.Status(204)
}
func (h *Handler) ManualPrice(c *gin.Context) {
	value, err := h.service.ManualPrice(c.Request.Context(), c.Query("purpose"), c.Query("target_id"))
	if errors.Is(err, manual.ErrUnavailable) {
		c.JSON(200, gin.H{"available": false})
		return
	}
	if err != nil {
		h.manualError(c, err)
		return
	}
	c.JSON(200, gin.H{"available": true, "price": value})
}
func (h *Handler) CreateManualCheckout(c *gin.Context) {
	var input struct {
		Purpose    string `json:"purpose"`
		TargetID   string `json:"target_id"`
		RequestID  string `json:"request_id"`
		CouponCode string `json:"coupon_code" binding:"max=64"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		h.manualError(c, manual.ErrInvalid)
		return
	}
	value, err := h.service.CreateManualCheckout(c.Request.Context(), manualIdentity(c), input.Purpose, input.TargetID, input.RequestID, input.CouponCode)
	if err != nil {
		h.manualError(c, err)
		return
	}
	c.JSON(201, value)
}
func (h *Handler) GetManualCheckout(c *gin.Context) {
	value, err := h.service.GetManualCheckout(c.Request.Context(), c.Param("id"), manualIdentity(c))
	if err != nil {
		h.manualError(c, err)
		return
	}
	c.JSON(200, value)
}
func (h *Handler) ListManualCheckouts(c *gin.Context) {
	p := pagination.FromQuery(c)
	value, err := h.service.ListManualCheckouts(c.Request.Context(), manualIdentity(c), c.Query("status"), p.PerPage, p.Offset())
	if err != nil {
		h.manualError(c, err)
		return
	}
	c.JSON(200, value)
}
func (h *Handler) SubmitManualProof(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, MaxReceiptBytes+(64<<10))
	if err := c.Request.ParseMultipartForm(MaxReceiptBytes + (64 << 10)); err != nil {
		h.manualError(c, manual.ErrInvalid)
		return
	}
	defer c.Request.MultipartForm.RemoveAll()
	var source io.Reader
	files := c.Request.MultipartForm.File["receipt"]
	if len(files) > 1 {
		h.manualError(c, manual.ErrInvalid)
		return
	}
	if len(files) == 1 {
		file := files[0]
		if file.Size > MaxReceiptBytes {
			h.manualError(c, ErrInvalidReceipt)
			return
		}
		body, err := file.Open()
		if err != nil {
			h.manualError(c, ErrInvalidReceipt)
			return
		}
		defer body.Close()
		source = body
	}
	value, err := h.service.SubmitManualProof(c.Request.Context(), manualIdentity(c), c.Param("id"), c.PostForm("transaction_id"), c.PostForm("card_id"), source)
	if err != nil {
		h.manualError(c, err)
		return
	}
	c.JSON(200, value)
}
func (h *Handler) AdminReviewManualPayment(c *gin.Context) {
	var input struct {
		Decision  string `json:"decision"`
		Note      string `json:"note"`
		Confirmed bool   `json:"confirmed"`
	}
	if err := c.ShouldBindJSON(&input); err != nil || !input.Confirmed || (input.Decision != "approve" && input.Decision != "reject") {
		h.manualError(c, manual.ErrInvalid)
		return
	}
	value, err := h.service.ReviewManualPayment(c.Request.Context(), c.Param("id"), middleware.GetAdminClaims(c).AdminID, input.Decision == "approve", input.Note)
	if err != nil {
		h.manualError(c, err)
		return
	}
	c.JSON(200, value)
}
func (h *Handler) CancelManualPayment(c *gin.Context) {
	if err := h.service.CancelManualPayment(c.Request.Context(), manualIdentity(c), c.Param("id")); err != nil {
		h.manualError(c, err)
		return
	}
	c.Status(204)
}
func (h *Handler) ManualReceipt(c *gin.Context) {
	body, size, err := h.service.OpenManualReceipt(c.Request.Context(), c.Param("id"), manualIdentity(c))
	if err != nil {
		h.manualError(c, err)
		return
	}
	defer body.Close()
	c.Header("Cache-Control", "private, no-store")
	c.Header("X-Content-Type-Options", "nosniff")
	c.Header("Content-Disposition", "inline; filename=receipt.png")
	c.DataFromReader(200, size, "image/png", body, nil)
}
