import { QueryClient, QueryFunction, UseQueryOptions, QueryKey } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    try {
      const json = await res.json();
      errorMessage = json.error || json.message || errorMessage;
    } catch {
      const text = await res.text();
      errorMessage = text || errorMessage;
    }
    throw new Error(errorMessage);
  }
}

/**
 * Type-safe JSON fetch utility with automatic credentials and error handling
 * @param url - API endpoint URL
 * @param init - Additional fetch options
 * @returns Parsed JSON response
 */
export async function fetchJson<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    credentials: "include",
  });
  await throwIfResNotOk(res);
  return res.json();
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// SECURITY: Removed global default queryFn to prevent unauthorized pre-auth requests
// Each useQuery MUST explicitly use createSecuredQuery helper with proper guards
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // queryFn: getQueryFn({ on401: "throw" }), // REMOVED for security
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 0, // Changed from Infinity to 0 to ensure fresh data on mount
      refetchOnMount: "always", // Always refetch when component mounts to ensure data consistency
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// REMOVED: createSecuredQuery - Use fetchJson directly with explicit queryFn for clarity and security
