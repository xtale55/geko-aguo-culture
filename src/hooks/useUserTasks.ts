import { useSupabaseQuery } from './useSupabaseQuery';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface UserTask {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export function useUserTasks(farmId?: string) {
  const { user } = useAuth();
  
  return useSupabaseQuery(
    ['user-tasks', farmId],
    async () => {
      const result = await supabase
        .from('user_tasks')
        .select('*')
        .eq('farm_id', farmId!)
        .eq('user_id', user?.id!)
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });
      
      return result;
    },
    { enabled: !!farmId && !!user?.id }
  );
}

export async function createTask(task: Omit<UserTask, 'id' | 'created_at' | 'updated_at'> & { farm_id: string; user_id: string }) {
  const { data, error } = await supabase
    .from('user_tasks')
    .insert(task)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateTask(id: string, updates: Partial<Omit<UserTask, 'id' | 'created_at' | 'updated_at'>>) {
  const { data, error } = await supabase
    .from('user_tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteTask(id: string) {
  const { error } = await supabase
    .from('user_tasks')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}