"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/contexts/app-context";
import { usePermissionsContext } from "@/contexts/permissions-context";

const menuItems = [
  {
    category: "",
    items: [
      { name: "Market Overview", href: "/" },
      { name: "Explore Assets", href: "/assets" },
      { name: "KYC Status", href: "/identity" },
      { name: "Investor Dashboard", href: "/investor" },
      { name: "Identity Management", href: "/admin/identities" },
      { name: "KYC Provider", href: "/kyc-provider" },
      { name: "Token Admin", href: "/token-admin" },
      { name: "Personnel", href: "/personnel" },
      { name: "Compliance", href: "/compliance" },
      { name: "Issuance", href: "/issuance" },
      { name: "Activity Logs", href: "/activity-logs" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { address } = useAppContext();
  const {
    canSeeAdminIdentities,
    canSeeCompliance,
    canSeeIssuance,
    canSeeKycProvider,
    canSeeAdminTab,
    canSeeActivityLogs,
  } = usePermissionsContext();

  const visibleItems = menuItems.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (item.href === "/admin/identities") return canSeeAdminIdentities;
      if (item.href === "/kyc-provider") return canSeeKycProvider;
      if (item.href === "/token-admin") return canSeeAdminTab;
      if (item.href === "/personnel") return canSeeActivityLogs;
      if (item.href === "/compliance") return canSeeCompliance;
      if (item.href === "/issuance") return canSeeIssuance;
      if (item.href === "/activity-logs") return canSeeActivityLogs;
      if (item.href === "/investor") return !!address;
      return true;
    }),
  }));

  return (
    <aside className="w-70 h-[calc(100vh-40px)] m-5 flex flex-col app-sidebar rounded-[26px] overflow-hidden shrink-0 fixed left-0 top-0 border-r-2 border-[#CBA135]/60">
      {/* Logo Section */}
      <div className="p-8 pt-6 pb-6">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/zamanat_logo.svg"
            alt="Zamanat"
            width={140}
            height={40}
            className="h-10 w-auto"
            style={{ width: "auto" }}
            priority
          />
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-4 py-3 space-y-5">
        {visibleItems.map((section) => (
          <div key={section.category}>
            {section.category && (
              <h3 className="px-4 mb-2 text-sm font-medium text-muted-foreground/70">
                {section.category}
              </h3>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const href =
                  item.href === "/investor" && address
                    ? `/investor/${address}`
                    : item.href;
                const isActive =
                  item.href === "/investor"
                    ? pathname.startsWith("/investor")
                    : pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors relative group",
                      isActive
                        ? "text-slate-900 font-semibold"
                        : "text-muted-foreground hover:text-slate-900 hover:bg-white/50",
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 h-5 w-1 bg-[#CBA135] rounded-r-full" />
                    )}
                    <span
                      className={cn(
                        isActive ? "translate-x-2" : "",
                        "transition-transform",
                      )}
                    >
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom CTA Card */}
      <div className="p-4 mt-auto">
        <div className="rounded-2xl p-5 text-white relative overflow-hidden">
          {/* Background Image */}
          <Image
            src="/footer-cta-bgimage.png"
            alt="CTA Background"
            fill
            sizes="(max-width: 1024px) 0px, 280px"
            className="object-cover rounded-2xl"
            priority
            loading="eager"
          />

          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#1E40AF]/60 to-[#172554]/60 rounded-2xl" />

          <h3 className="relative z-10 text-xl font-semibold leading-tight mb-4">
            Own <br />
            Real Assets <br />
            On-Chain.
          </h3>

          <Button className="relative z-10 w-full bg-[#CBA135] hover:bg-[#b58e2a] text-white border-0 font-medium">
            Explore Now
          </Button>
        </div>
      </div>
    </aside>
  );
}
