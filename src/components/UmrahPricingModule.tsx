import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { UmrahPricing, User } from '../types';
import { 
  Calculator, 
  Save, 
  Trash2, 
  Edit2, 
  Plus, 
  DollarSign, 
  Hotel, 
  Gift, 
  UserCheck, 
  History,
  Info,
  CheckCircle2,
  X,
  MapPin,
  TrendingUp,
  RefreshCw,
  Ticket,
  Coins,
  Type,
  FileSpreadsheet,
  FileText,
  Search,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import domtoimage from 'dom-to-image-more';

interface UmrahPricingModuleProps {
  user: User;
}

const HotelSection = ({ 
  city, 
  hotel, setHotel, 
  nights, setNights, 
  type, setType, 
  roomPriceFlat, setRoomPriceFlat,
  double, setDouble,
  triple, setTriple,
  quad, setQuad,
  quint, setQuint
}: any) => (
  <div className="bg-matte-dark p-8 rounded-[2rem] border border-white/10 shadow-xl space-y-6">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <MapPin className="w-5 h-5 text-gold" />
        <h2 className="text-xl font-bold text-white">فندق {city}</h2>
      </div>
      <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center border border-gold/20">
        <Hotel className="w-5 h-5 text-gold" />
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="col-span-full">
        <label className="block text-xs font-bold text-white/40 mb-2 uppercase">إسم الفندق</label>
        <input
          type="text"
          value={hotel}
          onChange={(e) => setHotel(e.target.value)}
          className="w-full h-12 bg-black/40 border border-white/10 rounded-2xl px-4 text-white focus:border-gold outline-none transition-all placeholder:text-white/10"
          placeholder="إسم الفندق..."
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-white/40 mb-2 uppercase">عدد الليالي</label>
        <input
          type="number"
          value={nights || ''}
          onChange={(e) => setNights(Number(e.target.value))}
          className="w-full h-12 bg-black/40 border border-white/10 rounded-2xl px-4 text-white focus:border-gold outline-none transition-all font-bold"
          placeholder="0"
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-white/40 mb-2 uppercase">نوع الغرفة</label>
        <div className="flex p-0.5 bg-black/60 rounded-xl border border-white/5">
          <button
            onClick={() => setType('flat')}
            className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold transition-all ${
              type === 'flat' ? 'bg-gold text-black' : 'text-white/40 hover:text-white'
            }`}
          >
            فلات
          </button>
          <button
            onClick={() => setType('priced')}
            className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold transition-all ${
              type === 'priced' ? 'bg-gold text-black' : 'text-white/40 hover:text-white'
            }`}
          >
            مسعرة
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {type === 'flat' ? (
          <motion.div
            key="flat"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="col-span-full"
          >
            <label className="block text-xs font-bold text-white/40 mb-2 uppercase">سعر الغرفة (موحد) بالريال</label>
            <input
              type="number"
              value={roomPriceFlat || ''}
              onChange={(e) => setRoomPriceFlat(Number(e.target.value))}
              className="w-full h-12 bg-black/40 border border-white/10 rounded-2xl px-4 text-white focus:border-gold outline-none transition-all font-bold"
              placeholder="0.00"
            />
          </motion.div>
        ) : (
          <motion.div
            key="priced"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="col-span-full grid grid-cols-2 gap-3"
          >
            {[
              { label: 'ثنائي', value: double, setter: setDouble },
              { label: 'ثلاثي', value: triple, setter: setTriple },
              { label: 'رباعي', value: quad, setter: setQuad },
              { label: 'خماسي', value: quint, setter: setQuint }
            ].map((item, i) => (
              <div key={i}>
                <label className="block text-[10px] font-bold text-white/40 mb-1">{item.label} (بالريال)</label>
                <input
                  type="number"
                  value={item.value || ''}
                  onChange={(e) => item.setter(Number(e.target.value))}
                  className="w-full h-10 bg-black/40 border border-white/10 rounded-xl px-3 text-sm text-white focus:border-gold outline-none transition-all font-bold"
                  placeholder="0"
                />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>
);

const UmrahPricingModule: React.FC<UmrahPricingModuleProps> = ({ user }) => {
  const [pricings, setPricings] = useState<UmrahPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Global Settings
  const [offerName, setOfferName] = useState('');
  const [tripName, setTripName] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'LYD'>('USD');

  // Search/Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [tripFilter, setTripFilter] = useState('');

  // Form State - Makkah
  const [makkahHotel, setMakkahHotel] = useState('');
  const [makkahNights, setMakkahNights] = useState(0);
  const [makkahType, setMakkahType] = useState<'flat' | 'priced'>('flat');
  const [makkahRoomPriceFlat, setMakkahRoomPriceFlat] = useState(0);
  const [makkahDoublePrice, setMakkahDoublePrice] = useState(0);
  const [makkahTriplePrice, setMakkahTriplePrice] = useState(0);
  const [makkahQuadPrice, setMakkahQuadPrice] = useState(0);
  const [makkahQuintPrice, setMakkahQuintPrice] = useState(0);

  // Form State - Madinah
  const [madinahHotel, setMadinahHotel] = useState('');
  const [madinahNights, setMadinahNights] = useState(0);
  const [madinahType, setMadinahType] = useState<'flat' | 'priced'>('flat');
  const [madinahRoomPriceFlat, setMadinahRoomPriceFlat] = useState(0);
  const [madinahDoublePrice, setMadinahDoublePrice] = useState(0);
  const [madinahTriplePrice, setMadinahTriplePrice] = useState(0);
  const [madinahQuadPrice, setMadinahQuadPrice] = useState(0);
  const [madinahQuintPrice, setMadinahQuintPrice] = useState(0);

  // Global Costs
  const [visaPrice, setVisaPrice] = useState(0);
  const [giftsCost, setGiftsCost] = useState(0);
  const [agentFee, setAgentFee] = useState(0);
  const [ticketPrice, setTicketPrice] = useState(0);
  const [profitMargin, setProfitMargin] = useState(0);
  const [exchangeRate, setExchangeRate] = useState(4.85); // Default exchange rate
  const [notes, setNotes] = useState('');
  const tableRef = useRef<HTMLDivElement>(null);

  // Results State
  const [results, setResults] = useState({
    double: 0,
    triple: 0,
    quad: 0,
    quint: 0,
    doubleLYD: 0,
    tripleLYD: 0,
    quadLYD: 0,
    quintLYD: 0
  });

  useEffect(() => {
    fetchPricings();
  }, []);

  useEffect(() => {
    calculateResults();
  }, [
    makkahNights, makkahType, makkahRoomPriceFlat, makkahDoublePrice, makkahTriplePrice, makkahQuadPrice, makkahQuintPrice,
    madinahNights, madinahType, madinahRoomPriceFlat, madinahDoublePrice, madinahTriplePrice, madinahQuadPrice, madinahQuintPrice,
    visaPrice, giftsCost, agentFee, ticketPrice, profitMargin, exchangeRate, selectedCurrency
  ]);

  const fetchPricings = async () => {
    setLoading(true);
    try {
      const data = await api.getUmrahPricings();
      setPricings(data);
    } catch (error) {
      console.error('Error fetching pricings:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateResults = () => {
    const calcCostPerPerson = (divisor: number) => {
      const makkahBase = makkahType === 'flat' 
        ? makkahRoomPriceFlat 
        : (divisor === 2 ? makkahDoublePrice : divisor === 3 ? makkahTriplePrice : divisor === 4 ? makkahQuadPrice : makkahQuintPrice);
      const makkahCost = (makkahBase / divisor) * (makkahNights || 0);

      const madinahBase = madinahType === 'flat' 
        ? madinahRoomPriceFlat 
        : (divisor === 2 ? madinahDoublePrice : divisor === 3 ? madinahTriplePrice : divisor === 4 ? madinahQuadPrice : madinahQuintPrice);
      const madinahCost = (madinahBase / divisor) * (madinahNights || 0);

      const hotelsUsd = (makkahCost + madinahCost) / 3.7;
      
      // Calculate subtotal in USD
      const subtotalUsd = hotelsUsd + visaPrice + giftsCost + agentFee + profitMargin;
      
      // If LYD selected, ticket is added to the LYD result
      let finalLyd = subtotalUsd * (exchangeRate || 1);
      let finalUsd = subtotalUsd;
      
      if (selectedCurrency === 'LYD') {
        finalLyd += ticketPrice;
        finalUsd += (exchangeRate > 0 ? ticketPrice / exchangeRate : 0);
      }

      return {
        usd: Number(finalUsd.toFixed(2)),
        lyd: Number(finalLyd.toFixed(2))
      };
    };

    const res2 = calcCostPerPerson(2);
    const res3 = calcCostPerPerson(3);
    const res4 = calcCostPerPerson(4);
    const res5 = calcCostPerPerson(5);

    setResults({
      double: res2.usd,
      triple: res3.usd,
      quad: res4.usd,
      quint: res5.usd,
      doubleLYD: res2.lyd,
      tripleLYD: res3.lyd,
      quadLYD: res4.lyd,
      quintLYD: res5.lyd
    });
  };

  const handleSave = async () => {
    if (!offerName.trim()) {
      alert('الرجاء إدخال اسم للعرض');
      return;
    }
    setSaving(true);
    try {
      const newPricing: UmrahPricing = {
        id: editId || 'new',
        name: offerName,
        tripName,
        makkah: {
          hotelName: makkahHotel,
          nights: makkahNights,
          type: makkahType,
          roomPriceFlat: makkahRoomPriceFlat,
          doublePrice: makkahDoublePrice,
          triplePrice: makkahTriplePrice,
          quadPrice: makkahQuadPrice,
          quintPrice: makkahQuintPrice
        },
        madinah: {
          hotelName: madinahHotel,
          nights: madinahNights,
          type: madinahType,
          roomPriceFlat: madinahRoomPriceFlat,
          doublePrice: madinahDoublePrice,
          triplePrice: madinahTriplePrice,
          quadPrice: madinahQuadPrice,
          quintPrice: madinahQuintPrice
        },
        visaPrice,
        giftsCost,
        agentFee,
        ticketPrice,
        profitMargin,
        exchangeRate,
        currency: selectedCurrency,
        results,
        notes,
        createdAt: new Date().toISOString()
      };

      await api.saveUmrahPricing(newPricing);
      await fetchPricings();
      resetForm();
    } catch (error) {
      console.error('Error saving pricing:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا السجل؟')) return;
    try {
      await api.deleteUmrahPricing(id);
      await fetchPricings();
    } catch (error) {
      console.error('Error deleting pricing:', error);
    }
  };

  const handleEdit = (p: UmrahPricing) => {
    setEditId(p.id);
    setOfferName(p.name || '');
    setTripName(p.tripName || '');
    setSelectedCurrency(p.currency || 'USD');
    
    // Load Makkah
    setMakkahHotel(p.makkah.hotelName || '');
    setMakkahNights(p.makkah.nights);
    setMakkahType(p.makkah.type);
    setMakkahRoomPriceFlat(p.makkah.roomPriceFlat);
    setMakkahDoublePrice(p.makkah.doublePrice);
    setMakkahTriplePrice(p.makkah.triplePrice);
    setMakkahQuadPrice(p.makkah.quadPrice);
    setMakkahQuintPrice(p.makkah.quintPrice);

    // Load Madinah
    setMadinahHotel(p.madinah.hotelName || '');
    setMadinahNights(p.madinah.nights);
    setMadinahType(p.madinah.type);
    setMadinahRoomPriceFlat(p.madinah.roomPriceFlat);
    setMadinahDoublePrice(p.madinah.doublePrice);
    setMadinahTriplePrice(p.madinah.triplePrice);
    setMadinahQuadPrice(p.madinah.quadPrice);
    setMadinahQuintPrice(p.madinah.quintPrice);

    // Load Global
    setVisaPrice(p.visaPrice);
    setGiftsCost(p.giftsCost);
    setAgentFee(p.agentFee);
    setTicketPrice(p.ticketPrice || 0);
    setProfitMargin(p.profitMargin || 0);
    setExchangeRate(p.exchangeRate || 4.85);
    setNotes(p.notes || '');
    setResults(p.results);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditId(null);
    setOfferName('');
    setTripName('');
    setMakkahHotel('');
    setMakkahNights(0);
    setMakkahType('flat');
    setMakkahRoomPriceFlat(0);
    setMakkahDoublePrice(0);
    setMakkahTriplePrice(0);
    setMakkahQuadPrice(0);
    setMakkahQuintPrice(0);

    setMadinahHotel('');
    setMadinahNights(0);
    setMadinahType('flat');
    setMadinahRoomPriceFlat(0);
    setMadinahDoublePrice(0);
    setMadinahTriplePrice(0);
    setMadinahQuadPrice(0);
    setMadinahQuintPrice(0);

    setVisaPrice(0);
    setGiftsCost(0);
    setAgentFee(0);
    setTicketPrice(0);
    setProfitMargin(0);
    setNotes('');
  };

  const exportToExcel = () => {
    const data = filteredPricings.map(p => ({
      'اسم العرض': p.name || 'بدون اسم',
      'اسم الرحلة': p.tripName || '',
      'فندق مكة': p.makkah?.hotelName || '',
      'ليالي مكة': p.makkah?.nights || 0,
      'فندق المدينة': p.madinah?.hotelName || '',
      'ليالي المدينة': p.madinah?.nights || 0,
      'سعر الصرف': p.exchangeRate || 1,
      'العملة': p.currency || 'USD',
      'ثنائي': p.results?.double || 0,
      'ثلاثي': p.results?.triple || 0,
      'رباعي': p.results?.quad || 0,
      'خماسي': p.results?.quint || 0,
      'التاريخ': new Date(p.createdAt).toLocaleDateString('ar-SA')
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pricings');
    XLSX.writeFile(wb, `Umrah_Pricing_${new Date().getTime()}.xlsx`);
  };

  const exportToPDF = async () => {
    if (!tableRef.current || exporting) return;
    
    setExporting(true);
    const printContainer = document.createElement('div');
    printContainer.style.position = 'fixed';
    printContainer.style.left = '-9999px';
    printContainer.style.top = '0';
    printContainer.style.width = '1120px'; // A4 Landscape width approx
    printContainer.style.backgroundColor = '#ffffff';
    printContainer.style.padding = '40px';
    printContainer.style.direction = 'rtl';
    printContainer.style.fontFamily = 'Arial, sans-serif';

    const dateStr = new Date().toLocaleDateString('ar-SA');
    const timeStr = new Date().toLocaleTimeString('ar-SA');

    printContainer.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #d4af37; padding-bottom: 20px; margin-bottom: 30px;">
        <div style="text-align: right;">
          <h1 style="color: #d4af37; margin: 0; font-size: 28px;">شركة دار المقام لخدمات العمرة</h1>
          <p style="margin: 5px 0; color: #666;">تقرير حاسبة التسعير - ${dateStr}</p>
        </div>
        <div style="text-align: left; color: #666; font-size: 12px;">
          <div>الوقت: ${timeStr}</div>
          <div>المستخدم: ${user.name}</div>
        </div>
      </div>

      <h2 style="text-align: center; color: #333; margin-bottom: 25px; font-size: 22px;">سجل تسعيرات العمرة</h2>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px; font-size: 12px;">
        <thead>
          <tr style="background-color: #d4af37; color: #ffffff;">
            <th style="border: 1px solid #333; padding: 12px; text-align: right;">اسم العرض</th>
            <th style="border: 1px solid #333; padding: 12px; text-align: right;">الرحلة</th>
            <th style="border: 1px solid #333; padding: 12px; text-align: right;">فندق مكة</th>
            <th style="border: 1px solid #333; padding: 12px; text-align: center;">ل.مكة</th>
            <th style="border: 1px solid #333; padding: 12px; text-align: right;">فندق المدينة</th>
            <th style="border: 1px solid #333; padding: 12px; text-align: center;">ل.المدينة</th>
            <th style="border: 1px solid #333; padding: 12px; text-align: center;">الصرف</th>
            <th style="border: 1px solid #333; padding: 12px; text-align: center;">ثنائي</th>
            <th style="border: 1px solid #333; padding: 12px; text-align: center;">ثلاثي</th>
            <th style="border: 1px solid #333; padding: 12px; text-align: center;">رباعي</th>
            <th style="border: 1px solid #333; padding: 12px; text-align: center;">خماسي</th>
          </tr>
        </thead>
        <tbody>
          ${filteredPricings.map((p, idx) => `
            <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f9f9f9'};">
              <td style="border: 1px solid #dee2e6; padding: 10px; font-weight: bold;">${p.name || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; color: #d4af37;">${p.tripName || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px;">${p.makkah?.hotelName || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">${p.makkah?.nights || 0}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px;">${p.madinah?.hotelName || '---'}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">${p.madinah?.nights || 0}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center;">${p.exchangeRate || 1}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-weight: bold; color: #2563eb;">${p.results?.double || 0}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-weight: bold; color: #059669;">${p.results?.triple || 0}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-weight: bold; color: #7c3aed;">${p.results?.quad || 0}</td>
              <td style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-weight: bold; color: #ea580c;">${p.results?.quint || 0}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="margin-top: 60px; display: flex; justify-content: space-between; font-size: 14px; border-top: 2px solid #eee; padding-top: 30px;">
        <div style="text-align: center; width: 250px;">
          <div style="font-weight: bold; margin-bottom: 50px;">اعتماد مدير قسم العمرة</div>
          <div style="border-bottom: 1px dashed #333; width: 100%;"></div>
        </div>
        <div style="text-align: center; width: 200px;">
          <div style="font-weight: bold; margin-bottom: 40px;">ختم الشركة</div>
          <div style="border: 2px solid #d4af37; width: 110px; height: 110px; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; color: #d4af37; font-size: 11px; opacity: 0.4; transform: rotate(-15deg);">
            <div style="text-align: center; border: 1px solid #d4af37; padding: 5px; border-radius: 50%;">دار المقام<br/>DAR AL MAQAM</div>
          </div>
        </div>
      </div>

      <div style="position: absolute; bottom: 20px; left: 0; right: 0; text-align: center; font-size: 11px; color: #999;">
        تم استخراج هذا التقرير آلياً بواسطة نظام دار المقام المتكامل لإدارة العمرة
      </div>
    `;

    document.body.appendChild(printContainer);

    try {
      // Small delay to ensure rendering
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(printContainer, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: 1120
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`حاسبة_التسعير_${new Date().toLocaleDateString('ar-LY')}.pdf`);
    } catch (err) {
      console.error("PDF Export failed:", err);
    } finally {
      document.body.removeChild(printContainer);
      setExporting(false);
    }
  };

  const filteredPricings = pricings.filter(p => {
    const name = p.name || '';
    const trip = p.tripName || '';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTrip = !tripFilter || trip.toLowerCase().includes(tripFilter.toLowerCase());
    return matchesSearch && matchesTrip;
  });

  const uniqueOffers = Array.from(new Set(pricings.map(p => p.name || '').filter(Boolean)));
  const uniqueTrips = Array.from(new Set(pricings.map(p => p.tripName || '').filter(Boolean)));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" dir="rtl">
      <datalist id="offers-list">
        {uniqueOffers.map(name => <option key={name} value={name} />)}
      </datalist>
      <datalist id="trips-list">
        {uniqueTrips.map(name => <option key={name} value={name} />)}
      </datalist>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-matte-dark p-6 rounded-[2rem] border border-white/10 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gold/10 flex items-center justify-center border border-gold/20">
            <Calculator className="w-6 h-6 text-gold" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">حاسبة تسعير العمرة المتطورة</h1>
            <p className="text-white/40 text-sm">حساب دقيق لتكلفة الفرد شامل الفنادق، الخدمات، الربح والتذكرة</p>
          </div>
        </div>

        {/* Currency Switcher */}
        <div className="flex p-0.5 bg-black/40 rounded-2xl border border-white/10 w-full md:w-auto">
          <button
            onClick={() => setSelectedCurrency('USD')}
            className={`flex-1 md:w-32 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
              selectedCurrency === 'USD' ? 'bg-gold text-black shadow-lg shadow-gold/20' : 'text-white/40'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            USD
          </button>
          <button
            onClick={() => setSelectedCurrency('LYD')}
            className={`flex-1 md:w-32 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
              selectedCurrency === 'LYD' ? 'bg-gold text-black shadow-lg shadow-gold/20' : 'text-white/40'
            }`}
          >
            <Coins className="w-4 h-4" />
            LYD
          </button>
        </div>
      </div>

      {/* Global Fields: Offer Name & Trip Name */}
      <div className="bg-matte-dark p-6 rounded-[2rem] border border-white/10 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="block text-xs font-bold text-white/40 uppercase flex items-center gap-2">
            <Type className="w-3 h-3 text-gold" />
            إسم العرض / التسعيرة
          </label>
          <div className="relative group">
            <input
              type="text"
              value={offerName}
              onChange={(e) => setOfferName(e.target.value)}
              list="offers-list"
              className="w-full h-14 bg-black/40 border border-white/10 rounded-2xl px-6 text-white text-lg font-black focus:border-gold outline-none transition-all placeholder:text-white/5"
              placeholder="مثال: عرض رمضان - فندق أبراج مكة..."
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-bold text-white/40 uppercase flex items-center gap-2">
            <MapPin className="w-3 h-3 text-gold" />
            إسم الرحلة (اختياري)
          </label>
          <div className="relative group">
            <input
              type="text"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              list="trips-list"
              className="w-full h-14 bg-black/40 border border-white/10 rounded-2xl px-6 text-white text-lg font-black focus:border-gold outline-none transition-all placeholder:text-white/5"
              placeholder="مثال: رحلة الإسراء والمعراج 2024..."
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <HotelSection 
              city="مكة"
              hotel={makkahHotel} setHotel={setMakkahHotel}
              nights={makkahNights} setNights={setMakkahNights}
              type={makkahType} setType={setMakkahType}
              roomPriceFlat={makkahRoomPriceFlat} setRoomPriceFlat={setMakkahRoomPriceFlat}
              double={makkahDoublePrice} setDouble={setMakkahDoublePrice}
              triple={makkahTriplePrice} setTriple={setMakkahTriplePrice}
              quad={makkahQuadPrice} setQuad={setMakkahQuadPrice}
              quint={makkahQuintPrice} setQuint={setMakkahQuintPrice}
            />
            <HotelSection 
              city="المدينة"
              hotel={madinahHotel} setHotel={setMadinahHotel}
              nights={madinahNights} setNights={setMadinahNights}
              type={madinahType} setType={setMadinahType}
              roomPriceFlat={madinahRoomPriceFlat} setRoomPriceFlat={setMadinahRoomPriceFlat}
              double={madinahDoublePrice} setDouble={setMadinahDoublePrice}
              triple={madinahTriplePrice} setTriple={setMadinahTriplePrice}
              quad={madinahQuadPrice} setQuad={setMadinahQuadPrice}
              quint={madinahQuintPrice} setQuint={setMadinahQuintPrice}
            />
          </div>

          <div className="bg-matte-dark p-8 rounded-[2rem] border border-white/10 shadow-xl space-y-6">
            <div className="flex items-center gap-3">
              <Gift className="w-5 h-5 text-gold" />
              <h2 className="text-xl font-bold text-white">الخدمات والهوامش ($ دولار)</h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { label: 'سعر التأشيرة', value: visaPrice, setter: setVisaPrice, icon: CheckCircle2, show: true },
                { label: 'تكلفة الهدايا', value: giftsCost, setter: setGiftsCost, icon: Gift, show: true },
                { label: 'المندوب', value: agentFee, setter: setAgentFee, icon: UserCheck, show: true },
                { label: 'هامش الربح', value: profitMargin, setter: setProfitMargin, icon: TrendingUp, show: true },
                { label: 'سعر التذكرة', value: ticketPrice, setter: setTicketPrice, icon: Ticket, show: selectedCurrency === 'LYD' }
              ].filter(item => item.show).map((item, i) => (
                <div key={i}>
                  <label className="block text-[10px] font-bold text-white/40 mb-2 uppercase">{item.label}</label>
                  <div className="relative group">
                    <item.icon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-gold transition-colors" />
                    <input
                      type="number"
                      value={item.value || ''}
                      onChange={(e) => item.setter(Number(e.target.value))}
                      className="w-full h-11 bg-black/40 border border-white/10 rounded-xl pr-10 pl-3 text-white focus:border-gold outline-none transition-all font-bold"
                      placeholder="0"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
              <div>
                <label className="block text-[10px] font-bold text-white/40 mb-2 uppercase flex items-center justify-between">
                  <span>سعر صرف الدولار (LYD)</span>
                </label>
                <div className="relative group">
                  <RefreshCw className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-gold transition-colors" />
                  <input
                    type="number"
                    step="0.01"
                    value={exchangeRate || ''}
                    onChange={(e) => setExchangeRate(Number(e.target.value))}
                    className="w-full h-11 bg-black/40 border border-white/10 rounded-xl pr-10 pl-3 text-white focus:border-gold outline-none transition-all font-bold"
                    placeholder="4.85"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-white/40 mb-2 uppercase">ملاحظات إضافية</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-11 bg-black/40 border border-white/10 rounded-xl px-4 text-white focus:border-gold outline-none transition-all"
                  placeholder="ملاحظات..."
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-3 bg-gold text-black h-14 rounded-2xl font-black hover:bg-gold/90 transition-all disabled:opacity-50 shadow-lg shadow-gold/20"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {editId ? 'تعديل السعر المختار' : 'حفظ نتائج التسعير'}
            </button>
          </div>
        </div>

        {/* Results Column */}
        <div className="space-y-6">
          <div className="bg-matte-dark p-6 rounded-[2rem] border border-white/10 shadow-xl sticky top-6 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              {selectedCurrency === 'USD' ? <DollarSign className="w-5 h-5 text-gold" /> : <Coins className="w-5 h-5 text-gold" />}
              <h2 className="text-lg font-bold text-white">تكلفة الفرد ({selectedCurrency})</h2>
            </div>

            {[
              { label: 'الثنائية', usd: results.double, lyd: results.doubleLYD, color: 'text-blue-500' },
              { label: 'الثلاثية', usd: results.triple, lyd: results.tripleLYD, color: 'text-green-500' },
              { label: 'الرباعية', usd: results.quad, lyd: results.quadLYD, color: 'text-purple-500' },
              { label: 'الخماسية', usd: results.quint, lyd: results.quintLYD, color: 'text-orange-500' }
            ].map((res, i) => (
              <div key={i} className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-2">
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{res.label}</p>
                <div className="flex items-baseline justify-between">
                  <span className={`text-xl font-black ${res.color}`}>
                    {selectedCurrency === 'USD' ? `$${res.usd}` : `${res.lyd.toLocaleString()} LYD`}
                  </span>
                  <span className="text-[9px] font-bold text-white/20 italic">
                    {selectedCurrency === 'USD' ? `${res.lyd.toLocaleString()} LYD` : `$${res.usd}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* History */}
      <div className="bg-matte-dark p-8 rounded-[2rem] border border-white/10 shadow-xl space-y-6 overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <History className="w-6 h-6 text-gold" />
            <h2 className="text-xl font-bold text-white">سجل التسعيرات المحفوظة</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={exportToExcel}
              className="px-4 py-2 bg-matte-black border border-emerald-500/20 text-emerald-500 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-emerald-500/10 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              إكسيل
            </button>
            <button
              onClick={exportToPDF}
              disabled={exporting}
              className={`px-4 py-2 bg-matte-black border border-red-500/20 text-red-500 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-red-500/10 transition-all ${exporting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {exporting ? 'جاري التصدير...' : 'PDF'}
            </button>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-black/40 rounded-2xl border border-white/5">
          <div className="relative group">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-gold transition-colors" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              list="offers-list"
              className="w-full h-10 bg-black/40 border border-white/10 rounded-xl pr-10 pl-3 text-xs text-white focus:border-gold outline-none transition-all"
              placeholder="بحث بطلب العرض..."
            />
          </div>
          <div className="relative group">
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-gold transition-colors" />
            <input
              type="text"
              value={tripFilter}
              onChange={(e) => setTripFilter(e.target.value)}
              list="trips-list"
              className="w-full h-10 bg-black/40 border border-white/10 rounded-xl pr-10 pl-3 text-xs text-white focus:border-gold outline-none transition-all"
              placeholder="فلترة بإسم الرحلة..."
            />
          </div>
        </div>

        <div className="overflow-x-auto" ref={tableRef}>
          <table className="w-full text-right border-separate border-spacing-y-2 pb-4">
            <thead>
              <tr className="text-white/40 text-[10px] font-bold uppercase">
                <th className="px-6 py-4">اسم العرض</th>
                <th className="px-6 py-4">اسم الرحلة</th>
                <th className="px-6 py-4">فندق مكة</th>
                <th className="px-6 py-4">ليالي مكة</th>
                <th className="px-6 py-4">فندق المدينة</th>
                <th className="px-6 py-4">ليالي المدينة</th>
                <th className="px-6 py-4">الصرف</th>
                <th className="px-6 py-4">التكلفة ($)</th>
                <th className="px-6 py-4">الربح ($)</th>
                <th className="px-6 py-4">التذكرة</th>
                <th className="px-6 py-4">العملة</th>
                <th className="px-6 py-4">ثنائي</th>
                <th className="px-6 py-4">ثلاثي</th>
                <th className="px-6 py-4">رباعي</th>
                <th className="px-6 py-4">خماسي</th>
                <th className="px-6 py-4 text-center">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse bg-white/5 rounded-2xl"><td colSpan={16} className="py-8"></td></tr>
                ))
              ) : filteredPricings.length === 0 ? (
                <tr><td colSpan={16} className="py-12 text-center text-white/20 font-bold">لا يوجد سجلات تطابق البحث</td></tr>
              ) : (
                filteredPricings.map((p) => {
                  const curr = p.currency || 'USD';
                  const isLYD = curr === 'LYD';
                  
                  // Calculate Net Cost for Double (as a reference)
                  const makkahNet = ((p.makkah?.type === 'flat' ? p.makkah?.roomPriceFlat : p.makkah?.doublePrice) || 0) / 2 * (p.makkah?.nights || 0);
                  const madinahNet = ((p.madinah?.type === 'flat' ? p.madinah?.roomPriceFlat : p.madinah?.doublePrice) || 0) / 2 * (p.madinah?.nights || 0);
                  const netUsd = Number(((makkahNet + madinahNet) / 3.7 + (p.visaPrice || 0) + (p.giftsCost || 0) + (p.agentFee || 0)).toFixed(2));

                  return (
                    <motion.tr
                      key={p.id}
                      layoutId={p.id}
                      className="bg-black/40 hover:bg-black/60 transition-all group border border-white/5"
                    >
                      <td className="px-6 py-4 rounded-r-2xl border-y border-r border-white/5">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-white">{p.name || 'بدون اسم'}</span>
                          <span className="text-[9px] text-white/20">{new Date(p.createdAt).toLocaleDateString('ar-SA')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 border-y border-white/5">
                        <span className="text-xs font-bold text-gold">{p.tripName || '---'}</span>
                      </td>
                      <td className="px-6 py-4 border-y border-white/5">
                        <span className="text-[10px] text-white font-medium truncate max-w-[120px] block">{p.makkah?.hotelName || 'مكة'}</span>
                      </td>
                      <td className="px-6 py-4 border-y border-white/5 text-center">
                        <span className="text-xs font-black text-gold">{p.makkah?.nights || 0}</span>
                      </td>
                      <td className="px-6 py-4 border-y border-white/5">
                        <span className="text-[10px] text-white font-medium truncate max-w-[120px] block">{p.madinah?.hotelName || 'المدينة'}</span>
                      </td>
                      <td className="px-6 py-4 border-y border-white/5 text-center">
                        <span className="text-xs font-black text-white/80">{p.madinah?.nights || 0}</span>
                      </td>
                      <td className="px-6 py-4 border-y border-white/5 text-center">
                        <span className="text-xs font-bold text-white">{p.exchangeRate || '4.85'}</span>
                      </td>
                      <td className="px-6 py-4 border-y border-white/5">
                        <span className="text-xs font-bold text-white/90">${netUsd}</span>
                      </td>
                      <td className="px-6 py-4 border-y border-white/5">
                        <span className="text-xs font-bold text-emerald-500">${p.profitMargin || 0}</span>
                      </td>
                      <td className="px-6 py-4 border-y border-white/5">
                        <span className="text-xs font-bold text-white/40">{p.ticketPrice ? `${p.ticketPrice} LYD` : '---'}</span>
                      </td>
                      <td className="px-6 py-4 border-y border-white/5">
                        <span className={`px-2 py-1 rounded-lg text-[9px] font-black ${isLYD ? 'bg-amber-500/10 text-amber-500' : 'bg-gold/10 text-gold'}`}>
                          {curr}
                        </span>
                      </td>
                      <td className="px-6 py-4 border-y border-white/5 font-black text-blue-500 text-sm">
                        {isLYD ? `${(p.results?.doubleLYD || 0).toLocaleString()}` : `$${p.results?.double || 0}`}
                      </td>
                      <td className="px-6 py-4 border-y border-white/5 font-black text-green-500 text-sm">
                        {isLYD ? `${(p.results?.tripleLYD || 0).toLocaleString()}` : `$${p.results?.triple || 0}`}
                      </td>
                      <td className="px-6 py-4 border-y border-white/5 font-black text-purple-500 text-sm">
                        {isLYD ? `${(p.results?.quadLYD || 0).toLocaleString()}` : `$${p.results?.quad || 0}`}
                      </td>
                      <td className="px-6 py-4 border-y border-white/5 font-black text-orange-500 text-sm">
                        {isLYD ? `${(p.results?.quintLYD || 0).toLocaleString()}` : `$${p.results?.quint || 0}`}
                      </td>
                      <td className="px-6 py-4 rounded-l-2xl border-y border-l border-white/5">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleEdit(p)} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(p.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UmrahPricingModule;
