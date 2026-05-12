'use client';

export default function SettingsPage() {
  return (
    <>
      <div className="dash-section-header">
        <h2>Ayarlar</h2>
      </div>
      <div className="stat-card accent-purple">
        <div className="stat-card-icon">⚙️</div>
        <div className="stat-card-value" style={{ marginTop: '16px' }}>Yakında</div>
        <div className="stat-card-label">Bu modül geliştirme aşamasındadır</div>
      </div>
    </>
  );
}
