import { useCallback, useEffect, useState } from 'react';

export function useSupabaseQuery(queryFn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    queryFn().then(({ data, error }) => {
      if (cancelled) return;
      setState({ data: data ?? null, error: error ?? null, loading: false });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  const refetch = useCallback(() => setVersion((v) => v + 1), []);

  return { ...state, refetch };
}
