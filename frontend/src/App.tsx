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
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden font-mono cyber-grid">
      <div className="scanline"></div>
      
      <div className="max-w-md w-full space-y-8 terminal-glass p-10 relative z-10 neon-border">
        <div className="text-center">
          <div className="inline-block p-2 border border-primary/50 mb-4 animate-pulse">
            <span className="text-primary text-xs uppercase tracking-widest">[ SECURITY CONSOLE v2.0 ]</span>
          </div>
          <h2 className="glitch-text text-center text-4xl font-display font-bold text-primary mb-2 neon-text">
            SECURE_E2EE_CHAT
          </h2>
          <p className="text-primary/70 text-xs uppercase tracking-widest">
            {isRegistered ? "AUTHENTICATION_REQUIRED" : "NEW_IDENTITY_PROTOCOL"}
          </p>
        </div>
        
        {errorMsg && (
            <div className="bg-red-950/50 text-red-500 p-3 rounded-md text-xs border border-red-500/50 uppercase tracking-tight">
                [{errorMsg}]
            </div>
        )}

        <form className="mt-8 space-y-4" onSubmit={(e) => { e.preventDefault(); handleAuth(); }}>
          <div className="space-y-4">
            <div className="relative group">
              <label className="text-[10px] text-primary/50 uppercase absolute -top-2 left-2 px-1 bg-black z-10 transition-colors group-focus-within:text-primary">User_Address</label>
              <input 
                name="username" 
                type="text" 
                required 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="block w-full px-4 py-3 bg-black/50 border border-primary/30 text-primary placeholder-primary/20 focus:outline-none focus:border-primary transition-all sm:text-sm rounded-none" placeholder="Enter ID..." />
            </div>
            
            <div className="relative group">
              <label className="text-[10px] text-primary/50 uppercase absolute -top-2 left-2 px-1 bg-black z-10 transition-colors group-focus-within:text-primary">Auth_Sequence</label>
              <input 
                name="password" 
                type="password" 
                required 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="block w-full px-4 py-3 bg-black/50 border border-primary/30 text-primary placeholder-primary/20 focus:outline-none focus:border-primary transition-all sm:text-sm rounded-none" placeholder="••••••••" />
            </div>
          </div>

          <div className="pt-2">
            <button 
                type="submit" 
                disabled={isLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-primary text-xs font-bold uppercase tracking-[0.2em] text-black bg-primary hover:bg-black hover:text-primary focus:outline-none transition-all disabled:opacity-30 cursor-pointer shadow-[0_0_15px_rgba(0,255,65,0.4)]">
              {isLoading ? "EXECUTING..." : (isRegistered ? 'INITIALIZE_SESSION' : 'GENERATE_IDENTITY')}
            </button>
          </div>
          
          <div className="text-center pt-2">
            <button type="button" onClick={() => setIsRegistered(!isRegistered)} className="text-primary/50 text-[10px] uppercase tracking-widest hover:text-primary transition-colors cursor-pointer">
              {isRegistered ? "> Create New Secure Tunnel" : "> Existing Identity Found"}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-primary/10 flex justify-between items-center opacity-40">
           <span className="text-[8px] uppercase tracking-tighter text-primary/50">Connection: SECURE_STOMP_WSS://</span>
           <span className="text-[8px] uppercase tracking-tighter text-primary/50">Status: NODE_STANDBY</span>
        </div>
      </div>

      {/* Background HUD elements */}
      <div className="absolute top-10 left-10 text-[8px] text-primary/20 leading-relaxed font-mono uppercase hidden lg:block">
        SYS_STATUS: OPTIMAL<br/>
        ENCRYPTION: RSA_2048_ACTIVE<br/>
        TUNNEL: WSS_V3<br/>
        NODE_ID: {Math.random().toString(36).substring(7).toUpperCase()}
      </div>
    </div>
  );
}

export default App;
