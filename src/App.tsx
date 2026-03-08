import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, Video, Image as ImageIcon, MessageSquare, 
  Search, MapPin, Sparkles, Send, User, 
  LogOut, Menu, X, ChevronRight, Play,
  Maximize2, Download, Trash2, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, signIn, logOut, db, OperationType, handleFirestoreError } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { chatWithGemini, generateImage, searchGrounding, mapsGrounding, transcribeAudio } from './services/gemini';
import { ErrorBoundary } from './components/ErrorBoundary';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
      active 
        ? "bg-studio-gold text-black shadow-lg shadow-studio-gold/20" 
        : "text-white/60 hover:bg-white/5 hover:text-white"
    )}
  >
    <Icon size={20} className={cn("transition-transform duration-200", !active && "group-hover:scale-110")} />
    <span className="font-medium">{label}</span>
  </button>
);

const ToolCard = ({ title, description, icon: Icon, onClick, color = "studio-gold" }: any) => (
  <motion.div
    whileHover={{ y: -5 }}
    onClick={onClick}
    className="glass-panel p-6 cursor-pointer group relative overflow-hidden"
  >
    <div className={cn("absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full blur-3xl opacity-10 transition-opacity group-hover:opacity-20", `bg-${color}`)} />
    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors", `bg-${color}/10 text-${color}`)}>
      <Icon size={24} />
    </div>
    <h3 className="text-xl font-display font-bold mb-2 group-hover:text-studio-gold transition-colors">{title}</h3>
    <p className="text-white/60 text-sm leading-relaxed">{description}</p>
  </motion.div>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);

  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Image Gen State
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageSize, setImageSize] = useState('1K');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || loading) return;

    const userMsg = { role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setLoading(true);

    try {
      const response = await chatWithGemini(chatInput);
      setChatMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageGen = async () => {
    if (!imagePrompt.trim() || loading) return;
    setLoading(true);
    try {
      const img = await generateImage(imagePrompt, { aspectRatio, imageSize });
      setGeneratedImage(img);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="space-y-2">
              <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight">
                Welcome to <span className="gold-gradient-text">BILAL-V Studio</span>
              </h1>
              <p className="text-white/60 text-lg max-w-2xl">
                The ultimate AI-powered creative hub. Generate, analyze, and transform your media with the power of Gemini.
              </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <ToolCard 
                title="AI Chatbot" 
                description="Intelligent assistant with Search and Maps grounding for studio research."
                icon={MessageSquare}
                onClick={() => setActiveTab('chat')}
              />
              <ToolCard 
                title="Image Studio" 
                description="Generate high-fidelity 4K images with custom aspect ratios and sizes."
                icon={ImageIcon}
                onClick={() => setActiveTab('images')}
              />
              <ToolCard 
                title="Video Engine" 
                description="Create cinematic videos from prompts or animate your existing photos."
                icon={Video}
                onClick={() => setActiveTab('video')}
              />
              <ToolCard 
                title="Audio Lab" 
                description="Transcribe recordings and analyze audio content with precision."
                icon={Mic}
                onClick={() => setActiveTab('audio')}
              />
              <ToolCard 
                title="Search Grounding" 
                description="Get real-time information from the web to power your creative process."
                icon={Search}
                onClick={() => setActiveTab('chat')}
              />
              <ToolCard 
                title="Maps Integration" 
                description="Find filming locations and studio spaces with Google Maps data."
                icon={MapPin}
                onClick={() => setActiveTab('chat')}
              />
            </div>
          </div>
        );

      case 'chat':
        return (
          <div className="h-full flex flex-col glass-panel overflow-hidden animate-in fade-in duration-300">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {chatMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                  <MessageSquare size={48} />
                  <p className="text-lg">Start a conversation with the Studio Assistant</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={i}
                  className={cn(
                    "flex gap-4 max-w-[80%]",
                    msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    msg.role === 'user' ? "bg-studio-gold text-black" : "bg-white/10 text-white"
                  )}>
                    {msg.role === 'user' ? <User size={16} /> : <Sparkles size={16} />}
                  </div>
                  <div className={cn(
                    "p-4 rounded-2xl text-sm leading-relaxed",
                    msg.role === 'user' ? "bg-studio-gold/10 text-white border border-studio-gold/20" : "bg-white/5 text-white/90 border border-white/10"
                  )}>
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown>
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  </div>
                </motion.div>
              ))}
              {loading && (
                <div className="flex gap-4 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-white/10" />
                  <div className="h-12 w-48 bg-white/5 rounded-2xl" />
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleChat} className="p-4 border-t border-white/10 bg-white/5 flex gap-3">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask anything about your studio projects..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-studio-gold/50 transition-colors"
              />
              <button 
                type="submit"
                disabled={loading}
                className="studio-button studio-button-primary !p-3"
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        );

      case 'images':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full animate-in fade-in duration-300">
            <div className="space-y-6">
              <div className="glass-panel p-6 space-y-6">
                <h2 className="text-2xl font-display font-bold flex items-center gap-2">
                  <ImageIcon className="text-studio-gold" /> Image Studio
                </h2>
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-white/60">Creative Prompt</label>
                  <textarea
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="A cinematic 4K shot of a futuristic music studio with gold accents..."
                    className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 focus:outline-none focus:border-studio-gold/50 transition-colors resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-white/60">Aspect Ratio</label>
                    <select 
                      value={aspectRatio}
                      onChange={(e) => setAspectRatio(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:outline-none"
                    >
                      {['1:1', '3:4', '4:3', '9:16', '16:9', '21:9'].map(r => (
                        <option key={r} value={r} className="bg-studio-dark">{r}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-white/60">Image Size</label>
                    <select 
                      value={imageSize}
                      onChange={(e) => setImageSize(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:outline-none"
                    >
                      {['1K', '2K', '4K'].map(s => (
                        <option key={s} value={s} className="bg-studio-dark">{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleImageGen}
                  disabled={loading || !imagePrompt}
                  className="w-full studio-button studio-button-primary justify-center"
                >
                  {loading ? <Sparkles className="animate-spin" /> : <Plus />}
                  {loading ? "Generating..." : "Generate Masterpiece"}
                </button>
              </div>
            </div>
            <div className="glass-panel relative flex items-center justify-center overflow-hidden min-h-[400px]">
              {generatedImage ? (
                <div className="group relative w-full h-full">
                  <img src={generatedImage} alt="Generated" className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <button className="studio-button studio-button-secondary !p-3"><Download size={20} /></button>
                    <button className="studio-button studio-button-secondary !p-3"><Maximize2 size={20} /></button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4 opacity-20">
                  <ImageIcon size={64} className="mx-auto" />
                  <p className="text-xl font-display">Your creation will appear here</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'video':
        return (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="glass-panel p-8 max-w-3xl mx-auto space-y-6">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 rounded-xl bg-studio-gold/10 text-studio-gold flex items-center justify-center">
                  <Video size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-display font-bold">Veo Video Engine</h2>
                  <p className="text-white/60 text-sm">Generate cinematic 16:9 or 9:16 videos from text or images.</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <textarea
                  placeholder="Describe the scene you want to generate... (e.g., A slow cinematic drone shot of a gold-plated city at sunset)"
                  className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 focus:outline-none focus:border-studio-gold/50 transition-colors resize-none"
                />
                <div className="flex gap-4">
                  <button className="flex-1 studio-button studio-button-secondary justify-center">
                    <ImageIcon size={18} /> Add Start Frame
                  </button>
                  <button className="flex-1 studio-button studio-button-secondary justify-center">
                    <ImageIcon size={18} /> Add End Frame
                  </button>
                </div>
                <div className="flex gap-4">
                   <select className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none">
                     <option className="bg-studio-dark">16:9 Landscape</option>
                     <option className="bg-studio-dark">9:16 Portrait</option>
                   </select>
                   <select className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none">
                     <option className="bg-studio-dark">1080p High Quality</option>
                     <option className="bg-studio-dark">720p Fast</option>
                   </select>
                </div>
                <button className="w-full studio-button studio-button-primary justify-center">
                  <Play size={18} /> Generate Video
                </button>
              </div>
            </div>
          </div>
        );

      case 'audio':
        return (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="glass-panel p-8 space-y-6">
                <h2 className="text-2xl font-display font-bold flex items-center gap-2">
                  <Mic className="text-studio-gold" /> Audio Transcription
                </h2>
                <div className="border-2 border-dashed border-white/10 rounded-2xl p-12 text-center space-y-4 hover:border-studio-gold/30 transition-colors cursor-pointer">
                  <div className="w-16 h-16 bg-studio-gold/10 text-studio-gold rounded-full flex items-center justify-center mx-auto">
                    <Mic size={32} />
                  </div>
                  <div>
                    <p className="font-medium">Click to record or drag audio file</p>
                    <p className="text-white/40 text-sm">WAV, MP3, or AAC supported</p>
                  </div>
                </div>
                <button className="w-full studio-button studio-button-primary justify-center">
                  Transcribe with Gemini Flash
                </button>
              </div>
              <div className="glass-panel p-8 space-y-4">
                <h3 className="text-lg font-display font-bold">Transcription Output</h3>
                <div className="bg-white/5 rounded-xl p-6 min-h-[300px] text-white/80 leading-relaxed font-mono text-sm">
                  {/* Placeholder for transcription */}
                  <p className="opacity-30 italic">No transcription available yet...</p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="h-full flex items-center justify-center text-center p-12 glass-panel opacity-50">
            <div className="space-y-4">
              <Sparkles size={48} className="mx-auto text-studio-gold" />
              <h2 className="text-2xl font-display font-bold">Coming Soon</h2>
              <p>This feature is currently being integrated into the BILAL-V Studio Engine.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex bg-studio-dark">
        {/* Sidebar */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-studio-gray border-r border-white/5 p-6 flex flex-col"
            >
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-studio-gold rounded-lg flex items-center justify-center font-display font-bold text-black text-xl">B</div>
                  <span className="text-xl font-display font-bold tracking-tight">BILAL-V <span className="text-studio-gold">V</span></span>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-white/60 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <nav className="flex-1 space-y-2">
                <SidebarItem icon={Sparkles} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                <SidebarItem icon={MessageSquare} label="AI Chat" active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
                <SidebarItem icon={ImageIcon} label="Image Studio" active={activeTab === 'images'} onClick={() => setActiveTab('images')} />
                <SidebarItem icon={Video} label="Video Engine" active={activeTab === 'video'} onClick={() => setActiveTab('video')} />
                <SidebarItem icon={Mic} label="Audio Lab" active={activeTab === 'audio'} onClick={() => setActiveTab('audio')} />
              </nav>

              <div className="mt-auto pt-6 border-t border-white/5">
                {user ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} className="w-10 h-10 rounded-full border border-white/10" alt="Avatar" />
                      <div className="overflow-hidden">
                        <p className="text-sm font-medium truncate">{user.displayName || user.email}</p>
                        <p className="text-xs text-white/40 truncate">Pro Member</p>
                      </div>
                    </div>
                    <button onClick={logOut} className="text-white/40 hover:text-red-400 transition-colors">
                      <LogOut size={18} />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={signIn}
                    className="w-full studio-button studio-button-primary justify-center"
                  >
                    Connect Account
                  </button>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className={cn(
          "flex-1 flex flex-col transition-all duration-300",
          isSidebarOpen ? "lg:ml-72" : "ml-0"
        )}>
          {/* Top Header */}
          <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 sticky top-0 bg-studio-dark/80 backdrop-blur-md z-40">
            <div className="flex items-center gap-4">
              {!isSidebarOpen && (
                <button onClick={() => setIsSidebarOpen(true)} className="text-white/60 hover:text-white">
                  <Menu size={20} />
                </button>
              )}
              <div className="flex items-center gap-2 text-sm text-white/40">
                <span>Studio</span>
                <ChevronRight size={14} />
                <span className="text-white/80 capitalize">{activeTab}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-medium text-white/60">Engine Online</span>
              </div>
            </div>
          </header>

          <div className="flex-1 p-6 md:p-10 overflow-y-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}
