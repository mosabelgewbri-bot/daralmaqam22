import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Phone, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Download, 
  RefreshCw, 
  Search,
  MessageSquare,
  ShieldCheck,
  Zap,
  Settings as SettingsIcon,
  AlertCircle,
  X
} from 'lucide-react';
import { api } from '../services/api';

interface GeneratedNumber {
  number: string;
  status: 'pending' | 'checking' | 'exists' | 'not_exists' | 'error';
}

export const WhatsAppTools: React.FC = () => {
  const [prefix, setPrefix] = useState('21891');
  const [startRange, setStartRange] = useState('0000000');
  const [count, setCount] = useState(100);
  const [generationMode, setGenerationMode] = useState<'range' | 'random'>('range');
  const [generatedNumbers, setGeneratedNumbers] = useState<GeneratedNumber[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'exists' | 'not_exists'>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [whatsappApiKey, setWhatsappApiKey] = useState(localStorage.getItem('whatsapp_api_key') || '');
  const [whatsappService, setWhatsappService] = useState(localStorage.getItem('whatsapp_service') || 'whapi');
  const [whatsappInstanceId, setWhatsappInstanceId] = useState(localStorage.getItem('whatsapp_instance_id') || '');
  const [whatsappApiUrl, setWhatsappApiUrl] = useState(localStorage.getItem('whatsapp_api_url') || (whatsappService === 'whapi' ? 'https://gate.whapi.cloud' : 'https://api.ultramsg.com'));
  const [useSimulation, setUseSimulation] = useState(localStorage.getItem('use_simulation') === 'true');
  const stopProcessingRef = useRef(false);

  const fetchWhatsApp = async (url: string, options: any = {}, retries = 2) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        let parsedBody = undefined;
        if (options.body) {
          if (typeof options.body === 'string') {
            try {
              parsedBody = JSON.parse(options.body);
            } catch (e) {
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

        if (!response.ok && response.status >= 500 && attempt < retries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }

        return response;
      } catch (e: any) {
        if (e.name === 'AbortError') throw e;
        if (attempt === retries) throw e;
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
    throw new Error('Failed to fetch after retries');
  };

  const saveSettings = () => {
    localStorage.setItem('whatsapp_api_key', whatsappApiKey);
    localStorage.setItem('whatsapp_service', whatsappService);
    localStorage.setItem('whatsapp_instance_id', whatsappInstanceId);
    localStorage.setItem('whatsapp_api_url', whatsappApiUrl);
    localStorage.setItem('use_simulation', useSimulation.toString());
    setShowSettings(false);
  };

  const generateNumbers = () => {
    const newNumbers: GeneratedNumber[] = [];
    
    if (generationMode === 'range') {
      const start = parseInt(startRange) || 0;
      // Normalize prefix: remove +, and if it starts with 0, replace with 218
      let cleanPrefix = prefix.replace(/\D/g, '');
      if (cleanPrefix.startsWith('0')) {
        cleanPrefix = '218' + cleanPrefix.substring(1);
      } else if (!cleanPrefix.startsWith('218') && cleanPrefix.length === 9) {
        // If it's just 91... without 218, prepend 218
        cleanPrefix = '218' + cleanPrefix;
      }
      
      for (let i = 0; i < count; i++) {
        const num = (start + i).toString().padStart(startRange.length, '0');
        newNumbers.push({
          number: `${cleanPrefix}${num}`,
          status: 'pending'
        });
      }
    } else {
      const prefixes = ['21891', '21892', '21894', '21893', '21895'];
      for (let i = 0; i < count; i++) {
        const pref = prefixes[Math.floor(Math.random() * prefixes.length)];
        const rest = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
        newNumbers.push({
          number: `${pref}${rest}`,
          status: 'pending'
        });
      }
    }
    setGeneratedNumbers(newNumbers);
  };

  const checkNumbers = async () => {
    if (!useSimulation && !whatsappApiKey) {
      alert('يرجى إدخال مفتاح الـ API في الإعدادات أولاً أو تفعيل وضع المحاكاة.');
      setShowSettings(true);
      return;
    }

    setIsProcessing(true);
    stopProcessingRef.current = false;
    const updated = [...generatedNumbers];
    const trimmedToken = whatsappApiKey.trim();
    let trimmedInstance = whatsappInstanceId?.trim() || '';
    
    if (whatsappService === 'ultramsg' && trimmedInstance && !trimmedInstance.startsWith('instance')) {
      trimmedInstance = 'instance' + trimmedInstance;
    }
    
    let baseUrl = (whatsappApiUrl || (whatsappService === 'whapi' ? 'https://gate.whapi.cloud' : 'https://api.ultramsg.com')).replace(/\/+$/, '');
    
    if (whatsappService === 'ultramsg' && baseUrl.includes('/instance')) {
      const parts = baseUrl.split('/');
      const instanceIdx = parts.findIndex(p => p.startsWith('instance'));
      if (instanceIdx !== -1) baseUrl = parts.slice(0, instanceIdx).join('/');
    }

    // Process in batches for better performance and to avoid rate limits
    const batchSize = whatsappService === 'whapi' ? 20 : 5;
    
    for (let i = 0; i < updated.length; i += batchSize) {
      if (stopProcessingRef.current) break;

      const currentBatch = updated.slice(i, i + batchSize);
      const batchIndices = Array.from({ length: currentBatch.length }, (_, k) => i + k);

      // Update status to checking
      batchIndices.forEach(idx => {
        if (updated[idx].status !== 'exists') {
          updated[idx].status = 'checking';
        }
      });
      setGeneratedNumbers([...updated]);

      if (useSimulation) {
        await new Promise(resolve => setTimeout(resolve, 800));
        batchIndices.forEach(idx => {
          if (updated[idx].status === 'checking') {
            updated[idx].status = Math.random() > 0.4 ? 'exists' : 'not_exists';
          }
        });
      } else {
        try {
          if (whatsappService === 'whapi') {
            const phones = currentBatch.filter(n => n.status === 'checking').map(n => n.number.replace(/\D/g, ''));
            if (phones.length > 0) {
              let response = null;
              const tryEndpoints = [`${baseUrl}/contacts`, `${baseUrl}/v1/contacts`, `${baseUrl}/contacts/check`];
              
              for (const url of tryEndpoints) {
                try {
                  response = await fetchWhatsApp(url, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${trimmedToken}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ contacts: phones, force_check: true })
                  });
                  if (response.ok) break;
                } catch (e) { console.warn(`Whapi endpoint ${url} failed:`, e); }
              }

              if (response && response.ok) {
                const data = await response.json();
                const results = Array.isArray(data) ? data : (data.contacts || []);
                
                batchIndices.forEach(idx => {
                  if (updated[idx].status === 'checking') {
                    const phone = updated[idx].number.replace(/\D/g, '');
                    const res = results.find((r: any) => {
                      const rPhone = (r.phone || r.wa_id || r.id || '').split('@')[0].replace(/\D/g, '');
                      return rPhone === phone || rPhone.includes(phone) || phone.includes(rPhone);
                    });
                    
                    if (res) {
                      const status = (res.status || res.result || '').toString().toLowerCase();
                      const isInvalid = status.includes('invalid') || status.includes('not') || res.exists === false;
                      const hasWaId = !!res.wa_id || !!res.jid || (res.status === 'valid') || (res.exists === true);
                      updated[idx].status = (!isInvalid && hasWaId) ? 'exists' : 'not_exists';
                    } else {
                      updated[idx].status = 'not_exists';
                    }
                  }
                });
              }
            }
          } else {
            // UltraMsg - Check one by one in parallel for the batch
            await Promise.all(batchIndices.map(async (idx) => {
              if (updated[idx].status !== 'checking') return;
              
              try {
                const phone = updated[idx].number.replace('+', '');
                const chatId = `${phone}@c.us`;
                const url = `${baseUrl}/${trimmedInstance}/contacts/check?token=${encodeURIComponent(trimmedToken)}&chatId=${encodeURIComponent(chatId)}`;
                
                const res = await fetchWhatsApp(url);
                if (res.ok) {
                  const data = await res.json();
                  const status = (data.status || data.result || '').toString().toLowerCase();
                  const isInvalid = status.includes('invalid') || status.includes('not') || data.exists === false;
                  updated[idx].status = !isInvalid ? 'exists' : 'not_exists';
                }
              } catch (e) {
                updated[idx].status = 'error';
              }
            }));
          }
        } catch (error) {
          console.error('Check error:', error);
          batchIndices.forEach(idx => {
            if (updated[idx].status === 'checking') updated[idx].status = 'error';
          });
        }
      }
      
      setGeneratedNumbers([...updated]);
      if (whatsappService === 'ultramsg') await new Promise(r => setTimeout(r, 500));
    }
    
    setIsProcessing(false);
  };

  const exportToCSV = () => {
    const content = generatedNumbers
      .filter(n => filter === 'all' || (filter === 'exists' && n.status === 'exists') || (filter === 'not_exists' && n.status === 'not_exists'))
      .map(n => `${n.number},${n.status === 'exists' ? 'WhatsApp' : 'No WhatsApp'}`)
      .join('\n');
    
    const blob = new Blob([`Number,Status\n${content}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `whatsapp_check_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredNumbers = generatedNumbers.filter(n => {
    if (filter === 'all') return true;
    return n.status === filter;
  });

  return (
    <div className="p-6 space-y-6 bg-[#f8f9fa] min-h-screen font-sans" dir="rtl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <MessageSquare className="text-green-600" />
            أدوات الواتساب الذكية
          </h1>
          <p className="text-gray-500 text-sm">توليد وفحص الأرقام المشتركة في خدمة الواتساب</p>
        </div>
        <button 
          onClick={() => setShowSettings(true)}
          className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2 text-gray-600"
        >
          <SettingsIcon className="w-5 h-5" />
          <span>إعدادات الربط</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* لوحة التحكم */}
        <div className="lg:col-span-1 space-y-6">
          {useSimulation && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-2xl flex items-start gap-3">
              <AlertCircle className="text-yellow-600 w-5 h-5 mt-0.5" />
              <div>
                <p className="text-yellow-800 text-sm font-bold">وضع المحاكاة نشط</p>
                <p className="text-yellow-700 text-xs">يتم عرض نتائج وهمية للفحص. قم بتعطيل المحاكاة في الإعدادات للفحص الحقيقي.</p>
              </div>
            </div>
          )}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Zap className="text-yellow-500 w-5 h-5" />
              توليد أرقام جديدة
            </h2>
            
            <div className="space-y-4">
              <div className="flex p-1 bg-gray-100 rounded-xl">
                <button
                  onClick={() => setGenerationMode('range')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${generationMode === 'range' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
                >
                  نطاق محدد
                </button>
                <button
                  onClick={() => setGenerationMode('random')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${generationMode === 'random' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
                >
                  عشوائي (ليبيا)
                </button>
              </div>

              {generationMode === 'range' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">المقدمة</label>
                    <input 
                      type="text" 
                      value={prefix}
                      onChange={(e) => setPrefix(e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                      placeholder="21891"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">بداية النطاق</label>
                    <input 
                      type="text" 
                      value={startRange}
                      onChange={(e) => setStartRange(e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all font-mono"
                      placeholder="0000000"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-green-50 border border-green-100 rounded-xl">
                  <p className="text-green-800 text-[10px] font-medium">سيتم توليد أرقام عشوائية لشبكات المدار وليبيانا وهاتف ليبيا.</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">الكمية للتوليد</label>
                <input 
                  type="number" 
                  value={isNaN(count) ? '' : count}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setCount(isNaN(val) ? 0 : val);
                  }}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                  max="5000"
                />
              </div>

              <button 
                onClick={generateNumbers}
                className="w-full bg-green-600 hover:bg-green-700 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-600/20"
              >
                <Plus className="w-5 h-5" />
                توليد القائمة
              </button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <ShieldCheck className="text-blue-500 w-5 h-5" />
              إجراءات الفحص
            </h2>
            <div className="space-y-3">
              <button 
                disabled={generatedNumbers.length === 0 || isProcessing}
                onClick={checkNumbers}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
              >
                {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                بدء فحص الواتساب
              </button>
              
              <button 
                disabled={generatedNumbers.length === 0}
                onClick={exportToCSV}
                className="w-full bg-gray-800 hover:bg-black text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-5 h-5" />
                تصدير النتائج (CSV)
              </button>
            </div>
          </motion.div>
        </div>

        {/* قائمة النتائج */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-bottom border-gray-100 flex flex-wrap justify-between items-center gap-4">
              <div className="flex gap-2">
                <button 
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === 'all' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  الكل ({generatedNumbers.length})
                </button>
                <button 
                  onClick={() => setFilter('exists')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === 'exists' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  واتساب ({generatedNumbers.filter(n => n.status === 'exists').length})
                </button>
                <button 
                  onClick={() => setFilter('not_exists')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === 'not_exists' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  غير مشترك ({generatedNumbers.filter(n => n.status === 'not_exists').length})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-right">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="p-4 text-sm font-semibold text-gray-600">الرقم</th>
                    <th className="p-4 text-sm font-semibold text-gray-600">الحالة</th>
                    <th className="p-4 text-sm font-semibold text-gray-600">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredNumbers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-12 text-center text-gray-400">
                        <Phone className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        لا توجد أرقام حالياً. قم بتوليد أرقام للبدء.
                      </td>
                    </tr>
                  ) : (
                    filteredNumbers.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-mono text-gray-700">{item.number}</td>
                        <td className="p-4">
                          {item.status === 'pending' && <span className="text-gray-400 text-sm">بانتظار الفحص</span>}
                          {item.status === 'checking' && (
                            <span className="text-blue-500 text-sm flex items-center gap-1">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              جاري الفحص...
                            </span>
                          )}
                          {item.status === 'exists' && (
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3" />
                              مشترك
                            </span>
                          )}
                          {item.status === 'not_exists' && (
                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 w-fit">
                              <XCircle className="w-3 h-3" />
                              غير مشترك
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {item.status === 'exists' && (
                            <a 
                              href={`https://wa.me/${item.number.replace('+', '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-green-600 hover:text-green-800 p-2 rounded-full hover:bg-green-50 transition-all inline-block"
                              title="فتح في واتساب"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </a>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-16 -mt-16" />
              
              <div className="flex justify-between items-center mb-6 relative">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                    <SettingsIcon className="text-green-600 w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">إعدادات API الواتساب</h3>
                </div>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4 relative">
                <div className="flex p-1 bg-gray-100 rounded-2xl">
                  <button
                    onClick={() => setWhatsappService('whapi')}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${whatsappService === 'whapi' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Whapi.Cloud
                  </button>
                  <button
                    onClick={() => setWhatsappService('ultramsg')}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${whatsappService === 'ultramsg' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    UltraMsg
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 mr-1">مفتاح الـ API (Token)</label>
                  <input
                    type="password"
                    value={whatsappApiKey}
                    onChange={(e) => setWhatsappApiKey(e.target.value)}
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                    placeholder="أدخل التوكن هنا..."
                  />
                </div>

                {whatsappService === 'ultramsg' && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 mr-1">Instance ID</label>
                    <input
                      type="text"
                      value={whatsappInstanceId}
                      onChange={(e) => setWhatsappInstanceId(e.target.value)}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                      placeholder="مثال: instance12345"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${useSimulation ? 'bg-yellow-100' : 'bg-green-100'}`}>
                      <Zap className={`w-5 h-5 ${useSimulation ? 'text-yellow-600' : 'text-green-600'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">وضع المحاكاة</p>
                      <p className="text-xs text-gray-500">للتجربة بدون استهلاك رصيد</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setUseSimulation(!useSimulation)}
                    className={`w-12 h-6 rounded-full transition-all relative ${useSimulation ? 'bg-yellow-500' : 'bg-gray-200'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${useSimulation ? 'right-7' : 'right-1'}`} />
                  </button>
                </div>

                <button
                  onClick={saveSettings}
                  className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-200 mt-4"
                >
                  حفظ الإعدادات
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
