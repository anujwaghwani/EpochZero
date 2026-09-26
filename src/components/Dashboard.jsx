import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, PlusCircle, CheckCircle, Wallet, TrendingUp, AlertOctagon, LayoutDashboard, Settings, XCircle, FileImage, UploadCloud, AlertTriangle } from 'lucide-react';

export default function Dashboard({ profile }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
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
      if (profile.role === 'manager' || profile.role === 'finance') {
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

  const handleReceiptUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingReceipt(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${profile.id}/${fileName}`;
      
      const { error } = await supabase.storage.from('receipts').upload(filePath, file);
      if (error) throw error;
      
      const { data } = supabase.storage.from('receipts').getPublicUrl(filePath);
      setReceiptUrl(data.publicUrl);
    } catch (err) {
      alert(`Receipt upload failed: ${err.message}. Please ensure the 'receipts' bucket is public and exists.`);
    } finally {
      setUploadingReceipt(false);
    }
  };

  const submitExpense = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ amount, description, receipt_url: receiptUrl })
      });
      if (!res.ok) throw new Error('Failed to submit expense');
      setAmount('');
      setDescription('');
      setReceiptUrl('');
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

  const rejectExpense = async (expenseId) => {
    const reason = window.prompt("Reason for rejection:");
    if (!reason) return; // Cancelled or empty

    try {
      const res = await fetch(`/api/expenses/${expenseId}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      fetchExpenses();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="h-64 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-500" /></div>;

  return (
    <div className="space-y-8 animate-fade-in">
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
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Receipt (Optional)</label>
                  <div className="relative">
                    <input type="file" accept="image/*" onChange={handleReceiptUpload} disabled={uploadingReceipt} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />
                    <div className={`w-full px-4 py-3 border-2 border-dashed rounded-2xl flex items-center justify-center gap-2 transition-all ${receiptUrl ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white/50 border-slate-200 text-slate-500 hover:border-indigo-300'}`}>
                      {uploadingReceipt ? <Loader2 className="w-5 h-5 animate-spin" /> : (receiptUrl ? <CheckCircle className="w-5 h-5" /> : <UploadCloud className="w-5 h-5" />)}
                      <span className="font-medium text-sm">{uploadingReceipt ? 'Uploading...' : (receiptUrl ? 'Receipt Attached' : 'Click to Upload')}</span>
                    </div>
                  </div>
                </div>
                <button type="submit" disabled={uploadingReceipt} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 transform hover:-translate-y-0.5 transition-all">
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
              ) : expenses.map(exp => {
                const rejectionLog = exp.approval_logs?.find(log => log.action === 'rejected');
                return (
                  <div key={exp.id} className="glass-panel p-5 rounded-3xl flex flex-col group hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0
                          ${exp.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : exp.status === 'rejected' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                          ${Math.round(exp.amount)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900 text-lg leading-tight">{exp.description}</p>
                            {exp.receipt_url && <a href={exp.receipt_url} target="_blank" rel="noreferrer" className="text-indigo-500 hover:text-indigo-700" title="View Receipt"><FileImage className="w-4 h-4" /></a>}
                          </div>
                          <p className="text-sm text-slate-500">Requested on {new Date(exp.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest
                          ${exp.status === 'approved' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/30' : exp.status === 'rejected' ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-500/30' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-500/30'}`}>
                          {exp.status}
                        </span>
                      </div>
                    </div>
                    {exp.status === 'rejected' && rejectionLog && (
                      <div className="mt-4 p-3 bg-rose-50/50 rounded-xl border border-rose-100/50 flex gap-3 text-sm">
                        <AlertOctagon className="w-5 h-5 text-rose-500 shrink-0" />
                        <div>
                          <span className="font-bold text-rose-800 block mb-0.5">Manager Feedback</span>
                          <span className="text-rose-600 font-medium">{rejectionLog.comments}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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
                <div key={exp.id} className="glass-panel p-6 rounded-3xl relative overflow-hidden group flex flex-col">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-bl-full -z-10" />
                  
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">{exp.profiles?.full_name}</p>
                      <p className="font-bold text-slate-900 text-lg leading-tight">{exp.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-slate-900">${exp.amount}</p>
                    </div>
                  </div>

                  {/* Audit Flags */}
                  {exp.flags && exp.flags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {exp.flags.includes('high_value') && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-100 text-orange-700 text-xs font-bold uppercase tracking-wider">
                          <AlertTriangle className="w-3 h-3" /> High Value
                        </span>
                      )}
                      {exp.flags.includes('duplicate_warning') && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-700 text-xs font-bold uppercase tracking-wider">
                          <AlertOctagon className="w-3 h-3" /> Possible Duplicate
                        </span>
                      )}
                    </div>
                  )}

                  {/* Receipt Link */}
                  {exp.receipt_url && (
                    <div className="mb-6">
                      <a href={exp.receipt_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-xl transition-colors">
                        <FileImage className="w-4 h-4" /> View Attached Receipt
                      </a>
                    </div>
                  )}

                  <div className="mt-auto pt-6 flex gap-3">
                    <button 
                      onClick={() => rejectExpense(exp.id)} 
                      className="flex-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-bold py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition-colors"
                    >
                      <XCircle className="w-5 h-5" /> Reject
                    </button>
                    <button 
                      onClick={() => approveExpense(exp.id)} 
                      className="flex-1 bg-slate-900 hover:bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition-colors"
                    >
                      <CheckCircle className="w-5 h-5" /> Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {profile.role === 'finance' && (
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
