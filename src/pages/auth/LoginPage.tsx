import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Mail, Lock, AlertCircle, User, CheckCircle, Shield } from 'lucide-react';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [wantAdmin, setWantAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isSignUp && wantAdmin && adminPassword !== 'admin') {
      setError("Password amministratore errata.");
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const ruoloScelto = wantAdmin && adminPassword === 'admin' ? 'admin' : 'operaio';
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { nome, cognome, ruolo: ruoloScelto } },
        });
        if (error) throw error;
        if (data?.user) {
          await supabase
            .from('usersvivai')
            .update({ nome, cognome, ruolo: ruoloScelto })
            .eq('id', data.user.id);
        }
        setShowSuccessPopup(true);
        setIsSignUp(false);
        setPassword('');
        setAdminPassword('');
        setWantAdmin(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || "Si è verificato un errore.");
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setError(null);
  };

  const inputClass =
    "w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50 relative overflow-hidden">
      {/* Soft ambient blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-brand-100/40 blur-[100px]" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-brand-200/30 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src="/logo.png" alt="Vivai Ghezzi" className="h-24 w-auto object-contain" />
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-xl font-bold text-gray-900">
              {isSignUp ? 'Crea account' : 'Bentornato'}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {isSignUp ? 'Compila i campi per registrarti' : 'Accedi al pannello gestionale'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl p-3.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {/* Name fields (signup only) */}
            {isSignUp && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide" htmlFor="nome">Nome</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input id="nome" type="text" required value={nome} onChange={e => setNome(e.target.value)}
                      className={inputClass} placeholder="Mario" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide" htmlFor="cognome">Cognome</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input id="cognome" type="text" required value={cognome} onChange={e => setCognome(e.target.value)}
                      className={inputClass} placeholder="Rossi" />
                  </div>
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide" htmlFor="email">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input id="email" type="email" autoComplete="email" required value={email}
                  onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="mario@vivaighezzi.it" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide" htmlFor="password">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input id="password" type="password" autoComplete={isSignUp ? "new-password" : "current-password"}
                  required value={password} onChange={e => setPassword(e.target.value)}
                  className={inputClass} placeholder="••••••••" />
              </div>
            </div>

            {/* Admin toggle (signup only) */}
            {isSignUp && (
              <div className="pt-1 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div
                    onClick={() => setWantAdmin(!wantAdmin)}
                    className={`w-9 h-5 rounded-full relative transition-colors duration-200 ${wantAdmin ? 'bg-brand-500' : 'bg-gray-200'}`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${wantAdmin ? 'translate-x-4' : ''}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Registrati come Amministratore</span>
                </label>
                {wantAdmin && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide" htmlFor="adminPassword">Password Admin</label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-400" />
                      <input id="adminPassword" type="password" required={wantAdmin} value={adminPassword}
                        onChange={e => setAdminPassword(e.target.value)}
                        className={`${inputClass} border-brand-200 bg-brand-50/30`}
                        placeholder="Password sblocco admin" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : isSignUp ? 'Crea Account' : 'Accedi'}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <button onClick={toggleAuthMode} className="text-sm text-brand-600 hover:text-brand-700 font-semibold transition-colors">
              {isSignUp ? 'Hai già un account? Accedi' : 'Nuovo utente? Registrati'}
            </button>
          </div>
        </div>
      </div>

      {/* Success popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-7 h-7 text-brand-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Registrato con successo!</h3>
            <p className="text-sm text-gray-400 mb-7">
              Il tuo account è stato creato. Ora puoi effettuare il login.
            </p>
            <button
              onClick={() => setShowSuccessPopup(false)}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl transition-all"
            >
              Vai al Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
