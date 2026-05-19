import React, { useState } from 'react';
import { useFinanceData } from '../hooks/useFinanceData';
import { useAuth } from '../components/AuthProvider';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Search, Filter, X, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const schema = z.object({
  amount: z.number().min(0, "Amount is required"),
  category: z.string().min(1, "Category is required"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

const categories = {
  income: ['Salary', 'Bonus', 'Dividend', 'Gift', 'Side Hustle', 'Other'],
  expense: ['Food', 'Fuel', 'Bills', 'Shopping', 'Rent', 'Entertainment', 'Medical', 'Travel', 'Education', 'Family', 'Miscellaneous']
};

export const Transactions = ({ type }: { type: 'income' | 'expense' }) => {
  const { profile } = useAuth();
  const { transactions } = useFinanceData();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTx, setEditingTx] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: 0,
      category: '',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    }
  });

  const filteredTx = transactions
    .filter((tx: any) => tx.type === type)
    .filter((tx: any) => {
      const matchesSearch = tx.category.toLowerCase().includes(searchTerm.toLowerCase()) || 
        tx.notes?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === '' || tx.category === selectedCategory;
      
      const txDate = new Date(tx.date);
      const matchesStartDate = startDate === '' || txDate >= new Date(startDate);
      const matchesEndDate = endDate === '' || txDate <= new Date(endDate);
      
      return matchesSearch && matchesCategory && matchesStartDate && matchesEndDate;
    });

  const startEdit = (tx: any) => {
    setEditingTx(tx);
    setValue('amount', tx.amount);
    setValue('category', tx.category);
    setValue('date', tx.date);
    setValue('notes', tx.notes || '');
    setShowAddForm(true);
  };

  const closeForm = () => {
    setShowAddForm(false);
    setEditingTx(null);
    reset();
  };

  const onSubmit = async (data: any) => {
    if (!profile) return;
    try {
      if (editingTx) {
        await updateDoc(doc(db, `users/${profile.uid}/transactions`, editingTx.id), {
          ...data,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, `users/${profile.uid}/transactions`), {
          ...data,
          type,
          createdAt: serverTimestamp(),
        });
      }
      closeForm();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteTx = async (id: string) => {
    if (!profile) return;
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await deleteDoc(doc(db, `users/${profile.uid}/transactions`, id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white capitalize">{type}s</h2>
          <p className="text-gray-400">Total {type} management</p>
        </div>
        <button 
          onClick={() => showAddForm ? closeForm() : setShowAddForm(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center space-x-2"
        >
          {showAddForm ? <X size={18} /> : <Plus size={18} />}
          <span>{showAddForm ? 'Close' : `Add ${type}`}</span>
        </button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col md:flex-row gap-4 items-end md:items-center">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text"
            placeholder="Search notes..."
            className="w-full bg-[#141414] border border-[#1F1F1F] rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-orange-500 transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-3 rounded-xl border flex items-center space-x-2 text-sm transition-colors whitespace-nowrap ${showFilters ? 'bg-orange-500/10 border-orange-500 text-orange-500' : 'bg-[#141414] border-[#1F1F1F] text-gray-400 hover:text-white'}`}
        >
          <Filter size={18} />
          <span>Filters</span>
        </button>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block">Category</label>
                <select 
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#1F1F1F] rounded-xl px-4 py-2.5 text-xs text-white focus:border-orange-500 outline-none"
                >
                  <option value="">All Categories</option>
                  {categories[type].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block">Start Date</label>
                <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#1F1F1F] rounded-xl px-4 py-2 text-xs text-white focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block">End Date</label>
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#1F1F1F] rounded-xl px-4 py-2 text-xs text-white focus:border-orange-500 outline-none"
                />
              </div>
              <button 
                onClick={() => {
                  setSelectedCategory('');
                  setStartDate('');
                  setEndDate('');
                  setSearchTerm('');
                }}
                className="w-full bg-white/5 hover:bg-white/10 text-gray-400 py-2.5 rounded-xl text-xs transition-colors"
              >
                Clear All
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transaction List */}
      <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#1F1F1F] text-gray-500 text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">Date</th>
              <th className="px-6 py-4 font-semibold">Category</th>
              <th className="px-6 py-4 font-semibold">Notes</th>
              <th className="px-6 py-4 font-semibold text-right">Amount</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filteredTx.map((tx: any) => (
                <motion.tr 
                  key={tx.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="border-b border-[#1F1F1F] hover:bg-white/5 transition-colors group"
                >
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {format(new Date(tx.date), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-white/5 rounded-full text-xs font-medium text-white">
                      {tx.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400 truncate max-w-[200px]">
                    {tx.notes || '-'}
                  </td>
                  <td className={
                    `px-6 py-4 text-sm font-semibold text-right ${type === 'income' ? 'text-green-500' : 'text-red-500'}`
                  }>
                    {type === 'income' ? '+' : '-'}{profile?.currency} {tx.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end space-x-2">
                    <button 
                      onClick={() => startEdit(tx)}
                      className="text-gray-500 hover:text-orange-500 transition-colors p-1"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => deleteTx(tx.id)}
                      className="text-gray-500 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
        {filteredTx.length === 0 && (
          <div className="py-20 text-center text-gray-500">
             No {type}s found.
          </div>
        )}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#141414] border border-[#1F1F1F] rounded-2xl w-full max-w-md p-8 relative shadow-2xl"
            >
              <button 
                onClick={closeForm}
                className="absolute right-6 top-6 text-gray-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
              
              <h3 className="text-xl font-bold mb-6">{editingTx ? 'Edit' : 'Add'} {type}</h3>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Amount</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="w-full bg-[#1F1F1F] border border-[#2F2F2F] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                    {...register('amount', { valueAsNumber: true })}
                  />
                  {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Category</label>
                  <select 
                    className="w-full bg-[#1F1F1F] border border-[#2F2F2F] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors appearance-none"
                    {...register('category')}
                  >
                    <option value="">Select Category</option>
                    {categories[type].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Date</label>
                  <input 
                    type="date" 
                    className="w-full bg-[#1F1F1F] border border-[#2F2F2F] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                    {...register('date')}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Notes (Optional)</label>
                  <textarea 
                    className="w-full bg-[#1F1F1F] border border-[#2F2F2F] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors h-24 resize-none"
                    {...register('notes')}
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors mt-6"
                >
                  {editingTx ? 'Update' : 'Save'} Transaction
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
