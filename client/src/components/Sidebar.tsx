import { Logo } from './Logo';

interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  route: string;
}

interface SidebarProps {
  items: SidebarItem[];
  currentRoute: string;
  onRouteChange: (route: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ items, currentRoute, onRouteChange, isOpen, onClose }: SidebarProps) {
  const handleItemClick = (route: string) => {
    onRouteChange(route);
    onClose(); // Close mobile menu after selection
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-slate-800 text-white flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Mobile close button */}
        <div className="lg:hidden flex justify-end p-4">
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Logo - adjust padding for mobile close button */}
        <div className="lg:block hidden">
          <Logo />
        </div>
        
        {/* Mobile logo (smaller spacing) */}
        <div className="lg:hidden block px-4 pb-4 border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-purple-500 rounded"></div>
            <span className="text-lg font-semibold">AI ZOCA</span>
          </div>
        </div>
        
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => handleItemClick(item.route)}
                  className={`w-full flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentRoute === item.route
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  <span className="mr-3 text-base">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
}