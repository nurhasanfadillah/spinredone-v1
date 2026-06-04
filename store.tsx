
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, SPK, ItemStatus, AppContextType, ViewState, SPKMutation, SPKDetail, Notification, NotificationType, Transaction, User, ActivityLog } from './types';
import { generateId, formatCurrency } from './utils';
import { ToastContainer } from './components/UI';
import { supabase } from './supabaseClient';

const DEFAULT_USER: User = {
  username: 'Guest',
  password: '',
  role: 'guest'
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(DEFAULT_USER);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [financeCategories, setFinanceCategories] = useState<string[]>([]);
  const [spks, setSpks] = useState<SPK[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [viewParams, setViewParams] = useState<any>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Notification Logic
  const showNotification = (message: string, type: NotificationType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // --- LOGGING HELPER ---
  const logActivity = async (
      action_type: ActivityLog['action_type'],
      entity: ActivityLog['entity'],
      description: string
  ) => {
      // FIX: Ambil session langsung agar user_id akurat dan tidak stale state
      // Ini penting untuk melewati RLS Policy (auth.uid() = user_id)
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
          // Jika tidak ada sesi (Guest), jangan log ke database karena akan ditolak RLS
          // Kecuali kita mengubah Policy database untuk mengizinkan Anon insert (tidak disarankan)
          return;
      }

      // Tentukan username yang akan disimpan
      // Jika state user masih 'Guest' (misal baru login), gunakan email dari session
      const dbUsername = (user.username === 'Guest' || !user.username) 
          ? (session.user.email?.split('@')[0] || 'Unknown') 
          : user.username;

      const { error } = await supabase.from('activity_logs').insert([{
          user_id: session.user.id, // Pastikan ini match dengan auth.uid()
          username: dbUsername,
          action_type,
          entity,
          description
      }]);
      
      if (error) {
          console.error("Failed to log activity:", error);
      }
  };

  const fetchActivityLogs = async () => {
      try {
          const { data, error } = await supabase
            .from('activity_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50); // Limit to last 50 actions for performance
          
          if (error) throw error;
          if (data) setActivityLogs(data as ActivityLog[]);
      } catch (e: any) {
          console.error("Error fetching logs", e);
      }
  };

  // --- Data Fetching ---
  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      // 1. Categories
      const { data: catData } = await supabase.from('categories').select('name');
      if (catData) setCategories(catData.map(c => c.name));

      // 2. Finance Categories
      const { data: finCatData } = await supabase.from('finance_categories').select('name');
      if (finCatData) setFinanceCategories(finCatData.map(c => c.name));

      // 3. Products
      const { data: prodData } = await supabase.from('products').select('*');
      if (prodData) {
         setProducts(prodData.map(p => ({
             id: p.id,
             name: p.name,
             category: p.category,
             cmtPrice: p.cmt_price
         })));
      }

      // 4. Transactions
      const { data: txData } = await supabase.from('transactions').select('*');
      if (txData) {
          setTransactions(txData.map(t => ({
              id: t.id,
              date: t.date,
              type: t.type,
              category: t.category,
              amount: t.amount,
              description: t.description,
              refId: t.ref_id
          })));
      }

      // 5. SPKs (Complex Join)
      const { data: spkData, error } = await supabase
        .from('spks')
        .select(`
            *,
            items:spk_items(*),
            mutations:spk_mutations(*)
        `)
        .order('date', { ascending: false });

      if (error) throw error;

      if (spkData) {
        const formattedSPKs: SPK[] = spkData.map((s: any) => {
            const spkMutations = s.mutations || [];
            
            return {
                id: s.id,
                spkNumber: s.spk_number,
                date: s.date,
                notes: s.notes,
                totalQty: s.total_qty,
                totalAmount: s.total_amount,
                items: s.items.map((i: any) => {
                    const realCompletedQty = spkMutations
                        .filter((m: any) => m.item_id === i.id)
                        .reduce((sum: number, m: any) => sum + m.qty, 0);

                    return {
                        id: i.id,
                        spkId: i.spk_id,
                        productId: i.product_id,
                        productName: i.product_name,
                        cmtPrice: i.cmt_price,
                        qty: i.qty,
                        completedQty: realCompletedQty, 
                        total: i.qty * i.cmt_price, 
                        status: i.status as ItemStatus
                    };
                }),
                mutations: spkMutations.map((m: any) => ({
                    id: m.id,
                    spkId: m.spk_id,
                    itemId: m.item_id,
                    productName: m.product_name,
                    date: m.date,
                    qty: m.qty,
                    notes: m.notes
                }))
            };
        });
        setSpks(formattedSPKs);
      }

    } catch (error: any) {
      console.error('Error fetching data:', error);
      if (!error.message?.includes('JWT')) {
         showNotification('Gagal memuat data: ' + error.message, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserProfile = async (userId: string, email: string) => {
      try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
            
          if (data) {
              setUser({
                  id: userId,
                  username: data.username || email.split('@')[0],
                  email: email,
                  role: data.role || 'staff',
                  password: ''
              });
          } else {
              setUser({
                  id: userId,
                  username: email.split('@')[0],
                  email: email,
                  role: 'staff',
                  password: ''
              });
          }
      } catch (e) {
          console.error("Profile fetch error", e);
      }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      if (session?.user) {
         fetchUserProfile(session.user.id, session.user.email || '');
      }
      fetchAllData();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      if (session?.user) {
        fetchUserProfile(session.user.id, session.user.email || '');
        fetchAllData(); 
      } else {
        setUser(DEFAULT_USER);
        fetchAllData(); 
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- Auth Logic ---
  const mapAuthError = (message: string) => {
      if (message.includes("Invalid login credentials")) return "Email atau Password salah.";
      if (message.includes("Email not confirmed")) return "Email belum dikonfirmasi.";
      if (message.includes("Network")) return "Gagal terhubung ke server. Cek internet.";
      return message;
  };

  const login = async (u: string, p: string): Promise<boolean> => {
    const email = u.includes('@') ? u : `${u}@spiner.app`; 
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: p
        });

        if (error) {
            showNotification(mapAuthError(error.message), 'error');
            return false;
        }
        
        if (data.user) {
            await fetchUserProfile(data.user.id, data.user.email || email);
            showNotification(`Selamat datang`, 'success');
            logActivity('AUTH', 'SYSTEM', `Login berhasil sebagai ${data.user.email}`);
            fetchAllData(); 
        }
        return true;
    } catch (e: any) {
        showNotification("Terjadi kesalahan sistem.", 'error');
        return false;
    }
  };

  const logout = async () => {
    logActivity('AUTH', 'SYSTEM', `Logout user ${user.username}`);
    await supabase.auth.signOut();
    showNotification('Berhasil keluar', 'info');
  };

  const updateAccount = async (u: string, p: string) => {
     if (p) {
        const { error } = await supabase.auth.updateUser({ password: p });
        if (error) {
            showNotification(error.message, 'error');
            return;
        }
        logActivity('UPDATE', 'SYSTEM', `Mengubah password user`);
     }
     
     if (u && user.id) {
         const { error } = await supabase.from('profiles').update({ username: u }).eq('id', user.id);
         if (error) {
            showNotification('Gagal update nama: ' + error.message, 'error');
         } else {
            logActivity('UPDATE', 'SYSTEM', `Mengubah username dari ${user.username} menjadi ${u}`);
            setUser({ ...user, username: u });
            showNotification('Profil diperbarui', 'success');
         }
     }
  };

  // --- Products & Categories ---

  const addCategory = async (name: string) => {
    const { error } = await supabase.from('categories').insert([{ name }]);
    if (error) {
        showNotification('Gagal tambah kategori: ' + error.message, 'error');
    } else {
        setCategories([...categories, name]);
        logActivity('CREATE', 'CATEGORY', `Membuat kategori produk: ${name}`);
        showNotification('Kategori ditambahkan', 'success');
    }
  };

  const updateCategory = async (oldName: string, newName: string) => {
    const { error } = await supabase.from('categories').update({ name: newName }).eq('name', oldName);
    
    if (error) {
         showNotification('Gagal update: ' + error.message, 'error');
         return;
    }
    
    await supabase.from('products').update({ category: newName }).eq('category', oldName);
    
    setCategories(categories.map(c => c === oldName ? newName : c));
    setProducts(products.map(p => p.category === oldName ? { ...p, category: newName } : p));
    logActivity('UPDATE', 'CATEGORY', `Mengubah kategori ${oldName} menjadi ${newName}`);
    showNotification('Kategori diperbarui', 'success');
  };

  const deleteCategory = async (name: string) => {
    const { error } = await supabase.from('categories').delete().eq('name', name);
    if (error) showNotification(error.message, 'error');
    else {
        setCategories(categories.filter(c => c !== name));
        logActivity('DELETE', 'CATEGORY', `Menghapus kategori: ${name}`);
        showNotification('Kategori dihapus', 'info');
    }
  };

  const addProduct = async (p: Product) => {
    const { data, error } = await supabase.from('products').insert([{
        name: p.name,
        category: p.category,
        cmt_price: p.cmtPrice
    }]).select().single();

    if (error) {
        showNotification(error.message, 'error');
    } else if (data) {
        setProducts([...products, { 
            id: data.id, 
            name: data.name, 
            category: data.category, 
            cmtPrice: data.cmt_price 
        }]);
        logActivity('CREATE', 'PRODUCT', `Menambahkan produk baru: ${p.name} (${p.category}) - ${formatCurrency(p.cmtPrice)}`);
        showNotification('Produk berhasil ditambahkan', 'success');
    }
  };

  const updateProduct = async (p: Product) => {
    const { error } = await supabase.from('products').update({
        name: p.name,
        category: p.category,
        cmt_price: p.cmtPrice
    }).eq('id', p.id);

    if (error) {
        showNotification(error.message, 'error');
    } else {
        setProducts(products.map(prod => prod.id === p.id ? p : prod));
        logActivity('UPDATE', 'PRODUCT', `Memperbarui produk: ${p.name}`);
        showNotification('Data produk diperbarui', 'success');
    }
  };

  const deleteProduct = async (id: string) => {
    const prod = products.find(p => p.id === id);
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) showNotification(error.message, 'error');
    else {
        setProducts(products.filter(p => p.id !== id));
        logActivity('DELETE', 'PRODUCT', `Menghapus produk: ${prod?.name || id}`);
        showNotification('Produk dihapus', 'info');
    }
  };

  // --- Finance Categories ---
  const addFinanceCategory = async (name: string) => {
    const { error } = await supabase.from('finance_categories').insert([{ name }]);
    if (error) showNotification(error.message, 'error');
    else {
        setFinanceCategories([...financeCategories, name]);
        logActivity('CREATE', 'CATEGORY', `Menambah kategori keuangan: ${name}`);
        showNotification('Kategori baru ditambahkan', 'success');
    }
  };

  const updateFinanceCategory = async (oldName: string, newName: string) => {
    const { error } = await supabase.from('finance_categories').update({ name: newName }).eq('name', oldName);
    if (error) {
        showNotification(error.message, 'error');
        return;
    }
    await supabase.from('transactions').update({ category: newName }).eq('category', oldName);

    setFinanceCategories(financeCategories.map(c => c === oldName ? newName : c));
    setTransactions(transactions.map(t => t.category === oldName ? { ...t, category: newName } : t));
    logActivity('UPDATE', 'CATEGORY', `Mengubah kategori keuangan ${oldName} menjadi ${newName}`);
    showNotification('Kategori keuangan diperbarui', 'success');
  };

  const deleteFinanceCategory = async (name: string) => {
    const { error } = await supabase.from('finance_categories').delete().eq('name', name);
    if (error) showNotification(error.message, 'error');
    else {
        setFinanceCategories(financeCategories.filter(c => c !== name));
        logActivity('DELETE', 'CATEGORY', `Menghapus kategori keuangan: ${name}`);
        showNotification('Kategori dihapus', 'info');
    }
  };

  // --- SPK Management (Refactored to use RPC) ---

  const addSPK = async (spk: SPK) => {
    try {
        // RPC Call: Create SPK and Items in one transaction
        // Ensure you have created the 'create_spk_full' function in Supabase
        const payload = spk.items.map(item => ({
            product_id: item.productId,
            product_name: item.productName,
            cmt_price: item.cmtPrice,
            qty: item.qty
        }));

        const { data, error } = await supabase.rpc('create_spk_full', {
            p_spk_number: spk.spkNumber,
            p_date: spk.date,
            p_notes: spk.notes || '',
            p_items: payload
        });

        if (error) throw error;

        logActivity('CREATE', 'SPK', `Menerbitkan SPK Baru: ${spk.spkNumber} (Total: ${spk.totalQty} pcs)`);
        showNotification('SPK diterbitkan', 'success');
        fetchAllData(); 

    } catch (e: any) {
        console.error(e);
        showNotification('Gagal buat SPK (RPC): ' + e.message, 'error');
    }
  };

  const updateSPK = async (updatedSPK: SPK) => {
    try {
        // RPC Call: Update SPK Header and Sync Items
        // Ensure you have created the 'update_spk_full' function in Supabase
        const payload = updatedSPK.items.map(item => ({
            id: item.id.includes('.') ? null : item.id, // If ID is generated locally (contains dot usually from random), send null to trigger insert
            product_id: item.productId,
            product_name: item.productName,
            cmt_price: item.cmtPrice,
            qty: item.qty
        }));
        
        const sanitizedPayload = updatedSPK.items.map(item => {
           // Check if ID is a valid UUID (simple regex or length check). Supabase IDs are UUIDs (36 chars)
           const isUUID = item.id && item.id.length === 36;
           return {
               id: isUUID ? item.id : null, 
               product_id: item.productId,
               product_name: item.productName,
               cmt_price: item.cmtPrice,
               qty: item.qty
           };
        });

        const { error } = await supabase.rpc('update_spk_full', {
            p_spk_id: updatedSPK.id,
            p_date: updatedSPK.date,
            p_notes: updatedSPK.notes || '',
            p_items: sanitizedPayload
        });

        if (error) throw error;
        
        logActivity('UPDATE', 'SPK', `Memperbarui Data SPK: ${updatedSPK.spkNumber}`);
        showNotification('Info SPK diperbarui', 'success');
        
        await fetchAllData();
    } catch (e: any) {
        console.error(e);
        showNotification('Gagal update SPK: ' + e.message, 'error');
    }
  };

  const deleteSPK = async (id: string) => {
    const spk = spks.find(s => s.id === id);
    const { error } = await supabase.from('spks').delete().eq('id', id);
    if (error) showNotification(error.message, 'error');
    else {
        setSpks(spks.filter(s => s.id !== id));
        logActivity('DELETE', 'SPK', `Menghapus SPK: ${spk?.spkNumber || id}`);
        showNotification('SPK dihapus', 'info');
    }
  };

  const updateSPKItemStatus = (spkId: string, itemId: string, status: ItemStatus) => {
    // Handled by DB triggers
  };

  // --- Mutations (Production Results) ---

  const addMutation = async (spkId: string, mutationData: Omit<SPKMutation, 'id' | 'spkId'>) => {
    try {
        const { data: mutData, error } = await supabase.from('spk_mutations').insert([{
            spk_id: spkId,
            item_id: mutationData.itemId,
            product_name: mutationData.productName,
            date: mutationData.date,
            qty: mutationData.qty,
            notes: mutationData.notes
        }]).select().single();

        if (error) throw error;
        
        const spk = spks.find(s => s.id === spkId);
        const item = spk?.items.find(i => i.id === mutationData.itemId);
        
        if (item) {
            const amount = item.cmtPrice * mutationData.qty;
            if (amount > 0) {
                 await supabase.from('transactions').insert([{
                    date: mutationData.date, // FIX: Gunakan tanggal input dari mutationData
                    type: 'IN',
                    category: 'PRODUKSI',
                    amount: amount,
                    description: `Hasil Produksi: ${mutationData.productName} (${mutationData.qty} Pcs)`,
                    ref_id: mutData.id
                }]);
            }
        }

        logActivity('CREATE', 'SPK', `Input hasil produksi: ${mutationData.productName} (+${mutationData.qty}) pada SPK ${spk?.spkNumber}`);
        showNotification('Produksi dicatat', 'success');
        fetchAllData(); 

    } catch (e: any) {
        showNotification(e.message, 'error');
    }
  };

  const updateMutation = async (spkId: string, mutation: SPKMutation) => {
    try {
        await supabase.from('spk_mutations').update({
            qty: mutation.qty,
            date: mutation.date, // Update date in mutation
            notes: mutation.notes
        }).eq('id', mutation.id);
        
        const spk = spks.find(s => s.id === spkId);
        const item = spk?.items.find(i => i.id === mutation.itemId);
        
        if (item) {
            const newAmount = item.cmtPrice * mutation.qty;
            await supabase.from('transactions')
                .update({ 
                    date: mutation.date, // FIX: Sinkronkan tanggal transaksi dengan tanggal mutasi baru
                    amount: newAmount, 
                    description: `Hasil Produksi: ${mutation.productName} (${mutation.qty} Pcs)` 
                })
                .eq('ref_id', mutation.id);
        }

        logActivity('UPDATE', 'SPK', `Update hasil produksi ${mutation.productName} menjadi ${mutation.qty} pcs`);
        showNotification('Mutasi update', 'success');
        fetchAllData();

    } catch (e: any) {
        showNotification(e.message, 'error');
    }
  };

  const deleteMutation = async (spkId: string, mutationId: string) => {
    try {
        await supabase.from('transactions').delete().eq('ref_id', mutationId);
        await supabase.from('spk_mutations').delete().eq('id', mutationId);

        logActivity('DELETE', 'SPK', `Menghapus riwayat produksi (ID: ${mutationId.substr(0,8)}...)`);
        showNotification('Riwayat dihapus', 'info');
        fetchAllData();
    } catch (e: any) {
        showNotification(e.message, 'error');
    }
  };

  // --- Transactions ---

  const addTransaction = async (t: Transaction) => {
    const { data, error } = await supabase.from('transactions').insert([{
        date: t.date,
        type: t.type,
        category: t.category,
        amount: t.amount,
        description: t.description
    }]).select().single();

    if (error) {
        showNotification(error.message, 'error');
    } else if (data) {
        setTransactions([ { ...t, id: data.id }, ...transactions ]);
        logActivity('CREATE', 'FINANCE', `Catat Transaksi ${t.type === 'IN' ? 'Masuk' : 'Keluar'}: ${t.description} (${formatCurrency(t.amount)})`);
        showNotification('Transaksi disimpan', 'success');
    }
  };

  const updateTransaction = async (t: Transaction) => {
    const { error } = await supabase.from('transactions').update({
        date: t.date,
        type: t.type,
        category: t.category,
        amount: t.amount,
        description: t.description
    }).eq('id', t.id);

    if (error) {
        showNotification(error.message, 'error');
    } else {
        setTransactions(transactions.map(tr => tr.id === t.id ? t : tr));
        logActivity('UPDATE', 'FINANCE', `Update Transaksi: ${t.description} (${formatCurrency(t.amount)})`);
        showNotification('Transaksi diperbarui', 'success');
    }
  };

  const deleteTransaction = async (id: string) => {
    const tx = transactions.find(t => t.id === id);
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) showNotification(error.message, 'error');
    else {
        setTransactions(transactions.filter(t => t.id !== id));
        logActivity('DELETE', 'FINANCE', `Menghapus Transaksi: ${tx?.description} (${formatCurrency(tx?.amount || 0)})`);
        showNotification('Transaksi dihapus', 'info');
    }
  };

  const navigate = (view: ViewState, params?: any) => {
    setCurrentView(view);
    setViewParams(params || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const contextValue: AppContextType = {
    isAuthenticated,
    user,
    login,
    logout,
    updateAccount,
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    spks,
    addSPK,
    updateSPK,
    deleteSPK,
    updateSPKItemStatus,
    addMutation,
    updateMutation,
    deleteMutation,
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    financeCategories,
    addFinanceCategory,
    updateFinanceCategory,
    deleteFinanceCategory,
    activityLogs,
    fetchActivityLogs,
    currentView,
    navigate,
    viewParams,
    showNotification
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
      <ToastContainer notifications={notifications} removeNotification={removeNotification} />
      {isLoading && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-dark-bg/80 backdrop-blur-sm">
             <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
      )}
    </AppContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
};
