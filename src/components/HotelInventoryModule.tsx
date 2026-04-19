import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  DoorOpen, 
  DoorClosed, 
  Search, 
  Plus, 
  Filter, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Info, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Hotel as HotelIcon,
  MapPin,
  BedDouble,
  Users,
  LayoutDashboard,
  Calendar as CalendarIcon,
  Grid,
  ChevronRight,
  ChevronLeft,
  FileText,
  Printer,
  Download,
  Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Hotel, HotelRoom } from '../types';
import { api } from '../services/api';
import { clsx } from 'clsx';
import { 
  format, 
  addDays, 
  eachDayOfInterval, 
  startOfMonth, 
  endOfMonth, 
  isToday, 
  isWeekend, 
  addMonths, 
  subMonths,
  parseISO,
  differenceInDays
} from 'date-fns';
import { ar } from 'date-fns/locale';
import Logo from './Logo';

interface HotelInventoryModuleProps {
  user: User;
}

export default function HotelInventoryModule({ user }: HotelInventoryModuleProps) {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'calendar'>('grid');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddHotel, setShowAddHotel] = useState(false);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [editingHotel, setEditingHotel] = useState<Partial<Hotel> | null>(null);
  const [editingRoom, setEditingRoom] = useState<Partial<HotelRoom> | null>(null);
  const [roomBatchCount, setRoomBatchCount] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Vacant' | 'Occupied' | 'Cleaning' | 'Maintenance'>('Vacant');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Double' | 'Triple' | 'Quad' | 'Quint'>('All');
  const [activeCell, setActiveCell] = useState<{ roomId: string; dates: string[]; status: 'booked' | 'available' | 'inactive'; price: number; customerName: string } | null>(null);
  const [selectionStart, setSelectionStart] = useState<{ roomId: string; date: string } | null>(null);
  const [isUpdatingAvailability, setIsUpdatingAvailability] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'single' | 'all' | 'hotel'; id?: string; count?: number; name?: string } | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [roomConfigs, setRoomConfigs] = useState<{ id: string; type: HotelRoom['type']; count: number; price: number; startFrom: number }[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [hotelsData, roomsData] = await Promise.all([
        api.getHotels(),
        api.getRooms()
      ]);
      setHotels(hotelsData);
      setRooms(roomsData);
    } catch (error) {
      console.error('Error loading inventory data:', error);
      showToast('خطأ في تحميل البيانات', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleSaveHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHotel) return;
    try {
      const hotelId = await api.saveHotel(editingHotel);
      
      // If it's a new hotel or we want to add rooms
      if (!editingHotel.id && roomConfigs.some(c => c.count > 0)) {
        const roomPromises = [];
        for (const config of roomConfigs) {
          if (config.count <= 0) continue;
          for (let i = 0; i < config.count; i++) {
            const roomNum = (config.startFrom + i).toString();
            roomPromises.push(api.saveRoom({
              hotelId,
              roomNumber: roomNum,
              type: config.type,
              capacity: config.type === 'Double' ? 2 : config.type === 'Triple' ? 3 : config.type === 'Quad' ? 4 : 5,
              status: 'Vacant',
              floor: '1',
              price: config.price,
              updatedAt: new Date().toISOString()
            }));
          }
        }
        await Promise.all(roomPromises);
      }

      showToast(editingHotel.id ? 'تم تحديث الفندق بنجاح' : 'تم إضافة الفندق والغرف بنجاح');
      setShowAddHotel(false);
      setEditingHotel(null);
      setRoomConfigs([]);
      loadData();
    } catch (error) {
      showToast('خطأ في حفظ البيانات', 'error');
    }
  };

  const handleDeleteHotel = async (id: string) => {
    try {
      await api.deleteHotel(id);
      showToast('تم حذف الفندق بنجاح');
      setDeleteConfirm(null);
      setSelectedHotelId('all');
      loadData();
    } catch (error) {
      showToast('خطأ في حذف الفندق', 'error');
    }
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;
    try {
      if (editingRoom.id) {
        // Update single room
        await api.saveRoom({ ...editingRoom, updatedAt: new Date().toISOString() });
        showToast('تم تحديث الغرفة بنجاح');
      } else {
        // Add single or multiple rooms
        if (roomBatchCount > 1) {
          const startNum = parseInt(editingRoom.roomNumber || '0');
          const promises = [];
          for (let i = 0; i < roomBatchCount; i++) {
            const roomNum = isNaN(startNum) ? `${editingRoom.roomNumber}_${i + 1}` : (startNum + i).toString();
            promises.push(api.saveRoom({ 
              ...editingRoom, 
              roomNumber: roomNum,
              updatedAt: new Date().toISOString() 
            }));
          }
          await Promise.all(promises);
          showToast(`تم إضافة ${roomBatchCount} غرفة بنجاح`);
        } else {
          await api.saveRoom({ ...editingRoom, updatedAt: new Date().toISOString() });
          showToast('تم إضافة الغرفة بنجاح');
        }
      }
      setShowAddRoom(false);
      setEditingRoom(null);
      setRoomBatchCount(1);
      loadData();
    } catch (error) {
      showToast('خطأ في حفظ بيانات الغرفة', 'error');
    }
  };

  const handleDeleteRoom = async (id: string) => {
    try {
      await api.deleteRoom(id);
      showToast('تم حذف الغرفة بنجاح');
      setDeleteConfirm(null);
      loadData();
    } catch (error) {
      showToast('خطأ في حذف الغرفة', 'error');
    }
  };

  const handleDeleteAllRooms = async () => {
    if (filteredRooms.length === 0) return;
    try {
      const ids = filteredRooms.map(r => r.id);
      await api.bulkDeleteRooms(ids);
      showToast('تم حذف جميع الغرف المختارة بنجاح');
      setDeleteConfirm(null);
      loadData();
    } catch (error) {
      showToast('خطأ في حذف الغرف الجماعي', 'error');
    }
  };

  const handleUpdateRange = async (roomId: string, dates: string[], status: 'booked' | 'available' | 'inactive', price: number, customerName: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    const currentAvailability = { ...(room.availability || {}) };
    const currentDailyPrices = { ...(room.dailyPrices || {}) };
    const currentCustomerNames = { ...(room.customerNames || {}) };

    dates.forEach(date => {
      currentAvailability[date] = status;
      currentDailyPrices[date] = price;
      currentCustomerNames[date] = customerName;
    });

    // Optimistic UI update
    setRooms(prev => prev.map(r => r.id === roomId ? { 
      ...r, 
      availability: currentAvailability,
      dailyPrices: currentDailyPrices,
      customerNames: currentCustomerNames
    } : r));

    try {
      setIsUpdatingAvailability(true);
      await api.saveRoom({
        id: roomId,
        availability: currentAvailability,
        dailyPrices: currentDailyPrices,
        customerNames: currentCustomerNames,
        updatedAt: new Date().toISOString()
      });
      showToast('تم تحديث البيانات بنجاح');
      setActiveCell(null);
      setSelectionStart(null);
    } catch (error) {
      console.error('Error updating range:', error);
      showToast('خطأ في تحديث البيانات', 'error');
      loadData(); // Reload to restore correct state
    } finally {
      setIsUpdatingAvailability(false);
    }
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });

  const filteredRooms = rooms.filter(room => {
    const matchesHotel = selectedHotelId === 'all' || room.hotelId === selectedHotelId;
    const matchesStatus = statusFilter === 'All' || room.status === statusFilter;
    const matchesType = typeFilter === 'All' || room.type === typeFilter;
    const matchesSearch = room.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (room.notes || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesHotel && matchesStatus && matchesType && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Vacant': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'Occupied': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'Reserved': return 'text-gold bg-gold/10 border-gold/20';
      case 'Cleaning': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'Maintenance': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      default: return 'text-white/40 bg-white/5 border-white/10';
    }
  };

  const getStatusArabic = (status: string) => {
    switch (status) {
      case 'Vacant': return 'شاغرة';
      case 'Occupied': return 'مشغولة';
      case 'Reserved': return 'محجوزة';
      case 'Cleaning': return 'تنظيف';
      case 'Maintenance': return 'صيانة';
      default: return status;
    }
  };

  const getTypeArabic = (type: string) => {
    switch (type) {
      case 'Double': return 'ثنائية';
      case 'Triple': return 'ثلاثية';
      case 'Quad': return 'رباعية';
      case 'Quint': return 'خماسية';
      default: return type;
    }
  };

  const statsRooms = selectedHotelId === 'all' 
    ? rooms 
    : rooms.filter(r => r.hotelId === selectedHotelId);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayOccupied = statsRooms.filter(r => r.availability?.[todayStr] === 'booked').length;
  const todayVacant = statsRooms.filter(r => r.availability?.[todayStr] !== 'booked').length;

  const currentMonthTotalIncome = statsRooms.reduce((acc, room) => {
    const monthDays = eachDayOfInterval({ 
      start: startOfMonth(currentDate), 
      end: endOfMonth(currentDate) 
    }).map(d => format(d, 'yyyy-MM-dd'));
    
    return acc + monthDays.reduce((sum, date) => {
      if (room.availability?.[date] === 'booked' && room.customerNames?.[date]) {
        return sum + (room.dailyPrices?.[date] || room.price || 0);
      }
      return sum;
    }, 0);
  }, 0);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="min-h-screen bg-matte-black p-8 space-y-8"
    >
      {/* Header */}
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-6">
          <Logo iconSize={40} textSize="text-4xl" className="hidden md:flex" />
          <div className="h-12 w-px bg-white/10 hidden md:block" />
          <div>
            <h2 className="text-4xl font-bold gold-text-gradient mb-2">إدارة الفنادق والغرف</h2>
            <p className="text-white/60">متابعة الغرف الشاغرة وحالة الإشغال في فنادقك</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-white/5 rounded-xl border border-white/10 p-1 mr-4">
            <button 
              onClick={() => setViewMode('grid')}
              className={clsx(
                "p-2 rounded-lg transition-all",
                viewMode === 'grid' ? "bg-gold/10 text-gold shadow-lg shadow-gold/5" : "text-white/40 hover:text-white"
              )}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setViewMode('calendar')}
              className={clsx(
                "p-2 rounded-lg transition-all",
                viewMode === 'calendar' ? "bg-gold/10 text-gold shadow-lg shadow-gold/5" : "text-white/40 hover:text-white"
              )}
            >
              <CalendarIcon className="w-5 h-5" />
            </button>
            <div className="w-px h-6 bg-white/10 mx-2 self-center" />
            <button 
              onClick={() => setShowReport(true)}
              className="p-2 rounded-lg text-white/40 hover:text-gold hover:bg-gold/10 transition-all"
              title="تقرير الحجوزات"
            >
              <FileText className="w-5 h-5" />
            </button>
          </div>
          <button 
            onClick={() => {
              setEditingHotel({ name: '', location: 'Makkah', totalRooms: 0 });
              setRoomConfigs([
                { id: Math.random().toString(36).substring(7), type: 'Double', count: 0, price: 0, startFrom: 101 },
                { id: Math.random().toString(36).substring(7), type: 'Triple', count: 0, price: 0, startFrom: 201 },
                { id: Math.random().toString(36).substring(7), type: 'Quad', count: 0, price: 0, startFrom: 301 },
                { id: Math.random().toString(36).substring(7), type: 'Quint', count: 0, price: 0, startFrom: 401 }
              ]);
              setShowAddHotel(true);
            }}
            className="btn-gold flex items-center gap-2"
          >
            <HotelIcon className="w-4 h-4" /> إضافة فندق وغرف
          </button>

          {filteredRooms.length > 0 && (
            <button 
              onClick={() => setDeleteConfirm({ type: 'all', count: filteredRooms.length })}
              className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/10 group"
              title="حذف الكل"
            >
              <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-white/40 font-bold mb-1">إجمالي الفنادق</p>
            <p className="text-2xl font-black text-white">{selectedHotelId === 'all' ? hotels.length : 1}</p>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gold/10 flex items-center justify-center text-gold">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-white/40 font-bold mb-1">إجمالي الغرف</p>
            <p className="text-2xl font-black text-white">{statsRooms.length}</p>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <DoorOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-white/40 font-bold mb-1">شاغرة اليوم</p>
            <p className="text-2xl font-black text-emerald-500">{todayVacant}</p>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
            <DoorClosed className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-white/40 font-bold mb-1">مشغولة اليوم</p>
            <p className="text-2xl font-black text-red-500">{todayOccupied}</p>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center gap-4 border border-gold/20 shadow-lg shadow-gold/5">
          <div className="w-12 h-12 rounded-2xl bg-gold flex items-center justify-center text-matte-black shadow-xl">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-white/40 font-bold mb-1">إجمالي الحجوزات</p>
            <p className="text-xl font-black text-gold leading-none">{currentMonthTotalIncome.toLocaleString()} <span className="text-[10px] opacity-60">ريال</span></p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="glass-card p-6 flex flex-wrap gap-6 items-end">
        <div className="space-y-2 flex-1 min-w-[200px]">
          <div className="flex justify-between items-center px-1">
            <label className="text-xs text-white/60 font-medium">الفندق</label>
            {selectedHotelId !== 'all' && (
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    const hotel = hotels.find(h => h.id === selectedHotelId);
                    if (hotel) {
                      setEditingHotel(hotel);
                      setShowAddHotel(true);
                    }
                  }}
                  className="text-[10px] font-bold text-gold hover:underline"
                >
                  تعديل
                </button>
                <button 
                  onClick={() => {
                    const hotel = hotels.find(h => h.id === selectedHotelId);
                    if (hotel) {
                      setDeleteConfirm({ type: 'hotel', id: hotel.id, name: hotel.name });
                    }
                  }}
                  className="text-[10px] font-bold text-red-500 hover:underline"
                >
                  حذف
                </button>
              </div>
            )}
          </div>
          <select 
            className="input-field w-full"
            value={selectedHotelId}
            onChange={(e) => setSelectedHotelId(e.target.value)}
          >
            <option value="all">كل الفنادق</option>
            {hotels.map(h => (
              <option key={h.id} value={h.id}>{h.name} - {h.location === 'Makkah' ? 'مكة' : 'المدينة'}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2 flex-1 min-w-[200px]">
          <label className="text-xs text-white/60 font-medium">حالة الغرفة</label>
          <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 overflow-x-auto">
            {(['All', 'Vacant', 'Occupied', 'Cleaning', 'Maintenance'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={clsx(
                  "flex-1 py-2 px-3 whitespace-nowrap rounded-lg text-xs font-bold transition-all",
                  statusFilter === s 
                    ? "bg-gold/10 text-gold border border-gold/20" 
                    : "text-white/40 hover:text-white"
                )}
              >
                {s === 'All' ? 'الكل' : getStatusArabic(s)}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2 flex-1 min-w-[200px]">
          <label className="text-xs text-white/60 font-medium">نوع الغرفة</label>
          <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 overflow-x-auto">
            {(['All', 'Double', 'Triple', 'Quad', 'Quint'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={clsx(
                  "flex-1 py-2 px-3 whitespace-nowrap rounded-lg text-xs font-bold transition-all",
                  typeFilter === t 
                    ? "bg-gold/10 text-gold border border-gold/20" 
                    : "text-white/40 hover:text-white"
                )}
              >
                {t === 'All' ? 'الكل' : getTypeArabic(t)}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2 flex-1 min-w-[200px]">
          <label className="text-xs text-white/60 font-medium">بحث برقم الغرفة</label>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input 
              type="text" 
              className="input-field w-full pr-10 text-right" 
              placeholder="رقم الغرفة أو ملاحظات..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-12 h-12 text-gold animate-spin" />
          <p className="text-white/40 animate-pulse">جاري تحميل البيانات...</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredRooms.map((room) => {
              const hotel = hotels.find(h => h.id === room.hotelId);
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  key={room.id}
                  className="glass-card hover:border-gold/30 transition-all group relative overflow-hidden"
                >
                  <div className={clsx(
                    "absolute top-0 right-0 left-0 h-1",
                    getStatusColor(room.status).split(' ')[1]
                  )} />
                  
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1 text-right">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-black text-white">{room.roomNumber}</span>
                          <span className="text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded border border-white/10">الطابق {room.floor}</span>
                        </div>
                        <p className="text-xs text-white/60 flex items-center justify-end gap-1">
                          {hotel?.name || 'فندق غير معروف'}
                          <HotelIcon className="w-3 h-3 text-gold" />
                        </p>
                      </div>
                      <div className={clsx(
                        "px-3 py-1.5 rounded-xl border text-[10px] font-bold tracking-wider",
                        getStatusColor(room.status)
                      )}>
                        {getStatusArabic(room.status)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center">
                        <p className="text-[10px] text-white/40 font-bold mb-1 uppercase">السعر</p>
                        <p className="text-xs font-bold text-gold flex items-center justify-center gap-1">
                          {room.price || 0} <span className="text-[8px] opacity-60">ريال</span>
                        </p>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center">
                        <p className="text-[10px] text-white/40 font-bold mb-1 uppercase">السعة</p>
                        <p className="text-xs font-bold text-white flex items-center justify-center gap-2">
                          <Users className="w-3 h-3 text-gold" />
                          {room.capacity} أشخاص
                        </p>
                      </div>
                    </div>

                    {room.notes && (
                      <p className="text-[10px] text-white/40 bg-white/5 p-2 rounded-lg italic text-right">
                        {room.notes}
                      </p>
                    )}

                    <div className="pt-4 flex items-center justify-between border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setEditingRoom(room);
                            setShowAddRoom(true);
                          }}
                          className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-gold hover:bg-gold/10 transition-all"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => setDeleteConfirm({ type: 'single', id: room.id })}
                          className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-red-500 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => {
                            if (!room.startDate || !room.endDate) {
                              showToast('لم يتم تحديد فترة ملكية لهذه الغرفة', 'warning');
                              return;
                            }
                            const rangeDays = eachDayOfInterval({ 
                              start: parseISO(room.startDate), 
                              end: parseISO(room.endDate) 
                            }).map(d => format(d, 'yyyy-MM-dd'));
                            setActiveCell({ 
                              roomId: room.id, 
                              dates: rangeDays, 
                              status: 'booked', 
                              price: room.price || 0, 
                              customerName: '' 
                            });
                          }}
                          className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all flex items-center gap-1"
                          title="حجز المدة كاملة"
                        >
                          <CalendarIcon className="w-3 h-3" />
                          <span className="text-[8px] font-bold px-1">حجز المدة</span>
                        </button>
                      </div>
                      <span className="text-[9px] text-white/20">تحديث: {new Date(room.updatedAt).toLocaleDateString('ar-LY')}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {filteredRooms.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4 bg-white/5 rounded-[2rem] border border-dashed border-white/10">
              <DoorOpen className="w-12 h-12 text-white/10" />
              <div className="text-center">
                <p className="text-xl font-bold text-white/40">لا توجد غرف تطابق البحث</p>
                <p className="text-sm text-white/20 mt-1">حاول تغيير مرشحات البحث أو أضف غرفاً جديدة</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Calendar View */
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-white/10 flex flex-wrap justify-between items-center gap-6 bg-white/[0.02]">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <h3 className="text-xl font-bold text-white min-w-[180px] text-center">
                {format(currentDate, 'MMMM yyyy', { locale: ar })}
              </h3>
              <button 
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-lg bg-emerald-500/20 border border-emerald-500/40" />
                  <span className="text-xs font-bold text-white/60">شاغرة</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-lg bg-red-500/20 border border-red-500/40" />
                  <span className="text-xs font-bold text-white/60">محجوزة</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-lg bg-white/5 border border-white/10" />
                  <span className="text-xs font-bold text-white/40">غير مملوكة</span>
                </div>
                <div className="w-px h-4 bg-white/10 mx-2" />
              <p className="text-[10px] text-white/20 mt-1">انقر على الخلية لتغيير حالة الحجز لليوم</p>
            </div>
          </div>
          
          <div className="overflow-x-auto relative custom-scrollbar">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-matte-dark">
                  <th className="sticky right-0 z-30 bg-matte-dark p-2 border-b border-l border-white/10 text-white/40 text-[9px] font-black uppercase tracking-tighter min-w-[140px]">
                    الغرفة
                  </th>
                  {days.map(day => (
                    <th key={day.toISOString()} className={clsx(
                      "p-1 border-b border-l border-white/10 text-center min-w-[32px] transition-colors",
                      isToday(day) ? "bg-gold/10" : isWeekend(day) ? "bg-white/[0.01]" : ""
                    )}>
                      <p className={clsx(
                        "text-[7px] font-black uppercase leading-none",
                        isToday(day) ? "text-gold" : "text-white/20"
                      )}>
                        {format(day, 'EEE', { locale: ar })}
                      </p>
                      <p className={clsx(
                        "text-xs font-black",
                        isToday(day) ? "text-gold" : "text-white/60"
                      )}>
                        {format(day, 'd')}
                      </p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRooms.map(room => (
                  <tr key={room.id} className="hover:bg-white/[0.01] transition-colors group">
                    <td className="sticky right-0 z-20 bg-matte-dark p-4 border-l border-white/10 shadow-[20px_0_30px_rgba(0,0,0,0.5)]">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-white">{room.roomNumber}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-gold/10 text-gold border border-gold/20 font-bold uppercase tracking-tighter">
                            {getTypeArabic(room.type)}
                          </span>
                        </div>
                        <p className="text-[10px] text-white/40 font-medium truncate max-w-[140px]">
                          {hotels.find(h => h.id === room.hotelId)?.name}
                        </p>
                      </div>
                    </td>
                    {days.map(day => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      let status = room.availability?.[dateStr] || 'available';
                      
                      // Check ownership domain
                      if ((room.startDate && dateStr < room.startDate) || (room.endDate && dateStr > room.endDate)) {
                        status = 'inactive';
                      }

                      const dailyPrice = room.dailyPrices?.[dateStr] ?? room.price ?? 0;
                      const customerName = room.customerNames?.[dateStr] || '';
                      
                      const isSelected = selectionStart?.roomId === room.id && (
                        (dateStr >= selectionStart.date && dateStr <= (selectionStart.date > dateStr ? selectionStart.date : dateStr)) ||
                        (dateStr <= selectionStart.date && dateStr >= (selectionStart.date < dateStr ? selectionStart.date : dateStr))
                      );

                      // Helper to get range
                      const getRange = (start: string, end: string) => {
                        const s = start < end ? start : end;
                        const e = start > end ? start : end;
                        return days
                          .map(d => format(d, 'yyyy-MM-dd'))
                          .filter(d => d >= s && d <= e);
                      };

                      return (
                        <td 
                          key={dateStr}
                          className="p-0.5 border-l border-white/5 cursor-pointer group/cell relative"
                          onClick={(e) => {
                            if (e.shiftKey && selectionStart && selectionStart.roomId === room.id) {
                              const range = getRange(selectionStart.date, dateStr);
                              setActiveCell({ 
                                roomId: room.id, 
                                dates: range, 
                                status, 
                                price: dailyPrice,
                                customerName 
                              });
                            } else {
                              setSelectionStart({ roomId: room.id, date: dateStr });
                              setActiveCell({ 
                                roomId: room.id, 
                                dates: [dateStr], 
                                status, 
                                price: dailyPrice,
                                customerName 
                              });
                            }
                          }}
                        >
                          <motion.div 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={clsx(
                              "h-10 rounded-lg transition-all border flex flex-col items-center justify-center gap-0.5 overflow-hidden",
                              status === 'available' 
                                ? "bg-emerald-500/5 border-emerald-500/10 group-hover/cell:bg-emerald-500/20 group-hover/cell:border-emerald-500/40" 
                                : status === 'booked'
                                  ? "bg-red-500/10 border-red-500/20 group-hover/cell:bg-red-500/20 group-hover/cell:border-red-500/40"
                                  : "bg-white/5 border-white/10 opacity-30 cursor-not-allowed",
                              selectionStart?.roomId === room.id && selectionStart.date === dateStr && "ring-2 ring-gold shadow-lg shadow-gold/20"
                            )}
                          >
                            <div className={clsx(
                              "w-1 h-1 rounded-full",
                              status === 'available' ? "bg-emerald-500" : status === 'booked' ? "bg-red-500" : "bg-white/20"
                            )} />
                            <span className={clsx(
                              "text-[8px] font-black tracking-tighter",
                              status === 'available' ? "text-white/60" : status === 'booked' ? "text-white/80" : "text-white/20"
                            )}>
                              {status === 'inactive' ? '-' : dailyPrice}
                            </span>
                            {customerName && status !== 'inactive' && (
                              <>
                                <div className="absolute top-0 right-0 p-0.5">
                                  <div className="w-1 h-1 rounded-full bg-gold animate-pulse" />
                                </div>
                                {/* Simple Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gold text-matte-black text-[9px] font-black rounded-md shadow-2xl opacity-0 group-hover/cell:opacity-100 transition-all transform scale-90 group-hover/cell:scale-100 pointer-events-none whitespace-nowrap z-[100] border border-white/20">
                                  {customerName}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-[4px] border-x-transparent border-t-[4px] border-t-gold" />
                                </div>
                              </>
                            )}
                            {isToday(day) && (
                              <div className="absolute inset-0 border border-gold/40 rounded-lg pointer-events-none" />
                            )}
                          </motion.div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredRooms.length === 0 && (
            <div className="p-20 text-center text-white/20 font-bold">
              لا توجد غرف متاحة للعرض في هذا الفندق
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Hotel Modal */}
      <AnimatePresence>
        {showAddHotel && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddHotel(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-matte-black border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold text-white tracking-tight">{editingHotel?.id ? 'تعديل فندق' : 'إضافة فندق جديد'}</h3>
                <button 
                  onClick={() => setShowAddHotel(false)}
                  className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveHotel} className="space-y-6 text-right">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase px-2">اسم الفندق</label>
                  <input 
                    required
                    type="text"
                    className="input-field w-full text-right"
                    value={editingHotel?.name}
                    onChange={(e) => setEditingHotel({ ...editingHotel, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase px-2">عدد الغرف</label>
                    <input 
                      type="number"
                      className="input-field w-full text-right"
                      value={editingHotel?.totalRooms}
                      onChange={(e) => setEditingHotel({ ...editingHotel, totalRooms: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase px-2">الموقع</label>
                    <select 
                      className="input-field w-full text-right"
                      value={editingHotel?.location}
                      onChange={(e) => setEditingHotel({ ...editingHotel, location: e.target.value as any })}
                    >
                      <option value="Makkah">مكة المكرمة</option>
                      <option value="Madinah">المدينة المنورة</option>
                    </select>
                  </div>
                </div>

                {!editingHotel?.id && (
                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex justify-between items-center px-2">
                      <h4 className="text-sm font-bold text-white/60">توصيف الغرف</h4>
                      <button 
                        type="button"
                        onClick={() => setRoomConfigs(prev => [...prev, { id: Math.random().toString(36).substring(7), type: 'Double', count: 0, price: 0, startFrom: 101 }])}
                        className="text-[10px] font-black text-gold hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> إضافة نوع يدوي
                      </button>
                    </div>
                    <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                      {roomConfigs.map((config, idx) => (
                        <div key={config.id} className="grid grid-cols-12 gap-2 items-end bg-white/[0.02] p-3 rounded-2xl border border-white/5 relative group">
                          <div className="col-span-4 space-y-1">
                            <label className="text-[10px] text-white/20 font-bold px-1">{getTypeArabic(config.type)}</label>
                            <select 
                              className="input-field w-full text-[10px] py-1.5 px-2"
                              value={config.type}
                              onChange={(e) => {
                                const val = e.target.value as any;
                                setRoomConfigs(prev => prev.map(c => c.id === config.id ? { ...c, type: val } : c));
                              }}
                            >
                              <option value="Double">ثنائية</option>
                              <option value="Triple">ثلاثية</option>
                              <option value="Quad">رباعية</option>
                              <option value="Quint">خماسية</option>
                            </select>
                          </div>
                          <div className="col-span-2 space-y-1">
                            <label className="text-[10px] text-white/20 font-bold px-1">العدد</label>
                            <input 
                              type="number"
                              className="input-field w-full text-[10px] py-1.5 px-2 text-center"
                              value={config.count}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setRoomConfigs(prev => {
                                  const updated = prev.map(c => c.id === config.id ? { ...c, count: val } : c);
                                  const total = updated.reduce((acc, curr) => acc + curr.count, 0);
                                  setEditingHotel(prevHotel => prevHotel ? { ...prevHotel, totalRooms: total } : null);
                                  return updated;
                                });
                              }}
                            />
                          </div>
                          <div className="col-span-3 space-y-1">
                            <label className="text-[10px] text-white/20 font-bold px-1">السعر</label>
                            <input 
                              type="number"
                              className="input-field w-full text-[10px] py-1.5 px-2 text-center"
                              value={config.price}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setRoomConfigs(prev => prev.map(c => c.id === config.id ? { ...c, price: val } : c));
                              }}
                            />
                          </div>
                          <div className="col-span-2 space-y-1">
                            <label className="text-[10px] text-white/20 font-bold px-1">يبدأ من</label>
                            <input 
                              type="number"
                              className="input-field w-full text-[10px] py-1.5 px-2 text-center"
                              value={config.startFrom}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setRoomConfigs(prev => prev.map(c => c.id === config.id ? { ...c, startFrom: val } : c));
                              }}
                            />
                          </div>
                          <div className="col-span-1 pt-1 flex justify-center">
                            {(roomConfigs.length > 1 || config.count > 0) && (
                              <button 
                                type="button"
                                onClick={() => setRoomConfigs(prev => prev.filter(c => c.id !== config.id))}
                                className="p-1.5 rounded-lg text-red-500/40 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <button type="submit" className="w-full btn-gold py-4 text-lg font-bold flex items-center justify-center gap-3">
                    <Save className="w-5 h-5" />
                    {editingHotel?.id ? 'تحديث الفندق' : 'حفظ الفندق والغرف'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Room Modal */}
      <AnimatePresence>
        {showAddRoom && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddRoom(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-matte-black border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold text-white tracking-tight">{editingRoom?.id ? 'تعديل غرفة' : 'إضافة غرف جديدة'}</h3>
                <button 
                  onClick={() => setShowAddRoom(false)}
                  className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveRoom} className="space-y-6 text-right">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase px-2">رقم الغرفة (أو رقم البداية)</label>
                    <input 
                      required
                      type="text"
                      className="input-field w-full text-right"
                      value={editingRoom?.roomNumber}
                      onChange={(e) => setEditingRoom({ ...editingRoom, roomNumber: e.target.value })}
                      placeholder="مثال: 101"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase px-2">الفندق</label>
                    <select 
                      required
                      className="input-field w-full text-right"
                      value={editingRoom?.hotelId}
                      onChange={(e) => setEditingRoom({ ...editingRoom, hotelId: e.target.value })}
                    >
                      {hotels.map(h => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {!editingRoom?.id && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase px-2">عدد الغرف المراد إضافتها</label>
                    <input 
                      type="number"
                      min="1"
                      max="50"
                      className="input-field w-full text-right"
                      value={roomBatchCount}
                      onChange={(e) => setRoomBatchCount(parseInt(e.target.value) || 1)}
                    />
                    <p className="text-[10px] text-white/20 mt-1">سيتم إنشاء غرف متلسلة بدءاً من الرقم المدخل أعلاه</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase px-2">نوع الغرفة</label>
                    <select 
                      className="input-field w-full text-right"
                      value={editingRoom?.type}
                      onChange={(e) => {
                        const type = e.target.value as any;
                        const capacity = type === 'Double' ? 2 : type === 'Triple' ? 3 : type === 'Quad' ? 4 : 5;
                        setEditingRoom({ ...editingRoom, type, capacity });
                      }}
                    >
                      <option value="Double">ثنائية</option>
                      <option value="Triple">ثلاثية</option>
                      <option value="Quad">رباعية</option>
                      <option value="Quint">خماسية</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase px-2">الطابق</label>
                    <input 
                      type="text"
                      className="input-field w-full text-right"
                      value={editingRoom?.floor}
                      onChange={(e) => setEditingRoom({ ...editingRoom, floor: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase px-2">السعة قصوى</label>
                    <input 
                      type="number"
                      className="input-field w-full text-right"
                      value={editingRoom?.capacity}
                      onChange={(e) => setEditingRoom({ ...editingRoom, capacity: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase px-2">السعر (لكل ليلة)</label>
                    <input 
                      type="number"
                      className="input-field w-full text-right"
                      value={editingRoom?.price}
                      onChange={(e) => setEditingRoom({ ...editingRoom, price: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase px-2">الحالة</label>
                    <select 
                      className="input-field w-full text-right"
                      value={editingRoom?.status}
                      onChange={(e) => setEditingRoom({ ...editingRoom, status: e.target.value as any })}
                    >
                      <option value="Vacant">شاغرة</option>
                      <option value="Occupied">مشغولة</option>
                      <option value="Reserved">محجوزة</option>
                      <option value="Cleaning">تنظيف</option>
                      <option value="Maintenance">صيانة</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase px-2">تاريخ بداية الملكية</label>
                    <input 
                      required
                      type="date"
                      className="input-field w-full text-right"
                      value={editingRoom?.startDate || ''}
                      onChange={(e) => {
                        const start = e.target.value;
                        const currentNights = editingRoom?.startDate && editingRoom?.endDate 
                          ? differenceInDays(parseISO(editingRoom.endDate), parseISO(editingRoom.startDate)) + 1 
                          : 1;
                        const end = format(addDays(parseISO(start), currentNights - 1), 'yyyy-MM-dd');
                        setEditingRoom({ ...editingRoom, startDate: start, endDate: end });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase px-2">عدد الليالي (فترة الملكية)</label>
                    <input 
                      id="nights-count"
                      type="number"
                      min="1"
                      className="input-field w-full text-right"
                      value={editingRoom?.startDate && editingRoom?.endDate 
                        ? differenceInDays(parseISO(editingRoom.endDate), parseISO(editingRoom.startDate)) + 1 
                        : 1}
                      onChange={(e) => {
                        const nights = parseInt(e.target.value) || 1;
                        if (editingRoom?.startDate) {
                          const end = format(addDays(parseISO(editingRoom.startDate), nights - 1), 'yyyy-MM-dd');
                          setEditingRoom({ ...editingRoom, endDate: end });
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase px-2">ملاحظات</label>
                  <textarea 
                    className="input-field w-full h-24 resize-none text-right"
                    value={editingRoom?.notes || ''}
                    onChange={(e) => setEditingRoom({ ...editingRoom, notes: e.target.value })}
                  />
                </div>

                <div className="pt-4">
                  <button type="submit" className="w-full btn-gold py-4 text-lg font-bold flex items-center justify-center gap-3">
                    <Save className="w-5 h-5" />
                    حفظ الغرفة
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className={clsx(
              "fixed bottom-8 left-8 z-[200] flex items-center gap-3 px-6 py-4 rounded-2xl border backdrop-blur-xl shadow-2xl min-w-[320px]",
              toast.type === 'success' ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500" :
              toast.type === 'error' ? "border-red-500/50 bg-red-500/10 text-red-500" :
              toast.type === 'warning' ? "border-amber-500/50 bg-amber-500/10 text-amber-500" :
              "border-blue-500/50 bg-blue-500/10 text-blue-500"
            )}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : 
             toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
            <span className="font-bold flex-1">{toast.message}</span>
            <button onClick={() => setToast(null)}>
              <X className="w-4 h-4 opacity-40 hover:opacity-100" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Cell Action Modal */}
      <AnimatePresence>
        {activeCell && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveCell(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-matte-black border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    {activeCell.dates.length > 1 ? `تعديل ${activeCell.dates.length} أيام` : 'تعديل اليوم'}
                  </h3>
                  <p className="text-xs text-white/40 mt-1">
                    {activeCell.dates.length > 1 
                      ? `من ${format(parseISO(activeCell.dates[0]), 'd MMMM')} إلى ${format(parseISO(activeCell.dates[activeCell.dates.length - 1]), 'd MMMM')}`
                      : format(parseISO(activeCell.dates[0]), 'EEEE, d MMMM yyyy', { locale: ar })}
                  </p>
                </div>
                <button 
                  onClick={() => setActiveCell(null)}
                  className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6 text-right">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase px-2">اسم الزبون</label>
                  <input 
                    type="text"
                    className="input-field w-full text-right"
                    placeholder="أدخل اسم الزبون..."
                    value={activeCell.customerName}
                    onChange={(e) => setActiveCell({ ...activeCell, customerName: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center px-2">
                    <label className="text-xs font-bold text-white/40 uppercase">حالة الملكية والتوفر</label>
                    <button
                      onClick={() => {
                        const room = rooms.find(r => r.id === activeCell.roomId);
                        if (!room || !room.startDate || !room.endDate) {
                          showToast('تعذر العثور على فترة ملكية الغرفة', 'warning');
                          return;
                        }
                        const rangeDays = eachDayOfInterval({ 
                          start: parseISO(room.startDate), 
                          end: parseISO(room.endDate) 
                        }).map(d => format(d, 'yyyy-MM-dd'));
                        setActiveCell({ ...activeCell, dates: rangeDays, status: 'booked' });
                      }}
                      className="text-[10px] font-black text-gold hover:underline"
                    >
                      حجز المدة كاملة
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setActiveCell({ ...activeCell, status: 'available' })}
                      className={clsx(
                        "py-3 rounded-xl border text-[10px] font-black transition-all",
                        activeCell.status === 'available' 
                          ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-500" 
                          : "bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10"
                      )}
                    >
                      شاغرة
                    </button>
                    <button
                      onClick={() => setActiveCell({ ...activeCell, status: 'booked' })}
                      className={clsx(
                        "py-3 rounded-xl border text-[10px] font-black transition-all",
                        activeCell.status === 'booked' 
                          ? "bg-red-500/10 border-red-500/50 text-red-500" 
                          : "bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10"
                      )}
                    >
                      محجوزة
                    </button>
                    <button
                      onClick={() => setActiveCell({ ...activeCell, status: 'inactive' })}
                      className={clsx(
                        "py-3 rounded-xl border text-[10px] font-black transition-all",
                        activeCell.status === 'inactive' 
                          ? "bg-white/20 border-white/40 text-white" 
                          : "bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10"
                      )}
                    >
                      غير مملوكة
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase px-2">عدد الليالي</label>
                    <input 
                      type="number"
                      min="1"
                      className="input-field w-full text-right"
                      value={activeCell.dates.length}
                      onChange={(e) => {
                        const nights = parseInt(e.target.value) || 1;
                        const start = activeCell.dates[0];
                        const newDates = Array.from({ length: nights }, (_, i) => {
                          const date = parseISO(start);
                          date.setDate(date.getDate() + i);
                          return format(date, 'yyyy-MM-dd');
                        });
                        setActiveCell({ ...activeCell, dates: newDates });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase px-2">سعر الليلة</label>
                    <div className="relative">
                      <input 
                        type="number"
                        className="input-field w-full text-right text-lg font-bold text-gold"
                        value={activeCell.price}
                        onChange={(e) => setActiveCell({ ...activeCell, price: parseInt(e.target.value) || 0 })}
                      />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/20">ريال</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    onClick={() => handleUpdateRange(activeCell.roomId, activeCell.dates, activeCell.status, activeCell.price, activeCell.customerName)}
                    disabled={isUpdatingAvailability}
                    className="w-full btn-gold py-4 text-lg font-bold flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isUpdatingAvailability ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    حفظ التغييرات
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-matte-black border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden text-center"
            >
              <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mx-auto mb-6">
                <AlertCircle className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">تأكيد الحذف</h3>
              <p className="text-white/60 mb-8 leading-relaxed">
                {deleteConfirm.type === 'hotel' 
                  ? `هل أنت متأكد من حذف فندق "${deleteConfirm.name}"؟ سيتم حذف جميع الغرف المرتبطة به نهائياً.`
                  : deleteConfirm.type === 'all' 
                    ? (selectedHotelId === 'all' 
                        ? `هل أنت متأكد من حذف جميع الغرف (${deleteConfirm.count}) في جميع الفنادق؟` 
                        : `هل أنت متأكد من حذف جميع الغرف (${deleteConfirm.count}) في الفندق المختار؟`)
                    : 'هل أنت متأكد من حذف هذه الغرفة؟ لا يمكن التراجع عن هذا الإجراء.'}
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setDeleteConfirm(null)}
                  className="py-4 rounded-2xl bg-white/5 text-white/40 font-bold hover:bg-white/10 transition-all border border-white/5"
                >
                  إلغاء
                </button>
                <button 
                  onClick={() => {
                    if (deleteConfirm.type === 'all') {
                      handleDeleteAllRooms();
                    } else if (deleteConfirm.type === 'hotel' && deleteConfirm.id) {
                      handleDeleteHotel(deleteConfirm.id);
                    } else if (deleteConfirm.id) {
                      handleDeleteRoom(deleteConfirm.id);
                    }
                  }}
                  className="py-4 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  نعم، احذف
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Booking Report Modal */}
      <AnimatePresence>
        {showReport && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReport(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-5xl max-h-[90vh] bg-matte-black border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Report Header */}
              <div className="p-8 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
                <div className="text-right">
                  <h3 className="text-2xl font-bold text-white mb-1">تقرير حجوزات الشهر</h3>
                  <p className="text-white/40 font-medium">
                    {format(currentDate, 'MMMM yyyy', { locale: ar })} - {selectedHotelId === 'all' ? 'جميع الفنادق' : hotels.find(h => h.id === selectedHotelId)?.name}
                  </p>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gold text-black font-bold hover:bg-gold/90 transition-all shadow-lg shadow-gold/20 no-print"
                  >
                    <Printer className="w-5 h-5" /> طباعة التقارير
                  </button>
                  <button 
                    onClick={() => setShowReport(false)}
                    className="w-12 h-12 rounded-2xl bg-white/5 text-white/40 flex items-center justify-center hover:bg-white/10 transition-all no-print"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Report Content */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="py-4 px-6 text-xs font-black text-white/30 uppercase tracking-widest bg-white/[0.02] rounded-tr-2xl">رقم الغرفة</th>
                        <th className="py-4 px-6 text-xs font-black text-white/30 uppercase tracking-widest bg-white/[0.02]">النوع</th>
                        <th className="py-4 px-6 text-xs font-black text-white/30 uppercase tracking-widest bg-white/[0.02]">اسم الزبون</th>
                        <th className="py-4 px-6 text-xs font-black text-white/30 uppercase tracking-widest bg-white/[0.02]">الفترة</th>
                        <th className="py-4 px-6 text-xs font-black text-white/30 uppercase tracking-widest bg-white/[0.02]">الليالي</th>
                        <th className="py-4 px-6 text-xs font-black text-white/30 uppercase tracking-widest bg-white/[0.02] rounded-tl-2xl">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {(() => {
                        const reportItems: any[] = [];
                        filteredRooms.forEach(room => {
                          const monthDays = eachDayOfInterval({ 
                            start: startOfMonth(currentDate), 
                            end: endOfMonth(currentDate) 
                          }).map(d => format(d, 'yyyy-MM-dd'));

                          let current: any = null;

                          monthDays.forEach(dateStr => {
                            const customer = room.customerNames?.[dateStr];
                            const isBooked = room.availability?.[dateStr] === 'booked';
                            const price = room.dailyPrices?.[dateStr] || 0;

                            if (isBooked && customer) {
                              if (current && current.customerName === customer) {
                                current.totalPrice += price;
                                current.endDate = dateStr;
                                current.nights += 1;
                              } else {
                                if (current) reportItems.push(current);
                                current = {
                                  customerName: customer,
                                  roomNumber: room.roomNumber,
                                  roomType: getTypeArabic(room.type),
                                  totalPrice: price,
                                  startDate: dateStr,
                                  endDate: dateStr,
                                  nights: 1
                                };
                              }
                            } else {
                              if (current) reportItems.push(current);
                              current = null;
                            }
                          });
                          if (current) reportItems.push(current);
                        });

                        if (reportItems.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="py-20 text-center text-white/20 italic">لا توجد حجوزات مسجلة لهذا الشهر</td>
                            </tr>
                          );
                        }

                        // Aggregate by customer and room to handle split periods of same customer if needed, 
                        // but let's keep them as segments for clarity of the dates

                        return reportItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="py-5 px-6">
                              <span className="font-mono font-black text-white group-hover:text-gold transition-colors">{item.roomNumber}</span>
                            </td>
                            <td className="py-5 px-6">
                              <span className="text-xs text-white/40 font-bold">{item.roomType}</span>
                            </td>
                            <td className="py-5 px-6">
                              <span className="text-sm font-bold text-gold">{item.customerName}</span>
                            </td>
                            <td className="py-5 px-6">
                              <div className="flex flex-col">
                                <span className="text-[10px] text-white/40 font-bold tracking-tight">من: {format(parseISO(item.startDate), 'dd/MM')}</span>
                                <span className="text-[10px] text-white/40 font-bold tracking-tight">إلى: {format(parseISO(item.endDate), 'dd/MM')}</span>
                              </div>
                            </td>
                            <td className="py-5 px-6 text-center">
                              <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-black text-white/60">{item.nights}</span>
                            </td>
                            <td className="py-5 px-6">
                              <span className="text-lg font-black text-emerald-500">{item.totalPrice.toLocaleString()} <span className="text-[10px] opacity-40 font-normal">ريال</span></span>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Report Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-dashed border-white/10">
                  <div className="bg-white/5 rounded-[1.5rem] p-6 text-center border border-white/5">
                    <p className="text-[10px] text-white/40 font-bold uppercase mb-2">إجمالي عدد الحجوزات</p>
                    <p className="text-3xl font-black text-white">
                      {(() => {
                        let total = 0;
                        filteredRooms.forEach(room => {
                          const monthDays = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) }).map(d => format(d, 'yyyy-MM-dd'));
                          let lastCust = null;
                          monthDays.forEach(d => {
                            const c = room.customerNames?.[d];
                            if (c && room.availability?.[d] === 'booked') {
                              if (c !== lastCust) { total++; lastCust = c; }
                            } else { lastCust = null; }
                          });
                        });
                        return total;
                      })()}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-[1.5rem] p-6 text-center border border-white/5">
                    <p className="text-[10px] text-white/40 font-bold uppercase mb-2">إجمالي الليالي</p>
                    <p className="text-3xl font-black text-gold">
                      {filteredRooms.reduce((acc, room) => {
                         const monthDays = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) }).map(d => format(d, 'yyyy-MM-dd'));
                         return acc + monthDays.filter(d => room.availability?.[d] === 'booked' && room.customerNames?.[d]).length;
                      }, 0)}
                    </p>
                  </div>
                  <div className="bg-emerald-500/10 rounded-[1.5rem] p-6 text-center border border-emerald-500/20">
                    <p className="text-[10px] text-emerald-500/60 font-bold uppercase mb-2">إجمالي الدخل المتوقع</p>
                    <p className="text-3xl font-black text-emerald-500">
                      {filteredRooms.reduce((acc, room) => {
                         const monthDays = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) }).map(d => format(d, 'yyyy-MM-dd'));
                         return acc + monthDays.reduce((sum, d) => {
                           if (room.availability?.[d] === 'booked' && room.customerNames?.[d]) {
                             return sum + (room.dailyPrices?.[d] || 0);
                           }
                           return sum;
                         }, 0);
                      }, 0).toLocaleString()} <span className="text-sm font-normal">ريال</span>
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
