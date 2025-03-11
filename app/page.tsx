"use client";

import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ScatterChart, Scatter, ZAxis, Rectangle
} from 'recharts';
import { Activity, Users, TrendingUp, Globe, Search, SlidersHorizontal, Wallet, LineChart as ChartIcon } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMarketData, useGlobalData, useDeFiData, useHistoricalData, calculateSMA, calculateCorrelation } from "@/lib/api";
import { Header } from '@/components/header';
import { LucideIcon } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend: number;
  animate?: boolean;
}

const StatCard = ({ title, value, icon: Icon, trend, animate = true }: StatCardProps) => (
  <motion.div
    initial={animate ? { opacity: 0, y: 20 } : false}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <Card className="p-6 space-y-2 hover:shadow-lg transition-shadow duration-300">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <motion.div 
          whileHover={{ scale: 1.1 }}
          className={`p-3 rounded-full ${trend > 0 ? 'bg-green-100' : 'bg-red-100'}`}
        >
          <Icon className={trend > 0 ? 'text-green-600' : 'text-red-600'} size={20} />
        </motion.div>
      </div>
      <div className="flex items-center space-x-2">
        <motion.span 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={trend > 0 ? 'text-green-600' : 'text-red-600'}
        >
          {trend > 0 ? '+' : ''}{trend}%
        </motion.span>
        <span className="text-muted-foreground">vs last week</span>
      </div>
    </Card>
  </motion.div>
);

interface Protocol {
  name: string;
  chain: string;
  tvl: number;
  change_1d: number;
}

interface DeFiProtocolCardProps {
  protocol: Protocol;
}

const DeFiProtocolCard = ({ protocol }: DeFiProtocolCardProps) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3 }}
  >
    <Card className="p-4 hover:shadow-lg transition-shadow duration-300">
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <h3 className="font-semibold">{protocol.name}</h3>
          <p className="text-sm text-muted-foreground">{protocol.chain}</p>
        </div>
        <div className="text-right">
          <p className="font-bold">${protocol.tvl.toLocaleString()}</p>
          <p className={`text-sm ${protocol.change_1d > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {protocol.change_1d > 0 ? '+' : ''}{protocol.change_1d.toFixed(2)}%
          </p>
        </div>
      </div>
    </Card>
  </motion.div>
);

interface CustomShapeProps {
  cx?: number;
  cy?: number;
  width?: number;
  height?: number;
  payload?: any;
  value?: number;
}

const CustomHeatmapCell = (props: any) => {
  const { cx, cy, width, height, payload } = props;
  const value = payload?.value;

  if (typeof cx !== 'number' || typeof cy !== 'number' || 
      typeof width !== 'number' || typeof height !== 'number' || 
      typeof value !== 'number') {
    return null;
  }

  // Enhanced color scale for better visualization
  const getColor = (value: number) => {
    if (value >= 0.7) return 'rgba(0, 200, 0, 0.8)';  // Strong positive - dark green
    if (value >= 0.3) return 'rgba(144, 238, 144, 0.8)';  // Moderate positive - light green
    if (value >= -0.3) return 'rgba(255, 255, 255, 0.8)';  // Weak correlation - white
    if (value >= -0.7) return 'rgba(255, 182, 193, 0.8)';  // Moderate negative - light red
    return 'rgba(255, 0, 0, 0.8)';  // Strong negative - dark red
  };
  
  return (
    <Rectangle
      x={cx - width / 2}
      y={cy - height / 2}
      width={width}
      height={height}
      fill={getColor(value)}
      stroke="#ddd"
      strokeWidth={1}
    />
  );
};

interface PriceDataPoint {
  timestamp: number;
  price: number;
  sma20: number | null;
  sma50: number | null;
  predicted: number | null;
}

interface CorrelationDataPoint {
  x: number;
  y: number;
  coin1: string;
  coin2: string;
  value: number;
}

interface MarketData {
  id: string;
  name: string;
  symbol: string;
  sparkline_in_7d?: {
    price: number[];
  };
}

interface HistoricalData {
  prices: [number, number][];
}

export default function Dashboard() {
  const { data: marketData, isLoading: marketLoading } = useMarketData();
  const { data: globalData, isLoading: globalLoading } = useGlobalData();
  const { data: defiData, isLoading: defiLoading } = useDeFiData();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [timeRange, setTimeRange] = useState("24h");
  const [selectedCoin, setSelectedCoin] = useState("bitcoin");
  const [predictionDays, setPredictionDays] = useState(7);
  const [filteredData, setFilteredData] = useState<MarketData[]>([]);
  
  const { data: historicalData } = useHistoricalData(selectedCoin, timeRange === "24h" ? 1 : timeRange === "7d" ? 7 : 30);

  const predictivePrices = useMemo(() => {
    if (!historicalData?.prices) return [];
    const prices = historicalData.prices.map(([_, price]: [number, number]) => price);
    const sma20 = calculateSMA(prices, 20);
    const sma50 = calculateSMA(prices, 50);
    
    const lastPrice = prices[prices.length - 1];
    const lastSMA20 = sma20[sma20.length - 1] || lastPrice;
    const lastSMA50 = sma50[sma50.length - 1] || lastPrice;
    
    const predictions = Array.from({ length: predictionDays }).map((_, i) => {
      const timestamp = historicalData.prices[historicalData.prices.length - 1][0] + (i + 1) * 86400000;
      const trend = lastSMA20 > lastSMA50 ? 1.002 : 0.998;
      const predictedPrice = lastPrice * Math.pow(trend, i + 1);
      return {
        timestamp,
        predicted: predictedPrice,
      };
    });

    return [
      ...prices.map((price: number, i: number) => ({
        timestamp: historicalData.prices[i][0],
        price,
        sma20: sma20[i] || null,
        sma50: sma50[i] || null,
        predicted: null
      })),
      ...predictions
    ] as PriceDataPoint[];
  }, [historicalData, predictionDays]);

  const correlationData = useMemo(() => {
    if (!marketData) return [];
    const coins = (marketData as MarketData[]).slice(0, 5);
    const correlations: CorrelationDataPoint[] = [];
    
    coins.forEach((coin1: MarketData, i: number) => {
      coins.forEach((coin2: MarketData, j: number) => {
        const correlation = calculateCorrelation(
          coin1.sparkline_in_7d?.price || [],
          coin2.sparkline_in_7d?.price || []
        );
        
        if (!isNaN(correlation)) {
          correlations.push({
            x: i,
            y: j,
            coin1: coin1.symbol.toUpperCase(),
            coin2: coin2.symbol.toUpperCase(),
            value: correlation
          });
        }
      });
    });
    
    return correlations;
  }, [marketData]);

  useEffect(() => {
    if (marketData) {
      setFilteredData(
        (marketData as MarketData[]).filter(coin => 
          coin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          coin.symbol.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
  }, [marketData, searchTerm]);

  const marketStats = globalData?.data?.total_market_cap?.usd 
    ? {
        totalMarketCap: new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          notation: 'compact',
          maximumFractionDigits: 1
        }).format(globalData.data.total_market_cap.usd),
        markets: globalData.data.markets,
        dominance: globalData.data.market_cap_percentage?.btc?.toFixed(1) + '%',
        change24h: globalData.data.market_cap_change_percentage_24h_usd?.toFixed(1)
      }
    : null;

  const topDefiProtocols = defiData
    ?.slice(0, 5)
    .sort((a: Protocol, b: Protocol) => b.tvl - a.tvl);

  return (
    <>
      <Header 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />
      <main className="min-h-screen bg-background p-8">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-7xl mx-auto space-y-8"
        >
          <AnimatePresence>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard 
                title="Total Market Cap" 
                value={marketStats?.totalMarketCap || '$0'} 
                icon={Globe} 
                trend={parseFloat(marketStats?.change24h || '0')} 
              />
              <StatCard 
                title="Active Markets" 
                value={marketStats?.markets || '0'} 
                icon={Activity} 
                trend={2.3} 
              />
              <StatCard 
                title="BTC Dominance" 
                value={marketStats?.dominance || '0%'} 
                icon={TrendingUp} 
                trend={-1.2} 
              />
              <StatCard 
                title="Total DeFi TVL" 
                value="$48.5B" 
                icon={Wallet} 
                trend={3.8} 
              />
            </div>
          </AnimatePresence>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="col-span-2 p-6">
              <Tabs defaultValue="price" className="space-y-4">
                <div className="flex items-center justify-between">
                  <TabsList>
                    <TabsTrigger value="price">Predictive Analysis</TabsTrigger>
                    <TabsTrigger value="correlation">Correlation Matrix</TabsTrigger>
                    <TabsTrigger value="heatmap">Market Heatmap</TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="price" className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Select value={selectedCoin} onValueChange={setSelectedCoin}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select Coin" />
                      </SelectTrigger>
                      <SelectContent>
                        {marketData?.map((coin: MarketData) => (
                          <SelectItem key={coin.id} value={coin.id}>
                            {coin.name} ({coin.symbol.toUpperCase()})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={predictionDays.toString()} onValueChange={(value) => setPredictionDays(parseInt(value))}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Prediction Days" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 Days</SelectItem>
                        <SelectItem value="7">7 Days</SelectItem>
                        <SelectItem value="14">14 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={predictivePrices}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="timestamp"
                          tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
                        />
                        <YAxis />
                        <Tooltip
                          labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                          formatter={(value: number, name) => {
                            if (name === "predicted") return [`$${value.toFixed(2)} (Predicted)`, "Price"];
                            return [`$${value.toFixed(2)}`, name === "price" ? "Actual" : name];
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="price" 
                          stroke="hsl(var(--primary))" 
                          dot={false}
                          name="Actual Price"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="sma20" 
                          stroke="#00C49F" 
                          dot={false}
                          strokeDasharray="5 5"
                          name="20-Day SMA"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="sma50" 
                          stroke="#FF8042" 
                          dot={false}
                          strokeDasharray="3 3"
                          name="50-Day SMA"
                        />
                        <Line
                          type="monotone"
                          dataKey="predicted"
                          stroke="#8884d8"
                          strokeDasharray="3 3"
                          name="Predicted Price"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>

                <TabsContent value="correlation" className="h-[400px]">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <span className="font-medium">Correlation Strength:</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="w-3 h-3 bg-red-500 rounded-sm" /> Strong Negative
                          <span className="w-3 h-3 bg-pink-200 rounded-sm" /> Weak Negative
                          <span className="w-3 h-3 bg-white border rounded-sm" /> No Correlation
                          <span className="w-3 h-3 bg-green-200 rounded-sm" /> Weak Positive
                          <span className="w-3 h-3 bg-green-600 rounded-sm" /> Strong Positive
                        </div>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={350}>
                      <ScatterChart
                        margin={{ top: 20, right: 20, bottom: 60, left: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          type="number"
                          dataKey="x"
                          domain={[0, 4]}
                          tickCount={5}
                          tickFormatter={(value) => {
                            const coin = correlationData.find(d => d.x === value);
                            return coin ? coin.coin1 : '';
                          }}
                          angle={-45}
                          textAnchor="end"
                          interval={0}
                        />
                        <YAxis
                          type="number"
                          dataKey="y"
                          domain={[0, 4]}
                          tickCount={5}
                          tickFormatter={(value) => {
                            const coin = correlationData.find(d => d.y === value);
                            return coin ? coin.coin2 : '';
                          }}
                        />
                        <Tooltip
                          content={({ payload }) => {
                            if (!payload?.[0]?.payload) return null;
                            const { coin1, coin2, value } = payload[0].payload;
                            let strength = "No";
                            if (value >= 0.7) strength = "Strong Positive";
                            else if (value >= 0.3) strength = "Moderate Positive";
                            else if (value <= -0.7) strength = "Strong Negative";
                            else if (value <= -0.3) strength = "Moderate Negative";
                            else strength = "Weak";

                            return (
                              <div className="bg-background p-3 rounded-lg shadow-lg border">
                                <p className="font-medium text-base mb-1">{`${coin1} vs ${coin2}`}</p>
                                <p className="text-sm text-muted-foreground">Correlation: {value.toFixed(3)}</p>
                                <p className="text-sm font-medium mt-1" style={{
                                  color: value > 0 ? 'rgb(22 163 74)' : value < 0 ? 'rgb(220 38 38)' : 'currentColor'
                                }}>
                                  {strength} Correlation
                                </p>
                              </div>
                            );
                          }}
                        />
                        <Scatter
                          data={correlationData}
                          shape={CustomHeatmapCell}
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>

                <TabsContent value="heatmap" className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        type="number"
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
                      />
                      <YAxis 
                        dataKey="price"
                        domain={['dataMin', 'dataMax']}
                      />
                      <Tooltip
                        labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
                        formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
                      />
                      <Scatter
                        data={historicalData?.prices?.map(([timestamp, price]: [number, number]) => ({
                          timestamp,
                          price,
                        }))}
                        fill="hsl(var(--primary))"
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </TabsContent>
              </Tabs>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Top DeFi Protocols</h2>
              <div className="space-y-4">
                {topDefiProtocols?.map((protocol: Protocol) => (
                  <DeFiProtocolCard key={protocol.name} protocol={protocol} />
                ))}
              </div>
            </Card>
          </div>
        </motion.div>
      </main>
    </>
  );
}