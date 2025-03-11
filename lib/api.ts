import useSWR from 'swr';

const API_URL = 'https://api.coingecko.com/api/v3';
const DEFI_LLAMA_API = 'https://api.llama.fi';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useMarketData() {
  const { data, error, isLoading } = useSWR(
    `${API_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&sparkline=true&price_change_percentage=1h,24h,7d,30d`,
    fetcher,
    { refreshInterval: 30000 }
  );

  return {
    data,
    isLoading,
    isError: error
  };
}

export function useGlobalData() {
  const { data, error, isLoading } = useSWR(
    `${API_URL}/global`,
    fetcher,
    { refreshInterval: 60000 }
  );

  return {
    data,
    isLoading,
    isError: error
  };
}

export function useHistoricalData(coinId: string, days: number) {
  const { data, error, isLoading } = useSWR(
    coinId ? `${API_URL}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}` : null,
    fetcher,
    { refreshInterval: 300000 }
  );

  return {
    data,
    isLoading,
    isError: error
  };
}

export function useDeFiData() {
  const { data, error, isLoading } = useSWR(
    `${DEFI_LLAMA_API}/protocols`,
    fetcher,
    { refreshInterval: 300000 }
  );

  return {
    data,
    isLoading,
    isError: error
  };
}

// Simple moving average calculation
export function calculateSMA(data: number[], period: number): number[] {
  const sma = [];
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const average = slice.reduce((a, b) => a + b, 0) / period;
    sma.push(average);
  }
  return sma;
}

// Calculate correlation between two arrays
export function calculateCorrelation(array1: number[], array2: number[]): number {
  if (!array1?.length || !array2?.length) return 0;
  
  const n = Math.min(array1.length, array2.length);
  if (n < 2) return 0;

  const mean1 = array1.reduce((a, b) => a + b, 0) / n;
  const mean2 = array2.reduce((a, b) => a + b, 0) / n;
  
  let variance1 = 0;
  let variance2 = 0;
  let covariance = 0;
  
  for (let i = 0; i < n; i++) {
    const diff1 = array1[i] - mean1;
    const diff2 = array2[i] - mean2;
    variance1 += diff1 * diff1;
    variance2 += diff2 * diff2;
    covariance += diff1 * diff2;
  }
  
  variance1 /= n;
  variance2 /= n;
  covariance /= n;
  
  if (variance1 === 0 || variance2 === 0) return 0;
  
  return covariance / Math.sqrt(variance1 * variance2);
}