import React, { useState, useRef } from 'react';
import { useFinanceData } from '../hooks/useFinanceData';
import { useAuth } from '../components/AuthProvider';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Download, 
  FileSpreadsheet, 
  FileJson, 
  Calendar, 
  Database,
  Upload,
  AlertCircle,
  PieChart as PieChartIcon
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';

const COLORS = ['#F97316', '#EF4444', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4', '#F59E0B'];

export const Reports = () => {
  const { profile } = useAuth();
  const allData = useFinanceData();
  const { transactions, budgets, goals, wallets, subscriptions, loading } = allData;
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currency = profile?.currency || 'Rs';

  // Generate last 12 months for selection
  const last12Months = eachMonthOfInterval({
    start: subMonths(new Date(), 11),
    end: new Date(),
  }).reverse();

  const filteredTransactions = transactions.filter((tx: any) => 
    tx.date.startsWith(selectedMonth)
  );

  const stats = {
    income: filteredTransactions.filter((tx: any) => tx.type === 'income').reduce((acc: number, tx: any) => acc + tx.amount, 0),
    expenses: filteredTransactions.filter((tx: any) => tx.type === 'expense').reduce((acc: number, tx: any) => acc + tx.amount, 0),
  };

  const categoryMap = filteredTransactions
    .filter((tx: any) => tx.type === 'expense')
    .reduce((acc: any, tx: any) => {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
      return acc;
    }, {});

  const chartData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

  const exportCSV = () => {
    const data = filteredTransactions.map(tx => ({
      Date: tx.date,
      Type: tx.type,
      Category: tx.category,
      Amount: tx.amount,
      Notes: tx.notes || ''
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
    XLSX.writeFile(workbook, `Report_${selectedMonth}.csv`);
  };

  const exportExcel = () => {
    const data = filteredTransactions.map(tx => ({
      Date: tx.date,
      Type: tx.type,
      Category: tx.category,
      Amount: tx.amount,
      Notes: tx.notes || ''
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
    XLSX.writeFile(workbook, `Report_${selectedMonth}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF() as any;
    
    doc.setFontSize(20);
    doc.text(`Financial Report - ${format(new Date(selectedMonth), 'MMMM yyyy')}`, 14, 22);
    
    doc.setFontSize(12);
    doc.text(`User: ${profile?.displayName}`, 14, 32);
    doc.text(`Total Income: ${currency} ${stats.income.toLocaleString()}`, 14, 40);
    doc.text(`Total Expenses: ${currency} ${stats.expenses.toLocaleString()}`, 14, 48);
    doc.text(`Net: ${currency} ${(stats.income - stats.expenses).toLocaleString()}`, 14, 56);

    const tableData = filteredTransactions.map(tx => [
      tx.date,
      tx.type.toUpperCase(),
      tx.category,
      `${currency} ${tx.amount.toLocaleString()}`,
      tx.notes || ''
    ]);

    doc.autoTable({
      head: [['Date', 'Type', 'Category', 'Amount', 'Notes']],
      body: tableData,
      startY: 65,
      theme: 'grid',
      headStyles: { fillColor: [249, 115, 22] }
    });

    doc.save(`Report_${selectedMonth}.pdf`);
  };

  const exportBackup = () => {
    const backup = {
      transactions,
      budgets,
      goals,
      wallets,
      subscriptions,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trackwithAsad_Backup_${format(new Date(), 'yyyyMMdd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!confirm('This will append data from the backup to your current account. Continue?')) return;
        
        setIsImporting(true);
        const batchSize = 500;
        
        // Simple import strategy: just add everything to new IDs
        // Transactions
        for (const tx of (data.transactions || [])) {
          const { id, ...cleanTx } = tx;
          await addDoc(collection(db, `users/${profile.uid}/transactions`), { ...cleanTx, createdAt: serverTimestamp() });
        }
        // Budgets
        for (const b of (data.budgets || [])) {
          const { id, ...cleanB } = b;
          await addDoc(collection(db, `users/${profile.uid}/budgets`), { ...cleanB, createdAt: serverTimestamp() });
        }
        // Goals
        for (const g of (data.goals || [])) {
          const { id, ...cleanG } = g;
          await addDoc(collection(db, `users/${profile.uid}/goals`), { ...cleanG, createdAt: serverTimestamp() });
        }
        // Wallets
        for (const w of (data.wallets || [])) {
          const { id, ...cleanW } = w;
          await addDoc(collection(db, `users/${profile.uid}/wallets`), { ...cleanW, createdAt: serverTimestamp() });
        }
        
        alert('Backup imported successfully!');
      } catch (err) {
        console.error(err);
        alert('Failed to import backup. Please check the file format.');
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Financial Reports</h2>
          <p className="text-gray-400">Generate, export, and secure your financial data</p>
        </div>
        <div className="flex items-center space-x-3 bg-[#141414] border border-[#1F1F1F] rounded-xl px-4 py-2">
          <Calendar size={18} className="text-orange-500" />
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
          >
            {last12Months.map((date) => (
              <option key={format(date, 'yyyy-MM')} value={format(date, 'yyyy-MM')} className="bg-[#141414]">
                {format(date, 'MMMM yyyy')}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#141414] border border-[#1F1F1F] p-6 rounded-2xl">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Monthly Income</p>
          <h3 className="text-2xl font-bold text-green-500">{currency} {stats.income.toLocaleString()}</h3>
        </div>
        <div className="bg-[#141414] border border-[#1F1F1F] p-6 rounded-2xl">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Monthly Expenses</p>
          <h3 className="text-2xl font-bold text-red-500">{currency} {stats.expenses.toLocaleString()}</h3>
        </div>
        <div className="bg-[#141414] border border-[#1F1F1F] p-6 rounded-2xl">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Net Savings</p>
          <h3 className="text-2xl font-bold text-blue-500">{currency} {(stats.income - stats.expenses).toLocaleString()}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Export Options */}
        <div className="bg-[#141414] border border-[#1F1F1F] rounded-3xl p-8">
          <h3 className="text-lg font-bold mb-6 flex items-center space-x-2">
            <Download size={20} className="text-orange-500" />
            <span>Export Reports</span>
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button 
              onClick={exportPDF}
              className="flex items-center space-x-4 p-4 rounded-2xl border border-[#1F1F1F] bg-[#1A1A1A] hover:bg-[#1F1F1F] hover:border-orange-500/50 transition-all group"
            >
              <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500">
                <FileText size={24} />
              </div>
              <div className="text-left">
                 <p className="font-bold text-sm">PDF Report</p>
                 <p className="text-[10px] text-gray-500">Detailed for printing</p>
              </div>
            </button>

            <button 
              onClick={exportExcel}
              className="flex items-center space-x-4 p-4 rounded-2xl border border-[#1F1F1F] bg-[#1A1A1A] hover:bg-[#1F1F1F] hover:border-orange-500/50 transition-all group"
            >
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500">
                <FileSpreadsheet size={24} />
              </div>
              <div className="text-left">
                 <p className="font-bold text-sm">Excel Sheet</p>
                 <p className="text-[10px] text-gray-500">For spreadsheet analysis</p>
              </div>
            </button>

            <button 
              onClick={exportCSV}
              className="flex items-center space-x-4 p-4 rounded-2xl border border-[#1F1F1F] bg-[#1A1A1A] hover:bg-[#1F1F1F] hover:border-orange-500/50 transition-all group"
            >
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                <FileJson size={24} />
              </div>
              <div className="text-left">
                 <p className="font-bold text-sm">CSV Data</p>
                 <p className="text-[10px] text-gray-500">Raw data backup</p>
              </div>
            </button>
          </div>
        </div>

        {/* Cloud Backup */}
        <div className="bg-[#141414] border border-[#1F1F1F] rounded-3xl p-8 relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-lg font-bold mb-6 flex items-center space-x-2">
              <Database size={20} className="text-orange-500" />
              <span>Full Backup & Restore</span>
            </h3>
            
            <p className="text-sm text-gray-400 mb-6">Download a complete snapshot of your entire account data for local storage or transfer.</p>

            <div className="flex space-x-4">
              <button 
                onClick={exportBackup}
                className="flex-1 bg-white hover:bg-gray-100 text-black font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center space-x-2"
              >
                <Download size={18} />
                <span>Export JSON</span>
              </button>
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="flex-1 bg-[#1F1F1F] hover:bg-[#2F2F2F] text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center space-x-2 border border-white/5 disabled:opacity-50"
              >
                <Upload size={18} />
                <span>{isImporting ? 'Importing...' : 'Import JSON'}</span>
              </button>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".json" 
              onChange={handleImport} 
            />
            
            <div className="mt-6 flex items-start space-x-2 text-[#F59E0B] bg-[#F59E0B]/10 p-3 rounded-xl">
               <AlertCircle size={16} className="mt-0.5 shrink-0" />
               <p className="text-[10px] leading-relaxed">Importing data will not delete your existing records, it will add the data from the backup file to your current account.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#141414] border border-[#1F1F1F] rounded-3xl p-8">
           <h3 className="text-lg font-bold mb-6 flex items-center space-x-2">
              <PieChartIcon size={20} className="text-orange-500" />
              <span>Spending Breakdown</span>
           </h3>
           <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={chartData}>
                    <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${currency}${v}`} />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ backgroundColor: '#141414', border: '1px solid #1F1F1F', borderRadius: '12px' }}
                    />
                    <Bar dataKey="value" fill="#F97316" radius={[6, 6, 0, 0]} />
                 </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-[#141414] border border-[#1F1F1F] rounded-3xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-[#1F1F1F]">
             <h3 className="font-bold text-gray-300 uppercase tracking-widest text-xs">Categories</h3>
          </div>
          <div className="p-6 space-y-4 flex-1 overflow-auto max-h-[300px]">
             {chartData.sort((a, b) => b.value - a.value).map((cat: any, idx) => (
               <div key={cat.name} className="flex justify-between items-center group">
                  <div className="flex items-center space-x-3">
                     <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                     <span className="text-gray-400 group-hover:text-white transition-colors">{cat.name}</span>
                  </div>
                  <span className="font-bold">{currency} {cat.value.toLocaleString()}</span>
               </div>
             ))}
             {chartData.length === 0 && (
               <p className="text-center text-gray-500 py-20">No data found.</p>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

