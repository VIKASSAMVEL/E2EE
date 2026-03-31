import { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { E2EEService } from '../crypto/E2EEService';
import API from '../services/api';

export const ChatDashboard = ({ username, onLogout }: { username: string, onLogout: () => void }) => {
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [isUplinking, setIsUplinking] = useState(false);
  
  const stompClientRef = useRef<Client | null>(null);
  const privateKeyRef = useRef<CryptoKey | null>(null);
  const knownPublicKeysRef = useRef<Record<string, CryptoKey>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initializeTacticalNode = async () => {
      // 1. Load RSA Private Key (Essential for decryption)
      const b64Key = localStorage.getItem("rsa_private_key");
      if (b64Key) {
        const privKey = await E2EEService.importPrivateKey(b64Key);
        privateKeyRef.current = privKey;
        console.log("TACTICAL: Private Key Locked.");
      }

      // 2. Fetch Peers
      API.get('/users/search').then((res) => {
        const peers = res.data.filter((u: any) => u.username !== username);
        setContacts(peers);
      });

      // 3. Establish Secure Link (STOMP)
      const token = localStorage.getItem('jwt_token');
      if (!token) return;

      const socketUrl = import.meta.env.VITE_WS_URL || 'http://localhost:8080/ws/chat';
      const socket = new SockJS(socketUrl);
      const client = new Client({
        webSocketFactory: () => socket as any,
        connectHeaders: { Authorization: `Bearer ${token}` },
        debug: (str) => console.log("STOMP_DEBUG:", str),
        onConnect: () => {
          console.log("TACTICAL: Uplink Established. Awaiting Payloads...");
          client.subscribe('/user/queue/messages', async (message) => {
            if (message.body) {
              const payload = JSON.parse(message.body);
              console.log("TACTICAL: Incoming Payload detected from [" + payload.senderId + "].");
              
              if (!privateKeyRef.current) {
                console.error("ERROR: Private Key missing during decryption attempt.");
                return;
              }

              try {
                const sessionAESKey = await E2EEService.decryptAESKeyWithRSA(
                  payload.encryptedKey, privateKeyRef.current);
                const iv = payload.encryptedPayload.split(':')[0];
                const ciphertext = payload.encryptedPayload.split(':')[1];
                
                let decryptedData: any;
                let blobUrl: string | undefined;

                if (payload.isAttachment) {
                  const buffer = await E2EEService.decryptBinary(ciphertext, iv, sessionAESKey);
                  const blob = new Blob([buffer], { type: payload.fileType });
                  blobUrl = URL.createObjectURL(blob);
                  decryptedData = `[FILE: ${payload.fileName}]`;
                } else {
                  decryptedData = await E2EEService.decryptMessage(ciphertext, iv, sessionAESKey);
                }
                
                // Functional update to avoid closure staleness
                setMessages(prev => {
                  return [...prev, {
                    sender: payload.senderId === username ? 'You' : payload.senderId,
                    text: decryptedData,
                    timestamp: payload.timestamp || new Date().toISOString(),
                    isAttachment: payload.isAttachment,
                    fileName: payload.fileName,
                    fileType: payload.fileType,
                    blobUrl: blobUrl
                  }];
                });
              } catch (err) {
                console.error("TACTICAL_DECRYPTION_ERROR:", err);
              }
            }
          });
        }
      });

      client.activate();
      stompClientRef.current = client;
    };

    initializeTacticalNode();

    return () => {
      if (stompClientRef.current) stompClientRef.current.deactivate();
    };
  }, [username]);

  useEffect(() => {
    if (!selectedContact || !username) return;

    const fetchHistory = async () => {
      try {
        const res = await API.get(`/messages/history/${selectedContact.username}?currentUser=${username}`);
        const history = res.data;
        
        const decryptedHistory = await Promise.all(history.map(async (msg: any) => {
          try {
            if (!privateKeyRef.current) return null;
            const sessionAESKey = await E2EEService.decryptAESKeyWithRSA(
              msg.encryptedKey, privateKeyRef.current);
            const iv = msg.encryptedPayload.split(':')[0];
            const ciphertext = msg.encryptedPayload.split(':')[1];
            
            let decryptedData: any;
            let blobUrl: string | undefined;

            if (msg.isAttachment) {
              const buffer = await E2EEService.decryptBinary(ciphertext, iv, sessionAESKey);
              const blob = new Blob([buffer], { type: msg.fileType });
              blobUrl = URL.createObjectURL(blob);
              decryptedData = `[FILE: ${msg.fileName}]`;
            } else {
              decryptedData = await E2EEService.decryptMessage(ciphertext, iv, sessionAESKey);
            }

            return {
              sender: msg.senderId === username ? 'You' : msg.senderId,
              text: decryptedData,
              timestamp: msg.timestamp,
              isAttachment: msg.isAttachment,
              fileName: msg.fileName,
              fileType: msg.fileType,
              blobUrl: blobUrl
            };
          } catch (err) {
            console.error("HISTORY_DECRYPTION_ERROR:", err);
            return null;
          }
        }));

        setMessages(decryptedHistory.filter(m => m !== null));
      } catch (err) {
        console.error("FETCH_HISTORY_ERROR:", err);
      }
    };

    fetchHistory();
  }, [selectedContact, username]);

  const sendMessage = async () => {
    if (!inputText.trim() || !selectedContact || !stompClientRef.current?.connected) return;

    try {
      const { payloadWrapper, encryptedKeyForRecipient } = await prepareSecurePacket(inputText, false);

      const chatMessage = {
        senderId: username,
        receiverId: selectedContact.username,
        encryptedPayload: payloadWrapper,
        encryptedKey: encryptedKeyForRecipient,
        timestamp: new Date().toISOString(),
        isAttachment: false
      };

      stompClientRef.current.publish({
        destination: '/app/chat.sendPrivateMessage',
        body: JSON.stringify(chatMessage)
      });

      setMessages(prev => [...prev, {
        sender: 'You',
        text: inputText,
        timestamp: chatMessage.timestamp,
        isAttachment: false
      }]);
      setInputText("");
    } catch (e) {
      console.error("PACKET_ENCRYPTION_ERROR:", e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedContact || !stompClientRef.current?.connected) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("TICKET_ERROR: File size exceeds 5MB tactical limit.");
      return;
    }

    setIsUplinking(true);
    try {
      const buffer = await file.arrayBuffer();
      const { payloadWrapper, encryptedKeyForRecipient } = await prepareSecurePacket(buffer, true);

      const chatMessage = {
        senderId: username,
        receiverId: selectedContact.username,
        encryptedPayload: payloadWrapper,
        encryptedKey: encryptedKeyForRecipient,
        timestamp: new Date().toISOString(),
        isAttachment: true,
        fileName: file.name,
        fileType: file.type
      };

      stompClientRef.current.publish({
        destination: '/app/chat.sendPrivateMessage',
        body: JSON.stringify(chatMessage)
      });

      setMessages(prev => [...prev, {
        sender: 'You',
        text: `[UPLINKED_FILE: ${file.name}]`,
        timestamp: chatMessage.timestamp,
        isAttachment: true,
        fileName: file.name,
        fileType: file.type,
        blobUrl: URL.createObjectURL(new Blob([buffer], { type: file.type }))
      }]);
    } catch (err) {
      console.error("FILE_UPLINK_FAILURE:", err);
    } finally {
      setIsUplinking(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const prepareSecurePacket = async (data: string | ArrayBuffer, isBinary: boolean) => {
    let pubKey = knownPublicKeysRef.current[selectedContact.username];
    if (!pubKey) {
      pubKey = await E2EEService.importPublicKey(selectedContact.publicKey);
      knownPublicKeysRef.current[selectedContact.username] = pubKey;
    }

    const sessionKey = await E2EEService.generateAESKey();
    let encryptedMsg: { iv: string, ciphertext: string };

    if (isBinary) {
      encryptedMsg = await E2EEService.encryptBinary(data as ArrayBuffer, sessionKey);
    } else {
      encryptedMsg = await E2EEService.encryptMessage(data as string, sessionKey);
    }

    const payloadWrapper = `${encryptedMsg.iv}:${encryptedMsg.ciphertext}`;
    const encryptedKeyForRecipient = await E2EEService.encryptAESKeyWithRSA(sessionKey, pubKey);

    return { payloadWrapper, encryptedKeyForRecipient };
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar - Contacts */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col shadow-sm z-20">
        <div className="p-6 border-b border-slate-100 flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold tracking-tight text-primary">Messages</h1>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full uppercase">Online</span>
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-100 group transition-all hover:border-blue-200">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm">
              {username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{username}</p>
              <button 
                onClick={onLogout} 
                className="text-[10px] text-slate-400 hover:text-red-500 transition-colors uppercase font-bold tracking-wider cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-3 mt-4 mb-3">Contacts</h3>
          {contacts.length === 0 ? (
            <div className="px-3 py-10 text-center text-slate-400 text-xs italic">Searching for peers...</div>
          ) : contacts.map(c => (
            <div 
              key={c.username} 
              onClick={() => setSelectedContact(c)}
              className={`p-4 rounded-2xl cursor-pointer transition-all flex items-center space-x-3 ${selectedContact?.username === c.username ? 'bg-blue-50 border border-blue-100 shadow-sm' : 'hover:bg-slate-50 border border-transparent'}`}>
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold border-2 border-white shadow-sm overflow-hidden text-lg">
                  {c.username.charAt(0).toUpperCase()}
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <div className="text-sm font-bold text-slate-800 truncate">{c.username}</div>
                  <div className="text-[10px] text-slate-400">Trusted</div>
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">RSA-2048 Encrypted</div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            <span>Standard Secure Link</span>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-50 relative">
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 z-10 sticky top-0">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200 shadow-sm">
                  {selectedContact.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 leading-tight">{selectedContact.username}</h2>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">End-to-End Encrypted</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-[10px] bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 font-bold tracking-tight">
                  UPLINK_READY
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar flex flex-col space-y-6">
              <div className="flex-1"></div> {/* Spacer to push messages to bottom */}
              {messages.filter(m => m.sender === 'You' || m.sender === selectedContact.username).map((m, i) => (
                <div key={i} className={`flex ${m.sender === 'You' ? 'justify-end' : 'justify-start'} group animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                  <div className={`max-w-[70%] flex flex-col ${m.sender === 'You' ? 'items-end' : 'items-start'}`}>
                    <div className={`px-5 py-3.5 rounded-2xl shadow-sm relative ${
                      m.sender === 'You' 
                        ? 'bubble-you rounded-tr-none' 
                        : 'bubble-other rounded-tl-none'
                    }`}>
                      {m.isAttachment ? (
                        <div className="space-y-4">
                          {m.fileType?.startsWith('image/') ? (
                            <img src={m.blobUrl} alt="Secure Attachment" className="max-w-full rounded-xl border border-white/20 shadow-md" />
                          ) : (
                            <div className={`flex items-center space-x-4 p-4 rounded-xl border ${m.sender === 'You' ? 'bg-white/10 border-white/20' : 'bg-slate-50 border-slate-200'}`}>
                               <div className="text-3xl">📄</div>
                               <div className="flex-1 min-w-0">
                                 <div className="text-xs font-bold truncate">{m.fileName}</div>
                                 <div className="text-[10px] opacity-60 uppercase mt-1">Encrypted Payload</div>
                               </div>
                            </div>
                          )}
                          <a 
                            href={m.blobUrl} 
                            download={m.fileName} 
                            className={`block text-center text-[10px] font-bold uppercase tracking-widest py-3 rounded-xl transition-all ${
                              m.sender === 'You' 
                                ? 'bg-white text-blue-600 hover:bg-blue-50' 
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                            }`}>
                            Download Secure File
                          </a>
                        </div>
                      ) : (
                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap font-medium">{m.text}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mt-1 px-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {m.sender === 'You' && (
                        <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input Area */}
            <div className="p-6 bg-white border-t border-slate-200 z-10">
              <form onSubmit={e => { e.preventDefault(); sendMessage(); }} className="max-w-5xl mx-auto flex items-center space-x-4">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUplinking}
                  className="w-12 h-12 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all border border-slate-100 cursor-pointer disabled:opacity-30 group shadow-sm"
                  title="Attach Secure Data">
                  <svg className="w-6 h-6 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                </button>
                
                <div className="flex-1 relative flex items-center">
                  <input
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder={isUplinking ? "Encrypting packet..." : "Message..."}
                    disabled={isUplinking}
                    className="w-full bg-slate-50 border border-slate-100 focus:border-blue-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all rounded-2xl py-4 px-6 text-[15px] outline-none shadow-inner pr-12"
                  />
                  <div className="absolute right-4 text-slate-300 font-mono text-[10px] select-none">AES-GCM</div>
                </div>

                <button 
                  type="submit" 
                  disabled={isUplinking || (!inputText.trim() && !isUplinking)} 
                  className="w-12 h-12 flex items-center justify-center bg-blue-600 text-white rounded-full transition-all hover:bg-blue-700 hover:shadow-lg hover:scale-105 cursor-pointer disabled:opacity-20 disabled:grayscale disabled:scale-100 group shadow-blue-500/20 shadow-md"
                >
                  <svg className="w-5 h-5 transform rotate-90 ml-1 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                </button>
              </form>
              <div className="text-center mt-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center space-x-2">
                 <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                 <span>End-to-End Secure Channel Active</span>
                 <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-8 shadow-inner border border-blue-100/50">
              <svg className="w-12 h-12 text-blue-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Select a conversation</h2>
            <p className="text-slate-500 mt-2 max-w-sm">Connect with peers in your network. All communications are protected with enterprise-grade RSA and AES-GCM encryption.</p>
          </div>
        )}
      </div>
    </div>
  );
};
