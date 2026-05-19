import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  PieChart, 
  Target, 
  Settings, 
  Wallet,
  Calendar,
  CreditCard,
  FileText
} from 'lucide-react';
import { useAuth } from './AuthProvider';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: ArrowUpRight, label: 'Income', path: '/income' },
  { icon: ArrowDownLeft, label: 'Expenses', path: '/expenses' },
  { icon: PieChart, label: 'Budgets', path: '/budgets' },
  { icon: Target, label: 'Savings', path: '/savings' },
  { icon: FileText, label: 'Reports', path: '/reports' },
  { icon: CreditCard, label: 'Subscriptions', path: '/subscriptions' },
  { icon: Wallet, label: 'Wallets', path: '/wallets' },
  { icon: Calendar, label: 'Calendar', path: '/calendar' },
];

export const Sidebar = () => {
  const { profile } = useAuth();
  
  return (
    <div className="w-64 h-screen bg-[#0A0A0A] border-r border-[#1F1F1F] flex flex-col fixed left-0 top-0 z-50">
      <div className="p-6">
        <h1 className="text-xl font-bold bg-gradient-to-r from-orange-500 to-orange-300 bg-clip-text text-transparent">
          trackwithAsad
        </h1>
      </div>

      <nav className="flex-1 px-4 space-y-2 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-gray-400 hover:text-white hover:bg-[#1F1F1F]",
              isActive && "bg-orange-500/10 text-orange-500 font-medium"
            )}
          >
            <item.icon size={20} />
            <span className="text-sm">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-[#1F1F1F] space-y-2">
        <NavLink
            to="/settings"
            className={({ isActive }) => cn(
              "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-gray-400 hover:text-white hover:bg-[#1F1F1F]",
              isActive && "bg-orange-500/10 text-orange-500 font-medium"
            )}
          >
          <Settings size={20} />
          <span className="text-sm">Settings</span>
        </NavLink>
      </div>
    </div>
  );
};
