'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Goal {
    id: string;
    place: string;
    isVisited: boolean;
    image: string;
}

export default function GoalsPage() {
    const [goals, setGoals] = useState<Goal[]>([
        { id: '1', place: 'Kapadokya, Türkiye', isVisited: true, image: 'https://images.unsplash.com/photo-1641128324972-af3212f0f6bd?auto=format&fit=crop&q=80&w=400' },
        { id: '2', place: 'Kemer, Antalya', isVisited: false, image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=400' },
        { id: '3', place: 'Sultanahmet, İstanbul', isVisited: false, image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&q=80&w=400' },
        { id: '4', place: 'Kaş, Antalya', isVisited: true, image: 'https://images.unsplash.com/photo-1502602881469-447819086e49?auto=format&fit=crop&q=80&w=400' }
    ]);

    const [newGoal, setNewGoal] = useState('');
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const handleAddGoal = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGoal.trim()) return;

        const goal: Goal = {
            id: Date.now().toString(),
            place: newGoal,
            isVisited: false,
            image: 'https://images.unsplash.com/photo-1488085061387-422e29b40080?auto=format&fit=crop&q=80&w=400' // Generic travel image
        };
        setGoals([...goals, goal]);
        setNewGoal('');
    };

    const toggleVisited = (id: string) => {
        setGoals(goals.map(g => g.id === id ? { ...g, isVisited: !g.isVisited } : g));
    };

    if (!isClient) return null;

    return (
        <div className="min-h-screen bg-slate-50 py-12 font-sans overflow-x-hidden">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold text-[#005e85] tracking-tight">Bucket List (Hedeflerim)</h1>
                        <p className="text-gray-500 font-medium text-sm mt-1">Keşfetmeyi hayal ettiğin yerleri ekle, biz senin için en iyi zamanı planlayalım.</p>
                    </div>
                    <Link href="/" className="hidden sm:flex text-gray-500 hover:text-[#008cb3] text-sm font-bold items-center gap-2 transition-colors">
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Anasayfaya Dön
                    </Link>
                </div>

                {/* AI Asistant Box */}
                <div className="bg-gradient-to-r from-[#008cb3] to-indigo-600 rounded-2xl p-6 text-white mb-8 shadow-lg flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-10 -mt-20 pointer-events-none group-hover:bg-white/20 transition-all duration-700"></div>
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 relative z-10 backdrop-blur-sm border border-white/30">
                        <span className="text-3xl">🤖</span>
                    </div>
                    <div className="relative z-10 text-center sm:text-left">
                        <h3 className="text-lg font-bold mb-1 tracking-wide">TourGo Yapay Zeka Planlayıcı</h3>
                        <p className="text-white/80 text-sm leading-relaxed max-w-2xl">
                            Listendeki <strong>{goals.filter(g => !g.isVisited).length}</strong> henüz gidilmeyen hedef için hava durumu, yoğunluk ve bilet fiyatlarını analiz ediyorum.
                            <br className="hidden sm:block" />
                            <em>Antalya için en uygun zamanın Eylül başı olduğunu biliyor muydun? O döneme özel turları senin için takip ediyorum!</em>
                        </p>
                    </div>
                    <button className="relative z-10 sm:ml-auto bg-white text-[#008cb3] font-black text-xs uppercase tracking-widest px-6 py-3 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                        Analizi Gör
                    </button>
                </div>

                {/* Ekleme Formu */}
                <form onSubmit={handleAddGoal} className="bg-white p-2 pl-4 rounded-full shadow-sm border border-gray-100 flex items-center mb-10">
                    <svg className="text-gray-400 ml-2 mr-3" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <input
                        type="text"
                        value={newGoal}
                        onChange={e => setNewGoal(e.target.value)}
                        placeholder="Örn: Kuzey Işıkları, Safari turu, Kyoto sokakları..."
                        className="flex-1 bg-transparent text-gray-800 font-bold outline-none border-none placeholder-gray-300"
                    />
                    <button type="submit" className="bg-[#008cb3] hover:bg-[#005e85] text-white font-bold px-6 py-3 rounded-full transition-colors active:scale-95 shadow-md">
                        Hedef Ekle
                    </button>
                </form>

                {/* Hedefler Listesi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {goals.map(goal => (
                        <div key={goal.id} className="relative group rounded-[20px] overflow-hidden bg-white shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 cursor-pointer" onClick={() => toggleVisited(goal.id)}>
                            <div className={`relative h-48 w-full transition-all duration-500 ${goal.isVisited ? 'grayscale-0' : 'grayscale-[0.85] opacity-80 group-hover:grayscale-0 group-hover:opacity-100'}`}>
                                <Image src={goal.image} alt={goal.place} fill className="object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

                                {/* Etiket */}
                                <div className="absolute top-3 right-3">
                                    {goal.isVisited ? (
                                        <span className="bg-green-500/90 backdrop-blur-sm text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-full shadow-md flex items-center gap-1">
                                            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                            Gidildi
                                        </span>
                                    ) : (
                                        <span className="bg-white/90 backdrop-blur-sm text-gray-800 text-[10px] font-black uppercase px-3 py-1.5 rounded-full shadow-md">
                                            🌟 Hayalim
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="p-5 flex items-center justify-between">
                                <h3 className={`font-bold truncate pr-3 ${goal.isVisited ? 'text-[#008cb3]' : 'text-slate-700'}`}>{goal.place}</h3>
                                <button className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center flex-shrink-0 group-hover:border-[#008cb3] transition-colors" title="Durumu Değiştir">
                                    {goal.isVisited && <svg className="text-[#008cb3]" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="h-10"></div>
            </div>
        </div>
    );
}
