export function formatTokenAmount(amount: string, decimals: number = 6): string {
  try {
    const num = parseFloat(amount) / Math.pow(10, decimals);
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals,
    });
  } catch {
    return "0.00";
  }
}

export function parseTokenAmount(amount: string, decimals: number = 6): string {
  try {
    const num = parseFloat(amount);
    if (isNaN(num)) return "0";
    return Math.floor(num * Math.pow(10, decimals)).toString();
  } catch {
    return "0";
  }
}
