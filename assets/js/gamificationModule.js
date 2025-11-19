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
        BLOG: 30, 
        MUSIC: 25, 
        POMODORO: 40 
    },
    // ⭐️ 專為等級時長設計的配置
    LEVEL_LIMIT_BONUS: [
        { level: 10, bonusMinutes: 5 }, 
        { level: 20, bonusMinutes: 5, scoreMultiplier: 1.1 }, // L20: +5分鐘, 總XP: 1.1 (累積 0.1)
        { level: 30, bonusMinutes: 5, scoreMultiplier: 1.1 }, // L30: +5分鐘, 總XP: 1.2 (累積 0.2)
        // 🚩 NEW: Level 40 的額外增益
        { level: 40, bonusMinutes: 5, scoreMultiplier: 1.2 }, // L40: +5分鐘, 總XP: 1.4 (累積 0.4)
    ],
    // ⭐️ 活動配置 A：週末加速活動 (僅限週六/週日)
    WEEKEND_BOOST: {
        LIMIT_MULTIPLIER: 1.5, // 得分時長上限 × 1.5
        SCORE_MULTIPLIER: 1.2  // 單位 XP × 1.2
    },
// ⭐️ 活動配置 B：年度固定活動 (格式: 月-日，用來提供額外 XP 乘數)
ANNUAL_EVENTS: {
    // 🎉 一月
    'NEW_YEAR': {
        name: '新年慶',
        dates: ['01-01'],
        score_multiplier: 1.4 // 單位 XP × 1.4 (與週末活動取高者)
    },
    'EPIPHANY': {
        name: '主顯節',
        dates: ['01-06'],
        score_multiplier: 1.6
    },
    'WINTER_PEACE': {
        name: '冬季平安日',
        dates: ['01-31'],
        score_multiplier: 1.4
    },

    // 🧧 二月
    'LUNAR_NEW_YEAR': {
        name: '春節假日慶',
        dates: ['02-14', '02-15', '02-16', '02-17', '02-18', '02-19', '02-20', '02-21', '02-22'],
        score_multiplier: 1.5
    },

    // 🌱 三月
    'SPRING_CREATION': {
        name: '春季創作日',
        dates: ['03-01'],
        score_multiplier: 1.4
    },
    'POETRY_DAY': {
        name: '世界詩歌日',
        dates: ['03-21'],
        score_multiplier: 1.5
    },

    // 📚 四月
    'CHILDRENS_BOOK_DAY': {
        name: '國際兒童圖書日',
        dates: ['04-02'],
        score_multiplier: 1.5
    },
    'CHILDRENS_DAY_TW': {
        name: '兒童節',
        dates: ['04-04'],
        score_multiplier: 1.5
    },
    'SPRING_READ': {
        name: '春季閱讀日',
        dates: ['04-23'],
        score_multiplier: 1.5
    },

    // 🛠️ 五月
    'LABOR_DAY': {
        name: '勞動節',
        dates: ['05-01'],
        score_multiplier: 1.4
    },
    'SUMMER_GROWTH': {
        name: '夏季成長日',
        dates: ['05-31'],
        score_multiplier: 1.4
    },

    // 👧 六月
    'CHILDRENS_DAY_GLOBAL': {
        name: '國際兒童節',
        dates: ['06-01'],
        score_multiplier: 1.5
    },

    // 🌞 七月
    'MIDSUMMER_GRATITUDE': {
        name: '仲夏感恩日',
        dates: ['07-15'],
        score_multiplier: 1.4
    },

    // 🌻 八月
    'LATE_SUMMER_HOPE': {
        name: '夏末希望日',
        dates: ['08-20'],
        score_multiplier: 1.4
    },

    // 🎂 九月
    'BIRTHDAY_WEEK': {
        name: '生日周',
        dates: ['09-23', '09-24', '09-25', '09-26', '09-27', '09-28', '09-29'],
        score_multiplier: 1.4
    },

    // 🌕 十月
    'MID_AUTUMN': {
        name: '中秋節',
        dates: ['10-04', '10-05', '10-06'],
        score_multiplier: 1.4
    },
    'NATIONAL_DAY': {
        name: '國慶節',
        dates: ['10-10', '10-11', '10-12'],
        score_multiplier: 1.4
    },
    'HALLOWEEN': {
        name: '萬聖節',
        dates: ['10-31'],
        score_multiplier: 1.5
    },

    // 🕯️ 十一月
    'ALL_SAINTS': {
        name: '萬聖日',
        dates: ['11-01'],
        score_multiplier: 1.5
    },
    'LATE_AUTUMN_REFLECTION': {
        name: '晚秋靜思日',
        dates: ['11-20'],
        score_multiplier: 1.3
    },

    // 🎄 十二月
    'WINTER_GRATITUDE': {
        name: '冬季感恩日',
        dates: ['12-10'],
        score_multiplier: 1.3
    },
    'CHRISTMAS': {
        name: '聖誕節',
        dates: ['12-24', '12-25', '12-26'],
        score_multiplier: 1.6
    },
    'YEAR_END_BOOST': {
        name: '年終衝刺日',
        dates: ['12-27', '12-28', '12-29', '12-30', '12-31'],
        score_multiplier: 1.3
    }
},
    // 等級所需總積分 (保持不變)
    LEVEL_REQUIREMENTS: [
        { level: 1, required: 0 },
        { level: 2, required: 110 },
        { level: 3, required: 330 },
        { level: 4, required: 770 },
        { level: 5, required: 1540 },
        { level: 6, required: 2750 },
        { level: 7, required: 4510 },
        { level: 8, required: 6930 },
        { level: 9, required: 10230 },
        { level: 10, required: 14740 },
        { level: 11, required: 20900 },
        { level: 12, required: 29150 },
        { level: 13, required: 40150 },
        { level: 14, required: 55000 },
        { level: 15, required: 74800 },
        { level: 16, required: 101200 },
        { level: 17, required: 137500 },
        { level: 18, required: 187000 },
        { level: 19, required: 253000 },
        { level: 20, required: 341000 },
        { level: 21, required: 455000 },
        { level: 22, required: 604000 },
        { level: 23, required: 797000 },
        { level: 24, required: 1068000 },
        { level: 25, required: 1447000 },
        { level: 26, required: 2015000 },
        { level: 27, required: 2868000 },
        { level: 28, required: 4147000 },
        { level: 29, required: 6065000 },
        { level: 30, required: 8943000 },
        { level: 31, required: 12967000 },
        { level: 32, required: 18543000 },
        { level: 33, required: 25960000 },
        { level: 34, required: 35825000 },
        { level: 35, required: 48722000 },
        { level: 36, required: 65287000 },
        { level: 37, required: 86179000 },
        { level: 38, required: 112033000 },
        { level: 39, required: 143400000 },
        { level: 40, required: 180684000 },
        // ...
    ],
    // 徽章條件 (保持不變)
    ACHIEVEMENTS: {
        // --- 1. total_score 累積總分 (XP) ---
        'SCORE_NOVICE': { name: '積分新手', condition: 500, type: 'total_score' }, 
        'SCORE_TRAVELER': { name: '成長旅人', condition: 1500, type: 'total_score' }, 
        'SCORE_MASTER': { name: '積分大師', condition: 5000, type: 'total_score' }, 
        'SCORE_LEGEND': { name: '榮耀傳說', condition: 12000, type: 'total_score' },
        'SCORE_ETERNAL': { name: '永恆之光', condition: 25000, type: 'total_score' },
        
        // --- 2. blog_count 閱讀文章篇數 (篇) ---
        'READ_FIRST': { name: '首次閱讀', condition: 1, type: 'blog_count' }, 
        'READ_EXPLORER': { name: '文章探險家', condition: 10, type: 'blog_count' },
        'READ_SEEKER': { name: '知識追尋者', condition: 50, type: 'blog_count' },
        'READ_GRANDMASTER': { name: '閱讀宗師', condition: 100, type: 'blog_count' },
        'READ_TOWER_GUARD': { name: '智者之塔守衛者', condition: 300, type: 'blog_count' },
        
        // --- 3. music_time 累積音樂時間 (分鐘) ---
        'MUSIC_NOVICE': { name: '音樂新手', condition: 50, type: 'music_time' },
        'MUSIC_RHYTHM_TRAVELER': { name: '節奏旅人', condition: 200, type: 'music_time' },
        'MUSIC_MASTER': { name: '音樂達人', condition: 500, type: 'music_time' },
        'MUSIC_SOUL_LISTENER': { name: '靈魂聽者', condition: 1000, type: 'music_time' },
        'MUSIC_ETERNAL': { name: '永恆樂者', condition: 3000, type: 'music_time' },
        
        // --- 4. pomodoro_time 累積番茄鐘時間 (分鐘) ---
        'POMO_NOVICE': { name: '番茄新手', condition: 100, type: 'pomodoro_time' },
        'POMO_TIME_TRAVELER': { name: '時間旅人', condition: 500, type: 'pomodoro_time' },
        'POMO_PRO': { name: '番茄高手', condition: 1000, type: 'pomodoro_time' }, 
        'POMO_EFFICIENCY_MENTOR': { name: '效率導師', condition: 2000, type: 'pomodoro_time' },
        'POMO_GRANDMASTER': { name: '時間宗師', condition: 5000, type: 'pomodoro_time' },
        
        // --- 5. consecutive_days 連續簽到天數 (天) ---
        'CHECKIN_NOVICE': { name: '每日新手', condition: 2, type: 'consecutive_days' },
        'CHECKIN_PERSISTER': { name: '堅持者', condition: 7, type: 'consecutive_days' },
        'CHECKIN_MASTER': { name: '連簽達人', condition: 30, type: 'consecutive_days' },
        'CHECKIN_DISCIPLINE': { name: '紀律修行者', condition: 100, type: 'consecutive_days' },
        'CHECKIN_ETERNAL_FLAME': { name: '不滅之焰', condition: 365, type: 'consecutive_days' },
    },
    STORAGE_KEY: 'game_stats'
};

// ===================================
// 數據模型與儲存 (保持不變)
// ===================================
let stats = {
    // 每日統計
    daily: {
        last_reset: new Date().toLocaleDateString('en-CA'), // 格式: YYYY-MM-DD
        score: 0,
        blog_time: 0,
        music_time: 0,
        pomodoro_time: 0,
        // 🚩 精確累積：儲存尚未計入總分的浮點數積分餘額 (確保小數點不丟失)
        score_remainder: 0.0, 
    },
    // 永久統計
    lifetime: {
        total_score: 0,
        level: 1, 
        blog_count: 0, 
        music_time: 0, 
        pomodoro_time: 0, 
        achievements: [], 
        // 簽到追蹤字段
        last_check_in: '',      
        consecutive_days: 0     
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
            // 處理舊數據結構的相容性：如果沒有 score_remainder 則初始化
            if (stats.daily.score_remainder === undefined) {
                 stats.daily.score_remainder = 0.0;
            }
        } else {
            // 首次載入時確保等級正確
            stats.lifetime.level = 1; 
        }
        
        // 每日重置檢查 (0:00 自動重置)
        const today = new Date().toLocaleDateString('en-CA');
        if (stats.daily.last_reset !== today) {
            // 創建新的 daily 統計數據
            stats.daily = {
                last_reset: today,
                score: 0,
                blog_time: 0,
                music_time: 0,
                pomodoro_time: 0,
                score_remainder: 0.0, 
            };
            console.log("程式夥伴: 每日積分已重置！");
        }
        
        // 處理徽章條件類型更新：確保 consecutive_days 在 lifetime 中有值
        if (stats.lifetime.consecutive_days === undefined) {
             stats.lifetime.consecutive_days = 0;
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
// 活動判斷邏輯 (保持不變)
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

/**
 * @description 檢查當前日期是否為年度固定活動日。
 * @returns {number} 活動的最高積分乘數 (如果沒有活動則返回 1.0)
 */
function getAnnualEventMultiplier() {
    // 取得當前月份-日期，格式：MM-DD
    const todayMD = new Date().toLocaleDateString('en-CA').substring(5); 
    let maxMultiplier = 1.0;

    for (const key in CONFIG.ANNUAL_EVENTS) {
        const event = CONFIG.ANNUAL_EVENTS[key];
        
        if (event.dates.includes(todayMD)) {
            // 找出所有生效活動中最高的積分乘數
            if (event.score_multiplier > maxMultiplier) {
                maxMultiplier = event.score_multiplier;
            }
        }
    }
    return maxMultiplier;
}

// ===================================
// 等級與徽章邏輯
// ===================================

/**
 * @description 根據當前等級，計算每日時長上限增加的分鐘數 (Level 10/20 增加 5 分鐘)。
 * @returns {number} 額外增加的時長 (分鐘)
 */
function getLevelLimitBonus() {
    const currentLevel = stats.lifetime.level;
    let totalBonus = 0;
    
    // 遍歷所有等級獎勵配置
    for (const item of CONFIG.LEVEL_LIMIT_BONUS) {
        if (currentLevel >= item.level) {
            totalBonus += item.bonusMinutes;
        }
    }
    return totalBonus;
}

/**
 * @description 🚩 MODIFIED: 根據當前等級，計算永久的基礎 XP 乘數（使用加法模式）。
 * @returns {number} 最終永久基礎 XP 乘數 (預設 1.0)
 */
function getLevelScoreMultiplier() {
    const currentLevel = stats.lifetime.level;
    let bonusPercentage = 0.0; // 累計獎勵百分比 (例如 0.1 + 0.1 = 0.2)
    
    // 遍歷所有等級獎勵配置
    for (const item of CONFIG.LEVEL_LIMIT_BONUS) {
        // 確保乘數存在且等級達到
        if (item.scoreMultiplier && currentLevel >= item.level) {
            // 🚩 關鍵修正：累加額外增益 (例如 1.1 -> 0.1, 1.1 -> 0.1)
            // L30 用戶總增益：0.1 + 0.1 = 0.2
            bonusPercentage += (item.scoreMultiplier - 1.0);
        }
    }
    // 最終乘數 = 1.0 + 累加的百分比
    return 1.0 + bonusPercentage; 
}


/**
 * @description 檢查等級是否提升。
 */
function checkLevelUp() {
    let currentLevel = stats.lifetime.level;
    // 找到下一個等級所需積分
    let nextLevelReq = CONFIG.LEVEL_REQUIREMENTS.find(req => req.level === currentLevel + 1);

    if (nextLevelReq && stats.lifetime.total_score >= nextLevelReq.required) {
        stats.lifetime.level = nextLevelReq.level;
        saveStats();
        // 觸發升級通知
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
        
        // 如果使用者尚未獲得此徽章
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
            } else if (achievement.type === 'consecutive_days') {
                // 檢查連簽徽章
                valueToCheck = stats.lifetime.consecutive_days;
            }
            
            // 檢查是否達到條件
            if (valueToCheck >= achievement.condition) {
                stats.lifetime.achievements.push(key);
                newAchievement = true;
                displayNotification(`🏆 獲得新徽章：${achievement.name}！`, 'achievement');
            }
        }
    }
    if (newAchievement) {
        saveStats();
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
 * @param {boolean} isNewArticle - 僅用於 BLOG 類型，標記是否為新文章
 */
function addScore(type, minutes = 1, isNewArticle = false) {
    const dailyTimeKey = `${type.toLowerCase()}_time`; 
    
    // 獲取所有加速係數
    const weekendActive = isWeekend();
    const annualMultiplier = getAnnualEventMultiplier();
    
    // 🚩 獲取等級時長獎勵
    const levelBonusMinutes = getLevelLimitBonus();
    // 🚩 NEW: 獲取永久等級 XP 乘數
    const levelScoreMultiplier = getLevelScoreMultiplier();


    // 1. 計算最終得分乘數 (取週末和年度活動中最高的乘數)
    let finalScoreMultiplier = 1.0;
    let eventTag = '';
    
    if (weekendActive) {
        finalScoreMultiplier = Math.max(finalScoreMultiplier, CONFIG.WEEKEND_BOOST.SCORE_MULTIPLIER);
        eventTag = '週末加速';
    }

    if (annualMultiplier > 1.0) {
        // 如果年度乘數更高，則更新乘數和 Tag
        if (annualMultiplier > finalScoreMultiplier) {
            finalScoreMultiplier = annualMultiplier;
            eventTag = '年度活動';
        } else if (annualMultiplier === finalScoreMultiplier && eventTag === '週末加速') {
            eventTag = '週末/年度活動'; // 乘數相同時的疊加提示
        } else if (annualMultiplier < finalScoreMultiplier && finalScoreMultiplier > 1.0) {
            // 最高乘數仍是週末活動提供的，保持週末 Tag
            eventTag = '週末加速';
        } else {
             // 只有年度活動在進行 (finalScoreMultiplier 仍為 1.0)
             eventTag = '年度活動'; 
        }
    }
    
    // 🚩 UPGRADE 2: 將永久等級 XP 乘數疊加在活動乘數之上！
    finalScoreMultiplier *= levelScoreMultiplier; 


    // 2. 計算最終時長上限
    // 獲取基礎配置
    let baseLimitMinutes = CONFIG.DAILY_LIMIT_MINUTES[type];
    let scorePerMinute = CONFIG.SCORE_PER_MINUTE[type];

    // 🚩 STEP A: 先疊加等級獎勵
    let limitMinutes = baseLimitMinutes + levelBonusMinutes;
    
    // 🚩 STEP B: 再應用週末加速乘數 (只有週末活動影響時長上限)
    const limitMultiplier = weekendActive ? CONFIG.WEEKEND_BOOST.LIMIT_MULTIPLIER : 1;
    limitMinutes = Math.floor(limitMinutes * limitMultiplier); 
    
    // 應用最高得分乘數 (用於計算實際得分)
    scorePerMinute = scorePerMinute * finalScoreMultiplier;
    
    if (finalScoreMultiplier > 1.0 || levelBonusMinutes > 0) {
        // 增加新的 Log 提示等級乘數
        const levelMTag = levelScoreMultiplier > 1.0 ? ` (Lvl XP x${levelScoreMultiplier.toFixed(2)})` : '';
        console.log(`[${eventTag || '等級獎勵'}] ${type}：新上限 ${limitMinutes} 分鐘 (基礎 ${baseLimitMinutes} + 等級獎勵 ${levelBonusMinutes})，新單位 XP ${scorePerMinute.toFixed(2)} 分/分鐘${levelMTag}`);
    }

    // 3. 檢查是否達到每日時長上限
    if (stats.daily[dailyTimeKey] >= limitMinutes) {
        return false;
    }
    
    // 4. 累計每日時長
    stats.daily[dailyTimeKey] += minutes;
    
    // 5. 計算並累計每日積分 (處理浮點數累積)
    let rawScoreToAdd = scorePerMinute * minutes;
    
    // 如果累計時長超過上限，則只計算剩餘的積分
    if (stats.daily[dailyTimeKey] > limitMinutes) {
        const excessMinutes = stats.daily[dailyTimeKey] - limitMinutes;
        rawScoreToAdd -= (scorePerMinute * excessMinutes);
    }
    
    if (rawScoreToAdd <= 0) {
        saveStats(); // 儲存累計時長，但無分數增加
        return false; 
    }

    // 🚩 將浮點數分數加到餘額中 (精確累積的關鍵)
    stats.daily.score_remainder += rawScoreToAdd;

    // 提取整數分數部分 (只有整數部分才計入總分)
    let scoreToAdd = Math.floor(stats.daily.score_remainder);

    if (scoreToAdd > 0) {
        // 更新餘額：減去已經提取的整數分數
        stats.daily.score_remainder -= scoreToAdd; 
        
        // 累計分數到 daily 和 lifetime 總分
        stats.daily.score += scoreToAdd;
        stats.lifetime.total_score += scoreToAdd;
        
        // 6. 累計永久時長 (用於徽章)
        stats.lifetime[dailyTimeKey] += minutes;

        // 7. 特殊處理：文章篇數
        if (type === 'BLOG' && isNewArticle) {
            stats.lifetime.blog_count += 1;
        }

        saveStats();
        checkLevelUp();
        checkAchievements();
        updateUI();
        
        console.log(`[XP 累積] 餘額增加 ${rawScoreToAdd.toFixed(2)}。計入 ${scoreToAdd} 分。新餘額 ${stats.daily.score_remainder.toFixed(2)}。`);
        return true;
    }
    
    // 如果餘額增加但不足 1 分，仍需儲存狀態
    if (rawScoreToAdd > 0) {
         saveStats();
         return true;
    }
    
    return false;
}

// ===================================
// UI 更新與提示 (保持不變)
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
    notifElement.className = `game-notification ${type}`; 
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
        
        // 檢查簽到是否連續 (與昨天日期是否相同)
        if (stats.lifetime.last_check_in === yesterdayStr) {
            currentConsecutiveDays += 1; 
        } else if (stats.lifetime.last_check_in !== '') {
            currentConsecutiveDays = 1; // 簽到中斷，重新計數
        } else {
            currentConsecutiveDays = 1; // 首次簽到
        }
    }
    
    // 3. 計算獎勵積分 (連續簽到越多，積分越高，有上限)
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
    
    // 2. 發放積分 (直接增加，簽到不受時長限制)
    
    // 🚩 建議升級：讓簽到積分也受到永久等級 XP 乘數的加成
    const checkInScoreBase = status.score;
    const levelMultiplier = getLevelScoreMultiplier(); // 獲取 L20/L30 乘數
    
    let rawScoreToAdd = checkInScoreBase * levelMultiplier;
    
    // 處理浮點數餘額
    stats.daily.score_remainder += rawScoreToAdd;
    let scoreToAdd = Math.floor(stats.daily.score_remainder);

    if (scoreToAdd > 0) {
        stats.daily.score_remainder -= scoreToAdd;
        stats.daily.score += scoreToAdd;
        stats.lifetime.total_score += scoreToAdd;
        
        console.log(`[XP 累積] 簽到積分：基礎 ${checkInScoreBase} x Lvl x${levelMultiplier.toFixed(2)} = ${rawScoreToAdd.toFixed(2)}。計入 ${scoreToAdd} 分。新餘額 ${stats.daily.score_remainder.toFixed(2)}。`);
    } else {
        // 雖然分數不足 1 分，但餘額已累計，仍視為成功
         console.log(`[XP 累積] 簽到積分：基礎 ${checkInScoreBase} x Lvl x${levelMultiplier.toFixed(2)} = ${rawScoreToAdd.toFixed(2)}。分數不足 1 分，只累計到餘額。新餘額 ${stats.daily.score_remainder.toFixed(2)}。`);
    }

    saveStats();
    checkLevelUp();
    checkAchievements(); // 簽到完成後立即檢查連簽徽章
    updateUI();

    displayNotification(`✅ 簽到成功！連續第 ${status.consecutiveDays} 天，獲得約 ${rawScoreToAdd.toFixed(1)} 積分獎勵！`, 'success');
    return true;
}

/**
 * @description 更新所有遊戲化相關的前端顯示。
 */
function updateUI() {
    // 1. 等級和總積分顯示
    const currentLevel = stats.lifetime.level;
    const currentScore = stats.lifetime.total_score;
    let nextLevelReq = CONFIG.LEVEL_REQUIREMENTS.find(req => req.level === currentLevel + 1);
    
    // 獲取所有 DOM 元素
    const levelDisplay = document.getElementById('level-display');
    const totalScoreDisplay = document.getElementById('total-score-display');
    const dailySummaryHeader = document.getElementById('daily-score-summary-header'); // 🎯 新的 Header 簡報元素
    const dailyLogDisplay = document.getElementById('daily-log-display');             // 🎯 新的日誌詳情元素
    const progressBar = document.getElementById('level-progress-bar');
    const progressText = document.getElementById('level-progress-text');
    const achievementList = document.getElementById('achievement-list');
    const achievementProgressDisplay = document.getElementById('achievement-progress-text'); // 🎯 新的徽章進度元素

    // 確保元素存在再更新，避免錯誤
    if (levelDisplay) levelDisplay.textContent = `Level ${currentLevel}`;
    if (totalScoreDisplay) totalScoreDisplay.textContent = `總積分: ${currentScore} 分`;


    // 2. 進度條計算 (邏輯不變)
    if (progressBar && progressText) {
        if (nextLevelReq) {
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
    }


    // 3. 每日積分提示 (拆分 Header 與 Log 區塊)
    const weekendActive = isWeekend();
    const annualMultiplier = getAnnualEventMultiplier();
    
    // 只有週末活動影響時長上限
    const limitMultiplier = weekendActive ? CONFIG.WEEKEND_BOOST.LIMIT_MULTIPLIER : 1;
    
    // 決定 UI 提示標籤
    let uiTag = '';
    if (annualMultiplier > 1.0) {
        uiTag = ' ✨年度活動!';
    } else if (weekendActive) {
        uiTag = ' ✨週末加速中!';
    }
    
    const levelBonus = getLevelLimitBonus();
    const levelScoreM = getLevelScoreMultiplier(); // 獲取等級 XP 乘數
    
    let bonusTag = levelBonus > 0 ? ` (等級時長: +${levelBonus}分鐘)` : '';
    // 顯示等級 XP 乘數，讓用戶知道自己的永久特權
    if (levelScoreM > 1.0) {
         bonusTag += ` (等級效率: x${levelScoreM.toFixed(2)})`;
    }


    // 計算實際每日上限
    const actualLimitBlog = Math.floor((CONFIG.DAILY_LIMIT_MINUTES.BLOG + levelBonus) * limitMultiplier);
    const actualLimitMusic = Math.floor((CONFIG.DAILY_LIMIT_MINUTES.MUSIC + levelBonus) * limitMultiplier);
    const actualLimitPomodoro = Math.floor((CONFIG.DAILY_LIMIT_MINUTES.POMODORO + levelBonus) * limitMultiplier);

    // 計算剩餘時間 
    const remainingBlog = actualLimitBlog - stats.daily.blog_time;
    const remainingMusic = actualLimitMusic - stats.daily.music_time;
    const remainingPomodoro = actualLimitPomodoro - stats.daily.pomodoro_time;
    
    
    // 🎯 Header 顯示：只顯示今日積分 (精簡版)
    if (dailySummaryHeader) {
        dailySummaryHeader.innerHTML = `<strong>今日積分: ${stats.daily.score} 分</strong>${uiTag}`;
    }

    // 🎯 Log 顯示：顯示所有詳細資訊
    if (dailyLogDisplay) {
        dailyLogDisplay.innerHTML = `
            ${bonusTag ? `<small style="display: block; color: #ff9800; margin-bottom: 5px;">${bonusTag}</small>` : ''}
            閱讀：剩餘 ${Math.max(0, remainingBlog)} 分鐘 (上限 ${actualLimitBlog} 分鐘)
            <br>音樂：剩餘 ${Math.max(0, remainingMusic)} 分鐘 (上限 ${actualLimitMusic} 分鐘)
            <br>番茄鐘：剩餘 ${Math.max(0, remainingPomodoro)} 分鐘 (上限 ${actualLimitPomodoro} 分鐘)
            <br><small style="opacity: 0.7;">待計入餘額: ${stats.daily.score_remainder.toFixed(2)} 分</small>
        `;
    }


    // 4. 徽章顯示 (重新引入進度計算)
    const totalAchievements = Object.keys(CONFIG.ACHIEVEMENTS).length; 
    const earnedAchievements = stats.lifetime.achievements.length;    
    const progressStatus = `${earnedAchievements} / ${totalAchievements}`;
    
    if (achievementProgressDisplay) {
        achievementProgressDisplay.textContent = ` (${progressStatus})`; // 更新進度文本
    }
    
    if(achievementList) {
        achievementList.innerHTML = stats.lifetime.achievements.map(key => {
            const name = CONFIG.ACHIEVEMENTS[key].name;
            // 替換為你的徽章圖示或樣式
            return `<span title="${name}" class="badge-icon">🌟</span>`; 
        }).join('');
    }
}


// ===================================
// 啟動與匯出 (保持不變)
// ===================================

/**
 * @description 初始化遊戲化模組。
 */
export function initializeGamificationModule() {
    loadStats();
    updateUI(); 
    console.log("程式夥伴: 遊戲化模組已啟動。");
}

/**
 * @description 供外部調用，用於閱讀文章時計分。
 */
export function addBlogScore(isNewArticle = false) {
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

// 匯出徽章配置
export const AchievementList = CONFIG.ACHIEVEMENTS;
