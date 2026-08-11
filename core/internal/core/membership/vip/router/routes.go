package router

import (
	"github.com/gin-gonic/gin"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/membership/vip"
)

// RegisterRoutes mounts all VIP plan endpoints onto the provided RouterGroup.
// Read operations are accessible to both admins and telegram users.
// Write operations (create, update, delete) are admin-only.
func RegisterRoutes(rg *gin.RouterGroup, h *vip.Handler) {
	g := rg.Group("/vip/plan")

	// Accessible by both admins and telegram users
	public := g.Group("", middleware.RequireAny())
	{
		public.GET("", h.List)
		public.GET("/:id", h.GetByID)
	}

	// Admin-only operations
	admin := g.Group("", middleware.RequireAdmin())
	{
		admin.POST("", h.Create)
		admin.PATCH("/:id", h.Update)
		admin.DELETE("/:id", h.Delete)
	}
}
