package payments

import (
	"bytes"
	"image"
	"image/jpeg"
	"image/png"
	"testing"
)

func TestReceiptNormalization(t *testing.T) {
	for _, format := range []string{"png", "jpeg"} {
		var input bytes.Buffer
		img := image.NewRGBA(image.Rect(0, 0, 3, 3))
		if format == "png" {
			_ = png.Encode(&input, img)
		} else {
			_ = jpeg.Encode(&input, img, nil)
		}
		out, err := normalizeReceipt(&input)
		if err != nil {
			t.Fatal(err)
		}
		cfg, kind, err := image.DecodeConfig(bytes.NewReader(out))
		if err != nil || kind != "png" || cfg.Width != 3 {
			t.Fatal("normalization failed")
		}
	}
	for _, invalid := range [][]byte{[]byte("<svg xmlns='http://www.w3.org/2000/svg'></svg>"), []byte("<html>receipt</html>"), make([]byte, MaxReceiptBytes+1)} {
		if _, err := normalizeReceipt(bytes.NewReader(invalid)); err == nil {
			t.Fatal("unsafe receipt accepted")
		}
	}
}
