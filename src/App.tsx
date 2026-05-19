import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/AuthProvider';
import { Layout } from './components/Layout';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Budgets } from './pages/Budgets';
import { Goals } from './pages/Goals';
import { Reports } from './pages/Reports';
import { Subscriptions } from './pages/Subscriptions';
import { Wallets } from './pages/Wallets';
import { Calendar } from './pages/Calendar';
import { Settings } from './pages/Settings';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0A0A0A] text-white p-6 text-center">
          <h2 className="text-2xl font-bold mb-2">Oops! Something went wrong.</h2>
          <p className="text-gray-400 mb-6 max-w-md">The application encountered an error. This usually happens if there's invalid data or a connection issue.</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-2xl font-bold transition-colors"
          >
            Back to Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="income" element={<Transactions type="income" />} />
              <Route path="expenses" element={<Transactions type="expense" />} />
              <Route path="budgets" element={<Budgets />} />
              <Route path="savings" element={<Goals />} />
              <Route path="reports" element={<Reports />} />
              <Route path="subscriptions" element={<Subscriptions />} />
              <Route path="wallets" element={<Wallets />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
