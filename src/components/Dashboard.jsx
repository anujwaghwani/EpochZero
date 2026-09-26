import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, PlusCircle, CheckCircle, Wallet, TrendingUp, AlertOctagon, LayoutDashboard, Settings } from 'lucide-react';

export default function Dashboard({ profile }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setToken(data.session.access_token);
      }
    });
  }, []);

  useEffect(() => {
    if (token) {
      fetchExpenses();
      if (profile.role === 'manager' || profile.role === 'admin') {
        fetchBudget();
      }
    }
  }, [token, profile.role]);

  const fetchExpenses = async () => {
    try {
      const res = await fetch('/api/expenses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch expenses');
      const data = await res.json();
      setExpenses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBudget = async () => {
    const { data } = await supabase.from('budgets').select('*').eq('department_id', profile.department_id || '00000000-0000-0000-0000-000000000000').single();
    if (data) setBudget(data);
  };

  const handleFreezeToggle = async (budgetId, currentStatus) => {
    await supabase.from('budgets').update({ is_active: !currentStatus }).eq('id', budgetId);
    fetchExpenses();
  };

  const submitExpense = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ amount, description })
      });
      if (!res.ok) throw new Error('Failed to submit expense');
      setAmount('');
      setDescription('');
      fetchExpenses();
    } catch (err) {
      alert(err.message);
    }
  };

  const approveExpense = async (expenseId) => {
    try {
      const res = await fetch(`/api/expenses/${expenseId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ comments: 'Approved dynamically' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      fetchExpenses();
      fetchBudget();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="h-64 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-500" /></div>;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Decorative top gradient for Dashboard */}
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-indigo-50/80 to-transparent pointer-events-none -z-10" />

      {profile.role === 'employee' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="glass-panel p-8 rounded-3xl sticky top-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                  <Wallet className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Request Expense</h2>
              </div>
              <form onSubmit={submitExpense} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Amount ($)</label>
                  <input type="number" step="0.01" required placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none font-medium text-slate-900 text-lg" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Description</label>
                  <input type="text" required placeholder="e.g. Client Dinner" value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none" />
                </div>
                <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 transform hover:-translate-y-0.5 transition-all">
                  <PlusCircle className="w-5 h-5" /> Submit Request
                </button>
              </form>
            </div>
          </div>
          
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-indigo-500" /> 
                Recent Activity
              </h2>
            </div>
            
            <div className="space-y-4">
              {expenses.length === 0 ? (
                <div className="glass-panel p-12 rounded-3xl text-center text-slate-500 border border-dashed border-slate-300">
                  You have no expense requests yet.
                </div>
              ) : expenses.map(exp => (
                <div key={exp.id} className="glass-panel p-5 rounded-3xl flex items-center justify-between group hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg
                      ${exp.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                      ${Math.round(exp.amount)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-lg">{exp.description}</p>
                      <p className="text-sm text-slate-500">Requested on {new Date(exp.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest
                      ${exp.status === 'approved' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/30' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-500/30'}`}>
                      {exp.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {profile.role === 'manager' && (
        <div className="space-y-8">
          {budget && (
            <div className="glass-panel p-8 rounded-3xl flex items-center justify-between overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Wallet className="w-32 h-32" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Department Budget</p>
                <div className="flex items-end gap-3">
                  <h3 className="text-4xl font-black text-slate-900">${budget.total_spent}</h3>
                  <span className="text-lg text-slate-500 mb-1 font-medium">/ ${budget.total_allocated}</span>
                </div>
              </div>
              <div className="text-right z-10">
                {budget.is_active === false ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-100 text-rose-700 rounded-full font-bold text-sm">
                    <AlertOctagon className="w-4 h-4" /> BUDGET FROZEN
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full font-bold text-sm">
                    <CheckCircle className="w-4 h-4" /> ACTIVE
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <LayoutDashboard className="w-6 h-6 text-indigo-500" />
              Action Required
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {expenses.length === 0 ? <p className="text-slate-500 col-span-2">No pending approvals.</p> : expenses.map(exp => (
                <div key={exp.id} className="glass-panel p-6 rounded-3xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-bl-full -z-10" />
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">{exp.profiles?.full_name}</p>
                      <p className="font-bold text-slate-900 text-lg leading-tight">{exp.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-slate-900">${exp.amount}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => approveExpense(exp.id)} 
                    className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <CheckCircle className="w-5 h-5" /> Approve Request
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {profile.role === 'admin' && (
        <div className="glass-panel p-10 rounded-3xl text-center max-w-2xl mx-auto mt-12">
          <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Settings className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-4">Admin Command Center</h2>
          <p className="text-slate-500 text-lg mb-8 leading-relaxed">
            Welcome to the master control panel. From here, you can freeze budgets and oversee all global department activity.
          </p>
          <button 
            className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold py-4 px-8 rounded-2xl shadow-lg shadow-rose-500/30 transform hover:-translate-y-0.5 transition-all text-lg"
            onClick={() => alert('Toggle Logic Linked - Demo Action')}
          >
            Mock Toggle Global Freeze
          </button>
        </div>
      )}
    </div>
  );
}
