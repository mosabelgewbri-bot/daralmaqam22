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
  PlusCircle,
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
  DollarSign,
  Bus,
  Plane,
  Ticket,
  Calculator,
  Building
} from 'lucide-react';
import { clsx } from 'clsx';
import { Company } from '../types';
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
  { id: 'booking', label: 'حجز جديد', icon: Edit2 },
  { id: 'trips', label: 'إدارة الرحلات', icon: Plane },
  { id: 'arrival-notice', label: 'إشعار الوصول', icon: Bus },
  { id: 'visa', label: 'وحدة التأشيرات', icon: Shield },
  { id: 'rooming', label: 'تسكين الفنادق', icon: Calendar },
  { id: 'inventory', label: 'مخزون الغرف', icon: Hotel },
  { id: 'finance', label: 'المالية', icon: DollarSign },
  { id: 'analytics', label: 'التحليلات', icon: TrendingUp },
  { id: 'profit-loss', label: 'الأرباح والخسائر', icon: Activity },
  { id: 'reports', label: 'التقرير الشامل', icon: Eye },
  { id: 'offers', label: 'عروض العمرة', icon: Gift },
  { id: 'umrah-pricing', label: 'حاسبة التسعير', icon: Calculator },
  { id: 'marketing', label: 'التسويق والعملاء', icon: Megaphone },
  { id: 'cards', label: 'بطاقات المعتمرين', icon: CreditCard },
  { id: 'tickets', label: 'التذاكر والبيانات', icon: Ticket },
  { id: 'users', label: 'المستخدمين', icon: UserPlus },
  { id: 'logs', label: 'سجل العمليات', icon: ScrollText },
  { id: 'companies', label: 'إدارة الشركات', icon: Building },
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
  { id: 'canViewLogs', label: 'عرض سجل العمليات' },
];

export default function UsersManagement({ user: currentUser }: { user: User }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermissions[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'permissions' | 'companies'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<User> & { password?: string }>({});
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
  const [newRoleData, setNewRoleData] = useState({
    roleId: '',
    roleDisplayName: '',
    copyFrom: 'staff'
  });
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
        const [usersData, permsData, companiesData] = await Promise.all([
          api.getUsers(),
          api.getPermissions(),
          api.getCompanies()
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
        setCompanies(companiesData);
        
        // Update localStorage cache for Sidebar
        localStorage.setItem('role_permissions', JSON.stringify(uniquePerms));
      } catch (error) {
        console.error('Error loading users/permissions:', error);
      }
    };
    loadData();
  }, []);

  const handleUpdateUserDetails = async () => {
    if (!selectedUser || !editFormData) return;
    try {
      await api.saveUser({ ...editFormData, id: selectedUser.id });
      
      // Audit Log
      await api.logAction(
        currentUser.id,
        currentUser.name,
        'تعديل مستخدم',
        `تم تعديل بيانات المستخدم: ${selectedUser.name} (@${selectedUser.username})`
      );

      showToast('تم تحديث بيانات المستخدم بنجاح', 'success');
      setIsEditing(false);
      
      // Refresh user list
      const updatedUsers = await api.getUsers();
      setUsers(updatedUsers);
      const updatedSelected = updatedUsers.find(u => u.id === selectedUser.id);
      if (updatedSelected) {
        setSelectedUser(updatedSelected);
      }
    } catch (error: any) {
      console.error('Error updating user:', error);
      showToast(error.message || 'حدث خطأ أثناء تحديث البيانات', 'error');
    }
  };

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

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleData.roleId.trim() || !newRoleData.roleDisplayName.trim()) {
      showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }

    const cleanRoleId = newRoleData.roleId.trim().toLowerCase().replace(/\s+/g, '_');
    
    // Check if role already exists
    if (rolePermissions.some(rp => rp.role === cleanRoleId)) {
      showToast('معرف الدور هذا مستخدم بالفعل. يرجى اختيار معرف آخر.', 'error');
      return;
    }

    // copy template permissions if copyFrom is specified, else create empty
    const templateRp = rolePermissions.find(rp => rp.role === newRoleData.copyFrom);
    
    const newRole: RolePermissions = {
      role: cleanRoleId,
      roleDisplayName: newRoleData.roleDisplayName.trim(),
      allowedScreens: templateRp ? [...templateRp.allowedScreens] : ['dashboard'],
      canEdit: templateRp ? templateRp.canEdit : false,
      canDelete: templateRp ? templateRp.canDelete : false,
      canExport: templateRp ? templateRp.canExport : false,
      canViewFinance: templateRp ? templateRp.canViewFinance : false,
      canApproveBookings: templateRp ? templateRp.canApproveBookings : false,
      canManageUsers: templateRp ? templateRp.canManageUsers : false,
      canEditTrips: templateRp ? templateRp.canEditTrips : false,
      canViewReports: templateRp ? templateRp.canViewReports : false,
      canManageSettings: templateRp ? templateRp.canManageSettings : false,
      canManageFinance: templateRp ? templateRp.canManageFinance : false,
      canChangeVisaStatus: templateRp ? templateRp.canChangeVisaStatus : false,
      canManageRooms: templateRp ? templateRp.canManageRooms : false,
      canViewLogs: templateRp ? templateRp.canViewLogs : false,
      dataScope: templateRp ? templateRp.dataScope : 'own'
    };

    try {
      await api.savePermission(newRole);
      
      const updatedPerms = [...rolePermissions, newRole];
      setRolePermissions(updatedPerms);
      localStorage.setItem('role_permissions', JSON.stringify(updatedPerms));
      window.dispatchEvent(new Event('permissions_updated'));
      
      // Audit Log
      await api.logAction(
        currentUser.id,
        currentUser.name,
        'إضافة دور جديد',
        `تم إضافة دور جديد: ${newRoleData.roleDisplayName} (${cleanRoleId})`
      );

      showToast('تمت إضافة الدور الجديد وصلاحياته بنجاح', 'success');
      setIsAddRoleModalOpen(false);
      setNewRoleData({ roleId: '', roleDisplayName: '', copyFrom: 'staff' });
    } catch (err: any) {
      console.error('Error creating role:', err);
      showToast(err.message || 'حدث خطأ أثناء إضافة الدور الجديد', 'error');
    }
  };

  const handleDeleteRole = async (role: string) => {
    const protectedRoles = ['admin', 'staff', 'accountant', 'manager', 'visa_specialist', 'receptionist'];
    if (protectedRoles.includes(role)) {
      showToast('لا يمكن حذف الأدوار الافتراضية للنظام', 'error');
      return;
    }

    const usersWithRole = users.filter(u => u.role === role);
    if (usersWithRole.length > 0) {
      showToast(`لا يمكن حذف هذا الدور لوجود مستخدمين معينين به (${usersWithRole.length} مستخدمين). يرجى تغيير أدوارهم أولاً.`, 'error');
      return;
    }

    try {
      const rp = rolePermissions.find(p => p.role === role);
      if (rp) {
        const id = (rp as any).id;
        if (id) {
          await api.deletePermission(id);
        }
      }
      
      const updatedPerms = rolePermissions.filter(rp => rp.role !== role);
      setRolePermissions(updatedPerms);
      localStorage.setItem('role_permissions', JSON.stringify(updatedPerms));
      window.dispatchEvent(new Event('permissions_updated'));

      await api.logAction(
        currentUser.id,
        currentUser.name,
        'حذف دور',
        `تم حذف دور الصلاحيات: ${role}`
      );

      showToast('تم حذف الدور بنجاح', 'success');
    } catch (err: any) {
      console.error('Error deleting role:', err);
      showToast(err.message || 'حدث خطأ أثناء حذف الدور', 'error');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const userToAdd = {
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
      showToast('تم إضافة المستخدم بنجاح', 'success');
    } catch (error: any) {
      console.error('Error adding user:', error);
      showToast(error.message || 'حدث خطأ أثناء إضافة المستخدم', 'error');
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
              {currentUser.role === 'admin' && (
                <button 
                  onClick={() => { setActiveTab('companies'); setSelectedUser(null); }}
                  className={clsx(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    activeTab === 'companies' ? "bg-gold text-black" : "text-white/60 hover:text-white"
                  )}
                >
                  إدارة الشركات
                </button>
              )}
            </div>
            {activeTab === 'users' ? (
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 bg-gold hover:bg-gold/90 text-black px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-gold/10"
              >
                <UserPlus className="w-5 h-5" />
                إضافة مستخدم جديد
              </button>
            ) : activeTab === 'permissions' ? (
              <button 
                onClick={() => setIsAddRoleModalOpen(true)}
                className="flex items-center gap-2 bg-gold hover:bg-gold/90 text-black px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-gold/10"
              >
                <PlusCircle className="w-5 h-5" />
                إضافة دور جديد
              </button>
            ) : null}
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
                        {rolePermissions.map(rp => (
                          <option key={rp.role} value={rp.role}>
                            {rp.role === 'admin' ? 'المدير العام' : 
                             rp.role === 'staff' ? 'موظف عمليات' : 
                             rp.role === 'accountant' ? 'المحاسب المالي' :
                             rp.role === 'manager' ? 'مدير فرع' :
                             rp.role === 'visa_specialist' ? 'مسؤول تأشيرات' : 
                             rp.role === 'receptionist' ? 'موظف استقبال' : 
                             rp.roleDisplayName || rp.role}
                          </option>
                        ))}
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

          {isAddRoleModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAddRoleModalOpen(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative glass-card w-full max-w-lg p-8 space-y-6"
              >
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <h3 className="text-xl font-bold text-gold">إضافة دور جديد مخصص</h3>
                  <button onClick={() => setIsAddRoleModalOpen(false)} className="text-white/40 hover:text-white">
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleCreateRole} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs text-white/40 uppercase tracking-widest text-right block">اسم الدور (باللغة العربية)</label>
                    <input 
                      required
                      type="text"
                      placeholder="مثال: مشرف نقل، مسؤول حافلات، إلخ..."
                      className="input-field w-full text-right"
                      value={newRoleData.roleDisplayName}
                      onChange={e => setNewRoleData({...newRoleData, roleDisplayName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-white/40 uppercase tracking-widest text-right block">معرف الدور البرمجي (ID بالإنجليزية)</label>
                    <input 
                      required
                      type="text"
                      placeholder="مثال: transport_supervisor"
                      className="input-field w-full text-left"
                      value={newRoleData.roleId}
                      onChange={e => setNewRoleData({...newRoleData, roleId: e.target.value.toLowerCase().trim().replace(/\s+/g, '_')})}
                    />
                    <p className="text-[10px] text-white/30 text-right">سيتم تحويل هذا الرمز تلقائياً إلى صيغة برمجية مناسبة</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-white/40 uppercase tracking-widest text-right block">نسخ صلاحيات مبدئية من دور سابق</label>
                    <select 
                      className="input-field w-full"
                      value={newRoleData.copyFrom}
                      onChange={e => setNewRoleData({...newRoleData, copyFrom: e.target.value})}
                    >
                      {rolePermissions.map((rp) => (
                        <option key={rp.role} value={rp.role}>
                          {rp.role === 'admin' ? 'المدير العام' : 
                           rp.role === 'staff' ? 'موظف عمليات' : 
                           rp.role === 'accountant' ? 'المحاسب المالي' :
                           rp.role === 'manager' ? 'مدير فرع' :
                           rp.role === 'visa_specialist' ? 'مسؤول تأشيرات' : 
                           rp.role === 'receptionist' ? 'موظف استقبال' : 
                           rp.roleDisplayName || rp.role}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-4">
                    <button type="submit" className="btn-gold w-full py-4 font-bold text-lg">
                      تأكيد إنشاء الدور وصلاحياته
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
                        onClick={() => { setSelectedUser(user); setIsEditing(false); }}
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
            ) : activeTab === 'permissions' ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {rolePermissions.map((rp) => (
                  <div key={rp.role} className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-white/10 bg-white/[0.02]">
                      <div className="flex items-center justify-between mb-4">
                        <Shield className="w-8 h-8 text-gold" />
                        {!['admin', 'staff', 'accountant', 'manager', 'visa_specialist', 'receptionist'].includes(rp.role) ? (
                          <button 
                            onClick={() => {
                              setConfirmModal({
                                show: true,
                                title: 'حذف دور وصلاحيات',
                                message: `هل أنت متأكد من حذف الدور المخصص "${rp.roleDisplayName || rp.role}"؟ سيتم حذف جميع صلاحياته المحددة، ولا يمكن التراجع عن هذا الإجراء.`,
                                type: 'danger',
                                onConfirm: () => handleDeleteRole(rp.role)
                              });
                            }}
                            className="p-2 hover:bg-red-500/10 rounded-lg text-white/40 hover:text-red-400 transition-all border border-transparent hover:border-red-500/20"
                            title="حذف هذا الدور"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">دور أساسي</span>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-white capitalize">
                        {rp.role === 'admin' ? 'المدير العام' : 
                         rp.role === 'staff' ? 'موظف عمليات' : 
                         rp.role === 'accountant' ? 'المحاسب المالي' :
                         rp.role === 'manager' ? 'مدير فرع' :
                         rp.role === 'visa_specialist' ? 'مسؤول تأشيرات' : 
                         rp.role === 'receptionist' ? 'موظف استقبال' : 
                         rp.roleDisplayName || rp.role}
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
                
                {/* Add Role Card Button */}
                <div 
                  onClick={() => setIsAddRoleModalOpen(true)}
                  className="bg-white/5 hover:bg-white/[0.08] hover:scale-[1.02] border-2 border-dashed border-white/10 hover:border-gold/30 rounded-3xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300 min-h-[300px]"
                >
                  <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center text-gold shadow-lg shadow-gold/10">
                    <PlusCircle className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <h4 className="text-lg font-bold text-white">إضافة دور جديد مخصص</h4>
                    <p className="text-xs text-white/40 mt-1 max-w-[200px] mx-auto">إضافة دور مخصص جديد في نظام الصلاحيات وتحديد شاشاته وإجراءاته يدوياً</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-white/5 p-6 rounded-3xl border border-white/10">
                  <div>
                    <h3 className="text-xl font-bold text-white">إدارة الشركات</h3>
                    <p className="text-white/40 text-sm">إضافة وتعديل بيانات الشركاء والفروع</p>
                  </div>
                  <button 
                    onClick={() => {
                      setConfirmModal({
                        show: true,
                        title: 'إضافة شركة جديدة',
                        message: 'هل تريد إضافة شركة جديدة؟',
                        type: 'info',
                        onConfirm: async () => {
                          const name = prompt('اسم الشركة:');
                          if (name) {
                            await api.saveCompany({ name, status: 'active' });
                            const comps = await api.getCompanies();
                            setCompanies(comps);
                          }
                        }
                      });
                    }}
                    className="btn-gold px-6 py-2 flex items-center gap-2"
                  >
                    <Building className="w-4 h-4" /> شركة جديدة
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {companies.map(company => (
                    <motion.div 
                      key={company.id}
                      layout
                      className="glass-card p-6 flex flex-col gap-4 group"
                    >
                      <div className="flex justify-between items-start">
                        <div className="w-12 h-12 rounded-xl bg-gold/20 flex items-center justify-center text-gold">
                          <Building className="w-6 h-6" />
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={async () => {
                              const newName = prompt('اسم الشركة الجديد:', company.name);
                              if (newName && newName !== company.name) {
                                await api.saveCompany({ ...company, name: newName });
                                const comps = await api.getCompanies();
                                setCompanies(comps);
                              }
                            }}
                            className="p-2 hover:bg-white/10 rounded-lg text-white/60"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={async () => {
                              if (confirm('هل أنت متأكد من حذف هذه الشركة؟')) {
                                await api.deleteCompany(company.id);
                                setCompanies(prev => prev.filter(c => c.id !== company.id));
                              }
                            }}
                            className="p-2 hover:bg-red-500/10 rounded-lg text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xl font-bold text-white">{company.name}</h4>
                        <p className="text-xs text-white/30 font-mono">ID: {company.id}</p>
                      </div>

                      <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                        <span className={clsx(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                          company.status === 'active' ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-white/20"
                        )}>
                          {company.status === 'active' ? 'نشطة' : 'غير نشطة'}
                        </span>
                        <button 
                          onClick={() => {
                            api.setCompanyId(company.id);
                            window.location.reload();
                          }}
                          className="text-[10px] font-bold text-gold hover:underline"
                        >
                          دخول للشركة
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
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
                  {isEditing ? (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs text-white/40 uppercase tracking-widest">الاسم الكامل</label>
                        <input 
                          type="text"
                          className="input-field w-full"
                          value={editFormData.name || ''}
                          onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-white/40 uppercase tracking-widest">اسم المستخدم</label>
                        <input 
                          type="text"
                          className="input-field w-full"
                          value={editFormData.username || ''}
                          onChange={e => setEditFormData({...editFormData, username: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-white/40 uppercase tracking-widest">البريد الإلكتروني</label>
                        <input 
                          type="email"
                          className="input-field w-full"
                          value={editFormData.email || ''}
                          onChange={e => setEditFormData({...editFormData, email: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-white/40 uppercase tracking-widest">كلمة المرور الجديدة</label>
                        <div className="relative">
                          <input 
                            type="text"
                            className="input-field w-full"
                            placeholder="اتركها فارغة إذا لم ترد التغيير"
                            value={editFormData.password || ''}
                            onChange={e => setEditFormData({...editFormData, password: e.target.value})}
                          />
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs text-white/40 uppercase tracking-widest">الدور</label>
                          <select 
                            className="input-field w-full"
                            value={editFormData.role || 'staff'}
                            onChange={e => setEditFormData({...editFormData, role: e.target.value as Role})}
                          >
                            {rolePermissions.map(rp => (
                              <option key={rp.role} value={rp.role}>
                                {rp.role === 'admin' ? 'المدير العام' : 
                                 rp.role === 'staff' ? 'موظف عمليات' : 
                                 rp.role === 'accountant' ? 'المحاسب المالي' :
                                 rp.role === 'manager' ? 'مدير فرع' :
                                 rp.role === 'visa_specialist' ? 'مسؤول تأشيرات' : 
                                 rp.role === 'receptionist' ? 'موظف استقبال' : 
                                 rp.roleDisplayName || rp.role}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-white/40 uppercase tracking-widest">الحالة</label>
                          <select 
                            className="input-field w-full"
                            value={editFormData.status || 'active'}
                            onChange={e => setEditFormData({...editFormData, status: e.target.value as 'active' | 'inactive'})}
                          >
                            <option value="active">نشط</option>
                            <option value="inactive">غير نشط</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs text-white/40 uppercase tracking-widest">الشركة</label>
                        <select 
                          className="input-field w-full"
                          value={editFormData.companyId || ''}
                          onChange={e => setEditFormData({...editFormData, companyId: e.target.value})}
                        >
                          <option value="">كل الشركات</option>
                          {companies.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="pt-8 flex gap-4">
                        <button 
                          onClick={handleUpdateUserDetails}
                          className="flex-1 btn-gold py-3 flex items-center justify-center gap-2"
                        >
                          <Check className="w-4 h-4" /> حفظ التعديلات
                        </button>
                        <button 
                          onClick={() => setIsEditing(false)}
                          className="flex-1 px-6 py-3 rounded-xl bg-white/5 text-white font-bold hover:bg-white/10 transition-all border border-white/10"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
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
                          <p className="font-bold text-white capitalize">
                            {selectedUser.role === 'admin' ? 'المدير العام' : 
                             selectedUser.role === 'staff' ? 'موظف عمليات' : 
                             selectedUser.role === 'accountant' ? 'المحاسب المالي' :
                             selectedUser.role === 'manager' ? 'مدير فرع' :
                             selectedUser.role === 'visa_specialist' ? 'مسؤول تأشيرات' : 
                             selectedUser.role === 'receptionist' ? 'موظف استقبال' : 
                             (rolePermissions.find(p => p.role === selectedUser.role)?.roleDisplayName || selectedUser.role)}
                          </p>
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
                        <button 
                          onClick={() => {
                            setIsEditing(true);
                            setEditFormData({
                              name: selectedUser.name,
                              username: selectedUser.username,
                              email: selectedUser.email,
                              role: selectedUser.role,
                              status: selectedUser.status,
                              password: (selectedUser as any).password || ''
                            });
                          }}
                          className="flex-1 btn-gold py-3 flex items-center justify-center gap-2"
                        >
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
                    </>
                  )}
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
