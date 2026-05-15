"use client";

import { useAppStore as useAppStoreContext } from "@/contexts/app-store";

export function useAppStore() {
  return useAppStoreContext();
}
