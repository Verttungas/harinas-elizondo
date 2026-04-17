import { useCallback, useEffect, useState } from "react";
import { handleApiError } from "@/lib/api";

interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useQuery<T>(
  fetcher: () => Promise<T>,
  deps: ReadonlyArray<unknown> = [],
): QueryState<T> & { refetch: () => Promise<void> } {
  const [state, setState] = useState<QueryState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const run = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetcher();
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, error: handleApiError(err) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void run();
  }, [run]);

  return { ...state, refetch: run };
}

interface MutationState {
  loading: boolean;
  error: string | null;
}

export function useMutation<TInput, TResult>(
  mutator: (input: TInput) => Promise<TResult>,
): MutationState & { mutate: (input: TInput) => Promise<TResult> } {
  const [state, setState] = useState<MutationState>({
    loading: false,
    error: null,
  });

  const mutate = useCallback(
    async (input: TInput) => {
      setState({ loading: true, error: null });
      try {
        const result = await mutator(input);
        setState({ loading: false, error: null });
        return result;
      } catch (err) {
        const message = handleApiError(err);
        setState({ loading: false, error: message });
        throw err;
      }
    },
    [mutator],
  );

  return { ...state, mutate };
}
