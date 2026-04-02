import { User, Role, RolePermissions } from '../types';

export const cleanLocalStorage = () => {
  const keysToKeep = ['language', 'theme'];
  Object.keys(localStorage).forEach(key => {
    if (!keysToKeep.includes(key)) {
      localStorage.removeItem(key);
    }
  });
};

export const hasPermission = (user: User | null, permission: string, rolePermissions: RolePermissions[]): boolean => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  
  const rolePerms = rolePermissions.find(rp => rp.role === user.role);
  if (!rolePerms) return false;
  
  return rolePerms.permissions.includes(permission);
};

export const formatCurrency = (amount: number, currency: string = 'SAR'): string => {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const formatDate = (date: string | Date): string => {
  return new Intl.DateTimeFormat('ar-SA', {
    dateStyle: 'medium',
  }).format(new Date(date));
};
