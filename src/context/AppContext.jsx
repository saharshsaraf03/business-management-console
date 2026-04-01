import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';

const AppContext = createContext(null);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [mangoRates, setMangoRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const initDone = useRef(false);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await Promise.race([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
        )
      ]);
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data;
    } catch (err) {
      console.error('Profile fetch failed or timed out:', err);
      return null;
    }
  }, []);

  const fetchMangoRates = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('mango_rates')
        .select('*')
        .order('size');
      if (!error && data) {
        setMangoRates(data);
      }
    } catch (err) {
      console.error('Failed to fetch mango rates:', err);
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setMangoRates([]);
  }, []);

  const checkActive = useCallback(async () => {
    if (!user) return false;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_active')
        .eq('id', user.id)
        .single();
      if (error || !data || !data.is_active) {
        addToast('Your account has been deactivated. Please contact the owner.', 'error');
        await signOut();
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }, [user, addToast, signOut]);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error || !session?.user) {
          setLoading(false);
          return;
        }

        setUser(session.user);

        const profileData = await fetchProfile(session.user.id);

        if (!mounted) return;

        if (profileData) {
          if (profileData.is_active === false) {
            addToast('Your account has been deactivated.', 'error');
            await signOut();
            setLoading(false);
            return;
          }
          setProfile(profileData);
          await fetchMangoRates();
        }

      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        if (mounted) {
          setLoading(false);
          initDone.current = true;
        }
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!initDone.current) return;

        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          const profileData = await fetchProfile(session.user.id);
          if (profileData) {
            if (profileData.is_active === false) {
              addToast('Your account has been deactivated.', 'error');
              await signOut();
              return;
            }
            setProfile(profileData);
            await fetchMangoRates();
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setMangoRates([]);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user && profile && mangoRates.length === 0) {
      fetchMangoRates();
    }
  }, [user, profile]);

  const isOwner = profile?.role === 'owner';

  const value = {
    user,
    profile,
    mangoRates,
    loading,
    isOwner,
    toasts,
    addToast,
    removeToast,
    signOut,
    fetchMangoRates,
    checkActive,
    fetchProfile: () =>
      user ? fetchProfile(user.id).then(p => { if (p) setProfile(p); }) : Promise.resolve()
  };

  return (
    <AppContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto animate-slide-right rounded-lg px-4 py-3 shadow-lg border flex items-start gap-3 ${
              toast.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : toast.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-green-50 border-green-200 text-green-800'
            }`}
          >
            <span className="text-lg mt-0.5">
              {toast.type === 'error' ? '✕' : toast.type === 'warning' ? '⚠' : '✓'}
            </span>
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-gray-600 ml-2 mt-0.5"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
}