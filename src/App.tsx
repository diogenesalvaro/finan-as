import React, { useState, useEffect, useMemo } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  Timestamp, 
  updateDoc, 
  deleteDoc,
  limit
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, Family, Transaction, Goal, CATEGORIES, CreditCard } from './types';
import { handleFirestoreError, OperationType } from './utils/error';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Target, 
  Users, 
  LogOut, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Calendar, 
  ChevronRight, 
  Trophy,
  PieChart as PieChartIcon,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  CreditCard as CreditCardIcon,
  MoreVertical,
  Pencil,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie,
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// --- Components ---

const LoadingScreen = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full mb-4"
    />
    <p className="text-slate-600 font-medium">Carregando sua vida financeira...</p>
  </div>
);

const LoginScreen = () => {
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center"
      >
        <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Wallet className="w-10 h-10 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">FamíliaFinanças</h1>
        <p className="text-slate-600 mb-8">Gestão financeira colaborativa para sua família. Organize, planeje e conquiste juntos.</p>
        
        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white py-4 px-6 rounded-2xl font-semibold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
          Entrar com Google
        </button>
      </motion.div>
    </div>
  );
};

const SetupFamily = ({ user, onComplete }: { user: FirebaseUser, onComplete: () => void }) => {
  const [familyName, setFamilyName] = useState('');
  const [familyIdToJoin, setFamilyIdToJoin] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };
  const [mode, setMode] = useState<'create' | 'join'>('create');

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyName.trim()) return;
    setLoading(true);
    try {
      const familyRef = await addDoc(collection(db, 'families'), {
        name: familyName,
        ownerId: user.uid,
        createdAt: Timestamp.now()
      });

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName: user.displayName || 'Usuário',
        email: user.email || '',
        familyId: familyRef.id,
        role: 'admin',
        photoURL: user.photoURL || ''
      });
      onComplete();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'families/users');
      showNotification('Erro ao configurar família.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyIdToJoin.trim()) return;
    setLoading(true);
    try {
      const familySnap = await getDoc(doc(db, 'families', familyIdToJoin.trim()));
      if (!familySnap.exists()) {
        showNotification('Família não encontrada. Verifique o ID.', 'error');
        return;
      }

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName: user.displayName || 'Usuário',
        email: user.email || '',
        familyId: familyIdToJoin.trim(),
        role: 'member',
        photoURL: user.photoURL || ''
      });
      onComplete();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
      showNotification('Erro ao entrar na família. Verifique o ID.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <AnimatePresence>
        {notification && (
          <Notification 
            message={notification.message} 
            type={notification.type} 
            onClose={() => setNotification(null)} 
          />
        )}
      </AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8"
      >
        <div className="flex p-1 bg-slate-100 rounded-xl mb-8">
          <button 
            onClick={() => setMode('create')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'create' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
          >
            Criar Família
          </button>
          <button 
            onClick={() => setMode('join')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'join' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
          >
            Entrar em uma
          </button>
        </div>

        <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">
          {mode === 'create' ? 'Configurar sua Família' : 'Entrar em uma Família'}
        </h2>

        {mode === 'create' ? (
          <form onSubmit={handleCreateFamily} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Família</label>
              <input
                type="text"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder="Ex: Família Silva"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-4 rounded-xl font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar Família'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoinFamily} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ID da Família</label>
              <input
                type="text"
                value={familyIdToJoin}
                onChange={(e) => setFamilyIdToJoin(e.target.value)}
                placeholder="Cole o ID aqui"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-4 rounded-xl font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar na Família'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [sharedCards, setSharedCards] = useState<CreditCard[]>([]);
  const [myCards, setMyCards] = useState<CreditCard[]>([]);
  
  const cards = useMemo(() => {
    const map = new Map<string, CreditCard>();
    sharedCards.forEach(c => map.set(c.id, c));
    myCards.forEach(c => map.set(c.id, c));
    return Array.from(map.values()).sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
  }, [sharedCards, myCards]);

  const [familyMembers, setFamilyMembers] = useState<UserProfile[]>([]);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [showAddFunds, setShowAddFunds] = useState<Goal | null>(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'goals' | 'family' | 'cards'>('dashboard');
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
  };

  const handleCreateCard = async (data: any) => {
    console.log('handleCreateCard called with data:', data);
    if (!user) {
      console.error('No user found in handleCreateCard');
      showNotification('Usuário não autenticado. Tente fazer login novamente.', 'error');
      return;
    }
    if (!profile) {
      console.error('No profile found in handleCreateCard');
      showNotification('Perfil não encontrado. Tente recarregar a página.', 'error');
      return;
    }
    if (!profile.familyId) {
      console.error('No familyId found in profile:', profile);
      showNotification('Família não encontrada. Tente recarregar a página.', 'error');
      return;
    }
    try {
      console.log('Adding card to Firestore...');
      const cardData = {
        cardName: data.cardName,
        cardNumberLast4: data.cardNumberLast4,
        expiryDate: data.expiryDate || '',
        limit: Number(data.limit) || 0,
        currentBalance: Number(data.currentBalance) || 0,
        color: data.color || '#1e293b',
        type: data.type,
        familyId: profile.familyId,
        userId: user.uid,
        createdAt: Timestamp.now(),
        isShared: data.isShared || false
      };
      await addDoc(collection(db, 'cards'), cardData);
      console.log('Card added successfully');
      setShowAddCard(false);
      showNotification('Cartão adicionado com sucesso!');
    } catch (error) {
      console.error('Error in handleCreateCard:', error);
      showNotification('Erro ao adicionar cartão. Verifique os dados e tente novamente.', 'error');
      handleFirestoreError(error, OperationType.WRITE, 'cards');
    }
  };

  const handleDeleteCard = async (id: string) => {
    setConfirmModal({
      title: 'Excluir Cartão',
      message: 'Tem certeza que deseja excluir este cartão?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'cards', id));
          setConfirmModal(null);
          showNotification('Cartão excluído com sucesso!');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, 'cards');
        }
      }
    });
  };

  const handleToggleCardVisibility = async (id: string, isShared: boolean) => {
    try {
      await updateDoc(doc(db, 'cards', id), { isShared });
      showNotification(isShared ? 'Cartão agora é visível para a família.' : 'Cartão agora é privado.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `cards/${id}`);
      showNotification('Erro ao alterar visibilidade do cartão.', 'error');
    }
  };

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setFamily(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  // Profile & Family Listener
  useEffect(() => {
    if (!user) return;

    const unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const p = docSnap.data() as UserProfile;
        setProfile(p);
        
        // Family Listener
        onSnapshot(doc(db, 'families', p.familyId), (familySnap) => {
          if (familySnap.exists()) {
            setFamily({ id: familySnap.id, ...familySnap.data() } as Family);
          }
        });
      } else {
        setProfile(null);
      }
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}`));

    return () => unsubscribeProfile();
  }, [user]);

  // Transactions & Goals Listener
  useEffect(() => {
    if (!profile?.familyId || !user?.uid) return;

    const qTransactions = query(
      collection(db, 'transactions'),
      where('familyId', '==', profile.familyId),
      orderBy('date', 'desc')
    );

    const unsubscribeTransactions = onSnapshot(qTransactions, (snapshot) => {
      const txs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
      setTransactions(txs);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'transactions'));

    const qGoals = query(
      collection(db, 'goals'),
      where('familyId', '==', profile.familyId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeGoals = onSnapshot(qGoals, (snapshot) => {
      const gs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Goal));
      setGoals(gs);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'goals'));

    const qSharedCards = query(
      collection(db, 'cards'),
      where('familyId', '==', profile.familyId),
      where('isShared', '==', true)
    );

    const qMyCards = query(
      collection(db, 'cards'),
      where('familyId', '==', profile.familyId),
      where('userId', '==', user.uid)
    );

    const unsubscribeSharedCards = onSnapshot(qSharedCards, (snapshot) => {
      const cs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CreditCard));
      setSharedCards(cs);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'cards'));

    const unsubscribeMyCards = onSnapshot(qMyCards, (snapshot) => {
      const cs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CreditCard));
      setMyCards(cs);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'cards'));

    return () => {
      unsubscribeTransactions();
      unsubscribeGoals();
      unsubscribeSharedCards();
      unsubscribeMyCards();
    };
  }, [profile?.familyId, user?.uid]);

  // Family Members Listener
  useEffect(() => {
    if (!profile?.familyId) return;

    const qMembers = query(
      collection(db, 'users'),
      where('familyId', '==', profile.familyId)
    );

    const unsubscribe = onSnapshot(qMembers, (snapshot) => {
      const members = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setFamilyMembers(members);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    return unsubscribe;
  }, [profile?.familyId]);

  // Auto-hide notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Stats Calculations
  const achievements = useMemo(() => {
    const list = [];
    if (goals.some(g => g.isCompleted)) {
      list.push({ title: "Primeira Meta", description: "A família completou sua primeira meta financeira.", icon: "🎯" });
    }
    const now = new Date();
    const monthlyIncome = transactions
      .filter(tx => tx.type === 'income' && tx.date.toDate().getMonth() === now.getMonth() && tx.date.toDate().getFullYear() === now.getFullYear())
      .reduce((sum, tx) => sum + tx.amount, 0);
    const monthlyExpense = transactions
      .filter(tx => tx.type === 'expense' && tx.date.toDate().getMonth() === now.getMonth() && tx.date.toDate().getFullYear() === now.getFullYear())
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    if (monthlyIncome > monthlyExpense && monthlyExpense > 0) {
      list.push({ title: "Economia do Mês", description: "Gastaram menos do que o planejado este mês.", icon: "💰" });
    }
    
    if (familyMembers.length >= 3) {
      list.push({ title: "Time Unido", description: "Três ou mais membros colaborando no app.", icon: "🤝" });
    }

    if (transactions.length >= 50) {
      list.push({ title: "Mestres do Controle", description: "Mais de 50 transações registradas pela família.", icon: "📊" });
    }

    return list;
  }, [goals, transactions, familyMembers]);

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonthTxs = transactions.filter(tx => {
      const txDate = tx.date.toDate();
      return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    });

    const income = currentMonthTxs.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
    const expenses = currentMonthTxs.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
    const balance = income - expenses;

    // Category breakdown for pie chart
    const categoryDataMap: Record<string, number> = {};
    currentMonthTxs.filter(tx => tx.type === 'expense').forEach(tx => {
      categoryDataMap[tx.category] = (categoryDataMap[tx.category] || 0) + tx.amount;
    });
    const categoryData = Object.entries(categoryDataMap).map(([name, value]) => ({ name, value }));

    // Monthly trend for bar chart (last 6 months)
    const monthlyTrend: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const mLabel = format(monthDate, 'MMM', { locale: ptBR });
      const monthTxs = transactions.filter(tx => {
        const txDate = tx.date.toDate();
        return txDate.getMonth() === monthDate.getMonth() && txDate.getFullYear() === monthDate.getFullYear();
      });
      const mIncome = monthTxs.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
      const mExpenses = monthTxs.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
      monthlyTrend.push({ name: mLabel, Receita: mIncome, Despesa: mExpenses });
    }

    return { income, expenses, balance, categoryData, monthlyTrend };
  }, [transactions]);

  if (loading) return <LoadingScreen />;
  if (!user) return <LoginScreen />;
  if (!profile) return <SetupFamily user={user} onComplete={() => {}} />;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 lg:pb-0 lg:pl-64">
      {/* Sidebar (Desktop) */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
            <Wallet className="text-white w-6 h-6" />
          </div>
          <span className="font-bold text-xl text-slate-900">FamíliaFinanças</span>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard />} label="Dashboard" />
          <NavItem active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} icon={<Calendar />} label="Transações" />
          <NavItem active={activeTab === 'goals'} onClick={() => setActiveTab('goals')} icon={<Target />} label="Metas" />
          <NavItem active={activeTab === 'family'} onClick={() => setActiveTab('family')} icon={<Users />} label="Família" />
          <NavItem active={activeTab === 'cards'} onClick={() => setActiveTab('cards')} icon={<CreditCardIcon />} label="Cartões" />
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <img src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}`} className="w-10 h-10 rounded-full border border-slate-200" alt="Profile" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{profile.displayName}</p>
              <p className="text-xs text-slate-500 truncate">{family?.name}</p>
            </div>
          </div>
          <button 
            onClick={() => signOut(auth)}
            className="flex items-center gap-2 text-slate-500 hover:text-red-600 transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <Wallet className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-lg text-slate-900">FamíliaFinanças</span>
        </div>
        <img src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}`} className="w-8 h-8 rounded-full border border-slate-200" alt="Profile" />
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 lg:p-10">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Olá, {profile.displayName.split(' ')[0]}! 👋</h1>
                  <p className="text-slate-500">Aqui está o resumo financeiro da sua casa este mês.</p>
                </div>
                <button 
                  onClick={() => setShowAddTransaction(true)}
                  className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                >
                  <PlusCircle className="w-5 h-5" /> Nova Transação
                </button>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard label="Saldo Mensal" value={stats.balance} icon={<Wallet className="text-emerald-600" />} color="emerald" />
                <StatCard label="Receitas" value={stats.income} icon={<TrendingUp className="text-blue-600" />} color="blue" />
                <StatCard label="Despesas" value={stats.expenses} icon={<TrendingDown className="text-rose-600" />} color="rose" />
              </div>

              {/* Cards Section */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <CreditCardIcon className="w-5 h-5 text-emerald-600" /> Seus Cartões
                  </h3>
                  <button 
                    onClick={() => setShowAddCard(true)}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Adicionar Cartão
                  </button>
                </div>
                
                <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
                  {cards.map(card => (
                    <CreditCardComponent 
                      key={card.id} 
                      card={card} 
                      onDelete={handleDeleteCard}
                      onToggleVisibility={handleToggleCardVisibility}
                      isAdmin={profile.role === 'admin' || card.userId === user?.uid}
                      currentUserId={user?.uid || ''}
                    />
                  ))}
                  {cards.length === 0 && (
                    <button 
                      onClick={() => setShowAddCard(true)}
                      className="w-72 h-44 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-emerald-300 hover:text-emerald-500 transition-all shrink-0"
                    >
                      <PlusCircle className="w-8 h-8" />
                      <span className="font-medium">Adicionar primeiro cartão</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Debug Info - Only visible if no cards but handleCreateCard was called */}
                {cards.length === 0 && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-[10px] font-mono text-slate-400">
                    DEBUG: familyId={profile.familyId} | userId={user?.uid} | cards_state_len={cards.length}
                  </div>
                )}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                  <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-600" /> Tendência Mensal
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.monthlyTrend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          cursor={{ fill: '#f8fafc' }}
                        />
                        <Legend iconType="circle" />
                        <Bar dataKey="Receita" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Despesa" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                  <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5 text-emerald-600" /> Gastos por Categoria
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.categoryData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {stats.categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Legend layout="vertical" align="right" verticalAlign="middle" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Recent Transactions & Goals */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-slate-900">Transações Recentes</h3>
                    <button onClick={() => setActiveTab('transactions')} className="text-emerald-600 text-sm font-semibold hover:underline">Ver todas</button>
                  </div>
                  <div className="space-y-4">
                    {transactions.slice(0, 5).map(tx => (
                      <TransactionItem key={tx.id} tx={tx} />
                    ))}
                    {transactions.length === 0 && (
                      <div className="text-center py-10 text-slate-400">Nenhuma transação registrada ainda.</div>
                    )}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-slate-900">Metas da Família</h3>
                    <button onClick={() => setActiveTab('goals')} className="text-emerald-600 text-sm font-semibold hover:underline">Ver todas</button>
                  </div>
                  <div className="space-y-6">
                    {goals.slice(0, 3).map(goal => (
                      <GoalCard key={goal.id} goal={goal} compact setShowAddFunds={setShowAddFunds} />
                    ))}
                    {goals.length === 0 && (
                      <div className="text-center py-10 text-slate-400">Nenhuma meta definida.</div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'transactions' && (
            <motion.div key="transactions" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Histórico de Transações</h1>
                <button 
                  onClick={() => setShowAddTransaction(true)}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 hover:bg-emerald-700"
                >
                  <Plus className="w-5 h-5" /> Adicionar
                </button>
              </div>
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Data</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Categoria</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Membro</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Valor</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transactions.map(tx => (
                        <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-sm text-slate-600">{format(tx.date.toDate(), 'dd/MM/yyyy')}</td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-900">{tx.description || tx.category}</td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">{tx.category}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{tx.userName}</td>
                          <td className={`px-6 py-4 text-sm font-bold text-right ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {(tx.userId === profile.uid || profile.role === 'admin') && (
                              <button 
                                onClick={() => handleDeleteTransaction(tx.id)}
                                className="text-slate-300 hover:text-rose-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'goals' && (
            <motion.div key="goals" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Metas Financeiras</h1>
                <button 
                  onClick={() => setShowAddGoal(true)}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 hover:bg-emerald-700"
                >
                  <Plus className="w-5 h-5" /> Nova Meta
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {goals.map(goal => (
                  <GoalCard 
                    key={goal.id} 
                    goal={goal} 
                    onUpdate={handleUpdateGoal} 
                    onDelete={handleDeleteGoal}
                    isAdmin={profile.role === 'admin'}
                    setShowAddFunds={setShowAddFunds}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'family' && (
            <motion.div key="family" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="mb-8">
                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Sua Família</h1>
                <p className="text-slate-500">Gerencie os membros e veja o impacto de cada um.</p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
                          <Users className="w-8 h-8 text-emerald-600" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-slate-900">{family?.name}</h2>
                          <p className="text-slate-500">Desde {family && format(family.createdAt.toDate(), 'MMMM yyyy', { locale: ptBR })}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">ID da Família</p>
                        <div className="flex items-center gap-2">
                          <code className="bg-slate-100 px-2 py-1 rounded text-xs font-mono">{family?.id}</code>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(family?.id || '');
                              showNotification('ID copiado para a área de transferência!');
                            }}
                            className="text-emerald-600 hover:text-emerald-700 text-xs font-bold"
                          >
                            Copiar
                          </button>
                        </div>
                      </div>
                    </div>

                    <h3 className="font-bold text-slate-900 mb-4">Membros</h3>
                    <div className="space-y-4">
                      {familyMembers.map(member => (
                        <div key={member.uid} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <img src={member.photoURL || `https://ui-avatars.com/api/?name=${member.displayName}`} className="w-10 h-10 rounded-full" alt="" />
                            <div>
                              <p className="font-semibold text-slate-900">{member.displayName} {member.uid === profile.uid && '(Você)'}</p>
                              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">{member.role}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-500">Contribuição este mês</p>
                            <p className="font-bold text-emerald-600">
                              {formatCurrency(
                                transactions
                                  .filter(tx => tx.userId === member.uid && tx.type === 'income' && tx.date.toDate().getMonth() === new Date().getMonth())
                                  .reduce((sum, tx) => sum + tx.amount, 0)
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-emerald-600 p-8 rounded-3xl shadow-lg shadow-emerald-100 text-white relative overflow-hidden">
                    <div className="relative z-10">
                      <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                        <Trophy className="w-6 h-6" /> Conquistas Familiares
                      </h3>
                      <p className="opacity-90 mb-6">Vocês estão indo muito bem! Aqui estão os marcos alcançados.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {achievements.map((achievement, idx) => (
                          <AchievementCard key={idx} {...achievement} />
                        ))}
                        {achievements.length === 0 && (
                          <p className="text-sm opacity-75 italic">Nenhuma conquista ainda. Continuem colaborando!</p>
                        )}
                      </div>
                    </div>
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                  <h3 className="font-bold text-slate-900 mb-4">Convidar Membro</h3>
                  <p className="text-sm text-slate-500 mb-6">Compartilhe o ID da família para que outros membros possam se juntar.</p>
                  <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-center mb-6">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Código de Acesso (ID)</p>
                    <p className="text-sm font-mono font-bold text-slate-700 break-all">{family?.id}</p>
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(family?.id || '');
                      showNotification('ID copiado para a área de transferência!');
                    }}
                    className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors"
                  >
                    Copiar ID
                  </button>
                </div>
              </div>
            </motion.div>
          )}
          {activeTab === 'cards' && (
            <motion.div key="cards" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Seus Cartões</h1>
                  <p className="text-slate-500">Gerencie seus cartões de crédito e débito da família.</p>
                </div>
                <button 
                  onClick={() => setShowAddCard(true)}
                  className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" /> Adicionar Cartão
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {cards.map(card => (
                  <CreditCardComponent 
                    key={card.id} 
                    card={card} 
                    onDelete={handleDeleteCard}
                    onToggleVisibility={handleToggleCardVisibility}
                    isAdmin={profile.role === 'admin' || card.userId === user?.uid}
                    currentUserId={user?.uid || ''}
                  />
                ))}
                {cards.length === 0 && (
                  <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-slate-100">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CreditCardIcon className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Nenhum cartão cadastrado</h3>
                    <p className="text-slate-500 mb-8">Adicione o seu primeiro cartão para começar a gerenciar.</p>
                    <button 
                      onClick={() => setShowAddCard(true)}
                      className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all"
                    >
                      Adicionar Cartão
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between z-40">
        <MobileNavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard />} />
        <MobileNavItem active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} icon={<Calendar />} />
        <div className="relative -top-8">
          <button 
            onClick={() => setShowAddTransaction(true)}
            className="w-14 h-14 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-200 border-4 border-white"
          >
            <Plus className="w-8 h-8" />
          </button>
        </div>
        <MobileNavItem active={activeTab === 'goals'} onClick={() => setActiveTab('goals')} icon={<Target />} />
        <MobileNavItem active={activeTab === 'family'} onClick={() => setActiveTab('family')} icon={<Users />} />
        <MobileNavItem active={activeTab === 'cards'} onClick={() => setActiveTab('cards')} icon={<CreditCardIcon />} />
      </nav>

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {showAddTransaction && (
          <TransactionModal 
            onClose={() => setShowAddTransaction(false)} 
            onSubmit={async (data) => {
              try {
                await addDoc(collection(db, 'transactions'), {
                  ...data,
                  familyId: profile.familyId,
                  userId: profile.uid,
                  userName: profile.displayName,
                  createdAt: Timestamp.now()
                });
                setShowAddTransaction(false);
              } catch (err) {
                handleFirestoreError(err, OperationType.WRITE, 'transactions');
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Add Goal Modal */}
      <AnimatePresence>
        {showAddGoal && (
          <GoalModal 
            onClose={() => setShowAddGoal(false)}
            onSubmit={async (data) => {
              try {
                await addDoc(collection(db, 'goals'), {
                  ...data,
                  familyId: profile.familyId,
                  currentAmount: 0,
                  isCompleted: false,
                  createdAt: Timestamp.now()
                });
                setShowAddGoal(false);
              } catch (err) {
                handleFirestoreError(err, OperationType.WRITE, 'goals');
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Notifications and Modals */}
      <AnimatePresence>
        {notification && (
          <Notification 
            message={notification.message} 
            type={notification.type} 
            onClose={() => setNotification(null)} 
          />
        )}
        {confirmModal && (
          <ConfirmModal 
            {...confirmModal} 
            onCancel={() => setConfirmModal(null)} 
          />
        )}
        {showAddFunds && (
          <AddFundsModal 
            goal={showAddFunds}
            onClose={() => setShowAddFunds(null)}
            onSubmit={(amount) => {
              handleUpdateGoal(showAddFunds.id, { currentAmount: showAddFunds.currentAmount + amount });
              setShowAddFunds(null);
            }}
          />
        )}
        {showAddCard && (
          <AddCardModal 
            onClose={() => setShowAddCard(false)}
            onSubmit={handleCreateCard}
          />
        )}
      </AnimatePresence>
    </div>
  );

  // --- Helper Functions for App ---
  
  async function handleDeleteTransaction(id: string) {
    setConfirmModal({
      title: 'Excluir Transação',
      message: 'Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'transactions', id));
          showNotification('Transação excluída com sucesso!');
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `transactions/${id}`);
          showNotification('Erro ao excluir transação.', 'error');
        } finally {
          setConfirmModal(null);
        }
      }
    });
  }

  async function handleUpdateGoal(id: string, updates: Partial<Goal>) {
    try {
      await updateDoc(doc(db, 'goals', id), updates);
      if (updates.currentAmount !== undefined) {
        showNotification('Progresso atualizado!');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `goals/${id}`);
      showNotification('Erro ao atualizar meta.', 'error');
    }
  }

  async function handleDeleteGoal(id: string) {
    setConfirmModal({
      title: 'Excluir Meta',
      message: 'Tem certeza que deseja excluir esta meta? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'goals', id));
          showNotification('Meta excluída com sucesso!');
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `goals/${id}`);
          showNotification('Erro ao excluir meta.', 'error');
        } finally {
          setConfirmModal(null);
        }
      }
    });
  }
}

// --- UI Components ---

const NavItem = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
      active ? 'bg-emerald-50 text-emerald-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
    }`}
  >
    {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5" })}
    {label}
  </button>
);

const MobileNavItem = ({ active, onClick, icon }: { active: boolean, onClick: () => void, icon: React.ReactNode }) => (
  <button onClick={onClick} className={`p-2 rounded-xl ${active ? 'text-emerald-600' : 'text-slate-400'}`}>
    {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" })}
  </button>
);

const StatCard = ({ label, value, icon, color }: { label: string, value: number, icon: React.ReactNode, color: string }) => (
  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
    <div className="flex items-center justify-between mb-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-${color}-50`}>
        {icon}
      </div>
      <span className={`text-xs font-bold uppercase tracking-wider text-${color}-600`}>{label}</span>
    </div>
    <p className="text-2xl font-bold text-slate-900">{formatCurrency(value)}</p>
  </div>
);

function TransactionItem({ tx }: { tx: Transaction, key?: React.Key }) {
  return (
    <div className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-2xl transition-colors">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
        tx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
      }`}>
        {tx.type === 'income' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
      </div>
      <div>
        <p className="font-semibold text-slate-900 text-sm">{tx.description || tx.category}</p>
        <p className="text-xs text-slate-500">{tx.userName} • {format(tx.date.toDate(), 'dd MMM', { locale: ptBR })}</p>
      </div>
    </div>
    <p className={`font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
      {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
    </p>
  </div>
  );
}

function GoalCard({ goal, compact, onUpdate, onDelete, isAdmin, setShowAddFunds, key }: { goal: Goal, compact?: boolean, onUpdate?: (id: string, data: any) => void, onDelete?: (id: string) => void, isAdmin?: boolean, setShowAddFunds: (goal: Goal) => void, key?: React.Key }) {
  const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  
  return (
    <div className={`bg-white rounded-3xl border border-slate-100 ${compact ? '' : 'p-6 shadow-sm'}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-slate-900 truncate">{goal.title}</h4>
        {!compact && isAdmin && (
          <div className="flex gap-2">
            <button onClick={() => onDelete?.(goal.id)} className="text-slate-300 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
          </div>
        )}
      </div>
      
      <div className="flex justify-between text-xs text-slate-500 mb-2">
        <span>{formatCurrency(goal.currentAmount)}</span>
        <span>{formatCurrency(goal.targetAmount)}</span>
      </div>
      
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className={`h-full rounded-full ${progress >= 100 ? 'bg-emerald-500' : 'bg-emerald-600'}`}
        />
      </div>

      {!compact && (
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Calendar className="w-3 h-3" />
            {goal.deadline ? format(goal.deadline.toDate(), 'dd/MM/yy') : 'Sem prazo'}
          </div>
          <button 
            onClick={() => setShowAddFunds(goal)}
            className="text-xs font-bold text-emerald-600 hover:underline"
          >
            Adicionar Fundo
          </button>
        </div>
      )}
    </div>
  );
}

const CreditCardComponent = ({ card, onDelete, onToggleVisibility, isAdmin, currentUserId }: { 
  card: CreditCard, 
  onDelete: (id: string) => void | Promise<void>,
  onToggleVisibility: (id: string, isShared: boolean) => void | Promise<void>,
  isAdmin: boolean,
  currentUserId: string,
  key?: any
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`relative w-72 h-44 rounded-2xl p-6 text-white shadow-lg overflow-hidden flex flex-col justify-between shrink-0`}
      style={{ backgroundColor: card.color || '#1e293b' }}
    >
      {/* Background Pattern */}
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
      <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 bg-black/10 rounded-full blur-xl" />

      <div className="flex justify-between items-start z-10">
        <div>
          <p className="text-[10px] uppercase tracking-widest opacity-70 mb-1">Nome do Cartão</p>
          <h3 className="font-bold text-lg leading-tight">{card.cardName}</h3>
        </div>
        <div className="flex gap-2">
          {card.userId === currentUserId && (
            <button 
              onClick={() => onToggleVisibility(card.id, !card.isShared)}
              className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              title={card.isShared ? "Visível para a família" : "Privado"}
            >
              {card.isShared ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          )}
          {isAdmin && (
            <button 
              onClick={() => onDelete(card.id)}
              className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="z-10">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-10 h-7 bg-yellow-400/80 rounded-md" /> {/* Chip */}
          <p className="font-mono text-lg tracking-widest">•••• •••• •••• {card.cardNumberLast4}</p>
        </div>
        
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[8px] uppercase tracking-widest opacity-70">Expira em</p>
            <p className="font-medium text-xs">{card.expiryDate || 'MM/YY'}</p>
          </div>
          <div className="text-right">
            <p className="text-[8px] uppercase tracking-widest opacity-70">
              {card.type === 'credit' ? 'Limite Disponível' : 'Saldo Atual'}
            </p>
            <p className="font-bold text-sm">
              {card.type === 'credit' 
                ? formatCurrency((card.limit || 0) - (card.currentBalance || 0))
                : formatCurrency(card.currentBalance || 0)
              }
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const AddCardModal = ({ onClose, onSubmit }: { onClose: () => void, onSubmit: (data: any) => Promise<void> | void }) => {
  const [formData, setFormData] = useState({
    cardName: '',
    cardNumberLast4: '',
    expiryDate: '',
    limit: 0,
    currentBalance: 0,
    color: '#1e293b',
    type: 'credit' as 'credit' | 'debit',
    isShared: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const colors = ['#1e293b', '#059669', '#2563eb', '#7c3aed', '#db2777', '#ea580c'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    console.log('Form submitted with data:', formData);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error in AddCardModal handleSubmit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900">Adicionar Novo Cartão</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <Plus className="w-5 h-5 rotate-45 text-slate-400" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tipo de Cartão</label>
            <div className="flex p-1 bg-slate-100 rounded-xl">
              <button 
                type="button"
                onClick={() => setFormData({ ...formData, type: 'credit' })}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${formData.type === 'credit' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
              >
                Crédito
              </button>
              <button 
                type="button"
                onClick={() => setFormData({ ...formData, type: 'debit' })}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${formData.type === 'debit' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
              >
                Débito
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nome do Cartão (Ex: Nubank, Inter)</label>
            <input 
              required
              type="text" 
              value={formData.cardName}
              onChange={(e) => setFormData({ ...formData, cardName: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              placeholder="Nome do banco ou cartão"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Últimos 4 dígitos</label>
              <input 
                required
                minLength={4}
                maxLength={4}
                type="text" 
                value={formData.cardNumberLast4}
                onChange={(e) => setFormData({ ...formData, cardNumberLast4: e.target.value.replace(/\D/g, '') })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="0000"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Expiração (MM/YY)</label>
              <input 
                type="text" 
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="05/28"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {formData.type === 'credit' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Limite Total</label>
                <input 
                  type="number" 
                  value={formData.limit}
                  onChange={(e) => setFormData({ ...formData, limit: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                {formData.type === 'credit' ? 'Fatura Atual' : 'Saldo em Conta'}
              </label>
              <input 
                type="number" 
                value={formData.currentBalance}
                onChange={(e) => setFormData({ ...formData, currentBalance: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cor do Cartão</label>
            <div className="flex gap-3">
              {colors.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: c })}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === c ? 'border-slate-900 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <p className="text-sm font-bold text-slate-700">Compartilhar com a família</p>
              <p className="text-xs text-slate-500">Outros membros poderão ver este cartão</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isShared: !formData.isShared })}
              className={`w-12 h-6 rounded-full transition-colors relative ${formData.isShared ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${formData.isShared ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className={`w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 mt-4 flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Cartão'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const AchievementCard = ({ title, description, icon }: { title: string, description: string, icon: string }) => (
  <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
    <div className="text-2xl mb-2">{icon}</div>
    <h4 className="font-bold text-sm mb-1">{title}</h4>
    <p className="text-xs opacity-80">{description}</p>
  </div>
);

const TransactionModal = ({ onClose, onSubmit }: { onClose: () => void, onSubmit: (data: any) => void }) => {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">Nova Transação</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button 
              onClick={() => setType('expense')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${type === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}
            >
              Despesa
            </button>
            <button 
              onClick={() => setType('income')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
            >
              Receita
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Valor</label>
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              className="w-full text-3xl font-bold text-slate-900 focus:outline-none"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Categoria</label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Selecione...</option>
                {CATEGORIES[type].map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Data</label>
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Descrição (Opcional)</label>
            <input 
              type="text" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Compras no mercado"
              className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button 
            onClick={() => {
              if (!amount || !category) return;
              onSubmit({
                amount: parseFloat(amount),
                type,
                category,
                description,
                date: Timestamp.fromDate(new Date(date + 'T12:00:00'))
              });
            }}
            className={`w-full py-4 rounded-2xl text-white font-bold text-lg shadow-lg transition-all ${
              type === 'income' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-100'
            }`}
          >
            Salvar {type === 'income' ? 'Receita' : 'Despesa'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const GoalModal = ({ onClose, onSubmit }: { onClose: () => void, onSubmit: (data: any) => void }) => {
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">Nova Meta Familiar</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Título da Meta</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Viagem de Férias"
              className="w-full p-4 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Valor Alvo</label>
            <input 
              type="number" 
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="R$ 0,00"
              className="w-full p-4 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 text-xl font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Prazo (Opcional)</label>
            <input 
              type="date" 
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full p-4 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button 
            onClick={() => {
              if (!title || !targetAmount) return;
              onSubmit({
                title,
                targetAmount: parseFloat(targetAmount),
                deadline: deadline ? Timestamp.fromDate(new Date(deadline + 'T12:00:00')) : null
              });
            }}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-emerald-100 transition-all"
          >
            Criar Meta
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// --- Utils ---

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899'];

const Notification = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 50 }}
    className={`fixed bottom-24 lg:bottom-8 right-8 z-50 px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 ${
      type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
    }`}
  >
    {type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
    <span className="font-semibold">{message}</span>
    <button onClick={onClose} className="ml-4 opacity-70 hover:opacity-100">✕</button>
  </motion.div>
);

const AddFundsModal = ({ goal, onClose, onSubmit }: { goal: Goal; onClose: () => void; onSubmit: (amount: number) => void }) => {
  const [amount, setAmount] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8"
      >
        <h3 className="text-xl font-bold text-slate-900 mb-2">Adicionar Fundos</h3>
        <p className="text-slate-500 mb-6">Quanto você deseja adicionar à meta <strong>{goal.title}</strong>?</p>
        <input 
          type="number" 
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="R$ 0,00"
          className="w-full p-4 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 text-2xl font-bold mb-6"
          autoFocus
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all">Cancelar</button>
          <button 
            onClick={() => {
              if (amount) onSubmit(parseFloat(amount));
            }}
            className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
          >
            Adicionar
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const ConfirmModal = ({ title, message, onConfirm, onCancel }: { title: string; message: string; onConfirm: () => void; onCancel: () => void }) => (
  <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-3xl shadow-xl max-w-sm w-full p-8 text-center"
    >
      <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Trash2 className="w-8 h-8 text-rose-600" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-500 mb-8">{message}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all">Cancelar</button>
        <button onClick={onConfirm} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-100">Excluir</button>
      </div>
    </motion.div>
  </div>
);
