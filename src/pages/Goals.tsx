import React, { useState } from 'react';
import { useFinanceData } from '../hooks/useFinanceData';
import { useAuth } from '../components/AuthProvider';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, X, Target, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';

export const Goals = () => {
  const { profile } = useAuth();
  const { goals } = useFinanceData();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState<any>(null);

  const { register, handleSubmit, reset } = useForm();
  const { register: registerUpdate, handleSubmit: handleSubmitUpdate, reset: resetUpdate } = useForm();

  const onSubmit = async (data: any) => {
    if (!profile) return;
    try {
      await addDoc(collection(db, `users/${profile.uid}/goals`), {
        name: data.name,
        targetAmount: Number(data.targetAmount),
        currentAmount: Number(data.currentAmount || 0),
        deadline: data.deadline,
        createdAt: serverTimestamp(),
      });
      reset();
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
    }
  };

  const onUpdate = async (data: any) => {
    if (!profile || !showUpdateForm) return;
    try {
      const goalRef = doc(db, `users/${profile.uid}/goals`, showUpdateForm.id);
      await updateDoc(goalRef, {
        currentAmount: Number(data.amount)
      });
      resetUpdate();
      setShowUpdateForm(null);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteGoal = async (id: string) => {
    if (!profile) return;
    try {
      await deleteDoc(doc(db, `users/${profile.uid}/goals`, id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Savings Goals</h2>
          <p className="text-gray-400">Track progress towards your dreams</p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>New Goal</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.map((goal: any) => {
          const percent = Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);
          const remaining = goal.targetAmount - goal.currentAmount;

          return (
            <motion.div 
              key={goal.id}
              whileHover={{ y: -5 }}
              className="bg-[#141414] border border-[#1F1F1F] p-6 rounded-2xl space-y-6 shadow-lg group"
            >
              <div className="flex justify-between items-start">
                 <div className="p-3 bg-orange-500/10 rounded-2xl text-orange-500">
                    <Target size={24} />
                 </div>
                 <button 
                    onClick={() => deleteGoal(goal.id)}
                    className="text-gray-600 hover:text-red-500 transition-colors"
                  >
                  <Trash2 size={16} />
                </button>
              </div>

              <div>
                <h4 className="text-xl font-bold text-white">{goal.name}</h4>
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-bold">Target achieved: {percent}%</p>
              </div>

              <div className="space-y-2">
                <div className="h-2 w-full bg-[#1F1F1F] rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    className="h-full bg-orange-500"
                  />
                </div>
                <div className="flex justify-between py-2 border-t border-white/5 mt-4">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Saved</p>
                    <p className="text-sm font-bold text-white">{profile?.currency} {goal.currentAmount.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Goal</p>
                    <p className="text-sm font-bold text-gray-400">{profile?.currency} {goal.targetAmount.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowUpdateForm(goal)}
                className="w-full bg-[#1F1F1F] hover:bg-[#2F2F2F] text-gray-300 py-3 rounded-xl text-sm font-medium transition-colors border border-white/5"
              >
                Add Savings
              </button>
            </motion.div>
          );
        })}
      </div>

      {goals.length === 0 && (
        <div className="py-20 text-center text-gray-500 bg-[#0F0F0F] rounded-2xl border border-dashed border-[#1F1F1F]">
           Ready to save for something big?
        </div>
      )}

      {/* Add Goal Modal */}
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
              
              <h3 className="text-xl font-bold mb-6">Create Saving Goal</h3>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Goal Name</label>
                  <input required className="w-full bg-[#1F1F1F] border border-[#2F2F2F] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500" {...register('name')} placeholder="e.g. Dream House, Vacation" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Target Amount</label>
                    <input required type="number" className="w-full bg-[#1F1F1F] border border-[#2F2F2F] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500" {...register('targetAmount')} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Initial Savings</label>
                    <input type="number" className="w-full bg-[#1F1F1F] border border-[#2F2F2F] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500" {...register('currentAmount')} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Deadline</label>
                  <input type="date" className="w-full bg-[#1F1F1F] border border-[#2F2F2F] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500" {...register('deadline')} />
                </div>
                <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors mt-6">Create Goal</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Update Savings Modal */}
      <AnimatePresence>
        {showUpdateForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#141414] border border-[#1F1F1F] rounded-2xl w-full max-w-sm p-8 relative shadow-2xl"
            >
              <button 
                onClick={() => setShowUpdateForm(null)}
                className="absolute right-6 top-6 text-gray-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
              
              <h3 className="text-xl font-bold mb-2">Add to {showUpdateForm.name}</h3>
              <p className="text-sm text-gray-500 mb-6 font-medium uppercase tracking-tight">Current: {profile?.currency} {showUpdateForm.currentAmount.toLocaleString()}</p>
              
              <form onSubmit={handleSubmitUpdate(onUpdate)} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Total Amount Saved</label>
                  <input required type="number" className="w-full bg-[#1F1F1F] border border-[#2F2F2F] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500" {...registerUpdate('amount')} defaultValue={showUpdateForm.currentAmount} />
                </div>
                <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors mt-6">Update Goal</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
