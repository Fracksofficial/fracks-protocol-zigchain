'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { TrexClient } from '@/lib/trex-client';

interface AppState {
  // Wallet state
  address: string | null;
  balance: string;
  trexClient: TrexClient | null;
  isConnected: boolean;
  isConnecting: boolean;
  
  // Token state
  tokenInfo: any | null;
  userBalance: string;
  totalSupply: string;
  
  // UI state
  isLoading: boolean;
}

interface AppContextType extends AppState {
  // Wallet actions
  setWalletState: (address: string | null, client: TrexClient | null, balance: string) => void;
  setIsConnecting: (value: boolean) => void;
  clearWalletState: () => void;
  
  // Token actions
  setTokenData: (info: any, supply: string, balance: string) => void;
  clearTokenData: () => void;
  
  // UI actions
  setLoading: (value: boolean) => void;
  refreshData: () => Promise<void>;
}

const initialState: AppState = {
  address: null,
  balance: '0',
  trexClient: null,
  isConnected: false,
  isConnecting: false,
  tokenInfo: null,
  userBalance: '0',
  totalSupply: '0',
  isLoading: false,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);

  // Wallet actions
  const setWalletState = useCallback((address: string | null, client: TrexClient | null, balance: string) => {
    setState(prev => {
      const nextIsConnected = !!address;
      if (
        prev.address === address &&
        prev.trexClient === client &&
        prev.balance === balance &&
        prev.isConnected === nextIsConnected &&
        prev.isConnecting === false
      ) {
        return prev;
      }

      return {
        ...prev,
        address,
        trexClient: client,
        balance,
        isConnected: nextIsConnected,
        isConnecting: false,
      };
    });
  }, []);

  const setIsConnecting = useCallback((value: boolean) => {
    setState(prev => (prev.isConnecting === value ? prev : { ...prev, isConnecting: value }));
  }, []);

  const clearWalletState = useCallback(() => {
    setState(prev => {
      if (
        prev.address === null &&
        prev.trexClient === null &&
        prev.balance === '0' &&
        prev.isConnected === false &&
        prev.isConnecting === false &&
        prev.tokenInfo === null &&
        prev.userBalance === '0' &&
        prev.totalSupply === '0'
      ) {
        return prev;
      }

      return {
        ...prev,
        address: null,
        trexClient: null,
        balance: '0',
        isConnected: false,
        isConnecting: false,
        // Also clear token data when wallet disconnects
        tokenInfo: null,
        userBalance: '0',
        totalSupply: '0',
      };
    });
  }, []);

  // Token actions
  const setTokenData = useCallback((info: any, supply: string, balance: string) => {
    setState(prev => ({
      ...prev,
      tokenInfo: info,
      totalSupply: supply,
      userBalance: balance,
    }));
  }, []);

  const clearTokenData = useCallback(() => {
    setState(prev => ({
      ...prev,
      tokenInfo: null,
      userBalance: '0',
      totalSupply: '0',
    }));
  }, []);

  // UI actions
  const setLoading = useCallback((value: boolean) => {
    setState(prev => (prev.isLoading === value ? prev : { ...prev, isLoading: value }));
  }, []);

  // Refresh data
  const refreshData = useCallback(async () => {
    if (!state.trexClient || !state.address) return;

    setLoading(true);
    try {
      const info = await state.trexClient.getTokenInfo();
      const tokenBalance = await state.trexClient.getBalance(state.address); // RWASEC tokens
      const nativeBalance = await state.trexClient.getNativeBalance(state.address); // Native ZIG for gas
      
      setTokenData(info, info.total_supply || '0', tokenBalance || '0');
      setState(prev => {
        const nextBalance = nativeBalance || '0';
        return prev.balance === nextBalance ? prev : { ...prev, balance: nextBalance };
      }); // Store native ZIG balance
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setLoading(false);
    }
  }, [state.trexClient, state.address, setLoading, setTokenData]);

  const contextValue: AppContextType = {
    ...state,
    setWalletState,
    setIsConnecting,
    clearWalletState,
    setTokenData,
    clearTokenData,
    setLoading,
    refreshData,
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
