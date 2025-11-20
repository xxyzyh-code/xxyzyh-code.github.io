/**
 * /assets/js/LrcParser.js
 * 負責處理 LRC 歌詞文件的獲取和解析
 */

/**
 * 解析 LRC 格式的歌詞文本
 * @param {string} lrcText - 原始的 LRC 文本內容
 * @returns {Array<Object>} 包含 {time: number (秒), text: string} 的陣列
 */
export function parseLRC(lrcText) {
    if (!lrcText) return [];

    const lines = lrcText.split('\n');
    const parsedLyrics = [];

    // 1. 用於 *匹配並提取* 時間戳的正則表達式
    const timeMatchRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;
    
    // 2. 用於 *清除所有方括號內容* 的正則表達式
    //    這將移除時間戳、[music]、[singing]、[ti:]、[ar:] 等所有標籤
    const allTagCleanRegex = /\[[^\]]+\]/g; 

    lines.forEach(line => {
        // 重置匹配的正則表達式（因為 'g' 標誌會記住 lastIndex）
        timeMatchRegex.lastIndex = 0; 
        
        let match;
        
        // 3. 核心修正：先清除所有方括號標籤，再清理行首的特殊符號 (如 >>)
        // 使用 allTagCleanRegex 替換 timeCleanRegex
        const cleanTextWithNonTimeTags = line.replace(allTagCleanRegex, '').trim();
        
        // 額外清理行首的非標準符號 (如 >>)
        const text = cleanTextWithNonTimeTags.replace(/^>>\s*/, '').trim();

        // 4. 如果這行沒有歌詞（例如只有標籤或空白），則跳過
        if (text.length === 0) return; // 使用 length === 0 更嚴謹

        // 5. 迭代該行的所有時間戳
        while ((match = timeMatchRegex.exec(line)) !== null) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            // 處理毫秒：兩位數補零 (如 12 -> 120)，三位數直接用
            const milliseconds = parseInt(match[3].length === 2 ? match[3] + '0' : match[3]); 
            
            // 計算總時間（秒）
            const timeInSeconds = minutes * 60 + seconds + milliseconds / 1000;
            
            parsedLyrics.push({
                time: timeInSeconds,
                text: text // 使用已清理的文本
            });
        }
    });

    // 6. 確保歌詞按時間順序播放，這對同步至關重要
    parsedLyrics.sort((a, b) => a.time - b.time);
    
    return parsedLyrics;
}

/**
 * 實現歌詞 URL 備援抓取並包含網絡超時處理。
 * @param {string[]|string} lrcSources - 單個 URL 或 URL 陣列 (Config.js 已統一為 string[])
 * @returns {Promise<string|null>} 成功抓取的歌詞文本或 null
 */
export async function fetchLRC(lrcSources) {
    // 確保處理單一字串或陣列（雖然 Config.js 已統一）
    const urls = Array.isArray(lrcSources) ? lrcSources : (lrcSources ? [lrcSources] : []);
    const TIMEOUT_MS = 5000; // 🌟 問題 3 修正：設置 5 秒超時

    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        if (!url) continue;

        const controller = new AbortController();
        const signal = controller.signal;
        let timeoutId;
        
        try {
            console.log(`嘗試抓取歌詞來源 (${i + 1}/${urls.length}): ${url}`);
            
            // 設置超時計時器
            timeoutId = setTimeout(() => {
                controller.abort(new Error("Fetch timeout")); // 手動中止請求
            }, TIMEOUT_MS);

            const response = await fetch(url, { signal });
            
            clearTimeout(timeoutId); // 成功回應，清除超時
            
            if (response.ok) {
                const text = await response.text();
                if (text && text.trim().length > 0) {
                    console.log(`✅ 歌詞抓取成功 (${i + 1}): ${url}`);
                    return text; 
                }
            }
            
            // 如果狀態碼不是 200，視為失敗
            throw new Error(`HTTP 錯誤: ${response.status} (${response.statusText})`);
            
        } catch (error) {
            // 清除可能殘留的超時計時器
            clearTimeout(timeoutId); 
            
            let errorMessage = error.message;
            if (error.name === 'AbortError') {
                 errorMessage = `請求超時 (${TIMEOUT_MS}ms)`; // 處理超時中止
            }
            
            console.warn(`❌ 抓取歌詞失敗 (${i + 1}/${urls.length}): ${url}. 錯誤: ${errorMessage}`);
            // 繼續循環，嘗試下一個 URL
        }
    }
    
    return null; 
}
