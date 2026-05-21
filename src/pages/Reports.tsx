import React, { useState, useRef, useMemo } from 'react';
import { useFinanceData } from '../hooks/useFinanceData';
import { useAuth } from '../components/AuthProvider';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
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
  PieChart as PieChartIcon,
  BarChart4,
  Filter,
  RefreshCw,
  Search,
  SlidersHorizontal,
  FolderOpen,
  ArrowUpDown,
  TrendingDown,
  TrendingUp,
  Inbox
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';

const COLORS = ['#F97316', '#EF4444', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4', '#F59E0B', '#14B8A6', '#6366F1'];

export const Reports = () => {
  const { profile } = useAuth();
  const allData = useFinanceData();
  const { transactions, budgets, goals, wallets, subscriptions, loading } = allData;
  
  const [filterMode, setFilterMode] = useState<'month' | 'range' | 'ytd' | 'all'>('month');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense'>('all');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const [previewQuery, setPreviewQuery] = useState('');
  const [sortField, setSortField] = useState<'date' | 'category' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currency = profile?.currency || 'Rs';

  const availableCategories = useMemo(() => {
    const list = new Set<string>();
    transactions.forEach((tx: any) => {
      if (tx.category) list.add(tx.category);
    });
    ['Salary', 'Bonus', 'Dividend', 'Gift', 'Side Hustle', 'Food', 'Fuel', 'Bills', 'Shopping', 'Rent', 'Entertainment', 'Medical', 'Travel', 'Education', 'Family', 'Miscellaneous'].forEach(c => list.add(c));
    return Array.from(list).sort();
  }, [transactions]);

  const last24Months = useMemo(() => {
    return eachMonthOfInterval({
      start: subMonths(new Date(), 23),
      end: new Date(),
    }).reverse();
  }, []);

  const processedData = useMemo(() => {
    let rangeStart: Date;
    let rangeEnd: Date;
    
    if (filterMode === 'month') {
      const parsed = new Date(selectedMonth + '-02');
      rangeStart = startOfMonth(parsed);
      rangeEnd = endOfMonth(parsed);
    } else if (filterMode === 'range') {
      rangeStart = startDate ? new Date(startDate) : new Date(0);
      const parsedEnd = endDate ? new Date(endDate) : new Date();
      parsedEnd.setHours(23, 59, 59, 999);
      rangeEnd = parsedEnd;
    } else if (filterMode === 'ytd') {
      rangeStart = new Date(new Date().getFullYear(), 0, 1);
      rangeEnd = new Date();
    } else {
      rangeStart = new Date(0);
      rangeEnd = new Date();
    }

    const filtered = transactions.filter((tx: any) => {
      const txDate = new Date(tx.date);
      const dateInBounds = txDate >= rangeStart && txDate <= rangeEnd;
      if (!dateInBounds) return false;
      if (selectedType !== 'all' && tx.type !== selectedType) return false;
      if (selectedCategory !== 'all' && tx.category !== selectedCategory) return false;
      
      const amountVal = Number(tx.amount);
      if (minAmount && amountVal < Number(minAmount)) return false;
      if (maxAmount && amountVal > Number(maxAmount)) return false;
      return true;
    });

    const totalIncome = filtered.filter((tx: any) => tx.type === 'income').reduce((acc, tx) => acc + tx.amount, 0);
    const totalExpenses = filtered.filter((tx: any) => tx.type === 'expense').reduce((acc, tx) => acc + tx.amount, 0);
    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100) : 0;
    
    const count = filtered.length;
    const average = count ? (filtered.reduce((acc, tx) => acc + tx.amount, 0) / count) : 0;

    const expenseCategoryMap = filtered
      .filter((tx: any) => tx.type === 'expense')
      .reduce((acc: any, tx: any) => {
        acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
        return acc;
      }, {});

    const chartData = Object.entries(expenseCategoryMap).map(([name, value]) => ({ 
      name, 
      value: Number(value) 
    })).sort((a, b) => b.value - a.value);

    const previewList = filtered.filter((tx: any) => {
      if (!previewQuery) return true;
      const term = previewQuery.toLowerCase();
      return (
        tx.category.toLowerCase().includes(term) ||
        (tx.notes || '').toLowerCase().includes(term) ||
        String(tx.amount).includes(term) ||
        tx.date.includes(term)
      );
    });

    const sortedPreviewList = [...previewList].sort((a: any, b: any) => {
      let multiplier = sortOrder === 'asc' ? 1 : -1;
      if (sortField === 'date') {
        return (new Date(a.date).getTime() - new Date(b.date).getTime()) * multiplier;
      } else if (sortField === 'category') {
        return a.category.localeCompare(b.category) * multiplier;
      } else if (sortField === 'amount') {
        return (a.amount - b.amount) * multiplier;
      }
      return 0;
    });

    const periodStr = filterMode === 'month' 
      ? format(new Date(selectedMonth + '-02'), 'MMMM yyyy')
      : filterMode === 'range' 
        ? `${startDate} ~ ${endDate}` 
        : filterMode === 'ytd' 
          ? `Year to Date (${new Date().getFullYear()})` 
          : 'All History Registers';

    return {
      filteredTransactions: filtered,
      sortedTransactionsForExport: [...filtered].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      previewList: sortedPreviewList,
      stats: {
        income: totalIncome,
        expenses: totalExpenses,
        net: netSavings,
        savingsRate,
        count,
        average,
        incomeCount: filtered.filter((tx: any) => tx.type === 'income').length,
        expenseCount: filtered.filter((tx: any) => tx.type === 'expense').length,
      },
      chartData,
      categoryMap: expenseCategoryMap,
      periodStr
    };
  }, [transactions, filterMode, selectedMonth, startDate, endDate, selectedCategory, selectedType, minAmount, maxAmount, previewQuery, sortField, sortOrder]);

  const { stats, chartData, periodStr, sortedTransactionsForExport, previewList } = processedData;

  const setAutoWidth = (ws: XLSX.WorkSheet) => {
    const keys = Object.keys(ws);
    const colWidths: any = {};
    keys.forEach(k => {
      if (k.startsWith('!')) return;
      const col = k.replace(/[0-9]/g, '');
      const val = ws[k].v ? String(ws[k].v) : '';
      colWidths[col] = Math.max(colWidths[col] || 10, val.length + 3);
    });
    ws['!cols'] = Object.keys(colWidths).map(col => ({ wch: colWidths[col] }));
  };

  const exportExcel = () => {
    const dashboardRows = [
      ["TRACKWITHASAD - FINANCIAL SUMMARY STATEMENT"],
      ["=".repeat(50)],
      [`Generated at:`, format(new Date(), 'PPpp')],
      [`Account Profile:`, `${profile?.displayName || 'Guest User'} (${profile?.email || 'Offline'})`],
      [`Reporting Range:`, periodStr],
      [],
      ["Key Metrics", "Valuation", "Notes"],
      ["Total Cash Inflow", stats.income, "Summed deposits"],
      ["Total Cash Outflow", stats.expenses, "Summed expenditures"],
      ["Net Accumulation", stats.net, "Inflow minus Outflow"],
      ["Active Savings Rate", stats.income > 0 ? `${stats.savingsRate.toFixed(2)}%` : "0%", "Savings ratio proportion"],
      ["Transaction Count", stats.count, "Total matches registered"],
      ["Average Transaction Size", stats.average, "Equally divided valuation"],
      [],
      ["Category Outflows", "Valuation Spent", "Percentage Ratio of Debits"],
      ...chartData.map(c => {
        const ratio = stats.expenses > 0 ? ((c.value / stats.expenses) * 100).toFixed(2) + "%" : "0%";
        return [c.name, c.value, ratio];
      })
    ];

    const dashboardSheet = XLSX.utils.aoa_to_sheet(dashboardRows);

    const detailedTxRows = sortedTransactionsForExport.map(tx => ({
      "Registered Date": tx.date,
      "Accounting Style": tx.type.toUpperCase(),
      "Category Classification": tx.category,
      "Valuation Amount": tx.amount,
      "Internal Record Notes Memo": tx.notes || ''
    }));
    const detailedSheet = XLSX.utils.json_to_sheet(detailedTxRows);

    setAutoWidth(dashboardSheet);
    setAutoWidth(detailedSheet);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, dashboardSheet, "Executive Summary");
    XLSX.utils.book_append_sheet(workbook, detailedSheet, "Ledger Log");

    const cleanFilenamePeriod = periodStr.replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(workbook, `Financial_Statement_${cleanFilenamePeriod}.xlsx`);
  };

  const exportCSV = () => {
    const data = sortedTransactionsForExport.map(tx => ({
      "Date": tx.date,
      "Type": tx.type.toUpperCase(),
      "Category": tx.category,
      "Amount": tx.amount,
      "Notes Memo": tx.notes || ''
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ledger Export");
    setAutoWidth(worksheet);

    const cleanFilenamePeriod = periodStr.replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(workbook, `Transactions_${cleanFilenamePeriod}.csv`);
  };

  const exportPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4') as any;
    const pageWidth = doc.internal.pageSize.width || 210;
    
    doc.setFillColor(249, 115, 22);
    doc.rect(0, 0, pageWidth, 12, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(20, 20, 20);
    doc.text("trackwithAsad", 14, 27);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(110, 110, 110);
    doc.text("FINANCIAL COMPILATION AUDIT STATEMENT", 14, 32);
    
    doc.setDrawColor(225, 225, 225);
    doc.setLineWidth(0.4);
    doc.line(14, 36, pageWidth - 14, 36);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 20);
    doc.text("DOCUMENT PERFORMANCE REGISTRY", 14, 44);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text("Account Profile User:", 14, 50);
    doc.setFont("helvetica", "bold");
    doc.text(`${profile?.displayName || 'Guest Workspace Admin'} (${profile?.email || 'Secure Offline Client'})`, 55, 50);
    
    doc.setFont("helvetica", "normal");
    doc.text("Reporting Time Horizon:", 14, 56);
    doc.setFont("helvetica", "bold");
    doc.text(periodStr, 55, 56);
    
    doc.setFont("helvetica", "normal");
    doc.text("System Execution Time:", 14, 62);
    doc.setFont("helvetica", "bold");
    doc.text(format(new Date(), 'PPpp') + " (UTC)", 55, 62);
    
    doc.setFont("helvetica", "normal");
    doc.text("Base Valuation Unit:", 14, 68);
    doc.setFont("helvetica", "bold");
    doc.text(`${currency} (${profile?.currency || 'Rs'})`, 55, 68);
    
    const leftMargin = 14;
    const spacing = 4;
    const cardSize = (pageWidth - leftMargin * 2 - spacing * 2) / 3;
    const cardY = 74;
    const cardHeight = 22;
    
    // Cash Inward
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(leftMargin, cardY, cardSize, cardHeight, 2.5, 2.5, 'F');
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(21, 128, 61);
    doc.text("TOTAL CASH INFLOW (CREDITS)", leftMargin + 4, cardY + 6);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`${currency} ${stats.income.toLocaleString()}`, leftMargin + 4, cardY + 15);
    
    // Cash Outward
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(leftMargin + cardSize + spacing, cardY, cardSize, cardHeight, 2.5, 2.5, 'F');
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(220, 38, 38);
    doc.text("TOTAL CASH OUTFLOW (DEBITS)", leftMargin + cardSize + spacing + 4, cardY + 6);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`${currency} ${stats.expenses.toLocaleString()}`, leftMargin + cardSize + spacing + 4, cardY + 15);
    
    // Parity savings
    const savingsAmount = stats.net;
    const isAccumulated = savingsAmount >= 0;
    
    if (isAccumulated) {
      doc.setFillColor(239, 246, 255);
      doc.roundedRect(leftMargin + (cardSize + spacing) * 2, cardY, cardSize, cardHeight, 2.5, 2.5, 'F');
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(29, 78, 216);
      doc.text("NET ACCUMULATED SAVINGS", leftMargin + (cardSize + spacing) * 2 + 4, cardY + 6);
    } else {
      doc.setFillColor(254, 243, 199);
      doc.roundedRect(leftMargin + (cardSize + spacing) * 2, cardY, cardSize, cardHeight, 2.5, 2.5, 'F');
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(146, 64, 14);
      doc.text("NET VALUATION DEFICIT", leftMargin + (cardSize + spacing) * 2 + 4, cardY + 6);
    }
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`${currency} ${savingsAmount.toLocaleString()}`, leftMargin + (cardSize + spacing) * 2 + 4, cardY + 15);
    
    const statsUnderY = cardY + cardHeight + 5;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    const savingsRateFormatted = stats.income > 0 ? `${stats.savingsRate.toFixed(1)}%` : '0%';
    doc.text(`Active Accumulation Margin: `, 14, statsUnderY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 20);
    doc.text(`${savingsRateFormatted}`, 50, statsUnderY);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Volume matched: `, pageWidth / 2 + 10, statsUnderY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 20);
    doc.text(`${stats.count} transactions (Avg: ${currency} ${stats.average.toLocaleString(undefined, { maximumFractionDigits: 1 })})`, pageWidth / 2 + 35, statsUnderY);

    const tablesStartY = statsUnderY + 8;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 20);
    doc.text("EXPENSE CATEGORY DISTRIBUTION REGISTRY", 14, tablesStartY);
    
    const catRows = chartData.map(c => {
      const percentage = stats.expenses > 0 ? ((c.value / stats.expenses) * 100).toFixed(1) + "%" : "0%";
      return [c.name, `${currency} ${c.value.toLocaleString()}`, percentage];
    });
    
    autoTable(doc, {
      head: [['Expense Category', 'Summed Outflow Amount', 'Total Expense Coverage']],
      body: catRows.length > 0 ? catRows : [['No categorical expenditures match current filters.', '-', '-']],
      startY: tablesStartY + 3,
      margin: { left: 14, right: 14 },
      theme: 'striped',
      headStyles: { fillColor: [45, 45, 45], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      bodyStyles: { fontSize: 8, textColor: [50, 50, 50] },
      styles: { cellPadding: 2 }
    });
    
    const secondTableStartY = (doc as any).lastAutoTable.finalY + 8;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 20);
    doc.text("CHRONOLOGICAL TRANSACTION REGISTER LEDGER", 14, secondTableStartY);
    
    const tableData = sortedTransactionsForExport.map(tx => [
      tx.date,
      tx.type.toUpperCase(),
      tx.category,
      `${currency} ${tx.amount.toLocaleString()}`,
      tx.notes || '-'
    ]);
    
    autoTable(doc, {
      head: [['Booking Date', 'Tx Style', 'Category Group', 'Ledger Amount', 'Transaction Notes']],
      body: tableData.length > 0 ? tableData : [['No historical transaction bookings found matching criteria.', '', '', '', '']],
      startY: secondTableStartY + 3,
      margin: { left: 14, right: 14 },
      theme: 'grid',
      headStyles: { fillColor: [249, 115, 22], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      bodyStyles: { fontSize: 7.5, textColor: [60, 60, 60] },
      columnStyles: {
        0: { cellWidth: 23 },
        1: { cellWidth: 18 },
        2: { cellWidth: 32 },
        3: { cellWidth: 28, halign: 'right' },
        4: { cellWidth: 'auto' }
      },
      didDrawPage: (data: any) => {
        const pageHeight = doc.internal.pageSize.height || 297;
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.3);
        doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);
        
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(160, 160, 160);
        doc.text("Created securely via trackwithAsad platform workspace", 14, pageHeight - 7);
        doc.text(`Statement Page Register ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
      },
      styles: { cellPadding: 1.8 }
    });
    
    const cleanFilenamePeriod = periodStr.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Statements_${cleanFilenamePeriod}.pdf`);
  };

  const exportBackup = () => {
    const backup = {
      transactions,
      budgets,
      goals,
      wallets,
      subscriptions,
      exportedAt: new Date().toISOString(),
      version: '1.1'
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trackwithAsad_Master_Backup_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`;
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
        for (const tx of (data.transactions || [])) {
          const { id, ...cleanTx } = tx;
          await addDoc(collection(db, `users/${profile.uid}/transactions`), { ...cleanTx, createdAt: serverTimestamp() });
        }
        for (const b of (data.budgets || [])) {
          const { id, ...cleanB } = b;
          await addDoc(collection(db, `users/${profile.uid}/budgets`), { ...cleanB, createdAt: serverTimestamp() });
        }
        for (const g of (data.goals || [])) {
          const { id, ...cleanG } = g;
          await addDoc(collection(db, `users/${profile.uid}/goals`), { ...cleanG, createdAt: serverTimestamp() });
        }
        for (const w of (data.wallets || [])) {
          const { id, ...cleanW } = w;
          await addDoc(collection(db, `users/${profile.uid}/wallets`), { ...cleanW, createdAt: serverTimestamp() });
        }
        
        alert('Backup data registers appended and synced successfully!');
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert('Failed to import backup.');
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Financial Reports & Audit Desk</h2>
          <p className="text-gray-400 text-sm mt-1">Configure advanced filtering scopes, inspect performance indicators, and harvest secure multi-format data exports.</p>
        </div>
        
        <div className="flex bg-[#141414] border border-[#1F1F1F] p-1 rounded-xl self-start md:self-center">
          <button
            onClick={() => setFilterMode('month')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterMode === 'month' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
          >
            Month
          </button>
          <button
            onClick={() => setFilterMode('range')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterMode === 'range' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
          >
            Custom Range
          </button>
          <button
            onClick={() => setFilterMode('ytd')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterMode === 'ytd' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
          >
            YTD
          </button>
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterMode === 'all' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
          >
            All Time
          </button>
        </div>
      </div>

      <div className="bg-[#141414] border border-[#1F1F1F] rounded-3xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-[#242424] pb-4">
          <h3 className="text-sm font-bold flex items-center space-x-2 text-gray-200">
            <Filter size={16} className="text-orange-500" />
            <span>Scope Filters Registry</span>
          </h3>
          <button 
            onClick={() => {
              setFilterMode('month');
              setSelectedMonth(format(new Date(), 'yyyy-MM'));
              setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
              setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
              setSelectedCategory('all');
              setSelectedType('all');
              setMinAmount('');
              setMaxAmount('');
              setPreviewQuery('');
            }}
            className="text-[10px] uppercase font-extrabold text-orange-500 hover:text-orange-400 transition-colors flex items-center space-x-1"
          >
            <RefreshCw size={10} />
            <span>Reset Constraints</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
          {filterMode === 'month' && (
            <div className="flex flex-col space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Target Calendar Month</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#2D2D2D] text-white pl-9 pr-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-orange-500 cursor-pointer"
                >
                  {last24Months.map((date) => {
                    const formattedVal = format(date, 'yyyy-MM');
                    return (
                      <option key={formattedVal} value={formattedVal}>
                        {format(date, 'MMMM yyyy')}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          )}

          {filterMode === 'range' && (
            <>
              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Start Boundary Date</label>
                <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#2D2D2D] text-white px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-orange-500"
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">End Boundary Date</label>
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#2D2D2D] text-white px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-orange-500"
                />
              </div>
            </>
          )}

          <div className="flex flex-col space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Accounting Style Type</label>
            <select 
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="w-full bg-[#1A1A1A] border border-[#2D2D2D] text-white px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="all">All Styles (In & Out)</option>
              <option value="income">Inflow (Income Only)</option>
              <option value="expense">Outflow (Expenses Only)</option>
            </select>
          </div>

          <div className="flex flex-col space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Categorical Domain</label>
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#2D2D2D] text-white px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="all">All Categories</option>
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Minimum Val Limit ({currency})</label>
            <input 
              type="number"
              placeholder="Min value limit"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#2D2D2D] text-white px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex flex-col space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Maximum Val Limit ({currency})</label>
            <input 
              type="number"
              placeholder="Max value limit"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#2D2D2D] text-white px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#141414] border border-[#1F1F1F] p-6 rounded-2xl relative overflow-hidden group hover:border-[#2D2D2D] transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex justify-between items-start">
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Summed Credits</p>
            <span className="p-1 px-2 rounded-md bg-green-950/30 border border-green-800/20 text-green-500 text-[9px] font-extrabold flex items-center space-x-1">
              <TrendingUp size={8} />
              <span>{stats.incomeCount} TXs</span>
            </span>
          </div>
          <h3 className="text-2xl font-bold text-green-500 mt-2">{currency} {stats.income.toLocaleString()}</h3>
          <p className="text-[10px] text-gray-500 mt-1.5">Valuation ledger credits in bounds</p>
        </div>

        <div className="bg-[#141414] border border-[#1F1F1F] p-6 rounded-2xl relative overflow-hidden group hover:border-[#2D2D2D] transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex justify-between items-start">
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Summed Debits</p>
            <span className="p-1 px-2 rounded-md bg-red-950/30 border border-red-800/20 text-red-500 text-[9px] font-extrabold flex items-center space-x-1">
              <TrendingDown size={8} />
              <span>{stats.expenseCount} TXs</span>
            </span>
          </div>
          <h3 className="text-2xl font-bold text-red-500 mt-2">{currency} {stats.expenses.toLocaleString()}</h3>
          <p className="text-[10px] text-gray-500 mt-1.5">Valuation ledger debits in bounds</p>
        </div>

        <div className="bg-[#141414] border border-[#1F1F1F] p-6 rounded-2xl relative overflow-hidden group hover:border-[#2D2D2D] transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex justify-between items-start">
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Net Position</p>
            <span className={`p-1 px-2 rounded-md text-[9px] font-extrabold flex items-center space-x-1 ${stats.net >= 0 ? 'bg-blue-950/30 border border-blue-900/20 text-blue-400' : 'bg-yellow-950/30 border border-yellow-900/20 text-yellow-500'}`}>
              <span>{stats.income > 0 ? `${stats.savingsRate.toFixed(1)}%` : '0%'} Accum.</span>
            </span>
          </div>
          <h3 className={`text-2xl font-bold mt-2 ${stats.net >= 0 ? 'text-blue-500' : 'text-yellow-500'}`}>{currency} {stats.net.toLocaleString()}</h3>
          <p className="text-[10px] text-gray-500 mt-1.5">Valuation parity ledger variance</p>
        </div>

        <div className="bg-[#141414] border border-[#1F1F1F] p-6 rounded-2xl relative overflow-hidden group hover:border-[#2D2D2D] transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex justify-between items-start">
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Avg Vol & Frequency</p>
            <span className="p-1 px-2 rounded-md bg-orange-950/30 border border-orange-800/20 text-orange-500 text-[9px] font-extrabold">
              {stats.count} Tx Matched
            </span>
          </div>
          <h3 className="text-2xl font-bold text-orange-500 mt-2">{currency} {stats.average.toLocaleString(undefined, { maximumFractionDigits: 1 })}</h3>
          <p className="text-[10px] text-gray-500 mt-1.5">Average Individual matched booking volume</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#141414] border border-[#1F1F1F] rounded-3xl p-8 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-56 h-56 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center space-x-2 text-white">
                <Download size={20} className="text-orange-500 shrink-0" />
                <span>Executive Export Suite</span>
              </h3>
              <p className="text-[10px] text-gray-500 bg-[#1D1D1D] px-2.5 py-1 rounded-full font-bold">STRICT FILTER COMPLIANT</p>
            </div>
            
            <p className="text-sm text-gray-400 leading-relaxed">Extract your filtered financial register logs using standard industry structures. Double sheets and custom grid spacing included.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button 
                onClick={exportPDF}
                className="flex flex-col items-center justify-center p-5 rounded-2xl border border-[#222] bg-[#1A1A1A] hover:bg-[#222] hover:border-orange-500/55 transition-all text-center group active:scale-[0.98]"
              >
                <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                  <FileText size={24} />
                </div>
                <p className="font-bold text-xs mt-3 text-white">Audit PDF</p>
                <p className="text-[9px] text-gray-500 mt-1 font-semibold">Ready for Print</p>
              </button>

              <button 
                onClick={exportExcel}
                className="flex flex-col items-center justify-center p-5 rounded-2xl border border-[#222] bg-[#1A1A1A] hover:bg-[#222] hover:border-orange-500/55 transition-all text-center group active:scale-[0.98]"
              >
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
                  <FileSpreadsheet size={24} />
                </div>
                <p className="font-bold text-xs mt-3 text-white">Sheet Excel</p>
                <p className="text-[9px] text-gray-500 mt-1 font-semibold">Dual Worksheet</p>
              </button>

              <button 
                onClick={exportCSV}
                className="flex flex-col items-center justify-center p-5 rounded-2xl border border-[#222] bg-[#1A1A1A] hover:bg-[#222] hover:border-orange-500/55 transition-all text-center group active:scale-[0.98]"
              >
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                  <FileJson size={24} />
                </div>
                <p className="font-bold text-xs mt-3 text-white">Flat CSV</p>
                <p className="text-[9px] text-gray-500 mt-1 font-semibold">Clean Tabular Format</p>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-[#141414] border border-[#1F1F1F] rounded-3xl p-8 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-56 h-56 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-5">
            <h3 className="text-lg font-bold flex items-center space-x-2 text-white">
              <Database size={20} className="text-orange-500" />
              <span>Full Snapshot Vault Backup</span>
            </h3>
            
            <p className="text-sm text-gray-400 leading-relaxed">Download or push a complete JSON snapshot representing all account databases (budgets, wallets, goals, subscriptions, and transactions).</p>

            <div className="flex flex-col sm:flex-row gap-4 pt-1">
              <button 
                onClick={exportBackup}
                className="flex-1 bg-white hover:bg-gray-100 text-black font-bold py-3.5 rounded-xl text-xs transition-colors flex items-center justify-center space-x-2 shadow-lg active:scale-95"
              >
                <Download size={14} />
                <span>Export JSON Vault</span>
              </button>
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="flex-1 bg-[#222] hover:bg-[#2E2E2E] text-white font-bold py-3.5 rounded-xl text-xs transition-colors flex items-center justify-center space-x-2 border border-white/5 disabled:opacity-50 active:scale-95"
              >
                <Upload size={14} />
                <span>{isImporting ? 'Syphoning...' : 'Import JSON Restore'}</span>
              </button>
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".json" 
              onChange={handleImport} 
            />
            
            <div className="flex items-start space-x-2 text-orange-500 bg-orange-500/5 p-3 rounded-xl border border-orange-500/10">
               <AlertCircle size={14} className="mt-0.5 shrink-0" />
               <p className="text-[10px] leading-relaxed text-gray-400"><strong>Safe Appending:</strong> Importation merges offline and online records. Existing logs are preserved.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#141414] border border-[#1F1F1F] rounded-3xl p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h3 className="text-lg font-bold flex items-center space-x-2 text-white">
              {chartType === 'bar' ? <BarChart4 size={20} className="text-orange-500" /> : <PieChartIcon size={20} className="text-orange-500" />}
              <span>Distribution Breakdown Spectrum</span>
            </h3>
            
            <div className="flex bg-[#1E1E1E] p-1 rounded-lg self-start">
              <button
                onClick={() => setChartType('bar')}
                className={`p-1.5 px-3 rounded-md text-[10px] uppercase font-bold transition-all ${chartType === 'bar' ? 'bg-[#2E2E2E] text-orange-500' : 'text-gray-500 hover:text-white'}`}
              >
                Bar Chart
              </button>
              <button
                onClick={() => setChartType('pie')}
                className={`p-1.5 px-3 rounded-md text-[10px] uppercase font-bold transition-all ${chartType === 'pie' ? 'bg-[#2E2E2E] text-orange-500' : 'text-gray-500 hover:text-white'}`}
              >
                Pie Donut
              </button>
            </div>
          </div>
          
          <div className="h-[300px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <XAxis dataKey="name" stroke="#555" fontSize={9} tickLine={false} axisLine={false} />
                    <YAxis stroke="#555" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => `${currency}${v}`} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,165,0,0.05)' }}
                      contentStyle={{ backgroundColor: '#141414', border: '1px solid #1F1F1F', borderRadius: '12px', fontSize: '11px' }}
                      formatter={(value) => [`${currency} ${Number(value).toLocaleString()}`, 'Valuation Spent']}
                    />
                    <Bar dataKey="value" fill="#F97316" radius={[6, 6, 0, 0]} />
                  </BarChart>
                ) : (
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#141414', border: '1px solid #1F1F1F', borderRadius: '12px', fontSize: '11px' }}
                      formatter={(value) => [`${currency} ${Number(value).toLocaleString()}`, 'Valuation Spent']}
                    />
                  </PieChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 space-y-2">
                <PieChartIcon size={40} className="stroke-[1] text-gray-600 animate-bounce" />
                <p className="text-xs font-semibold">No categorical debits matches your metrics.</p>
                <p className="text-[10px] text-gray-600">Consider adjusting date limits or checking style types.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#141414] border border-[#1F1F1F] rounded-3xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-[#1F1F1F] bg-[#191919] flex justify-between items-center">
             <h3 className="font-bold text-gray-400 uppercase tracking-widest text-xs">Spend Domains Hierarchy</h3>
             <span className="text-[9px] uppercase font-bold text-[#F97316] bg-[#F97316]/10 px-2 py-0.5 rounded-full">{chartData.length} active</span>
          </div>
          
          <div className="p-6 space-y-5 flex-1 overflow-auto max-h-[300px]">
             {chartData.map((cat, idx) => {
               const percentage = stats.expenses > 0 ? (cat.value / stats.expenses) * 100 : 0;
               return (
                 <div key={cat.name} className="space-y-1.5 group">
                   <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2.5">
                         <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                         <span className="text-gray-400 group-hover:text-white text-xs transition-colors font-medium">{cat.name}</span>
                      </div>
                      <div className="text-right text-xs">
                         <span className="font-bold text-white">{currency} {cat.value.toLocaleString()}</span>
                         <span className="text-gray-500 text-[10px] ml-1.5">({percentage.toFixed(1)}%)</span>
                      </div>
                   </div>
                   <div className="w-full bg-[#202020] h-1.5 rounded-full overflow-hidden">
                     <div 
                       className="h-full rounded-full transition-all duration-1000" 
                       style={{ width: `${percentage}%`, backgroundColor: COLORS[idx % COLORS.length] }} 
                     />
                   </div>
                 </div>
               );
             })}
             
             {chartData.length === 0 && (
               <div className="h-full py-24 flex flex-col items-center justify-center text-center space-y-2">
                 <FolderOpen size={30} className="text-gray-600 stroke-[1]" />
                 <p className="text-xs text-gray-500">Categorical distributions vacant.</p>
               </div>
             )}
          </div>
        </div>
      </div>

      <div className="bg-[#141414] border border-[#1F1F1F] rounded-3xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-[#1F1F1F] bg-[#191919] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-white text-sm flex items-center space-x-2">
              <SlidersHorizontal size={16} className="text-orange-500" />
              <span>Statement Audit Log Preview</span>
            </h3>
            <p className="text-xs text-gray-500 mt-1">Displays live output of transactions currently matching constraints before finalizing download exports.</p>
          </div>
          
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={12} />
            <input 
              type="text"
              placeholder="Search table previews..."
              className="w-full bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl pl-8 pr-4 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 transition-colors"
              value={previewQuery}
              onChange={(e) => setPreviewQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1F1F1F] text-gray-500 text-[10px] font-bold uppercase bg-[#0E0E0E]">
                <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => {
                  setSortField('date');
                  setSortOrder(sortField === 'date' && sortOrder === 'desc' ? 'asc' : 'desc');
                }}>
                  <div className="flex items-center space-x-1">
                    <span>Booking Date</span>
                    <ArrowUpDown size={10} className={sortField === 'date' ? 'text-orange-500' : 'text-gray-650'} />
                  </div>
                </th>
                <th className="px-6 py-4">Tx Style</th>
                <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => {
                  setSortField('category');
                  setSortOrder(sortField === 'category' && sortOrder === 'desc' ? 'asc' : 'desc');
                }}>
                  <div className="flex items-center space-x-1">
                    <span>Category Domain</span>
                    <ArrowUpDown size={10} className={sortField === 'category' ? 'text-orange-500' : 'text-gray-650'} />
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => {
                  setSortField('amount');
                  setSortOrder(sortField === 'amount' && sortOrder === 'desc' ? 'asc' : 'desc');
                }}>
                  <div className="flex items-center space-x-1">
                    <span>Valuation Magnitude</span>
                    <ArrowUpDown size={10} className={sortField === 'amount' ? 'text-orange-500' : 'text-gray-650'} />
                  </div>
                </th>
                <th className="px-6 py-4">Memo Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1B1B1B] text-xs">
              {previewList.slice(0, 50).map((tx: any) => (
                <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-3 text-gray-400 font-mono text-[11px] whitespace-nowrap">{tx.date}</td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${tx.type === 'income' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-300 font-medium whitespace-nowrap">{tx.category}</td>
                  <td className="px-6 py-3 font-bold font-mono text-right whitespace-nowrap">
                    <span className={tx.type === 'income' ? 'text-green-500' : 'text-red-500'}>
                      {tx.type === 'income' ? '+' : '-'} {currency} {tx.amount.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-400 max-w-xs truncate" title={tx.notes || ''}>
                    {tx.notes || <span className="text-gray-600">-</span>}
                  </td>
                </tr>
              ))}
              
              {previewList.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-gray-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                       <Inbox size={32} className="text-gray-600 stroke-[1.2]" />
                       <p className="text-xs font-semibold">No transactions found matching preview parameters.</p>
                       <p className="text-[10px] text-gray-600">Verify filter conditions or search string inputs.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {previewList.length > 50 && (
          <div className="p-4 border-t border-[#1F1F1F] text-center bg-[#131313]">
            <p className="text-[10px] uppercase font-bold tracking-wider text-gray-500">
              Only showing top 50 matches. Exports will include all {previewList.length} filtered items.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
