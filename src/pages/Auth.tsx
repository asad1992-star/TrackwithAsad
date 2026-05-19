import React from 'react';
import { signInWithGoogle } from '../lib/firebase';
import { useAuth } from '../components/AuthProvider';
import { Navigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Wallet } from 'lucide-react';

export const Auth = () => {
  const { user } = useAuth();

  if (user) return <Navigate to="/" />;

  return (
    <div className="h-screen w-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#1a1a1a,transparent)] pointer-events-none opacity-50" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#141414] border border-[#1F1F1F] rounded-2xl p-10 relative z-10 shadow-2xl"
      >
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.3)]">
            <Wallet size={32} className="text-white" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white">trackwithAsad</h1>
            <p className="text-gray-400">Master your finances with premium tracking and AI insights.</p>
          </div>

          <button 
            onClick={signInWithGoogle}
            className="w-full h-14 bg-white hover:bg-gray-100 text-black font-semibold rounded-xl flex items-center justify-center space-x-3 transition-all duration-200"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            <span>Continue with Google</span>
          </button>
          
          <p className="text-xs text-gray-500">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
