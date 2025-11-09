// netlify/functions/api-track.js
// 目的：處理 /.netlify/functions/api-track 的請求
const { createClient } = require('@supabase/supabase-js');

// 💡 注意：Netlify Functions 使用 Node.js process.env 
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
// ⚠️ 建議：將 SUPABASE_KEY 改為 SUPABASE_ANON_KEY 以明確其用途，並在 Netlify UI 中設定。

exports.handler = async function(event, context) {
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: '',
      headers: { 'Allow': 'POST' }
    };
  }
  
  try {
    // Netlify Functions 的 POST 請求體在 event.body 中，並且是 base64 編碼的字符串（如果 isBase64Encoded 為 true）
    const body = event.isBase64Encoded ? 
                 JSON.parse(Buffer.from(event.body, 'base64').toString('utf8')) : 
                 JSON.parse(event.body);
                 
    const { user_id, song_id, title } = body; 

    if (!user_id || !song_id || !title) {
        return { 
          statusCode: 400, 
          body: JSON.stringify({ error: 'Missing required fields: user_id, song_id, or title.' }),
          headers: { 'Content-Type': 'application/json' }
        };
    }

    // 1. 查詢現有記錄
    // ... (數據庫查詢和更新/插入邏輯與您提供的版本保持一致，使用 await supabase.from()...)
    
    // 【省略數據庫邏輯，假設它已經在 Netlify Functions 中正確實現】

    // 1. 查詢現有記錄 (使用您原來的邏輯，但需檢查 Supabase 響應)
    const { data: existing, error: selectError } = await supabase
      .from('play_logs')
      .select('id, plays') 
      .eq('user_id', user_id)
      .eq('song_id', song_id)
      .maybeSingle(); 

    if (selectError && selectError.code !== 'PGRST116') {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Database read error', details: selectError.message }),
            headers: { 'Content-Type': 'application/json' }
        };
    }

    if (existing) {
      // 2. 找到記錄，更新播放次數
      const { error: updateError } = await supabase
        .from('play_logs')
        .update({ plays: existing.plays + 1, last_played: new Date().toISOString() })
        .eq('id', existing.id); // 移除 returning: 'minimal'
      if (updateError) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Database update error', details: updateError.message }),
            headers: { 'Content-Type': 'application/json' }
        };
      }
    } else {
      // 3. 未找到記錄，插入新記錄
      const { error: insertError } = await supabase
        .from('play_logs')
        .insert([{ 
            user_id, 
            song_id, 
            title, 
            plays: 1, 
            last_played: new Date().toISOString() 
        }]); // 移除 returning: 'minimal'
      if (insertError) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Database insert error', details: insertError.message }),
            headers: { 'Content-Type': 'application/json' }
        };
      }
    }

    // 返回成功響應
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Play log recorded.' }),
      headers: { 'Content-Type': 'application/json' }
    };

  } catch (error) {
    console.error('API execution error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: 'Internal Server Error' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};
