import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { useAuth } from './AuthProvider';
import { Navigate, Outlet } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const Layout = () => {
  const { user, profile, loading } = useAuth();
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const quickAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile) return;
    const formData = new FormData(e.currentTarget);
    const amountStr = formData.get('amount') as string;
    const amount = parseFloat(amountStr);
    
    if (isNaN(amount)) {
      alert("Please enter a valid amount");
      return;
    }

    try {
      await addDoc(collection(db, `users/${profile.uid}/transactions`), {
        amount,
        category: formData.get('category'),
        type: formData.get('type'),
        date: new Date().toISOString().split('T')[0],
        notes: 'Quick add',
        createdAt: serverTimestamp(),
      });
      setShowQuickAdd(false);
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#0A0A0A] text-white">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
    </div>
  );

  if (!user) return <Navigate to="/auth" />;

  return (
    <div className="flex bg-[#0A0A0A] min-h-screen text-white font-sans">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 relative">
        <Outlet />

        {/* Floating Add Button */}
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowQuickAdd(true)}
          className="fixed bottom-8 right-8 w-14 h-14 bg-orange-500 rounded-full shadow-[0_0_20px_rgba(249,115,22,0.4)] flex items-center justify-center text-white z-[60] hover:bg-orange-600 transition-colors"
        >
          <Plus size={28} />
        </motion.button>

        {/* Quick Add Modal */}
        <AnimatePresence>
          {showQuickAdd && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-[#141414] border border-[#1F1F1F] rounded-2xl w-full max-w-sm p-8 relative shadow-2xl"
              >
                <button 
                  onClick={() => setShowQuickAdd(false)}
                  className="absolute right-6 top-6 text-gray-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
                <h3 className="text-xl font-bold mb-6">Quick Add</h3>
                <form onSubmit={quickAdd} className="space-y-4">
                  <div className="flex bg-[#1F1F1F] p-1 rounded-xl mb-4">
                    <label className="flex-1">
                      <input type="radio" name="type" value="income" className="hidden peer" defaultChecked />
                      <div className="text-center py-2 rounded-lg text-sm font-bold cursor-pointer transition-all text-gray-500 peer-checked:bg-green-500 peer-checked:text-white">Income</div>
                    </label>
                    <label className="flex-1">
                      <input type="radio" name="type" value="expense" className="hidden peer" />
                      <div className="text-center py-2 rounded-lg text-sm font-bold cursor-pointer transition-all text-gray-500 peer-checked:bg-red-500 peer-checked:text-white">Expense</div>
                    </label>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Amount</label>
                    <input required name="amount" type="number" step="0.01" className="w-full bg-[#1F1F1F] border border-[#2F2F2F] rounded-xl px-4 py-3 text-sm focus:border-orange-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Category</label>
                    <input required name="category" className="w-full bg-[#1F1F1F] border border-[#2F2F2F] rounded-xl px-4 py-3 text-sm focus:border-orange-500 outline-none" placeholder="Food, Rent, Salary..." />
                  </div>
                  <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors mt-4">Add Transaction</button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};
