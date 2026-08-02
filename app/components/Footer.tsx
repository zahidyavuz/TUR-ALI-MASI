export default function Footer() {
  return (
    <>
      {/* Kapsamlı Alt Bilgi (Footer) - Tourradar Tarzı */}
      <footer className="w-full bg-slate-50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-300 pt-12 pb-24 border-t border-gray-200 dark:border-slate-800 mt-0 transition-colors duration-500">
        <div className="max-w-[1400px] mx-auto px-6">

          {/* Orta Kısım: Sütunlar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-12 py-10 text-[13px] leading-[22px] border-b border-gray-300">
            {/* Sütun 1: Şirket */}
            <div>
              <h4 className="font-bold text-[15px] mb-4 text-slate-900">Şirket</h4>
              <ul className="flex flex-col gap-2 text-gray-600 font-medium">
                <li><a href="#" className="hover:text-blue-500 transition-colors">Hakkımızda</a></li>
                <li className="flex items-center gap-2">
                  <a href="#" className="hover:text-blue-500 transition-colors">Kariyerler</a>
                  <span className="border border-blue-200 text-[#008cb3] text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">Hemen Başvurun!</span>
                </li>
              </ul>
            </div>

            {/* Sütun 2: Organize Macera Platformu */}
            <div>
              <h4 className="font-bold text-[15px] mb-4 text-slate-900">Organize Macera Platformu</h4>
              <ul className="flex flex-col gap-2 text-gray-600 font-medium">
                <li><a href="#" className="hover:text-blue-500 transition-colors">Organize Macera Açıklaması</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">Bağlantılı iş çözümleri</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">Adventure Together Etkinlikleri</a></li>
              </ul>
            </div>

            {/* Sütun 3: Operatörler & Rehberler */}
            <div>
              <h4 className="font-bold text-[15px] mb-4 text-slate-900">Operatörler</h4>
              <ul className="flex flex-col gap-2 text-gray-600 font-medium mb-8">
                <li><a href="#" className="hover:text-blue-500 transition-colors">Başarılı bir işletme kurun</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">Ödeme çözümleri</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">Görünürlüğü artırın</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">Doğrudan rezervasyonları en üst düzeye çıkarın</a></li>
                <li><a href="#" className="hover:text-[#008cb3] text-[#005e85] transition-colors">Operatör girişi</a></li>
              </ul>

              <h4 className="font-bold text-[15px] mb-4 text-slate-900">Rehberler</h4>
              <ul className="flex flex-col gap-2 text-gray-600 font-medium">
                <li><a href="#" className="hover:text-blue-500 transition-colors">Yılın Rehberi</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">Rehber kaydı</a></li>
                <li><a href="#" className="hover:text-[#008cb3] text-[#005e85] transition-colors">Rehbere giriş yap</a></li>
              </ul>
            </div>

            {/* Sütun 4: Ortaklar */}
            <div>
              <h4 className="font-bold text-[15px] mb-4 text-slate-900">Ortaklar</h4>
              <ul className="flex flex-col gap-2 text-gray-600 font-medium">
                <li><a href="#" className="hover:text-blue-500 transition-colors">Seyahat acenteleri ve danışmanları</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">RISE: Ortaklar ve İçerik oluşturucular</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">DMO'lar ve pazarlamacılar</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">Çevrimiçi seyahat acenteleri, havayolları...</a></li>
                <li><a href="#" className="hover:text-[#008cb3] text-[#005e85] transition-colors">İş ortağı girişi</a></li>
              </ul>
            </div>

            {/* Sütun 5: Destek */}
            <div>
              <h4 className="font-bold text-[15px] mb-4 text-slate-900 dark:text-white">Destek</h4>
              <ul className="flex flex-col gap-3 text-gray-600 dark:text-slate-400 font-medium text-[13px]">
                <li><a href="#" className="hover:text-blue-500 transition-colors">Bize Ulaşın</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors">Yardım merkezi</a></li>
                <li className="text-gray-900 dark:text-slate-200 mt-2">Türkiye <a href="#" className="hover:text-blue-500 block text-gray-500 dark:text-slate-400">+90 850 123 45 67</a></li>
              </ul>
            </div>
          </div>

          {/* Alt Kısım: Dil, Sosyal, Ödeme ve Uygulama */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 items-start">

            <div className="hidden lg:block invisible">
              {/* Yer tutucu (layout bozulmasın diye) */}
            </div>

            {/* Bizi Takip Edin (Sosyal Medya) */}
            <div>
              <h4 className="font-bold text-[13px] mb-3 text-slate-900">Bizi takip edin</h4>
              <div className="flex gap-4 text-gray-600 border-none items-center mt-2">
                <span className="font-black hover:text-[#008cb3] cursor-pointer text-lg" title="Facebook">f</span>
                <span className="font-black hover:text-[#008cb3] cursor-pointer text-lg" title="X (Twitter)">𝕏</span>
                <span className="font-black hover:text-[#008cb3] cursor-pointer text-xl" title="Instagram">ℹ</span>
                <span className="font-black hover:text-[#2787F5] cursor-pointer text-xl" title="VKontakte">K</span>
                <span className="font-black hover:text-[#008cb3] cursor-pointer text-xl" title="WeChat (Weixin)">💬</span>
                <span className="font-black hover:text-[#e6162d] cursor-pointer text-xl" title="Sina Weibo">Ⓦ</span>
              </div>
            </div>

            {/* Ödeme Yöntemleri */}
            <div>
              <h4 className="font-bold text-[13px] mb-3 text-slate-900">Ödeme Yöntemleri</h4>
              <div className="flex gap-2 flex-wrap items-center">
                <span className="bg-white border border-gray-300 rounded px-2 py-0.5 text-blue-800 font-black italic text-[10px]">VISA</span>
                <span className="bg-white border border-gray-300 rounded px-2 py-0.5 text-red-500 font-bold text-[10px]">mastercard</span>
              </div>
            </div>

            <div className="hidden lg:block invisible">
              {/* Yer tutucu (layout bozulmasın diye) */}
            </div>

          </div>
        </div>
      </footer >

    </>
  );
}
