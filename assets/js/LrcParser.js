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

    // 正則表達式用於匹配時間戳，如 [00:12.34] 或 [00:12.345]
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g; 
    
    lines.forEach(line => {
        let match;
        // 迭代一行中的所有時間戳（處理一行多個時間戳的情況）
        while ((match = timeRegex.exec(line)) !== null) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            // 處理毫秒：兩位數補零 (如 12 -> 120)，三位數直接用
            const milliseconds = parseInt(match[3].length === 2 ? match[3] + '0' : match[3]); 
            
            // 計算總時間（秒）
            const timeInSeconds = minutes * 60 + seconds + milliseconds / 1000;
            
            // 提取歌詞文本 (移除所有時間戳)
            const text = line.replace(timeRegex, '').trim();
            
            if (text) {
                parsedLyrics.push({
                    time: timeInSeconds,
                    text: text
                });
            }
        }
    });

    // 確保歌詞按時間順序播放，這對同步至關重要
    parsedLyrics.sort((a, b) => a.time - b.time);
    
    return parsedLyrics;
}

/**
 * 從指定路徑獲取 LRC 文本
 * @param {string} lrcPath - LRC 文件的 URL
 * @returns {Promise<string>} LRC 文本內容
 */
export async function fetchLRC(lrcPath) {
    if (!lrcPath) return "";
    try {
        const response = await fetch(lrcPath);
        if (!response.ok) {
            console.warn(`無法載入 LRC 文件: ${lrcPath}. 狀態碼: ${response.status}. 嘗試跳過歌詞顯示。`);
            return ""; 
        }
        return await response.text();
    } catch (error) {
        console.error("載入 LRC 失敗:", error);
        return "";
    }
}
