// api/track.js (修正後的程式碼)
const { createClient } = require('@supabase/supabase-js'); // 1. 改用 require

// 由於 Vercel Serverless Function 環境變數的載入方式，
// 建議直接在檔案中定義函式並導出。
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

module.exports = async (req, res) => { // 2. 改用 module.exports
  
  // *** 解決 405 Method Not Allowed 的關鍵部分 ***
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  // **********************************************
  
  try {
    // Vercel Serverless Function (Node.js) 預設會解析 JSON 請求體，
    // 但為了安全起見，如果 req.body 是字串，仍需解析。
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    const { user_id, song_id } = body;

    const { data: existing, error: selectError } = await supabase
      .from('play_logs')
      .select('id, plays') // 只選擇需要的欄位
      .eq('user_id', user_id)
      .eq('song_id', song_id)
      .maybeSingle(); // 確保只返回 0 或 1 條記錄

    if (selectError && selectError.code !== 'PGRST116') { // PGRST116 是 "未找到單一記錄"
        console.error('Supabase select error:', selectError);
        return res.status(500).json({ error: 'Database read error' });
    }

    if (existing) {
      // 找到記錄，更新播放次數
      const { error: updateError } = await supabase
        .from('play_logs')
        .update({ plays: existing.plays + 1, last_played: new Date().toISOString() })
        .eq('id', existing.id);
        
      if (updateError) {
        console.error('Supabase update error:', updateError);
        return res.status(500).json({ error: 'Database update error' });
      }
      
    } else {
      // 未找到記錄，插入新記錄
      const { error: insertError } = await supabase
        .from('play_logs')
        .insert([{ user_id, song_id, plays: 1, last_played: new Date().toISOString() }]);

      if (insertError) {
        console.error('Supabase insert error:', insertError);
        return res.status(500).json({ error: 'Database insert error' });
      }
    }

    res.status(200).json({ success: true, message: 'Play log recorded.' });

  } catch (error) {
    console.error('API execution error:', error.message);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};
