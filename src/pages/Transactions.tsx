import React, { useState } from 'react';
import { useFinanceData } from '../hooks/useFinanceData';
import { useAuth } from '../components/AuthProvider';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Search, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const schema = z.object({
  amount: z.number().min(1, "Amount is required"),
  category: z.string().min(1, "Category is required"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  walletId: z.string().optional(),
});

const categories = {
  income: ['Salary', 'Bonus', 'Dividend', 'Gift', 'Side Hustle', 'Other'],
  expense: ['Food', 'Fuel', 'Bills', 'Shopping', 'Rent', 'Entertainment', 'Medical', 'Travel', 'Education', 'Family', 'Miscellaneous']
};

export const Transactions = ({ type }: { type: 'income' | 'expense' }) => {
  const { profile } = useAuth();
  const { transactions, wallets } = useFinanceData();
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
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
    .filter((tx: any) => 
      tx.category.toLowerCase().includes(searchTerm.toLowerCase()) || 
      tx.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const onSubmit = async (data: any) => {
    if (!profile) return;
    try {
      await addDoc(collection(db, `users/${profile.uid}/transactions`), {
        ...data,
        type,
        createdAt: serverTimestamp(),
      });
      reset();
      setShowAddForm(false);
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
          <p className="text-gray-400">Manage your {type} history</p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>Add {type}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text"
            placeholder="Search category or notes..."
            className="w-full bg-[#141414] border border-[#1F1F1F] rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-orange-500 transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="bg-[#141414] border border-[#1F1F1F] px-4 rounded-xl flex items-center space-x-2 text-gray-400 hover:text-white transition-colors">
          <Filter size={18} />
          <span className="text-sm">Filter</span>
        </button>
      </div>

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
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => deleteTx(tx.id)}
                      className="text-gray-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
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
                onClick={() => setShowAddForm(false)}
                className="absolute right-6 top-6 text-gray-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
              
              <h3 className="text-xl font-bold mb-6">Add {type}</h3>
              
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
                  Save Transaction
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
