import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ContentRouter } from './ContentRouter';
import { FloatingActions } from './FloatingActions';

export function AiZoca() {
  const [currentRoute, setCurrentRoute] = useState('contacte');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const sidebarItems = [
    { id: 'agenti-ai', label: 'Agenti AI', icon: '📊', route: 'agenti-ai' },
    { id: 'activitati', label: 'Activitati', icon: '📋', route: 'activitati' },

    { id: 'cereri', label: 'Cereri', icon: '📝', route: 'cereri' },
    { id: 'proprietati', label: 'Proprietati', icon: '🏠', route: 'proprietati' },

    { id: 'anunturi-particulari', label: 'Anunturi particulari', icon: '📢', route: 'anunturi-particulari' },

    { id: 'contacte', label: 'Contacte', icon: '👥', route: 'contacte' },
    { id: 'e-mail-uri', label: 'E-mail-uri', icon: '📧', route: 'e-mail-uri' },
    { id: 'rapoarte', label: 'Rapoarte', icon: '📈', route: 'rapoarte' },

    { id: 'automatizari', label: 'Automatizari', icon: '⚙️', route: 'automatizari' },
    { id: 'documente', label: 'Documente', icon: '📄', route: 'documente' },

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