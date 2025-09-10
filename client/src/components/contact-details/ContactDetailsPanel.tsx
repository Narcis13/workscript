import { useState, useEffect } from 'react';
import { Contact } from '../pages/Contacte';
import { PanelHeader } from './PanelHeader';
import { TabNavigation } from './TabNavigation';
import { ContactInfoSection } from './ContactInfoSection';
import { ActivityHistorySection } from './ActivityHistorySection';
import { StatisticsGrid } from './StatisticsGrid';

interface ContactDetailsPanelProps {
  contact: Contact | null;
  isOpen: boolean;
  onClose: () => void;
}

interface Tab {
  id: string;
  label: string;
  icon?: string;
}

const tabs: Tab[] = [
  { id: 'detalii', label: 'Detalii' },
  { id: 'activitati', label: 'Activitati' },
  { id: 'propuseri', label: 'Propuseri' },
  { id: 'mesaje', label: 'Mesaje' },
];

export function ContactDetailsPanel({ contact, isOpen, onClose }: ContactDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState('detalii');
  const [fullContextFromChild, setFullContextFromChild] = useState<any>(null);

  const handleFollowUp = () => {
    console.log('Follow-up!', { fullContext: fullContextFromChild });
  };

  // Reset active tab when contact changes
  useEffect(() => {
    if (contact) {
      setActiveTab('detalii');
    }
  }, [contact?.id]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!contact) return null;

  return (
    <>
      {/* Backdrop/Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black transition-opacity duration-300 ${
          isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 h-full z-50 bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } 
        w-full md:w-[480px] lg:w-[550px] xl:w-[600px]`}
      >
        {/* Header */}
        <PanelHeader
          firstName={contact.firstName}
          lastName={contact.lastName}
          onClose={onClose}
        />

        {/* Tab Navigation */}
        <TabNavigation
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Content */}
        <div className={`flex-1 overflow-y-auto p-4 ${activeTab === 'detalii' ? 'pb-20' : ''}`}>
          {activeTab === 'detalii' && (
            <div className="space-y-6">
              <ContactInfoSection contact={contact} />
              <StatisticsGrid 
                contact={contact} 
                onFullContextChange={setFullContextFromChild}
              />
            </div>
          )}

          {activeTab === 'activitati' && (
            <ActivityHistorySection contact={contact} />
          )}

          {/* Other tabs placeholder */}
          {activeTab !== 'detalii' && activeTab !== 'activitati' && (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500">Sectiunea {tabs.find(t => t.id === activeTab)?.label} va fi implementata</p>
            </div>
          )}
        </div>

        {/* Footer with Follow-up Button - Only show on 'detalii' tab */}
        {activeTab === 'detalii' && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
            <button
              onClick={handleFollowUp}
              className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Follow-up
            </button>
          </div>
        )}
      </div>
    </>
  );
}