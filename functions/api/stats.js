// functions/api/stats.js - Cloudflare Pages Function (GET)

import { createClient } from '@supabase/supabase-js'; 

export const onRequestGet = async (context) => {
    
    // 1. 從 context.env 獲取環境變數 (Secrets)
    const SUPABASE_URL = context.env.SUPABASE_URL; 
    const SUPABASE_ANON_KEY = context.env.SUPABASE_ANON_KEY; 
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    try {
        // ⭐️ 調用 Supabase 數據庫中的 RPC 函數進行聚合
        const { data, error } = await supabase.rpc('get_global_play_counts');

        if (error) {
            console.error('Error fetching global stats (RPC):', error);
            
            return new Response(JSON.stringify({ 
                error: 'Error fetching global stats (RPC)',
                details: error.message 
            }), { 
                status: 500, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        // 整理數據格式為 { "s0": 150, "s1": 80, ... }
        const globalPlayCounts = data.reduce((acc, current) => {
            acc[current.song_id] = current.total_plays; 
            return acc;
        }, {});
        
        // 2. 返回 JSON 格式的排行榜數據
        return new Response(JSON.stringify(globalPlayCounts), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                // ⚠️ 確保 Cloudflare 預設不阻止 CORS
                'Access-Control-Allow-Origin': '*', 
            },
        });
        
    } catch (e) {
        console.error('API execution error:', e.message);
        // 捕獲所有意外錯誤
        return new Response(JSON.stringify({ success: false, error: 'Internal Server Error' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
};
