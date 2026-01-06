
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Plus, Heart, ArrowDownAZ, ArrowUpAZ, Calendar, ChevronDown, Filter, Check, X, Undo2, LogOut, Settings, User as UserIcon, Loader2, CloudCheck, CloudOff, RefreshCw, Sparkles, SortAsc, Tags } from 'lucide-react';
import { fetchPrompts, savePrompt, deletePrompt, getCachedPrompts, clearPromptCache, seedInitialData, hasPendingSync, forceSyncPending } from './services/storage';
import { getCurrentUser, logout, mapSupabaseUser, supabase, checkConnection, pingDatabase } from './services/auth';
import { Prompt, PromptFormData, PromptVersion, User } from './types';
import PromptCard from './components/PromptCard';
import PromptModal from './components/PromptModal';
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';
import LandingPage from './components/LandingPage';

type SortOption = 'newest' | 'oldest' | 'az' | 'za';

function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);
  useEffect(() => { savedCallback.current = callback; }, [callback]);
  useEffect(() => {
    if (delay !== null) {
      const id = setInterval(() => savedCallback.current(), delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showLanding, setShowLanding] = useState(true);

  const [prompts, setPrompts] = useState<Prompt[]>(() => getCachedPrompts());

  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const [isPreparing, setIsPreparing] = useState(false);
  const [lastSyncStatus, setLastSyncStatus] = useState<'synced' | 'error' | 'syncing'>('synced');

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewFavorites, setViewFavorites] = useState(false);
  const [isTagFilterOpen, setIsTagFilterOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [startEditing, setStartEditing] = useState(false);

  const [deletedPrompt, setDeletedPrompt] = useState<Prompt | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSeedingRef = useRef(false);
  const initialDataLoaded = useRef(false);

  // Helper to get formatted sort labels
  const getSortLabel = (option: SortOption) => {
    switch (option) {
      case 'newest': return 'Newest';
      case 'oldest': return 'Oldest';
      case 'az': return 'A-Z';
      case 'za': return 'Z-A';
      default: return option;
    }
  };

  // ---------------------------------------------------------
  // KEEP-ALIVE PULSE SCRIPT (every 2 minutes)
  // ---------------------------------------------------------
  useEffect(() => {
    pingDatabase();

    // Force sync pending items when tab becomes visible
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        forceSyncPending();
        setLastSyncStatus(hasPendingSync() ? 'syncing' : 'synced');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useInterval(() => {
    pingDatabase().then(success => {
      if (success) {
        console.log("Vault Heartbeat: Stable");
        // Update sync status based on pending queue
        if (!hasPendingSync()) setLastSyncStatus('synced');
      }
    });
  }, 120000);

  useEffect(() => {
    const initAuth = async () => {
      const localUser = getCurrentUser();
      if (localUser) {
        setCurrentUser(localUser);
        setShowLanding(false);
      }
      setIsInitializing(false);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setShowLanding(true);
        setPrompts([]);
        clearPromptCache();
        initialDataLoaded.current = false;
        isSeedingRef.current = false;
        setIsPreparing(false);
      } else if (session?.user && event === 'SIGNED_IN') {
        const userProfile = await mapSupabaseUser(session.user);
        if (userProfile) {
          setCurrentUser(userProfile);
          setShowLanding(false);
          if (getCachedPrompts().length === 0) setIsPreparing(true);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (!currentUser?.id || initialDataLoaded.current) return;
      setIsSyncing(true);
      setLastSyncStatus('syncing');

      try {
        const { data: freshData, error } = await fetchPrompts(currentUser.id);
        if (!error) {
          if (freshData.length === 0 && !isSeedingRef.current) {
            isSeedingRef.current = true;
            const seeded = await seedInitialData(currentUser.id);
            if (seeded && seeded.length > 0) setPrompts(seeded);
            isSeedingRef.current = false;
          } else {
            setPrompts(freshData);
          }
          setLastSyncStatus('synced');
          initialDataLoaded.current = true;
        } else {
          setLastSyncStatus('error');
        }
      } catch (err) {
        setLastSyncStatus('error');
      } finally {
        setIsSyncing(false);
        setIsPreparing(false);
      }
    };
    loadData();
  }, [currentUser]);

  const handleRefresh = async () => {
    if (!currentUser?.id || isSyncing || isSeedingRef.current || !initialDataLoaded.current) return;
    try {
      const { data: freshData, error } = await fetchPrompts(currentUser.id);
      if (!error) {
        setPrompts(freshData);
        setLastSyncStatus('synced');
      }
    } catch {
      setLastSyncStatus('error');
    }
  };

  useInterval(handleRefresh, 60000);

  const handleSave = async (data: PromptFormData): Promise<boolean> => {
    if (!currentUser?.id) return false;

    let promptToSave: Prompt;
    if (editingPrompt) {
      const previousVersion: PromptVersion = {
        timestamp: editingPrompt.updatedAt,
        title: editingPrompt.title,
        description: editingPrompt.description,
        content: editingPrompt.content,
        tags: editingPrompt.tags,
        platform: editingPrompt.platform
      };

      promptToSave = {
        ...editingPrompt,
        ...data,
        history: [previousVersion, ...(editingPrompt.history || [])].slice(0, 10),
        updatedAt: Date.now()
      };
    } else {
      promptToSave = {
        id: crypto.randomUUID(),
        userId: currentUser.id,
        ...data,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        history: [],
        isFavorite: false
      };
    }

    // Update UI immediately (optimistic)
    setPrompts(prev => {
      const index = prev.findIndex(p => p.id === promptToSave.id);
      if (index >= 0) return prev.map(p => p.id === promptToSave.id ? promptToSave : p);
      return [promptToSave, ...prev];
    });
    setEditingPrompt(promptToSave);

    // Background sync - non-blocking
    savePrompt(promptToSave, currentUser.id);

    // Brief syncing indicator, then show synced (actual sync happens in background)
    setLastSyncStatus('syncing');
    setTimeout(() => {
      if (!hasPendingSync()) {
        setLastSyncStatus('synced');
      }
    }, 500);

    return true;
  };

  const handleDelete = async (id: string) => {
    if (!currentUser?.id) return;
    const promptToDelete = prompts.find(p => p.id === id);
    if (promptToDelete) {
      setPrompts(prev => prev.filter(p => p.id !== id));
      setDeletedPrompt(promptToDelete);
      setShowUndo(true);
      closeModal();
      await deletePrompt(id, currentUser.id);
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = setTimeout(() => { setShowUndo(false); }, 5000);
    }
  };

  const handleToggleFavorite = async (id: string) => {
    if (!currentUser?.id) return;
    const target = prompts.find(p => p.id === id);
    if (!target) return;
    const updated = { ...target, isFavorite: !target.isFavorite, updatedAt: Date.now() };

    setPrompts(prev => prev.map(p => p.id === id ? updated : p));
    if (editingPrompt?.id === id) setEditingPrompt(updated);

    await savePrompt(updated, currentUser.id);
  };

  const filteredPrompts = useMemo(() => {
    let result = prompts.filter(p =>
      (p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (selectedTags.length === 0 || p.tags.some(t => selectedTags.includes(t))) &&
      (viewFavorites ? p.isFavorite : true)
    );

    result.sort((a, b) => {
      if (sortBy === 'newest') return b.createdAt - a.createdAt;
      if (sortBy === 'oldest') return a.createdAt - b.createdAt;
      if (sortBy === 'az') return a.title.localeCompare(b.title);
      if (sortBy === 'za') return b.title.localeCompare(a.title);
      return 0;
    });
    return result;
  }, [prompts, searchQuery, selectedTags, viewFavorites, sortBy]);

  const allTags = useMemo(() => Array.from(new Set(prompts.flatMap(p => p.tags))).sort(), [prompts]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleLogout = async () => {
    setIsProfileMenuOpen(false);
    setCurrentUser(null);
    setPrompts([]);
    setShowLanding(true);
    initialDataLoaded.current = false;
    await logout();
  };

  const openCreateModal = () => { setEditingPrompt(null); setStartEditing(true); setIsModalOpen(true); };
  const handleViewPrompt = (prompt: Prompt) => { setEditingPrompt(prompt); setStartEditing(false); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); setEditingPrompt(null); setStartEditing(false); };

  if (isInitializing) return <div className="fixed inset-0 bg-[#FDFBF7] flex items-center justify-center"><Loader2 className="animate-spin text-gray-900" size={40} /></div>;

  if (isPreparing) return (
    <div className="fixed inset-0 bg-[#FDFBF7] z-[200] flex flex-col items-center justify-center animate-in fade-in duration-300">
      <div className="relative mb-8">
        <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center shadow-xl shadow-gray-900/10"><Sparkles className="text-white animate-pulse" size={32} /></div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center border border-gray-100 shadow-sm"><Loader2 className="animate-spin text-gray-900" size={12} /></div>
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Preparing Workspace</h2>
      <p className="text-sm text-gray-500 font-medium animate-pulse">Establishing secure link... Please wait.</p>
    </div>
  );

  if (!currentUser) return showLanding ? <LandingPage onGetStarted={() => setShowLanding(false)} /> : <AuthModal onLogin={(u, isNewUser) => {
    // Always reset data loading state for fresh data
    initialDataLoaded.current = false;

    // Clear cache for new users to ensure demo prompts
    if (isNewUser) {
      clearPromptCache();
      setPrompts([]);
      isSeedingRef.current = false;
      setIsPreparing(true);
    }
    setCurrentUser(u);
  }} onBack={() => setShowLanding(true)} />;

  return (
    <div className="min-h-screen pb-20 bg-[#FDFBF7] animate-in fade-in duration-500 ease-out">
      <nav className="sticky top-0 z-40 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="https://ui-avatars.com/api/?name=PN&background=111&color=fff&size=64&bold=true" className="w-8 h-8 rounded-lg" alt="Logo" />
            <span className="font-bold text-xl text-gray-900 hidden sm:block">PromptNest</span>
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase transition-colors ${lastSyncStatus === 'synced' ? 'text-green-600 bg-green-50' :
              lastSyncStatus === 'syncing' ? 'text-blue-600 bg-blue-50' : 'text-red-600 bg-red-50'
              }`}>
              {lastSyncStatus === 'synced' ? <CloudCheck size={12} /> :
                lastSyncStatus === 'syncing' ? <RefreshCw size={12} className="animate-spin" /> : <CloudOff size={12} />}
              <span className="hidden xs:inline">{lastSyncStatus === 'synced' ? 'Cloud' : lastSyncStatus === 'syncing' ? 'Syncing' : 'Sync Error'}</span>
            </div>
          </div>
          <div className="flex-1 max-md:hidden mx-8 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search library..." className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/5 transition-all shadow-sm" />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => setIsMobileSearchOpen(true)} className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-all"><Search size={22} /></button>
            <button onClick={openCreateModal} className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-black transition-all shadow-sm"><Plus size={18} /> <span className="hidden xs:inline">New</span></button>
            <div className="relative">
              <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="w-8 h-8 rounded-full border-2 border-white shadow-sm overflow-hidden hover:ring-2 hover:ring-gray-200 transition-all"><img src={currentUser.photoUrl} alt="User" className="w-full h-full object-cover" /></button>
              {isProfileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsProfileMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20 animate-in fade-in zoom-in-95 origin-top-right">
                    <div className="px-4 py-3 border-b border-gray-50"><p className="text-sm font-bold text-gray-900 truncate">{currentUser.displayName}</p></div>
                    <button onClick={() => { setIsProfileMenuOpen(false); setIsProfileModalOpen(true); }} className="w-full text-left px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"><Settings size={14} /> Profile Settings</button>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"><LogOut size={14} /> Sign Out</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-4 mb-8 items-start md:items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 w-full md:w-auto no-scrollbar">
            <button onClick={() => { setViewFavorites(false); setSelectedTags([]); }} className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-medium border transition-all ${!viewFavorites && selectedTags.length === 0 ? 'bg-gray-900 text-white border-gray-900 shadow-md' : 'bg-white text-gray-600 border-gray-200'}`}>All Prompts</button>
            <button onClick={() => setViewFavorites(!viewFavorites)} className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-medium border flex items-center gap-2 transition-all ${viewFavorites ? 'bg-red-50 text-red-600 border-red-100 shadow-sm' : 'bg-white text-gray-600 border-gray-200'}`}><Heart size={14} fill={viewFavorites ? "currentColor" : "none"} /> Favorites</button>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap">
            {/* Tag Filter Menu */}
            <div className="relative">
              <button
                onClick={() => { setIsTagFilterOpen(!isTagFilterOpen); setIsSortMenuOpen(false); }}
                className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-xs font-medium transition-all ${selectedTags.length > 0
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
              >
                <Tags size={14} />
                Tags {selectedTags.length > 0 && `(${selectedTags.length})`}
                <ChevronDown size={14} className={`transition-transform duration-200 ${isTagFilterOpen ? 'rotate-180' : ''}`} />
              </button>
              {isTagFilterOpen && (
                <div className="absolute top-full mt-2 left-0 md:right-0 md:left-auto w-56 bg-white rounded-xl shadow-xl border border-gray-100 p-1.5 z-30 animate-in fade-in zoom-in-95 origin-top">
                  <div className="px-3 py-2 border-b border-gray-50 flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Filter by Tag</span>
                    {selectedTags.length > 0 && (
                      <button onClick={() => setSelectedTags([])} className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase">Clear</button>
                    )}
                  </div>
                  <div className="max-h-60 overflow-y-auto py-1 no-scrollbar">
                    {allTags.length > 0 ? (
                      allTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => handleTagToggle(tag)}
                          className="w-full flex items-center gap-3 px-3 py-2 text-xs rounded-lg hover:bg-gray-50 transition-colors group"
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedTags.includes(tag) ? 'bg-gray-900 border-gray-900 text-white' : 'border-gray-300 group-hover:border-gray-400'
                            }`}>
                            {selectedTags.includes(tag) && <Check size={10} />}
                          </div>
                          <span className={`truncate ${selectedTags.includes(tag) ? 'font-bold text-gray-900' : 'text-gray-600'}`}>{tag}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-center text-[10px] text-gray-400 italic">No tags found</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sort Menu */}
            <div className="relative">
              <button
                onClick={() => { setIsSortMenuOpen(!isSortMenuOpen); setIsTagFilterOpen(false); }}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:border-gray-300 transition-all"
              >
                <Calendar size={14} />
                Sort: <span className="text-gray-900 font-bold">{getSortLabel(sortBy)}</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isSortMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isSortMenuOpen && (
                <div className="absolute top-full mt-2 right-0 w-44 bg-white rounded-xl shadow-xl border border-gray-100 p-1.5 z-30 animate-in fade-in zoom-in-95 origin-top-right">
                  <div className="px-3 py-2 border-b border-gray-50 mb-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sort Order</span>
                  </div>
                  {(['newest', 'oldest', 'az', 'za'] as const).map(option => (
                    <button
                      key={option}
                      onClick={() => { setSortBy(option); setIsSortMenuOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors ${sortBy === option ? 'bg-gray-50 font-bold text-gray-900' : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                      <span>{getSortLabel(option)}</span>
                      {sortBy === option && <Check size={12} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {filteredPrompts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPrompts.map(p => <PromptCard key={p.id} prompt={p} onView={handleViewPrompt} onToggleFavorite={handleToggleFavorite} />)}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <RefreshCw size={48} className="mx-auto text-gray-200 mb-4" />
            <h3 className="text-lg font-bold text-gray-900">Library Empty</h3>
            <p className="text-sm text-gray-400 mt-2">No prompts match your current filters.</p>
            <button onClick={() => { setSelectedTags([]); setSearchQuery(''); setViewFavorites(false); }} className="mt-6 px-6 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl shadow-lg">Clear Filters</button>
          </div>
        )}
      </main>

      <PromptModal isOpen={isModalOpen} onClose={closeModal} onSave={handleSave} onDelete={handleDelete} onToggleFavorite={handleToggleFavorite} initialData={editingPrompt} availableTags={allTags} startEditing={startEditing} />
      {currentUser && <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} currentUser={currentUser} onUpdate={setCurrentUser} />}
    </div>
  );
};

export default App;
