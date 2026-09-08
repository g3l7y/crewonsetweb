import { redirect as routerRedirect, useRouter as useTanStackRouter, useRouterState } from "@tanstack/react-router";
import { useMemo } from "react";

/** Drop-in replacement for `next/navigation` used during the TanStack Start migration. */
export function usePathname() {
  return useRouterState({ select: (state) => state.location.pathname });
}

export function useSearchParams() {
  const search = useRouterState({ select: (state) => state.location.searchStr });
  return useMemo(() => new URLSearchParams(search), [search]);
}

export function useRouter() {
  const router = useTanStackRouter();

  return useMemo(
    () => ({
      push: (href: string) => {
        if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(href)) {
          window.location.assign(href);
          return;
        }
        void router.navigate({ href });
      },
      replace: (href: string) => {
        void router.navigate({ href, replace: true });
      },
      refresh: () => {
        void router.invalidate();
      },
      back: () => router.history.back(),
      forward: () => router.history.forward(),
      prefetch: () => {},
    }),
    [router],
  );
}

export function redirect(href: string): never {
  throw routerRedirect({ href, throw: true });
}
