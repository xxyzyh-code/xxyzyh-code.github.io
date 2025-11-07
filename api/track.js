import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  const { user_id, song_id } = JSON.parse(req.body);

  const { data: existing } = await supabase
    .from('play_logs')
    .select('*')
    .eq('user_id', user_id)
    .eq('song_id', song_id)
    .single();

  if (existing) {
    await supabase
      .from('play_logs')
      .update({ plays: existing.plays + 1, last_played: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('play_logs')
      .insert([{ user_id, song_id, plays: 1, last_played: new Date().toISOString() }]);
  }

  res.status(200).json({ success: true });
}
