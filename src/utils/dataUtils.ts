export const cleanLocalStorage = () => {
  localStorage.clear();
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const deduplicateBookings = (bookings: any[]) => {
  const seen = new Set();
  return bookings.filter((booking) => {
    const duplicate = seen.has(booking.id);
    seen.add(booking.id);
    return !duplicate;
  });
};

export const getRolePermissions = (role: string) => {
  const permissions: any = {
    admin: {
      canManageUsers: true,
      canManageTrips: true,
      canManageBookings: true,
      canManageFinance: true,
      canManageMarketing: true,
      canViewReports: true,
      canManageSettings: true,
    },
    manager: {
      canManageUsers: false,
      canManageTrips: true,
      canManageBookings: true,
      canManageFinance: true,
      canManageMarketing: true,
      canViewReports: true,
      canManageSettings: false,
    },
    accountant: {
      canManageUsers: false,
      canManageTrips: false,
      canManageBookings: false,
      canManageFinance: true,
      canManageMarketing: false,
      canViewReports: true,
      canManageSettings: false,
    },
    staff: {
      canManageUsers: false,
      canManageTrips: false,
      canManageBookings: true,
      canManageFinance: false,
      canManageMarketing: false,
      canViewReports: false,
      canManageSettings: false,
    },
  };
  return permissions[role] || permissions.staff;
};
