import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, 
  Search, 
  MessageSquare, 
  Send, 
  Filter, 
  Calendar, 
  Phone, 
  Mail,
  Trash2,
  CheckCircle2,
  Megaphone,
  ChevronRight,
  ChevronLeft,
  UserPlus,
  PlusCircle,
  Download,
  Image as ImageIcon,
  X,
  Copy,
  Globe,
  Edit2,
  RefreshCw,
  Upload,
  Smartphone,
  AlertCircle,
  Plus,
  Zap,
  Settings as SettingsIcon,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { api } from '../services/api';
import { User, Customer, UmrahOffer } from '../types';
import { clsx } from 'clsx';
import { sendWhatsAppMessage } from '../utils/whatsapp';

import { translateOffer } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';

import { resizeImage } from '../utils/image';

interface MarketingModuleProps {
  user: User;
}

export default function MarketingModule({ user }: MarketingModuleProps) {
  const { t, language } = useLanguage();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [offers, setOffers] = useState<UmrahOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<UmrahOffer | null>(null);
  const [showOfferSelector, setShowOfferSelector] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0, currentName: '', currentPhone: '' });
  const [showBulkSender, setShowBulkSender] = useState(false);
  const [sendingQueue, setSendingQueue] = useState<Customer[]>([]);
  const [currentSendIndex, setCurrentSendIndex] = useState(0);
  const [lastSentMessage, setLastSentMessage] = useState('');

  const [showBulkVerifier, setShowBulkVerifier] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [whatsappApiKey, setWhatsappApiKey] = useState(localStorage.getItem('whatsapp_api_key') || '');
  const [whatsappService, setWhatsappService] = useState(localStorage.getItem('whatsapp_service') || 'whapi');
  const [whatsappInstanceId, setWhatsappInstanceId] = useState(localStorage.getItem('whatsapp_instance_id') || '');
  const [whatsappApiUrl, setWhatsappApiUrl] = useState(localStorage.getItem('whatsapp_api_url') || (whatsappService === 'whapi' ? 'https://gate.whapi.cloud' : 'https://api.ultramsg.com'));
  const [showToken, setShowToken] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [verificationStats, setVerificationStats] = useState({ valid: 0, invalid: 0, total: 0, current: 0 });
  const [customMessage, setCustomMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isCopyingNumbers, setIsCopyingNumbers] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [generateCount, setGenerateCount] = useState(20000);
  const [isGeneratingAndVerifying, setIsGeneratingAndVerifying] = useState(false);
  const stopGeneratingRef = useRef(false);
  const [isImporting, setIsImporting] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ message: string, onConfirm: () => void } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    fetchData();
  }, []);

  const [isSyncing, setIsSyncing] = useState(false);
  const [showVerificationWizard, setShowVerificationWizard] = useState(false);
  const [verificationIndex, setVerificationIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToast({ message, type });
  };

  const fetchWhatsApp = async (url: string, options: any = {}, retries = 2) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Prepare body - if it's already an object, don't parse it
        let parsedBody = undefined;
        if (options.body) {
          if (typeof options.body === 'string') {
            try {
              parsedBody = JSON.parse(options.body);
            } catch (e) {
              console.warn('Failed to parse body as JSON, sending as is:', options.body);
              parsedBody = options.body;
            }
          } else {
            parsedBody = options.body;
          }
        }

        const response = await fetch('/api/whatsapp/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url,
            method: options.method || 'GET',
            headers: options.headers || {},
            body: parsedBody
          }),
          signal: options.signal
        });

        // If it's a 5xx error or network failure, we might want to retry
        if (!response.ok && response.status >= 500 && attempt < retries) {
          console.warn(`fetchWhatsApp attempt ${attempt + 1} failed with status ${response.status}, retrying...`);
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }

        return response;
      } catch (e: any) {
        if (e.name === 'AbortError') {
          console.warn('fetchWhatsApp aborted:', url);
          if (!e.message || e.message.includes('aborted without reason')) {
            e.message = 'The operation was aborted (timeout)';
          }
          throw e; // Don't retry on abort
        }
        
        if (attempt < retries) {
          console.warn(`fetchWhatsApp attempt ${attempt + 1} failed: ${e.message}, retrying...`);
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        
        console.error('fetchWhatsApp error after retries:', e);
        throw e;
      }
    }
    throw new Error('Failed to fetch after multiple attempts');
  };

  const handleVerificationDelete = async () => {
    const currentId = selectedCustomers[verificationIndex];
    if (!currentId || isProcessing) return;

    try {
      setIsProcessing(true);
      await api.deleteCustomer(currentId);
      
      // Update customers list
      setCustomers(prev => prev.filter(c => c.id !== currentId));
      
      // Update selection list and index together using functional updates
      setSelectedCustomers(prevSelected => {
        const newSelected = prevSelected.filter(id => id !== currentId);
        
        if (newSelected.length === 0) {
          setShowVerificationWizard(false);
          setVerificationIndex(0);
          showToast('تم الانتهاء من فحص القائمة المختارة', 'success');
          return [];
        }

        // Calculate next index before updating state
        setVerificationIndex(prevIndex => {
          const nextIndex = prevIndex >= newSelected.length ? newSelected.length - 1 : prevIndex;
          return nextIndex;
        });

        return newSelected;
      });
    } catch (error) {
      console.error('Delete failed:', error);
      showToast('حدث خطأ أثناء الحذف', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerificationSkip = () => {
    if (isProcessing) return;
    if (verificationIndex < selectedCustomers.length - 1) {
      setVerificationIndex(prev => prev + 1);
    } else {
      setShowVerificationWizard(false);
      setVerificationIndex(0);
      showToast('تم الانتهاء من فحص القائمة المختارة', 'success');
    }
  };

  const handleVerificationPrev = () => {
    if (isProcessing) return;
    if (verificationIndex > 0) {
      setVerificationIndex(prev => prev - 1);
    }
  };

  const handleVerificationValid = async () => {
    const currentId = selectedCustomers[verificationIndex];
    const customer = customers.find(c => c.id === currentId);
    if (!customer || isProcessing) return;

    try {
      setIsProcessing(true);
      const updated = { ...customer, hasWhatsApp: true };
      await api.saveCustomer(updated);
      setCustomers(prev => prev.map(c => c.id === currentId ? updated : c));
      
      // Move to next automatically after marking as valid
      if (verificationIndex < selectedCustomers.length - 1) {
        setVerificationIndex(prev => prev + 1);
      } else {
        setShowVerificationWizard(false);
        setVerificationIndex(0);
        showToast('تم الانتهاء من فحص القائمة المختارة', 'success');
      }
    } catch (error) {
      console.error('Update failed:', error);
      showToast('حدث خطأ أثناء التحديث', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const currentVerificationCustomer = useMemo(() => {
    if (!showVerificationWizard || !selectedCustomers[verificationIndex]) return null;
    return customers.find(c => c.id === selectedCustomers[verificationIndex]);
  }, [showVerificationWizard, selectedCustomers, verificationIndex, customers]);

  const handleBulkVerify = async () => {
    if (selectedCustomers.length === 0) return;
    
    setIsVerifying(true);
    stopGeneratingRef.current = false;
    setVerificationStats({ valid: 0, invalid: 0, total: selectedCustomers.length, current: 0 });
    
    const libyanPrefixes = ['091', '092', '094', '095', '093', '096', '91', '92', '94', '95', '93', '96', '21891', '21892', '21894', '21895', '21893', '21896'];
    const validIds: string[] = [];
    const invalidIds: string[] = [];

    const trimmedToken = whatsappApiKey.trim();
    const trimmedInstance = whatsappInstanceId.trim();
    let baseUrl = (whatsappApiUrl || (whatsappService === 'whapi' ? 'https://gate.whapi.cloud' : 'https://api.ultramsg.com')).replace(/\/+$/, '');
    
    if (whatsappService === 'whapi' && trimmedToken) {
      const batchSize = 50;
      for (let i = 0; i < selectedCustomers.length; i += batchSize) {
        const batchIds = selectedCustomers.slice(i, i + batchSize);
        const batchCustomers = batchIds.map(id => customers.find(c => c.id === id)).filter(Boolean);
        
        setVerificationStats(prev => ({ ...prev, current: i + batchIds.length }));

        const formattedBatch = batchCustomers.map(c => {
          let clean = c!.phone.replace(/\D/g, '');
          if (clean.startsWith('00')) clean = clean.substring(2);
          if (clean.startsWith('0')) return '218' + clean.substring(1);
          if (!clean.startsWith('218')) return '218' + clean;
          return clean;
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort('timeout'), 30000);

        try {
          const tryEndpoints = [`${baseUrl}/contacts`, `${baseUrl}/v1/contacts`];
          let response = null;

          for (const url of tryEndpoints) {
            try {
              response = await fetchWhatsApp(url, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${trimmedToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ contacts: formattedBatch, force_check: true }),
                signal: controller.signal
              });
              
              if (response.status === 402) {
                showToast('خطأ 402: يرجى التحقق من رصيد أو اشتراك Whapi.Cloud الخاص بك.', 'error');
                stopGeneratingRef.current = true;
                break;
              }

              if (response.ok || response.status !== 404) break;
            } catch (e) { console.warn(e); }
          }

          if (stopGeneratingRef.current) break;

          if (response && response.ok) {
            const data = await response.json();
            const results = Array.isArray(data) ? data : (data.contacts || []);
            
            results.forEach((res: any, idx: number) => {
              const customer = batchCustomers[idx];
              if (!customer) return;

              const isValid = res.status === 'valid' || res.valid === true || !!res.wa_id;
              if (isValid) {
                validIds.push(customer.id);
                setVerificationStats(prev => ({ ...prev, valid: prev.valid + 1 }));
              } else {
                invalidIds.push(customer.id);
                setVerificationStats(prev => ({ ...prev, invalid: prev.invalid + 1 }));
              }
            });
          } else {
            batchIds.forEach(id => invalidIds.push(id));
            setVerificationStats(prev => ({ ...prev, invalid: prev.invalid + batchIds.length }));
          }
        } catch (error) {
          console.error('Batch verification error:', error);
          batchIds.forEach(id => invalidIds.push(id));
          setVerificationStats(prev => ({ ...prev, invalid: prev.invalid + batchIds.length }));
        } finally {
          clearTimeout(timeoutId);
        }

        await new Promise(r => setTimeout(r, 500));
      }
    } else {
      for (let i = 0; i < selectedCustomers.length; i++) {
        const id = selectedCustomers[i];
        const customer = customers.find(c => c.id === id);
        if (!customer) continue;

        setVerificationStats(prev => ({ ...prev, current: i + 1 }));

        let cleanPhone = customer.phone.replace(/\D/g, '');
        if (cleanPhone.startsWith('00')) cleanPhone = cleanPhone.substring(2);
        
        const isValidPrefix = libyanPrefixes.some(p => cleanPhone.startsWith(p));
        const isValidLength = (cleanPhone.length >= 9 && cleanPhone.length <= 14);
        
        let isDeepValid = !trimmedToken;

        if (trimmedToken && isValidPrefix && isValidLength) {
          try {
            let formatted = cleanPhone;
            if (cleanPhone.startsWith('0')) formatted = '218' + cleanPhone.substring(1);
            else if (!cleanPhone.startsWith('218')) formatted = '218' + cleanPhone;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort('timeout'), 20000);
            
            try {
              const url = `${baseUrl}/${trimmedInstance}/contacts/check?token=${trimmedToken}&chatId=${formatted}@c.us&nocache=1`;
              const response = await fetchWhatsApp(url, {
                signal: controller.signal
              });
              
              if (response.status === 402) {
                showToast('خطأ 402: يرجى التحقق من رصيد أو اشتراك Whapi.Cloud الخاص بك.', 'error');
                stopGeneratingRef.current = true;
                break;
              }

              if (response && response.ok) {
                const data = await response.json();
                isDeepValid = data.status === 'valid' || data.exists === true;
              }
            } finally {
              clearTimeout(timeoutId);
            }
          } catch (e) {
            isDeepValid = false;
          }
        } else {
          isDeepValid = isValidPrefix && isValidLength;
        }

        if (stopGeneratingRef.current) break;

        if (isDeepValid) {
          validIds.push(id);
          setVerificationStats(prev => ({ ...prev, valid: prev.valid + 1 }));
        } else {
          invalidIds.push(id);
          setVerificationStats(prev => ({ ...prev, invalid: prev.invalid + 1 }));
        }

        await new Promise(resolve => setTimeout(resolve, trimmedToken ? 300 : 50));
      }
    }

    // Update customers in bulk
    try {
      if (validIds.length > 0) {
        const customersToUpdate = customers
          .filter(c => validIds.includes(c.id))
          .map(c => ({ ...c, hasWhatsApp: true }));
        
        await api.bulkSaveCustomers(customersToUpdate);
        
        setCustomers(prev => prev.map(c => 
          validIds.includes(c.id) ? { ...c, hasWhatsApp: true } : c
        ));
      }

      if (invalidIds.length > 0) {
        setConfirmModal({
          message: `تم العثور على ${invalidIds.length} رقم غير صالح. هل تريد حذفهم الآن؟`,
          onConfirm: async () => {
            try {
              await api.bulkDeleteCustomers(invalidIds);
              setCustomers(prev => prev.filter(c => !invalidIds.includes(c.id)));
              setSelectedCustomers(prev => prev.filter(id => !invalidIds.includes(id)));
              showToast('تم حذف الأرقام غير الصالحة بنجاح', 'success');
            } catch (e) {
              showToast('فشل حذف الأرقام غير الصالحة', 'error');
            }
          }
        });
      }

      showToast(`اكتمل الفحص الذكي بنجاح. أرقام صالحة: ${validIds.length}، أرقام غير صالحة: ${invalidIds.length}`, 'success');
    } catch (error) {
      console.error('Error in bulk verification:', error);
    } finally {
      setIsVerifying(false);
      setShowBulkVerifier(false);
    }
  };

  const handleGenerateAndVerify = async () => {
    if (!whatsappApiKey) {
      showToast('يرجى إدخال مفتاح الـ API أولاً في الإعدادات.', 'error');
      setShowSettings(true);
      return;
    }

    if (whatsappService === 'ultramsg' && !whatsappInstanceId) {
      showToast('يرجى إدخال Instance ID لخدمة UltraMsg في الإعدادات.', 'error');
      setShowSettings(true);
      return;
    }

    setIsGeneratingAndVerifying(true);
    stopGeneratingRef.current = false;
    setVerificationStats({ valid: 0, invalid: 0, total: generateCount, current: 0 });

    const prefixes = ['091', '092', '094', '095', '093', '096'];
    const trimmedToken = whatsappApiKey.trim();
    const trimmedInstance = whatsappInstanceId?.trim();
    let baseUrl = (whatsappApiUrl || (whatsappService === 'whapi' ? 'https://gate.whapi.cloud' : 'https://api.ultramsg.com')).replace(/\/+$/, '');
    
    // For UltraMsg we use smaller batches because it's slower (one-by-one check)
    const batchSize = whatsappService === 'whapi' ? 100 : 20;
    const totalToGenerate = generateCount;
    const allValidCustomers: any[] = [];

    try {
      for (let i = 0; i < totalToGenerate; i += batchSize) {
        if (stopGeneratingRef.current) {
          showToast('تم إيقاف عملية التوليد والفحص بطلب منك.', 'info');
          break;
        }

        const currentBatchSize = Math.min(batchSize, totalToGenerate - i);
        const batchNumbers: string[] = [];
        
        for (let j = 0; j < currentBatchSize; j++) {
          const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
          const rest = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
          batchNumbers.push('218' + prefix.substring(1) + rest);
        }

        setVerificationStats(prev => ({ ...prev, current: i + currentBatchSize }));

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort('timeout'), 120000); // Increased to 120 seconds

        try {
          let response = null;
          let results: any[] = [];

          if (whatsappService === 'whapi') {
            const tryEndpoints = [`${baseUrl}/contacts`, `${baseUrl}/v1/contacts`];
            for (const url of tryEndpoints) {
              try {
                response = await fetchWhatsApp(url, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${trimmedToken}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ contacts: batchNumbers, force_check: true }),
                  signal: controller.signal
                });
                
                if (response.status === 402) {
                  showToast('خطأ 402: يرجى التحقق من رصيد أو اشتراك Whapi.Cloud الخاص بك.', 'error');
                  stopGeneratingRef.current = true;
                  break;
                }

                if (response.ok || response.status !== 404) break;
              } catch (e) { console.warn(e); }
            }

            if (stopGeneratingRef.current) break;

            if (response && response.ok) {
              const data = await response.json();
              results = Array.isArray(data) ? data : (data.contacts || []);
            }
          } else {
            // UltraMsg logic - process in parallel chunks
            const subBatchSize = 5;
            for (let j = 0; j < batchNumbers.length; j += subBatchSize) {
              if (stopGeneratingRef.current) break;
              const subBatch = batchNumbers.slice(j, j + subBatchSize);
              const subResults = await Promise.all(subBatch.map(async (phone) => {
                try {
                  const url = `${baseUrl}/${trimmedInstance}/contacts/check?token=${trimmedToken}&chatId=${phone}@c.us&nocache=1`;
                  const res = await fetchWhatsApp(url, { signal: controller.signal });
                  if (res.ok) {
                    const data = await res.json();
                    return { 
                      status: (data.status === 'valid' || data.exists === true) ? 'valid' : 'invalid',
                      phone 
                    };
                  }
                } catch (e) { console.warn(e); }
                return { status: 'invalid', phone };
              }));
              results.push(...subResults);
              // Small delay between sub-batches for UltraMsg
              await new Promise(r => setTimeout(r, 200));
            }
          }

          if (results.length > 0) {
            const validBatch: any[] = [];
            results.forEach((res: any, idx: number) => {
              // Strict check to ensure only numbers with WhatsApp are included
              const isValid = 
                res.status === 'valid' || 
                res.valid === true || 
                !!res.wa_id || 
                res.exists === true ||
                res.result === 'exists' ||
                res.is_whatsapp === true;

              if (isValid) {
                const phone = res.phone || batchNumbers[idx];
                validBatch.push({
                  id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
                  name: `عميل ${phone}`,
                  phone: phone,
                  hasWhatsApp: true,
                  createdAt: new Date().toISOString()
                });
                setVerificationStats(prev => ({ ...prev, valid: prev.valid + 1 }));
              } else {
                setVerificationStats(prev => ({ ...prev, invalid: prev.invalid + 1 }));
              }
            });

            if (validBatch.length > 0) {
              await api.bulkSaveCustomers(validBatch);
              // Update local state immediately so user sees valid numbers appearing
              setCustomers(prev => {
                // Avoid duplicates if any
                const existingPhones = new Set(prev.map(c => c.phone));
                const newUnique = validBatch.filter(c => !existingPhones.has(c.phone));
                return [...newUnique, ...prev];
              });
              allValidCustomers.push(...validBatch);
            }
          } else if (!stopGeneratingRef.current) {
            setVerificationStats(prev => ({ ...prev, invalid: prev.invalid + currentBatchSize }));
          }
        } catch (error) {
          console.error('Batch verification error:', error);
          setVerificationStats(prev => ({ ...prev, invalid: prev.invalid + currentBatchSize }));
        } finally {
          clearTimeout(timeoutId);
        }

        // Delay between batches to avoid rate limiting
        await new Promise(r => setTimeout(r, whatsappService === 'whapi' ? 500 : 1000));
      }

      if (allValidCustomers.length > 0) {
        showToast(`اكتملت العملية. وجدنا ${allValidCustomers.length} رقم نشط على واتساب.`, 'success');
      } else if (!stopGeneratingRef.current) {
        showToast('لم يتم العثور على أرقام نشطة في هذه المجموعة.', 'info');
      }
    } catch (error) {
      console.error('Generate and verify error:', error);
      showToast('حدث خطأ أثناء التوليد والفحص.', 'error');
    } finally {
      setIsGeneratingAndVerifying(false);
      // Don't close modal immediately so user can see final stats
    }
  };

  const fetchData = async (sync = false, forceRefresh = false) => {
    if (sync) setIsSyncing(true);
    else setIsLoading(true);
    
    try {
      if (forceRefresh) {
        localStorage.removeItem('cached_customers');
        localStorage.removeItem('cached_umrah_offers');
      }

      if (sync) {
        const custData = await api.syncCustomersFromBookings();
        setCustomers(Array.isArray(custData) ? custData : []);
        showToast('تم تحديث قائمة العملاء من الحجوزات بنجاح', 'success');
      } else {
        const [custData, offerData] = await Promise.all([
          api.getCustomers(),
          api.getUmrahOffers()
        ]);
        setCustomers(Array.isArray(custData) ? custData : []);
        setOffers(Array.isArray(offerData) ? offerData : []);
      }
      setCurrentPage(1);
    } catch (error) {
      console.error('Error fetching data:', error);
      if (sync) showToast('حدث خطأ أثناء تحديث البيانات من الحجوزات', 'error');
      // Ensure we don't have undefined state
      setCustomers(prev => Array.isArray(prev) ? prev : []);
      setOffers(prev => Array.isArray(prev) ? prev : []);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  const [filter, setFilter] = useState<'all' | 'active' | 'previous' | 'whatsapp'>('all');

  const filteredCustomers = useMemo(() => {
    return (customers || []).filter(c => {
      if (!c) return false;
      const name = String(c.name || '').toLowerCase();
      const phone = String(c.phone || '');
      const query = (searchQuery || '').toLowerCase();
      
      const matchesSearch = name.includes(query) || phone.includes(query);
      
      if (!matchesSearch) return false;
      if (filter === 'all') return true;
      if (filter === 'whatsapp') return !!c.hasWhatsApp;
      return true;
    });
  }, [customers, searchQuery, filter]);

  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCustomers, currentPage]);

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  const toggleCustomerSelection = (id: string) => {
    setSelectedCustomers(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedCustomers.length === filteredCustomers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(filteredCustomers.map(c => c.id));
    }
  };

  const handleBulkImport = async () => {
    if (!bulkInput.trim()) return;
    
    setIsImporting(true);
    try {
      const lines = bulkInput.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const newCustomers = lines.map(line => {
        // Simple parsing: name,phone or just phone
        const parts = line.split(/[,|\t]/);
        let name = '';
        let phone = '';
        
        if (parts.length >= 2) {
          name = parts[0].trim();
          phone = parts[1].trim();
        } else {
          phone = parts[0].trim();
          name = `عميل ${phone}`;
        }
        
        // Basic phone normalization for Libya
        if (phone.startsWith('9')) phone = '0' + phone;
        if (phone.startsWith('218')) phone = '0' + phone.substring(3);
        
        return { name, phone, hasWhatsApp: true };
      }).filter(c => c.phone.length >= 8); // Ensure valid phone length

      if (newCustomers.length === 0) {
        showToast('لم يتم العثور على أرقام هواتف صالحة للاستيراد', 'error');
        setIsImporting(false);
        return;
      }

      // Deduplicate by phone number locally before sending to API
      const uniqueCustomers = Array.from(
        newCustomers.reduce((map, cust) => {
          map.set(cust.phone, cust);
          return map;
        }, new Map<string, { name: string, phone: string, hasWhatsApp: boolean }>()).values()
      );

      // Bulk save using the new API method
      await api.bulkSaveCustomers(uniqueCustomers);
      
      await fetchData();
      setShowBulkImport(false);
      setBulkInput('');
      showToast(`تم استيراد ${newCustomers.length} عميل بنجاح`, 'success');
    } catch (error: any) {
      console.error('Error importing customers:', error);
      const errorMessage = error?.message || 'حدث خطأ غير متوقع';
      showToast(`حدث خطأ أثناء الاستيراد: ${errorMessage}`, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const generateSampleLibyanNumbers = () => {
    const prefixes = ['091', '092', '094', '095', '093', '096'];
    const samples = [];
    const count = Math.min(generateCount, 100000); // Increase cap to 100k
    for (let i = 0; i < count; i++) {
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const suffix = Math.floor(Math.random() * 9000000 + 1000000).toString();
      const phone = prefix + suffix;
      samples.push(`عميل ${phone},${phone}`);
    }
    setBulkInput(samples.join('\n'));
    showToast(`تم توليد ${count} رقم بنجاح`, 'success');
  };

  const handleTranslateOffer = async (offer: UmrahOffer) => {
    try {
      setIsLoading(true);
      const translated = await translateOffer(offer);
      
      const updatedOffer = {
        ...offer,
        name: translated.name,
        category: translated.category,
        rows: translated.rows,
        fixedText: translated.fixedText
      };
      
      await api.updateOffer(offer.id, updatedOffer);
      setOffers(prev => prev.map(o => o.id === offer.id ? updatedOffer : o));
      showToast(language === 'ar' ? 'تمت الترجمة بنجاح' : 'Translated successfully', 'success');
    } catch (error) {
      console.error('Translation failed:', error);
      showToast(language === 'ar' ? 'فشل في الترجمة' : 'Translation failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteOffer = async (id: string) => {
    setConfirmModal({
      message: language === 'ar' ? 'هل أنت متأكد من حذف هذا العرض؟' : 'Are you sure you want to delete this offer?',
      onConfirm: async () => {
        try {
          setIsLoading(true);
          await api.deleteOffer(id);
          setOffers(prev => prev.filter(o => o.id !== id));
          showToast(language === 'ar' ? 'تم حذف العرض بنجاح' : 'Offer deleted successfully', 'success');
        } catch (error) {
          console.error('Error deleting offer:', error);
          showToast(language === 'ar' ? 'حدث خطأ أثناء حذف العرض' : 'Error deleting offer', 'error');
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  const handleSendOffer = async () => {
    if (selectedCustomers.length === 0) return;
    if (!selectedOffer && !customMessage && !imageUrl) return;

    const selectedCustData = customers.filter(c => selectedCustomers.includes(c.id));
    
    // Filter out customers without WhatsApp
    // Also validate phone numbers
    const isValidLibyanPhone = (phone: string) => {
      const clean = phone.replace(/\D/g, '');
      return clean.length >= 9 && (clean.startsWith('9') || clean.startsWith('2189') || clean.startsWith('09'));
    };

    const validWhatsAppCustomers = selectedCustData.filter(c => c.hasWhatsApp && isValidLibyanPhone(c.phone));

    if (validWhatsAppCustomers.length === 0) {
      setShowOfferSelector(false);
      showToast('لا توجد أرقام واتساب صالحة في القائمة المختارة', 'error');
      return;
    }

    // Format offer message
    let message = customMessage ? `${customMessage}\n\n` : '';
    
    if (selectedOffer) {
      message += `*${selectedOffer.documentTitle || 'عرض عمرة جديد'}*\n\n`;
      message += `*الفئة:* ${selectedOffer.category}\n\n`;
      
      (selectedOffer.rows || []).forEach(row => {
        message += `📍 *${row.makkah} / ${row.madinah}*\n`;
        message += `🏨 ${row.offer}\n`;
        message += `🍽️ ${row.meals}\n`;
        message += `💰 ثنائي: ${row.double} | ثلاثي: ${row.triple} | رباعي: ${row.quad}\n`;
        message += `-------------------\n`;
      });

      if (selectedOffer.fixedText) {
        message += `\n${selectedOffer.fixedText}`;
      }

      // Add public link to message
      const publicLink = `${window.location.origin}/offer/${selectedOffer.id}`;
      message += `\n\n🔗 لمشاهدة العرض بتصميم احترافي وتحميله:\n${publicLink}`;

      // If the offer itself has an image URL, include it too
      if (selectedOffer.imageUrl) {
        message += `\n\n🖼️ صورة العرض:\n${selectedOffer.imageUrl}`;
      }
    }

    // Add manual image URL if provided in the modal
    if (imageUrl) {
      message += `\n\n🖼️ رابط إضافي:\n${imageUrl}`;
    }

    // Copy to clipboard once
    try {
      await navigator.clipboard.writeText(message);
    } catch (e) {
      console.error('Failed to copy to clipboard:', e);
    }

    setIsSending(true);
    setShowOfferSelector(false);
    
    setSendingQueue(validWhatsAppCustomers);
    setCurrentSendIndex(0);
    setLastSentMessage(message);
    setShowBulkSender(true);
    setSendProgress({ 
      current: 1, 
      total: validWhatsAppCustomers.length,
      currentName: validWhatsAppCustomers[0].name,
      currentPhone: validWhatsAppCustomers[0].phone
    });
  };

  const handleSendNext = () => {
    if (currentSendIndex >= sendingQueue.length) return;
    
    const customer = sendingQueue[currentSendIndex];
    sendWhatsAppMessage(customer.phone, lastSentMessage);
    
    if (currentSendIndex + 1 < sendingQueue.length) {
      const nextIndex = currentSendIndex + 1;
      setCurrentSendIndex(nextIndex);
      setSendProgress({
        current: nextIndex + 1,
        total: sendingQueue.length,
        currentName: sendingQueue[nextIndex].name,
        currentPhone: sendingQueue[nextIndex].phone
      });
    } else {
      setIsSending(false);
      setShowBulkSender(false);
      setSelectedCustomers([]);
      setSelectedOffer(null);
      showToast('تم الانتهاء من عملية الإرسال بنجاح', 'success');
    }
  };

  const renderOfferDesign = (offer: UmrahOffer) => {
    return (
      <div id="offer-design-preview" className="bg-white p-10 rounded-xl text-slate-900 font-serif relative overflow-hidden border-8 border-double border-gold/30 shadow-2xl max-w-2xl mx-auto">
        {/* Islamic Pattern Background */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
        
        <div className="relative z-10 space-y-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <h2 className="text-2xl font-bold text-gold">{offer.documentTitle || 'شركة دار المقام'}</h2>
            <div className="h-1 w-40 bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
          </div>

          <div className="space-y-2">
            <h1 className="text-5xl font-black text-slate-900">{offer.name}</h1>
            <p className="text-lg text-slate-500 font-bold">{offer.category} - رحلات 1447 هـ</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {(offer.rows || []).map((row, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col gap-3 text-right">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2 text-gold font-bold">
                    <Calendar className="w-4 h-4" />
                    <span>{row.makkah} / {row.madinah}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-400">{offer.category}</span>
                </div>
                <div className="space-y-1">
                  <p className="text-xl font-bold text-slate-800">{row.offer}</p>
                  <p className="text-sm text-slate-500 flex items-center justify-end gap-2">
                    <span>{row.meals}</span>
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="bg-white border border-slate-100 rounded-lg p-2 text-center">
                    <p className="text-[8px] text-slate-400 font-bold">ثنائي</p>
                    <p className="text-sm font-black text-gold">{row.double}</p>
                  </div>
                  <div className="bg-white border border-slate-100 rounded-lg p-2 text-center">
                    <p className="text-[8px] text-slate-400 font-bold">ثلاثي</p>
                    <p className="text-sm font-black text-gold">{row.triple}</p>
                  </div>
                  <div className="bg-white border border-slate-100 rounded-lg p-2 text-center">
                    <p className="text-[8px] text-slate-400 font-bold">رباعي</p>
                    <p className="text-sm font-black text-gold">{row.quad}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {offer.fixedText && (
            <div className="pt-6 border-t border-slate-100">
              <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">{offer.fixedText}</p>
            </div>
          )}

          <div className="pt-8 flex items-center justify-center gap-8">
            <div className="flex items-center gap-2 text-slate-400">
              <Phone className="w-4 h-4" />
              <span className="text-xs font-bold">0948470011</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Phone className="w-4 h-4" />
              <span className="text-xs font-bold">0947470010</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Bulk Sending Progress Modal */}
      <AnimatePresence>
        {showBulkSender && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 text-center"
            >
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                <Send className="w-10 h-10 text-emerald-500 animate-pulse" />
              </div>
              
              <h2 className="text-2xl font-black text-white mb-2">الإرسال التسلسلي الذكي</h2>
              <p className="text-white/40 text-sm mb-8">اضغط على الزر أدناه لفتح محادثة العميل التالي</p>

              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-white/40">التقدم الحالي</span>
                  <span className="text-emerald-500">{sendProgress.current} / {sendProgress.total}</span>
                </div>
                
                <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    className="h-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${(sendProgress.current / sendProgress.total) * 100}%` }}
                  />
                </div>

                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-[10px] text-white/20 font-bold mb-1">العميل الحالي:</p>
                  <p className="text-sm font-bold text-white">{sendProgress.currentName || 'جاري التحميل...'}</p>
                  <p className="text-xs text-white/40 mt-1">{sendProgress.currentPhone}</p>
                </div>
              </div>

              <button
                onClick={handleSendNext}
                className="mt-8 w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-lg transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3"
              >
                <Send className="w-6 h-6" />
                إرسال للعميل التالي
              </button>

              <button
                onClick={() => {
                  setConfirmModal({
                    message: 'هل أنت متأكد من إيقاف عملية الإرسال؟',
                    onConfirm: () => {
                      setShowBulkSender(false);
                      setIsSending(false);
                    }
                  });
                }}
                className="mt-4 w-full py-3 bg-white/5 hover:bg-white/10 text-white/40 rounded-2xl font-bold text-xs transition-all"
              >
                إيقاف العملية
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center border border-gold/20">
                    <SettingsIcon className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">إعدادات التسويق</h2>
                    <p className="text-white/40 text-[10px] font-medium uppercase tracking-widest">تكوين أدوات الربط والذكاء</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="p-2 rounded-xl bg-white/5 text-white/40 hover:bg-white/10 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-white/60 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gold" />
                    خدمة الربط المختارة
                  </label>
                  <select 
                    value={whatsappService}
                    onChange={(e) => {
                      setWhatsappService(e.target.value);
                      localStorage.setItem('whatsapp_service', e.target.value);
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white text-sm focus:border-gold/50 transition-all outline-none"
                  >
                    <option value="whapi">Whapi.cloud (احترافي)</option>
                    <option value="ultramsg">UltraMsg (سهل)</option>
                  </select>
                </div>

                {whatsappService === 'ultramsg' && (
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-white/60 flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-gold" />
                      معرف المثيل (Instance ID)
                    </label>
                    <input 
                      type="text"
                      value={whatsappInstanceId}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        setWhatsappInstanceId(val);
                        localStorage.setItem('whatsapp_instance_id', val);
                      }}
                      placeholder="مثال: instance12345"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white text-sm focus:border-gold/50 transition-all outline-none"
                    />
                  </div>
                )}

                <div className="space-y-3">
                  <label className="text-xs font-bold text-white/60 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gold" />
                    رابط الـ API (Gateway)
                  </label>
                  <input 
                    type="text"
                    value={whatsappApiUrl}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      setWhatsappApiUrl(val);
                      localStorage.setItem('whatsapp_api_url', val);
                    }}
                    placeholder={whatsappService === 'whapi' ? "https://gate.whapi.cloud" : "https://api.ultramsg.com"}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white text-sm focus:border-gold/50 transition-all outline-none"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-white/60 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-gold" />
                    مفتاح API (Token)
                  </label>
                  <div className="relative">
                    <input 
                      type={showToken ? "text" : "password"}
                      value={whatsappApiKey}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        setWhatsappApiKey(val);
                        localStorage.setItem('whatsapp_api_key', val);
                      }}
                      placeholder="أدخل الـ Token هنا..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white text-sm focus:border-gold/50 transition-all outline-none pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-all"
                    >
                      {showToken ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[9px] text-white/20 italic">
                    * هذا المفتاح يستخدم للفحص العميق للأرقام والتأكد من وجودها على واتساب فعلياً.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-gold/5 border border-gold/10 space-y-2">
                  <div className="flex items-center gap-2 text-gold">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-[10px] font-bold">ملاحظة هامة</span>
                  </div>
                  <p className="text-[10px] text-white/40 leading-relaxed">
                    في حال عدم وجود مفتاح API، سيعتمد النظام على "الفحص الذكي" الذي يحلل صيغة الأرقام الليبية ومدى صحتها برمجياً.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    console.log('Test connection button clicked', { whatsappService, whatsappApiKey, whatsappInstanceId });
                    
                    const trimmedToken = whatsappApiKey.trim();
                    const trimmedInstance = whatsappInstanceId.trim();
                    let baseUrl = (whatsappApiUrl || (whatsappService === 'whapi' ? 'https://gate.whapi.cloud' : 'https://api.ultramsg.com')).replace(/\/+$/, '');
                    
                    if (!trimmedToken) {
                      showToast('يرجى إدخال الـ Token أولاً', 'error');
                      return;
                    }
                    if (whatsappService === 'ultramsg' && !trimmedInstance) {
                      showToast('يرجى إدخال Instance ID أولاً', 'error');
                      return;
                    }

                    setIsTestingConnection(true);
                    showToast('جاري اختبار الاتصال بالخدمة...', 'info');
                    console.log('Starting connection test for', whatsappService);
                    
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => {
                      console.log('Connection test timed out');
                      controller.abort('timeout');
                    }, 60000); // Increased to 60 seconds

                    try {
                      let response;
                      const headers: Record<string, string> = {
                        'Accept': 'application/json'
                      };

                      let fetchUrl = '';
                      if (whatsappService === 'whapi') {
                        headers['Authorization'] = `Bearer ${trimmedToken}`;
                        
                        // Try multiple endpoints in sequence until one works
                        const baseWithoutV1 = baseUrl.replace(/\/v1$/, '');
                        const testEndpoints = [
                          `${baseWithoutV1}/health`,
                          `${baseWithoutV1}/users/me`,
                          `${baseWithoutV1}/v1/health`,
                          `${baseWithoutV1}/v1/users/me`,
                          `${baseWithoutV1.replace('gate.whapi.cloud', 'api.whapi.cloud')}/health`
                        ];

                        let lastResponse = null;
                        for (const url of testEndpoints) {
                          try {
                            console.log(`Testing Whapi endpoint: ${url}`);
                            const testResponse = await fetchWhatsApp(url, {
                              headers,
                              signal: controller.signal
                            });
                            
                            if (testResponse.status === 402) {
                              showToast('خطأ 402: يرجى التحقق من رصيد أو اشتراك Whapi.Cloud الخاص بك.', 'error');
                              response = testResponse;
                              break;
                            }

                            if (testResponse.ok) {
                              response = testResponse;
                              fetchUrl = url;
                              break;
                            }
                            lastResponse = testResponse;
                          } catch (err) {
                            console.warn(`Failed to test endpoint ${url}:`, err);
                          }
                        }
                        
                        // If none succeeded, use the last response or a default 404
                        if (!response) {
                          response = lastResponse || { status: 404, ok: false, json: async () => ({}) } as any;
                        }
                      } else {
                        // UltraMsg logic
                        let finalBase = baseUrl.replace(/\/+$/, '');
                        // If the user provided a URL that already includes the instance ID like https://api.ultramsg.com/instance123
                        // we want to get just the base https://api.ultramsg.com
                        if (finalBase.includes('/instance')) {
                           const parts = finalBase.split('/');
                           // Find the part that starts with 'instance'
                           const instanceIdx = parts.findIndex(p => p.startsWith('instance'));
                           if (instanceIdx !== -1) {
                             finalBase = parts.slice(0, instanceIdx).join('/');
                           }
                        }
                        
                        fetchUrl = `${finalBase}/${trimmedInstance}/instance/status?token=${trimmedToken}`;
                        console.log('Fetching UltraMsg endpoint:', fetchUrl);
                        response = await fetchWhatsApp(fetchUrl, {
                          headers,
                          signal: controller.signal
                        });
                      }
                      
                      clearTimeout(timeoutId);
                      console.log('Test connection response status:', response.status);

                      let data;
                      try {
                        data = await response.json();
                      } catch (e) {
                        data = {};
                      }
                      
                      console.log('Test connection response data:', data);

                      if (response.ok) {
                        // For UltraMsg, check if instance is actually connected
                        if (whatsappService === 'ultramsg') {
                          const status = (data.status || data.state || data.accountStatus || data.instanceStatus || data.instance_status || data || '').toString().toLowerCase();
                          const isDisconnected = status.includes('not_auth') || status.includes('disconnect') || status.includes('expired') || status.includes('standby') || status.includes('closed');
                          
                          if (isDisconnected) {
                            showToast(`⚠️ تم الاتصال بالخدمة ولكن حالة الحساب هي: ${status}. يرجى مسح الـ QR Code.`, 'warning');
                          } else {
                            // If it's not explicitly disconnected, and response was OK, it's a success
                            showToast('✅ تم الاتصال بنجاح! الخدمة تعمل والحساب متصل.', 'success');
                          }
                        } else if (whatsappService === 'whapi') {
                          // Whapi health check or users/me
                          const isOk = data.status === 'ok' || !!data.id || !!data.name;
                          if (isOk) {
                            showToast('✅ تم الاتصال بنجاح! خدمة Whapi تعمل والـ Token صحيح.', 'success');
                          } else {
                            showToast('⚠️ تم الاتصال بالخدمة ولكن الاستجابة غير متوقعة. يرجى التحقق من الإعدادات.', 'warning');
                          }
                        } else {
                          showToast('✅ تم الاتصال بنجاح!', 'success');
                        }
                      } else {
                        if (response.status === 402) {
                          showToast('❌ خطأ 402: يرجى التحقق من رصيد أو اشتراك Whapi.Cloud الخاص بك.', 'error');
                        } else if (response.status === 404) {
                          const advice = whatsappService === 'ultramsg' 
                            ? 'تأكد من صحة الـ Instance ID' 
                            : 'تأكد من الرابط. جرب إضافة /v1 في نهاية الرابط إذا استمر الخطأ.';
                          showToast(`❌ خطأ 404: المسار غير موجود. الرابط المستخدم: ${fetchUrl}. ${advice}`, 'error');
                        } else {
                          const errorMsg = data.error || data.message || data.msg || 'يرجى التأكد من الـ Token و Instance ID';
                          showToast(`❌ فشل الاتصال (خطأ ${response.status}): ${errorMsg}`, 'error');
                        }
                      }
                    } catch (e: any) {
                      clearTimeout(timeoutId);
                      console.error('Test connection exception:', e);
                      if (e.name === 'AbortError') {
                        showToast('❌ فشل الاتصال: انتهت مهلة الطلب (60 ثانية). يرجى التحقق من جودة الإنترنت أو حالة السيرفر.', 'error');
                      } else {
                        showToast(`❌ فشل الاتصال: ${e.message || 'تعذر الوصول للسيرفر'}. تأكد من اتصال الإنترنت.`, 'error');
                      }
                    } finally {
                      setIsTestingConnection(false);
                    }
                  }}
                  disabled={isTestingConnection}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 text-white/60 rounded-2xl font-bold text-[10px] transition-all border border-white/10 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isTestingConnection ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3" />}
                  اختبار الاتصال بالخدمة
                </button>

                <button
                  onClick={() => setShowSettings(false)}
                  className="w-full py-4 bg-gold text-black rounded-2xl font-bold text-sm hover:bg-gold/90 transition-all shadow-lg shadow-gold/10"
                >
                  حفظ الإعدادات
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-[2rem] p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">{confirmModal.message}</h3>
              <div className="flex gap-4">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white/60 rounded-2xl font-bold transition-all"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(null);
                  }}
                  className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-red-500/20"
                >
                  تأكيد
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={clsx(
              "fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border backdrop-blur-md",
              toast.type === 'success' ? "bg-emerald-500/90 border-emerald-500/20 text-white" :
              toast.type === 'error' ? "bg-red-500/90 border-red-500/20 text-white" :
              toast.type === 'warning' ? "bg-amber-500/90 border-amber-500/20 text-white" :
              "bg-blue-500/90 border-blue-500/20 text-white"
            )}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : 
             toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : 
             toast.type === 'warning' ? <AlertCircle className="w-5 h-5" /> :
             <Zap className="w-5 h-5" />}
            <span className="font-bold text-sm">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Verification Progress Modal */}
      <AnimatePresence>
        {showBulkVerifier && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 text-center"
            >
              <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-500/20">
                <CheckCircle2 className="w-10 h-10 text-blue-500 animate-pulse" />
              </div>
              
              <h2 className="text-2xl font-black text-white mb-2">فحص الأرقام الذكي...</h2>
              <p className="text-white/40 text-sm mb-8">يتم الآن فحص الأرقام وتصفية الوهمي منها</p>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                    <p className="text-[10px] text-emerald-500/60 font-bold mb-1">صالحة</p>
                    <p className="text-2xl font-black text-emerald-500">{verificationStats.valid}</p>
                  </div>
                  <div className="p-4 bg-red-500/5 rounded-2xl border border-red-500/10">
                    <p className="text-[10px] text-red-500/60 font-bold mb-1">غير صالحة</p>
                    <p className="text-2xl font-black text-red-500">{verificationStats.invalid}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-white/40">التقدم الإجمالي</span>
                    <span className="text-blue-500">{verificationStats.current} / {verificationStats.total}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-blue-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${(verificationStats.total > 0 ? (verificationStats.current / verificationStats.total) * 100 : 0)}%` }}
                    />
                  </div>
                </div>

                {isVerifying && (
                  <button
                    onClick={() => stopGeneratingRef.current = true}
                    className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl font-bold text-xs transition-all border border-red-500/20"
                  >
                    إيقاف العملية
                  </button>
                )}
              </div>

              {!isVerifying && (
                <button
                  onClick={() => setShowBulkVerifier(false)}
                  className="mt-8 w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-sm transition-all"
                >
                  إغلاق
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5 p-8 rounded-[2rem] border border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center border border-gold/20">
            <Megaphone className="w-8 h-8 text-gold" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white">إدارة التسويق والعملاء</h1>
            <p className="text-white/40 text-sm font-medium">تواصل مع عملائك وأرسل أحدث عروض العمرة</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={async () => {
              if (customers.length === 0) return;
              setConfirmModal({
                message: 'هل أنت متأكد من مسح جميع العملاء؟ لا يمكن التراجع عن هذه الخطوة.',
                onConfirm: async () => {
                  try {
                    setIsLoading(true);
                    await api.bulkDeleteCustomers(customers.map(c => c.id));
                    setCustomers([]);
                    localStorage.removeItem('cached_customers');
                    showToast('تم مسح جميع العملاء بنجاح', 'success');
                  } catch (error) {
                    console.error('Error clearing customers:', error);
                    showToast('حدث خطأ أثناء مسح البيانات', 'error');
                  } finally {
                    setIsLoading(false);
                  }
                }
              });
            }}
            className="p-3 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all border border-red-500/20"
            title="مسح جميع العملاء نهائياً"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button 
            onClick={() => {
              fetchData(false, true);
              showToast('تم إفراغ التخزين المؤقت وجاري تحديث البيانات...', 'info');
            }}
            className="p-3 rounded-2xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all border border-white/10"
            title="تحديث البيانات وإفراغ التخزين المؤقت"
          >
            <RefreshCw className={clsx("w-5 h-5", isLoading && "animate-spin")} />
          </button>
          <button 
            onClick={() => {
              if (selectedCustomers.length === 0) {
                showToast('يرجى اختيار أرقام لفحصها أولاً', 'error');
                return;
              }
              setShowBulkVerifier(true);
              handleBulkVerify();
            }}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all border border-emerald-500/20 rounded-2xl"
            title="فحص ذكي احترافي لجميع الأرقام المختارة"
          >
            <Filter className="w-5 h-5" />
            <span className="text-xs font-bold">فحص ذكي</span>
          </button>
          <button 
            onClick={() => setShowSettings(true)}
            className="p-3 rounded-2xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all border border-white/10"
            title="إعدادات الربط والواتساب"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
          <button 
            onClick={() => {
              if (selectedCustomers.length === 0) {
                showToast('يرجى اختيار أرقام لفحصها أولاً', 'error');
                return;
              }
              setVerificationIndex(0);
              setShowVerificationWizard(true);
            }}
            className="p-3 rounded-2xl bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-all border border-blue-500/20"
            title="بدء فحص يدوي سريع"
          >
            <CheckCircle2 className="w-5 h-5" />
          </button>
          <button 
            onClick={() => {
              const whatsappOnly = customers.filter(c => c.hasWhatsApp).map(c => c.id);
              if (whatsappOnly.length === 0) {
                showToast('لا يوجد عملاء لديهم واتساب مفعل حالياً', 'error');
                return;
              }
              setSelectedCustomers(whatsappOnly);
              setShowOfferSelector(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 transition-all font-bold shadow-lg shadow-emerald-500/20"
            title="إرسال عرض لجميع أرقام الواتساب المتاحة بضغطة واحدة"
          >
            <Zap className="w-5 h-5" />
            <span>إرسال ذكي للكل</span>
          </button>
          <button 
            onClick={() => setShowBulkImport(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-2xl hover:bg-white/20 transition-all font-bold border border-white/10"
          >
            <PlusCircle className="w-5 h-5" />
            <span>استيراد أرقام</span>
          </button>
          <button 
            onClick={async () => {
              if (selectedCustomers.length === 0) return;
              setConfirmModal({
                message: `هل أنت متأكد من حذف ${selectedCustomers.length} عميل؟`,
                onConfirm: async () => {
                  try {
                    setIsLoading(true);
                    await api.bulkDeleteCustomers(selectedCustomers);
                    setCustomers(prev => prev.filter(c => !selectedCustomers.includes(c.id)));
                    setSelectedCustomers([]);
                    showToast('تم حذف العملاء المحددين بنجاح', 'success');
                  } catch (error) {
                    console.error('Error deleting customers:', error);
                    showToast('حدث خطأ أثناء الحذف', 'error');
                  } finally {
                    setIsLoading(false);
                  }
                }
              });
            }}
            disabled={selectedCustomers.length === 0 || isLoading}
            className={clsx(
              "flex items-center gap-2 px-6 py-3 border rounded-xl text-sm font-bold transition-all",
              selectedCustomers.length > 0
                ? "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20"
                : "bg-white/5 border-white/5 text-white/20 cursor-not-allowed"
            )}
          >
            <Trash2 className="w-4 h-4" />
            <span>حذف المختارين</span>
          </button>
          <button 
            onClick={() => {
              const numbers = customers
                .filter(c => selectedCustomers.includes(c.id))
                .map(c => c.phone)
                .join('\n');
              navigator.clipboard.writeText(numbers);
              setIsCopyingNumbers(true);
              setTimeout(() => setIsCopyingNumbers(false), 2000);
            }}
            disabled={selectedCustomers.length === 0}
            className={clsx(
              "flex items-center gap-2 px-6 py-3 border rounded-xl text-sm font-bold transition-all",
              selectedCustomers.length > 0
                ? "bg-white/5 border-white/10 text-white hover:bg-white/10"
                : "bg-white/5 border-white/5 text-white/20 cursor-not-allowed"
            )}
          >
            <Download className="w-4 h-4" />
            {isCopyingNumbers ? 'تم نسخ الأرقام!' : 'نسخ قائمة الأرقام'}
          </button>
          <button 
            onClick={() => fetchData(true)}
            disabled={isSyncing}
            className={clsx(
              "flex items-center gap-2 px-6 py-3 border border-white/10 rounded-xl text-white text-sm font-bold transition-all",
              isSyncing ? "bg-white/10 opacity-50 cursor-not-allowed" : "bg-white/5 hover:bg-white/10"
            )}
          >
            <Users className={clsx("w-4 h-4", isSyncing && "animate-spin")} />
            {isSyncing ? 'جاري التحديث...' : 'تحديث من الحجوزات'}
          </button>
          <button 
            onClick={() => setShowOfferSelector(true)}
            disabled={selectedCustomers.length === 0}
            className={clsx(
              "flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all shadow-lg",
              selectedCustomers.length > 0 
                ? "bg-gold text-black hover:bg-gold/90 shadow-gold/10" 
                : "bg-white/5 text-white/20 cursor-not-allowed"
            )}
          >
            <Send className="w-4 h-4" />
            إرسال عرض للمختارين
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Search and Filters */}
        <div className="lg:col-span-3 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-gold transition-colors" />
            <input
              type="text"
              placeholder="البحث بالاسم أو رقم الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-12 pl-4 text-white placeholder:text-white/20 focus:border-gold/50 transition-all outline-none"
            />
          </div>
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/10">
            <button 
              onClick={() => setFilter('all')}
              className={clsx("px-6 py-3 rounded-xl font-bold text-sm transition-all", filter === 'all' ? "bg-gold text-black" : "text-white/40 hover:bg-white/5")}
            >الكل</button>
            <button 
              onClick={() => setFilter('whatsapp')}
              className={clsx("px-6 py-3 rounded-xl font-bold text-sm transition-all", filter === 'whatsapp' ? "bg-gold text-black" : "text-white/40 hover:bg-white/5")}
            >أرقام واتساب</button>
            <button 
              onClick={() => setFilter('active')}
              className={clsx("px-6 py-3 rounded-xl font-bold text-sm transition-all", filter === 'active' ? "bg-gold text-black" : "text-white/40 hover:bg-white/5")}
            >حجوزات نشطة</button>
            <button 
              onClick={() => setFilter('previous')}
              className={clsx("px-6 py-3 rounded-xl font-bold text-sm transition-all", filter === 'previous' ? "bg-gold text-black" : "text-white/40 hover:bg-white/5")}
            >عملاء سابقين</button>
          </div>
        </div>

        {/* Customers List */}
        <div className="lg:col-span-3 bg-white/5 rounded-[2rem] border border-white/10 overflow-hidden">
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-gold" />
              <h2 className="text-xl font-bold text-white">قائمة العملاء</h2>
              <span className="px-3 py-1 rounded-full bg-white/5 text-white/40 text-xs font-bold">
                {filteredCustomers.length} عميل
              </span>
            </div>
            <button 
              onClick={toggleSelectAll}
              className="text-xs font-bold text-gold hover:underline"
            >
              {selectedCustomers.length === filteredCustomers.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-white/[0.02] text-[10px] text-white/20 font-bold">
                  <th className="px-6 py-4 font-bold">
                    <input 
                      type="checkbox" 
                      checked={selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-white/10 bg-white/5 text-gold focus:ring-gold"
                    />
                  </th>
                  <th className="px-6 py-4 font-bold">العميل</th>
                  <th className="px-6 py-4 font-bold">رقم الهاتف</th>
                  <th className="px-6 py-4 font-bold">آخر تواصل</th>
                  <th className="px-6 py-4 font-bold">الحالة</th>
                  <th className="px-6 py-4 font-bold">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-gold/20 border-t-gold rounded-full animate-spin" />
                        <p className="text-white/40 font-bold">جاري تحميل العملاء...</p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                          <Users className="w-8 h-8 opacity-20" />
                        </div>
                        <p className="text-white/40 font-bold">لم يتم العثور على عملاء</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedCustomers.map((customer) => (
                    <tr 
                      key={customer.id} 
                      className={clsx(
                        "group hover:bg-white/[0.02] transition-colors cursor-pointer",
                        selectedCustomers.includes(customer.id) && "bg-gold/5"
                      )}
                      onClick={() => toggleCustomerSelection(customer.id)}
                    >
                      <td className="px-6 py-4">
                        <input 
                          type="checkbox" 
                          checked={selectedCustomers.includes(customer.id)}
                          onChange={() => {}} // Handled by tr onClick
                          className="rounded border-white/10 bg-white/5 text-gold focus:ring-gold"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gold font-bold border border-white/10 group-hover:border-gold/30 transition-colors">
                            {(customer.name || 'ع').charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{customer.name}</p>
                            <p className="text-[10px] text-white/40">{customer.email || 'لا يوجد بريد'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-white/60">
                          <Phone className="w-3 h-3" />
                          <span className="text-xs font-mono">{customer.phone}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const updated = { ...customer, hasWhatsApp: !customer.hasWhatsApp };
                              api.saveCustomer(updated).then(() => {
                                setCustomers(prev => prev.map(c => c.id === customer.id ? updated : c));
                              });
                            }}
                            className={clsx(
                              "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                              customer.hasWhatsApp ? "bg-emerald-500/20 text-emerald-500" : "bg-red-500/20 text-red-500"
                            )}
                            title={customer.hasWhatsApp ? "واتساب مفعل - انقر للإلغاء" : "واتساب غير مفعل - انقر للتفعيل"}
                          >
                            <MessageSquare className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-white/40">
                          <Calendar className="w-3 h-3" />
                          <span className="text-[10px]">{customer.lastContact || 'لم يتم التواصل'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
                          نشط
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              sendWhatsAppMessage(customer.phone, 'مرحباً، نود إطلاعكم على أحدث عروض العمرة من دار المقام.');
                            }}
                            className="p-2 rounded-lg bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-500 text-white/40 transition-all"
                            title="إرسال واتساب"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 hover:text-red-500 text-white/40 transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 px-6 py-4 bg-white/5 rounded-2xl border border-white/10">
              <p className="text-xs text-white/40 font-medium">
                عرض {paginatedCustomers.length} من أصل {filteredCustomers.length} عميل
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30 transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-1">
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    let pageNum = 1;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else {
                      if (currentPage <= 3) pageNum = i + 1;
                      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = currentPage - 2 + i;
                    }

                    if (pageNum <= 0 || pageNum > totalPages) return null;

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={clsx(
                          "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                          currentPage === pageNum 
                            ? "bg-gold text-black" 
                            : "bg-white/5 text-white/60 hover:bg-white/10"
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30 transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Verification Wizard Modal */}
      <AnimatePresence>
        {showVerificationWizard && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            {selectedCustomers.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-slate-900 border border-white/10 rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl p-10 text-center space-y-8"
              >
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-3xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  <MessageSquare className="w-10 h-10 text-blue-500" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-white">مساعد الفحص السريع</h2>
                <div className="flex items-center justify-center gap-4">
                  <button 
                    onClick={handleVerificationPrev}
                    disabled={verificationIndex === 0 || isProcessing}
                    className="p-2 rounded-full bg-white/5 text-white/40 hover:bg-white/10 disabled:opacity-20 transition-all"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <p className="text-white/40 font-medium">الرقم {verificationIndex + 1} من {selectedCustomers.length}</p>
                  <button 
                    onClick={handleVerificationSkip}
                    disabled={verificationIndex === selectedCustomers.length - 1 || isProcessing}
                    className="p-2 rounded-full bg-white/5 text-white/40 hover:bg-white/10 disabled:opacity-20 transition-all"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {currentVerificationCustomer ? (
                <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                  <p className="text-xl font-bold text-white mb-1">
                    {currentVerificationCustomer.name}
                  </p>
                  <p className="text-gold font-mono text-lg">
                    {currentVerificationCustomer.phone}
                  </p>
                  {currentVerificationCustomer.hasWhatsApp && (
                    <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3" />
                      مشترك في واتساب
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white/5 p-6 rounded-2xl border border-white/10 italic text-white/20">
                  جاري تحميل بيانات العميل...
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    if (currentVerificationCustomer) {
                      sendWhatsAppMessage(currentVerificationCustomer.phone, 'فحص');
                    }
                  }}
                  disabled={!currentVerificationCustomer || isProcessing}
                  className="col-span-2 py-4 bg-blue-500 text-white rounded-2xl font-bold hover:bg-blue-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  <Smartphone className="w-5 h-5" />
                  فتح في واتساب للفحص
                </button>
                
                <button
                  onClick={handleVerificationValid}
                  disabled={!currentVerificationCustomer || isProcessing}
                  className="py-4 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-all disabled:opacity-50"
                >
                  تأكيد (مشترك)
                </button>

                <button
                  onClick={handleVerificationDelete}
                  disabled={!currentVerificationCustomer || isProcessing}
                  className="py-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl font-bold hover:bg-red-500/20 transition-all disabled:opacity-50"
                >
                  حذف (غير مشترك)
                </button>
              </div>

              <div className="flex flex-col gap-4">
                <button
                  onClick={handleVerificationSkip}
                  disabled={isProcessing}
                  className="text-white/40 hover:text-white transition-colors text-sm font-bold"
                >
                  تخطي للرقم التالي
                </button>

                <button
                  onClick={() => setShowVerificationWizard(false)}
                  className="text-white/20 hover:text-white transition-colors text-xs font-bold"
                >
                  إغلاق المساعد
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="text-white/40 font-bold">جاري تحديث القائمة...</div>
          )}
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showBulkImport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gold/10 flex items-center justify-center border border-gold/20">
                    <Users className="w-6 h-6 text-gold" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">استيراد أرقام هواتف</h2>
                    <p className="text-white/40 text-xs font-medium">أضف قائمة من الأرقام دفعة واحدة</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowBulkImport(false)}
                  className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

                <div className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/40 uppercase tracking-widest px-2">العدد المطلوب توليده</label>
                      <input
                        type="number"
                        value={generateCount}
                        onChange={(e) => setGenerateCount(parseInt(e.target.value) || 0)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-gold/50 transition-all font-mono"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <button
                        onClick={generateSampleLibyanNumbers}
                        className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-gold border border-white/10 rounded-2xl font-bold text-sm transition-all"
                      >
                        توليد أرقام عشوائية
                      </button>
                      {(whatsappService === 'whapi' || whatsappService === 'ultramsg') && (
                        <button
                          onClick={handleGenerateAndVerify}
                          disabled={isGeneratingAndVerifying || !whatsappApiKey}
                          className="flex-1 py-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-2xl font-bold text-sm transition-all disabled:opacity-50"
                        >
                          {isGeneratingAndVerifying ? 'جاري الفحص...' : 'توليد وفحص تلقائي'}
                        </button>
                      )}
                    </div>
                  </div>

                  {isGeneratingAndVerifying && (
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-white/40">التقدم: {verificationStats.current} / {verificationStats.total}</span>
                        <div className="flex gap-3">
                          <span className="text-emerald-500">صالح: {verificationStats.valid}</span>
                          <span className="text-red-400">غير صالح: {verificationStats.invalid}</span>
                        </div>
                        <button
                          onClick={() => stopGeneratingRef.current = true}
                          className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all"
                        >
                          إيقاف
                        </button>
                      </div>
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-gold"
                          initial={{ width: 0 }}
                          animate={{ width: `${(verificationStats.current / (verificationStats.total || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest px-2">قائمة الأرقام (الاسم,الهاتف أو الهاتف فقط)</label>
                    <textarea
                      value={bulkInput}
                      onChange={(e) => setBulkInput(e.target.value)}
                      placeholder="مثال:&#10;محمد علي,0912345678&#10;0923456789"
                      className="w-full h-48 bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-gold/50 transition-all resize-none font-mono text-sm"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => setShowBulkImport(false)}
                      className="px-6 py-3 text-white/40 hover:text-white font-bold transition-all"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={handleBulkImport}
                      disabled={isImporting || !bulkInput.trim()}
                      className="px-8 py-3 bg-gold text-matte-dark rounded-2xl font-black hover:bg-gold/90 transition-all shadow-lg shadow-gold/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isImporting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-matte-dark/30 border-t-matte-dark rounded-full animate-spin" />
                          <span>جاري الاستيراد...</span>
                        </>
                      ) : (
                        <span>بدء الاستيراد</span>
                      )}
                    </button>
                  </div>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Offer Selector Modal */}
      <AnimatePresence>
        {showOfferSelector && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSending && setShowOfferSelector(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center border border-gold/20">
                    <Send className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">إرسال عرض ترويجي</h2>
                    <p className="text-white/40 text-[10px] font-bold">اختر العرض وخصص الرسالة</p>
                  </div>
                </div>
                {!isSending && (
                  <button 
                    onClick={() => setShowOfferSelector(false)}
                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:bg-white/10 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                {isSending ? (
                  <div className="h-full flex flex-col items-center justify-center gap-8 py-20">
                    <div className="relative w-48 h-48">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="96"
                          cy="96"
                          r="45"
                          fill="none"
                          stroke="rgba(255,255,255,0.05)"
                          strokeWidth="8"
                        />
                        <motion.circle
                          cx="96"
                          cy="96"
                          r="45"
                          fill="none"
                          stroke="#D4AF37"
                          strokeWidth="8"
                          strokeDasharray={283}
                          strokeDashoffset={sendProgress.total > 0 ? 283 - (283 * sendProgress.current) / sendProgress.total : 283}
                          className="transition-all duration-500"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-white">
                          {sendProgress.total > 0 ? Math.round((sendProgress.current / sendProgress.total) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-white mb-1">جاري إرسال العروض...</p>
                      <p className="text-white/40">تم إرسال {sendProgress.current} من أصل {sendProgress.total}</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-bold text-white/20 px-2">1. اختر العرض المراد إرساله (اختياري)</h3>
                      <div className="space-y-3">
                        <button
                          onClick={() => setSelectedOffer(null)}
                          className={clsx(
                            "w-full p-4 rounded-2xl border transition-all text-right group",
                            selectedOffer === null
                              ? "bg-gold/10 border-gold shadow-lg shadow-gold/5"
                              : "bg-white/5 border-white/10 hover:bg-white/10"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={clsx(
                              "w-8 h-8 rounded-full flex items-center justify-center border transition-all",
                              selectedOffer === null ? "bg-gold border-gold text-black" : "bg-white/5 border-white/10 text-white/20"
                            )}>
                              <X className="w-4 h-4" />
                            </div>
                            <div>
                              <h3 className="font-bold text-white group-hover:text-gold transition-colors">بدون عرض محدد</h3>
                              <p className="text-[10px] text-white/40">إرسال رسالة نصية أو صورة فقط</p>
                            </div>
                          </div>
                        </button>
                        {offers.length > 0 && offers.map((offer) => (
                            <div key={offer.id} className="relative group">
                              <button
                                onClick={() => setSelectedOffer(offer)}
                                className={clsx(
                                  "w-full p-4 rounded-2xl border transition-all text-right",
                                  selectedOffer?.id === offer.id
                                    ? "bg-gold/10 border-gold shadow-lg shadow-gold/5"
                                    : "bg-white/5 border-white/10 hover:bg-white/10"
                                )}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <h3 className="font-bold text-white group-hover:text-gold transition-colors">
                                    {offer.name}
                                  </h3>
                                  <span className="px-2 py-1 rounded-lg bg-white/10 text-white/60 text-[8px] font-bold">
                                    {offer.category}
                                  </span>
                                </div>
                                <p className="text-[10px] text-white/40 line-clamp-1">
                                  {(offer.rows || []).map(r => `${r.makkah}/${r.madinah}`).join(' - ')}
                                </p>
                              </button>
                              
                              <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTranslateOffer(offer);
                                  }}
                                  className="p-1.5 rounded-lg bg-white/10 text-white/40 hover:text-gold hover:bg-gold/20 transition-all"
                                  title={language === 'ar' ? 'ترجمة للإنجليزية' : 'Translate to Arabic'}
                                >
                                  <Globe className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteOffer(offer.id);
                                  }}
                                  className="p-1.5 rounded-lg bg-white/10 text-white/40 hover:text-red-400 hover:bg-red-400/20 transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-[10px] font-bold text-white/20 px-2">2. تخصيص الرسالة والملحقات</h3>
                      
                      <div className="space-y-4 bg-white/5 p-6 rounded-3xl border border-white/10">
                        {/* Custom Message */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-white/40 flex items-center gap-2">
                              <MessageSquare className="w-3 h-3" />
                              نص الرسالة المخصص
                            </label>
                            <button
                              onClick={() => {
                                if (!selectedOffer) return;
                                let msg = customMessage ? `${customMessage}\n\n` : '';
                                msg += `*${selectedOffer.documentTitle || 'عرض عمرة جديد'}*\n\n`;
                                msg += `*الفئة:* ${selectedOffer.category}\n\n`;
                                (selectedOffer.rows || []).forEach(row => {
                                  msg += `📍 *${row.makkah} / ${row.madinah}*\n`;
                                  msg += `🏨 ${row.offer}\n`;
                                  msg += `🍽️ ${row.meals}\n`;
                                  msg += `💰 ثنائي: ${row.double} | ثلاثي: ${row.triple} | رباعي: ${row.quad}\n`;
                                  msg += `-------------------\n`;
                                });
                                if (selectedOffer.fixedText) msg += `\n${selectedOffer.fixedText}`;
                                navigator.clipboard.writeText(msg);
                                showToast('تم نسخ نص الرسالة! يمكنك لصقه في واتساب.', 'success');
                              }}
                              className="text-[9px] text-gold hover:underline font-bold"
                            >
                              نسخ نص الرسالة
                            </button>
                          </div>
                          <textarea
                            value={customMessage}
                            onChange={(e) => setCustomMessage(e.target.value)}
                            placeholder="اكتب نص الرسالة التسويقية هنا..."
                            className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-white text-xs focus:border-gold/50 transition-colors min-h-[120px] resize-none"
                          />
                        </div>

                        {/* Image URL */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-white/40 flex items-center gap-2">
                              <ImageIcon className="w-3 h-3" />
                              رابط صورة العرض (اختياري)
                            </label>
                            <div className="relative">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  
                                  // Check file size (max 750KB to stay under Firestore 1MB limit after base64 encoding)
                                  if (file.size > 750 * 1024) {
                                    showToast('حجم الصورة كبير جداً. يرجى اختيار صورة أقل من 750 كيلوبايت لضمان نجاح الرفع.', 'error');
                                    return;
                                  }

                                  setIsUploadingImage(true);
                                  const reader = new FileReader();
                                  reader.onload = async (event) => {
                                    try {
                                      const base64 = event.target?.result as string;
                                      const imageId = await api.uploadImage(base64, file.name);
                                      const link = `${window.location.origin}/img/${imageId}`;
                                      setImageUrl(link);
                                      showToast('تم رفع الصورة وتوليد الرابط بنجاح!', 'success');
                                    } catch (error: any) {
                                      console.error('Upload failed:', error);
                                      const errorMessage = error.message || 'فشل رفع الصورة. تأكد من أن حجم الصورة أقل من 750 كيلوبايت.';
                                      showToast(errorMessage, 'error');
                                    } finally {
                                      setIsUploadingImage(false);
                                    }
                                  };
                                  reader.onerror = () => {
                                    console.error('FileReader error');
                                    setIsUploadingImage(false);
                                    showToast('حدث خطأ أثناء قراءة الملف', 'error');
                                  };
                                  reader.readAsDataURL(file);
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                disabled={isUploadingImage}
                              />
                              <button className={clsx(
                                "text-[9px] font-bold px-3 py-1 rounded-lg border transition-all",
                                isUploadingImage ? "bg-white/5 border-white/5 text-white/20" : "bg-gold/10 border-gold/20 text-gold hover:bg-gold/20"
                              )}>
                                {isUploadingImage ? 'جاري الرفع...' : 'رفع صورة وتوليد رابط'}
                              </button>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="url"
                              value={imageUrl}
                              onChange={(e) => setImageUrl(e.target.value)}
                              placeholder="https://example.com/image.jpg"
                              className="flex-1 bg-black/20 border border-white/10 rounded-2xl px-4 py-3 text-white text-xs focus:border-gold/50 transition-colors"
                            />
                            {imageUrl && (
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(imageUrl);
                                  showToast('تم نسخ الرابط!', 'success');
                                }}
                                className="px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white/60 hover:bg-white/10 transition-colors"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <p className="text-[9px] text-white/20 italic">سيظهر هذا الرابط كصورة في واتساب</p>
                        </div>
                      </div>

                      <h3 className="text-[10px] font-bold text-white/20 px-2 pt-4">3. معاينة التصميم الاحترافي</h3>
                      {selectedOffer ? (
                        <div className="space-y-4">
                          <div className="scale-[0.45] origin-top transform-gpu -mb-[380px] shadow-2xl">
                            {renderOfferDesign(selectedOffer)}
                          </div>
                          <button
                            onClick={async () => {
                              const element = document.getElementById('offer-design-preview');
                              if (element) {
                                try {
                                  const canvas = await html2canvas(element, { 
                                    scale: 3, 
                                    useCORS: true,
                                    backgroundColor: '#ffffff',
                                    onclone: (clonedDoc) => {
                                      const clonedElement = clonedDoc.getElementById('offer-design-preview');
                                      if (clonedElement) {
                                        clonedElement.style.letterSpacing = '0';
                                        clonedElement.style.wordSpacing = '0';
                                      }
                                    }
                                  });
                                  const link = document.createElement('a');
                                  link.download = `عرض_عمرة_${selectedOffer.name}.png`;
                                  link.href = canvas.toDataURL('image/png');
                                  link.click();
                                } catch (e) {
                                  console.error('Error generating image:', e);
                                  showToast('حدث خطأ أثناء إنشاء الصورة. يرجى المحاولة مرة أخرى.', 'error');
                                }
                              }
                            }}
                            className="w-full py-4 bg-gold/10 hover:bg-gold/20 border border-gold/30 rounded-2xl text-gold text-[10px] font-bold flex items-center justify-center gap-3 transition-all active:scale-95"
                          >
                            <Download className="w-4 h-4" />
                            تحميل التصميم كصورة للإرسال
                          </button>
                          <p className="text-[9px] text-white/20 text-center italic">* قم بتحميل الصورة ثم إرسالها للعملاء عبر واتساب</p>
                        </div>
                      ) : (
                        <div className="h-[400px] border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-white/20 text-[10px] text-center p-8 gap-4">
                          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                            <Megaphone className="w-6 h-6 opacity-20" />
                          </div>
                          يرجى اختيار عرض من القائمة لمشاهدة التصميم
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {!isSending && (
                <div className="p-6 bg-white/5 border-t border-white/10 flex items-center justify-between gap-4">
                  <div className="text-right">
                    <p className="text-[10px] text-white/20 font-bold mb-1">سيتم الإرسال إلى</p>
                    <p className="text-sm font-bold text-white">{selectedCustomers.length} عميل مختار</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowOfferSelector(false)}
                      className="px-6 py-3 rounded-xl text-white/60 hover:bg-white/10 transition-colors font-bold text-xs"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={handleSendOffer}
                      disabled={!selectedOffer && !customMessage && !imageUrl}
                      className={clsx(
                        "flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all shadow-lg",
                        (selectedOffer || customMessage || imageUrl)
                          ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/10"
                          : "bg-white/5 text-white/20 cursor-not-allowed"
                      )}
                    >
                      <Send className="w-5 h-5" />
                      بدء الإرسال (نص)
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-[2rem] p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">{confirmModal.message}</h3>
              <div className="flex gap-4">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white/60 rounded-2xl font-bold transition-all"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(null);
                  }}
                  className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-red-500/20"
                >
                  تأكيد
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={clsx(
              "fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border backdrop-blur-md",
              toast.type === 'success' ? "bg-emerald-500/90 border-emerald-500/20 text-white" :
              toast.type === 'error' ? "bg-red-500/90 border-red-500/20 text-white" :
              toast.type === 'warning' ? "bg-amber-500/90 border-amber-500/20 text-white" :
              "bg-blue-500/90 border-blue-500/20 text-white"
            )}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : 
             toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : 
             toast.type === 'warning' ? <AlertCircle className="w-5 h-5" /> :
             <Zap className="w-5 h-5" />}
            <span className="font-bold text-sm">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
