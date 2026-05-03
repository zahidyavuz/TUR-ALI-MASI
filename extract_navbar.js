const fs = require('fs');

const pageContent = fs.readFileSync('app/page.tsx', 'utf8');
const lines = pageContent.split('\n');

const navbarCode = lines.slice(286, 611).join('\n'); // 287 to 611 is index 286 to 610, let's include 611 as well for safety.

const component = `
'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLocale, Locale } from '../context/LocaleContext';
import { useAuth } from '../context/AuthContext';
import CurrencySelector from './CurrencySelector';
import GeofenceTrigger from './GeofenceTrigger';
import NotificationCenter from './NotificationCenter';
import { useRouter } from 'next/navigation';

export default function Navbar({ setShowAgencyModal, setAgencyTab }: { setShowAgencyModal?: (val: boolean) => void, setAgencyTab?: (val: 'login' | 'register') => void }) {
  const { t, locale, setLocale } = useLocale();
  const { isLoggedIn, logout, userRole } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const router = useRouter();

  const toggleDropdown = (dropdownName: string) => {
    if (activeDropdown === dropdownName) {
      setActiveDropdown(null);
    } else {
      setActiveDropdown(dropdownName);
    }
  };

  const handleAgencyLogin = () => {
    if (setShowAgencyModal && setAgencyTab) {
      setShowAgencyModal(true);
      setAgencyTab('login');
    } else {
      router.push('/?showAgencyModal=true&tab=login');
    }
    setActiveDropdown(null);
  };

  return (
    <>
${navbarCode.replace(/setShowAgencyModal\(true\);\s*setAgencyTab\('login'\);/g, 'handleAgencyLogin();')}
    </>
  );
}
`;

fs.writeFileSync('app/components/Navbar.tsx', component);
console.log('Navbar component created.');
