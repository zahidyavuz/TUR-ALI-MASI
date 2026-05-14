'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface Tour {
  id: number;
  title: string;
  price: number | string;
  capacity: number;
  sold: number;
  status: string;
  image: string;
  description?: string;
}

export default function AgencyToursPage() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    capacity: '',
    description: '',
    image: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTourId, setEditingTourId] = useState<number | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  // Fetch Tours
  const fetchTours = async () => {
    try {
      const res = await fetch('/api/tours');
      const data = await res.json();
      if (data.tours) {
        setTours(data.tours);
      }
    } catch (error) {
      console.error('Turlar yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTours();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);
      
      const newPreviews = filesArray.map(file => URL.createObjectURL(file));
      setPreviews(prev => [...prev, ...newPreviews]);
      
      // Update the main image in formData if it's the first one
      if (!formData.image && newPreviews.length > 0) {
        setFormData(prev => ({ ...prev, image: newPreviews[0] }));
      }
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);
    
    const newPreviews = [...previews];
    URL.revokeObjectURL(newPreviews[index]);
    newPreviews.splice(index, 1);
    setPreviews(newPreviews);
    
    // Update formData image if we removed the primary one
    if (index === 0) {
      setFormData(prev => ({ ...prev, image: newPreviews[0] || '' }));
    }
  };

  const triggerFileInput = () => {
    document.getElementById('file-upload-input')?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.price || !formData.capacity) {
      alert('Lütfen zorunlu alanları doldurun (Başlık, Fiyat, Kapasite)');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const fd = new FormData();
      fd.append('title', formData.title);
      fd.append('price', formData.price);
      fd.append('capacity', formData.capacity);
      fd.append('description', formData.description);
      
      // Append all selected files
      selectedFiles.forEach((file, index) => {
        fd.append(`file_${index}`, file);
      });

      if (editingTourId) {
        // UPDATE (PUT)
        const res = await fetch(`/api/tours/${editingTourId}`, {
          method: 'PUT',
          body: fd // Sending FormData
        });
        
        if (res.ok) {
          alert('Tur başarıyla güncellendi!');
          resetForm();
          fetchTours();
        }
      } else {
        // CREATE (POST)
        const res = await fetch('/api/tours', {
          method: 'POST',
          body: fd // Sending FormData
        });
        
        if (res.ok) {
          alert('Yeni tur başarıyla eklendi!');
          resetForm();
          fetchTours();
        }
      }
    } catch (error) {
      console.error('İşlem hatası:', error);
      alert('Bir hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEditingTourId(null);
    setFormData({ title: '', price: '', capacity: '', description: '', image: '' });
    setSelectedFiles([]);
    previews.forEach(p => URL.revokeObjectURL(p));
    setPreviews([]);
  };

  const startEditing = (tour: Tour) => {
    setEditingTourId(tour.id);
    setFormData({
      title: tour.title,
      price: tour.price.toString().replace('₺', ''),
      capacity: tour.capacity.toString(),
      description: tour.description || '',
      image: tour.image
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Test: Trigger mantığını test etmek için dışarıdan sahte bilet satışı
  const simulateTicketSale = async (id: number) => {
    try {
      await fetch(`/api/tours/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ additionalSold: 1 })
      });
      fetchTours();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 pb-24 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Tur Yönetimi (Envanter)</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Turlarınızı yönetin ve operasyonel kapasiteleri belirleyin.
          </p>
        </div>
        <button 
          onClick={resetForm}
          className="bg-slate-900 hover:bg-slate-800 text-white font-medium px-4 py-2 rounded-md text-sm transition-colors shadow-sm flex items-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Yeni Tur Ekle
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Tur Ekleme / Düzenleme Formu */}
        <div className="bg-white dark:bg-slate-900 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-800 h-fit">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5 uppercase tracking-wide text-sm">
            {editingTourId ? 'Turu Düzenle' : 'Tur Detayları'}
          </h2>
          
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Görsel Yükleme */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Tur Görselleri ve Belgeler</label>
              
              <input 
                type="file" 
                id="file-upload-input" 
                className="hidden" 
                multiple 
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleFileChange}
              />

              <div 
                onClick={triggerFileInput}
                className="w-full min-h-[112px] border border-dashed border-slate-300 dark:border-slate-700 rounded-md flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group relative p-3"
              >
                {previews.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 w-full">
                    {previews.map((preview, idx) => (
                      <div key={idx} className="relative aspect-video rounded overflow-hidden group/item">
                        <Image src={preview} alt={`Preview ${idx}`} fill className="object-cover" unoptimized />
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover/item:opacity-100 transition-opacity"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      </div>
                    ))}
                    <div className="aspect-video border border-dashed border-slate-300 dark:border-slate-600 rounded flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    </div>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Dosya Seç veya Sürükle</span>
                    <p className="text-[10px] text-slate-400 mt-1">PNG, JPG, PDF (Maks. 10MB)</p>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Tur Başlığı</label>
              <input 
                type="text" 
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                disabled={!!editingTourId}
                placeholder="Örn: Pamukkale Günübirlik Tur" 
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 text-sm text-slate-800 dark:text-white disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Birim Fiyat (₺)</label>
                <input 
                  type="number" 
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="0.00" 
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 text-sm text-slate-800 dark:text-white"
                />
              </div>
              
              <div className="relative">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Maksimum Kapasite</label>
                <input 
                  type="number" 
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleInputChange}
                  placeholder="Örn: 15" 
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 text-sm text-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Açıklama</label>
              <textarea 
                rows={3} 
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Tur detaylarını ve programa dahil olan hizmetleri yazın..." 
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 text-sm text-slate-800 dark:text-white resize-none"
              ></textarea>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold py-2.5 rounded-md transition-colors hover:bg-slate-800 dark:hover:bg-slate-100 shadow-sm disabled:opacity-70 text-sm"
            >
              {isSubmitting ? 'İşleniyor...' : (editingTourId ? 'Güncelle' : 'Kaydet')}
            </button>
          </form>
        </div>

        {/* Aktif Turlar ve Overbooking Koruması */}
        <div className="space-y-3">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Aktif Envanter</h2>
            {loading && <span className="text-[10px] font-medium text-slate-500">Yükleniyor...</span>}
          </div>
          
          {tours.map(tour => {
            const isSoldOut = tour.sold >= tour.capacity;
            const progress = (tour.sold / tour.capacity) * 100;

            return (
              <div key={tour.id} className={`p-3 rounded-md border ${isSoldOut ? 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'} shadow-sm flex flex-col sm:flex-row gap-4`}>
                <div className="w-full sm:w-24 h-20 relative rounded overflow-hidden shrink-0">
                  <Image src={tour.image} alt={tour.title} fill className={`object-cover ${isSoldOut ? 'grayscale' : ''}`} unoptimized />
                  {isSoldOut && (
                    <div className="absolute inset-0 bg-red-900/60 flex items-center justify-center backdrop-blur-[2px]">
                      <span className="text-white font-black text-xs uppercase tracking-widest border-2 border-white px-2 py-1 rounded rotate-[-15deg]">Tükendi</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{tour.title}</h3>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {typeof tour.price === 'number' ? `₺${tour.price}` : tour.price}
                      </span>
                    </div>
                    
                    {/* Kapasite Barı */}
                    <div className="mt-2">
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="font-medium text-slate-500">Satış: <span className={isSoldOut ? 'text-red-500 font-bold' : 'text-slate-700 dark:text-slate-300'}>{tour.sold}</span></span>
                        <span className="font-medium text-slate-500">Kap: <span className="text-slate-700 dark:text-slate-300">{tour.capacity}</span></span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${isSoldOut ? 'bg-red-500' : progress > 80 ? 'bg-yellow-500' : 'bg-slate-800 dark:bg-slate-400'}`} 
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 flex justify-between items-center">
                    <div className="flex gap-2 items-center">
                      {isSoldOut ? (
                        <span className="text-[10px] font-semibold text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded border border-red-200 dark:border-red-800 flex items-center gap-1">
                          Kapalı
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded border border-green-200 dark:border-green-800">
                          Satışta
                        </span>
                      )}
                      
                      {!isSoldOut && (
                         <button 
                           onClick={() => simulateTicketSale(tour.id)}
                           className="text-[10px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 px-2 py-0.5 rounded transition-colors"
                           title="Test: 1 Bilet Sat"
                         >
                           +1 Test
                         </button>
                      )}
                    </div>
                    <button onClick={() => startEditing(tour)} className="text-[11px] font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors underline">Düzenle</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
