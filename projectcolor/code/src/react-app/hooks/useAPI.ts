import { useState, useCallback } from "react";

export function useAPI<T>() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async (url: string, options?: RequestInit) => {
    setLoading(true);
    setError(null);
    try {
      const sessionToken = localStorage.getItem("sessionToken");
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(sessionToken ? { "X-Session-Token": sessionToken } : {}),
          ...options?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`Erro: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, request };
}
