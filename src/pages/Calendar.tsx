import React, { useState } from 'react';
import { useFinanceData } from '../hooks/useFinanceData';
import { useAuth } from '../components/AuthProvider';
import { motion } from 'motion/react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isToday
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

export const Calendar = () => {
  const { profile } = useAuth();
  const { transactions } = useFinanceData();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const currency = profile?.currency || 'Rs';

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Expense Calendar</h2>
          <p className="text-gray-400">View your daily spending patterns</p>
        </div>
        <div className="flex items-center space-x-4 bg-[#141414] border border-[#1F1F1F] p-2 rounded-xl">
           <button 
             onClick={prevMonth}
             className="p-2 hover:bg-[#1F1F1F] rounded-lg text-gray-400 hover:text-white transition-colors"
           >
             <ChevronLeft size={20} />
           </button>
           <h3 className="text-sm font-bold min-w-[120px] text-center">
             {format(currentMonth, 'MMMM yyyy')}
           </h3>
           <button 
             onClick={nextMonth}
             className="p-2 hover:bg-[#1F1F1F] rounded-lg text-gray-400 hover:text-white transition-colors"
           >
             <ChevronRight size={20} />
           </button>
        </div>
      </div>

      <div className="bg-[#141414] border border-[#1F1F1F] rounded-2xl overflow-hidden shadow-2xl">
        <div className="grid grid-cols-7 border-b border-[#1F1F1F] bg-[#1A1A1A]">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 min-h-[600px]">
          {calendarDays.map((day, idx) => {
            const dayTransactions = transactions.filter((tx: any) => 
               isSameDay(new Date(tx.date), day)
            );
            
            const income = dayTransactions
              .filter((tx: any) => tx.type === 'income')
              .reduce((acc: number, tx: any) => acc + tx.amount, 0);
            
            const expenses = dayTransactions
              .filter((tx: any) => tx.type === 'expense')
              .reduce((acc: number, tx: any) => acc + tx.amount, 0);

            const isCurrentMonth = isSameMonth(day, monthStart);

            return (
              <div 
                key={idx}
                className={`border-r border-b border-[#1F1F1F] p-2 min-h-[100px] transition-colors
                  ${!isCurrentMonth ? 'bg-[#0A0A0A]/30 opacity-20' : 'hover:bg-white/5'}
                  ${isToday(day) ? 'bg-orange-500/5' : ''}
                `}
              >
                <div className="flex justify-between items-start mb-2">
                   <span className={`text-xs font-bold ${isToday(day) ? 'bg-orange-500 text-white w-5 h-5 flex items-center justify-center rounded-full' : 'text-gray-500'}`}>
                      {format(day, 'd')}
                   </span>
                </div>
                
                <div className="space-y-1">
                   {income > 0 && (
                     <div className="text-[10px] bg-green-500/10 text-green-500 px-1 py-0.5 rounded font-bold overflow-hidden whitespace-nowrap">
                        +{currency}{income.toLocaleString()}
                     </div>
                   )}
                   {expenses > 0 && (
                     <div className="text-[10px] bg-red-500/10 text-red-500 px-1 py-0.5 rounded font-bold overflow-hidden whitespace-nowrap">
                        -{currency}{expenses.toLocaleString()}
                     </div>
                   )}
                </div>

                <div className="mt-2 space-y-0.5">
                   {dayTransactions.slice(0, 2).map((tx: any) => (
                     <div key={tx.id} className="text-[8px] text-gray-500 truncate font-medium">
                        • {tx.category}
                     </div>
                   ))}
                   {dayTransactions.length > 2 && (
                     <div className="text-[8px] text-gray-600 font-bold">
                        +{dayTransactions.length - 2} more
                     </div>
                   )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
