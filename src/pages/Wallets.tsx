import React, { useState } from 'react';
import { useFinanceData } from '../hooks/useFinanceData';
import { useAuth } from '../components/AuthProvider';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, X, Wallet, ArrowRightLeft, CreditCard, Landmark, Wallet2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

export const Wallets = () => {
  const { profile } = useAuth();
  const { wallets } = useFinanceData();
  const [showAddForm, setShowAddForm] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  const onSubmit = async (data: any) => {
    if (!profile) return;
    try {
      await addDoc(collection(db, `users/${profile.uid}/wallets`), {
        ...data,
        balance: Number(data.balance),
        createdAt: serverTimestamp(),
      });
      reset();
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteWallet = async (id: string) => {
    if (!profile) return;
    if (confirm('Delete this account? This will remove balance records.')) {
      try {
        await deleteDoc(doc(db, `users/${profile.uid}/wallets`, id));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'bank': return Landmark;
      case 'easypaisa': return Wallet2;
      case 'jazzcash': return CreditCard;
      default: return Wallet;
    }
  };

  const totalBalance = wallets.reduce((acc: number, w: any) => acc + w.balance, 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Accounts & Wallets</h2>
          <p className="text-gray-400">Manage your cash, bank, and mobile wallets</p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>New Account</span>
        </button>
      </div>

      <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-8 rounded-3xl text-white shadow-xl flex justify-between items-center relative overflow-hidden">
         <div className="relative z-10">
            <p className="text-orange-100 text-sm font-medium uppercase tracking-widest mb-2">Net Worth</p>
            <h3 className="text-4xl font-bold">{profile?.currency} {totalBalance.toLocaleString()}</h3>
         </div>
         <div className="absolute right-[-20px] bottom-[-20px] text-white/10 rotate-12">
            <Wallet size={160} />
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {wallets.map((wallet: any) => {
          const Icon = getIcon(wallet.type);
          return (
            <motion.div 
              key={wallet.id}
              whileHover={{ scale: 1.02 }}
              className="bg-[#141414] border border-[#1F1F1F] p-6 rounded-2xl space-y-4 hover:border-orange-500/30 transition-all flex flex-col justify-between"
            >
              <div className="flex justify-between items-start">
                 <div className="p-3 bg-white/5 rounded-xl text-gray-400">
                    <Icon size={24} />
                 </div>
                 <button onClick={() => deleteWallet(wallet.id)} className="text-gray-600 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                 </button>
              </div>
              <div className="space-y-1">
                 <h4 className="text-lg font-bold text-white">{wallet.name}</h4>
                 <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">{wallet.type}</p>
              </div>
              <div className="pt-4 border-t border-white/5 mt-4">
                 <p className="text-[10px] text-gray-500 uppercase font-bold">Balance</p>
                 <p className="text-xl font-bold text-white">{profile?.currency} {wallet.balance.toLocaleString()}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {wallets.length === 0 && (
         <div className="py-20 text-center text-gray-500 border border-dashed border-[#1F1F1F] rounded-2xl">
            Add your first account to start tracking wealth.
         </div>
      )}

      {/* Add Wallet Modal */}
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
              
              <h3 className="text-xl font-bold mb-6">Create New Account</h3>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Account Name</label>
                  <input required className="w-full bg-[#1F1F1F] border border-[#2F2F2F] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500" {...register('name')} placeholder="e.g. Current Account, My Cash" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Initial Balance</label>
                    <input required type="number" step="0.01" className="w-full bg-[#1F1F1F] border border-[#2F2F2F] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500" {...register('balance')} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Type</label>
                    <select required className="w-full bg-[#1F1F1F] border border-[#2F2F2F] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 appearance-none" {...register('type')}>
                       <option value="cash">Cash</option>
                       <option value="bank">Bank</option>
                       <option value="easypaisa">Easypaisa</option>
                       <option value="jazzcash">JazzCash</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors mt-6">Create Account</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
