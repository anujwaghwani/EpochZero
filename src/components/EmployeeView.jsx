import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { PlusCircle, Clock, CheckCircle2, XCircle, Receipt } from 'lucide-react';

export default function EmployeeView({ profile }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchExpenses = async () => {
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        approval_logs ( comments, action )
      `)
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });
    
    if (data) setExpenses(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { error } = await supabase.from('expenses').insert({
      user_id: profile.id,
      department_id: profile.department_id,
      amount: parseFloat(amount),
      description,
      status: 'pending'
    });
    
    if (!error) {
      setAmount('');
      setDescription('');
      fetchExpenses();
    }
    setIsSubmitting(false);
  };

  const getStatusIcon = (status) => {
    if (status === 'approved') return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    if (status === 'rejected') return <XCircle className="w-5 h-5 text-rose-500" />;
    return <Clock className="w-5 h-5 text-amber-500" />;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-500" /> New Expense
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Amount ($)</label>
              <input type="number" step="0.01" required className="mt-1 w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Description</label>
              <textarea required rows="3" className="mt-1 w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all resize-none" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm">
              {isSubmitting ? 'Submitting...' : <><PlusCircle className="w-4 h-4" /> Submit Expense</>}
            </button>
          </form>
        </div>
      </div>
      <div className="lg:col-span-2">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Submission History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Description</th>
                  <th className="px-6 py-3 font-medium">Amount</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Comments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">Loading history...</td></tr>
                ) : expenses.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">No expenses found. Submit your first expense above.</td></tr>
                ) : expenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-500">{new Date(exp.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-slate-900 font-medium truncate max-w-[200px]">{exp.description}</td>
                    <td className="px-6 py-4 text-slate-900 font-semibold">${Number(exp.amount).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        {getStatusIcon(exp.status)}
                        <span className="capitalize text-slate-700 font-medium">{exp.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 truncate max-w-[200px]">
                      {exp.approval_logs?.[0]?.comments || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
