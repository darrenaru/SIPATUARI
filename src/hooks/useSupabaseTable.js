import { useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useSupabaseQuery } from './useSupabaseQuery';

// eq: plain object of { column: value } applied as .eq() filters
export function useSupabaseTable(table, { select = '*', order, eq } = {}) {
  const eqKey = eq ? JSON.stringify(eq) : '';

  const queryFn = useCallback(async () => {
    let query = supabase.from(table).select(select);
    if (eq) {
      for (const [column, value] of Object.entries(eq)) {
        query = query.eq(column, value);
      }
    }
    if (order) query = query.order(order.column, { ascending: order.ascending !== false });
    return query;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, select, order?.column, order?.ascending, eqKey]);

  const { data, loading, error, refetch } = useSupabaseQuery(queryFn, [queryFn]);

  const insert = useCallback(async (payload) => {
    const result = await supabase.from(table).insert(payload).select();
    if (!result.error) refetch();
    return result;
  }, [table, refetch]);

  const update = useCallback(async (id, payload) => {
    const result = await supabase.from(table).update(payload).eq('id', id).select();
    if (!result.error) refetch();
    return result;
  }, [table, refetch]);

  const upsert = useCallback(async (payload, options) => {
    const result = await supabase.from(table).upsert(payload, options).select();
    if (!result.error) refetch();
    return result;
  }, [table, refetch]);

  const remove = useCallback(async (id) => {
    const result = await supabase.from(table).delete().eq('id', id);
    if (!result.error) refetch();
    return result;
  }, [table, refetch]);

  return { rows: data || [], loading, error, refetch, insert, update, upsert, remove };
}
