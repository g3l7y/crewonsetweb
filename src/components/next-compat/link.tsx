import { Link as RouterLink } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, ReactNode } from "react";

type NextLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  prefetch?: boolean | null;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  passHref?: boolean;
  children?: ReactNode;
};

function isExternal(href: string) {
  return /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(href) || href.startsWith("#");
}

/**
 * Drop-in replacement for `next/link` used during the TanStack Start migration.
 * Internal links route through TanStack Router; external links stay plain anchors.
 */
export default function Link({
  href,
  prefetch: _prefetch,
  replace,
  scroll: _scroll,
  shallow: _shallow,
  passHref: _passHref,
  children,
  ...rest
}: NextLinkProps) {
  if (isExternal(href)) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <RouterLink
      to={href as never}
      {...(replace !== undefined && { replace })}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {...(rest as any)}
    >
      {children}
    </RouterLink>
  );
}
