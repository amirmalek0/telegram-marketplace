package users

import "github.com/gin-gonic/gin"

// RegisterRoutes mounts all user endpoints onto the provided RouterGroup.
func RegisterRoutes(rg *gin.RouterGroup, h *Handler) {
	g := rg.Group("/users")
	{
		g.POST("", h.Create)
		g.GET("", h.List)
		g.GET("/:id", h.GetByID)
		g.PATCH("/:id", h.Update)
		g.PATCH("/:id/ban", h.SetBanned)
		g.DELETE("/:id", h.Delete)
	}
}
