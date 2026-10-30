package settings

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

func (h *Handler) UploadWidgetImage(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, MaxWidgetImageBytes+(64<<10))
	file, err := c.FormFile("image")
	if c.Request.MultipartForm != nil {
		defer c.Request.MultipartForm.RemoveAll()
	}
	if err != nil || file.Size > MaxWidgetImageBytes {
		c.JSON(http.StatusBadRequest, gin.H{"error": ErrInvalidWidgetImage.Error()})
		return
	}
	source, err := file.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": ErrInvalidWidgetImage.Error()})
		return
	}
	defer source.Close()
	url, err := h.service.UploadWidgetImage(c.Request.Context(), source)
	if err != nil {
		if errors.Is(err, ErrInvalidWidgetImage) {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "بارگذاری تصویر ناموفق بود"})
		}
		return
	}
	c.JSON(http.StatusCreated, gin.H{"url": url})
}

func (h *Handler) WidgetImage(c *gin.Context) {
	body, size, err := h.service.OpenWidgetImage(c.Request.Context(), c.Param("key"))
	if err != nil {
		c.Status(http.StatusNotFound)
		return
	}
	defer body.Close()
	c.Header("X-Content-Type-Options", "nosniff")
	c.Header("Cache-Control", "public, max-age=31536000, immutable")
	c.DataFromReader(http.StatusOK, size, "image/png", body, nil)
}
