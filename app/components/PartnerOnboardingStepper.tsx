'use client';

import { useState, useEffect } from 'react';
import { fetchAPI } from '@/app/lib/api';
import { auth } from '@/app/lib/auth';

interface Props {
  onSuccess: () => void;
}

const BUSINESS_TYPE_OPTIONS = [
  { value: 'acenta', label: 'Seyahat Acentası' },
  { value: 'restoran', label: 'Restoran' },
  { value: 'kafe', label: 'Kafe' },
  { value: 'her_ikisi', label: 'Tur Acentası + Restoran/Kafe' },
  { value: 'shuttle', label: 'Shuttle / Transfer' },
];

const STEP_LABELS = ['Hesap', 'Yasal Bilgiler', 'TÜRSAB', 'İşletme Profili', 'Finans', 'Sözleşme'];

const PHONE_RE = /^(\+90|0)?5\d{9}$/;
const IBAN_RE = /^TR\d{24}$/;

type FormState = {
  // Adım 1
  email: string;
  password: string;
  contact_name: string;
  phone: string;
  business_type: string;
  legal_entity_type: string;
  // Adım 2
  name: string;
  tax_id: string;
  tax_office: string;
  mersis_no: string;
  // Adım 4
  description: string;
  city: string;
  district: string;
  address: string;
  // Adım 5
  iban: string;
  bank_account_holder: string;
  bank_name: string;
};

const EMPTY_FORM: FormState = {
  email: '', password: '', contact_name: '', phone: '', business_type: 'acenta', legal_entity_type: 'company',
  name: '', tax_id: '', tax_office: '', mersis_no: '',
  description: '', city: '', district: '', address: '',
  iban: '', bank_account_holder: '', bank_name: '',
};

export default function PartnerOnboardingStepper({ onSuccess }: Props) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [resuming, setResuming] = useState(true);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Dosyalar
  const [tradeRegistryFile, setTradeRegistryFile] = useState<File | null>(null);
  const [tursabDocFile, setTursabDocFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  // Sözleşme
  const [acceptContract, setAcceptContract] = useState(false);
  const [acceptKvkk, setAcceptKvkk] = useState(false);

  const requiresTursab = form.business_type === 'acenta' || form.business_type === 'her_ikisi';

  // Kaldığı yerden devam et: zaten kimlik doğrulaması yapılmış ve yarım kalmış
  // bir başvurusu varsa (taslak/eksik_bilgi) mevcut verilerle formu doldur.
  useEffect(() => {
    async function resume() {
      if (!auth.isAuthenticated()) {
        setResuming(false);
        return;
      }
      const agency = await fetchAPI('/agencies/onboarding/');
      if (agency) {
        if (agency.status === 'taslak' || agency.status === 'eksik_bilgi') {
          setForm((prev) => ({
            ...prev,
            business_type: agency.business_type || prev.business_type,
            legal_entity_type: agency.legal_entity_type || prev.legal_entity_type,
            name: agency.name || '',
            tax_id: agency.tax_id || '',
            tax_office: agency.tax_office || '',
            mersis_no: agency.mersis_no || '',
            description: agency.description || '',
            city: agency.city || '',
            district: agency.district || '',
            address: agency.address || '',
            iban: agency.iban || '',
            bank_account_holder: agency.bank_account_holder || '',
            bank_name: agency.bank_name || '',
          }));
          setStep(Math.min(Math.max(agency.onboarding_step || 2, 2), 6));
        } else {
          setApplicationStatus(agency.status);
        }
      }
      setResuming(false);
    }
    resume();
  }, []);

  const update = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const setFieldErrors = (data: Record<string, any> | undefined, fallback: string) => {
    if (data && typeof data === 'object') {
      const flat: Record<string, string> = {};
      for (const [k, v] of Object.entries(data)) {
        flat[k] = Array.isArray(v) ? String(v[0]) : String(v);
      }
      setErrors(flat);
    } else {
      setErrors({ _general: fallback });
    }
  };

  // ── Adım 1: Hesap oluşturma ──────────────────────────────────────────────
  const handleStart = async () => {
    const stepErrors: Record<string, string> = {};
    if (!form.contact_name.trim()) stepErrors.contact_name = 'Yetkili adı-soyadı zorunludur.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) stepErrors.email = 'Geçerli bir e-posta adresi girin.';
    if (form.password.length < 6) stepErrors.password = 'Şifre en az 6 karakter olmalıdır.';
    if (!PHONE_RE.test(form.phone.replace(/\s/g, ''))) stepErrors.phone = 'Geçerli bir telefon numarası girin (örn. 05XXXXXXXXX).';
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetchAPI('/agencies/onboarding/start/', {
        method: 'POST',
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          contact_name: form.contact_name,
          phone: form.phone,
          business_type: form.business_type,
          legal_entity_type: form.legal_entity_type,
        }),
        throwOnHttpError: true,
      });
      auth.setTokens({ access: response.access, refresh: response.refresh });
      setStep(2);
    } catch (err: any) {
      setFieldErrors(err?.data, err?.message || 'Başvuru başlatılamadı.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Adım 2-5: PATCH (dosya varsa multipart) ──────────────────────────────
  const patchStep = async (fields: Record<string, string>, files: Record<string, File | null>, nextStep: number) => {
    setSubmitting(true);
    setErrors({});
    try {
      const hasFile = Object.values(files).some(Boolean);
      let body: FormData | string;
      if (hasFile) {
        const fd = new FormData();
        Object.entries(fields).forEach(([k, v]) => { if (v) fd.append(k, v); });
        Object.entries(files).forEach(([k, f]) => { if (f) fd.append(k, f); });
        fd.append('onboarding_step', String(nextStep));
        body = fd;
      } else {
        body = JSON.stringify({ ...fields, onboarding_step: nextStep });
      }

      await fetchAPI('/agencies/onboarding/', { method: 'PATCH', body, throwOnHttpError: true });
      setStep(nextStep);
    } catch (err: any) {
      setFieldErrors(err?.data, err?.message || 'Bilgiler kaydedilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStep2Next = () => {
    const stepErrors: Record<string, string> = {};
    if (form.name.trim().length < 3) stepErrors.name = 'Ticari unvan en az 3 karakter olmalıdır.';
    const idLen = form.legal_entity_type === 'company' ? 10 : 11;
    if (!new RegExp(`^\\d{${idLen}}$`).test(form.tax_id)) {
      stepErrors.tax_id = `${form.legal_entity_type === 'company' ? 'Vergi Kimlik Numarası' : 'TCKN'} ${idLen} haneli olmalıdır.`;
    }
    if (!form.tax_office.trim()) stepErrors.tax_office = 'Vergi dairesi zorunludur.';
    if (form.legal_entity_type === 'company' && !tradeRegistryFile) {
      stepErrors.trade_registry_document = 'Şirketler için ticaret sicil belgesi zorunludur.';
    }
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    patchStep(
      { name: form.name, tax_id: form.tax_id, tax_office: form.tax_office, mersis_no: form.mersis_no },
      { trade_registry_document: tradeRegistryFile },
      requiresTursab ? 3 : 4,
    );
  };

  const [tursabNo, setTursabNo] = useState('');
  const [tursabGroup, setTursabGroup] = useState('A');

  const handleStep3Next = () => {
    const stepErrors: Record<string, string> = {};
    if (!tursabNo.trim()) stepErrors.tursab_no = 'TÜRSAB İşletme Belgesi Numarası zorunludur.';
    if (!tursabGroup) stepErrors.tursab_group = 'Acenta grubu seçilmelidir.';
    if (!tursabDocFile) stepErrors.tursab_document = 'TÜRSAB İşletme Belgesi yüklenmelidir.';
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    patchStep(
      { tursab_no: tursabNo, tursab_group: tursabGroup },
      { tursab_document: tursabDocFile },
      4,
    );
  };

  const handleStep4Next = () => {
    const stepErrors: Record<string, string> = {};
    if (!logoFile) stepErrors.logo = 'İşletme logosu zorunludur.';
    if (form.description.trim().length < 50) stepErrors.description = 'İşletme açıklaması en az 50 karakter olmalıdır.';
    if (!form.city.trim()) stepErrors.city = 'Şehir zorunludur.';
    if (!form.address.trim()) stepErrors.address = 'İşletme adresi zorunludur.';
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    patchStep(
      { description: form.description, city: form.city, district: form.district, address: form.address },
      { logo: logoFile, cover_image: coverFile },
      5,
    );
  };

  const handleStep5Next = () => {
    const stepErrors: Record<string, string> = {};
    if (!IBAN_RE.test(form.iban.replace(/\s/g, '').toUpperCase())) {
      stepErrors.iban = 'IBAN, TR ile başlayıp toplam 26 karakter olmalıdır.';
    }
    if (!form.bank_account_holder.trim()) stepErrors.bank_account_holder = 'Hesap sahibi zorunludur.';
    if (!form.bank_name.trim()) stepErrors.bank_name = 'Banka adı zorunludur.';
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    patchStep(
      { iban: form.iban.replace(/\s/g, '').toUpperCase(), bank_account_holder: form.bank_account_holder, bank_name: form.bank_name },
      {},
      6,
    );
  };

  const handleFinalSubmit = async () => {
    if (!acceptContract || !acceptKvkk) return;
    setSubmitting(true);
    setErrors({});
    try {
      await fetchAPI('/agencies/onboarding/submit/', {
        method: 'POST',
        body: JSON.stringify({ accept_contract: acceptContract, accept_kvkk: acceptKvkk }),
        throwOnHttpError: true,
      });
      setSubmitted(true);
    } catch (err: any) {
      setFieldErrors(err?.data, err?.message || 'Başvuru gönderilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (resuming) {
    return <div className="py-12 text-center text-sm font-semibold text-gray-500">Yükleniyor...</div>;
  }

  if (applicationStatus) {
    const messages: Record<string, string> = {
      beklemede: 'Başvurunuz incelemeye alındı. Sonuç e-posta ile bildirilecektir.',
      inceleniyor: 'Başvurunuz şu anda inceleniyor.',
      onaylandi: 'Başvurunuz zaten onaylandı — panelinize giriş yapabilirsiniz.',
      reddedildi: 'Başvurunuz reddedildi. Detaylar için panelinize giriş yapın.',
    };
    return (
      <div className="py-8 text-center">
        <p className="text-sm font-bold text-slate-700">{messages[applicationStatus] || 'Başvurunuz mevcut.'}</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="py-8 text-center">
        <div className="text-4xl mb-3">✅</div>
        <h3 className="text-lg font-black text-slate-800 mb-2">Başvurunuz Alındı</h3>
        <p className="text-sm text-slate-500 mb-4">Ekibimiz belgelerinizi inceleyip en kısa sürede size dönüş yapacaktır.</p>
        <button onClick={onSuccess} className="text-orange-500 font-bold hover:underline">Kapat</button>
      </div>
    );
  }

  const visibleSteps = requiresTursab ? [1, 2, 3, 4, 5, 6] : [1, 2, 4, 5, 6];
  const generalError = errors._general;

  return (
    <div>
      {/* İlerleme Çubuğu */}
      <div className="flex items-center gap-1 mb-6">
        {visibleSteps.map((s, idx) => (
          <div key={s} className="flex items-center flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${step >= s ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
              {step > s ? '✓' : idx + 1}
            </div>
            {idx < visibleSteps.length - 1 && <div className={`flex-1 h-1 mx-1 rounded ${step > s ? 'bg-orange-500' : 'bg-slate-100'}`} />}
          </div>
        ))}
      </div>
      <p className="text-center text-[11px] font-black text-orange-500 uppercase tracking-widest mb-5">
        {STEP_LABELS[step - 1]}
      </p>

      {generalError && (
        <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-xs font-bold border border-red-100">{generalError}</div>
      )}

      <div className="flex flex-col gap-4">
        {step === 1 && (
          <>
            <Field label="İşletme Türü">
              <select value={form.business_type} onChange={(e) => update('business_type', e.target.value)} className={inputClass()}>
                {BUSINESS_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Tüzel Kişilik Türü">
              <select value={form.legal_entity_type} onChange={(e) => update('legal_entity_type', e.target.value)} className={inputClass()}>
                <option value="company">Şirket (Ltd./A.Ş.)</option>
                <option value="individual">Şahıs İşletmesi</option>
              </select>
            </Field>
            <Field label="Yetkili Adı Soyadı" error={errors.contact_name}>
              <input value={form.contact_name} onChange={(e) => update('contact_name', e.target.value)} className={inputClass(!!errors.contact_name)} placeholder="Ad Soyad" />
            </Field>
            <Field label="Kurumsal E-Posta" error={errors.email}>
              <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className={inputClass(!!errors.email)} placeholder="iletisim@firmaniz.com" />
            </Field>
            <Field label="Telefon" error={errors.phone}>
              <input value={form.phone} onChange={(e) => update('phone', e.target.value)} className={inputClass(!!errors.phone)} placeholder="05XXXXXXXXX" />
            </Field>
            <Field label="Şifre" error={errors.password}>
              <input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} className={inputClass(!!errors.password)} placeholder="••••••••" />
            </Field>
            <StepButton onClick={handleStart} submitting={submitting}>Devam Et</StepButton>
          </>
        )}

        {step === 2 && (
          <>
            <Field label="Ticari Unvan" error={errors.name}>
              <input value={form.name} onChange={(e) => update('name', e.target.value)} className={inputClass(!!errors.name)} placeholder="Örn: Gurme Restoran Ltd. Şti." />
            </Field>
            <Field label={form.legal_entity_type === 'company' ? 'Vergi Kimlik No' : 'TCKN'} error={errors.tax_id}>
              <input value={form.tax_id} onChange={(e) => update('tax_id', e.target.value)} className={inputClass(!!errors.tax_id)} placeholder={form.legal_entity_type === 'company' ? '10 haneli' : '11 haneli'} />
            </Field>
            <Field label="Vergi Dairesi" error={errors.tax_office}>
              <input value={form.tax_office} onChange={(e) => update('tax_office', e.target.value)} className={inputClass(!!errors.tax_office)} />
            </Field>
            <Field label="MERSİS No (opsiyonel)" error={errors.mersis_no}>
              <input value={form.mersis_no} onChange={(e) => update('mersis_no', e.target.value)} className={inputClass(!!errors.mersis_no)} placeholder="16 haneli" />
            </Field>
            {form.legal_entity_type === 'company' && (
              <FileField label="Ticaret Sicil / Faaliyet Belgesi" file={tradeRegistryFile} onChange={setTradeRegistryFile} error={errors.trade_registry_document} />
            )}
            <StepButton onClick={handleStep2Next} submitting={submitting}>İleri</StepButton>
          </>
        )}

        {step === 3 && requiresTursab && (
          <>
            <p className="text-xs text-slate-500 bg-orange-50 border border-orange-100 rounded-xl p-3">
              Seyahat acentası olarak satış yapabilmeniz için işletme belgeniz ekibimizce doğrulanacaktır.
            </p>
            <Field label="TÜRSAB İşletme Belgesi Numarası" error={errors.tursab_no}>
              <input value={tursabNo} onChange={(e) => setTursabNo(e.target.value)} className={inputClass(!!errors.tursab_no)} placeholder="Örn: 12345" />
            </Field>
            <Field label="Acenta Grubu" error={errors.tursab_group}>
              <select value={tursabGroup} onChange={(e) => setTursabGroup(e.target.value)} className={inputClass(!!errors.tursab_group)}>
                <option value="A">A Grubu</option>
                <option value="B">B Grubu</option>
                <option value="C">C Grubu</option>
              </select>
            </Field>
            <FileField label="TÜRSAB İşletme Belgesi" file={tursabDocFile} onChange={setTursabDocFile} error={errors.tursab_document} />
            <StepButton onClick={handleStep3Next} submitting={submitting}>İleri</StepButton>
          </>
        )}

        {step === 4 && (
          <>
            <FileField label="İşletme Logosu (max 5MB)" file={logoFile} onChange={setLogoFile} error={errors.logo} accept="image/*" />
            <FileField label="Kapak Fotoğrafı (opsiyonel)" file={coverFile} onChange={setCoverFile} accept="image/*" />
            <Field label="İşletme Açıklaması (min 50 karakter)" error={errors.description}>
              <textarea rows={3} value={form.description} onChange={(e) => update('description', e.target.value)} className={inputClass(!!errors.description)} />
            </Field>
            <Field label="Şehir" error={errors.city}>
              <input value={form.city} onChange={(e) => update('city', e.target.value)} className={inputClass(!!errors.city)} />
            </Field>
            <Field label="İlçe (opsiyonel)">
              <input value={form.district} onChange={(e) => update('district', e.target.value)} className={inputClass()} />
            </Field>
            <Field label="İşletme Adresi" error={errors.address}>
              <textarea rows={2} value={form.address} onChange={(e) => update('address', e.target.value)} className={inputClass(!!errors.address)} />
            </Field>
            <StepButton onClick={handleStep4Next} submitting={submitting}>İleri</StepButton>
          </>
        )}

        {step === 5 && (
          <>
            <Field label="IBAN" error={errors.iban}>
              <input value={form.iban} onChange={(e) => update('iban', e.target.value)} className={inputClass(!!errors.iban)} placeholder="TR..." />
            </Field>
            <Field label="Hesap Sahibi" error={errors.bank_account_holder}>
              <input value={form.bank_account_holder} onChange={(e) => update('bank_account_holder', e.target.value)} className={inputClass(!!errors.bank_account_holder)} />
            </Field>
            <Field label="Banka Adı" error={errors.bank_name}>
              <input value={form.bank_name} onChange={(e) => update('bank_name', e.target.value)} className={inputClass(!!errors.bank_name)} />
            </Field>
            <p className="text-[11px] text-slate-400">Ödeme bilgileriniz tamamlanmadan hakediş alamazsınız.</p>
            <StepButton onClick={handleStep5Next} submitting={submitting}>İleri</StepButton>
          </>
        )}

        {step === 6 && (
          <>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 max-h-40 overflow-y-auto text-xs text-slate-500 leading-relaxed">
              Tourkia Komisyon ve Kullanım Sözleşmesi: Platformda satış yapan işletmeler, gerçekleşen
              her rezervasyon üzerinden belirlenen komisyon oranı kadar kesinti kabul eder...
            </div>
            <label className="flex items-start gap-2 text-xs font-semibold text-slate-600">
              <input type="checkbox" checked={acceptContract} onChange={(e) => setAcceptContract(e.target.checked)} className="mt-0.5" />
              Komisyon ve kullanım sözleşmesini okudum, kabul ediyorum.
            </label>
            <label className="flex items-start gap-2 text-xs font-semibold text-slate-600">
              <input type="checkbox" checked={acceptKvkk} onChange={(e) => setAcceptKvkk(e.target.checked)} className="mt-0.5" />
              KVKK aydınlatma metnini okudum, onaylıyorum.
            </label>
            <StepButton onClick={handleFinalSubmit} submitting={submitting} disabled={!acceptContract || !acceptKvkk}>
              Başvuruyu Gönder
            </StepButton>
          </>
        )}
      </div>
    </div>
  );
}

function inputClass(hasError = false) {
  return `w-full px-5 py-3 rounded-2xl border ${hasError ? 'border-red-300' : 'border-gray-200'} focus:border-orange-500 outline-none transition bg-slate-50 focus:bg-white text-[14px] font-medium placeholder-gray-400`;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{label}</label>
      {children}
      {error && <p className="text-[11px] text-red-500 font-bold mt-1 ml-1">{error}</p>}
    </div>
  );
}

function FileField({ label, file, onChange, error, accept }: { label: string; file: File | null; onChange: (f: File | null) => void; error?: string; accept?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{label}</label>
      <input
        type="file"
        accept={accept}
        onChange={(e) => onChange(e.target.files?.[0] || null)}
        className="w-full text-xs font-medium text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-orange-50 file:text-orange-600 file:font-bold"
      />
      {file && <p className="text-[11px] text-green-600 font-bold mt-1 ml-1">✓ {file.name}</p>}
      {error && <p className="text-[11px] text-red-500 font-bold mt-1 ml-1">{error}</p>}
    </div>
  );
}

function StepButton({ onClick, submitting, disabled, children }: { onClick: () => void; submitting: boolean; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={submitting || disabled}
      className="w-full bg-orange-500 text-white font-black text-[15px] py-4 rounded-2xl mt-2 hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/30 hover:shadow-xl active:scale-[0.98] duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {submitting ? 'İşleniyor...' : children}
    </button>
  );
}
