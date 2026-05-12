const fs = require('fs');
let c = fs.readFileSync('app/tour/[slug]/page.tsx', 'utf8');

if (!c.includes('isMobileSheetOpen')) {
    // 1. Add State
    c = c.replace(
        'const [isDateError, setIsDateError] = useState(false);',
        'const [isDateError, setIsDateError] = useState(false);\n    const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);'
    );

    // 2. Extract Booking Widget
    const startMarker = '<div className="w-full lg:w-1/3 z-10">';
    const endMarker = '                </div>\r\n            </div>\r\n\r\n            {/* Bottom Section: Tur Detayları */}';
    
    if (c.includes(startMarker) && c.includes(endMarker)) {
        const wstart = c.indexOf(startMarker);
        const wend = c.indexOf(endMarker);
        
        // Extract inner content of the widget div
        const widgetCode = c.substring(wstart + startMarker.length, wend).trim();
        
        // Replace with render function and bottom sheet
        const newCode = `
            const renderBookingWidget = () => (
                <div className="w-full">
                    ${widgetCode}
                </div>
            );

            return (
                <div className="w-full lg:w-1/3 z-10 hidden lg:block">
                    {renderBookingWidget()}
                </div>

                {/* Mobile Bottom Sheet Overlay */}
                <div 
                    className={\`fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden \${isMobileSheetOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}\`} 
                    onClick={() => setIsMobileSheetOpen(false)}
                ></div>
                
                {/* Mobile Bottom Sheet Content */}
                <div 
                    className={\`fixed bottom-0 left-0 w-full bg-white dark:bg-slate-900 z-[120] rounded-t-[32px] shadow-[0_-15px_40px_rgba(0,0,0,0.2)] transition-transform duration-500 transform lg:hidden \${isMobileSheetOpen ? 'translate-y-0' : 'translate-y-full'} max-h-[85vh] overflow-y-auto\`}
                >
                    <div className="p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
                        <div className="w-12 h-1.5 bg-gray-300 dark:bg-slate-700 rounded-full mx-auto mb-6"></div>
                        {renderBookingWidget()}
                    </div>
                </div>
            </div>

            {/* Bottom Section: Tur Detayları */}
        `;
        
        c = c.substring(0, wstart) + newCode + c.substring(wend + endMarker.length);
        
        // 3. Change the mobile Sticky Button onClick
        const oldStickyButtonStart = `onClick={(e) => {
                        e.preventDefault();
                        if (!selectedDate) {`;
                        
        if (c.includes(oldStickyButtonStart)) {
            const buttonStart = c.indexOf(oldStickyButtonStart);
            const buttonEndStr = `</button>
            </div>`;
            const buttonEnd = c.indexOf(buttonEndStr, buttonStart) + buttonEndStr.length;
            
            const newButton = `onClick={(e) => {
                        e.preventDefault();
                        setIsMobileSheetOpen(true);
                    }}
                    className="bg-orange-500 active:scale-95 text-white font-black px-6 py-4 rounded-xl shadow-[0_10px_25px_-5px_rgba(249,115,22,0.4)] flex items-center gap-2 text-sm transition-all"
                >
                    <div className="flex items-center gap-1.5">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <span>{locale === 'en-US' ? 'Select Date & Book' : 'Tarih Seç ve Öde'}</span>
                    </div>
                    <span className="text-lg">➔</span>
                </button>
            </div>`;
            
            c = c.substring(0, buttonStart) + newButton + c.substring(buttonEnd);
        }
    }
    
    fs.writeFileSync('app/tour/[slug]/page.tsx', c);
    console.log("SUCCESS");
}
