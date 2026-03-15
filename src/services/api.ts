import { Trip, Booking, RolePermissions, User } from '../types';

const API_URL = '/api';

async function handleResponse(response: Response) {
  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const error = await response.json();
      errorMessage = error.error || errorMessage;
    } catch (e) {
      try {
        const text = await response.text();
        if (text && text.length < 100) errorMessage = text;
      } catch (e2) {}
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

export const api = {
  // Auth
  async login(username: string, password: string): Promise<any> {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return handleResponse(response);
  },

  // Trips
  async getTrips(): Promise<Trip[]> {
    const response = await fetch(`${API_URL}/trips`);
    return handleResponse(response);
  },
  async saveTrip(trip: Trip): Promise<void> {
    const response = await fetch(`${API_URL}/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trip),
    });
    return handleResponse(response);
  },
  async deleteTrip(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/trips/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },

  // Bookings
  async getBookings(): Promise<Booking[]> {
    const response = await fetch(`${API_URL}/bookings`);
    return handleResponse(response);
  },
  async saveBooking(booking: Booking): Promise<void> {
    const response = await fetch(`${API_URL}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(booking),
    });
    return handleResponse(response);
  },
  async deleteBooking(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/bookings/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },

  // Permissions
  async getPermissions(): Promise<RolePermissions[]> {
    const response = await fetch(`${API_URL}/permissions`);
    return handleResponse(response);
  },
  async savePermission(permission: RolePermissions): Promise<void> {
    const response = await fetch(`${API_URL}/permissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(permission),
    });
    return handleResponse(response);
  },

  // Users
  async getUsers(): Promise<User[]> {
    const response = await fetch(`${API_URL}/users`);
    return handleResponse(response);
  },
  async saveUser(user: Partial<User> & { password?: string }): Promise<void> {
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    return handleResponse(response);
  },
  async deleteUser(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },

  // Settings
  async getSettings(): Promise<Record<string, string>> {
    const response = await fetch(`${API_URL}/settings`);
    return handleResponse(response);
  },
  async saveSettings(settings: Record<string, string>): Promise<void> {
    const response = await fetch(`${API_URL}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return handleResponse(response);
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const response = await fetch(`${API_URL}/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, currentPassword, newPassword }),
    });
    return handleResponse(response);
  },

  async getDbStats(): Promise<any> {
    const response = await fetch(`${API_URL}/db-stats`);
    return handleResponse(response);
  },

  async logAction(userId: string, action: string, details?: string): Promise<void> {
    // Optional: implement server-side logging if needed
    console.log('Action logged:', { userId, action, details });
  }
};
