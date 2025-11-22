/**
 * /assets/js/LrcParser.js
 * 負責處理 LRC 歌詞文件的獲取、fallback 邏輯和解析
 */

/**
 * 從指定路徑獲取 LRC 文本
 * @param {string} lrcPath - LRC 文件的 URL
 * @returns {Promise<string>} LRC 文本內容，如果載入失敗或內容為空，則返回空字串 ""
 */
export async function fetchLRC(lrcPath) {
    if (!lrcPath) return "";
    try {
        const response = await fetch(lrcPath);
        if (!response.ok) {
            // 由於 fallback 會處理錯誤，這裡只輸出警告
            console.warn(`LRC fetch: 無法載入 LRC 文件: ${lrcPath}. 狀態碼: ${response.status}.`);
            return ""; 
        }
        const text = await response.text();
        if (text.trim().length === 0) {
             console.warn(`LRC fetch: 文件內容為空: ${lrcPath}.`);
             return "";
        }
        return text;
    } catch (error) {
        console.error("LRC fetch: 載入 LRC 失敗:", error);
        return "";
    }
}


/**
 * 🌟 新增：處理 LRC Fallback 載入的核心函數 🌟
 * * 此函數會遍歷提供的所有路徑，一旦成功載入（內容非空），即停止並返回文本。
 *
 * @param {string[]} paths - LRC 文件的 URL 陣列 (來自 music.yml 的 lrcPaths)
 * @returns {Promise<string>} 成功獲取到的 LRC 文本或空字串 ""
 */
export async function tryFetchLRC(paths) { 
    if (!paths || paths.length === 0) return ''; 
    
    for (let i = 0; i < paths.length; i++) { 
        const path = paths[i];
        console.log(`嘗試載入 LRC (Fallback ${i + 1}/${paths.length}): ${path}`);
        try { 
            const text = await fetchLRC(path); 
            if (text) { 
                console.log(`✅ LRC 成功載入: ${path}`); 
                return text; 
            }
        } catch (error) { 
            // fetchLRC 內部已處理錯誤，這裡只是捕獲外層 Promise 拒絕
            console.warn(`LRC 加載失敗，嘗試下一個: ${path}`); 
        } 
    } 
    console.error('❌ 所有 LRC CDN 都失敗了或內容為空。'); 
    return ''; 
}


/**
 * 解析 LRC 格式的歌詞文本
 * @param {string} lrcText - 原始的 LRC 文本內容
 * @returns {Array<Object>} 包含 {time: number (秒), text: string} 的陣列
 */
export function parseLRC(lrcText) {
    if (!lrcText) return [];

    const lines = lrcText.split('\n');
    const parsedLyrics = [];

    // 1. 增強：用於匹配並提取時間戳的正則表達式
    // 兼容 [MM:SS.ms] 和常見的 [MM:SS] 格式。
    const timeMatchRegex = /\[(\d{2}):(\d{2})(?:\.(\d{1,3}))?\]/g; 
    
    // 2. 用於清除所有方括號內容的正則表達式
    const allTagCleanRegex = /\[[^\]]+\]/g; 

    lines.forEach(line => {
        timeMatchRegex.lastIndex = 0; 
        
        let match;
        
        // 獲取沒有時間戳和標籤的純淨文本
        // 核心邏輯是先提取時間戳，然後清除所有標籤以獲得文本
        const text = line.replace(allTagCleanRegex, '').replace(/^>>\s*/, '').trim();

        if (text.length === 0) return;

        // 迭代該行的所有時間戳
        while ((match = timeMatchRegex.exec(line)) !== null) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            
            // 處理毫秒 (match[3] 可能為 undefined，例如 [MM:SS] 格式)
            let milliseconds = 0;
            if (match[3]) {
                // 處理毫秒：將 1/2 位數補足 3 位
                const msStr = match[3];
                if (msStr.length === 1) { // 例如: .1 -> .100
                    milliseconds = parseInt(msStr) * 100;
                } else if (msStr.length === 2) { // 例如: .12 -> .120
                    milliseconds = parseInt(msStr) * 10;
                } else { // 3 位數: .123
                    milliseconds = parseInt(msStr);
                }
            }
            
            // 計算總時間（秒）
            const timeInSeconds = minutes * 60 + seconds + milliseconds / 1000;
            
            parsedLyrics.push({
                time: timeInSeconds,
                text: text // 使用已清理的文本
            });
        }
    });

    // 確保歌詞按時間順序播放
    parsedLyrics.sort((a, b) => a.time - b.time);
    
    return parsedLyrics;
}
