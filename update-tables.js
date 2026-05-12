const fs = require('fs');
const files = [
  'app/dashboard/agency/products/page.tsx',
  'app/dashboard/agency/finance/page.tsx',
  'app/dashboard/agency/bookings/page.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let c = fs.readFileSync(file, 'utf8');

    // Make table itself a block element on mobile
    c = c.replace(/<table className="([^"]+)"/g, (match, classes) => {
      let newClasses = classes.includes('w-full') ? classes : classes + ' w-full';
      if (!newClasses.includes('md:table')) {
        newClasses = newClasses.replace('w-full', 'w-full block md:table');
      }
      return `<table className="${newClasses}"`;
    });

    // Hide table headers on mobile
    c = c.replace(/<thead className="([^"]+)"/g, (match, classes) => {
      let newClasses = classes;
      if (!newClasses.includes('md:table-header-group')) {
        newClasses = newClasses + ' hidden md:table-header-group';
      }
      return `<thead className="${newClasses}"`;
    });
    // In case thead has no className
    c = c.replace(/<thead>/g, '<thead className="hidden md:table-header-group">');

    // Tbody
    c = c.replace(/<tbody className="([^"]+)"/g, (match, classes) => {
      let newClasses = classes;
      if (!newClasses.includes('md:table-row-group')) {
        newClasses = newClasses + ' block md:table-row-group';
      }
      return `<tbody className="${newClasses}"`;
    });
    c = c.replace(/<tbody>/g, '<tbody className="block md:table-row-group">');

    // Rows (tr)
    c = c.replace(/<tr className="([^"]+)"/g, (match, classes) => {
      let newClasses = classes;
      // In headers, we already hid thead, so we don't need to change tr inside thead. 
      // BUT for tbody tr, we want card styles.
      // We will blindly apply block to tr, it will be hidden by the hidden thead anyway.
      if (!newClasses.includes('md:table-row')) {
        newClasses = newClasses + ' block md:table-row bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-white/5 rounded-2xl mb-4 p-4 md:p-0 md:border-none md:mb-0 md:rounded-none md:bg-transparent';
      }
      return `<tr className="${newClasses}"`;
    });
    c = c.replace(/<tr>/g, '<tr className="block md:table-row bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-white/5 rounded-2xl mb-4 p-4 md:p-0 md:border-none md:mb-0 md:rounded-none md:bg-transparent">');

    // Cells (td)
    c = c.replace(/<td className="([^"]+)"/g, (match, classes) => {
      let newClasses = classes;
      if (!newClasses.includes('md:table-cell')) {
        newClasses = newClasses + ' flex justify-between items-center md:table-cell border-b border-gray-50 dark:border-white/5 last:border-0 md:border-b py-3 md:py-4';
      }
      return `<td className="${newClasses}"`;
    });
    c = c.replace(/<td>/g, '<td className="flex justify-between items-center md:table-cell border-b border-gray-50 dark:border-white/5 last:border-0 md:border-b py-3 md:py-4">');

    fs.writeFileSync(file, c);
    console.log(`Updated ${file}`);
  }
});
