import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../components/AuthProvider';

export const useFinanceData = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any>({
    transactions: [],
    budgets: [],
    goals: [],
    wallets: [],
    subscriptions: [],
    loading: true
  });

  useEffect(() => {
    if (!user) return;

    const baseRef = `users/${user.uid}`;
    
    const unsubTx = onSnapshot(query(collection(db, `${baseRef}/transactions`), orderBy('date', 'desc')), (snap) => {
      const txs = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          amount: Number(data.amount) || 0,
          date: typeof data.date === 'string' ? data.date : new Date().toISOString().split('T')[0]
        };
      });
      setData((prev: any) => ({ ...prev, transactions: txs }));
    }, (err) => console.error("Tx Load Error:", err));

    const unsubBudgets = onSnapshot(collection(db, `${baseRef}/budgets`), (snap) => {
      const bgts = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          limit: Number(data.limit || data.amount) || 0
        };
      });
      setData((prev: any) => ({ ...prev, budgets: bgts }));
    }, (err) => console.error("Budget Load Error:", err));

    const unsubGoals = onSnapshot(collection(db, `${baseRef}/goals`), (snap) => {
      const gls = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          targetAmount: Number(data.targetAmount) || 0,
          currentAmount: Number(data.currentAmount) || 0
        };
      });
      setData((prev: any) => ({ ...prev, goals: gls }));
    }, (err) => console.error("Goal Load Error:", err));

    const unsubSubs = onSnapshot(collection(db, `${baseRef}/subscriptions`), (snap) => {
      const sbs = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          amount: Number(data.amount) || 0
        };
      });
      setData((prev: any) => ({ ...prev, subscriptions: sbs }));
    }, (err) => console.error("Sub Load Error:", err));

    const unsubWallets = onSnapshot(collection(db, `${baseRef}/wallets`), (snap) => {
      const wlts = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          balance: Number(data.balance) || 0
        };
      });
      setData((prev: any) => ({ ...prev, wallets: wlts, loading: false }));
    }, (err) => console.error("Wallet Load Error:", err));

    return () => {
      unsubTx();
      unsubBudgets();
      unsubGoals();
      unsubSubs();
      unsubWallets();
    };
  }, [user]);

  return data;
};
