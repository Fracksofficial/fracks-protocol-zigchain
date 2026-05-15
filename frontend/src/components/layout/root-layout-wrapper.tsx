"use client";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/siderbar"; // Fixed typo in filename if it exists, otherwise use existing
import { Toaster } from "sonner";
import { TourProvider, useTour } from "@/contexts/tour-context";
import { SecretWalletModal } from "@/components/layout/secret-wallet-modal";

interface RootLayoutWrapperProps {
  children: React.ReactNode;
}

function LayoutContent({ children }: RootLayoutWrapperProps) {
  const { startTour } = useTour();

  return (
    <div className="min-h-screen w-full app-shell">
      <Sidebar />
      <div className="ml-[310px] mr-[20px] flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 mt-4">
          <div className="w-full">{children}</div>
        </main>
      </div>
      <SecretWalletModal />
      <Toaster
        position="top-right"
        theme="light"
        richColors={false}
        closeButton
        toastOptions={{
          className: "rounded-2xl border border-slate-200/70 bg-white text-slate-900 shadow-lg",
          descriptionClassName: "text-xs text-slate-500",
        }}
      />
    </div>
  );
}

export function RootLayoutWrapper({ children }: RootLayoutWrapperProps) {
  return (
    <TourProvider>
      <LayoutContent>{children}</LayoutContent>
    </TourProvider>
  );
}
