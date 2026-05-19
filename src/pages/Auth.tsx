import React from 'react';
import { useAuth } from '../components/AuthProvider';
import { Navigate } from 'react-router-dom';
import { Wallet } from 'lucide-react';

export const Auth = () => {
  const { user, loading } = useAuth();

  if (!loading && user) return <Navigate to="/" />;

  return (
    <div className="h-screen w-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center space-y-6 text-center">
          <div className="w-20 h-20 bg-orange-500 rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.4)] mb-2">
              <Wallet size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">trackwithAsad</h1>
          <p className="text-gray-400 max-w-xs">Initializing your secure financial workspace...</p>
      </div>
    </div>
  );
};

