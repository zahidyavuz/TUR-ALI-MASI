const fs = require('fs');
let c = fs.readFileSync('app/dashboard/agency/products/page.tsx', 'utf8');

c = c.replace(/block md:table /g, '');
c = c.replace(/hidden md:table-header-group/g, '');
c = c.replace(/block md:table-row-group/g, '');
c = c.replace(/block md:table-row bg-white dark:bg-slate-800\/50 border border-gray-100 dark:border-white\/5 rounded-2xl mb-4 p-4 md:p-0 md:border-none md:mb-0 md:rounded-none md:bg-transparent/g, '');
c = c.replace(/flex justify-between items-center md:table-cell border-b border-gray-50 dark:border-white\/5 last:border-0 md:border-b py-3 md:py-4/g, '');

const startTable = c.indexOf('<div className="overflow-x-auto">');
const endTable = c.indexOf('</table>', startTable) + 8;

const mobileCardCode = `
          {/* Mobile Card View */}
          <div className="md:hidden space-y-4 mb-6">
            {tours.map((tour) => (
              <div key={tour.id} className="bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start border-b border-gray-50 dark:border-white/5 pb-3">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tur ID</p>
                    <p className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300">{tour.id}</p>
                  </div>
                  <span className={\`text-[10px] uppercase font-black px-2.5 py-1 rounded-lg border \${
                      tour.status === 'Aktif' 
                        ? 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                        : 'bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                    }\`}>
                      {tour.status}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Tur Adı</p>
                  <p className="font-bold text-slate-800 dark:text-white">{tour.title}</p>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Fiyat</p>
                    <p className="font-black text-slate-800 dark:text-white">{tour.price}</p>
                  </div>
                  <button className="text-orange-500 font-bold text-sm bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 rounded-lg border border-orange-200 dark:border-orange-800">
                    Düzenle
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
`;

if (startTable !== -1) {
    c = c.substring(0, startTable) + mobileCardCode + c.substring(startTable + '<div className="overflow-x-auto">'.length, endTable) + '\n          </div>' + c.substring(endTable);
}

fs.writeFileSync('app/dashboard/agency/products/page.tsx', c);
console.log("Products fixed.");
