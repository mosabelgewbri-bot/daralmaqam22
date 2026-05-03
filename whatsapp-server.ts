import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import type { WASocket } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';

const logger = pino({ level: 'silent' });

class WhatsAppManager {
  private sock: WASocket | null = null;
  private qr: string | null = null;
  private connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'qr' = 'disconnected';
  private authPath = process.env.VERCEL 
    ? path.join('/tmp', 'auth_info_baileys')
    : path.join(process.cwd(), 'auth_info_baileys');

  constructor() {
    console.log(`WhatsAppManager: Using auth path: ${this.authPath}`);
    // Ensure auth directory exists
    try {
      if (!fs.existsSync(this.authPath)) {
        fs.mkdirSync(this.authPath, { recursive: true });
      }
    } catch (e) {
      console.error('WhatsAppManager: Failed to create auth directory:', e);
    }
  }

  private isConnecting = false;

  private qrRetryCount = 0;
  private maxQrRetries = 3;
  private conflictRetryCount = 0;
  private maxConflictRetries = 2;

  private lastConnectAttempt = 0;

  async init() {
    if (this.sock || this.isConnecting || this.connectionStatus === 'connected') return;
    console.log('WhatsAppManager: Initializing...');
    this.qr = null;
    this.connectionStatus = 'connecting';
    this.qrRetryCount = 0;
    this.conflictRetryCount = 0;
    await this.connectWithDelay();
  }

  private async connectWithDelay(delay: number = 0) {
    if (delay > 0) {
      await new Promise(r => setTimeout(r, delay));
    }
    await this.connectToWhatsApp();
  }

  private async connectToWhatsApp() {
    if (this.isConnecting) return;
    
    const now = Date.now();
    if (now - this.lastConnectAttempt < 5000) {
      console.log('WhatsAppManager: Connection attempt too soon, skipping...');
      return;
    }
    this.lastConnectAttempt = now;
    this.isConnecting = true;

    try {
      // Cleanup existing socket if any
      if (this.sock) {
        try {
          this.sock.ev.removeAllListeners('connection.update');
          this.sock.ev.removeAllListeners('creds.update');
          this.sock.end(undefined);
        } catch (e) {}
        this.sock = null;
      }

      console.log('WhatsAppManager: Starting connection...');
      const { state, saveCreds } = await useMultiFileAuthState(this.authPath);
      
      let version: any;
      try {
        const latest = await fetchLatestBaileysVersion();
        version = latest.version;
        console.log(`WhatsAppManager: Using Baileys v${version.join('.')}, isLatest: ${latest.isLatest}`);
      } catch (err) {
        console.warn('WhatsAppManager: Failed to fetch latest version, using default:', err);
        version = [2, 2323, 4];
      }

      this.sock = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        logger,
        browser: ['Dar Al-Maqam CRM', 'Safari', '17.0'], // Changed browser string to something more common
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 30000, // Increased keepalive
        qrTimeout: 40000,
        syncFullHistory: false,
        markOnlineOnConnect: false,
        emitOwnEvents: false,
        retryRequestDelayMs: 2000,
      });

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
          console.log('WhatsAppManager: New QR Code received (Length: ' + qr.length + ')');
          try {
            this.qr = await QRCode.toDataURL(qr);
            console.log('WhatsAppManager: QR Data URL generated successfully');
          } catch (err) {
            console.error('Failed to generate QR data URL:', err);
          }
          this.connectionStatus = 'qr';
          this.qrRetryCount = 0;
          this.conflictRetryCount = 0;
        }

        if (connection === 'close') {
          this.isConnecting = false;
          const error = (lastDisconnect?.error as Boom);
          const statusCode = error?.output?.statusCode;
          const errorMessage = error?.stack || error?.message || (error as any)?.output?.payload?.message || String(error || '');
          
          const isQRTimeout = errorMessage.includes('QR refs attempts ended') || 
                             errorMessage.includes('timed out') ||
                             statusCode === DisconnectReason.timedOut;

          const isConflict = errorMessage.includes('conflict') || 
                            statusCode === DisconnectReason.connectionReplaced;

          const isRestartRequired = statusCode === DisconnectReason.restartRequired || 
                                   errorMessage.includes('restart required');

          // Broaden server termination detection
          const isServerTerminated = statusCode === DisconnectReason.connectionLost || 
                                    statusCode === DisconnectReason.connectionClosed ||
                                    errorMessage.includes('Connection Terminated by Server') ||
                                    errorMessage.includes('Stream Errored') ||
                                    errorMessage.includes('Connection Lost') ||
                                    errorMessage.includes('Connection Closed');

          const shouldReconnect = statusCode !== DisconnectReason.loggedOut && !isQRTimeout && !isConflict;
          
          console.log('WhatsAppManager: Connection closed.', {
            statusCode,
            errorMessage: errorMessage.substring(0, 150),
            shouldReconnect
          });

          this.connectionStatus = 'disconnected';
          this.qr = null;

          if (isQRTimeout) {
            this.qrRetryCount++;
            if (this.qrRetryCount >= this.maxQrRetries) {
              this.clearAuth();
            }
            setTimeout(() => this.connectToWhatsApp(), 5000);
          } else if (isConflict) {
            this.conflictRetryCount++;
            if (this.conflictRetryCount >= this.maxConflictRetries) {
              this.clearAuth();
              setTimeout(() => this.connectToWhatsApp(), 10000);
            } else {
              setTimeout(() => this.connectToWhatsApp(), 30000);
            }
          } else if (isRestartRequired || isServerTerminated) {
            const delay = isServerTerminated ? 10000 : 5000;
            console.log(`WhatsAppManager: Reconnecting in ${delay/1000}s...`);
            setTimeout(() => this.connectToWhatsApp(), delay);
          } else if (shouldReconnect) {
            setTimeout(() => this.connectToWhatsApp(), 10000);
          } else if (statusCode === DisconnectReason.loggedOut || statusCode === DisconnectReason.badSession) {
            this.clearAuth();
          }
        } else if (connection === 'open') {
          this.isConnecting = false;
          this.qrRetryCount = 0;
          this.conflictRetryCount = 0;
          console.log('WhatsAppManager: Connection opened successfully');
          this.connectionStatus = 'connected';
          this.qr = null;
        }
      });

      this.sock.ev.on('creds.update', saveCreds);
    } catch (error) {
      this.isConnecting = false;
      console.error('WhatsAppManager: Connection error:', error);
      this.connectionStatus = 'disconnected';
    }
  }

  private clearAuth() {
    try {
      console.log('WhatsAppManager: Clearing authentication data...');
      if (this.sock) {
        try {
          this.sock.ev.removeAllListeners('connection.update');
          this.sock.ev.removeAllListeners('creds.update');
          this.sock.end(undefined);
        } catch (e) {}
      }
      
      if (fs.existsSync(this.authPath)) {
        fs.rmSync(this.authPath, { recursive: true, force: true });
      }
      
      this.sock = null;
      this.qr = null;
      this.connectionStatus = 'disconnected';
      this.isConnecting = false;
    } catch (e) {
      console.error('WhatsAppManager: Error clearing auth:', e);
    }
  }

  getStatus() {
    if (process.env.VERCEL) {
      return {
        status: 'unsupported',
        message: 'تشغيل واتساب محلي غير مدعوم على Vercel بسبب طبيعة الخوادم السحابية المؤقتة. يرجى استخدام Whapi أو UltraMsg.',
        qr: null,
        user: null
      };
    }
    
    // Auto-init if disconnected and not busy
    if (this.connectionStatus === 'disconnected' && !this.isConnecting) {
      console.log('WhatsAppManager: Status requested while disconnected, triggering init...');
      this.init().catch(err => console.error('WhatsAppManager: Auto-init failed:', err));
    }

    return {
      status: this.connectionStatus,
      qr: this.qr,
      user: this.sock?.user,
      isConnecting: this.isConnecting
    };
  }

  async logout() {
    console.log('WhatsAppManager: Manual logout requested...');
    if (this.sock) {
      try {
        // Only attempt logout if socket is likely open
        if (this.connectionStatus === 'connected') {
          await this.sock.logout();
        } else {
          this.sock.end(undefined);
        }
      } catch (e) {
        console.warn('WhatsAppManager: Logout error (safe to ignore):', e instanceof Error ? e.message : String(e));
      }
    }
    this.clearAuth();
    // After manual logout/reset, start fresh to show new QR
    setTimeout(() => this.connectToWhatsApp(), 1000);
  }

  async verifyNumber(phone: string) {
    if (this.connectionStatus !== 'connected' || !this.sock) {
      throw new Error('WhatsApp not connected');
    }

    // Clean phone number
    let cleanPhone = phone.replace(/\D/g, '');
    
    // Normalize Libyan numbers
    if (cleanPhone.startsWith('09')) {
      cleanPhone = '218' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('9') && cleanPhone.length === 9) {
      cleanPhone = '218' + cleanPhone;
    } else if (cleanPhone.startsWith('00218')) {
      cleanPhone = cleanPhone.substring(2);
    } else if (!cleanPhone.startsWith('218') && cleanPhone.length === 9) {
      // Handle cases where it might be just the number without prefix if it's 9 digits
      // but usually Libyan numbers are 09X... (10 digits) or 9X... (9 digits)
      cleanPhone = '218' + cleanPhone;
    }

    let jid = cleanPhone;
    if (!jid.includes('@s.whatsapp.net')) {
      jid = `${cleanPhone}@s.whatsapp.net`;
    }

    try {
      // Add a small mandatory delay to avoid flooding WhatsApp servers
      await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
      
      const [result] = await this.sock.onWhatsApp(jid);
      return result || null;
    } catch (e) {
      console.error('Error verifying number:', e);
      throw e;
    }
  }

  async sendMessage(phone: string, message: string) {
    if (this.connectionStatus !== 'connected' || !this.sock) {
      throw new Error('WhatsApp not connected');
    }

    let cleanPhone = phone.replace(/\D/g, '');
    
    // Normalize Libyan numbers
    if (cleanPhone.startsWith('09')) {
      cleanPhone = '218' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('9') && cleanPhone.length === 9) {
      cleanPhone = '218' + cleanPhone;
    } else if (cleanPhone.startsWith('00218')) {
      cleanPhone = cleanPhone.substring(2);
    }

    let jid = cleanPhone;
    if (!jid.includes('@s.whatsapp.net')) {
      jid = `${cleanPhone}@s.whatsapp.net`;
    }

    try {
      // Add a mandatory delay before sending messages to avoid bans
      await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));
      
      await this.sock.sendMessage(jid, { text: message });
      return { success: true };
    } catch (e) {
      console.error('Error sending message:', e);
      throw e;
    }
  }
}

export const whatsappManager = new WhatsAppManager();
