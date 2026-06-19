// ============================================================
//  檔案處理器 - 管理圖片資料與檔案讀取
// ============================================================

export class FileHandler {
    constructor() {
        // 使用 Map 儲存圖片資料，key 為唯一 ID
        this.images = new Map();
    }

    /**
     * 從 File 物件讀取並加入圖片集合
     * @param {File} file - 圖片檔案
     * @returns {Promise<string>} 回傳該圖片的唯一 ID
     */
    addImageFromFile(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const imageId = Date.now() + Math.random() + '_' + file.name;
                    this.images.set(imageId, {
                        id: imageId,
                        file: file,
                        image: img,
                        name: file.name.split('.')[0] || 'image',
                        originalName: file.name,
                        debackedBlob: null,
                        debackedImage: null,
                        // 用於壓縮模式暫存
                        compressResultBlob: null,
                        compressQuality: null
                    });
                    resolve(imageId);
                };
                img.onerror = () => {
                    // 若圖片載入失敗，仍建立一個佔位，但標記錯誤
                    const imageId = Date.now() + Math.random() + '_error';
                    this.images.set(imageId, {
                        id: imageId,
                        file: file,
                        image: null,
                        name: file.name.split('.')[0] || 'image',
                        originalName: file.name,
                        debackedBlob: null,
                        debackedImage: null,
                        loadError: true
                    });
                    resolve(imageId);
                };
                img.src = e.target.result;
            };
            reader.onerror = () => {
                const imageId = Date.now() + Math.random() + '_readerror';
                this.images.set(imageId, {
                    id: imageId,
                    file: file,
                    image: null,
                    name: file.name.split('.')[0] || 'image',
                    originalName: file.name,
                    loadError: true
                });
                resolve(imageId);
            };
            reader.readAsDataURL(file);
        });
    }

    /**
     * 批次新增多個檔案
     * @param {File[]} files - 圖片檔案陣列
     * @param {boolean} clearFirst - 是否先清空現有圖片
     * @returns {Promise<string[]>} 回傳所有新增的圖片 ID
     */
    async addFiles(files, clearFirst = false) {
        if (clearFirst) {
            this.clearAll();
        }
        const ids = [];
        const validFiles = files.filter(f => f.type.startsWith('image/'));
        for (const file of validFiles) {
            const id = await this.addImageFromFile(file);
            ids.push(id);
        }
        return ids;
    }

    /**
     * 移除單張圖片
     * @param {string} imageId 
     */
    removeImage(imageId) {
        const data = this.images.get(imageId);
        if (data) {
            // 釋放去背產生的 Object URL
            if (data.debackedImage) {
                URL.revokeObjectURL(data.debackedImage.src);
            }
            if (data.compressResultBlob) {
                URL.revokeObjectURL(data.compressResultBlob);
            }
        }
        this.images.delete(imageId);
    }

    /**
     * 清除所有圖片
     */
    clearAll() {
        for (const [id, data] of this.images) {
            if (data.debackedImage) {
                URL.revokeObjectURL(data.debackedImage.src);
            }
            if (data.compressResultBlob) {
                URL.revokeObjectURL(data.compressResultBlob);
            }
        }
        this.images.clear();
    }

    /**
     * 取得單一圖片資料
     * @param {string} imageId 
     * @returns {object|null}
     */
    getImage(imageId) {
        return this.images.get(imageId) || null;
    }

    /**
     * 取得所有圖片資料 (迭代器)
     * @returns {IterableIterator<[string, object]>}
     */
    getAllImages() {
        return this.images.entries();
    }

    /**
     * 取得圖片總數
     * @returns {number}
     */
    getCount() {
        return this.images.size;
    }

    /**
     * 取得第一張圖片 (常用於壓縮模式)
     * @returns {object|null}
     */
    getFirstImage() {
        if (this.images.size === 0) return null;
        return this.images.values().next().value;
    }

    /**
     * 取得所有圖片 ID 陣列
     * @returns {string[]}
     */
    getImageIds() {
        return Array.from(this.images.keys());
    }
}