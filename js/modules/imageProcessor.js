// ============================================================
//  圖片處理器 - Canvas 繪圖、縮放、格式編碼
// ============================================================

export class ImageProcessor {
    /**
     * 建立圖示 Canvas (正方形)
     * @param {object} imageData - 圖片資料物件 (包含 image 或 debackedImage)
     * @param {number} size - 目標尺寸
     * @param {object} options - 選項
     * @param {string} options.bgSetting - 'transparent' | 'white' | 'custom'
     * @param {string} options.customBgColor - 自訂背景色 (hex)
     * @param {string} options.scalingMethod - 'contain' | 'cover' | 'fill' | 'center'
     * @param {boolean} options.useDebacked - 是否使用去背圖
     * @returns {HTMLCanvasElement}
     */
    createIconCanvas(imageData, size, options = {}) {
        const {
            bgSetting = 'transparent',
            customBgColor = '#ffffff',
            scalingMethod = 'contain',
            useDebacked = false
        } = options;

        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // 決定來源圖片
        const sourceImage = (useDebacked && imageData.debackedImage) 
            ? imageData.debackedImage 
            : imageData.image;

        if (!sourceImage) {
            // 若無圖片，回傳空白 Canvas
            ctx.fillStyle = '#cccccc';
            ctx.fillRect(0, 0, size, size);
            return canvas;
        }

        // 套用背景
        if (bgSetting === 'white') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, size, size);
        } else if (bgSetting === 'custom') {
            ctx.fillStyle = customBgColor;
            ctx.fillRect(0, 0, size, size);
        }
        // 若為 transparent，不填色 (保留透明)

        // 套用縮放
        this.drawImageWithScaling(ctx, sourceImage, size, scalingMethod);

        return canvas;
    }

    /**
     * 在 Canvas 上繪製圖片 (套用縮放模式)
     * @param {CanvasRenderingContext2D} ctx 
     * @param {HTMLImageElement} image 
     * @param {number} size - 畫布尺寸 (正方形)
     * @param {string} method 
     */
    drawImageWithScaling(ctx, image, size, method) {
        const imgAspect = image.width / image.height;
        const canvasAspect = 1; // 正方形

        let drawWidth, drawHeight, drawX, drawY;

        switch (method) {
            case 'contain':
                if (imgAspect > canvasAspect) {
                    drawWidth = size;
                    drawHeight = size / imgAspect;
                } else {
                    drawWidth = size * imgAspect;
                    drawHeight = size;
                }
                drawX = (size - drawWidth) / 2;
                drawY = (size - drawHeight) / 2;
                break;

            case 'cover':
                if (imgAspect > canvasAspect) {
                    drawWidth = size * imgAspect;
                    drawHeight = size;
                } else {
                    drawWidth = size;
                    drawHeight = size / imgAspect;
                }
                drawX = (size - drawWidth) / 2;
                drawY = (size - drawHeight) / 2;
                break;

            case 'fill':
                drawWidth = size;
                drawHeight = size;
                drawX = 0;
                drawY = 0;
                break;

            case 'center':
            default:
                drawWidth = image.width;
                drawHeight = image.height;
                drawX = (size - drawWidth) / 2;
                drawY = (size - drawHeight) / 2;
                break;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    }

    /**
     * 將 Canvas 編碼為 Blob
     * @param {HTMLCanvasElement} canvas 
     * @param {string} format - 'png' | 'webp' | 'jpeg'
     * @param {number} quality - 0~1 (僅 webp/jpeg)
     * @returns {Promise<Blob>}
     */
    canvasToBlob(canvas, format, quality = 0.92) {
        return new Promise((resolve) => {
            const mimeMap = {
                png: 'image/png',
                webp: 'image/webp',
                jpeg: 'image/jpeg',
                jpg: 'image/jpeg'
            };
            const mimeType = mimeMap[format] || 'image/png';
            
            if (format === 'png') {
                canvas.toBlob((blob) => resolve(blob), 'image/png');
            } else {
                canvas.toBlob((blob) => {
                    // WebP fallback for Safari
                    if (!blob && format === 'webp') {
                        canvas.toBlob((fallback) => resolve(fallback), 'image/png', 0.9);
                    } else {
                        resolve(blob);
                    }
                }, mimeType, quality);
            }
        });
    }

    /**
     * 將 PNG Blob 包裝成 ICO 檔案格式
     * @param {Blob} pngBlob - PNG 圖片的 Blob
     * @param {number} size - 圖示尺寸
     * @returns {Promise<Blob>}
     */
    async pngToIco(pngBlob, size) {
        const arrayBuffer = await pngBlob.arrayBuffer();
        const imageData = new Uint8Array(arrayBuffer);
        return this.buildSimpleICOFile(imageData, size);
    }

    /**
     * 建立簡單的 ICO 檔案 (單一圖片)
     * @param {Uint8Array} imageData - PNG 原始資料
     * @param {number} size - 尺寸
     * @returns {Blob}
     */
    buildSimpleICOFile(imageData, size) {
        const headerSize = 6 + 16; // Header + one directory entry
        const totalSize = headerSize + imageData.length;

        const buffer = new ArrayBuffer(totalSize);
        const view = new DataView(buffer);
        const uint8View = new Uint8Array(buffer);

        // ICO header
        view.setUint16(0, 0, true);      // Reserved
        view.setUint16(2, 1, true);      // Type (1 = ICO)
        view.setUint16(4, 1, true);      // Number of images (1)

        // Directory entry
        const displaySize = size === 256 ? 0 : size;
        view.setUint8(6, displaySize);   // Width
        view.setUint8(7, displaySize);   // Height
        view.setUint8(8, 0);             // Color palette
        view.setUint8(9, 0);             // Reserved
        view.setUint16(10, 1, true);     // Color planes
        view.setUint16(12, 32, true);    // Bits per pixel
        view.setUint32(14, imageData.length, true); // Image size
        view.setUint32(18, headerSize, true);       // Image offset

        // Image data
        uint8View.set(imageData, headerSize);

        return new Blob([buffer], { type: 'image/x-icon' });
    }

    /**
     * 繪製棋盤格背景 (用於去背預覽)
     * @param {CanvasRenderingContext2D} ctx 
     * @param {number} size 
     * @param {number} tileSize 
     */
    drawCheckerboard(ctx, size, tileSize = 8) {
        for (let y = 0; y < size; y += tileSize) {
            for (let x = 0; x < size; x += tileSize) {
                const light = (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0;
                ctx.fillStyle = light ? '#d1d5db' : '#9ca3af';
                ctx.fillRect(x, y, tileSize, tileSize);
            }
        }
    }

    /**
     * 將 Blob 轉為 HTMLImageElement
     * @param {Blob} blob 
     * @returns {Promise<HTMLImageElement>}
     */
    blobToImage(blob) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(img.src);
                resolve(img);
            };
            img.onerror = () => {
                URL.revokeObjectURL(img.src);
                reject(new Error('Failed to load image from blob'));
            };
            img.src = URL.createObjectURL(blob);
        });
    }

    /**
     * 調整圖片尺寸 (用於壓縮前的縮圖)
     * @param {HTMLImageElement} image 
     * @param {number} maxWidth 
     * @param {number} maxHeight 
     * @returns {HTMLCanvasElement}
     */
    resizeImage(image, maxWidth, maxHeight) {
        let width = image.width;
        let height = image.height;

        if (maxWidth > 0 && width > maxWidth) {
            height = height * (maxWidth / width);
            width = maxWidth;
        }
        if (maxHeight > 0 && height > maxHeight) {
            width = width * (maxHeight / height);
            height = maxHeight;
        }

        width = Math.round(width);
        height = Math.round(height);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, 0, 0, width, height);
        return canvas;
    }
}