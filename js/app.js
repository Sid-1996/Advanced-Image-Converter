// ============================================================
//  主應用程式 - 協調所有模組
// ============================================================

import { FileHandler } from './modules/fileHandler.js';
import { ImageProcessor } from './modules/imageProcessor.js';
import { BackgroundRemover } from './modules/backgroundRemover.js';
import { Compressor } from './modules/compressor.js';
import { UIManager } from './modules/uiManager.js';
import { trackEvent } from './analytics.js';

class App {
    constructor() {
        // 初始化模組
        this.fileHandler = new FileHandler();
        this.imageProcessor = new ImageProcessor();
        this.backgroundRemover = new BackgroundRemover();
        this.compressor = new Compressor(this.imageProcessor);
        this.ui = new UIManager();

        // 狀態
        this.processedResults = new Map(); // imageId -> { format, size, data }
        this.isProcessing = false;
        this.debackingInProgress = false;

        this.init();
    }

    init() {
        // 深色模式
        this.ui.initDarkMode();

        // 綁定事件
        this.bindEvents();
        
        // 設定預設模式
        this.ui.switchMode('convert');
        
        // 追蹤頁面瀏覽
        trackEvent('page_view', {
            page_title: 'PicTool 圖片工具箱',
            page_location: window.location.href
        });
    }

    bindEvents() {
        const ui = this.ui;
        const fileInput = ui.el.fileInput;
        const uploadZone = ui.el.uploadZone;

        // ---- 上傳 ----
        uploadZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFiles(Array.from(e.target.files)));

        // 拖放
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });
        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragover');
        });
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
            if (files.length > 0) {
                this.handleFiles(files);
                trackEvent('file_upload', { method: 'drag_drop', file_count: files.length });
            }
        });

        // 貼上
        document.addEventListener('paste', (e) => {
            const items = e.clipboardData?.items || [];
            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    this.handleFiles([item.getAsFile()]);
                    trackEvent('file_upload', { method: 'clipboard_paste', file_count: 1 });
                    break;
                }
            }
        });

        // ---- 清除 ----
        ui.el.clearAllBtn.addEventListener('click', () => this.clearAll());

        // ---- 模式切換 ----
        ui.el.tabConvert.addEventListener('click', () => this.switchMode('convert'));
        ui.el.tabDeback.addEventListener('click', () => this.switchMode('deback'));
        ui.el.tabCompress.addEventListener('click', () => this.switchMode('compress'));

        // ---- 轉換按鈕 ----
        document.getElementById('convertButton')?.addEventListener('click', () => this.startConversion());

        // ---- 壓縮按鈕 ----
        ui.el.compressDownloadBtn?.addEventListener('click', () => this.downloadCompressedImage());
        document.getElementById('compressButton')?.addEventListener('click', () => this.compressCurrentImage());

        // ---- 去背切換 ----
        ui.el.debackToggle?.addEventListener('change', () => this.handleBgRemovalToggle());

        // ---- 下載按鈕 (事件委託) ----
        ui.el.downloadButtons.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            if (btn.dataset.action === 'batchDownload') {
                this.downloadAllImages();
            } else if (btn.dataset.action === 'downloadSingle') {
                this.downloadSingleImage(btn.dataset.imageId);
            }
        });

        // ---- 批次列表移除 (事件委託) ----
        ui.el.batchList.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action="removeImage"]');
            if (btn) {
                this.removeImage(btn.dataset.imageId);
            }
        });

        // ---- 去背後下載原圖 ----
        ui.el.debackDownloadBtn?.addEventListener('click', () => {
            this.downloadDebackedOriginal();
        });

        // ---- 壓縮設定變更 (重新壓縮) ----
        const recompressTriggers = [
            ...document.querySelectorAll('input[name="compressFormat"]'),
            ...document.querySelectorAll('input[name="compressBackground"]'),
            ui.el.compressCustomBgColor,
            ui.el.compressTargetSize,
            ui.el.compressSizeUnit,
            ui.el.compressMaxWidth,
            ui.el.compressMaxHeight
        ].filter(el => el);
        
        for (const el of recompressTriggers) {
            el.addEventListener('change', () => {
                this.updateCompressWarning();
                if (this.fileHandler.getCount() > 0 && !ui.el.compressResult.classList.contains('hidden')) {
                    this.compressCurrentImage();
                }
            });
        }

        // ---- 轉換設定變更 (debounce preview) ----
        const settingTriggers = [
            ...document.querySelectorAll('.size-radio, .format-radio'),
            ...document.querySelectorAll('input[name="background"]'),
            ui.el.scalingMethod,
            ui.el.customBgColor,
            ui.el.customFileName,
            ui.el.addSizeToName,
            ui.el.debackToggle
        ].filter(el => el);

        let debounceTimer = null;
        for (const el of settingTriggers) {
            el.addEventListener('change', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    if (this.processedResults.size > 0 && this.fileHandler.getCount() > 0) {
                        // 若已有轉換結果，自動重新轉換 (或者只更新預覽?)
                        // 此處簡化：若已顯示下載區，重新執行轉換
                        if (!this.ui.el.downloadSection.classList.contains('hidden')) {
                            this.startConversion();
                        }
                    }
                }, 500);
            });
        }

        // ---- 鍵盤快捷提示 ----
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'v') {
                // 僅顯示提示 (實際貼上由 paste 事件處理)
                const hint = document.createElement('div');
                hint.textContent = '📋 偵測到貼上指令...';
                hint.className = 'fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-pulse';
                document.body.appendChild(hint);
                setTimeout(() => hint.remove(), 1500);
            }
        });

        // ---- 上傳按鈕文字動態 ----
        // 已在 switchMode 中處理
    }

    // ===== 檔案處理 =====
    async handleFiles(files) {
        const validFiles = files.filter(f => f.type.startsWith('image/'));
        if (validFiles.length === 0) {
            this.ui.showStatus('請選擇有效的圖片檔案', 'error');
            return;
        }

        this.ui.showStatus(`正在載入 ${validFiles.length} 個檔案...`, 'info');

        // 壓縮模式僅保留一張
        const clearFirst = this.ui.currentMode === 'compress';
        const ids = await this.fileHandler.addFiles(validFiles, clearFirst);

        if (ids.length === 0) {
            this.ui.showStatus('載入失敗', 'error');
            return;
        }

        // 更新 UI
        this.updateUIAfterFileChange();

        const isDebackMode = this.ui.currentMode === 'deback';
        const isCompress = this.ui.currentMode === 'compress';

        // 去背模式自動執行去背
        if (isDebackMode || this.ui.el.debackToggle?.checked) {
            if (isDebackMode) {
                this.ui.el.debackToggle.checked = true;
                this.ui.showDebackPanel();
            }
            await this.startBatchDebacking();
        }

        // 壓縮模式自動執行壓縮
        if (isCompress && this.fileHandler.getCount() > 0) {
            this.compressCurrentImage();
        }

        this.ui.showStatus(`✅ 成功載入 ${ids.length} 個圖片！`, 'success');
        trackEvent('files_loaded', {
            file_count: ids.length,
            mode: this.ui.currentMode
        });
    }

    removeImage(imageId) {
        this.fileHandler.removeImage(imageId);
        this.processedResults.delete(imageId);
        this.updateUIAfterFileChange();
        if (this.fileHandler.getCount() === 0) {
            this.ui.hideDownloadSection();
            this.ui.hideCompressResult();
            this.ui.hideDebackPanel();
            this.ui.hideStatus();
        }
        trackEvent('image_removed');
    }

    clearAll() {
        const count = this.fileHandler.getCount();
        this.fileHandler.clearAll();
        this.processedResults.clear();
        this.ui.hideCompressResult();
        this.ui.hideDebackPanel();
        this.ui.el.compressDebackBgSection?.classList.add('hidden');
        this.updateUIAfterFileChange();
        this.ui.hideDownloadSection();
        this.ui.hideStatus();
        this.ui.showStatus(`已清除 ${count} 張圖片`, 'info');
        trackEvent('clear_all_images', { cleared_count: count });
    }

    updateUIAfterFileChange() {
        this.ui.updateImageDisplay(this.fileHandler.images);
        const count = this.fileHandler.getCount();
        const mode = this.ui.currentMode;
        if (count > 0) {
            if (mode === 'convert') {
                this.ui.el.settingsPanel.classList.remove('hidden');
            } else if (mode === 'deback') {
                this.ui.el.batchSection.classList.remove('hidden');
            }
        } else {
            this.ui.el.settingsPanel.classList.add('hidden');
        }
        // 若轉換結果存在但圖片被清空，隱藏下載區
        if (count === 0) {
            this.ui.hideDownloadSection();
        }
    }

    // ===== 模式切換 =====
    switchMode(mode) {
        this.ui.switchMode(mode);
        const count = this.fileHandler.getCount();
        
        if (mode === 'convert') {
            if (count > 0) {
                this.ui.el.settingsPanel.classList.remove('hidden');
                this.ui.updateImageDisplay(this.fileHandler.images);
                if (this.processedResults.size > 0) {
                    this.ui.showDownloadSection();
                    this.generateDownloadUI();
                }
            }
        } else if (mode === 'deback') {
            if (count > 0) {
                this.ui.el.batchSection.classList.remove('hidden');
                this.ui.updateImageDisplay(this.fileHandler.images);
                this.ui.el.debackToggle.checked = true;
                this.ui.showDebackPanel();
                this.startBatchDebacking();
            }
        } else {
            // 壓縮模式
            this.ui.el.batchSection.classList.add('hidden');
            if (this.ui.el.debackToggle?.checked) {
                this.ui.el.compressDebackBgSection?.classList.remove('hidden');
            }
            if (count > 0) {
                this.compressCurrentImage();
            }
        }
    }

    // ===== 轉換流程 =====
    async startConversion() {
        if (this.isProcessing) return;
        if (this.fileHandler.getCount() === 0) {
            this.ui.showStatus('請先上傳圖片', 'error');
            return;
        }

        this.isProcessing = true;
        const btn = document.getElementById('convertButton');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = '⏳ 轉換中...';

        try {
            await this.processAllImages();
            this.ui.showDownloadSection();
            this.generateDownloadUI();
            this.ui.showStatus('✅ 轉換完成！', 'success');
            trackEvent('conversion_completed', {
                format: this.getSelectedFormat(),
                size: this.getSelectedSize(),
                image_count: this.fileHandler.getCount()
            });
        } catch (err) {
            console.error('Conversion error:', err);
            this.ui.showStatus('❌ 轉換失敗：' + err.message, 'error');
            trackEvent('conversion_error', { error_message: err.message });
        } finally {
            this.isProcessing = false;
            btn.disabled = false;
            btn.textContent = '🚀 開始轉換';
        }
    }

    async processAllImages() {
        const format = this.getSelectedFormat();
        const size = parseInt(this.getSelectedSize());
        const bgSetting = document.querySelector('input[name="background"]:checked')?.value || 'transparent';
        const customBg = this.ui.el.customBgColor?.value || '#ffffff';
        const scaling = this.ui.el.scalingMethod?.value || 'contain';
        const useDebacked = this.ui.el.debackToggle?.checked || false;

        // 確保去背完成
        if (useDebacked) {
            await this.startBatchDebacking();
        }

        this.processedResults.clear();
        this.ui.showProgress();

        const entries = Array.from(this.fileHandler.images.entries());
        let current = 0;
        const total = entries.length;

        for (const [id, data] of entries) {
            // 建立 Canvas
            const canvas = this.imageProcessor.createIconCanvas(data, size, {
                bgSetting,
                customBgColor: customBg,
                scalingMethod: scaling,
                useDebacked
            });

            let blob;
            if (format === 'ico') {
                const pngBlob = await this.imageProcessor.canvasToBlob(canvas, 'png', 0.92);
                blob = await this.imageProcessor.pngToIco(pngBlob, size);
            } else {
                blob = await this.imageProcessor.canvasToBlob(canvas, format, 0.92);
            }

            this.processedResults.set(id, {
                format: format,
                size: size,
                data: blob
            });

            current++;
            this.ui.updateProgress(current, total, `處理 ${data.name} (${current}/${total})`);
        }

        this.ui.hideProgress();
    }

    generateDownloadUI() {
        const images = this.fileHandler.images;
        const results = this.processedResults;
        const ui = this.ui;

        // 更新預覽
        ui.updatePreviewGrid(images, results, this.imageProcessor);

        // 生成下載按鈕
        ui.generateDownloadButtons(images, results, (id, result) => {
            return this.generateFileName(id, result);
        });
    }

    generateFileName(imageId, result) {
        const customName = this.ui.el.customFileName?.value || '';
        const addSize = this.ui.el.addSizeToName?.checked || false;
        const data = this.fileHandler.getImage(imageId);
        
        let base = customName ? this.ui.sanitizeFilename(customName) : (data ? this.ui.sanitizeFilename(data.name) : 'image');
        
        if (customName && this.fileHandler.getCount() > 1) {
            const ids = this.fileHandler.getImageIds();
            const idx = ids.indexOf(imageId);
            base = `${base}_${idx + 1}`;
        }
        
        if (addSize) {
            base = `${base}_${result.size}x${result.size}`;
        }
        
        return `${base}.${result.format}`;
    }

    getSelectedFormat() {
        const el = document.querySelector('.format-radio:checked');
        return el ? el.value : 'ico';
    }

    getSelectedSize() {
        const el = document.querySelector('.size-radio:checked');
        return el ? el.value : '32';
    }

    // ===== 下載 =====
    downloadSingleImage(imageId) {
        const result = this.processedResults.get(imageId);
        if (!result) {
            this.ui.showStatus('請先處理圖片', 'error');
            return;
        }
        const filename = this.generateFileName(imageId, result);
        this.downloadBlob(result.data, filename);
        trackEvent('file_download', { format: result.format, size: result.size });
        this.ui.showStatus(`✅ 已下載 ${filename}`, 'success');
    }

    downloadAllImages() {
        const ids = this.fileHandler.getImageIds();
        if (ids.length === 0) return;

        this.ui.showStatus(`開始批次下載 ${ids.length} 個檔案...`, 'info');
        let count = 0;

        for (const id of ids) {
            const result = this.processedResults.get(id);
            if (result) {
                const filename = this.generateFileName(id, result);
                // 延遲下載避免瀏覽器阻擋
                setTimeout(() => {
                    this.downloadBlob(result.data, filename);
                    count++;
                    if (count === ids.length) {
                        this.ui.showStatus(`✅ 批次下載完成！共 ${count} 個檔案`, 'success');
                    }
                }, count * 300);
            }
        }

        trackEvent('batch_download', {
            file_count: ids.length,
            format: this.getSelectedFormat()
        });
    }

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ===== 壓縮功能 =====
    async compressCurrentImage() {
        if (this.isProcessing) return;
        const data = this.fileHandler.getFirstImage();
        if (!data) {
            this.ui.showStatus('請先上傳圖片', 'error');
            return;
        }

        this.isProcessing = true;
        this.ui.showStatus('⏳ 正在壓縮...', 'info');

        try {
            const targetSize = parseFloat(this.ui.el.compressTargetSize?.value || '1');
            const unit = this.ui.el.compressSizeUnit?.value || 'MB';
            const targetBytes = unit === 'MB' ? targetSize * 1024 * 1024 : targetSize * 1024;
            const format = document.querySelector('input[name="compressFormat"]:checked')?.value || 'jpeg';
            const maxW = parseInt(this.ui.el.compressMaxWidth?.value) || 0;
            const maxH = parseInt(this.ui.el.compressMaxHeight?.value) || 0;

            if (!targetSize || targetSize <= 0) {
                this.ui.showStatus('請輸入有效的目標大小', 'error');
                this.isProcessing = false;
                return;
            }

            // 確保去背完成
            const bgRemovalOn = this.ui.el.debackToggle?.checked || false;
            if (bgRemovalOn && !data.debackedImage) {
                await this.startBatchDebacking();
            }

            const sourceImage = (bgRemovalOn && data.debackedImage) ? data.debackedImage : data.image;
            if (!sourceImage) {
                this.ui.showStatus('圖片載入失敗', 'error');
                this.isProcessing = false;
                return;
            }

            const bgSetting = document.querySelector('input[name="compressBackground"]:checked')?.value || 'transparent';
            const customBg = this.ui.el.compressCustomBgColor?.value || '#ffffff';

            const result = await this.compressor.compressToTarget(
                sourceImage, targetBytes, format, maxW, maxH, bgSetting, customBg
            );

            data.compressResultBlob = result.blob;
            data.compressQuality = result.quality;

            this.ui.showCompressResult(data, result, data.file);
            this.ui.showStatus('✅ 壓縮完成！', 'success');

            trackEvent('compress_completed', {
                format,
                original_size: data.file.size,
                compressed_size: result.blob.size,
                quality: result.quality
            });

        } catch (err) {
            console.error('Compression error:', err);
            this.ui.showStatus('❌ 壓縮失敗：' + err.message, 'error');
        } finally {
            this.isProcessing = false;
        }
    }

    downloadCompressedImage() {
        const data = this.fileHandler.getFirstImage();
        if (!data || !data.compressResultBlob) {
            this.ui.showStatus('請先執行壓縮', 'error');
            return;
        }
        const format = document.querySelector('input[name="compressFormat"]:checked')?.value || 'jpeg';
        const ext = format === 'jpeg' ? 'jpg' : format;
        const targetSize = this.ui.el.compressTargetSize?.value || '1';
        const unit = this.ui.el.compressSizeUnit?.value || 'MB';
        const filename = `${data.name}_compressed_${targetSize}${unit}.${ext}`;
        this.downloadBlob(data.compressResultBlob, filename);
        this.ui.showStatus(`✅ 已下載 ${filename}`, 'success');
    }

    // ===== 去背功能 =====
    async handleBgRemovalToggle() {
        if (this.ui.el.debackToggle?.checked) {
            this.ui.showDebackPanel();
            if (this.ui.currentMode === 'compress') {
                this.ui.el.compressDebackBgSection?.classList.remove('hidden');
            }
            await this.startBatchDebacking();
        } else {
            this.clearDebackResults();
        }
    }

    async startBatchDebacking() {
        if (this.debackingInProgress) {
            while (this.debackingInProgress) {
                await new Promise(r => setTimeout(r, 200));
            }
            return;
        }

        this.debackingInProgress = true;
        const ui = this.ui;
        ui.showDebackPanel();
        ui.setDebackLoading();
        ui.el.debackProgressText.textContent = '⏳ 正在下載 AI 去背模型（首次約 40MB）...';

        try {
            await this.backgroundRemover.loadLibrary();
            const entries = Array.from(this.fileHandler.images.entries());
            let processed = 0;

            for (const [id, data] of entries) {
                if (data.debackedImage) { 
                    processed++; 
                    continue; 
                }
                if (!data.image) continue;

                ui.updateDebackProgress(processed + 1, entries.length, data.name);

                try {
                    const blob = await this.backgroundRemover.removeBackground(data.image);
                    const img = await this.imageProcessor.blobToImage(blob);
                    data.debackedBlob = blob;
                    data.debackedImage = img;

                    const originalInfo = `${data.image.width} × ${data.image.height}`;
                    ui.showDebackPreview(data.image.src, originalInfo, img);
                    processed++;
                } catch (err) {
                    console.error(`Deback failed for ${data.name}:`, err);
                }
            }

            ui.showDebackComplete(`✅ 去背完成 (${processed}/${entries.length})`, processed > 0);
            if (processed > 0) {
                this.ui.showStatus('✅ 去背完成！', 'success');
            }

        } catch (err) {
            console.error('Batch deback error:', err);
            if (this.ui.el.debackToggle) this.ui.el.debackToggle.checked = false;
            ui.showDebackComplete('❌ 去背失敗: ' + err.message, false);
            this.ui.showStatus('❌ 去背失敗：' + err.message, 'error');
        } finally {
            this.debackingInProgress = false;
        }
    }

    clearDebackResults() {
        for (const [id, data] of this.fileHandler.images) {
            if (data.debackedImage) {
                URL.revokeObjectURL(data.debackedImage.src);
            }
            data.debackedBlob = null;
            data.debackedImage = null;
        }
        this.ui.hideDebackPanel();
        this.ui.el.compressDebackBgSection?.classList.add('hidden');
    }

    downloadDebackedOriginal() {
        const data = this.fileHandler.getFirstImage();
        if (!data || !data.debackedBlob) {
            this.ui.showStatus('沒有去背圖片可下載', 'error');
            return;
        }
        const filename = data.name + '_debacked.png';
        this.downloadBlob(data.debackedBlob, filename);
        this.ui.showStatus(`✅ 已下載 ${filename}`, 'success');
    }

    // ===== 輔助 =====
    updateCompressWarning() {
        const format = document.querySelector('input[name="compressFormat"]:checked')?.value;
        const bgSetting = document.querySelector('input[name="compressBackground"]:checked')?.value;
        const warning = this.ui.el.compressJpegWarning;
        if (warning) {
            warning.classList.toggle('hidden', !(format === 'jpeg' && bgSetting === 'transparent'));
        }
    }
}

// ===== 啟動應用程式 =====
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});