import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import "./globals.css";
import "@interchain-ui/react/styles";
import { ThemeProvider } from "@/lib/theme-provider";
import { AppStoreProvider } from "@/contexts/app-store";
import { CosmosKitProvider } from "@/contexts/cosmos-kit-provider";
import { RootLayoutWrapper } from "@/components/layout/root-layout-wrapper";

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "RWA Platform | Tokenized Real World Assets",
  description:
    "TRex-compatible RWA platform on Cosmos with CosmWasm smart contracts",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${publicSans.className} ${publicSans.variable} overflow-x-hidden`}
      >
        <ThemeProvider>
          <CosmosKitProvider>
            <AppStoreProvider>
              <RootLayoutWrapper>{children}</RootLayoutWrapper>
            </AppStoreProvider>
          </CosmosKitProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
