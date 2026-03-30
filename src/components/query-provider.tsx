"use client";

import {
  QueryClient,
  QueryClientProvider,
  type QueryClientProviderProps,
} from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({
  children,
}: Pick<QueryClientProviderProps, "children">) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
