import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WASocket
} from '@whiskeysockets/baileys';
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

  async init() {
    if (this.sock) return;
    console.log('WhatsAppManager: Initializing...');
    await this.connectToWhatsApp();
  }

  private async connectToWhatsApp() {
    try {
      console.log('WhatsAppManager: Starting connection...');
      const { state, saveCreds } = await useMultiFileAuthState(this.authPath);
      const { version, isLatest } = await fetchLatestBaileysVersion();
      
      console.log(`WhatsAppManager: Using Baileys v${version.join('.')}, isLatest: ${isLatest}`);

      this.sock = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        logger,
        browser: ['Dar Al-Maqam', 'Chrome', '1.0.0'],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 10000,
      });

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
          console.log('WhatsAppManager: New QR Code received');
          this.qr = await QRCode.toDataURL(qr);
          this.connectionStatus = 'qr';
        }

        if (connection === 'close') {
          const error = (lastDisconnect?.error as Boom);
          const statusCode = error?.output?.statusCode;
          const errorMessage = error?.stack || error?.message || '';
          
          const isQRTimeout = errorMessage.includes('QR refs attempts ended');
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut && !isQRTimeout;
          
          console.log('WhatsAppManager: Connection closed.', {
            statusCode,
            errorMessage,
            shouldReconnect,
            isQRTimeout
          });

          this.connectionStatus = 'disconnected';
          this.qr = null;

          if (isQRTimeout) {
            console.log('WhatsAppManager: QR timeout detected. Clearing auth and waiting before retry...');
            this.clearAuth();
            // Wait 5 seconds before trying again to avoid rapid loops
            setTimeout(() => this.connectToWhatsApp(), 5000);
          } else if (shouldReconnect) {
            // For other errors that warrant a reconnect, wait a bit
            const delay = statusCode === DisconnectReason.restartRequired ? 500 : 2000;
            setTimeout(() => this.connectToWhatsApp(), delay);
          } else if (statusCode === DisconnectReason.loggedOut) {
            console.log('WhatsAppManager: Logged out. Clearing auth...');
            this.clearAuth();
          }
        } else if (connection === 'open') {
          console.log('WhatsAppManager: Connection opened successfully');
          this.connectionStatus = 'connected';
          this.qr = null;
        }
      });

      this.sock.ev.on('creds.update', saveCreds);
    } catch (error) {
      console.error('WhatsAppManager: Connection error:', error);
      this.connectionStatus = 'disconnected';
    }
  }

  private clearAuth() {
    try {
      if (fs.existsSync(this.authPath)) {
        fs.rmSync(this.authPath, { recursive: true, force: true });
      }
      this.sock = null;
      this.qr = null;
      this.connectionStatus = 'disconnected';
      this.connectToWhatsApp();
    } catch (e) {
      console.error('Error clearing auth:', e);
    }
  }

  getStatus() {
    return {
      status: this.connectionStatus,
      qr: this.qr,
      user: this.sock?.user
    };
  }

  async logout() {
    if (this.sock) {
      await this.sock.logout();
      this.clearAuth();
    }
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
