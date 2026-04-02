import { supabase } from '../supabaseClient';

export const logActivity = async (username, action) => {
  try {
    const { error } = await supabase
      .from('activity_logs')
      .insert([{ username, action }]);

    if (error) {
      console.error('Failed to write activity log', error);
    }
  } catch (err) {
    console.error('Failed to log activity', err);
  }
};
