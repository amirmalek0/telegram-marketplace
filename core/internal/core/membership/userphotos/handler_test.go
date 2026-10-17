package userphotos

import (
	"github.com/gin-gonic/gin"
	"net/http/httptest"
	"net/url"
	"telegram-marketplace/internal/app/middleware"
	"telegram-marketplace/internal/core/membership/auth"
	"telegram-marketplace/internal/core/membership/userphotos/model"
	"testing"
)

func TestPhotoContentAuthorization(t *testing.T) {
	gin.SetMode(gin.TestMode)
	const userID = "11111111-1111-1111-1111-111111111111"
	const photoID = "22222222-2222-2222-2222-222222222222"
	for _, test := range []struct {
		name, identity string
		status         int
	}{{"anonymous", "", 401}, {"other user", "other", 403}, {"owner", "owner", 200}, {"admin", "admin", 200}} {
		t.Run(test.name, func(t *testing.T) {
			repo := &fakeRepo{photos: map[string]model.Photo{"unique": {ID: photoID, UserID: userID, StorageKey: "private", ContentType: "image/jpeg"}}}
			store := &fakeStore{}
			handler := NewHandler(NewService(repo, nil, store))
			router := gin.New()
			router.Use(func(c *gin.Context) {
				switch test.identity {
				case "admin":
					c.Set(middleware.AdminClaimsKey, &auth.Claims{AdminID: "admin"})
				case "owner":
					c.Set(middleware.InitDataKey, url.Values{"user": {`{"id":42}`}})
				case "other":
					c.Set(middleware.InitDataKey, url.Values{"user": {`{"id":99}`}})
				}
				c.Next()
			})
			router.GET("/user/:id/photos/:photoID/content", middleware.RequireAny(), handler.Content)
			response := httptest.NewRecorder()
			router.ServeHTTP(response, httptest.NewRequest("GET", "/user/"+userID+"/photos/"+photoID+"/content", nil))
			if response.Code != test.status {
				t.Fatal(response.Code, response.Body.String())
			}
			if test.status != 200 && store.opens != 0 {
				t.Fatal("private storage read before authorization")
			}
			if test.status == 200 && (response.Header().Get("Cache-Control") != "private, no-store" || response.Body.String() != "jpeg") {
				t.Fatal("wrong content/cache policy")
			}
			response = httptest.NewRecorder()
			router.ServeHTTP(response, httptest.NewRequest("GET", "/user/"+userID+"/photos/bad-id/content", nil))
			if test.identity != "" && response.Code != 400 {
				t.Fatal("invalid ID accepted")
			}
		})
	}
}
