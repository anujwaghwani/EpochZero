import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Building2, TrendingUp, DollarSign } from 'lucide-react';

export default function ExecOverview() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBudgets = async () => {
      const { data: budgetsRes, error } = await supabase
        .from('budgets')
        .select(`
          *,
          departments ( name, manager_id, profiles!departments_manager_id_fkey(full_name) )
        `)
        .eq('is_active', true);
      
      if (budgetsRes) setData(budgetsRes);
      setLoading(false);
    };
    fetchBudgets();
  }, []);

  if (loading) return <div className="text-center py-12 text-slate-500 animate-pulse">Loading company overview...</div>;

  const totalAllocated = data.reduce((acc, curr) => acc + Number(curr.total_allocated), 0);
  const totalSpent = data.reduce((acc, curr) => acc + Number(curr.total_spent), 0);
  const overallPercentage = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <DollarSign className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-500 mb-1 uppercase tracking-wider">Total Allocation</p>
            <p className="text-4xl font-bold text-slate-900">${totalAllocated.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex items-center gap-6 relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0 z-10">
            <TrendingUp className="w-8 h-8" />
          </div>
          <div className="flex-1 z-10">
            <p className="text-sm font-medium text-slate-500 mb-1 uppercase tracking-wider">Total Spent</p>
            <p className="text-4xl font-bold text-slate-900">${totalSpent.toLocaleString()}</p>
          </div>
          {/* Subtle background progress bar for overall spend */}
          <div className="absolute bottom-0 left-0 h-1 bg-slate-100 w-full">
            <div className={`h-1 ${totalSpent > totalAllocated ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(100, overallPercentage)}%`}}></div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-6">Department Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map(budget => {
            const spent = Number(budget.total_spent);
            const allocated = Number(budget.total_allocated);
            const percentage = allocated > 0 ? (spent / allocated) * 100 : 0;
            const isOverBudget = spent > allocated;

            return (
              <div key={budget.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all hover:border-indigo-100 group">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-indigo-50 transition-colors">
                    <Building2 className="w-5 h-5 text-slate-500 group-hover:text-indigo-600 transition-colors" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg">{budget.departments?.name}</h3>
                </div>
                
                <div className="space-y-5">
                  <div className="flex justify-between items-center text-sm pb-4 border-b border-slate-100">
                    <span className="text-slate-500">Manager</span>
                    <span className="font-medium text-slate-900 bg-slate-50 px-2.5 py-1 rounded-md">{budget.departments?.profiles?.full_name || 'Unassigned'}</span>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-semibold text-slate-900">${spent.toLocaleString()}</span>
                      <span className="text-slate-500">${allocated.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className={`h-2.5 rounded-full transition-all duration-1000 ease-out ${isOverBudget ? 'bg-red-500' : 'bg-indigo-500'}`} 
                        style={{ width: `${Math.min(100, percentage)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <p className={`text-xs font-medium ${isOverBudget ? 'text-red-600' : 'text-slate-500'}`}>
                        {percentage.toFixed(1)}% utilized
                      </p>
                      {isOverBudget && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded uppercase tracking-wide">Over Budget</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
