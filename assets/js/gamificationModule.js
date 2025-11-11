// assets/js/gamificationModule.js

// ===================================
// 核心配置 (規格與等級)
// ===================================
const CONFIG = {
    // 積分規則：每分鐘觸發的積分
    SCORE_PER_MINUTE: {
        BLOG: 3,
        MUSIC: 4,
        POMODORO: 2
    },
    // 每日上限：以分鐘為單位 (30分鐘, 25分鐘, 40分鐘)
    DAILY_LIMIT_MINUTES: {
        BLOG: 30, // 3分/分鐘 * 30分鐘 = 90分
        MUSIC: 25, // 4分/分鐘 * 25分鐘 = 100分
        POMODORO: 40 // 2分/分鐘 * 40分鐘 = 80分
    },
    // 等級所需總積分
    LEVEL_REQUIREMENTS: [
        { level: 1, required: 100 },
        { level: 2, required: 200 },
        { level: 3, required: 400 },
        { level: 4, required: 700 },
        { level: 5, required: 1100 },
        // ... 如果需要更多等級，可以在這裡擴展
    ],
    // 徽章條件 (以分鐘計)
    ACHIEVEMENTS: {
        'FIRST_READ': { name: '首次閱讀', condition: 1, type: 'blog_count' }, // 閱讀篇數
        'MUSIC_MASTER': { name: '音樂達人', condition: 500, type: 'music_time' }, // 累積時長 (分鐘)
        'POMODORO_PRO': { name: '番茄高手', condition: 1000, type: 'pomodoro_time' }, // 累積時長 (分鐘)
        'SCORE_MASTER': { name: '積分大師', condition: 5000, type: 'total_score' } // 累積總分
    },
    STORAGE_KEY: 'game_stats'
};

// ===================================
// 數據模型與儲存
// ===================================
let stats = {
    // 每日統計
    daily: {
        last_reset: new Date().toLocaleDateString('en-CA'), // 格式: YYYY-MM-DD
        score: 0,
        blog_time: 0,
        music_time: 0,
        pomodoro_time: 0,
    },
    // 永久統計
    lifetime: {
        total_score: 0,
        level: 0, // 0 表示未開始 (或 Level 1)
        blog_count: 0, // 閱讀文章篇數
        music_time: 0, // 累積音樂時間 (分鐘)
        pomodoro_time: 0, // 累積番茄鐘時間 (分鐘)
        achievements: []
    }
};

/**
 * @description 從 LocalStorage 載入統計數據。
 */
function loadStats() {
    try {
        const savedStats = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (savedStats) {
            stats = JSON.parse(savedStats);
        }
        
        // 每日重置檢查 (0:00 自動重置)
        const today = new Date().toLocaleDateString('en-CA');
        if (stats.daily.last_reset !== today) {
            stats.daily = {
                last_reset: today,
                score: 0,
                blog_time: 0,
                music_time: 0,
                pomodoro_time: 0,
            };
            // 提示用戶重置訊息 (可選的 UI 提示)
            console.log("程式夥伴: 每日積分已重置！");
        }
        
        // 確保初始等級為 1 (如果總分為 0)
        if (stats.lifetime.total_score < CONFIG.LEVEL_REQUIREMENTS[0].required) {
            stats.lifetime.level = 0;
        } else if (stats.lifetime.level === 0) {
            // 如果分數夠了但等級還是 0，則從 Level 1 開始檢查
            checkLevelUp();
        }

    } catch (e) {
        console.error("載入遊戲化數據失敗:", e);
    }
}

/**
 * @description 將統計數據儲存到 LocalStorage。
 */
function saveStats() {
    try {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(stats));
    } catch (e) {
        console.error("儲存遊戲化數據失敗:", e);
    }
}

// ===================================
// 等級與徽章邏輯
// ===================================

/**
 * @description 檢查等級是否提升。
 */
function checkLevelUp() {
    let currentLevel = stats.lifetime.level;
    let nextLevelReq = CONFIG.LEVEL_REQUIREMENTS.find(req => req.level === currentLevel + 1);

    if (nextLevelReq && stats.lifetime.total_score >= nextLevelReq.required) {
        stats.lifetime.level = nextLevelReq.level;
        saveStats();
        // 💡 提示：這裡應觸發升級動畫/彈窗
        displayNotification(`🎉 恭喜！你的等級升級到 Level ${stats.lifetime.level}！`, 'level-up');
        // 遞迴檢查是否能連續升級
        checkLevelUp(); 
    }
}

/**
 * @description 檢查是否獲得新徽章。
 */
function checkAchievements() {
    let newAchievement = false;
    
    for (const key in CONFIG.ACHIEVEMENTS) {
        const achievement = CONFIG.ACHIEVEMENTS[key];
        
        if (!stats.lifetime.achievements.includes(key)) {
            let valueToCheck = 0;
            
            // 根據徽章類型檢查對應的永久統計數據
            if (achievement.type === 'total_score') {
                valueToCheck = stats.lifetime.total_score;
            } else if (achievement.type === 'music_time') {
                valueToCheck = stats.lifetime.music_time;
            } else if (achievement.type === 'pomodoro_time') {
                valueToCheck = stats.lifetime.pomodoro_time;
            } else if (achievement.type === 'blog_count') {
                valueToCheck = stats.lifetime.blog_count;
            }
            
            if (valueToCheck >= achievement.condition) {
                stats.lifetime.achievements.push(key);
                newAchievement = true;
                // 💡 提示：這裡應觸發徽章動畫/彈窗
                displayNotification(`🏆 獲得新徽章：${achievement.name}！`, 'achievement');
            }
        }
    }
    if (newAchievement) {
        saveStats();
        // 💡 提示：更新 UI
        updateUI();
    }
}

// ===================================
// 核心積分計算與公共 API
// ===================================

/**
 * @typedef {'BLOG' | 'MUSIC' | 'POMODORO'} ScoreType
 * @description 增加指定活動的積分和時長。
 * @param {ScoreType} type - 活動類型 ('BLOG', 'MUSIC', 'POMODORO')
 * @param {number} minutes - 累積的時間 (分鐘)
 * @param {boolean} isNewArticle - 僅用於 BLOG 類型，標記是否為新文章 (只記一次)
 */
function addScore(type, minutes = 1, isNewArticle = false) {
    const dailyTimeKey = `${type.toLowerCase()}_time`; // e.g., 'blog_time'
    const limitMinutes = CONFIG.DAILY_LIMIT_MINUTES[type];
    const scorePerMinute = CONFIG.SCORE_PER_MINUTE[type];
    
    // 1. 檢查是否達到每日時長上限
    if (stats.daily[dailyTimeKey] >= limitMinutes) {
        // console.log(`每日 ${type} 積分已達上限，不再計分。`);
        return false;
    }
    
    // 2. 累計每日時長
    stats.daily[dailyTimeKey] += minutes;
    
    // 3. 計算並累計每日積分 (上限檢查)
    let scoreToAdd = scorePerMinute * minutes;
    
    // 如果累計時長超過上限，則只計算剩餘的積分
    if (stats.daily[dailyTimeKey] > limitMinutes) {
        const excessMinutes = stats.daily[dailyTimeKey] - limitMinutes;
        scoreToAdd -= (scorePerMinute * excessMinutes);
    }
    
    if (scoreToAdd > 0) {
        stats.daily.score += scoreToAdd;
        stats.lifetime.total_score += scoreToAdd;
        
        // 4. 累計永久時長 (用於徽章)
        stats.lifetime[dailyTimeKey] += minutes;

        // 5. 特殊處理：文章篇數
        if (type === 'BLOG' && isNewArticle) {
            stats.lifetime.blog_count += 1;
        }

        saveStats();
        checkLevelUp();
        checkAchievements();
        updateUI();
        // console.log(`增加 ${type} 積分 ${scoreToAdd} 分。當日總分: ${stats.daily.score}`);
        return true;
    }
    return false;
}

// ===================================
// UI 更新與提示 (簡化版，你可以優化樣式)
// ===================================

/**
 * @description 顯示前端提示。
 * @param {string} message - 提示內容
 * @param {('level-up'|'achievement')} type - 提示類型
 */
function displayNotification(message, type) {
    const notifElement = document.getElementById('game-notification');
    if (!notifElement) return;

    notifElement.textContent = message;
    notifElement.className = `game-notification ${type}`; // 添加樣式類
    notifElement.style.display = 'block';

    setTimeout(() => {
        notifElement.style.display = 'none';
    }, 5000); 
}

/**
 * @description 更新所有遊戲化相關的前端顯示。
 */
function updateUI() {
    // 1. 等級和總積分
    const currentLevel = stats.lifetime.level;
    const currentScore = stats.lifetime.total_score;
    let nextLevelReq = CONFIG.LEVEL_REQUIREMENTS.find(req => req.level === currentLevel + 1);

    document.getElementById('level-display').textContent = `Level ${currentLevel}`;
    document.getElementById('total-score-display').textContent = `總積分: ${currentScore} 分`;

    // 2. 進度條
    const progressBar = document.getElementById('level-progress-bar');
    const progressText = document.getElementById('level-progress-text');

    if (nextLevelReq) {
        // 計算當前級別所需的進度
        const prevLevelReq = CONFIG.LEVEL_REQUIREMENTS.find(req => req.level === currentLevel) || { required: 0 };
        const scoreNeededForThisLevel = nextLevelReq.required - prevLevelReq.required;
        const scoreEarnedInThisLevel = currentScore - prevLevelReq.required;

        const progressPercent = Math.min(100, (scoreEarnedInThisLevel / scoreNeededForThisLevel) * 100);

        progressBar.style.width = `${progressPercent}%`;
        progressText.textContent = `(${scoreEarnedInThisLevel} / ${scoreNeededForThisLevel})`;
    } else {
        progressBar.style.width = '100%';
        progressText.textContent = ' (已達當前最高等級)';
    }

    // 3. 每日積分提示
    const dailyScoreDisplay = document.getElementById('daily-score-display');
    const remainingBlog = CONFIG.DAILY_LIMIT_MINUTES.BLOG - stats.daily.blog_time;
    const remainingMusic = CONFIG.DAILY_LIMIT_MINUTES.MUSIC - stats.daily.music_time;
    const remainingPomodoro = CONFIG.DAILY_LIMIT_MINUTES.POMODORO - stats.daily.pomodoro_time;
    
    dailyScoreDisplay.innerHTML = `
        <strong>今日積分: ${stats.daily.score} 分</strong>
        <br>閱讀：剩餘 ${Math.max(0, remainingBlog)} 分鐘
        <br>音樂：剩餘 ${Math.max(0, remainingMusic)} 分鐘
        <br>番茄鐘：剩餘 ${Math.max(0, remainingPomodoro)} 分鐘
    `;

    // 4. 徽章顯示
    const achievementList = document.getElementById('achievement-list');
    if(achievementList) {
        achievementList.innerHTML = stats.lifetime.achievements.map(key => {
            const name = CONFIG.ACHIEVEMENTS[key].name;
            // 這裡可以替換為漂亮的圖示
            return `<span title="${name}" class="badge-icon">🌟</span>`; 
        }).join('');
    }
}


// ===================================
// 啟動與匯出
// ===================================

/**
 * @description 初始化遊戲化模組。
 */
export function initializeGamificationModule() {
    loadStats();
    updateUI(); // 首次載入時更新 UI
    console.log("程式夥伴: 遊戲化模組已啟動。");
}

/**
 * @description 供外部調用，用於閱讀文章時計分。
 */
export function addBlogScore() {
    // 這裡我們只傳遞分鐘數 1，然後在文章佈局中處理首次閱讀的邏輯。
    return addScore('BLOG', 1);
}

/**
 * @description 供外部調用，用於音樂播放時計分。
 */
export function addMusicScore() {
    return addScore('MUSIC', 1);
}

/**
 * @description 供外部調用，用於番茄鐘工作時計分。
 * @param {boolean} isBreakMode - 是否為休息模式 (休息模式不計分)
 */
export function addPomodoroScore(isBreakMode) {
    if (isBreakMode) return false;
    return addScore('POMODORO', 1);
}

// 供其他模組獲取當前統計數據 (可選)
export function getStats() {
    return stats;
}

// 匯出徽章配置，以便在 UI 中渲染完整的徽章列表
export const AchievementList = CONFIG.ACHIEVEMENTS;

// 程式夥伴: 修正！將 addMusicScore 暴露在全局，供 audio_player.html 使用
window.addMusicScore = addMusicScore;
