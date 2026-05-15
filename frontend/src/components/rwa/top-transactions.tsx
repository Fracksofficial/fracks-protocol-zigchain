"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownLeft, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Transaction {
  hash: string;
  type: "transfer" | "mint" | "burn";
  from: string;
  to: string;
  amount: string;
  timestamp: Date;
  asset: string;
}

interface TopTransactionsProps {
  limit?: number;
}

export function TopTransactions({ limit = 5 }: TopTransactionsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching transactions
    // In production, this would fetch from the blockchain via LCD endpoint
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        // TODO: Replace with actual API call to fetch transactions
        // Example: GET /cosmos/tx/v1beta1/txs?events=wasm.action='transfer'

        // Simulating empty response for now
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setTransactions([]);
      } catch (error) {
        console.error("Failed to fetch transactions:", error);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="p-3 rounded-full bg-gray-100 mb-3">
          <Clock className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          No Transactions Yet
        </h3>
        <p className="text-sm text-gray-500">
          Transactions will appear here once activity begins
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.slice(0, limit).map((tx, index) => (
        <motion.div
          key={tx.hash}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className={`p-2 rounded-lg ${
                tx.type === "transfer"
                  ? "bg-blue-50"
                  : tx.type === "mint"
                  ? "bg-green-50"
                  : "bg-red-50"
              }`}
            >
              {tx.type === "transfer" ? (
                <ArrowUpRight className="h-4 w-4 text-blue-600" />
              ) : tx.type === "mint" ? (
                <ArrowUpRight className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowDownLeft className="h-4 w-4 text-red-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate">
                  {tx.type === "transfer"
                    ? "Transfer"
                    : tx.type === "mint"
                    ? "Mint"
                    : "Burn"}
                </p>
                <span className="text-xs text-gray-500">{tx.asset}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="truncate">
                  {tx.from.slice(0, 8)}...{tx.from.slice(-6)}
                </span>
                {tx.type === "transfer" && (
                  <>
                    <span>→</span>
                    <span className="truncate">
                      {tx.to.slice(0, 8)}...{tx.to.slice(-6)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold text-sm">{tx.amount}</p>
            <p className="text-xs text-gray-500">
              {formatDistanceToNow(tx.timestamp, { addSuffix: true })}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
