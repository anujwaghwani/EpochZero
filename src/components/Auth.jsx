import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { LogIn, UserPlus, Loader2, AlertCircle, Sparkles } from 'lucide-react';

export default function Auth({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('employee');
  const [departmentId, setDepartmentId] = useState('');
  
  const [departments, setDepartments] = useState([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [departmentError, setDepartmentError] = useState(false);

  useEffect(() => {
    if (!isLogin) {
      const fetchDepartments = async () => {
        setIsLoadingDepartments(true);
        setDepartmentError(false);
        try {
          const response = await fetch('/api/departments');
          if (!response.ok) throw new Error('Failed to fetch departments');
          const data = await response.json();
          setDepartments(data);
          if (data && data.length > 0 && !departmentId) {
            setDepartmentId(data[0].id);
          }
        } catch (error) {
          setDepartmentError(true);
        } finally {
          setIsLoadingDepartments(false);
        }
      };
      fetchDepartments();
    }
  }, [isLogin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        if (!departmentId) throw new Error('Please select a department');
        if (!fullName.trim()) throw new Error('Please provide your full name');

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, full_name: fullName, role, department_id: departmentId })
        });
        
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || 'Registration failed');
        
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) throw loginError;
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoRole) => {
    setLoading(true);
    setErrorMsg('');
    const demoEmail = `demo_${demoRole}@vibbethon.com`;
    const demoPassword = 'DemoPassword123!';
    const demoName = `Demo ${demoRole.charAt(0).toUpperCase() + demoRole.slice(1)}`;

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email: demoEmail, password: demoPassword });
      if (loginError) {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: demoEmail, password: demoPassword, full_name: demoName, role: demoRole })
        });
        if (!res.ok) throw new Error('Failed to auto-create demo account');
        const { error: retryLoginError } = await supabase.auth.signInWithPassword({ email: demoEmail, password: demoPassword });
        if (retryLoginError) throw retryLoginError;
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50 p-4">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-30 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 blur-[100px] rounded-full mix-blend-multiply" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        <div className="glass-panel rounded-3xl p-8 sm:p-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 mb-6 transform hover:scale-105 transition-transform duration-300">
              {isLogin ? <LogIn className="w-8 h-8" /> : <UserPlus className="w-8 h-8" />}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
              {isLogin ? 'Welcome back' : 'Create Account'}
            </h1>
            <p className="text-slate-500 text-sm">
              {isLogin ? 'Enter your credentials to access your workspace' : 'Join the Intelligent Expense Platform'}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50/80 backdrop-blur-sm text-red-700 rounded-2xl text-sm flex items-start gap-3 border border-red-100 animate-fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
              <p className="font-medium">{errorMsg}</p>
            </div>
          )}

          {/* Premium Demo Buttons */}
          <div className="mb-8 p-1 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 p-5 border border-white/50 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-white/40 to-indigo-500/0 -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">Instant Demo Access</p>
            </div>
            <div className="grid grid-cols-3 gap-3 relative z-10">
              {['employee', 'manager', 'admin'].map((r) => (
                <button 
                  key={r}
                  onClick={() => handleDemoLogin(r === 'admin' ? 'finance' : r)} 
                  disabled={loading} 
                  type="button" 
                  className="py-2.5 px-2 bg-white/80 hover:bg-white text-slate-700 hover:text-indigo-600 text-xs font-bold uppercase tracking-wider rounded-xl border border-slate-200/50 shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-4 bg-white/80 backdrop-blur-sm text-slate-400 font-medium">Or continue with email</span></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-5 animate-fade-in">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
                  <input 
                    type="text" required 
                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                    value={fullName} onChange={(e) => setFullName(e.target.value)} 
                    placeholder="John Doe"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Role</label>
                    <select 
                      className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none"
                      value={role} onChange={(e) => setRole(e.target.value)}
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="finance">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Department</label>
                    <select 
                      required
                      className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none disabled:opacity-50"
                      value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}
                      disabled={isLoadingDepartments || departmentError || departments.length === 0}
                    >
                      {isLoadingDepartments && <option value="">Loading...</option>}
                      {departmentError && <option value="" disabled>Error</option>}
                      {!isLoadingDepartments && departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Email</label>
                <input 
                  type="email" required 
                  className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                  value={email} onChange={(e) => setEmail(e.target.value)} 
                  placeholder="name@company.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Password</label>
                <input 
                  type="password" required 
                  className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                  value={password} onChange={(e) => setPassword(e.target.value)} 
                  minLength={6}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 mt-8 shadow-lg shadow-indigo-500/30 transform hover:-translate-y-0.5 transition-all duration-200 active:scale-95"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Sign In to Workspace' : 'Create Your Account')}
            </button>
          </form>

          <div className="mt-8 text-center text-sm">
            <span className="text-slate-500">{isLogin ? "Don't have an account? " : "Already have an account? "}</span>
            <button 
              type="button" 
              onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); }} 
              className="font-bold text-indigo-600 hover:text-purple-600 transition-colors ml-1"
            >
              {isLogin ? 'Create one now' : 'Sign in instead'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
