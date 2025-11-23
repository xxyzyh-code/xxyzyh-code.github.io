/**
 * /assets/js/LrcParser.js
 * 負責處理 LRC 歌詞文件的獲取和解析
 */

/**
 * 解析 LRC 格式的歌詞文本
 *
 * @param {string} lrcText - 原始的 LRC 文本內容
 * @returns {Array<Object>} 包含 {time: number (秒), text: string} 的陣列
 */
export function parseLRC(lrcText) {
    if (!lrcText) return [];

    const lines = lrcText.split('\n');
    const parsedLyrics = [];

    // 1. 【核心修正】用於 匹配並提取 時間戳的正則表達式：
    //    匹配格式：[MM:SS.ms] 或 [MM:SS:ms]
    //    分(1), 秒(2), 毫秒/厘秒(3)
    const timeMatchRegex = /\[(\d{2,}):(\d{2})[.:](\d{2,3})\]/g;

    // 2. 用於 清除所有方括號內容 的正則表達式
    //    這將移除時間戳、[music]、[ti:] 等所有標籤
    const allTagCleanRegex = /\[[^\]]+\]/g;

    lines.forEach(line => {
        // 重置匹配的正則表達式（因為 'g' 標誌會記住 lastIndex）
        timeMatchRegex.lastIndex = 0;

        let match;

        // 3. 核心修正：先清除所有方括號標籤
        const cleanTextWithNonTimeTags = line.replace(allTagCleanRegex, '').trim();

        // 額外清理行首的非標準符號 (如 >>)
        const text = cleanTextWithNonTimeTags.replace(/^>>\s*/, '').trim();

        // 4. 如果這行沒有歌詞（例如只有標籤或空白），則跳過
        if (text.length === 0) return;

        // 5. 迭代該行的所有時間戳
        while ((match = timeMatchRegex.exec(line)) !== null) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);

            // 處理毫秒：
            // 由於 LRC 格式可能包含兩位數（厘秒 12 -> 120ms）或三位數（毫秒 123ms）
            let millisecondsString = match[3];

            // 確保是三位數毫秒：兩位數補零 (如 12 -> 120)，三位數直接用
            if (millisecondsString.length === 2) {
                millisecondsString += '0';
            }

            const milliseconds = parseInt(millisecondsString);

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
 * 從指定路徑獲取 LRC 文本
 *
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
