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
    const loadPrivKey = async () => {
      const b64Key = localStorage.getItem("rsa_private_key");
      if (b64Key) {
        const privKey = await E2EEService.importPrivateKey(b64Key);
        privateKeyRef.current = privKey;
      }
    };
    loadPrivKey();

    API.get('/users/search').then((res) => {
      const peers = res.data.filter((u: any) => u.username !== username);
      setContacts(peers);
    });

    const token = localStorage.getItem('jwt_token');
    if (!token) return;

    const socketUrl = import.meta.env.VITE_WS_URL || 'http://localhost:8080/ws/chat';
    const socket = new SockJS(socketUrl);
    const client = new Client({
      webSocketFactory: () => socket as any,
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      debug: (str) => console.log(str),
      onConnect: () => {
        client.subscribe('/user/queue/messages', async (message) => {
          if (message.body) {
            const payload = JSON.parse(message.body);
            if (!privateKeyRef.current) return;
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
              
              setMessages(prev => [...prev, {
                sender: payload.senderId,
                text: decryptedData,
                timestamp: payload.timestamp,
                isAttachment: payload.isAttachment,
                fileName: payload.fileName,
                fileType: payload.fileType,
                blobUrl: blobUrl
              }]);
            } catch (err) {
              console.error("DECRYPTION_FAILURE:", err);
            }
          }
        });
      }
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
      if (client) client.deactivate();
    };
  }, [username]);

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
    <div className="flex h-screen bg-black text-primary font-mono relative overflow-hidden cyber-grid">
      <div className="scanline"></div>

      {/* Sidebar - Node Selector */}
      <div className="w-80 terminal-glass border-r border-primary/20 flex flex-col z-10">
        <div className="p-6 border-b border-primary/20 bg-primary/5">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-display font-bold tracking-widest neon-text">SYS_ID: {username}</h2>
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_5px_#00FF41]"></span>
          </div>
          <button onClick={onLogout} className="text-[10px] uppercase tracking-tighter text-red-500 hover:text-white transition-colors cursor-pointer block border border-red-500/30 px-2 py-1 mt-2">
            [ TERMINATE_SESSION ]
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
          <h3 className="text-[9px] uppercase tracking-widest text-primary/40 px-4 mt-4 mb-2 font-bold">Peers_In_Network</h3>
          {contacts.map(c => (
            <div 
              key={c.username} 
              onClick={() => setSelectedContact(c)}
              className={`p-4 cursor-pointer transition-all border border-transparent ${selectedContact?.username === c.username ? 'bg-primary/10 border-primary/30 neon-border' : 'hover:bg-primary/5'}`}>
              <div className="flex items-center space-x-3">
                <div className={`w-1.5 h-1.5 rounded-full ${selectedContact?.username === c.username ? 'bg-primary' : 'bg-primary/20'}`}></div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider">{c.username}</div>
                  <div className="text-[8px] opacity-40 uppercase truncate w-40">RSA: {c.publicKey.substring(0, 16)}...</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-primary/20 opacity-30">
          <div className="text-[8px] uppercase tracking-tighter">SECURE_PROTOCOL: v6.0.0</div>
          <div className="text-[8px] uppercase tracking-tighter">UPLINK_READY: {isUplinking ? "BUSY" : "IDLE"}</div>
        </div>
      </div>

      {/* Main Terminal Feed */}
      <div className="flex-1 flex flex-col z-10 relative bg-black/40 backdrop-blur-[2px]">
        {selectedContact ? (
          <>
            <div className="p-6 border-b border-primary/20 bg-black/80 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-display font-bold neon-text uppercase tracking-widest flex items-center">
                  <span className="text-primary/30 mr-3">&gt;</span> SESSION: {selectedContact.username}
                </h2>
                <div className="flex items-center mt-1 space-x-2">
                   <div className="text-[9px] font-mono text-primary/60 bg-primary/10 px-2 py-0.5 border border-primary/20">E2EE_DATA_LINK_ACTIVE</div>
                   <div className="text-[9px] font-mono text-primary/60 bg-primary/10 px-2 py-0.5 border border-primary/20">BUF_LIMIT: 10MB</div>
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-6 bg-black/60">
              {messages.filter(m => m.sender === 'You' || m.sender === selectedContact.username).map((m, i) => (
                <div key={i} className={`flex ${m.sender === 'You' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                  <div className={`group relative max-w-sm md:max-w-xl p-4 border ${m.sender === 'You' ? 'bg-primary/5 border-primary/40 text-primary' : 'bg-black border-primary/20 text-primary/90'}`}>
                    <div className="flex justify-between items-center mb-2 border-b border-primary/10 pb-1">
                       <span className="text-[8px] uppercase tracking-tighter opacity-50">{m.sender === 'You' ? 'SOURCE: LOCAL' : `SOURCE: ${m.sender}`}</span>
                       <span className="text-[8px] uppercase tracking-tighter opacity-50">{new Date(m.timestamp).toLocaleTimeString()}</span>
                    </div>

                    {m.isAttachment ? (
                      <div className="space-y-3">
                        {m.fileType.startsWith('image/') ? (
                          <img src={m.blobUrl} alt="Secure Payload" className="max-w-full border border-primary/30 shadow-[0_0_10px_rgba(0,255,65,0.1)]" />
                        ) : (
                          <div className="flex items-center space-x-3 p-2 bg-primary/5 border border-primary/20">
                             <div className="text-2xl">📄</div>
                             <div className="text-xs truncate">{m.fileName}</div>
                          </div>
                        )}
                        <a 
                          href={m.blobUrl} 
                          download={m.fileName} 
                          className="block text-center text-[10px] uppercase tracking-widest border border-primary py-1 hover:bg-primary hover:text-black transition-all">
                          [ ACCESS_DECRYPTED_PACKET ]
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
                    )}

                    <div className="absolute -top-[1px] -left-[1px] w-1.5 h-1.5 border-t border-l border-primary group-hover:w-3 group-hover:h-3 transition-all"></div>
                    <div className="absolute -bottom-[1px] -right-[1px] w-1.5 h-1.5 border-b border-r border-primary group-hover:w-3 group-hover:h-3 transition-all"></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 bg-black/90 border-t border-primary/20">
              <form onSubmit={e => { e.preventDefault(); sendMessage(); }} className="relative flex items-center space-x-4">
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
                  className="bg-primary/5 border border-primary/30 text-primary p-2 hover:bg-primary hover:text-black transition-all cursor-pointer disabled:opacity-20"
                  title="Secure Data Uplink">
                  {isUplinking ? "..." : "↑"}
                </button>
                <div className="text-primary font-bold text-sm select-none tracking-tighter">&gt;_</div>
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder={isUplinking ? "DATA_UPLINK_IN_PROGRESS..." : "Insert secure payload..."}
                  disabled={isUplinking}
                  className="flex-1 bg-transparent border-none text-primary placeholder-primary/20 focus:ring-0 focus:outline-none py-2 text-sm font-mono"
                />
                <button type="submit" disabled={isUplinking} className="bg-primary/10 border border-primary text-primary px-6 py-1.5 text-xs font-bold uppercase transition-all hover:bg-primary hover:text-black hover:shadow-[0_0_10px_#00FF41] cursor-pointer disabled:opacity-20">
                  EXEC_SEND
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-40">
            <div className="text-sm uppercase tracking-[0.4em] mb-4 text-primary animate-pulse">Awaiting Node Selection_</div>
          </div>
        )}
      </div>
    </div>
  );
};
