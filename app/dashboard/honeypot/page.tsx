'use client';

import { useState, useEffect } from 'react';

interface Incident {
    ip: string;
    userAgent: string;
    trapId: string;
    timestamp: string;
}

export default function HoneypotDashboard() {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchIncidents = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/security/honeypot/list', {
                headers: { 'x-admin-token': 'tourkia_admin_secret' }
            });
            const data = await res.json();
            setIncidents(data);
        } catch {
            // Fallback mock data
            setIncidents([
                {
                    ip: '103.21.5.44',
                    userAgent: 'Mozilla/5.0 (compatible; ScraperBot/1.0)',
                    trapId: 'admin-db-dump',
                    timestamp: new Date().toISOString()
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchIncidents(); }, []);

    return (
        <>
            <div className="dash-section-header">
                <h2>🍯 Bal Küpü (Honeypot) Kapanları</h2>
                <button onClick={fetchIncidents} className="dash-btn dash-btn-secondary dash-btn-sm">🔄 Listeyi Yenile</button>
            </div>

            <div style={{ 
                background: 'rgba(245,158,11,0.1)', border: '1px solid #f59e0b', 
                padding: '16px', borderRadius: '12px', marginBottom: '24px',
                fontSize: '14px', color: '#b45309', fontWeight: 600
            }}>
                💡 Honeypotlar, normal kullanıcıların göremeyeceği gizli linklerdir. Bu linklere tıklayanlar otomatik olarak <strong>Süresiz Banlanır</strong>.
            </div>

            <div className="dash-table-container">
                <table className="dash-table">
                    <thead>
                        <tr>
                            <th>Zaman</th>
                            <th>IP Adresi</th>
                            <th>Düştüğü Tuzak</th>
                            <th>Tarayıcı / Bot Bilgisi</th>
                            <th>İşlem</th>
                        </tr>
                    </thead>
                    <tbody>
                        {incidents.map((inc, idx) => (
                            <tr key={idx}>
                                <td style={{ fontSize: '12px' }}>{new Date(inc.timestamp).toLocaleString('tr-TR')}</td>
                                <td style={{ fontWeight: 900, color: '#ef4444' }}>{inc.ip}</td>
                                <td>
                                    <span style={{ 
                                        padding: '4px 8px', background: '#fee2e2', color: '#991b1b', 
                                        borderRadius: '6px', fontSize: '11px', fontWeight: 800 
                                    }}>
                                        {inc.trapId}
                                    </span>
                                </td>
                                <td style={{ fontSize: '11px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {inc.userAgent}
                                </td>
                                <td>
                                    <button className="dash-btn dash-btn-sm" style={{ background: '#10b981', color: '#fff', fontSize: '10px' }}>Banı Kaldır</button>
                                </td>
                            </tr>
                        ))}
                        {incidents.length === 0 && (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--dash-text-muted)' }}>
                                    Şu an için yakalanan bir siber saldırgan yok.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}
