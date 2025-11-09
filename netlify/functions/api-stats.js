// netlify/functions/api-stats.js
// 目的：處理 /.netlify/functions/api-stats 的請求
const { createClient } = require('@supabase/supabase-js');

// 💡 注意：Netlify Functions 使用 Node.js process.env 
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
// ⚠️ 建議：將 SUPABASE_KEY 改為 SUPABASE_ANON_KEY 以明確其用途，並在 Netlify UI 中設定。

exports.handler = async function(event, context) {
  
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' }),
      headers: { 'Allow': 'GET', 'Content-Type': 'application/json' }
    };
  }
  
  try {
    const { data, error } = await supabase.rpc('get_global_play_counts');

    if (error) {
      console.error('Error fetching global stats (RPC):', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Error fetching global stats (RPC)',
          details: error.message 
        }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    const globalPlayCounts = data.reduce((acc, current) => {
        acc[current.song_id] = current.total_plays; 
        return acc;
    }, {});
    
    // Netlify Function 必須返回一個物件，其中 body 是字符串
    return {
      statusCode: 200,
      body: JSON.stringify(globalPlayCounts),
      headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*', 
      }
    };
    
  } catch (e) {
      console.error('API execution error:', e.message);
      return {
        statusCode: 500,
        body: JSON.stringify({ success: false, error: 'Internal Server Error' }),
        headers: { 'Content-Type': 'application/json' }
      };
  }
}
