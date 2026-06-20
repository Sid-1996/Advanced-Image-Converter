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

            // 去背面板
            debackPanel: document.getElementById('debackPanel'),
            debackToggle: document.getElementById('debackToggle'),
            debackProgressArea: document.getElementById('debackProgressArea'),
            debackProgressText: document.getElementById('debackProgressText'),
            debackProgressPercent: document.getElementById('debackProgressPercent'),
            debackProgressBar: document.getElementById('debackProgressBar'),
            debackPreviewArea: document.getElementById('debackPreviewArea'),
            debackOriginalImg: document.getElementById('debackOriginalImg'),
            debackOriginalInfo: document.getElementById('debackOriginalInfo'),
            debackResultCanvas: document.getElementById('debackResultCanvas'),
            debackSpinner: document.getElementById('debackSpinner'),
            debackFooter: document.getElementById('debackFooter'),
            debackCompleteStatus: document.getElementById('debackCompleteStatus'),
            debackDownloadBtn: document.getElementById('debackDownloadBtn'),

            darkModeToggle: document.getElementById('darkModeToggle'),
            tabConvert: document.getElementById('tabConvert'),
            tabDeback: document.getElementById('tabDeback'),
            tabCompress: document.getElementById('tabCompress'),

            // 設定值
            customFileName: document.getElementById('customFileName'),
            addSizeToName: document.getElementById('addSizeToName'),
            customBgColor: document.getElementById('customBgColor'),
            scalingMethod: document.getElementById('scalingMethod'),
            compressDebackBgSection: document.getElementById('compressDebackBgSection'),
            compressCustomBgColor: document.getElementById('compressCustomBgColor'),
            compressJpegWarning: document.getElementById('compressJpegWarning'),
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

        // Tabs (三個分頁)
        const setTab = (el, active) => {
            el.className = active
                ? 'mode-tab active flex-1 py-3 px-4 rounded-lg font-medium text-center'
                : 'mode-tab flex-1 py-3 px-4 rounded-lg font-medium text-center';
        };
        setTab(this.el.tabConvert, mode === 'convert');
        setTab(this.el.tabDeback, mode === 'deback');
        setTab(this.el.tabCompress, mode === 'compress');

        // Upload zone text
        if (mode === 'convert') {
            this.el.uploadIcon.textContent = '📁';
            this.el.uploadTitle.textContent = '上傳圖片轉換／去背';
            this.el.uploadDesc.textContent = '支援 PNG、JPG、WebP • 批次轉換多個檔案';
            this.el.uploadHint.textContent = '🎨 開啟「自動去背」可 AI 移除背景再轉換';
            this.el.uploadBtn.textContent = '選擇圖片';
        } else if (mode === 'deback') {
            this.el.uploadIcon.textContent = '🎨';
            this.el.uploadTitle.textContent = '上傳圖片進行 AI 去背';
            this.el.uploadDesc.textContent = '支援 PNG、JPG、WebP • 自動移除圖片背景';
            this.el.uploadHint.textContent = '🎨 完全在瀏覽器執行，圖片不上傳伺服器';
            this.el.uploadBtn.textContent = '選擇圖片去背';
        } else {
            this.el.uploadIcon.textContent = '📦';
            this.el.uploadTitle.textContent = '上傳圖片壓縮大小';
            this.el.uploadDesc.textContent = '支援 PNG、JPG、WebP • 壓縮到指定大小';
            this.el.uploadHint.textContent = '📦 二分搜尋最佳品質，精準達到目標大小';
            this.el.uploadBtn.textContent = '選擇圖片壓縮';
        }

        // Panels
        this.el.compressSettings.classList.add('hidden');
        this.el.compressResult.classList.add('hidden');
        this.el.settingsPanel.classList.add('hidden');
        this.el.downloadSection.classList.add('hidden');
        this.el.progressSection.classList.add('hidden');
        this.el.batchSection.classList.add('hidden');
        this.el.compressDebackBgSection?.classList.add('hidden');

        if (mode === 'convert') {
            // 批次區、設定、下載區由外部控制顯示
        } else if (mode === 'deback') {
            // 去背模式：批次區由外部控制，僅確保批次區顯示
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

            card.appendChild(header);
            card.appendChild(imgDiv);
            card.appendChild(sizeDiv);
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
            const useDebacked = this.el.debackToggle?.checked || false;
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
        
        const bgRemovalOn = this.el.debackToggle?.checked || false;
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

    // ===== 去背面板控制 =====
    showDebackPanel() {
        this.el.debackPanel.classList.remove('hidden');
    }

    hideDebackPanel() {
        this.el.debackPanel.classList.add('hidden');
        this.el.debackProgressArea.classList.add('hidden');
        this.el.debackPreviewArea.classList.add('hidden');
        this.el.debackFooter.classList.add('hidden');
        this.el.debackDownloadBtn.classList.add('hidden');
        this.el.debackSpinner.classList.add('hidden');
    }

    updateDebackProgress(current, total, name) {
        const pct = total > 0 ? Math.round((current / total) * 100) : 0;
        this.el.debackProgressArea.classList.remove('hidden');
        this.el.debackProgressBar.style.width = `${pct}%`;
        this.el.debackProgressPercent.textContent = `${pct}%`;
        this.el.debackProgressText.textContent = `🖼️ ${name} (${current}/${total})`;
    }

    showDebackPreview(originalSrc, originalInfo, debackedImg) {
        this.el.debackPreviewArea.classList.remove('hidden');
        this.el.debackOriginalImg.src = originalSrc;
        this.el.debackOriginalInfo.textContent = originalInfo;
        this.el.debackSpinner.classList.add('hidden');

        const canvas = this.el.debackResultCanvas;
        const rect = canvas.parentElement.getBoundingClientRect();
        const size = rect.width || 200;
        canvas.width = size * 2;
        canvas.height = size * 2;
        const ctx = canvas.getContext('2d');
        ctx.scale(2, 2);

        const tileSize = 8;
        for (let y = 0; y < size; y += tileSize) {
            for (let x = 0; x < size; x += tileSize) {
                ctx.fillStyle = (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0 ? '#ccc' : '#fff';
                ctx.fillRect(x, y, tileSize, tileSize);
            }
        }

        if (debackedImg) {
            const aspect = debackedImg.width / debackedImg.height;
            let dw, dh;
            if (aspect > 1) { dw = size; dh = size / aspect; }
            else { dw = size * aspect; dh = size; }
            const dx = (size - dw) / 2;
            const dy = (size - dh) / 2;
            ctx.drawImage(debackedImg, dx, dy, dw, dh);
        }
    }

    showDebackComplete(text, showDownload = false) {
        this.el.debackSpinner.classList.add('hidden');
        this.el.debackFooter.classList.remove('hidden');
        this.el.debackCompleteStatus.textContent = text;
        this.el.debackDownloadBtn.classList.toggle('hidden', !showDownload);
    }

    setDebackLoading() {
        this.el.debackSpinner.classList.remove('hidden');
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