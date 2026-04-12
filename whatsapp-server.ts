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
  private authPath = path.join(process.cwd(), 'auth_info_baileys');

  constructor() {
    // Ensure auth directory exists
    if (!fs.existsSync(this.authPath)) {
      fs.mkdirSync(this.authPath, { recursive: true });
    }
  }

  async init() {
    if (this.sock) return;
    await this.connectToWhatsApp();
  }

  private async connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(this.authPath);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    
    console.log(`Using Baileys v${version.join('.')}, isLatest: ${isLatest}`);

    this.sock = makeWASocket({
      version,
      printQRInTerminal: true,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      logger,
      browser: ['Dar Al-Maqam', 'Chrome', '1.0.0']
    });

    this.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        this.qr = await QRCode.toDataURL(qr);
        this.connectionStatus = 'qr';
        console.log('New QR Code generated');
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log('Connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
        this.connectionStatus = 'disconnected';
        this.qr = null;
        if (shouldReconnect) {
          this.connectToWhatsApp();
        } else {
          // Logged out, clear auth
          this.clearAuth();
        }
      } else if (connection === 'open') {
        console.log('WhatsApp connection opened');
        this.connectionStatus = 'connected';
        this.qr = null;
      }
    });

    this.sock.ev.on('creds.update', saveCreds);
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
      await this.sock.sendMessage(jid, { text: message });
      return { success: true };
    } catch (e) {
      console.error('Error sending message:', e);
      throw e;
    }
  }
}

export const whatsappManager = new WhatsAppManager();
