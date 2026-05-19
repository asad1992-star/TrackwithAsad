import React, { useState } from 'react';
import { useFinanceData } from '../hooks/useFinanceData';
import { useAuth } from '../components/AuthProvider';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, X, PieChart } from 'lucide-react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';

const categories = ['Food', 'Fuel', 'Bills', 'Shopping', 'Rent', 'Entertainment', 'Medical', 'Travel', 'Education', 'Family', 'Miscellaneous'];

export const Budgets = () => {
  const { profile } = useAuth();
  const { budgets, transactions } = useFinanceData();
  const [showAddForm, setShowAddForm] = useState(false);

  const currentMonth = format(new Date(), 'yyyy-MM');
  
  const { register, handleSubmit, reset } = useForm();

  const onSubmit = async (data: any) => {
    if (!profile) return;
    try {
      await addDoc(collection(db, `users/${profile.uid}/budgets`), {
        ...data,
        amount: Number(data.amount),
        month: currentMonth,
        createdAt: serverTimestamp(),
      });
      reset();
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteBudget = async (id: string) => {
    if (!profile) return;
    try {
      await deleteDoc(doc(db, `users/${profile.uid}/budgets`, id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Budget Management</h2>
          <p className="text-gray-400">Set and track monthly limits by category</p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>New Budget</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {budgets.map((budget: any) => {
          const spent = transactions
            .filter((tx: any) => tx.type === 'expense' && tx.category === budget.category && tx.date.startsWith(currentMonth))
            .reduce((acc: number, tx: any) => acc + tx.amount, 0);
          
          const percent = Math.min(Math.round((spent / budget.amount) * 100), 100);
          const remaining = budget.amount - spent;

          return (
            <motion.div 
              key={budget.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#141414] border border-[#1F1F1F] p-6 rounded-2xl space-y-4 shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                    <PieChart size={20} />
                  </div>
                  <div>
                    <h4 className="text-white font-bold">{budget.category}</h4>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">{format(new Date(), 'MMMM yyyy')}</p>
                  </div>
                </div>
                <button 
                  onClick={() => deleteBudget(budget.id)}
                  className="text-gray-600 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 font-medium">Progress</span>
                  <span className="text-white font-bold">{percent}%</span>
                </div>
                <div className="h-2 w-full bg-[#1F1F1F] rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    className={`h-full ${percent > 90 ? 'bg-red-500' : percent > 70 ? 'bg-yellow-500' : 'bg-orange-500'}`}
                  />
                </div>
                <div className="flex justify-between items-end pt-2">
                   <div>
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-tighter">Spent</p>
                      <p className="text-sm font-bold text-white">{profile?.currency} {spent.toLocaleString()}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-tighter">Budget</p>
                      <p className="text-sm font-bold text-gray-400">{profile?.currency} {budget.amount.toLocaleString()}</p>
                   </div>
                </div>
                {remaining < 0 && (
                  <p className="text-xs text-red-500 font-medium pt-2">Overspent by {profile?.currency} {Math.abs(remaining).toLocaleString()}!</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {budgets.length === 0 && (
        <div className="py-20 text-center text-gray-500 border border-dashed border-[#1F1F1F] rounded-2xl">
           No budgets set for this month.
        </div>
      )}

      {/* Add Budget Modal */}
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
              
              <h3 className="text-xl font-bold mb-6">Set New Budget</h3>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Category</label>
                  <select 
                    required
                    className="w-full bg-[#1F1F1F] border border-[#2F2F2F] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors appearance-none"
                    {...register('category')}
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Limit Amount</label>
                  <input 
                    required
                    type="number" 
                    className="w-full bg-[#1F1F1F] border border-[#2F2F2F] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                    {...register('amount')}
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors mt-6"
                >
                  Create Budget
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
