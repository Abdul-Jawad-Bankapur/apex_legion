import { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, 
  Search, 
  User, 
  TrendingUp, 
  MessageSquare, 
  LogOut, 
  LogIn, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  MapPin, 
  Calendar, 
  Camera, 
  FileText, 
  ShieldCheck, 
  Leaf, 
  Menu, 
  X,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Award,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  updateDoc, 
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db, signIn, signOut } from './lib/firebase';
import { UserProfile, Item, LostFound, Bid, Message } from './types';
import { analyzeImage, calculateMeritScore, chatWithGemini } from './lib/gemini';
import { api } from './lib/api';
import { useAuth } from '../auth/context/AuthContext';
import '../auth/pages/Auth.css';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Error Handling ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Components ---

const Button = ({ 
  children, 
  className, 
  variant = 'primary', 
  size = 'md', 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger', size?: 'sm' | 'md' | 'lg' }) => {
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md',
    secondary: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md',
    outline: 'border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50',
    ghost: 'text-gray-600 hover:bg-gray-100',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-md'
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-6 py-2.5',
    lg: 'px-8 py-3.5 text-lg font-semibold'
  };
  return (
    <button 
      className={cn('rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2', variants[variant], sizes[size], className)} 
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className, hover = true, onClick }: { children: React.ReactNode, className?: string, hover?: boolean, onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={cn('bg-white border border-gray-100 rounded-2xl p-6 shadow-sm transition-all', hover && 'hover:shadow-xl hover:-translate-y-1', onClick && 'cursor-pointer', className)}
  >
    {children}
  </div>
);

const Badge = ({ children, variant = 'indigo' }: { children: React.ReactNode, variant?: 'indigo' | 'emerald' | 'rose' | 'amber' }) => {
  const variants = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100'
  };
  return (
    <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider', variants[variant])}>
      {children}
    </span>
  );
};

// --- Auth View ---

function AuthView() {
  const [view, setView] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (view === 'login') {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center shadow-xl mb-4">
            <Leaf className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">CampusNexus</h1>
          <p className="text-gray-500 font-medium">{view === 'login' ? 'Welcome back to campus!' : 'Join the student marketplace'}</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {view === 'register' && (
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="John Doe" />
            </div>
          )}
          <div className="form-group">
            <label>College Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="email@college.edu" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
          </div>

          <button type="submit" className="auth-btn primary" disabled={loading}>
            {loading ? 'Processing...' : view === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          {view === 'login' ? "Don't have an account?" : "Already have an account?"}
          <button onClick={() => setView(view === 'login' ? 'register' : 'login')} className="ml-2 font-black text-indigo-600 hover:underline">
            {view === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
}

// --- Main App ---

export default function App() {
  const { user, userData, loading, logout } = useAuth();
  
  // Map teammate's userData to our UserProfile
  const profile: UserProfile | null = useMemo(() => {
    if (!user) return null;
    return {
      uid: user.uid,
      displayName: userData?.fullName || user.displayName || 'Student',
      email: user.email || '',
      photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
      usn: userData?.usn || '',
      meritScore: 50,
      skills: [],
      role: (userData?.role as any) || 'student',
      isVerified: !!user.emailVerified
    };
  }, [user, userData]);

  const [activeTab, setActiveTab] = useState<'home' | 'marketplace' | 'lostfound' | 'workspace' | 'investment' | 'support' | 'meetups'>('home');
  const [items, setItems] = useState<Item[]>([]);
  const [lostFound, setLostFound] = useState<LostFound[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [cart, setCart] = useState<Item[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Data Fetching
  useEffect(() => {
    if (!user) return;
    
    const fetchInitialData = async () => {
      try {
        const [fetchedItems, fetchedLF] = await Promise.all([
          api.getListings(),
          api.getLostFound()
        ]);
        setItems(fetchedItems);
        setLostFound(fetchedLF);
      } catch (err) {
        console.error("Initial fetch failed:", err);
      }
    };

    fetchInitialData();
  }, [user]);

  // Merit-Based Discount Logic
  const calculateDiscountedPrice = (basePrice: number) => {
    if (!profile) return basePrice;
    let discount = 0;
    if (profile.meritScore > 80) discount += 0.15;
    else if (profile.meritScore > 60) discount += 0.10;
    if (profile.skills.length > 5) discount += 0.05;
    return Math.round(basePrice * (1 - discount));
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + calculateDiscountedPrice(item.price), 0);
  }, [cart, profile]);

  if (loading) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
    </div>
  );

  if (!user) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-gray-900 font-sans">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
              <Leaf className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-black tracking-tighter text-indigo-900 hidden sm:block">EcoCampus</span>
          </div>

          <div className="hidden md:flex items-center gap-1 bg-gray-50 p-1 rounded-2xl border border-gray-100">
            {[
              { id: 'home', icon: Sparkles, label: 'Home' },
              { id: 'marketplace', icon: ShoppingBag, label: 'Market' },
              { id: 'lostfound', icon: Search, label: 'Lost & Found' },
              { id: 'meetups', icon: MapPin, label: 'Meetups' },
              { id: 'workspace', icon: Award, label: 'Workspace' },
              { id: 'investment', icon: TrendingUp, label: 'Invest' },
              { id: 'support', icon: MessageSquare, label: 'Support' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all',
                  activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-indigo-600'
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-black text-gray-900">{profile?.displayName}</span>
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Score: {profile?.meritScore}</span>
            </div>
            <img src={profile?.photoURL} className="w-10 h-10 rounded-xl border-2 border-indigo-100 shadow-sm" alt="Profile" />
            <Button variant="ghost" size="sm" onClick={logout} className="hidden sm:flex">
              <LogOut className="w-4 h-4" />
            </Button>
            <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed inset-x-0 top-[73px] bg-white border-b border-gray-100 z-40 p-4 space-y-2"
          >
            {['home', 'marketplace', 'lostfound', 'meetups', 'workspace', 'investment', 'support'].map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab as any); setIsMenuOpen(false); }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold capitalize',
                  activeTab === tab ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600'
                )}
              >
                {tab}
              </button>
            ))}
            <Button variant="danger" className="w-full mt-4" onClick={signOut}>Logout</Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && <HomeView profile={profile} setActiveTab={setActiveTab} items={items} />}
          {activeTab === 'marketplace' && <MarketplaceView profile={profile} items={items} cart={cart} setCart={setCart} calculateDiscountedPrice={calculateDiscountedPrice} cartTotal={cartTotal} />}
          {activeTab === 'lostfound' && <LostFoundView profile={profile} lostFound={lostFound} />}
          {activeTab === 'meetups' && <MeetupView profile={profile} />}
          {activeTab === 'workspace' && <WorkspaceView profile={profile} setProfile={setProfile} />}
          {activeTab === 'investment' && <InvestmentView profile={profile} bids={bids} />}
          {activeTab === 'support' && <SupportView />}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-12 px-4 mt-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Leaf className="text-indigo-600 w-6 h-6" />
              <span className="text-xl font-black tracking-tighter text-indigo-900">EcoCampus</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              Empowering students through a circular economy and decentralized investment. 
              Reducing waste, building trust, and fostering academic excellence.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Quick Links</h4>
            <div className="grid grid-cols-2 gap-2">
              {['Marketplace', 'Lost & Found', 'Workspace', 'P2P Bidding', 'Support', 'Privacy'].map(link => (
                <a key={link} href="#" className="text-sm text-gray-500 hover:text-indigo-600 transition-colors">{link}</a>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Campus Stats</h4>
            <div className="flex gap-8">
              <div>
                <div className="text-2xl font-black text-indigo-600">1.2k+</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase">Active Students</div>
              </div>
              <div>
                <div className="text-2xl font-black text-emerald-600">₹45k</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase">Carbon Saved</div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- Views ---

function HomeView({ profile, setActiveTab, items }: { profile: UserProfile | null, setActiveTab: any, items: Item[] }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-12"
    >
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-indigo-900 p-8 md:p-16 text-white">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-800/50 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-8">
          <Badge variant="amber">Welcome Back, {profile?.displayName}</Badge>
          <h2 className="text-5xl md:text-7xl font-black leading-[0.9] tracking-tighter">
            Your Campus, <br />
            <span className="text-indigo-400">Decentralized.</span>
          </h2>
          <p className="text-lg text-indigo-100 font-medium max-w-md">
            Trade academic gear, track your merit score, and get invested in by the community.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button size="lg" onClick={() => setActiveTab('marketplace')}>
              Explore Marketplace
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button variant="outline" size="lg" className="border-indigo-400 text-indigo-100 hover:bg-indigo-800" onClick={() => setActiveTab('workspace')}>
              View Workspace
            </Button>
          </div>
        </div>
        
        {/* Floating Stats */}
        <div className="absolute bottom-8 right-8 hidden lg:flex gap-4">
          <Card className="bg-white/10 backdrop-blur-md border-white/20 p-4 w-40" hover={false}>
            <div className="text-xs font-bold text-indigo-300 uppercase">Merit Score</div>
            <div className="text-3xl font-black">{profile?.meritScore}</div>
          </Card>
          <Card className="bg-white/10 backdrop-blur-md border-white/20 p-4 w-40" hover={false}>
            <div className="text-xs font-bold text-indigo-300 uppercase">Rank</div>
            <div className="text-3xl font-black">#12</div>
          </Card>
        </div>
      </section>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="group cursor-pointer" onClick={() => setActiveTab('marketplace')}>
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-colors">
            <ShoppingBag className="text-indigo-600 group-hover:text-white transition-colors" />
          </div>
          <h3 className="text-xl font-black mb-2">Buy & Sell Gear</h3>
          <p className="text-sm text-gray-500">Trade textbooks, electronics, and more with merit-based discounts.</p>
        </Card>
        <Card className="group cursor-pointer" onClick={() => setActiveTab('lostfound')}>
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-600 transition-colors">
            <Search className="text-emerald-600 group-hover:text-white transition-colors" />
          </div>
          <h3 className="text-xl font-black mb-2">Lost & Found</h3>
          <p className="text-sm text-gray-500">AI-powered matching for lost items on campus.</p>
        </Card>
        <Card className="group cursor-pointer" onClick={() => setActiveTab('investment')}>
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-amber-600 transition-colors">
            <TrendingUp className="text-amber-600 group-hover:text-white transition-colors" />
          </div>
          <h3 className="text-xl font-black mb-2">P2P Investment</h3>
          <p className="text-sm text-gray-500">Get funded by investors based on your academic potential.</p>
        </Card>
      </div>

      {/* Featured Items */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-black tracking-tight">New in Marketplace</h3>
          <Button variant="ghost" onClick={() => setActiveTab('marketplace')}>View All <ChevronRight className="w-4 h-4" /></Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {items.slice(0, 4).map(item => (
            <Card key={item.id} className="p-0 overflow-hidden">
              <img src={item.imageUrl} className="w-full aspect-square object-cover" alt={item.title} />
              <div className="p-4 space-y-2">
                <h4 className="font-bold text-sm truncate">{item.title}</h4>
                <div className="flex items-center justify-between">
                  <span className="text-indigo-600 font-black">₹{item.price}</span>
                  <Badge variant="emerald">New</Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </motion.div>
  );
}

function MarketplaceView({ profile, items, cart, setCart, calculateDiscountedPrice, cartTotal }: { profile: UserProfile | null, items: Item[], cart: Item[], setCart: any, calculateDiscountedPrice: any, cartTotal: number }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', description: '', price: 0, category: 'Books', condition: 'Good', imageUrl: '' });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Always show preview immediately
    const reader = new FileReader();
    reader.onloadend = async () => {
      setNewItem(prev => ({ ...prev, imageUrl: reader.result as string }));
      
      if (!manualEntry) {
        setIsAnalyzing(true);
        try {
          const base64 = (reader.result as string).split(',')[1];
          const analysis = await analyzeImage(base64);
          setNewItem(prev => ({ ...prev, ...analysis, imageUrl: reader.result as string }));
        } catch (err) {
          console.error("AI Analysis failed, switching to manual", err);
          setManualEntry(true);
        } finally {
          setIsAnalyzing(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddItem = async () => {
    if (!profile) return;
    await addDoc(collection(db, 'items'), {
      ...newItem,
      sellerId: profile.uid,
      status: 'available',
      carbonSaved: Math.floor(Math.random() * 50) + 10,
      createdAt: new Date().toISOString()
    });
    setIsAdding(false);
    setNewItem({ title: '', description: '', price: 0, category: 'Books', condition: 'Good', imageUrl: '' });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="grid grid-cols-1 lg:grid-cols-4 gap-8"
    >
      {/* Sidebar Filters */}
      <div className="space-y-8">
        <div className="space-y-4">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Categories</h3>
          <div className="space-y-2">
            {['All Items', 'Books', 'Electronics', 'Lab Gear', 'Stationery', 'Donations'].map(cat => (
              <button key={cat} className="w-full text-left px-4 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-white hover:text-indigo-600 transition-all">
                {cat}
              </button>
            ))}
          </div>
        </div>

        <Card className="bg-indigo-600 text-white border-none">
          <Leaf className="w-8 h-8 mb-4 text-indigo-300" />
          <h4 className="text-lg font-black mb-2">Eco-Impact</h4>
          <p className="text-xs text-indigo-100 leading-relaxed mb-4">
            Buying used items on campus has saved <strong>124kg</strong> of CO2 this semester.
          </p>
          <div className="w-full bg-indigo-800 rounded-full h-2">
            <div className="bg-emerald-400 h-full rounded-full w-3/4" />
          </div>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-black tracking-tight">Marketplace</h2>
          <Button onClick={() => setIsAdding(true)}>
            <Plus className="w-4 h-4" />
            Sell Item
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {items.map(item => (
            <Card key={item.id} className="p-0 overflow-hidden flex flex-col">
              <div className="relative">
                <img src={item.imageUrl || 'https://picsum.photos/seed/item/400/300'} className="w-full aspect-[4/3] object-cover" alt={item.title} />
                <div className="absolute top-3 right-3">
                  <Badge variant="amber">₹{item.price}</Badge>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h4 className="text-lg font-black text-indigo-900 leading-tight mb-1">{item.title}</h4>
                  <p className="text-xs text-gray-500 line-clamp-2">{item.description}</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    <span>Condition: {item.condition}</span>
                    <span className="text-emerald-600 flex items-center gap-1"><Leaf className="w-3 h-3" /> {item.carbonSaved}kg saved</span>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Your Price</span>
                      <span className="text-xl font-black text-indigo-600">₹{calculateDiscountedPrice(item.price)}</span>
                    </div>
                    <Button size="sm" onClick={() => setCart([...cart, item])}>Add to Cart</Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="space-y-6">
        <Card className="sticky top-24">
          <div className="flex items-center gap-2 mb-6">
            <ShoppingBag className="text-indigo-600 w-5 h-5" />
            <h3 className="text-lg font-black">Your Cart</h3>
          </div>
          
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {cart.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <ShoppingBag className="w-8 h-8 text-gray-200 mx-auto" />
                <p className="text-sm text-gray-400 font-bold">Cart is empty</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 group">
                  <img src={item.imageUrl} className="w-12 h-12 rounded-lg object-cover" alt="" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{item.title}</div>
                    <div className="text-xs font-black text-indigo-600">₹{calculateDiscountedPrice(item.price)}</div>
                  </div>
                  <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-rose-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-500">Subtotal</span>
              <span className="text-lg font-black">₹{cartTotal}</span>
            </div>
            <div className="bg-emerald-50 p-3 rounded-xl flex items-center gap-2">
              <Sparkles className="text-emerald-600 w-4 h-4" />
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Merit Discount Applied!</span>
            </div>
            <Button className="w-full" disabled={cart.length === 0}>Checkout</Button>
          </div>
        </Card>
      </div>

      {/* Add Item Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-indigo-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-xl w-full shadow-2xl space-y-8"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black tracking-tight">List New Item</h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full">
                    <span className="text-[10px] font-black uppercase text-gray-500">Manual</span>
                    <button 
                      onClick={() => setManualEntry(!manualEntry)}
                      className={cn("w-8 h-4 rounded-full transition-all relative", manualEntry ? "bg-indigo-600" : "bg-gray-300")}
                    >
                      <div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm", manualEntry ? "left-4.5" : "left-0.5")} />
                    </button>
                  </div>
                  <button onClick={() => setIsAdding(false)}><X /></button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="aspect-square bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center relative overflow-hidden group">
                    {newItem.imageUrl ? (
                      <img src={newItem.imageUrl} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <>
                        <Camera className="w-8 h-8 text-gray-300 mb-2" />
                        <span className="text-xs font-bold text-gray-400 uppercase">Upload Photo</span>
                      </>
                    )}
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} />
                    {isAnalyzing && (
                      <div className="absolute inset-0 bg-indigo-600/80 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                        <Sparkles className="animate-pulse w-8 h-8 mb-2" />
                        <span className="text-xs font-bold uppercase tracking-widest">AI Analyzing...</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase text-center">Gemini AI will auto-tag your item</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Title</label>
                    <input 
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500" 
                      value={newItem.title}
                      onChange={e => setNewItem({ ...newItem, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Base Price (₹)</label>
                    <input 
                      type="number"
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500" 
                      value={newItem.price}
                      onChange={e => setNewItem({ ...newItem, price: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</label>
                    <select 
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                      value={newItem.category}
                      onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                    >
                      <option>Books</option>
                      <option>Electronics</option>
                      <option>Lab Gear</option>
                      <option>Stationery</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</label>
                <textarea 
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500 h-24"
                  value={newItem.description}
                  onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                />
              </div>

              <div className="flex gap-4">
                <Button variant="outline" className="flex-1" onClick={() => setIsAdding(false)}>Cancel</Button>
                <Button className="flex-1" onClick={handleAddItem}>List Item</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function LostFoundView({ profile, lostFound }: { profile: UserProfile | null, lostFound: LostFound[] }) {
  const [isReporting, setIsReporting] = useState(false);
  const [newReport, setNewReport] = useState({ title: '', description: '', type: 'lost' as 'lost' | 'found', imageUrl: '', tags: [] as string[] });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onloadend = async () => {
      setNewReport(prev => ({ ...prev, imageUrl: reader.result as string }));

      if (!manualEntry) {
        setIsAnalyzing(true);
        try {
          const base64 = (reader.result as string).split(',')[1];
          const analysis = await analyzeImage(base64);
          setNewReport(prev => ({ ...prev, ...analysis, imageUrl: reader.result as string }));
        } catch (err) {
          console.error("Lost & Found AI Analysis failed", err);
          setManualEntry(true);
        } finally {
          setIsAnalyzing(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddReport = async () => {
    if (!profile) return;
    try {
      const reportData = {
        description: newReport.description,
        tags: newReport.tags.join(','),
        photo_url: newReport.imageUrl,
        location_text: 'Campus', // Default for now
        type: newReport.type
      };

      await api.reportLostFound(reportData);
      
      // Refresh
      const updatedLF = await api.getLostFound();
      setLostFound(updatedLF);
      
      setIsReporting(false);
      setNewReport({ title: '', description: '', type: 'lost', imageUrl: '', tags: [] });
    } catch (err) {
      console.error("Failed to submit report:", err);
      alert("Failed to submit report.");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight">Lost & Found</h2>
          <p className="text-sm text-gray-500 font-medium">AI-powered matching for campus property.</p>
        </div>
        <Button onClick={() => setIsReporting(true)}>
          <Plus className="w-4 h-4" />
          Report Item
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {lostFound.map(report => (
          <Card key={report.id} className="p-0 overflow-hidden">
            <div className="relative">
              <img src={report.imageUrl || 'https://picsum.photos/seed/lost/400/300'} className="w-full aspect-video object-cover" alt="" />
              <div className="absolute top-3 left-3">
                <Badge variant={report.type === 'lost' ? 'rose' : 'emerald'}>{report.type}</Badge>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <h4 className="text-lg font-black text-indigo-900">{report.title}</h4>
              <p className="text-xs text-gray-500 line-clamp-2">{report.description}</p>
              <div className="flex flex-wrap gap-2">
                {report.tags.map(tag => (
                  <span key={tag} className="text-[10px] font-bold text-indigo-400 bg-indigo-50 px-2 py-1 rounded-md">#{tag}</span>
                ))}
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                <span className="text-[10px] font-bold text-gray-400 uppercase">{new Date(report.createdAt).toLocaleDateString()}</span>
                <Button variant="outline" size="sm">I found this</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Report Modal */}
      <AnimatePresence>
        {isReporting && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-indigo-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-xl w-full shadow-2xl space-y-8"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black tracking-tight">Report Item</h3>
                <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full">
                   <span className="text-[10px] font-black uppercase text-gray-500">Manual</span>
                   <button 
                     onClick={() => setManualEntry(!manualEntry)}
                     className={cn("w-8 h-4 rounded-full transition-all relative", manualEntry ? "bg-indigo-600" : "bg-gray-300")}
                   >
                     <div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm", manualEntry ? "left-4.5" : "left-0.5")} />
                   </button>
                 </div>
                 <button onClick={() => setIsReporting(false)}><X /></button>
               </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="aspect-square bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center relative overflow-hidden">
                    {newReport.imageUrl ? (
                      <img src={newReport.imageUrl} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <>
                        <Camera className="w-8 h-8 text-gray-300 mb-2" />
                        <span className="text-xs font-bold text-gray-400 uppercase">Upload Photo</span>
                      </>
                    )}
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} />
                    {isAnalyzing && (
                      <div className="absolute inset-0 bg-indigo-600/80 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                        <Sparkles className="animate-pulse w-8 h-8 mb-2" />
                        <span className="text-xs font-bold uppercase tracking-widest">AI Analyzing...</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</label>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setNewReport({ ...newReport, type: 'lost' })}
                        className={cn('flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all', newReport.type === 'lost' ? 'bg-rose-50 border-rose-200 text-rose-600' : 'border-gray-100 text-gray-400')}
                      >Lost</button>
                      <button 
                        onClick={() => setNewReport({ ...newReport, type: 'found' })}
                        className={cn('flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all', newReport.type === 'found' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'border-gray-100 text-gray-400')}
                      >Found</button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Title</label>
                    <input 
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500" 
                      value={newReport.title}
                      onChange={e => setNewReport({ ...newReport, title: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</label>
                <textarea 
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500 h-24"
                  value={newReport.description}
                  onChange={e => setNewReport({ ...newReport, description: e.target.value })}
                />
              </div>

              <div className="flex gap-4">
                <Button variant="outline" className="flex-1" onClick={() => setIsReporting(false)}>Cancel</Button>
                <Button className="flex-1" onClick={handleAddReport}>Submit Report</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function WorkspaceView({ profile, setProfile }: { profile: UserProfile | null, setProfile: any }) {
  const [isImporting, setIsImporting] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);

  const handleImport = async () => {
    if (!profile) return;
    setIsCalculating(true);
    const result = await calculateMeritScore(csvData);
    const updatedProfile = { 
      ...profile, 
      meritScore: result.score, 
      skills: result.skills,
      academicData: { raw: csvData, analysis: result.analysis }
    };
    await updateDoc(doc(db, 'users', profile.uid), updatedProfile);
    setProfile(updatedProfile);
    setIsCalculating(false);
    setIsImporting(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight">Student Workspace</h2>
          <p className="text-sm text-gray-500 font-medium">Track your merit score and academic growth.</p>
        </div>
        <Button onClick={() => setIsImporting(true)}>
          <FileText className="w-4 h-4" />
          Import Academic Data
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <Card className="lg:col-span-1 space-y-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <img src={profile?.photoURL} className="w-24 h-24 rounded-[2rem] border-4 border-indigo-50 shadow-xl" alt="" />
              <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-2 rounded-xl shadow-lg">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-2 w-full">
              <h3 className="text-2xl font-black text-indigo-900">{profile?.displayName}</h3>
              <div className="flex flex-col items-center gap-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">USN</label>
                <input 
                  className="bg-transparent border-b border-gray-100 focus:border-indigo-600 text-center text-xs font-bold text-gray-600 outline-none w-full"
                  value={profile?.usn}
                  onChange={async (e) => {
                    const newUsn = e.target.value;
                    setProfile((prev: any) => prev ? ({ ...prev, usn: newUsn }) : null);
                    if (profile) {
                      try {
                        await updateDoc(doc(db, 'users', profile.uid), { usn: newUsn });
                      } catch (err) {
                        handleFirestoreError(err, OperationType.UPDATE, `users/${profile.uid}`);
                      }
                    }
                  }}
                  placeholder="Enter USN"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <Award className="text-indigo-600 w-5 h-5" />
                <span className="text-sm font-bold text-indigo-900">Merit Score</span>
              </div>
              <span className="text-2xl font-black text-indigo-600">{profile?.meritScore}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <Zap className="text-emerald-600 w-5 h-5" />
                <span className="text-sm font-bold text-emerald-900">Skills Tracked</span>
              </div>
              <span className="text-2xl font-black text-emerald-600">{profile?.skills.length}</span>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Skill Cloud</h4>
            <div className="flex flex-wrap gap-2">
              {profile?.skills.map(skill => (
                <span key={skill} className="px-3 py-1 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold text-gray-600">{skill}</span>
              ))}
            </div>
          </div>
        </Card>

        {/* Analysis & Progress */}
        <Card className="lg:col-span-2 space-y-8">
          <div className="space-y-4">
            <h3 className="text-xl font-black text-indigo-900">Academic Analysis</h3>
            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 min-h-[200px] text-sm text-gray-600 leading-relaxed">
              {profile?.academicData?.analysis || "Import your academic data (CSV/Excel) to see a detailed AI analysis of your performance and merit score breakdown."}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Marketplace Benefits</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border border-gray-100 rounded-xl">
                  <span className="text-xs font-bold">Merit Discount</span>
                  <span className="text-xs font-black text-emerald-600">15% OFF</span>
                </div>
                <div className="flex items-center justify-between p-3 border border-gray-100 rounded-xl">
                  <span className="text-xs font-bold">Priority Listings</span>
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Investment Readiness</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border border-gray-100 rounded-xl">
                  <span className="text-xs font-bold">Bidding Status</span>
                  <Badge variant="amber">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border border-gray-100 rounded-xl">
                  <span className="text-xs font-bold">Market Cap</span>
                  <span className="text-xs font-black text-indigo-600">₹2.5L</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Import Modal */}
      <AnimatePresence>
        {isImporting && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-indigo-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-xl w-full shadow-2xl space-y-8"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black tracking-tight">Import Academic Data</h3>
                <button onClick={() => setIsImporting(false)}><X /></button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-gray-500">Paste your academic records (CSV format) below. Gemini AI will analyze your performance to update your Merit Score.</p>
                <textarea 
                  className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-mono focus:ring-2 focus:ring-indigo-500 h-64"
                  placeholder="Semester,Subject,Grade,GPA\n1,Mathematics,A,4.0\n1,Physics,B,3.5..."
                  value={csvData}
                  onChange={e => setCsvData(e.target.value)}
                />
              </div>

              <div className="flex gap-4">
                <Button variant="outline" className="flex-1" onClick={() => setIsImporting(false)}>Cancel</Button>
                <Button className="flex-1" onClick={handleImport} disabled={isCalculating}>
                  {isCalculating ? <Sparkles className="animate-spin w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                  {isCalculating ? 'Analyzing...' : 'Calculate Score'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function InvestmentView({ profile, bids }: { profile: UserProfile | null, bids: Bid[] }) {
  const [isBidding, setIsBidding] = useState(false);
  const [bidAmount, setBidAmount] = useState(10000);
  const [equity, setEquity] = useState(5);

  const handlePlaceBid = async () => {
    if (!profile) return;
    await addDoc(collection(db, 'bids'), {
      studentId: profile.uid,
      bidderId: 'system-investor', // Mock for now
      amount: bidAmount,
      equityPercentage: equity,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    setIsBidding(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight">P2P Investment Dashboard</h2>
          <p className="text-sm text-gray-500 font-medium">The Student Stock Market: Trade potential, build futures.</p>
        </div>
        <Button onClick={() => setIsBidding(true)}>
          <TrendingUp className="w-4 h-4" />
          Open Bidding
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Market Cap Card */}
        <Card className="lg:col-span-1 bg-indigo-900 text-white border-none p-8 space-y-8">
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Current Market Cap</h3>
            <div className="text-5xl font-black">₹{Math.round((profile?.meritScore || 50) * 5000)}</div>
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
              <TrendingUp className="w-4 h-4" />
              +12.5% this month
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between text-xs font-bold text-indigo-200 uppercase">
              <span>Risk Profile</span>
              <span>Low</span>
            </div>
            <div className="w-full bg-indigo-800 rounded-full h-2">
              <div className="bg-emerald-400 h-full rounded-full w-1/4" />
            </div>
          </div>

          <div className="pt-8 border-t border-indigo-800 space-y-4">
            <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Success Bond Terms</h4>
            <ul className="space-y-3 text-sm text-indigo-100">
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-indigo-400" /> 5% Income Share</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-indigo-400" /> 3 Year Duration</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-indigo-400" /> Smart Contract Protected</li>
            </ul>
          </div>
        </Card>

        {/* Active Bids */}
        <Card className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-black text-indigo-900">Active Investment Bids</h3>
          <div className="space-y-4">
            {bids.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <TrendingUp className="w-12 h-12 text-gray-100 mx-auto" />
                <p className="text-gray-400 font-bold">No active bids yet. Open your profile for bidding!</p>
              </div>
            ) : (
              bids.map(bid => (
                <div key={bid.id} className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                      <User className="text-indigo-600" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-indigo-900">Bidder #{bid.bidderId.slice(0, 5)}</div>
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Equity: {bid.equityPercentage}%</div>
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <div className="text-xl font-black text-indigo-600">₹{bid.amount}</div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Reject</Button>
                      <Button size="sm">Accept</Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Bidding Modal */}
      <AnimatePresence>
        {isBidding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-indigo-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-xl w-full shadow-2xl space-y-8"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black tracking-tight">Open Bidding Session</h3>
                <button onClick={() => setIsBidding(false)}><X /></button>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between text-xs font-black uppercase tracking-widest text-gray-400">
                    <span>Target Investment</span>
                    <span>₹{bidAmount}</span>
                  </div>
                  <input 
                    type="range" min="5000" max="100000" step="5000"
                    className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    value={bidAmount}
                    onChange={e => setBidAmount(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between text-xs font-black uppercase tracking-widest text-gray-400">
                    <span>Equity Offered (Income Share)</span>
                    <span>{equity}%</span>
                  </div>
                  <input 
                    type="range" min="1" max="15" step="1"
                    className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    value={equity}
                    onChange={e => setEquity(Number(e.target.value))}
                  />
                </div>

                <Card className="bg-amber-50 border-amber-100 p-4 flex gap-4 items-start" hover={false}>
                  <AlertCircle className="text-amber-600 w-5 h-5 shrink-0" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    By opening bidding, you agree to the <strong>Success Bond</strong> terms. 
                    If your Merit Score drops below 40, your investment value may be liquidated.
                  </p>
                </Card>
              </div>

              <div className="flex gap-4">
                <Button variant="outline" className="flex-1" onClick={() => setIsBidding(false)}>Cancel</Button>
                <Button className="flex-1" onClick={handlePlaceBid}>Launch Bidding</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MeetupView({ profile }: { profile: UserProfile | null }) {
  const [meetups, setMeetups] = useState<any[]>([]);
  const [isScheduling, setIsScheduling] = useState(false);
  const [newMeetup, setNewMeetup] = useState({ location: 'Main Library Hub', time: '', purpose: 'Marketplace Handover' });

  useEffect(() => {
    if (!profile) return;
    const q = query(collection(db, 'meetups'), where('participants', 'array-contains', profile.uid));
    return onSnapshot(q, (snap) => {
      setMeetups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [profile]);

  const handleSchedule = async () => {
    if (!profile) return;
    try {
      await addDoc(collection(db, 'meetups'), {
        ...newMeetup,
        participants: [profile.uid],
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setIsScheduling(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'meetups');
    }
  };

  const hotspots = [
    'Main Library Hub',
    'Student Center Plaza',
    'Engineering Block Cafe',
    'Campus Sports Ground',
    'Verified Hotspot - Gate 2'
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight">Meetup Scheduler</h2>
          <p className="text-sm text-gray-500 font-medium">Secure physical handovers at verified campus hotspots.</p>
        </div>
        <Button onClick={() => setIsScheduling(true)}>
          <Calendar className="w-4 h-4" />
          Schedule Meetup
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {meetups.length === 0 ? (
          <div className="col-span-full text-center py-20 space-y-4">
            <MapPin className="w-12 h-12 text-gray-100 mx-auto" />
            <p className="text-gray-400 font-bold">No scheduled meetups yet.</p>
          </div>
        ) : (
          meetups.map(m => (
            <Card key={m.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="indigo">{m.purpose}</Badge>
                <span className="text-[10px] font-bold text-gray-400 uppercase">{m.status}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-indigo-900">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  {m.location}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  {m.time ? new Date(m.time).toLocaleString() : 'TBD'}
                </div>
              </div>
              <Button variant="outline" className="w-full" size="sm">View Details</Button>
            </Card>
          ))
        )}
      </div>

      <AnimatePresence>
        {isScheduling && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-indigo-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black tracking-tight">Schedule Handover</h3>
                <button onClick={() => setIsScheduling(false)}><X /></button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hotspot Location</label>
                  <select 
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                    value={newMeetup.location}
                    onChange={e => setNewMeetup({ ...newMeetup, location: e.target.value })}
                  >
                    {hotspots.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date & Time</label>
                  <input 
                    type="datetime-local"
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                    value={newMeetup.time}
                    onChange={e => setNewMeetup({ ...newMeetup, time: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Purpose</label>
                  <input 
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                    value={newMeetup.purpose}
                    onChange={e => setNewMeetup({ ...newMeetup, purpose: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <Button variant="outline" className="flex-1" onClick={() => setIsScheduling(false)}>Cancel</Button>
                <Button className="flex-1" onClick={handleSchedule}>Confirm Meetup</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SupportView() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Hello! I am your EcoCampus Support Bot. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    try {
      const response = await chatWithGemini([...messages, userMsg]);
      setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error. Please try again.' }]);
    }
    setIsLoading(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-3xl mx-auto h-[70vh] flex flex-col"
    >
      <Card className="flex-1 flex flex-col p-0 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <MessageSquare className="text-white w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-indigo-900">EcoCampus Support</h3>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">AI Agent Online</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, idx) => (
            <div key={idx} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'max-w-[80%] p-4 rounded-2xl text-sm font-medium leading-relaxed',
                msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'
              )}>
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 p-4 rounded-2xl rounded-tl-none flex gap-2">
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <div className="flex gap-2">
            <input 
              className="flex-1 bg-white border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 shadow-sm"
              placeholder="Ask me anything about EcoCampus..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <Button onClick={handleSend} disabled={isLoading}>
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
