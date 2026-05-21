import React from 'react';
import { useAuth } from '../components/AuthProvider';
import { Navigate } from 'react-router-dom';
import { Wallet } from 'lucide-react';

export const Auth = () => {
  const { user, loading } = useAuth();

  if (!loading && user) return <Navigate to="/" />;

  return (
    <div className="h-screen w-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#1a1005,transparent_55%)] pointer-events-none opacity-40" />
      <div className="flex flex-col items-center space-y-6 text-center z-10">
        <div className="w-20 h-20 bg-orange-500 rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.4)] mb-2 animate-pulse">
          <Wallet size={32} className="text-white animate-bounce" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">trackwithAsad</h1>
        <p className="text-gray-400 max-w-xs">Initializing your personalized secure workspace...</p>
      </div>
    </div>
  );
};
