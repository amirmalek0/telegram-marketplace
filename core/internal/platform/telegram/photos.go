package telegram

import (
	"context"
	"errors"
	"io"
	"net/http"
	"path"
	"strings"
)

type PhotoSize struct {
	FileID   string `json:"file_id"`
	UniqueID string `json:"file_unique_id"`
	Width    int    `json:"width"`
	Height   int    `json:"height"`
}
type ProfilePhotos struct {
	Total  int           `json:"total_count"`
	Photos [][]PhotoSize `json:"photos"`
}

func (c *Client) GetProfilePhotos(ctx context.Context, userID int64, offset int) (ProfilePhotos, error) {
	result, err := call[ProfilePhotos](ctx, c, "getUserProfilePhotos", map[string]any{"user_id": userID, "offset": offset, "limit": 100})
	// Never expose errors containing Bot API URLs (which contain the bot token).
	if err != nil {
		return ProfilePhotos{}, errors.New("telegram profile photos unavailable")
	}
	return result, nil
}

// DownloadProfilePhoto only downloads a getFile path from the configured Bot API.
// It never fetches a client-supplied photo URL, follows redirects, or accepts SVG.
func (c *Client) DownloadProfilePhoto(ctx context.Context, fileID string) ([]byte, string, error) {
	file, err := call[struct {
		Path string `json:"file_path"`
	}](ctx, c, "getFile", map[string]string{"file_id": fileID})
	if err != nil {
		return nil, "", errors.New("telegram photo file unavailable")
	}
	if file.Path == "" || path.Clean(file.Path) != file.Path || strings.HasPrefix(file.Path, "/") || strings.ContainsAny(file.Path, ":\\?#%") || strings.HasPrefix(file.Path, "../") {
		return nil, "", errors.New("invalid telegram file path")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/file/bot"+c.token+"/"+file.Path, nil)
	if err != nil {
		return nil, "", errors.New("invalid photo request")
	}
	client := *c.httpClient
	client.CheckRedirect = func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
	resp, err := client.Do(req)
	if err != nil {
		return nil, "", errors.New("telegram photo download failed")
	}
	defer resp.Body.Close()
	const maxPhotoBytes = 10 * 1024 * 1024
	if resp.StatusCode != http.StatusOK || resp.ContentLength > maxPhotoBytes {
		return nil, "", errors.New("photo download rejected")
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, maxPhotoBytes+1))
	if err != nil || len(data) == 0 || len(data) > maxPhotoBytes {
		return nil, "", errors.New("invalid photo size")
	}
	mime := http.DetectContentType(data)
	if mime != "image/jpeg" && mime != "image/png" && mime != "image/webp" {
		return nil, "", errors.New("unsupported photo type")
	}
	return data, mime, nil
}
