package settings

import (
	"errors"
	"github.com/gin-gonic/gin"
	"net/http"
)

func (h *Handler) UploadLogo(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, MaxLogoBytes+(64<<10))
	file, err := c.FormFile("logo")
	if c.Request.MultipartForm != nil {
		defer c.Request.MultipartForm.RemoveAll()
	}
	if err != nil || file.Size > MaxLogoBytes {
		c.JSON(http.StatusBadRequest, gin.H{"error": ErrInvalidLogo.Error()})
		return
	}
	source, err := file.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": ErrInvalidLogo.Error()})
		return
	}
	defer source.Close()
	url, err := h.service.UploadLogo(c.Request.Context(), source)
	if err != nil {
		if errors.Is(err, ErrInvalidLogo) {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "بارگذاری لوگو ناموفق بود"})
		}
		return
	}
	c.JSON(http.StatusCreated, gin.H{"url": url})
}

func (h *Handler) Logo(c *gin.Context) {
	body, size, err := h.service.OpenLogo(c.Request.Context(), c.Param("key"))
	if err != nil {
		c.Status(http.StatusNotFound)
		return
	}
	defer body.Close()
	c.Header("X-Content-Type-Options", "nosniff")
	c.Header("Cache-Control", "public, max-age=31536000, immutable")
	c.DataFromReader(http.StatusOK, size, "image/png", body, nil)
}
