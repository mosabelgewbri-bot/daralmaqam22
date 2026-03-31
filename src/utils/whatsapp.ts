export const sendWhatsAppMessage = (phone: string, message: string) => {
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
};

export const formatPhoneNumber = (phone: string) => {
  return phone.replace(/\D/g, '');
};

export const generateWelcomeMessage = (customerName: string, tripName: string) => {
  return `Hello ${customerName}, welcome to your Umrah trip: ${tripName}. We are glad to have you with us!`;
};
