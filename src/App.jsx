import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Dashboard from './components/Dashboard';
import Auth from './components/Auth';
import { Loader2 } from 'lucide-react';

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user);
      else setLoading(false);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
  }, []);

  const fetchProfile = async (user) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, departments!profiles_department_id_fkey(name)')
      .eq('id', user.id)
      .single();
    
    if (error) console.error("Error fetching profile:", error);
    
    if (data) {
      setProfile(data);
    } else if (user) {
      // Fallback to metadata if DB row is missing, turning off the sync blocker
      setProfile({
        id: user.id,
        role: user.user_metadata?.role || 'employee',
        full_name: user.user_metadata?.full_name || user.email,
        department_id: user.user_metadata?.department_id || null
      });
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      <header className="glass-panel sticky top-0 z-50 border-b-0 border-white/50 bg-white/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-white font-black text-sm">V</span>
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 tracking-tight hidden sm:block">Vibbethon</h1>
            {profile && <span className="px-3 py-1 bg-white/80 border border-slate-200/50 text-indigo-700 text-[10px] font-black rounded-full uppercase tracking-widest shadow-sm">{profile.role}</span>}
          </div>
          <div className="flex items-center gap-6">
            {profile && (
              <div className="text-sm text-right hidden sm:block">
                <div className="font-bold text-slate-900">{profile.full_name}</div>
                <div className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider mt-0.5">{profile.departments?.name || 'Unassigned'}</div>
              </div>
            )}
            <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
            <button onClick={handleLogout} className="text-sm font-bold text-slate-500 hover:text-rose-600 transition-colors uppercase tracking-wider">Sign Out</button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative">
        {profile ? <Dashboard profile={profile} /> : <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" /></div>}
      </main>
    </div>
  );
}

export default App;
