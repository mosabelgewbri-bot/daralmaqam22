import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Download, 
  Send, 
  Save, 
  X, 
  Edit2, 
  ChevronRight, 
  ChevronLeft,
  Search,
  Users,
  MessageSquare,
  FileText,
  Share2,
  Check,
  Copy,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';
import { User, UmrahOffer, UmrahOfferRow, Booking, Pilgrim } from '../types';
import { clsx } from 'clsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  Document, 
  Packer, 
  Paragraph, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  AlignmentType, 
  TextRun, 
  TableLayoutType,
  VerticalAlign,
  ImageRun,
  Header,
  Footer,
  HorizontalPositionRelativeFrom,
  VerticalPositionRelativeFrom
} from 'docx';
import { saveAs } from 'file-saver';
import Logo from './Logo';

interface UmrahOffersModuleProps {
  user: User;
}

const DEFAULT_FIXED_TEXT = `
كافة البرامج أعلاه للفرد الواحد وتشمل الآتي:
• التأشيرة والمواصلات والسكن حسب البرنامج أعلاه
• المستندات المطلوبة – جواز سفر إلكتروني بصلاحية 6 أشهر على الأقل- صورة خلفية بيضاء
• الأسعار خاصة برحلات 1 رمضان / 3 رمضان أسبوعين
• الشركة غير مسؤولة على تغيير مواعيد الطيران
• هذا الأسعار لا تشمل تذاكر الطيران

• فندق النخبة في شارع اجياد مسافة 1000 م علي الحرم مشي علي الاقدام مع توافر حافلات خاصة بفنذق علي مدار 24 ساعة ذهاب و عودة مجانا
• فندق مدن الخير في منطقة العزيزية مسافة 2500 م بالقرب من جميع الخدامات و توافر حافلات خاصة بفنذق علي مدار 24 ساعة ذهاب و عودة مجانا

زاوية الدهماني بالقرب من سوق الشط - طرابلس - ليبيا
0948470011 – 0947470010 - 0918470011 - 0919470011
`;

export default function UmrahOffersModule({ user }: UmrahOffersModuleProps) {
  const [offers, setOffers] = useState<UmrahOffer[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentOffer, setCurrentOffer] = useState<Partial<UmrahOffer>>({
    name: '',
    documentTitle: 'شركة دار المقام للخدمات السياحية والحج والعمرة',
    category: 'الاقتصادي',
    fixedText: DEFAULT_FIXED_TEXT,
    rows: [{
      makkah: '',
      madinah: '',
      offer: '',
      meals: 'بدون وجبات',
      double: 0,
      triple: 0,
      quad: 0,
      quint: 0,
      currency: 'USD'
    }]
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedOfferForShare, setSelectedOfferForShare] = useState<UmrahOffer | null>(null);
  const [pilgrims, setPilgrims] = useState<Pilgrim[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [offersData, pilgrimsData, bookingsData] = await Promise.all([
        api.getUmrahOffers(),
        api.getPilgrims(),
        api.getBookings()
      ]);
      setOffers(offersData);
      setPilgrims(pilgrimsData);
      setBookings(bookingsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRow = () => {
    setCurrentOffer(prev => ({
      ...prev,
      rows: [
        ...(prev.rows || []),
        {
          makkah: '',
          madinah: '',
          offer: '',
          meals: 'بدون وجبات',
          double: 0,
          triple: 0,
          quad: 0,
          quint: 0,
          currency: 'USD'
        }
      ]
    }));
  };

  const handleRemoveRow = (index: number) => {
    setCurrentOffer(prev => ({
      ...prev,
      rows: (prev.rows || []).filter((_, i) => i !== index)
    }));
  };

  const handleRowChange = (index: number, field: keyof UmrahOfferRow, value: any) => {
    setCurrentOffer(prev => {
      const newRows = [...(prev.rows || [])];
      newRows[index] = { ...newRows[index], [field]: value };
      return { ...prev, rows: newRows };
    });
  };

  const handleSave = async () => {
    if (!currentOffer.name) {
      alert('يرجى إدخال اسم العرض');
      return;
    }
    try {
      await api.saveUmrahOffer(currentOffer as UmrahOffer);
      setIsEditing(false);
      fetchData();
    } catch (error) {
      console.error('Error saving offer:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا العرض؟')) return;
    try {
      await api.deleteUmrahOffer(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting offer:', error);
    }
  };

  const exportToPDF = async (offer: UmrahOffer) => {
    if (!previewRef.current) return;
    
    try {
      // Ensure fonts are loaded
      if (document.fonts) {
        await document.fonts.ready;
      }

      // Small delay to ensure layout is stable
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(previewRef.current, {
        scale: 4, 
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: previewRef.current.scrollWidth,
        windowHeight: previewRef.current.scrollHeight,
        onclone: (clonedDoc) => {
          const element = clonedDoc.getElementById('umrah-offer-preview');
          if (element instanceof HTMLElement) {
            element.style.fontFamily = '"Cairo", "Amiri", serif';
            element.style.backgroundImage = 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' stroke=\'%23d4af37\' stroke-width=\'0.8\' stroke-opacity=\'0.15\'%3E%3Cpath d=\'M30 0 L40 20 L60 30 L40 40 L30 60 L20 40 L0 30 L20 20 Z\'/%3E%3Cpath d=\'M0 0 L20 10 L30 30 L10 20 Z\'/%3E%3Cpath d=\'M60 0 L40 10 L30 30 L50 20 Z\'/%3E%3Cpath d=\'M60 60 L40 50 L30 30 L50 40 Z\'/%3E%3Cpath d=\'M0 60 L20 50 L30 30 L10 40 Z\'/%3E%3C/g%3E%3C/svg%3E")';
          }
        }
      });
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      pdf.save(`عرض_عمرة_${offer.name}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('حدث خطأ أثناء تصدير ملف PDF. يرجى المحاولة مرة أخرى.');
    }
  };

  const exportToWord = async (offer: UmrahOffer) => {
    try {
      // SVG for the Islamic pattern - More complex and elegant
      const patternSvg = `<svg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'>
        <g fill='none' stroke='%23d4af37' stroke-width='0.5' stroke-opacity='0.08'>
          <path d='M100 0 L120 40 L160 60 L120 80 L100 120 L80 80 L40 60 L80 40 Z'/>
          <path d='M0 0 L40 20 L60 60 L20 40 Z'/>
          <path d='M200 0 L160 20 L140 60 L180 40 Z'/>
          <path d='M200 200 L160 180 L140 140 L180 160 Z'/>
          <path d='M0 200 L40 180 L60 140 L20 160 Z'/>
          <circle cx='100' cy='100' r='10' />
          <path d='M100 20 L110 45 L135 55 L110 65 L100 90 L90 65 L65 55 L90 45 Z' transform='translate(0, 80)' />
          <path d='M100 20 L110 45 L135 55 L110 65 L100 90 L90 65 L65 55 L90 45 Z' transform='translate(0, -80)' />
          <path d='M100 20 L110 45 L135 55 L110 65 L100 90 L90 65 L65 55 L90 45 Z' transform='translate(80, 0)' />
          <path d='M100 20 L110 45 L135 55 L110 65 L100 90 L90 65 L65 55 L90 45 Z' transform='translate(-80, 0)' />
        </g>
      </svg>`;
      const patternBase64 = `data:image/svg+xml;base64,${btoa(patternSvg)}`;
      
      // Corner Ornament SVG - More traditional
      const ornamentSvg = `<svg width='150' height='150' viewBox='0 0 150 150' xmlns='http://www.w3.org/2000/svg'>
        <path d='M0 0 L150 0 L150 5 L15 5 L15 150 L0 150 Z' fill='%23d4af37' fill-opacity='0.15'/>
        <path d='M25 25 L100 25 L100 28 L28 28 L28 100 L25 100 Z' fill='%23d4af37' fill-opacity='0.1'/>
        <circle cx='10' cy='10' r='4' fill='%23d4af37' fill-opacity='0.3'/>
      </svg>`;
      const ornamentBase64 = `data:image/svg+xml;base64,${btoa(ornamentSvg)}`;

      const fetchImage = async (url: string) => {
        const response = await fetch(url);
        const blob = await response.blob();
        return await blob.arrayBuffer();
      };

      const patternBuffer = await fetchImage(patternBase64);
      const ornamentBuffer = await fetchImage(ornamentBase64);

      const doc = new Document({
        sections: [{
          properties: {
            page: {
              margin: {
                top: 720,
                right: 720,
                bottom: 720,
                left: 720,
              },
            },
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: patternBuffer,
                      transformation: {
                        width: 800,
                        height: 1100,
                      },
                      floating: {
                        horizontalPosition: {
                          relative: HorizontalPositionRelativeFrom.PAGE,
                          offset: 0,
                        },
                        verticalPosition: {
                          relative: VerticalPositionRelativeFrom.PAGE,
                          offset: 0,
                        },
                        behindText: true,
                      },
                    } as any),
                    // Top Left Ornament
                    new ImageRun({
                      data: ornamentBuffer,
                      transformation: { width: 100, height: 100 },
                      floating: {
                        horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: 0 },
                        verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 0 },
                        behindText: true,
                      },
                    } as any),
                    // Top Right Ornament
                    new ImageRun({
                      data: ornamentBuffer,
                      transformation: { width: 120, height: 120, rotation: 90 },
                      floating: {
                        horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: 480 * 20 },
                        verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 0 },
                        behindText: true,
                      },
                    } as any),
                    // Bottom Left Ornament
                    new ImageRun({
                      data: ornamentBuffer,
                      transformation: { width: 120, height: 120, rotation: 270 },
                      floating: {
                        horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: 0 },
                        verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 720 * 20 },
                        behindText: true,
                      },
                    } as any),
                    // Bottom Right Ornament
                    new ImageRun({
                      data: ornamentBuffer,
                      transformation: { width: 120, height: 120, rotation: 180 },
                      floating: {
                        horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: 480 * 20 },
                        verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 720 * 20 },
                        behindText: true,
                      },
                    } as any),
                  ],
                }),
              ],
            }),
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: offer.documentTitle || "شركة دار المقام للخدمات السياحية والحج والعمرة",
                  bold: true,
                  size: 32,
                  font: "Amiri",
                  color: "d4af37",
                  rightToLeft: true,
                }),
              ],
              spacing: { after: 400 },
              bidirectional: true,
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: offer.name,
                  bold: true,
                  size: 48,
                  font: "Amiri",
                  color: "1a1a1a",
                  rightToLeft: true,
                }),
              ],
              spacing: { after: 200 },
              bidirectional: true,
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: `${offer.category} - عام 1447 هـ / 2026 م`,
                  size: 24,
                  font: "Amiri",
                  color: "666666",
                  rightToLeft: true,
                }),
              ],
              spacing: { after: 600 },
              bidirectional: true,
            }),
            new Table({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE,
              },
              rows: [
                new TableRow({
                  tableHeader: true,
                  children: [
                    "مكة المكرمة", "المدينة المنورة", "الوجبات", "ثنائية", "ثلاثية", "رباعية"
                  ].map(text => new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text, bold: true, color: "FFFFFF", rightToLeft: true })],
                      alignment: AlignmentType.CENTER,
                      bidirectional: true,
                    })],
                    shading: { fill: "1a1a1a" },
                    verticalAlign: VerticalAlign.CENTER,
                    borders: {
                      top: { style: "single", size: 2, color: "d4af37" },
                      bottom: { style: "single", size: 2, color: "d4af37" },
                      left: { style: "single", size: 2, color: "d4af37" },
                      right: { style: "single", size: 2, color: "d4af37" },
                    },
                  })),
                }),
                ...offer.rows.map(row => new TableRow({
                  children: [
                    row.makkah, row.madinah, row.meals, 
                    `${row.double} ${row.currency}`, 
                    `${row.triple} ${row.currency}`, 
                    `${row.quad} ${row.currency}`
                  ].map(text => new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text, rightToLeft: true })],
                      alignment: AlignmentType.CENTER,
                      bidirectional: true,
                    })],
                    verticalAlign: VerticalAlign.CENTER,
                    borders: {
                      top: { style: "single", size: 1, color: "eeeeee" },
                      bottom: { style: "single", size: 1, color: "eeeeee" },
                      left: { style: "single", size: 1, color: "eeeeee" },
                      right: { style: "single", size: 1, color: "eeeeee" },
                    },
                  })),
                })),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: "\nملاحظة:",
                  bold: true,
                  size: 24,
                  font: "Amiri",
                  color: "d4af37",
                  rightToLeft: true,
                }),
              ],
              spacing: { before: 600, after: 200 },
              bidirectional: true,
            }),
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: offer.fixedText || DEFAULT_FIXED_TEXT,
                  size: 20,
                  font: "Amiri",
                  rightToLeft: true,
                }),
              ],
              bidirectional: true,
            }),
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: "\nتواصل معنا:",
                  bold: true,
                  size: 24,
                  font: "Amiri",
                  color: "d4af37",
                  rightToLeft: true,
                }),
              ],
              spacing: { before: 400 },
              bidirectional: true,
            }),
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: "طرابلس - ليبيا | 0948470011 | 0947470010",
                  size: 20,
                  font: "Amiri",
                  rightToLeft: true,
                }),
              ],
              bidirectional: true,
            }),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `عرض_عمرة_${offer.name}.docx`);
    } catch (error) {
      console.error('Error exporting Word:', error);
      alert('حدث خطأ أثناء تصدير ملف Word.');
    }
  };

  const generateWhatsAppMessage = (offer: UmrahOffer) => {
    return `
*عرض عمرة من شركة دار المقام*
*${offer.category} / ${offer.name}*

${offer.rows.map(row => `
• مكة: ${row.makkah}
• المدينة: ${row.madinah}
${row.offer ? `• العرض: ${row.offer}` : ''}
• الوجبات: ${row.meals}
• ثنائية: ${row.double} ${row.currency}
• ثلاثية: ${row.triple} ${row.currency}
• رباعية: ${row.quad} ${row.currency}
${row.quint ? `• خماسية: ${row.quint} ${row.currency}` : ''}
`).join('\n')}

${offer.fixedText || DEFAULT_FIXED_TEXT}
    `.trim();
  };

  const sendViaWhatsApp = (phone: string, offer: UmrahOffer) => {
    const message = generateWhatsAppMessage(offer);
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
  };

  const copyToClipboard = (offer: UmrahOffer) => {
    const message = generateWhatsAppMessage(offer);
    navigator.clipboard.writeText(message).then(() => {
      setCopySuccess(offer.id);
      setTimeout(() => setCopySuccess(null), 2000);
    });
  };

  const uniqueContacts = Array.from(new Set(bookings.map(b => b.phone))).map(phone => {
    const p = phone as string;
    const booking = bookings.find(b => b.phone === p);
    return {
      phone: p,
      name: booking?.headName || 'عميل غير معروف'
    };
  }).filter(c => c.phone && c.phone.length > 5);

  const filteredContacts = uniqueContacts.filter(c => 
    c.name.includes(searchQuery) || c.phone.includes(searchQuery)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-8 max-w-7xl mx-auto space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">عروض العمرة</h1>
          <p className="text-white/40">إنشاء وإدارة عروض العمرة ومشاركتها مع المعتمرين</p>
        </div>
        {!isEditing && (
          <button 
            onClick={() => {
              setCurrentOffer({
                name: '',
                documentTitle: 'شركة دار المقام للخدمات السياحية والحج والعمرة',
                category: 'الاقتصادي',
                rows: [{
                  makkah: '',
                  madinah: '',
                  offer: '',
                  meals: 'بدون وجبات',
                  double: 0,
                  triple: 0,
                  quad: 0,
                  quint: 0,
                  currency: 'USD'
                }]
              });
              setIsEditing(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-gold text-matte-black rounded-2xl font-bold hover:bg-gold/90 transition-all shadow-lg shadow-gold/10"
          >
            <Plus className="w-5 h-5" />
            إنشاء عرض جديد
          </button>
        )}
      </div>

      {isEditing ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-matte-dark border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
        >
          <div className="p-8 border-b border-white/10 flex flex-col md:flex-row md:items-center gap-6 bg-white/[0.02]">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-[10px] text-white/40 uppercase tracking-widest font-bold mb-2 mr-1">اسم العرض (داخلي)</label>
                <input 
                  type="text" 
                  value={currentOffer.name}
                  onChange={e => setCurrentOffer(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="مثال: عرض رمضان الأول"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold/50 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] text-white/40 uppercase tracking-widest font-bold mb-2 mr-1">عنوان الوثيقة (يظهر في PDF)</label>
                <input 
                  type="text" 
                  value={currentOffer.documentTitle}
                  onChange={e => setCurrentOffer(prev => ({ ...prev, documentTitle: e.target.value }))}
                  placeholder="مثال: شركة دار المقام للخدمات السياحية والحج والعمرة"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold/50 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] text-white/40 uppercase tracking-widest font-bold mb-2 mr-1">الفئة</label>
                <select 
                  value={currentOffer.category}
                  onChange={e => setCurrentOffer(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold/50 outline-none transition-all appearance-none"
                >
                  <option value="الاقتصادي">الاقتصادي</option>
                  <option value="المتوسط">المتوسط</option>
                  <option value="الفاخرة">الفاخرة</option>
                  <option value="الماسية">الماسية</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3 self-end md:self-center">
              <button 
                onClick={() => setIsEditing(false)}
                className="px-6 py-3 text-white/60 hover:text-white transition-colors font-bold"
              >
                إلغاء
              </button>
              <button 
                onClick={handleSave}
                className="flex items-center gap-2 px-8 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/10"
              >
                <Save className="w-5 h-5" />
                حفظ العرض
              </button>
            </div>
          </div>

          <div className="p-8 space-y-6 overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="text-[10px] text-white/20 uppercase tracking-widest font-bold border-b border-white/5">
                  <th className="pb-4 px-2">مكة</th>
                  <th className="pb-4 px-2">المدينة</th>
                  <th className="pb-4 px-2">العرض (اختياري)</th>
                  <th className="pb-4 px-2">الوجبات</th>
                  <th className="pb-4 px-2">ثنائية</th>
                  <th className="pb-4 px-2">ثلاثية</th>
                  <th className="pb-4 px-2">رباعية</th>
                  <th className="pb-4 px-2">خماسية</th>
                  <th className="pb-4 px-2">العملة</th>
                  <th className="pb-4 px-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {currentOffer.rows?.map((row, idx) => (
                  <tr key={idx} className="group">
                    <td className="py-4 px-2">
                      <input 
                        type="text" 
                        value={row.makkah}
                        onChange={e => handleRowChange(idx, 'makkah', e.target.value)}
                        className="w-full bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-gold/30 outline-none"
                      />
                    </td>
                    <td className="py-4 px-2">
                      <input 
                        type="text" 
                        value={row.madinah}
                        onChange={e => handleRowChange(idx, 'madinah', e.target.value)}
                        className="w-full bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-gold/30 outline-none"
                      />
                    </td>
                    <td className="py-4 px-2">
                      <input 
                        type="text" 
                        value={row.offer}
                        onChange={e => handleRowChange(idx, 'offer', e.target.value)}
                        className="w-full bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-gold/30 outline-none"
                      />
                    </td>
                    <td className="py-4 px-2">
                      <select 
                        value={row.meals}
                        onChange={e => handleRowChange(idx, 'meals', e.target.value)}
                        className="w-full bg-white/[0.02] border border-white/5 rounded-lg px-2 py-2 text-xs text-white focus:border-gold/30 outline-none appearance-none"
                      >
                        <option value="بدون وجبات">بدون وجبات</option>
                        <option value="يشمل الوجبات">يشمل الوجبات</option>
                        <option value="إفطار فقط">إفطار فقط</option>
                        <option value="إفطار وسحور">إفطار وسحور</option>
                      </select>
                    </td>
                    <td className="py-4 px-2">
                      <input 
                        type="number" 
                        value={row.double}
                        onChange={e => handleRowChange(idx, 'double', Number(e.target.value))}
                        className="w-20 bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-gold/30 outline-none"
                      />
                    </td>
                    <td className="py-4 px-2">
                      <input 
                        type="number" 
                        value={row.triple}
                        onChange={e => handleRowChange(idx, 'triple', Number(e.target.value))}
                        className="w-20 bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-gold/30 outline-none"
                      />
                    </td>
                    <td className="py-4 px-2">
                      <input 
                        type="number" 
                        value={row.quad}
                        onChange={e => handleRowChange(idx, 'quad', Number(e.target.value))}
                        className="w-20 bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-gold/30 outline-none"
                      />
                    </td>
                    <td className="py-4 px-2">
                      <input 
                        type="number" 
                        value={row.quint}
                        onChange={e => handleRowChange(idx, 'quint', Number(e.target.value))}
                        className="w-20 bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-gold/30 outline-none"
                      />
                    </td>
                    <td className="py-4 px-2">
                      <select 
                        value={row.currency}
                        onChange={e => handleRowChange(idx, 'currency', e.target.value)}
                        className="bg-white/[0.02] border border-white/5 rounded-lg px-2 py-2 text-[10px] text-white outline-none"
                      >
                        <option value="USD">$</option>
                        <option value="LYD">د.ل</option>
                      </select>
                    </td>
                    <td className="py-4 px-2">
                      <button 
                        onClick={() => handleRemoveRow(idx)}
                        className="p-2 text-red-400/40 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button 
              onClick={handleAddRow}
              className="w-full py-4 border-2 border-dashed border-white/5 rounded-2xl text-white/20 hover:text-gold hover:border-gold/30 hover:bg-gold/5 transition-all flex items-center justify-center gap-2 font-bold"
            >
              <Plus className="w-5 h-5" />
              إضافة سطر جديد
            </button>
          </div>

          <div className="p-8 bg-white/[0.01] border-t border-white/5">
            <h3 className="text-sm font-bold text-white/60 mb-4">البيانات الثابتة (قابلة للتعديل)</h3>
              <textarea 
                value={currentOffer.fixedText}
                onChange={e => setCurrentOffer(prev => ({ ...prev, fixedText: e.target.value }))}
                rows={8}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-white/80 text-xs leading-relaxed outline-none focus:border-gold/50 transition-all resize-none"
                placeholder="أدخل الملاحظات والبيانات الثابتة هنا..."
              />
            <p className="mt-4 text-[10px] text-white/20 italic">* هذه البيانات تظهر أسفل الجدول في العرض النهائي</p>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers.map(offer => (
            <motion.div 
              key={offer.id}
              layoutId={offer.id}
              className="bg-matte-dark border border-white/10 rounded-3xl p-6 hover:border-gold/30 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 blur-3xl -mr-16 -mt-16 group-hover:bg-gold/10 transition-colors" />
              
              <div className="relative z-10 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2 py-1 bg-gold/10 text-gold text-[10px] font-bold rounded-lg border border-gold/20 uppercase tracking-widest mb-2 inline-block">
                      {offer.category}
                    </span>
                    <h3 className="text-xl font-bold text-white group-hover:text-gold transition-colors">{offer.name}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => {
                        setCurrentOffer(offer);
                        setIsEditing(true);
                      }}
                      className="p-2 text-white/20 hover:text-blue-400 hover:bg-blue-400/10 rounded-xl transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(offer.id)}
                      className="p-2 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">عدد الفنادق:</span>
                    <span className="text-white/80 font-bold">{offer.rows.length}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">تاريخ الإنشاء:</span>
                    <span className="text-white/80">{new Date(offer.createdAt).toLocaleDateString('ar-LY')}</span>
                  </div>
                </div>

                <div className="pt-4 flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setSelectedOfferForShare(offer);
                      setShowPreview(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/[0.03] hover:bg-white/[0.08] text-white/80 rounded-xl text-xs font-bold transition-all border border-white/5"
                  >
                    <FileText className="w-4 h-4" />
                    معاينة
                  </button>
                  <button 
                    onClick={() => copyToClipboard(offer)}
                    className={clsx(
                      "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all border",
                      copySuccess === offer.id 
                        ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/30" 
                        : "bg-white/[0.03] hover:bg-white/[0.08] text-white/80 border-white/5"
                    )}
                  >
                    <Copy className="w-4 h-4" />
                    {copySuccess === offer.id ? 'تم النسخ' : 'نسخ النص'}
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedOfferForShare(offer);
                      setShowShareModal(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-gold/10 hover:bg-gold/20 text-gold rounded-xl text-xs font-bold transition-all border border-gold/20"
                  >
                    <Share2 className="w-4 h-4" />
                    مشاركة
                  </button>
                </div>
              </div>
            </motion.div>
          ))}

          {offers.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-white/20 space-y-4 border-2 border-dashed border-white/5 rounded-3xl">
              <AlertCircle className="w-12 h-12" />
              <p className="font-bold">لا توجد عروض حالياً</p>
              <button 
                onClick={() => setIsEditing(true)}
                className="text-gold hover:underline font-bold"
              >
                أنشئ أول عرض الآن
              </button>
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && selectedOfferForShare && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPreview(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-4xl max-h-full overflow-hidden bg-white rounded-3xl shadow-2xl flex flex-col"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h3 className="font-bold text-gray-900">معاينة العرض</h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => exportToWord(selectedOfferForShare)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all"
                  >
                    <FileText className="w-4 h-4" />
                    تحميل Word
                  </button>
                  <button 
                    onClick={() => exportToPDF(selectedOfferForShare)}
                    className="flex items-center gap-2 px-4 py-2 bg-gold text-matte-black rounded-xl text-xs font-bold hover:bg-gold/90 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    تحميل PDF
                  </button>
                  <button 
                    onClick={() => setShowPreview(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-xl transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div id="umrah-offer-preview" className="flex-1 overflow-y-auto p-8 relative" ref={previewRef} style={{ 
                direction: 'rtl', 
                backgroundColor: '#ffffff', 
                color: '#374151',
                backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' stroke=\'%23d4af37\' stroke-width=\'0.8\' stroke-opacity=\'0.15\'%3E%3Cpath d=\'M30 0 L40 20 L60 30 L40 40 L30 60 L20 40 L0 30 L20 20 Z\'/%3E%3Cpath d=\'M0 0 L20 10 L30 30 L10 20 Z\'/%3E%3Cpath d=\'M60 0 L40 10 L30 30 L50 20 Z\'/%3E%3Cpath d=\'M60 60 L40 50 L30 30 L50 40 Z\'/%3E%3Cpath d=\'M0 60 L20 50 L30 30 L10 40 Z\'/%3E%3C/g%3E%3C/svg%3E")',
                backgroundRepeat: 'repeat',
                fontFamily: '"Cairo", "Amiri", serif'
              }}>
                {/* Decorative Corner Ornaments */}
                <div className="absolute top-6 left-6 w-24 h-24 opacity-10 pointer-events-none" style={{ borderTop: '2px solid #d4af37', borderLeft: '2px solid #d4af37' }} />
                <div className="absolute top-6 right-6 w-24 h-24 opacity-10 pointer-events-none" style={{ borderTop: '2px solid #d4af37', borderRight: '2px solid #d4af37' }} />
                <div className="absolute bottom-6 left-6 w-24 h-24 opacity-10 pointer-events-none" style={{ borderBottom: '2px solid #d4af37', borderLeft: '2px solid #d4af37' }} />
                <div className="absolute bottom-6 right-6 w-24 h-24 opacity-10 pointer-events-none" style={{ borderBottom: '2px solid #d4af37', borderRight: '2px solid #d4af37' }} />

                <div className="relative z-10">
                  {/* Header Section */}
                  <div className="flex items-center justify-between mb-8 pb-6" style={{ borderBottom: '3px double rgba(212, 175, 55, 0.3)' }}>
                    <div className="text-right">
                      <h2 className="text-4xl font-black text-[#1a1a1a] mb-2" style={{ fontFamily: '"Amiri", serif' }}>{selectedOfferForShare.documentTitle || "شركة دار المقام للخدمات السياحية والحج والعمرة"}</h2>
                    </div>
                    <div className="p-4 rounded-3xl" style={{ 
                      backgroundColor: '#1a1a1a', 
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
                      border: '2px solid rgba(212, 175, 55, 0.5)'
                    }}>
                      <Logo textSize="text-2xl" showSubtitle={true} className="scale-110" hideText={false} />
                    </div>
                  </div>

                  {/* Offer Title Section */}
                  <div className="text-center mb-10 space-y-4">
                    <div className="inline-flex items-center gap-4">
                      <div className="h-px w-12 bg-[#d4af37] opacity-30" />
                      <div className="px-8 py-2 rounded-full" style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.4)' }}>
                        <span className="text-[#d4af37] font-black text-sm uppercase tracking-widest">{selectedOfferForShare.category}</span>
                      </div>
                      <div className="h-px w-12 bg-[#d4af37] opacity-30" />
                    </div>
                    <h3 className="text-5xl font-black text-[#1a1a1a] leading-tight" style={{ fontFamily: '"Amiri", serif' }}>{selectedOfferForShare.name}</h3>
                    <div className="flex items-center justify-center gap-6 font-bold text-base" style={{ color: '#6b7280' }}>
                      <span className="w-16 h-[1px]" style={{ backgroundColor: 'rgba(212, 175, 55, 0.2)' }} />
                      <span style={{ fontFamily: '"Amiri", serif' }}>عام 1447 هـ / 2026 م</span>
                      <span className="w-16 h-[1px]" style={{ backgroundColor: 'rgba(212, 175, 55, 0.2)' }} />
                    </div>
                  </div>

                  {/* Table Section */}
                  <div className="rounded-[2rem] overflow-hidden mb-10" style={{ border: '1px solid rgba(212, 175, 55, 0.2)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>
                          <th className="p-6 font-black text-sm" style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.1)', fontFamily: '"Amiri", serif' }}>مكة المكرمة</th>
                          <th className="p-6 font-black text-sm" style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.1)', fontFamily: '"Amiri", serif' }}>المدينة المنورة</th>
                          {selectedOfferForShare.rows.some(r => r.offer) && <th className="p-6 font-black text-sm" style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.1)', fontFamily: '"Amiri", serif' }}>العرض</th>}
                          <th className="p-6 font-black text-sm" style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.1)', fontFamily: '"Amiri", serif' }}>الوجبات</th>
                          <th className="p-6 font-black text-sm" style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.1)', fontFamily: '"Amiri", serif' }}>ثنائية</th>
                          <th className="p-6 font-black text-sm" style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.1)', fontFamily: '"Amiri", serif' }}>ثلاثية</th>
                          <th className="p-6 font-black text-sm" style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.1)', fontFamily: '"Amiri", serif' }}>رباعية</th>
                          {selectedOfferForShare.rows.some(r => r.quint) && <th className="p-6 font-black text-sm" style={{ fontFamily: '"Amiri", serif' }}>خماسية</th>}
                        </tr>
                      </thead>
                      <tbody style={{ color: '#374151' }}>
                        {selectedOfferForShare.rows.map((row, idx) => (
                          <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? "#ffffff" : "rgba(212, 175, 55, 0.02)", borderBottom: '1px solid rgba(212, 175, 55, 0.1)' }}>
                            <td className="p-6 font-bold text-base" style={{ borderLeft: '1px solid rgba(212, 175, 55, 0.05)' }}>{row.makkah}</td>
                            <td className="p-6 text-base" style={{ borderLeft: '1px solid rgba(212, 175, 55, 0.05)' }}>{row.madinah}</td>
                            {selectedOfferForShare.rows.some(r => r.offer) && <td className="p-6 text-base" style={{ borderLeft: '1px solid rgba(212, 175, 55, 0.05)' }}>{row.offer || '-'}</td>}
                            <td className="p-6 text-base" style={{ borderLeft: '1px solid rgba(212, 175, 55, 0.05)' }}>{row.meals}</td>
                            <td className="p-6 font-black text-[#d4af37] text-lg" style={{ borderLeft: '1px solid rgba(212, 175, 55, 0.05)' }}>{row.currency === 'USD' ? '$' : ''}{row.double.toLocaleString()}{row.currency === 'LYD' ? ' د.ل' : ''}</td>
                            <td className="p-6 font-black text-[#d4af37] text-lg" style={{ borderLeft: '1px solid rgba(212, 175, 55, 0.05)' }}>{row.currency === 'USD' ? '$' : ''}{row.triple.toLocaleString()}{row.currency === 'LYD' ? ' د.ل' : ''}</td>
                            <td className="p-6 font-black text-[#d4af37] text-lg" style={{ borderLeft: '1px solid rgba(212, 175, 55, 0.05)' }}>{row.currency === 'USD' ? '$' : ''}{row.quad.toLocaleString()}{row.currency === 'LYD' ? ' د.ل' : ''}</td>
                            {selectedOfferForShare.rows.some(r => r.quint) && (
                              <td className="p-6 font-black text-[#d4af37] text-lg">
                                {row.currency === 'USD' ? '$' : ''}{(row.quint || 0).toLocaleString()}{row.currency === 'LYD' ? ' د.ل' : ''}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Footer Section */}
                  <div className="grid grid-cols-2 gap-16 pt-8" style={{ borderTop: '3px double rgba(212, 175, 55, 0.2)' }}>
                    <div className="space-y-6">
                      <h4 className="text-[#1a1a1a] font-black text-lg uppercase pr-4" style={{ borderRight: '5px solid #d4af37', fontFamily: '"Amiri", serif' }}>ملاحظة:</h4>
                      <div className="text-xs leading-relaxed whitespace-pre-wrap font-medium" style={{ color: '#4b5563' }}>
                        {selectedOfferForShare.fixedText || DEFAULT_FIXED_TEXT}
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-between">
                      <div className="text-right space-y-4">
                        <h4 className="text-[#1a1a1a] font-black text-lg uppercase pl-4 mb-6" style={{ borderLeft: '5px solid #d4af37', fontFamily: '"Amiri", serif' }}>تواصل معنا</h4>
                        <div className="space-y-1">
                          <p className="text-sm font-bold" style={{ color: '#6b7280' }}>زاوية الدهماني بالقرب من سوق الشط</p>
                          <p className="text-sm font-bold" style={{ color: '#6b7280' }}>طرابلس - ليبيا</p>
                        </div>
                        <div className="pt-6 grid grid-cols-2 gap-x-8 gap-y-2 text-[#d4af37] font-black text-lg">
                          <span>0948470011</span>
                          <span>0947470010</span>
                          <span>0918470011</span>
                          <span>0919470011</span>
                        </div>
                      </div>
                      <div className="text-xs font-bold italic mt-12" style={{ color: 'rgba(212, 175, 55, 0.4)', fontFamily: '"Amiri", serif' }}>
                        تم إنشاء هذا العرض بتاريخ {new Date().toLocaleDateString('ar-LY')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && selectedOfferForShare && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShareModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl bg-matte-dark border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center text-gold">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">مشاركة العرض</h3>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest">إرسال عبر واتساب للمعتمرين</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowShareModal(false)}
                  className="p-2 text-white/20 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="relative">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="بحث عن معتمر بالاسم أو رقم الهاتف..."
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pr-12 pl-4 py-4 text-white focus:border-gold/50 outline-none transition-all"
                  />
                </div>

                <div className="max-h-[400px] overflow-y-auto custom-scrollbar space-y-2 pr-2">
                  {filteredContacts.map((contact, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 font-bold">
                          {contact.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-white group-hover:text-gold transition-colors">{contact.name}</p>
                          <p className="text-xs text-white/40 font-mono">{contact.phone}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          if (selectedOfferForShare) {
                            sendViaWhatsApp(contact.phone, selectedOfferForShare);
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl text-xs font-bold hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/20"
                      >
                        <MessageSquare className="w-4 h-4" />
                        إرسال واتساب
                      </button>
                    </div>
                  ))}

                  {filteredContacts.length === 0 && (
                    <div className="py-12 text-center text-white/20">
                      <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p className="font-bold">لا توجد نتائج للبحث</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 bg-white/[0.01] border-t border-white/5 flex items-center justify-between">
                <p className="text-[10px] text-white/20">سيتم فتح محادثة واتساب جديدة لكل معتمر</p>
                <button 
                  onClick={() => setShowShareModal(false)}
                  className="px-6 py-2 text-white/40 hover:text-white transition-colors text-xs font-bold"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
