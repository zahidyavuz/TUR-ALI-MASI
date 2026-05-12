const fs = require('fs');
let c = fs.readFileSync('app/dashboard/agency/finance/page.tsx', 'utf8');

c = c.replace(/block md:table /g, '');
c = c.replace(/hidden md:table-header-group/g, '');
c = c.replace(/block md:table-row-group/g, '');
c = c.replace(/block md:table-row bg-white dark:bg-slate-800\/50 border border-gray-100 dark:border-white\/5 rounded-2xl mb-4 p-4 md:p-0 md:border-none md:mb-0 md:rounded-none md:bg-transparent/g, '');
c = c.replace(/flex justify-between items-center md:table-cell border-b border-gray-50 dark:border-white\/5 last:border-0 md:border-b py-3 md:py-4/g, '');

const startTable = c.indexOf('<div className="overflow-x-auto">');
const endTable = c.indexOf('</table>', startTable) + 8;

const formatPrice = (val) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);

const mobileCardCode = `
          {/* Mobile Card View */}
          <div className="md:hidden space-y-4 mb-6">
            {transactions.map((trx) => (
              <div key={trx.id} className="bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start border-b border-gray-50 dark:border-white/5 pb-3">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">İşlem No</p>
                    <p className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300">{trx.id}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{trx.date}</p>
                  </div>
                  <span className={\`text-[10px] uppercase font-black px-2.5 py-1 rounded-lg border \${
                      trx.status.includes('Temizlendi') 
                        ? 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                        : 'bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                    }\`}>
                      {trx.status}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Açıklama</p>
                  <p className="font-bold text-sm text-slate-800 dark:text-white">{trx.description}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 mt-1 grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tahsilat</p>
                    <p className="font-bold text-slate-700 dark:text-slate-300">{(trx.customerPaid).toLocaleString('tr-TR')} ₺</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Komisyon</p>
                    <p className="font-bold text-red-500">{(trx.commissionAmount).toLocaleString('tr-TR')} ₺</p>
                  </div>
                </div>
                <div className="flex justify-between items-center border-t border-gray-50 dark:border-white/5 pt-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Net Hakediş</p>
                  <p className="font-black text-lg text-emerald-600 dark:text-emerald-400">{(trx.netEarned).toLocaleString('tr-TR')} ₺</p>
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

fs.writeFileSync('app/dashboard/agency/finance/page.tsx', c);
console.log("Finance fixed.");
