// ============================================================
//  AI 去背模組 - 動態載入模型並執行去背
// ============================================================

export class BackgroundRemover {
    constructor() {
        this.lib = null;
        this.loading = false;
        this.loadPromise = null;
    }

    /**
     * 載入去背函式庫 (僅首次)
     * @returns {Promise<object>}
     */
    async loadLibrary() {
        if (this.lib) return this.lib;
        if (this.loading) {
            await this.loadPromise;
            return this.lib;
        }

        this.loading = true;
        this.loadPromise = (async () => {
            try {
                const module = await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal/+esm');
                this.lib = module;
                return this.lib;
            } catch (err) {
                console.error('Background removal library load error:', err);
                throw new Error('AI 去背模型載入失敗，請檢查網路連線');
            } finally {
                this.loading = false;
            }
        })();

        return this.loadPromise;
    }

    /**
     * 執行圖片去背
     * @param {HTMLImageElement} image - 原始圖片
     * @param {object} options - 額外選項 (如進度回調)
     * @returns {Promise<Blob>} 去背後的 PNG Blob
     */
    async removeBackground(image, options = {}) {
        const lib = await this.loadLibrary();
        if (!lib || typeof lib.removeBackground !== 'function') {
            throw new Error('去背函式庫未正確載入');
        }

        try {
            // 傳入圖片元素或 URL
            const result = await lib.removeBackground(image, {
                progress: options.onProgress || (() => {}),
                // 可調整參數以提升效能
                model: 'default'
            });
            return result;
        } catch (err) {
            console.error('Remove background error:', err);
            throw new Error('去背處理失敗: ' + (err.message || '未知錯誤'));
        }
    }

    /**
     * 檢查函式庫是否已載入
     * @returns {boolean}
     */
    isLoaded() {
        return !!this.lib;
    }

    /**
     * 檢查是否正在載入
     * @returns {boolean}
     */
    isLoading() {
        return this.loading;
    }
}