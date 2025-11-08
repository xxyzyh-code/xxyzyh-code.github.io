// api/track.js - 修正版本：使用 returning: 'minimal'
const { createClient } = require('@supabase/supabase-js');

// 繼續使用 SUPABASE_KEY，但您必須確保 Vercel 環境變數中存在此密鑰
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

module.exports = async (req, res) => {
  
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { user_id, song_id, title } = body; 

    if (!user_id || !song_id || !title) {
        return res.status(400).json({ error: 'Missing required fields: user_id, song_id, or title.' });
    }

    // 1. 查詢現有記錄
    const { data: existing, error: selectError } = await supabase
      .from('play_logs')
      .select('id, plays') 
      .eq('user_id', user_id)
      .eq('song_id', song_id)
      .maybeSingle(); 

    if (selectError && selectError.code !== 'PGRST116') {
        console.error('Supabase select error:', selectError);
        return res.status(500).json({ error: 'Database read error' });
    }

    if (existing) {
      // 2. 找到記錄，更新播放次數
      const { error: updateError } = await supabase
        .from('play_logs')
        .update({ plays: existing.plays + 1, last_played: new Date().toISOString() })
        .eq('id', existing.id)
        // 核心修正 A: 使用 returning: 'minimal' 避免 400 錯誤
        .maybeSingle({ returning: 'minimal' }); 

      if (updateError) {
        // 🚨 Vercel 的 500 錯誤很可能源於此處
        console.error('Supabase update error:', updateError);
        return res.status(500).json({ error: 'Database update error' });
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
        }], 
        { 
            // 核心修正 B: 使用 returning: 'minimal' 避免 400 錯誤
            returning: 'minimal' 
        });

      if (insertError) {
        // 🚨 Vercel 的 500 錯誤很可能源於此處
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
