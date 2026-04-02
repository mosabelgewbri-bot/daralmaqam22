import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Save, X, Plus, Trash2, User, Phone, MapPin, Calendar, CreditCard } from 'lucide-react';
import { Booking, Trip, Pilgrim } from '../types';

interface BookingFormProps {
  trip?: Trip;
  booking?: Booking;
  onSave: (booking: Partial<Booking>, pilgrims: Partial<Pilgrim>[]) => void;
  onCancel: () => void;
}

const BookingForm: React.FC<BookingFormProps> = ({ trip, booking, onSave, onCancel }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Partial<Booking>>(booking || {
    tripId: trip?.id || '',
    status: 'pending',
    totalAmount: trip?.price || 0,
    paidAmount: 0,
    currency: trip?.currency || 'SAR',
    pilgrimsCount: 1,
  });

  const [pilgrims, setPilgrims] = useState<Partial<Pilgrim>[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData, pilgrims);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white p-8 rounded-2xl shadow-2xl max-w-4xl w-full mx-auto"
    >
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="text-primary w-6 h-6" />
          {booking ? t('bookings.editBooking') : t('bookings.newBooking')}
        </h2>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              {t('bookings.customerName')}
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" />
              {t('bookings.customerPhone')}
            </label>
            <input
              type="tel"
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              {t('bookings.totalAmount')}
            </label>
            <div className="relative">
              <input
                type="number"
                required
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                value={formData.totalAmount || 0}
                onChange={(e) => setFormData({ ...formData, totalAmount: Number(e.target.value) })}
              />
              <span className="absolute left-3 top-2 text-gray-400">{formData.currency}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              {t('bookings.paidAmount')}
            </label>
            <div className="relative">
              <input
                type="number"
                required
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                value={formData.paidAmount || 0}
                onChange={(e) => setFormData({ ...formData, paidAmount: Number(e.target.value) })}
              />
              <span className="absolute left-3 top-2 text-gray-400">{formData.currency}</span>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{t('bookings.pilgrims')}</h3>
            <button
              type="button"
              onClick={() => setPilgrims([...pilgrims, {}])}
              className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('bookings.addPilgrim')}
            </button>
          </div>

          <div className="space-y-4">
            {pilgrims.map((pilgrim, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-xl border border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4 relative">
                <button
                  type="button"
                  onClick={() => setPilgrims(pilgrims.filter((_, i) => i !== index))}
                  className="absolute -top-2 -left-2 bg-white text-red-500 p-1 rounded-full shadow-sm border border-red-100 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <input
                  placeholder={t('pilgrims.name')}
                  className="px-3 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary"
                  value={pilgrim.name || ''}
                  onChange={(e) => {
                    const newPilgrims = [...pilgrims];
                    newPilgrims[index].name = e.target.value;
                    setPilgrims(newPilgrims);
                  }}
                />
                <input
                  placeholder={t('pilgrims.passportNumber')}
                  className="px-3 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary"
                  value={pilgrim.passportNumber || ''}
                  onChange={(e) => {
                    const newPilgrims = [...pilgrims];
                    newPilgrims[index].passportNumber = e.target.value;
                    setPilgrims(newPilgrims);
                  }}
                />
                <input
                  placeholder={t('pilgrims.nationality')}
                  className="px-3 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-primary"
                  value={pilgrim.nationality || ''}
                  onChange={(e) => {
                    const newPilgrims = [...pilgrims];
                    newPilgrims[index].nationality = e.target.value;
                    setPilgrims(newPilgrims);
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-8 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            className="px-6 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {t('common.save')}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default BookingForm;
