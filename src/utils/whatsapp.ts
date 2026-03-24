
export const sendWhatsAppMessage = (phone: string, message: string) => {
  // Remove any non-numeric characters from phone
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Add country code if missing (assuming Libya +218 as default if it starts with 09)
  let formattedPhone = cleanPhone;
  if (cleanPhone.startsWith('09')) {
    formattedPhone = '218' + cleanPhone.substring(1);
  } else if (cleanPhone.startsWith('9')) {
    formattedPhone = '218' + cleanPhone;
  }

  const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
};

export const generateWelcomeMessage = (headName: string, tripName: string) => {
  return `السلام عليكم سيد/ة ${headName}،\n\nيسعدنا تأكيد تسجيلكم في رحلة ${tripName} مع شركة دار المقام لإدارة العمرة. نتمنى لكم عمرة مقبولة ورحلة ميسرة.\n\nسنوافيكم بكافة التفاصيل والمستجدات قريباً.`;
};

export const generateTripDetailsMessage = (booking: any, trip: any) => {
  return `تفاصيل رحلة العمرة - دار المقام\n\nالمعتمر: ${booking.headName}\nالرحلة: ${trip.name}\nتاريخ المغادرة: ${trip.departureDate || 'سيتم تحديده'}\nشركة الطيران: ${trip.airline}\nفندق مكة: ${booking.makkahHotel}\nفندق المدينة: ${booking.madinahHotel}\n\nيرجى التواجد في المطار قبل موعد الرحلة بـ 4 ساعات.`;
};
