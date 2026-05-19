import React, { useState } from 'react';
import { useAuth } from '../components/AuthProvider';
import { db, auth } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { User, Shield, Bell, Globe, LogOut, Camera } from 'lucide-react';

export const Settings = () => {
  const { profile, user } = useAuth();
  const [saving, setSaving] = useState(false);

  const updateProfile = async (field: string, value: string) => {
    if (!profile) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        [field]: value
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Settings</h2>
        <p className="text-gray-400">Manage your profile and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-1 space-y-4">
            <div className="bg-[#141414] border border-[#1F1F1F] p-8 rounded-2xl flex flex-col items-center">
               <div className="relative mb-4 group cursor-pointer">
                  <img 
                    src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName}&background=f97316&color=fff`} 
                    alt="Avatar" 
                    className="w-24 h-24 rounded-full border-4 border-[#1F1F1F]" 
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                     <Camera size={20} className="text-white" />
                  </div>
               </div>
               <h3 className="font-bold text-white">{profile?.displayName}</h3>
               <p className="text-sm text-gray-500">{profile?.email}</p>
            </div>

            <nav className="bg-[#141414] border border-[#1F1F1F] rounded-2xl overflow-hidden p-2">
               {[
                 { icon: User, label: 'Profile', active: true },
                 { icon: Globe, label: 'Preferences' },
                 { icon: Bell, label: 'Notifications' },
                 { icon: Shield, label: 'Security' },
               ].map((item) => (
                 <button key={item.label} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${item.active ? 'bg-orange-500/10 text-orange-500' : 'text-gray-400 hover:bg-white/5'}`}>
                   <item.icon size={18} />
                   <span className="text-sm font-medium">{item.label}</span>
                 </button>
               ))}
            </nav>
         </div>

         <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#141414] border border-[#1F1F1F] p-8 rounded-2xl">
               <h3 className="font-bold mb-6 text-gray-400 uppercase tracking-widest text-xs">General Preferences</h3>
               <div className="space-y-6">
                  <div>
                     <label className="text-sm font-medium text-gray-400 block mb-2">Preferred Currency</label>
                     <select 
                       value={profile?.currency || 'Rs'}
                       onChange={(e) => updateProfile('currency', e.target.value)}
                       disabled={saving}
                       className="w-full bg-[#1F1F1F] border border-[#2F2F2F] rounded-xl px-4 py-3 text-sm focus:border-orange-500 outline-none transition-colors"
                     >
                        <option value="Rs">PKR (Rs)</option>
                        <option value="$">USD ($)</option>
                        <option value="€">EUR (€)</option>
                        <option value="£">GBP (£)</option>
                        <option value="₹">INR (₹)</option>
                     </select>
                  </div>
                  <div>
                     <label className="text-sm font-medium text-gray-400 block mb-2">Display Name</label>
                     <input 
                       defaultValue={profile?.displayName}
                       onBlur={(e) => updateProfile('displayName', e.target.value)}
                       className="w-full bg-[#1F1F1F] border border-[#2F2F2F] rounded-xl px-4 py-3 text-sm focus:border-orange-500 outline-none transition-colors"
                     />
                  </div>
               </div>
            </div>

            <div className="bg-[#141414] border border-[#1F1F1F] p-8 rounded-2xl flex justify-between items-center">
               <div>
                  <h4 className="font-bold text-white">Sign Out</h4>
                  <p className="text-sm text-gray-500">Log out of your account on this device</p>
               </div>
               <button 
                 onClick={() => auth.signOut()}
                 className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-6 py-2 rounded-xl text-sm font-bold transition-all"
               >
                 Sign Out
               </button>
            </div>
         </div>
      </div>
    </div>
  );
};
