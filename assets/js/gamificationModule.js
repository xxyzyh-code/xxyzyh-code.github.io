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
        // ⭐️ 新增：週末加速活動配置 (僅限週六/週日)
    WEEKEND_BOOST: {
        LIMIT_MULTIPLIER: 1.5, // 得分時長上限 × 1.5
        SCORE_MULTIPLIER: 1.2  // 單位 XP × 1.2
    },
    // 等級所需總積分
    LEVEL_REQUIREMENTS: [
        { level: 1, required: 0 },
        { level: 2, required: 100 },
        { level: 3, required: 200 },
        { level: 4, required: 400 },
        { level: 5, required: 700 },
        { level: 6, required: 1100 },
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
        level: 1, // 預設初始等級為Level 1
        blog_count: 0, // 閱讀文章篇數
        music_time: 0, // 累積音樂時間 (分鐘)
        pomodoro_time: 0, // 累積番茄鐘時間 (分鐘)
        achievements: [], // 👈 這裡必須加逗號！
        // ⭐️ 新增：追蹤簽到所需字段
        last_check_in: '',      // 上次簽到日期 (格式: YYYY-MM-DD)
        consecutive_days: 0     // 連續簽到天數
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
        } else {
            // ⭐️ 修正 B: 如果沒有儲存的 stats (首次載入)，則確保等級為 1
            stats.lifetime.level = 1; 
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
        
        // ⭐️ 修正 C: 移除多餘的 Level 0 檢查邏輯。
        // checkLevelUp() 會處理 Level 1 升級到 Level 2 的情況。
        // 如果舊的 stats 檔案被載入，但 total_score 達到要求，checkLevelUp() 仍會被積分函數呼叫並正確升級。

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
// ⭐️ 新增：週末判斷邏輯
// ===================================
/**
 * @description 判斷當前日期是否為週六 (6) 或週日 (0)。
 * @returns {boolean} 是否為週末
 */
function isWeekend() {
    // 0 = Sunday, 6 = Saturday
    const dayOfWeek = new Date().getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
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
    
    // ⭐️ 核心修改：判斷是否為週末，並獲取加速係數
    const weekendActive = isWeekend();
    
    let limitMinutes = CONFIG.DAILY_LIMIT_MINUTES[type];
    let scorePerMinute = CONFIG.SCORE_PER_MINUTE[type];

    // 如果是週末，應用加速規則
    if (weekendActive) {
        // 時長上限 × 1.5 (取整以避免浮點數問題，但保留計算精度)
        limitMinutes = Math.floor(limitMinutes * CONFIG.WEEKEND_BOOST.LIMIT_MULTIPLIER); 
        // 單位積分 × 1.2 (取整，你可能需要考慮保留小數點，這裡為了簡潔直接向下取整)
        // 為了避免損失精度，我們建議保留小數，但最終分數仍應是整數，所以讓分數部分使用 Math.floor/Math.round
        scorePerMinute = scorePerMinute * CONFIG.WEEKEND_BOOST.SCORE_MULTIPLIER;
        
        // 可選：輸出提示，方便開發者確認加速是否生效
        console.log(`[週末加速] ${type}：新上限 ${limitMinutes} 分鐘，新單位 XP ${scorePerMinute.toFixed(2)} 分/分鐘`);
    }

    
    // 1. 檢查是否達到每日時長上限
    // 使用動態調整後的 limitMinutes 進行檢查
    if (stats.daily[dailyTimeKey] >= limitMinutes) {
        // console.log(`每日 ${type} 積分已達上限，不再計分。`);
        return false;
    }
    
    // 2. 累計每日時長
    stats.daily[dailyTimeKey] += minutes;
    
    // 3. 計算並累計每日積分 (上限檢查)
    // 使用動態調整後的 scorePerMinute 進行計算
    let scoreToAdd = scorePerMinute * minutes;
    
    // 如果累計時長超過上限，則只計算剩餘的積分
    if (stats.daily[dailyTimeKey] > limitMinutes) {
        const excessMinutes = stats.daily[dailyTimeKey] - limitMinutes;
        // 減去超出的積分 (同樣使用加速後的 scorePerMinute)
        scoreToAdd -= (scorePerMinute * excessMinutes);
    }
    
    // 最終得分轉換為整數，確保計分系統不會出現小數
    scoreToAdd = Math.floor(scoreToAdd);

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
 * @description 供外部調用，處理每日簽到積分邏輯。
 * @returns {{canCheckIn: boolean, consecutiveDays: number, score: number}} 簽到狀態
 */
export function getCheckInStatus() {
    const today = new Date().toLocaleDateString('en-CA');
    
    // 1. 檢查今日是否已簽到
    const alreadyCheckedIn = stats.lifetime.last_check_in === today;
    
    // 2. 計算連續天數
    let currentConsecutiveDays = stats.lifetime.consecutive_days;
    
    if (!alreadyCheckedIn) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toLocaleDateString('en-CA');
        
        // 檢查簽到是否連續
        if (stats.lifetime.last_check_in === yesterdayStr) {
            currentConsecutiveDays += 1; // 連續簽到 +1
        } else if (stats.lifetime.last_check_in !== '') {
            currentConsecutiveDays = 1; // 簽到中斷，重新計為第 1 天
        } else {
            currentConsecutiveDays = 1; // 首次簽到
        }
    }
    
    // 3. 計算獎勵積分 (每連續簽到一天獎勵 5 積分，上限 25 積分，即連續 5 天後穩定)
    const baseScore = 5;
    const maxConsecutiveBonus = 5; 
    const bonusDays = Math.min(currentConsecutiveDays, maxConsecutiveBonus);
    const score = baseScore * bonusDays;
    
    return {
        canCheckIn: !alreadyCheckedIn,
        consecutiveDays: currentConsecutiveDays,
        score: score
    };
}

/**
 * @description 執行每日簽到並發放積分。
 * @returns {boolean} 是否成功簽到
 */
export function addCheckInScore() {
    const status = getCheckInStatus();
    
    if (!status.canCheckIn) {
        displayNotification('❌ 今天你已經簽到過了！明天再來吧。', 'warning');
        return false;
    }

    // 1. 更新統計數據
    stats.lifetime.last_check_in = new Date().toLocaleDateString('en-CA');
    stats.lifetime.consecutive_days = status.consecutiveDays;
    
    // 2. 發放積分 (直接增加到總分，簽到沒有每日時長限制)
    stats.daily.score += status.score;
    stats.lifetime.total_score += status.score;

    saveStats();
    checkLevelUp();
    checkAchievements();
    updateUI();

    displayNotification(`✅ 簽到成功！連續第 ${status.consecutiveDays} 天，獲得 ${status.score} 積分！`, 'success');
    return true;
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
 * @param {boolean} isNewArticle - 是否為首次閱讀此文章 (用於計算 lifetime.blog_count)
 */
export function addBlogScore(isNewArticle = false) {
    // ⭐️ 修正：接收 isNewArticle 參數，並將其傳遞給底層 addScore 函數
    // 確保文章時長和 blog_count 都能正確累計
    return addScore('BLOG', 1, isNewArticle);
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
