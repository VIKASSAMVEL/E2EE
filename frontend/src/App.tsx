import { useState } from 'react';
import API from './services/api';
import { E2EEService } from './crypto/E2EEService';
import { ChatDashboard } from './components/ChatDashboard';

function App() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleAuth = async () => {
    setIsLoading(true);
    setErrorMsg("");
    
    try {
      if (isRegistered) {
        const res = await API.post('/auth/login', { username, password });
        localStorage.setItem('jwt_token', res.data.token);
        localStorage.setItem('username', res.data.username);
        
        if (!localStorage.getItem('rsa_private_key')) {
         setErrorMsg("SYSTEM_ERROR: RSA Private Key missing from local keystore.");
        }
        
        setIsAuthenticated(true);
      } else {
        const keyPair = await E2EEService.generateRSAKeyPair();
        const base64PublicKey = await E2EEService.exportPublicKey(keyPair.publicKey);
        const base64PrivateKey = await E2EEService.exportPrivateKey(keyPair.privateKey);
        
        await API.post('/auth/register', { 
            username, 
            password, 
            publicKey: base64PublicKey 
        });
        
        localStorage.setItem('rsa_private_key', base64PrivateKey);
        
        const loginRes = await API.post('/auth/login', { username, password });
        localStorage.setItem('jwt_token', loginRes.data.token);
        localStorage.setItem('username', loginRes.data.username);
        setIsAuthenticated(true);
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.response?.data || "AUTH_PROTOCOL_FAILURE");
    } finally {
        setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('username');
    setIsAuthenticated(false);
  };

  if (isAuthenticated) {
    return <ChatDashboard username={localStorage.getItem('username') || username} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden font-sans">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-indigo-500 to-blue-600"></div>
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-100/50 rounded-full blur-3xl"></div>

      <div className="max-w-md w-full p-8 bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 relative z-10 mx-4">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-blue-500/30 mx-auto mb-6 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
            E2E
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
            Messenger
          </h2>
          <p className="text-slate-500 text-sm font-medium">
            {isRegistered ? "Welcome back! Please sign in." : "Create your secure identity."}
          </p>
        </div>
        
        {errorMsg && (
            <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 flex items-center space-x-2 animate-in fade-in zoom-in duration-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>{errorMsg}</span>
            </div>
        )}

        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); handleAuth(); }}>
          <div className="space-y-4">
            <div className="flex flex-col space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Username</label>
              <input 
                name="username" 
                type="text" 
                required 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 text-slate-900 placeholder-slate-300 focus:outline-none focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all rounded-2xl text-sm font-semibold" 
                placeholder="Choose a username" 
              />
            </div>
            
            <div className="flex flex-col space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Password</label>
              <input 
                name="password" 
                type="password" 
                required 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 text-slate-900 placeholder-slate-300 focus:outline-none focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all rounded-2xl text-sm font-semibold" 
                placeholder="••••••••" 
              />
            </div>
          </div>

          <div className="pt-4">
            <button 
                type="submit" 
                disabled={isLoading}
                className="w-full flex justify-center py-4 px-6 bg-blue-600 text-white text-sm font-bold rounded-2xl hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-blue-500/10">
              {isLoading ? "Processing..." : (isRegistered ? 'Sign In' : 'Create Identity')}
            </button>
          </div>
          
          <div className="text-center pt-2">
            <button 
              type="button" 
              onClick={() => setIsRegistered(!isRegistered)} 
              className="text-slate-400 text-[11px] font-bold uppercase tracking-widest hover:text-blue-600 transition-colors cursor-pointer"
            >
              {isRegistered ? "Don't have an account? Create one" : "Already have an account? Sign in"}
            </button>
          </div>
        </form>

        <div className="mt-10 pt-8 border-t border-slate-50 flex flex-col items-center space-y-3">
           <div className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Secure AES-GCM Protocol Active</span>
           </div>
           <p className="text-[9px] text-slate-300 text-center max-w-[200px] leading-relaxed">
             This session is fully end-to-end encrypted. Your private keys never leave this device.
           </p>
        </div>
      </div>
      
      <div className="mt-8 text-slate-300 text-[10px] font-bold uppercase tracking-[0.3em]">
        © 2026 Secure E2E Messenger
      </div>
    </div>
  );
}

export default App;
