import { Trip, Booking, RolePermissions, User } from '../types';

const API_BASE = '/api';

export const api = {
  // Trips
  async getTrips(): Promise<Trip[]> {
    const res = await fetch(`${API_BASE}/trips`);
    return res.json();
  },
  async saveTrip(trip: Trip): Promise<void> {
    const res = await fetch(`${API_BASE}/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trip),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to save trip');
    }
  },
  async deleteTrip(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/trips/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to delete trip');
    }
  },

  // Bookings
  async getBookings(): Promise<Booking[]> {
    const res = await fetch(`${API_BASE}/bookings`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to fetch bookings');
    }
    return res.json();
  },
  async saveBooking(booking: Booking): Promise<void> {
    const res = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(booking),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to save booking');
    }
  },
  async deleteBooking(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/bookings/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to delete booking');
    }
  },

  // Permissions
  async getPermissions(): Promise<RolePermissions[]> {
    const res = await fetch(`${API_BASE}/permissions`);
    return res.json();
  },
  async savePermission(permission: RolePermissions): Promise<void> {
    const res = await fetch(`${API_BASE}/permissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(permission),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to save permission');
    }
  },
  // Users
  async getUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/users`);
    return res.json();
  },
  async saveUser(user: Partial<User> & { password?: string }): Promise<void> {
    await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
  },
  async deleteUser(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to delete user');
    }
  },
  // Settings
  async getSettings(): Promise<Record<string, string>> {
    const res = await fetch(`${API_BASE}/settings`);
    return res.json();
  },
  async saveSettings(settings: Record<string, string>): Promise<void> {
    await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
  },
  async getDbStats(): Promise<any> {
    const res = await fetch(`${API_BASE}/db-stats`);
    return res.json();
  },
  async restoreDb(file: File): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/db-upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to restore database');
    }
  }
};
