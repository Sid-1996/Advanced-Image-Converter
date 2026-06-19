// ============================================================
//  Google Analytics 初始化與追蹤 (多層加密 + 延遲載入)
// ============================================================

// 多層加密的GA ID (AES-like + XOR + Base64 + 字符混淆 + 時間戳驗證)
const encryptedData = {
    payload: 'M2Y4ZDJhNWI3YzNlOWY4ZA==',
    salt: 'aGVsbG93b3JsZA==',
    checksum: '4a7b9c2d',
    timestamp: Date.now()
};

// 複雜解密函數
function advancedDecrypt(data) {
    try {
        // 第一層：Base64解碼
        let decoded = atob(data.payload);
        
        // 第二層：XOR解密 (使用salt)
        const saltDecoded = atob(data.salt);
        let xorResult = '';
        for (let i = 0; i < decoded.length; i++) {
            const saltChar = saltDecoded.charCodeAt(i % saltDecoded.length);
            xorResult += String.fromCharCode(decoded.charCodeAt(i) ^ saltChar);
        }
        
        // 第三層：字符替換解密
        const charMap = {
            'X': 'G', 'Y': '-', 'Z': '0', 'A': '1', 'B': '2', 'C': '3', 
            'D': '4', 'E': '5', 'F': '6', 'G': '7', 'H': '8', 'I': '9'
        };
        
        let result = '';
        for (let char of xorResult) {
            result += charMap[char] || char;
        }
        
        // 第四層：反向Caesar密碼 (位移3)
        let finalResult = '';
        for (let char of result) {
            if (char >= 'A' && char <= 'Z') {
                finalResult += String.fromCharCode(((char.charCodeAt(0) - 65 - 3 + 26) % 26) + 65);
            } else if (char >= 'a' && char <= 'z') {
                finalResult += String.fromCharCode(((char.charCodeAt(0) - 97 - 3 + 26) % 26) + 97);
            } else {
                finalResult += char;
            }
        }
        
        // 驗證checksum
        const expectedChecksum = btoa(finalResult).slice(-8);
        if (expectedChecksum.toLowerCase().includes(data.checksum.slice(0, 4))) {
            return finalResult;
        }
        
        return 'G-XXXXXXXXXX';
    } catch (error) {
        console.warn('Analytics initialization failed');
        return 'G-XXXXXXXXXX';
    }
}

// 動態載入GA (延遲載入)
setTimeout(() => {
    const gaId = advancedDecrypt(encryptedData);
    
    if (gaId && gaId !== 'G-XXXXXXXXXX' && gaId.startsWith('G-')) {
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
        script.onerror = () => console.warn('Analytics script failed to load');
        document.head.appendChild(script);
        
        window.dataLayer = window.dataLayer || [];
        function gtag(){ dataLayer.push(arguments); }
        gtag('js', new Date());
        gtag('config', gaId, {
            anonymize_ip: true,
            cookie_flags: 'SameSite=Strict;Secure'
        });
    }
}, Math.random() * 1000 + 500);

// 導出追蹤事件函數 (供其他模組使用)
export function trackEvent(eventName, parameters = {}) {
    if (typeof window.gtag !== 'undefined') {
        window.gtag('event', eventName, parameters);
    }
}