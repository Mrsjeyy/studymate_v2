import { BookOpen, Brain, Globe, Sparkles, ChevronRight, ChevronLeft, Users, X } from "lucide-react";

export default function Sidebar({ user, activeView, onNavigate, openMobile, collapsed, onToggleCollapse, onCloseMobile, pendingFriendCount = 0 }) {
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: BookOpen },
    { id: 'mine', label: 'Meine Sets', icon: Brain },
    { id: 'discover', label: 'Entdecken', icon: Globe },
    ...(user ? [{ id: 'favorites', label: 'Favoriten', icon: Sparkles }] : []),
    ...(user ? [{ id: 'friends', label: 'Freunde', icon: Users, badge: pendingFriendCount }] : []),
  ];

  return (
    <aside className={`sm-sidebar ${collapsed ? 'collapsed' : ''} ${openMobile ? 'mobile-open' : ''}`} onClick={e => e.stopPropagation()}>
      <div className="sm-sidebar-top" style={{ justifyContent: 'flex-end' }}>
        {openMobile
          ? <button className="sm-sidebar-collapse" onClick={onCloseMobile} title="Schließen"><X size={16} /></button>
          : <button className="sm-sidebar-collapse" onClick={onToggleCollapse} title="Sidebar ein-/ausblenden">{collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}</button>
        }
      </div>
      <div className="sm-sidebar-menu">
        {items.map(it => {
          const Icon = it.icon;
          const active = activeView === it.id || (it.id === 'dashboard' && activeView === 'dashboard');
          return (
            <button key={it.id} className={`sm-sidebar-item ${active ? 'active' : ''}`} onClick={() => { onNavigate(it.id); onCloseMobile?.(); }}>
              <Icon size={16} />
              <span>{it.label}</span>
              {it.badge > 0 && (
                <span style={{ marginLeft: 'auto', background: '#ef4444', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 6px', minWidth: 16, textAlign: 'center' }}>{it.badge}</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="sm-sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #00d4aa33, #8b5cf633)', border: '1px solid rgba(0,212,170,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', fontSize: 11, fontWeight: 600, color: '#00d4aa' }}>
            {user?.imageData ? <img src={user.imageData} alt="Profil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user?.initial}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>{user ? user.name : 'Gast'}</div>
        </div>
      </div>
    </aside>
  );
}
