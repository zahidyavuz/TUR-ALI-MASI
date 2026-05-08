'use client';

import { useRef, useState } from 'react';
import {
  validateUploadFile,
  renameToSecure,
  MAX_FILE_SIZE_MB,
  ALLOWED_MIME_TYPES,
} from '../lib/fileValidator';

interface SecureFileUploadProps {
  /** Doğrulama geçince çağrılır. Güvenli File nesnesi ve önizleme URL'si döner. */
  onFileAccepted: (secureFile: File, previewUrl: string) => void;
  /** Opsiyonel mevcut görsel URL'si */
  currentImageUrl?: string;
  /** Buton etiketi */
  label?: string;
  /** Yuvarlak (profil fotoğrafı) veya kare (tur görseli) */
  variant?: 'round' | 'square';
}

type UploadStatus = 'idle' | 'scanning' | 'accepted' | 'rejected';

/**
 * MALICIOUS-FILE-UPLOAD-BLOCKER: Güvenli Dosya Yükleme Bileşeni
 *
 * Kullanım yerleri:
 * - Acenta Dashboard → Tur fotoğrafı yükleme
 * - Admin Dashboard → İçerik görseli yükleme
 * - Profil Sayfası → Profil fotoğrafı yükleme
 *
 * Kullanıcı arayüzüne yansıyan güvenlik davranışları:
 * - Tarama animasyonu (Magic Bytes analizi sırasında)
 * - ✅ Yeşil onay (güvenli dosya)
 * - ❌ Kırmızı uyarı (zararlı/geçersiz dosya)
 * - Güvenli dosya adı gösterimi (tkia_a3f92c1b8e4d5f7a.jpg)
 */
export default function SecureFileUpload({
  onFileAccepted,
  currentImageUrl,
  label = 'Görsel Yükle',
  variant = 'square',
}: SecureFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [previewUrl, setPreviewUrl] = useState(currentImageUrl || '');
  const [secureName, setSecureName] = useState('');
  const [detectedMime, setDetectedMime] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Tarama başlıyor
    setStatus('scanning');
    setErrorMsg('');
    setSecureName('');

    // Magic bytes analizi (async, birkaç ms sürer)
    const result = await validateUploadFile(file);

    if (!result.valid) {
      setStatus('rejected');
      setErrorMsg(result.error || 'Dosya güvenlik doğrulamasından geçemedi.');
      // Input'u temizle
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    // Güvenli dosya adıyla yeni File nesnesi oluştur
    const secureFile = renameToSecure(file, result.secureName!);
    const objectUrl = URL.createObjectURL(secureFile);

    setStatus('accepted');
    setPreviewUrl(objectUrl);
    setSecureName(result.secureName!);
    setDetectedMime(result.detectedMime!);
    onFileAccepted(secureFile, objectUrl);
  };

  const isRound = variant === 'round';

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Görsel Önizleme */}
      <div
        className={`relative overflow-hidden border-2 bg-slate-100 cursor-pointer group transition-all duration-300
          ${isRound ? 'w-32 h-32 rounded-full' : 'w-full max-w-xs h-40 rounded-2xl'}
          ${status === 'accepted' ? 'border-emerald-400' : status === 'rejected' ? 'border-red-400' : 'border-gray-200 hover:border-[#008cb3]'}
        `}
        onClick={() => inputRef.current?.click()}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Önizleme"
            className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2">
            <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span className="text-xs font-bold text-center px-2">Görsel yüklemek için tıkla</span>
          </div>
        )}

        {/* Tarama Animasyonu Overlay */}
        {status === 'scanning' && (
          <div className="absolute inset-0 bg-slate-900/70 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin" />
            <span className="text-[10px] font-bold text-cyan-300 text-center px-2">
              Güvenlik Taraması<br />Yapılıyor...
            </span>
            {/* Tarama çizgisi animasyonu */}
            <div className="absolute inset-x-0 h-0.5 bg-cyan-400/60 animate-bounce" style={{ top: '50%' }} />
          </div>
        )}

        {/* Onaylandı Overlay */}
        {status === 'accepted' && (
          <div className="absolute top-2 right-2 w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
            <svg width="14" height="14" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 10l3 3 6-6" />
            </svg>
          </div>
        )}

        {/* Upload İkon (hover) */}
        {status !== 'scanning' && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="bg-white/90 rounded-full p-2">
              <svg width="18" height="18" fill="none" stroke="#008cb3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Yükleme Butonu */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={status === 'scanning'}
        className={`text-sm font-bold px-5 py-2.5 rounded-xl transition-all flex items-center gap-2
          ${status === 'scanning'
            ? 'bg-slate-100 text-slate-400 cursor-wait'
            : 'bg-blue-50 text-[#008cb3] hover:bg-[#008cb3] hover:text-white'
          }`}
      >
        {status === 'scanning' ? (
          <>
            <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
            Taranıyor...
          </>
        ) : (
          <>
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            {label}
          </>
        )}
      </button>

      {/* Güvenlik Durumu Mesajı */}
      {status === 'accepted' && (
        <div className="w-full max-w-xs bg-emerald-50 border border-emerald-100 rounded-xl p-3 space-y-1 animate-in fade-in duration-300">
          <p className="text-[11px] font-black text-emerald-700 flex items-center gap-1.5">
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 10l3 3 6-6"/></svg>
            Güvenlik Doğrulaması Başarılı
          </p>
          <p className="text-[10px] text-emerald-600 font-medium">Tip: {detectedMime} (Magic Bytes ✓)</p>
          <p className="text-[10px] text-emerald-600 font-mono truncate">Güvenli Ad: {secureName}</p>
        </div>
      )}

      {status === 'rejected' && (
        <div className="w-full max-w-xs bg-red-50 border border-red-100 rounded-xl p-3 animate-in fade-in duration-300">
          <p className="text-[11px] font-black text-red-700 flex items-center gap-1.5 mb-1">
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            Dosya Güvenlik Engelini Geçemedi
          </p>
          <p className="text-[10px] text-red-600 font-medium leading-relaxed">{errorMsg}</p>
        </div>
      )}

      {/* Kural Bilgisi (idle modda) */}
      {status === 'idle' && (
        <p className="text-[10px] text-gray-400 font-medium text-center max-w-[200px] leading-relaxed">
          Yalnızca <strong>JPG, PNG, WebP</strong> • Maks. <strong>{MAX_FILE_SIZE_MB}MB</strong><br />
          <span className="text-[9px] text-gray-300">Magic Bytes güvenlik taraması uygulanır</span>
        </p>
      )}

      {/* Gizli input */}
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_MIME_TYPES.join(',')}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
