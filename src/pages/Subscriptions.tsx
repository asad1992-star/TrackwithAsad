import React, { useState } from 'react';
import { useFinanceData } from '../hooks/useFinanceData';
import { useAuth } from '../components/AuthProvider';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, X, CreditCard, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';

export const Subscriptions = () => {
  const { profile } = useAuth();
  const { subscriptions } = useFinanceData();
  const [showAddForm, setShowAddForm] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  const onSubmit = async (data: any) => {
    if (!profile) return;
    try {
      await addDoc(collection(db, `users/${profile.uid}/subscriptions`), {
        ...data,
        amount: Number(data.amount),
        createdAt: serverTimestamp(),
      });
      reset();
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteSub = async (id: string) => {
    if (!profile) return;
    try {
      await deleteDoc(doc(db, `users/${profile.uid}/subscriptions`, id));
    } catch (err) {
      console.error(err);
    }
  };

  const totalMonthly = subscriptions.reduce((acc: number, sub: any) => {
    const amt = sub.billingCycle === 'yearly' ? sub.amount / 12 : sub.amount;
    return acc + amt;
  }, 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Subscription Tracker</h2>
          <p className="text-gray-400">Manage your recurring services and bills</p>
        </div>
        <button 
          onClick={() => setShowAddForm(prev => !prev)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center space-x-2"
        >
          {showAddForm ? <X size={18} /> : <Plus size={18} />}
          <span>{showAddForm ? 'Close' : 'Add Subscription'}</span>
        </button>
      </div>

      <div className="bg-[#141414] border border-[#1F1F1F] p-6 rounded-2xl flex justify-between items-center">
         <div>
            <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">Total Monthly Cost</p>
            <h3 className="text-2xl font-bold text-orange-500">{profile?.currency} {totalMonthly.toFixed(2)}</h3>
         </div>
         <div className="p-3 bg-orange-500/10 rounded-2xl text-orange-500">
            <RotateCcw size={24} />
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subscriptions.map((sub: any) => (
          <motion.div 
            key={sub.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#141414] border border-[#1F1F1F] p-6 rounded-2xl space-y-4 hover:border-orange-500/30 transition-colors group"
          >
            <div className="flex justify-between items-start">
               <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white">
                  <CreditCard size={20} />
               </div>
               <button onClick={() => deleteSub(sub.id)} className="text-gray-600 hover:text-red-500 transition-all">
                  <Trash2 size={16} />
               </button>
            </div>
            <div>
              <h4 className="font-bold text-lg">{sub.name}</h4>
              <p className="text-xs text-gray-500 uppercase font-bold">{sub.billingCycle}</p>
            </div>
            <div className="pt-2 border-t border-white/5 flex justify-between items-end">
               <div>
                  <p className="text-[10px] text-gray-500 uppercase font-bold">Price</p>
                  <p className="font-bold">{profile?.currency} {sub.amount.toLocaleString()}</p>
               </div>
               <div className="text-right">
                  <p className="text-[10px] text-gray-400 font-medium">Next: {sub.nextBillingDate || 'TBD'}</p>
               </div>
            </div>
          </motion.div>
        ))}
      </div>

      {subscriptions.length === 0 && (
         <div className="py-20 text-center text-gray-500 border border-dashed border-[#1F1F1F] rounded-2xl">
            You don't have any subscriptions yet.
         </div>
      )}

      {/* Add Subscription Modal */}
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
              
              <h3 className="text-xl font-bold mb-6">Add New Subscription</h3>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Name</label>
                  <input required className="w-full bg-[#1F1F1F] border border-[#2F2F2F] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500" {...register('name')} placeholder="Netflix, Spotify, etc." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Amount</label>
                    <input required type="number" step="0.01" className="w-full bg-[#1F1F1F] border border-[#2F2F2F] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500" {...register('amount')} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Cycle</label>
                    <select required className="w-full bg-[#1F1F1F] border border-[#2F2F2F] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 appearance-none" {...register('billingCycle')}>
                       <option value="monthly">Monthly</option>
                       <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Next Billing Date</label>
                  <input type="date" className="w-full bg-[#1F1F1F] border border-[#2F2F2F] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500" {...register('nextBillingDate')} />
                </div>
                <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors mt-6">Save Subscription</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
