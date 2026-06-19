// ============================================================
//  壓縮器 - 目標大小壓縮 (二分搜尋最佳品質)
// ============================================================

export class Compressor {
    constructor(imageProcessor) {
        this.imageProcessor = imageProcessor;
    }

    /**
     * 將圖片壓縮至目標大小內
     * @param {HTMLImageElement} image - 來源圖片
     * @param {number} targetBytes - 目標位元組數
     * @param {string} format - 'jpeg' | 'webp' | 'png'
     * @param {number} maxWidth - 最大寬度 (0 表示不限制)
     * @param {number} maxHeight - 最大高度 (0 表示不限制)
     * @param {string} bgSetting - 背景設定 (用於非透明格式)
     * @param {string} customBgColor - 自訂背景色
     * @returns {Promise<{blob: Blob, quality: number}>}
     */
    async compressToTarget(image, targetBytes, format, maxWidth = 0, maxHeight = 0, bgSetting = 'transparent', customBgColor = '#ffffff') {
        // 1. 縮圖
        let canvas = this.imageProcessor.resizeImage(image, maxWidth, maxHeight);
        const ctx = canvas.getContext('2d');

        // 2. 處理背景 (JPEG 不支援透明，強制填白)
        const isJpeg = format === 'jpeg' || format === 'jpg';
        if (isJpeg || bgSetting === 'white') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (bgSetting === 'custom') {
            ctx.fillStyle = customBgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        // 若為 transparent 且非 JPEG，保留透明

        // 重新繪製圖片 (因背景可能覆蓋，需重繪)
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        // 3. 若原始品質 92% 已低於目標，直接回傳
        const initialBlob = await this.imageProcessor.canvasToBlob(canvas, format, 0.92);
        if (initialBlob.size <= targetBytes) {
            return { blob: initialBlob, quality: 0.92 };
        }

        // 4. 二分搜尋最佳品質
        let low = 0.05;
        let high = 0.92;
        let bestBlob = null;
        let bestQuality = 0.05;

        for (let i = 0; i < 14; i++) {
            const mid = Math.round((low + high) * 100) / 100;
            const blob = await this.imageProcessor.canvasToBlob(canvas, format, mid);
            
            if (blob.size <= targetBytes) {
                bestBlob = blob;
                bestQuality = mid;
                low = mid;
            } else {
                high = mid;
            }
            
            // 提早終止：已接近目標
            if (bestBlob && Math.abs(bestBlob.size - targetBytes) / targetBytes < 0.03) {
                break;
            }
        }

        // 若完全找不到符合的 (極端情況)，使用最低品質
        if (!bestBlob) {
            bestBlob = await this.imageProcessor.canvasToBlob(canvas, format, 0.05);
            bestQuality = 0.05;
        }

        return { blob: bestBlob, quality: bestQuality };
    }

    /**
     * 簡易版壓縮 (單一品質)
     * @param {HTMLImageElement} image 
     * @param {string} format 
     * @param {number} quality 
     * @param {number} maxWidth 
     * @param {number} maxHeight 
     * @param {string} bgSetting 
     * @param {string} customBgColor 
     * @returns {Promise<Blob>}
     */
    async compressWithQuality(image, format, quality, maxWidth = 0, maxHeight = 0, bgSetting = 'transparent', customBgColor = '#ffffff') {
        let canvas = this.imageProcessor.resizeImage(image, maxWidth, maxHeight);
        const ctx = canvas.getContext('2d');

        const isJpeg = format === 'jpeg' || format === 'jpg';
        if (isJpeg || bgSetting === 'white') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (bgSetting === 'custom') {
            ctx.fillStyle = customBgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        return await this.imageProcessor.canvasToBlob(canvas, format, quality);
    }
}