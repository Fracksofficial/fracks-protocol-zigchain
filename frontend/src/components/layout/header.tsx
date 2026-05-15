"use client";

import { useState, useEffect, useMemo } from "react";
import { Bell, User, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAssetsContext } from "@/contexts/assets-context";
import { WalletConnectButton } from "@/components/wallet/wallet-connect-button";
import Link from "next/link";

export function Header() {
  const { assets } = useAssetsContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);

  // Filter assets based on search query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    return assets
      .filter(
        (asset) =>
          asset.name.toLowerCase().includes(query) ||
          asset.description.toLowerCase().includes(query) ||
          asset.location.toLowerCase().includes(query) ||
          asset.symbol.toLowerCase().includes(query),
      )
      .slice(0, 5); // Limit to 5 results
  }, [assets, searchQuery]);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowResults(false);
    if (showResults) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showResults]);

  return (
    <header className="w-full h-20 flex flex-row items-center justify-between px-8 mt-5 top-0 rounded-[26px] app-header relative z-10">
      <div className="flex items-center gap-4 shrink-0 flex-1 max-w-md">
        <div className="relative w-full" onClick={(e) => e.stopPropagation()}>
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder=""
            className="pl-10 bg-white/80 rounded-full border border-slate-200/70"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => searchQuery && setShowResults(true)}
          />

          {/* Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-lg z-50 max-h-80 overflow-auto">
              {searchResults.map((asset) => (
                <Link
                  key={asset.id}
                  href={`/assets/${asset.id}`}
                  onClick={() => {
                    setShowResults(false);
                    setSearchQuery("");
                  }}
                  className="block px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{asset.name}</p>
                      <p className="text-xs text-gray-500">
                        {asset.symbol} • {asset.location}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {asset.assetType}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* No Results */}
          {showResults && searchQuery && searchResults.length === 0 && (
            <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 z-50 p-4 text-center">
              <p className="text-sm text-gray-500">No assets found</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-4 shrink-0">
        <button className="p-2 rounded-full hover:bg-white/70 text-[#CBA135] border border-[#CBA135]/25">
          <Bell className="h-5 w-5" />
        </button>

        <Link
          href="/issuers"
          className="p-2 rounded-full hover:bg-white/70 text-[#CBA135] border border-[#CBA135]/25"
          aria-label="Issuer portfolio"
        >
          <User className="h-5 w-5" />
        </Link>

        <WalletConnectButton />
      </div>
    </header>
  );
}
