import React, { useState, useEffect } from 'react';
import { User, Role, RolePermissions } from '../types';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UserPlus, 
  Shield, 
  Search, 
  Filter,
  CheckCircle2,
  XCircle,
  Mail,
  Calendar,
  Lock,
  Trash2,
  Edit2,
  ArrowLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Layout,
  Settings as SettingsIcon,
  Check,
  X,
  AlertCircle,
  Zap,
  Info,
  CheckCircle as CheckCircleIcon,
  Hotel,
  TrendingUp,
  Activity,
  Gift,
  Megaphone,
  CreditCard,
  ScrollText,
  DollarSign
} from 'lucide-react';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';
import Logo from './Logo';

// Toast Component
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info' | 'warning', onClose: () => void }) => {
  const icons = {
    success: <CheckCircleIcon className="w-5 h-5 text-emerald-400" />,
    error: <XCircle className="w-5 h-5 text-red-400" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-400" />,
    info: <Info className="w-5 h-5 text-blue-400" />
  };

  const colors = {
    success: 'border-emerald-500/50 bg-emerald-500/10',
    error: 'border-red-500/50 bg-red-500/10',
    warning: 'border-amber-500/50 bg-amber-500/10',
    info: 'border-blue-500/50 bg-blue-500/10'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={clsx(
        "fixed bottom-8 left-8 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl border backdrop-blur-xl shadow-2xl min-w-[320px]",
        colors[type]
      )}
    >
      {icons[type]}
      <p className="text-white font-medium flex-1">{message}</p>
      <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

// Confirmation Modal Component
const ConfirmModal = ({ 
  show, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  type = 'danger' 
}: { 
  show: boolean, 
  title: string, 
  message: string, 
  onConfirm: () => void, 
  onCancel: () => void,
  type?: 'danger' | 'warning' | 'info'
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-md bg-matte-black border border-white/10 rounded-3xl p-8 shadow-2xl"
      >
        <div className={clsx(
          "w-16 h-16 rounded-2xl flex items-center justify-center mb-6",
          type === 'danger' ? "bg-red-500/20 text-red-500" : 
          type === 'warning' ? "bg-amber-500/20 text-amber-500" : "bg-blue-500/20 text-blue-500"
        )}>
          {type === 'danger' ? <Trash2 className="w-8 h-8" /> : 
           type === 'warning' ? <AlertCircle className="w-8 h-8" /> : <Info className="w-8 h-8" />}
        </div>
        
        <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
        <p className="text-white/60 mb-8 leading-relaxed text-right">{message}</p>
        
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 rounded-xl bg-white/5 text-white font-bold hover:bg-white/10 transition-all"
          >
            إلغاء
          </button>
          <button
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className={clsx(
              "flex-1 px-6 py-3 rounded-xl text-white font-bold transition-all shadow-lg",
              type === 'danger' ? "bg-red-600 hover:bg-red-500 shadow-red-500/20" : 
              type === 'warning' ? "bg-amber-600 hover:bg-amber-500 shadow-amber-500/20" : "bg-blue-600 hover:bg-blue-500 shadow-blue-500/20"
            )}
          >
            تأكيد
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const PERMISSIONS_LIST = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: Layout },
  { id: 'booking', label: 'الحجوزات', icon: Edit2 },
  { id: 'inventory', label: 'المخزون والفنادق', icon: Hotel },
  { id: 'rooming', label: 'تسكين الفنادق', icon: Calendar },
  { id: 'finance', label: 'المالية', icon: DollarSign },
  { id: 'analytics', label: 'تحليلات مالية', icon: TrendingUp },
  { id: 'profit-loss', label: 'الأرباح والخسائر', icon: Activity },
  { id: 'visa', label: 'وحدة التأشيرات', icon: Shield },
  { id: 'reports', label: 'التقارير', icon: Eye },
  { id: 'offers', label: 'العروض الخارجية', icon: Gift },
  { id: 'marketing', label: 'التسويق', icon: Megaphone },
  { id: 'trips', label: 'إدارة الرحلات', icon: SettingsIcon },
  { id: 'cards', label: 'بطاقات المعتمرين', icon: CreditCard },
  { id: 'users', label: 'المستخدمين', icon: UserPlus },
  { id: 'logs', label: 'سجل العمليات', icon: ScrollText },
  { id: 'settings', label: 'الإعدادات', icon: SettingsIcon },
];

const ACTION_PERMISSIONS = [
  { id: 'canEdit', label: 'إمكانية التعديل' },
  { id: 'canDelete', label: 'إمكانية الحذف' },
  { id: 'canExport', label: 'تصدير البيانات' },
  { id: 'canViewFinance', label: 'رؤية المالية' },
  { id: 'canApproveBookings', label: 'اعتماد الحجوزات' },
  { id: 'canManageUsers', label: 'إدارة المستخدمين' },
  { id: 'canEditTrips', label: 'إدارة الرحلات' },
  { id: 'canViewReports', label: 'عرض التقارير' },
  { id: 'canManageSettings', label: 'إدارة الإعدادات' },
  { id: 'canManageFinance', label: 'إدارة المالية' },
  { id: 'canChangeVisaStatus', label: 'تغيير حالة التأشيرة' },
  { id: 'canManageRooms', label: 'إدارة الغرف' },
];

export default function UsersManagement({ user: currentUser }: { user: User }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermissions[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'permissions'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    username: '',
    email: '',
    role: 'staff' as Role,
    password: ''
  });
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ show: boolean, title: string, message: string, onConfirm: () => void, type?: 'danger' | 'warning' | 'info' }>({ 
    show: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersData, permsData] = await Promise.all([
          api.getUsers(),
          api.getPermissions()
        ]);
        
        // Deduplicate permissions by role to prevent duplicate key errors
        const uniquePerms = permsData.reduce((acc: RolePermissions[], current) => {
          const x = acc.find(item => item.role === current.role);
          if (!x) {
            return acc.concat([current]);
          } else {
            return acc;
          }
        }, []);

        setUsers(usersData);
        setRolePermissions(uniquePerms);
        
        // Update localStorage cache for Sidebar
        localStorage.setItem('role_permissions', JSON.stringify(uniquePerms));
      } catch (error) {
        console.error('Error loading users/permissions:', error);
      }
    };
    loadData();
  }, []);

  const handleUpdatePermission = async (role: Role, field: keyof RolePermissions, value: any) => {
    const rp = rolePermissions.find(p => p.role === role);
    if (!rp) return;

    let updatedRp: RolePermissions;
    if (field === 'allowedScreens') {
      const screens = rp.allowedScreens.includes(value)
        ? rp.allowedScreens.filter(s => s !== value)
        : [...rp.allowedScreens, value];
      updatedRp = { ...rp, allowedScreens: screens };
    } else {
      updatedRp = { ...rp, [field]: value };
    }

    try {
      await api.savePermission(updatedRp);
      setRolePermissions(prev => prev.map(p => p.role === role ? updatedRp : p));
      
      // Audit Log
      await api.logAction(
        currentUser.id,
        currentUser.name,
        'تحديث صلاحيات',
        `تم تحديث صلاحية (${field}) للدور: ${role}`
      );
      
      // Update localStorage cache for Sidebar
      const saved = localStorage.getItem('role_permissions');
      if (saved) {
        const perms = JSON.parse(saved) as RolePermissions[];
        const updatedPerms = perms.map(p => p.role === role ? updatedRp : p);
        localStorage.setItem('role_permissions', JSON.stringify(updatedPerms));
      } else {
        localStorage.setItem('role_permissions', JSON.stringify(rolePermissions.map(p => p.role === role ? updatedRp : p)));
      }
      
      // Notify other components
      window.dispatchEvent(new Event('permissions_updated'));
    } catch (error) {
      console.error('Error saving permission:', error);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const userToAdd = {
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      name: newUser.name,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      password: newUser.password,
      status: 'active' as const
    };

    try {
      await api.saveUser(userToAdd);

      // Audit Log
      await api.logAction(
        currentUser.id,
        currentUser.name,
        'إضافة مستخدم جديد',
        `تم إضافة المستخدم: ${userToAdd.name} (@${userToAdd.username}) بدور: ${userToAdd.role}`
      );

      const updatedUsers = await api.getUsers();
      setUsers(updatedUsers);
      setIsAddModalOpen(false);
      setNewUser({ name: '', username: '', email: '', role: 'staff', password: '' });
    } catch (error) {
      console.error('Error adding user:', error);
    }
  };

  const handleDeleteUser = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!id) return;
    try {
      console.log('Deleting user:', id);
      const userToDelete = users.find(u => u.id === id);
      await api.deleteUser(id);

      // Audit Log
      await api.logAction(
        currentUser.id,
        currentUser.name,
        'حذف مستخدم',
        `تم حذف المستخدم: ${userToDelete?.name || id} (@${userToDelete?.username || 'غير معروف'})`
      );

      setUsers(prev => prev.filter(u => u.id !== id));
      if (selectedUser?.id === id) setSelectedUser(null);
      showToast('تم حذف المستخدم بنجاح', 'success');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      showToast(error.message || 'حدث خطأ أثناء حذف المستخدم', 'error');
    }
  };

  const filteredUsers = users.filter(u => 
    (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-matte-black p-8 space-y-8 flex flex-col min-h-0">
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-6">
          <Logo iconSize={40} textSize="text-4xl" className="hidden md:flex" />
          <div className="h-12 w-px bg-white/10 hidden md:block" />
          <div>
            <h2 className="text-4xl font-bold gold-text-gradient mb-2">إدارة الوصول</h2>
            <p className="text-white/40">إدارة صلاحيات الوصول وأدوار الأمان في النظام</p>
          </div>
        </div>
          <div className="flex gap-4">
            <button 
              onClick={async () => {
                const [usersData, permsData] = await Promise.all([
                  api.getUsers(),
                  api.getPermissions()
                ]);
                
                const uniquePerms = permsData.reduce((acc: RolePermissions[], current) => {
                  const x = acc.find(item => item.role === current.role);
                  if (!x) {
                    return acc.concat([current]);
                  } else {
                    return acc;
                  }
                }, []);

                setUsers(usersData);
                setRolePermissions(uniquePerms);
                localStorage.setItem('role_permissions', JSON.stringify(uniquePerms));
                showToast('تم تحديث البيانات بنجاح', 'success');
              }}
              className="p-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl border border-white/10 transition-all"
              title="تحديث البيانات"
            >
              <Filter className="w-5 h-5" />
            </button>
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
              <button 
                onClick={() => { setActiveTab('users'); setSelectedUser(null); }}
                className={clsx(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === 'users' ? "bg-gold text-black" : "text-white/60 hover:text-white"
                )}
              >
                قائمة المستخدمين
              </button>
              <button 
                onClick={() => { setActiveTab('permissions'); setSelectedUser(null); }}
                className={clsx(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === 'permissions' ? "bg-gold text-black" : "text-white/60 hover:text-white"
                )}
              >
                صلاحيات الأدوار
              </button>
            </div>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 bg-gold hover:bg-gold/90 text-black px-6 py-3 rounded-xl font-bold transition-all"
            >
              <UserPlus className="w-5 h-5" />
              إضافة مستخدم جديد
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isAddModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAddModalOpen(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative glass-card w-full max-w-lg p-8 space-y-6"
              >
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <h3 className="text-xl font-bold text-gold">إضافة مستخدم جديد</h3>
                  <button onClick={() => setIsAddModalOpen(false)} className="text-white/40 hover:text-white">
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleAddUser} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs text-white/40 uppercase tracking-widest">الاسم الكامل</label>
                      <input 
                        required
                        type="text"
                        className="input-field w-full"
                        value={newUser.name}
                        onChange={e => setNewUser({...newUser, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-white/40 uppercase tracking-widest">اسم المستخدم</label>
                      <input 
                        required
                        type="text"
                        className="input-field w-full"
                        value={newUser.username}
                        onChange={e => setNewUser({...newUser, username: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-white/40 uppercase tracking-widest">البريد الإلكتروني</label>
                    <input 
                      required
                      type="email"
                      className="input-field w-full"
                      value={newUser.email}
                      onChange={e => setNewUser({...newUser, email: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs text-white/40 uppercase tracking-widest">كلمة المرور</label>
                      <input 
                        required
                        type="password"
                        className="input-field w-full"
                        value={newUser.password}
                        onChange={e => setNewUser({...newUser, password: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-white/40 uppercase tracking-widest">الدور</label>
                      <select 
                        className="input-field w-full"
                        value={newUser.role}
                        onChange={e => setNewUser({...newUser, role: e.target.value as Role})}
                      >
                        <option value="staff">موظف</option>
                        <option value="accountant">محاسب</option>
                        <option value="admin">مدير</option>
                        <option value="manager">مدير فرع</option>
                        <option value="visa_specialist">مسؤول تأشيرات</option>
                        <option value="receptionist">موظف استقبال</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button type="submit" className="btn-gold w-full py-4 font-bold text-lg">
                      تأكيد الإضافة
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="flex-1 flex gap-8 min-h-0">
          {/* Main Content Area (List or Permissions) */}
          <div className={clsx(
            "transition-all duration-500 flex flex-col min-h-0",
            selectedUser ? "w-1/2" : "w-full"
          )}>
            {activeTab === 'users' ? (
              <div className="space-y-4 flex-1 flex flex-col min-h-0">
                {/* Search & Filter Bar */}
                <div className="flex gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                  <div className="flex-1 relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <input 
                      type="text"
                      placeholder="البحث عن مستخدم..."
                      className="w-full bg-transparent border-b border-white/10 focus:border-gold outline-none pr-11 py-2 text-white text-right transition-all"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {/* Users Table */}
                <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden flex-1 flex flex-col min-h-0">
                  <div className={clsx(
                    "grid gap-4 p-6 border-b border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/40 text-right",
                    selectedUser ? "grid-cols-2" : "grid-cols-6"
                  )}>
                    <div className="col-span-2">معلومات المستخدم</div>
                    {!selectedUser && (
                      <>
                        <div>الدور</div>
                        <div>الحالة</div>
                        <div>آخر دخول</div>
                        <div className="text-left">الإجراءات</div>
                      </>
                    )}
                  </div>
                  <div className="divide-y divide-white/5 overflow-y-auto flex-1 custom-scrollbar">
                    {filteredUsers.map((user) => (
                      <motion.div 
                        key={user.id}
                        layout
                        onClick={() => setSelectedUser(user)}
                        className={clsx(
                          "grid gap-4 p-6 items-center hover:bg-white/[0.05] transition-colors cursor-pointer group",
                          selectedUser ? "grid-cols-2" : "grid-cols-6",
                          selectedUser?.id === user.id && "bg-gold/10 border-l-4 border-gold"
                        )}
                      >
                        <div className="col-span-2 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold shrink-0">
                            {user.name?.charAt(0) || '?'}
                          </div>
                          <div className="truncate">
                            <div className="font-bold text-white truncate">{user.name}</div>
                            <div className="text-[10px] text-white/40 truncate">@{user.username}</div>
                          </div>
                        </div>
                        {!selectedUser && (
                          <>
                            <div>
                              <span className={clsx(
                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                user.role === 'admin' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                                user.role === 'staff' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                user.role === 'accountant' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                user.role === 'manager' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                user.role === 'visa_specialist' ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" :
                                "bg-gray-500/10 text-gray-400 border-gray-500/20"
                              )}>
                                {user.role === 'admin' ? 'مدير' : 
                                 user.role === 'staff' ? 'موظف' : 
                                 user.role === 'accountant' ? 'محاسب' :
                                 user.role === 'manager' ? 'مدير فرع' :
                                 user.role === 'visa_specialist' ? 'تأشيرات' : 'استقبال'}
                              </span>
                            </div>
                            <div>
                              <div className={clsx(
                                "flex items-center gap-2 text-xs font-medium",
                                user.status === 'active' ? "text-emerald-400" : "text-white/20"
                              )}>
                                {user.status === 'active' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                {user.status === 'active' ? 'نشط' : 'غير نشط'}
                              </div>
                            </div>
                            <div className="text-sm text-white/40">
                              {user.lastLogin}
                            </div>
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setSelectedUser(user); }}
                                className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-all"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setConfirmModal({
                                    show: true,
                                    title: 'حذف مستخدم',
                                    message: `هل أنت متأكد من حذف المستخدم ${user.name}؟ لا يمكن التراجع عن هذا الإجراء.`,
                                    type: 'danger',
                                    onConfirm: () => handleDeleteUser(user.id, e as any)
                                  });
                                }}
                                className="p-2 hover:bg-red-500/10 rounded-lg text-white/60 hover:text-red-400 transition-all"
                                title="Delete User"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </>
                        )}
                        {selectedUser && (
                          <div className="flex justify-end">
                            <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-gold transition-colors" />
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {rolePermissions.map((rp) => (
                  <div key={rp.role} className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-white/10 bg-white/[0.02]">
                      <div className="flex items-center justify-between mb-4">
                        <Shield className="w-8 h-8 text-gold" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">صلاحيات الدور</span>
                      </div>
                      <h3 className="text-xl font-bold text-white capitalize">
                        {rp.role === 'admin' ? 'المدير العام' : 
                         rp.role === 'staff' ? 'موظف عمليات' : 
                         rp.role === 'accountant' ? 'المحاسب المالي' :
                         rp.role === 'manager' ? 'مدير فرع' :
                         rp.role === 'visa_specialist' ? 'مسؤول تأشيرات' : 'موظف استقبال'}
                      </h3>
                    </div>
                    <div className="p-6 flex-1 space-y-8">
                      {/* Screens Access */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-gold/60">الوصول للشاشات</h4>
                        <div className="grid grid-cols-1 gap-2">
                          {PERMISSIONS_LIST.map(screen => (
                            <label key={screen.id} className="flex items-center justify-between group cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-all">
                              <div className="flex items-center gap-3">
                                <screen.icon className={clsx("w-4 h-4", rp.allowedScreens.includes(screen.id) ? "text-gold" : "text-white/20")} />
                                <span className={clsx("text-sm transition-colors", rp.allowedScreens.includes(screen.id) ? "text-white" : "text-white/40")}>
                                  {screen.label}
                                </span>
                              </div>
                              <input 
                                type="checkbox" 
                                checked={rp.allowedScreens.includes(screen.id)}
                                onChange={() => handleUpdatePermission(rp.role, 'allowedScreens', screen.id)}
                                className="w-4 h-4 rounded border-white/10 bg-white/5 text-gold focus:ring-gold"
                              />
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="space-y-4 pt-4 border-t border-white/5">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-gold/60">الإجراءات المسموحة</h4>
                        <div className="grid grid-cols-1 gap-y-3">
                          {ACTION_PERMISSIONS.map(action => (
                            <label key={action.id} className="flex items-center justify-between group cursor-pointer">
                              <span className="text-sm text-white/60">{action.label}</span>
                              <input 
                                type="checkbox" 
                                checked={!!(rp as any)[action.id]}
                                onChange={(e) => handleUpdatePermission(rp.role, action.id as any, e.target.checked)}
                                className="w-4 h-4 rounded border-white/10 bg-white/5 text-gold focus:ring-gold"
                              />
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Data Scope */}
                      <div className="space-y-4 pt-4 border-t border-white/5">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-gold/60">نطاق رؤية البيانات</h4>
                        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                          <button 
                            onClick={() => handleUpdatePermission(rp.role, 'dataScope', 'all')}
                            className={clsx(
                              "flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all",
                              rp.dataScope === 'all' ? "bg-gold text-black" : "text-white/40 hover:text-white"
                            )}
                          >
                            الكل
                          </button>
                          <button 
                            onClick={() => handleUpdatePermission(rp.role, 'dataScope', 'own')}
                            className={clsx(
                              "flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all",
                              rp.dataScope === 'own' ? "bg-gold text-black" : "text-white/40 hover:text-white"
                            )}
                          >
                            عمله فقط
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Side: User Details Panel */}
          <AnimatePresence>
            {selectedUser && (
              <motion.div 
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 300, opacity: 0 }}
                className="w-1/2 glass-card flex flex-col overflow-hidden"
              >
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
                  <h3 className="font-bold text-gold uppercase tracking-widest text-sm">User Profile</h3>
                  <button 
                    onClick={() => setSelectedUser(null)}
                    className="p-2 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-24 h-24 rounded-3xl bg-gold/20 flex items-center justify-center text-gold text-4xl font-bold border-2 border-gold/30">
                      {selectedUser.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <h4 className="text-2xl font-bold text-white">{selectedUser.name}</h4>
                      <p className="text-gold font-mono text-sm">@{selectedUser.username}</p>
                    </div>
                    <div className={clsx(
                      "px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                      selectedUser.status === 'active' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                    )}>
                      {selectedUser.status}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Role</p>
                      <p className="font-bold text-white capitalize">{selectedUser.role}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Last Login</p>
                      <p className="font-bold text-white">{selectedUser.lastLogin}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-4 text-white/60">
                      <Mail className="w-5 h-5 text-gold" />
                      <div>
                        <p className="text-[10px] uppercase tracking-widest">Email Address</p>
                        <p className="text-sm font-medium">{selectedUser.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-white/60">
                      <Calendar className="w-5 h-5 text-gold" />
                      <div>
                        <p className="text-[10px] uppercase tracking-widest">Account Created</p>
                        <p className="text-sm font-medium">January 12, 2024</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-white/60">
                      <Lock className="w-5 h-5 text-gold" />
                      <div>
                        <p className="text-[10px] uppercase tracking-widest">Security Level</p>
                        <p className="text-sm font-medium">{selectedUser.role === 'admin' ? 'Full Access' : 'Restricted Access'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 flex gap-4">
                    <button className="flex-1 btn-gold py-3 flex items-center justify-center gap-2">
                      <Edit2 className="w-4 h-4" /> Edit Profile
                    </button>
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setConfirmModal({
                          show: true,
                          title: 'حذف مستخدم',
                          message: `هل أنت متأكد من حذف المستخدم ${selectedUser.name}؟ لا يمكن التراجع عن هذا الإجراء.`,
                          type: 'danger',
                          onConfirm: () => handleDeleteUser(selectedUser.id, e as any)
                        });
                      }}
                      className="px-4 py-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all"
                      title="Delete User"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {toast && (
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
            />
          )}
        </AnimatePresence>

        <ConfirmModal
          show={confirmModal.show}
          title={confirmModal.title}
          message={confirmModal.message}
          type={confirmModal.type}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(prev => ({ ...prev, show: false }))}
        />
      </div>
    );
  }
