import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteNavbar } from "@/components/marketing/site-navbar";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing-theme blueprint-sheet min-h-screen">
      <SiteNavbar />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
