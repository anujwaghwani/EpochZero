import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Check, X, AlertTriangle, Info } from 'lucide-react';

export default function ManagerView({ profile }) {
  const [expenses, setExpenses] = useState([]);
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const [expensesRes, budgetRes] = await Promise.all([
      supabase
        .from('expenses')
        .select('*, profiles(full_name)')
        .eq('department_id', profile.department_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true }),
      supabase
        .from('budgets')
        .select('*')
        .eq('department_id', profile.department_id)
        .eq('is_active', true)
        .single()
    ]);
    
    if (expensesRes.data) setExpenses(expensesRes.data);
    if (budgetRes.data) setBudget(budgetRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (expenseId) => {
    const comments = window.prompt("Approval comments (optional):");
    if (comments === null) return;
    
    const { error } = await supabase.rpc('approve_expense_transaction', {
      p_expense_id: expenseId,
      p_comments: comments || 'Approved'
    });
    
    if (error) alert("Error approving: " + error.message);
    else fetchData();
  };

  const handleReject = async (expense) => {
    const comments = window.prompt("Reason for rejection:");
    if (comments === null) return;
    
    await supabase.from('expenses').update({ status: 'rejected' }).eq('id', expense.id);
    await supabase.from('approval_logs').insert({
      expense_id: expense.id,
      approver_id: profile.id,
      action: 'rejected',
      comments
    });
    fetchData();
  };

  if (loading) return <div className="text-center py-12 text-slate-500 animate-pulse">Loading approval queue...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          Department Budget Overview
        </h2>
        {budget ? (
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-slate-700">Spent: ${Number(budget.total_spent).toLocaleString()}</span>
              <span className="text-slate-500">Allocated: ${Number(budget.total_allocated).toLocaleString()}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${budget.total_spent > budget.total_allocated ? 'bg-red-500' : 'bg-indigo-500'}`} 
                style={{ width: `${Math.min(100, (budget.total_spent / budget.total_allocated) * 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-right mt-2 text-slate-500">{((budget.total_spent / budget.total_allocated) * 100).toFixed(1)}% utilized</p>
          </div>
        ) : (
          <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-lg border border-slate-100">No active budget found for your department.</p>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Pending Approvals</h3>
        {expenses.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center text-slate-500 flex flex-col items-center gap-3">
            <Check className="w-8 h-8 text-emerald-400" />
            <p>You're all caught up! No pending expenses to review.</p>
          </div>
        ) : (
          expenses.map(exp => {
            const potentialTotal = Number(budget?.total_spent || 0) + Number(exp.amount);
            const isOverBudget = budget && potentialTotal > Number(budget.total_allocated);
            
            return (
              <div key={exp.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center hover:border-indigo-100 transition-colors">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-semibold text-slate-900">{exp.profiles?.full_name}</span>
                    <span className="text-sm text-slate-500">{new Date(exp.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-slate-800 text-lg mb-1">{exp.description}</p>
                  <p className="text-2xl font-bold text-indigo-600">${Number(exp.amount).toFixed(2)}</p>
                </div>
                
                <div className="flex flex-col items-end gap-4 w-full md:w-auto">
                  {budget && (
                    <div className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg border w-full md:w-auto ${isOverBudget ? 'bg-red-50 text-red-700 border-red-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                      {isOverBudget ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <Info className="w-4 h-4 shrink-0" />}
                      <span>Approving pushes total to <strong>${potentialTotal.toLocaleString()}</strong> / ${Number(budget.total_allocated).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex gap-3 w-full md:w-auto">
                    <button onClick={() => handleReject(exp)} className="flex-1 md:flex-none px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-rose-600 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors">
                      <X className="w-4 h-4" /> Reject
                    </button>
                    <button onClick={() => handleApprove(exp.id)} className="flex-1 md:flex-none px-5 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg flex items-center justify-center gap-2 font-medium shadow-sm transition-all">
                      <Check className="w-4 h-4" /> Approve
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
