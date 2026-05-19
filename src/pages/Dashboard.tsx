import React, { useState, useEffect } from 'react';
import { useFinanceData } from '../hooks/useFinanceData';
import { useAuth } from '../components/AuthProvider';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet, 
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format, startOfMonth, subMonths } from 'date-fns';

const StatCard = ({ title, amount, icon: Icon, trend, color }: any) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="bg-[#141414] border border-[#1F1F1F] p-6 rounded-2xl space-y-4"
  >
    <div className="flex justify-between items-start">
      <div className={color}>
        <div className="p-2 rounded-xl bg-opacity-10 bg-current">
          <Icon size={24} />
        </div>
      </div>
      {trend && (
        <span className={trend > 0 ? "text-green-500 text-xs" : "text-red-500 text-xs"}>
          {trend > 0 ? "+" : ""}{trend}%
        </span>
      )}
    </div>
    <div>
      <p className="text-gray-400 text-sm font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-white mt-1">{amount}</h3>
    </div>
  </motion.div>
);

export const Dashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { transactions, budgets, goals, wallets, loading } = useFinanceData();
  const [aiInsights, setAiInsights] = useState<any[]>([]);
  const [insightLoading, setInsightLoading] = useState(false);

  const currency = profile?.currency || 'Rs';

  // Calculate stats
  const currentMonth = format(new Date(), 'yyyy-MM');
  const monthlyIncome = transactions
    .filter((tx: any) => tx.type === 'income' && tx.date.startsWith(currentMonth))
    .reduce((acc: number, tx: any) => acc + tx.amount, 0);
  
  const monthlyExpenses = transactions
    .filter((tx: any) => tx.type === 'expense' && tx.date.startsWith(currentMonth))
    .reduce((acc: number, tx: any) => acc + tx.amount, 0);

  const totalBalance = wallets.reduce((acc: number, w: any) => acc + w.balance, 0);
  const totalSavings = goals.reduce((acc: number, g: any) => acc + g.currentAmount, 0);

  // Chart Data
  const chartData = [
    { name: 'Income', value: Math.max(0, monthlyIncome), color: '#10B981' },
    { name: 'Expenses', value: Math.max(0, monthlyExpenses), color: '#EF4444' },
    { name: 'Savings', value: Math.max(0, totalSavings), color: '#F97316' },
  ].filter(d => d.value > 0);

  // If all values are 0, Recharts Pie can crash or look bad
  const hasPieData = chartData.length > 0;

  const fetchAiInsights = async () => {
    if (transactions.length === 0) return;
    setInsightLoading(true);
    try {
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions, budgets, goals })
      });
      const data = await res.json();
      setAiInsights(data.insights || []);
    } catch (err) {
      console.error(err);
    } finally {
      setInsightLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && transactions.length > 0) {
      fetchAiInsights();
    }
  }, [loading, transactions.length]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard Overview</h2>
          <p className="text-gray-400">Welcome back, {profile?.displayName}</p>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/expenses')}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            + New Transaction
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Balance" 
          amount={`${currency} ${totalBalance.toLocaleString()}`}
          icon={Wallet}
          color="text-blue-500"
        />
        <StatCard 
          title="Monthly Income" 
          amount={`${currency} ${monthlyIncome.toLocaleString()}`}
          icon={ArrowUpRight}
          color="text-green-500"
        />
        <StatCard 
          title="Monthly Expenses" 
          amount={`${currency} ${monthlyExpenses.toLocaleString()}`}
          icon={ArrowDownLeft}
          color="text-red-500"
        />
        <StatCard 
          title="Total Savings" 
          amount={`${currency} ${totalSavings.toLocaleString()}`}
          icon={TrendingUp}
          color="text-orange-500"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Analytics Chart */}
        <div className="lg:col-span-2 bg-[#141414] border border-[#1F1F1F] p-8 rounded-2xl h-[400px]">
          <h3 className="text-lg font-semibold mb-6">Financial Overview</h3>
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={transactions.slice(0, 7).reverse()}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis dataKey="date" stroke="#666" tickFormatter={(v) => format(new Date(v), 'MMM dd')} />
              <YAxis stroke="#666" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#141414', border: '1px solid #1F1F1F' }}
                itemStyle={{ color: '#fff' }}
              />
              <Area type="monotone" dataKey="amount" stroke="#10B981" fillOpacity={1} fill="url(#colorIncome)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Categories / AI Insights */}
        <div className="space-y-8">
          <div className="bg-[#141414] border border-[#1F1F1F] p-6 rounded-2xl">
            <div className="flex items-center space-x-2 mb-4">
              <Sparkles className="text-orange-500" size={20} />
              <h3 className="text-lg font-semibold">AI Insights</h3>
            </div>
            
            {insightLoading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-20 bg-[#1F1F1F] rounded-xl" />
                <div className="h-20 bg-[#1F1F1F] rounded-xl" />
              </div>
            ) : aiInsights.length > 0 ? (
              <div className="space-y-4">
                {aiInsights.map((insight, idx) => (
                  <div key={idx} className="p-4 bg-[#1F1F1F] rounded-xl border border-white/5">
                    <h4 className="text-sm font-medium text-white mb-1">{insight.title}</h4>
                    <p className="text-xs text-gray-400">{insight.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                Add some transactions to see AI-powered suggestions!
              </p>
            )}
          </div>

          <div className="bg-[#141414] border border-[#1F1F1F] p-6 rounded-2xl overflow-hidden">
             <h3 className="text-lg font-semibold mb-4">Allocation</h3>
             <div className="h-[200px] w-full">
                {hasPieData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                         contentStyle={{ backgroundColor: '#141414', border: '1px solid #1F1F1F', borderRadius: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500 text-xs italic">
                    No data to display
                  </div>
                )}
             </div>
             <div className="flex justify-center space-x-4 mt-2">
                {hasPieData && chartData.map((d) => (
                  <div key={d.name} className="flex items-center space-x-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-xs text-gray-400 font-medium">{d.name}</span>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
