// ============================================================
//  UI 管理器 - 所有 DOM 更新與渲染
// ============================================================

export class UIManager {
    constructor() {
        // DOM 快取
        this.el = {
            uploadZone: document.getElementById('uploadZone'),
            uploadIcon: document.getElementById('uploadIcon'),
            uploadTitle: document.getElementById('uploadTitle'),
            uploadDesc: document.getElementById('uploadDesc'),
            uploadHint: document.getElementById('uploadHint'),
            uploadBtn: document.getElementById('uploadBtn'),
            fileInput: document.getElementById('fileInput'),

            batchSection: document.getElementById('batchImagesSection'),
            batchList: document.getElementById('batchImagesList'),
            imageCount: document.getElementById('imageCount'),
            clearAllBtn: document.getElementById('clearAllBtn'),

            settingsPanel: document.getElementById('settingsPanel'),
            progressSection: document.getElementById('progressSection'),
            progressBar: document.getElementById('progressBar'),
            progressText: document.getElementById('progressText'),
            progressDetails: document.getElementById('progressDetails'),

            downloadSection: document.getElementById('downloadSection'),
            downloadButtons: document.getElementById('downloadButtons'),
            previewGrid: document.getElementById('previewGrid'),

            compressSettings: document.getElementById('compressSettings'),
            compressResult: document.getElementById('compressResult'),
            compressOriginalPreview: document.getElementById('compressOriginalPreview'),
            compressOriginalSize: document.getElementById('compressOriginalSize'),
            compressResultPreview: document.getElementById('compressResultPreview'),
            compressResultSize: document.getElementById('compressResultSize'),
            compressQualityUsed: document.getElementById('compressQualityUsed'),
            compressSavings: document.getElementById('compressSavings'),
            compressDownloadBtn: document.getElementById('compressDownloadBtn'),

            statusMessage: document.getElementById('statusMessage'),
            
            // 去背相關
            bgRemoveStatus: document.getElementById('bgRemoveStatus'),
            compressBgRemoveStatus: document.getElementById('compressBgRemoveStatus'),
            compressBgRemoveStatusText: document.getElementById('compressBgRemoveStatusText'),
            compressDownloadDebackedBtn: document.getElementById('compressDownloadDebackedBtn'),
            compressBgSettingsContainer: document.getElementById('compressBgSettingsContainer'),
            compressJpegWarning: document.getElementById('compressJpegWarning'),

            darkModeToggle: document.getElementById('darkModeToggle'),
            tabConvert: document.getElementById('tabConvert'),
            tabCompress: document.getElementById('tabCompress'),

            // 設定值
            customFileName: document.getElementById('customFileName'),
            addSizeToName: document.getElementById('addSizeToName'),
            customBgColor: document.getElementById('customBgColor'),
            scalingMethod: document.getElementById('scalingMethod'),
            autoRemoveBg: document.getElementById('autoRemoveBg'),
            compressAutoRemoveBg: document.getElementById('compressAutoRemoveBg'),
            compressCustomBgColor: document.getElementById('compressCustomBgColor'),
            compressTargetSize: document.getElementById('compressTargetSize'),
            compressSizeUnit: document.getElementById('compressSizeUnit'),
            compressMaxWidth: document.getElementById('compressMaxWidth'),
            compressMaxHeight: document.getElementById('compressMaxHeight'),
        };

        // 狀態
        this.currentMode = 'convert';
        this._compressPreviewUrl = null;
    }

    // ===== 模式切換 =====
    switchMode(mode) {
        this.currentMode = mode;
        const isConvert = mode === 'convert';
        
        // Tabs
        this.el.tabConvert.className = isConvert 
            ? 'mode-tab active flex-1 py-3 px-4 rounded-lg font-medium text-center'
            : 'mode-tab flex-1 py-3 px-4 rounded-lg font-medium text-center';
        this.el.tabCompress.className = !isConvert
            ? 'mode-tab active flex-1 py-3 px-4 rounded-lg font-medium text-center'
            : 'mode-tab flex-1 py-3 px-4 rounded-lg font-medium text-center';

        // Upload zone text
        if (isConvert) {
            this.el.uploadIcon.textContent = '📁';
            this.el.uploadTitle.textContent = '上傳圖片轉換／去背';
            this.el.uploadDesc.textContent = '支援 PNG、JPG、WebP • 批次轉換多個檔案';
            this.el.uploadHint.textContent = '🎨 開啟「自動去背」可 AI 移除背景再轉換';
            this.el.uploadBtn.textContent = '選擇圖片';
        } else {
            this.el.uploadIcon.textContent = '📦';
            this.el.uploadTitle.textContent = '上傳圖片壓縮大小';
            this.el.uploadDesc.textContent = '支援 PNG、JPG、WebP • 壓縮到指定大小';
            this.el.uploadHint.textContent = '📦 二分搜尋最佳品質，精準達到目標大小';
            this.el.uploadBtn.textContent = '選擇圖片壓縮';
        }

        // Panels
        this.el.compressSettings.classList.toggle('hidden', isConvert);
        this.el.compressResult.classList.add('hidden');
        if (isConvert) {
            // 轉換模式下，批次區、設定、下載區由外部控制顯示
        } else {
            this.el.batchSection.classList.add('hidden');
            this.el.settingsPanel.classList.add('hidden');
            this.el.downloadSection.classList.add('hidden');
            this.el.progressSection.classList.add('hidden');
        }
    }

    // ===== 批次圖片顯示 =====
    updateImageDisplay(imagesMap) {
        const count = imagesMap.size;
        if (count === 0) {
            this.el.batchSection.classList.add('hidden');
            return;
        }

        this.el.batchSection.classList.remove('hidden');
        this.el.imageCount.textContent = count;
        this.el.batchList.innerHTML = '';

        for (const [id, data] of imagesMap) {
            const card = document.createElement('div');
            card.className = 'image-card bg-gray-50 dark:bg-gray-700 rounded-lg p-4 slide-in';
            card.dataset.imageId = id;

            const header = document.createElement('div');
            header.className = 'flex items-center justify-between mb-2';
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'text-sm font-medium text-gray-700 dark:text-gray-300 truncate';
            nameSpan.textContent = data.name || '未命名';
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'text-red-500 hover:text-red-700 text-sm';
            removeBtn.textContent = '❌';
            removeBtn.dataset.action = 'removeImage';
            removeBtn.dataset.imageId = id;
            
            header.appendChild(nameSpan);
            header.appendChild(removeBtn);

            const imgDiv = document.createElement('div');
            imgDiv.className = 'aspect-square bg-white dark:bg-gray-600 rounded-lg overflow-hidden mb-2';
            const img = document.createElement('img');
            img.src = data.image ? data.image.src : '';
            img.alt = data.name;
            img.className = 'w-full h-full object-contain';
            imgDiv.appendChild(img);

            const sizeDiv = document.createElement('div');
            sizeDiv.className = 'text-xs text-gray-500 dark:text-gray-400';
            sizeDiv.textContent = data.image ? `${data.image.width} × ${data.image.height}` : '載入失敗';

            const debackPreview = document.createElement('div');
            debackPreview.className = 'deback-preview hidden mt-2';
            debackPreview.innerHTML = `
                <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">🔍 去背預覽</div>
                <div class="aspect-square bg-white dark:bg-gray-600 rounded-lg overflow-hidden relative">
                    <canvas class="w-full h-full"></canvas>
                    <div class="deback-spinner hidden absolute inset-0 flex items-center justify-center bg-black/10 dark:bg-black/30 rounded-lg">
                        <div class="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                </div>
            `;

            card.appendChild(header);
            card.appendChild(imgDiv);
            card.appendChild(sizeDiv);
            card.appendChild(debackPreview);
            this.el.batchList.appendChild(card);
        }
    }

    // ===== 進度條 =====
    showProgress() {
        this.el.progressSection.classList.remove('hidden');
        this.updateProgress(0, 0, '');
    }

    hideProgress() {
        this.el.progressSection.classList.add('hidden');
    }

    updateProgress(current, total, detail) {
        const pct = total > 0 ? Math.round((current / total) * 100) : 0;
        this.el.progressBar.style.width = `${pct}%`;
        this.el.progressText.textContent = `${pct}%`;
        this.el.progressDetails.textContent = detail || `處理中 ${current} / ${total} 項目`;
    }

    // ===== 下載區 =====
    showDownloadSection() {
        this.el.downloadSection.classList.remove('hidden');
    }

    hideDownloadSection() {
        this.el.downloadSection.classList.add('hidden');
    }

    generateDownloadButtons(imagesMap, processedResults, fileNameGenerator) {
        const container = this.el.downloadButtons;
        container.innerHTML = '';

        const imageIds = Array.from(imagesMap.keys());
        if (imageIds.length === 0) return;

        // 批次下載按鈕
        if (imageIds.length > 1) {
            const batchBtn = document.createElement('button');
            batchBtn.className = 'w-full bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white px-4 py-3 rounded-lg font-bold transition-colors mb-4 text-lg';
            batchBtn.textContent = `⚡ 一鍵下載全部 (${imageIds.length} 個檔案)`;
            batchBtn.dataset.action = 'batchDownload';
            container.appendChild(batchBtn);

            const sep = document.createElement('div');
            sep.className = 'border-t border-gray-200 dark:border-gray-600 my-4';
            container.appendChild(sep);
        }

        // 個別下載按鈕
        const formatColors = {
            ico: 'blue',
            png: 'green',
            webp: 'orange',
            jpeg: 'red',
            jpg: 'red'
        };
        const formatEmojis = {
            ico: '📦',
            png: '🖼️',
            webp: '🚀',
            jpeg: '🖼️',
            jpg: '🖼️'
        };

        for (const id of imageIds) {
            const result = processedResults.get(id);
            if (!result) continue;
            
            const info = formatColors[result.format] || 'blue';
            const emoji = formatEmojis[result.format] || '📄';
            const displayName = fileNameGenerator(id, result);
            
            const btn = document.createElement('button');
            btn.className = `w-full bg-${info}-600 hover:bg-${info}-700 dark:bg-${info}-500 dark:hover:bg-${info}-600 text-white px-4 py-2 rounded-lg font-medium transition-colors mb-2`;
            btn.textContent = `${emoji} 下載 ${displayName}`;
            btn.dataset.action = 'downloadSingle';
            btn.dataset.imageId = id;
            container.appendChild(btn);
        }
    }

    updatePreviewGrid(imagesMap, processedResults, imageProcessor) {
        const grid = this.el.previewGrid;
        grid.innerHTML = '';

        for (const [id, data] of imagesMap) {
            const result = processedResults.get(id);
            if (!result) continue;

            const displayName = this.generateDisplayName(id, result);
            const size = result.size;

            const item = document.createElement('div');
            item.className = 'text-center';
            item.innerHTML = `
                <div class="bg-white dark:bg-gray-600 p-2 rounded-lg shadow-sm border dark:border-gray-500">
                    <canvas width="${size}" height="${size}" class="mx-auto" style="max-width: ${Math.min(size, 64)}px; max-height: ${Math.min(size, 64)}px; image-rendering: pixelated;"></canvas>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1" title="${displayName}">${displayName.length > 20 ? displayName.substring(0, 17) + '...' : displayName}</p>
                    <p class="text-xs text-gray-400 dark:text-gray-500">${size}×${size} ${result.format.toUpperCase()}</p>
                </div>
            `;

            const canvas = item.querySelector('canvas');
            const ctx = canvas.getContext('2d');
            
            // 使用 ImageProcessor 繪製預覽 (使用原始設定)
            const useDebacked = !!document.getElementById('autoRemoveBg')?.checked;
            const bgSetting = document.querySelector('input[name="background"]:checked')?.value || 'transparent';
            const customBg = document.getElementById('customBgColor')?.value || '#ffffff';
            const scaling = document.getElementById('scalingMethod')?.value || 'contain';
            
            const tempCanvas = imageProcessor.createIconCanvas(data, size, {
                bgSetting,
                customBgColor: customBg,
                scalingMethod: scaling,
                useDebacked
            });
            ctx.drawImage(tempCanvas, 0, 0);
            
            grid.appendChild(item);
        }
    }

    generateDisplayName(imageId, result) {
        const customName = this.el.customFileName?.value || '';
        const addSize = this.el.addSizeToName?.checked || false;
        // 實際檔名由外部傳入，此處僅用於預覽
        return (customName || 'image') + (addSize ? `_${result.size}x${result.size}` : '') + '.' + result.format;
    }

    // ===== 壓縮結果顯示 =====
    showCompressResult(imageData, result, originalFile) {
        this.el.compressResult.classList.remove('hidden');
        
        const bgRemovalOn = this.el.compressAutoRemoveBg?.checked || false;
        const srcImage = (bgRemovalOn && imageData.debackedImage) ? imageData.debackedImage : imageData.image;
        this.el.compressOriginalPreview.src = srcImage ? srcImage.src : '';
        this.el.compressOriginalSize.textContent = '📄 檔案大小：' + this.formatFileSize(originalFile.size);

        // 釋放舊的預覽 URL
        if (this._compressPreviewUrl) {
            URL.revokeObjectURL(this._compressPreviewUrl);
        }
        this._compressPreviewUrl = URL.createObjectURL(result.blob);
        this.el.compressResultPreview.src = this._compressPreviewUrl;
        this.el.compressResultSize.textContent = '📦 檔案大小：' + this.formatFileSize(result.blob.size);
        this.el.compressQualityUsed.textContent = '⚙️ 使用品質：' + Math.round(result.quality * 100) + '%';

        const savings = originalFile.size - result.blob.size;
        const pct = ((savings / originalFile.size) * 100).toFixed(1);
        const savingsEl = this.el.compressSavings;
        if (savings > 0) {
            savingsEl.innerHTML = `<span class="text-green-700 dark:text-green-300 font-semibold text-lg">✅ 節省 ${this.formatFileSize(savings)}（${pct}%）</span>`;
        } else {
            savingsEl.innerHTML = `<span class="text-yellow-600 dark:text-yellow-400 font-semibold text-lg">⚠️ 壓縮後反而變大，建議改用原始檔案</span>`;
        }
    }

    hideCompressResult() {
        this.el.compressResult.classList.add('hidden');
        if (this._compressPreviewUrl) {
            URL.revokeObjectURL(this._compressPreviewUrl);
            this._compressPreviewUrl = null;
        }
    }

    // ===== 狀態訊息 =====
    showStatus(message, type = 'info') {
        const el = this.el.statusMessage;
        el.textContent = message;
        el.className = `mt-6 p-4 rounded-lg text-center ${
            type === 'success' ? 'bg-green-100 text-green-800' :
            type === 'error' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
        }`;
        el.classList.remove('hidden');

        if (type === 'success' || type === 'error') {
            clearTimeout(this._statusTimer);
            this._statusTimer = setTimeout(() => {
                el.classList.add('hidden');
            }, 4000);
        }
    }

    hideStatus() {
        this.el.statusMessage.classList.add('hidden');
    }

    // ===== 去背 UI 輔助 =====
    getBgRemovalUI(isCompress) {
        if (isCompress) {
            return {
                statusContainer: this.el.compressBgRemoveStatus,
                statusText: this.el.compressBgRemoveStatusText,
                toggle: this.el.compressAutoRemoveBg,
                downloadBtn: this.el.compressDownloadDebackedBtn,
                settingsContainer: this.el.compressBgSettingsContainer
            };
        } else {
            return {
                statusContainer: this.el.bgRemoveStatus,
                statusText: this.el.bgRemoveStatus,
                toggle: this.el.autoRemoveBg,
                downloadBtn: null,
                settingsContainer: null
            };
        }
    }

    updateBgStatus(isCompress, text, showDownload = false) {
        const ui = this.getBgRemovalUI(isCompress);
        if (ui.statusContainer) {
            ui.statusContainer.classList.remove('hidden');
        }
        if (ui.statusText) {
            ui.statusText.textContent = text;
        }
        if (ui.downloadBtn) {
            ui.downloadBtn.classList.toggle('hidden', !showDownload);
        }
    }

    hideBgStatus(isCompress) {
        const ui = this.getBgRemovalUI(isCompress);
        if (ui.statusContainer) {
            ui.statusContainer.classList.add('hidden');
        }
        if (ui.downloadBtn) {
            ui.downloadBtn.classList.add('hidden');
        }
    }

    // ===== 工具函數 =====
    formatFileSize(bytes) {
        if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return bytes + ' B';
    }

    sanitizeFilename(filename) {
        return filename.replace(/[\\/:*?"<>|]/g, '_').trim();
    }

    // ===== 深色模式 =====
    initDarkMode() {
        const isDark = localStorage.getItem('darkMode') === 'true';
        if (isDark) {
            document.documentElement.classList.add('dark');
        }
        this.el.darkModeToggle.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark');
            const isDarkMode = document.documentElement.classList.contains('dark');
            localStorage.setItem('darkMode', isDarkMode);
        });
    }
}