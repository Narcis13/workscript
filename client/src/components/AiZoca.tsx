import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ContentRouter } from './ContentRouter';
import { FloatingActions } from './FloatingActions';

export function AiZoca() {
  const [currentRoute, setCurrentRoute] = useState('contacte');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const sidebarItems = [
    { id: 'panou-principal', label: 'Panou principal', icon: '📊', route: 'panou-principal' },
    { id: 'activitati', label: 'Activitati', icon: '📋', route: 'activitati' },
    { id: 'leads', label: 'Leads', icon: '🎯', route: 'leads' },
    { id: 'cereri', label: 'Cereri', icon: '📝', route: 'cereri' },
    { id: 'proprietati', label: 'Proprietati', icon: '🏠', route: 'proprietati' },
    { id: 'acp', label: 'ACP', icon: '🏢', route: 'acp' },
    { id: 'anunturi-particulari', label: 'Anunturi particulari', icon: '📢', route: 'anunturi-particulari' },
    { id: 'ansamburi', label: 'Ansamburi', icon: '🏘️', route: 'ansamburi' },
    { id: 'contacte', label: 'Contacte', icon: '👥', route: 'contacte' },
    { id: 'e-mail-uri', label: 'E-mail-uri', icon: '📧', route: 'e-mail-uri' },
    { id: 'rapoarte', label: 'Rapoarte', icon: '📈', route: 'rapoarte' },
    { id: 'media', label: 'Media', icon: '🖼️', route: 'media' },
    { id: 'obiective', label: 'Obiective', icon: '🎯', route: 'obiective' },
    { id: 'automatizari', label: 'Automatizari', icon: '⚙️', route: 'automatizari' },
    { id: 'documente', label: 'Documente', icon: '📄', route: 'documente' },
    { id: 'facturi', label: 'Facturi', icon: '💰', route: 'facturi' },
    { id: 'setari', label: 'Setari', icon: '⚙️', route: 'setari' },
  ];


  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar 
        items={sidebarItems} 
        currentRoute={currentRoute}
        onRouteChange={setCurrentRoute}
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
      />
      
      <div className="flex-1 flex flex-col lg:ml-0">
        <Header onMenuToggle={toggleSidebar} />
        <ContentRouter currentRoute={currentRoute} />
        <FloatingActions />
      </div>
    </div>
  );
}