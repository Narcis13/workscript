import { Contact } from '../pages/Contacte';

interface Activity {
  id: string;
  type: 'email' | 'call' | 'meeting' | 'note' | 'system';
  title: string;
  description: string;
  timestamp: string;
  color: string;
}

interface ActivityHistorySectionProps {
  contact: Contact;
}

export function ActivityHistorySection({ contact }: ActivityHistorySectionProps) {
  // Mock activities - will be replaced with real data later
  const mockActivities: Activity[] = [
    {
      id: '1',
      type: 'system',
      title: 'Activitate adaugata',
      description: 'Vizionare',
      timestamp: 'Astazi • 14:30',
      color: 'border-green-400'
    },
    {
      id: '2',
      type: 'email',
      title: 'Email trimis',
      description: 'Confirmare programare vizionare',
      timestamp: 'Ieri • 16:45',
      color: 'border-blue-400'
    },
    {
      id: '3',
      type: 'call',
      title: 'Apel telefonic',
      description: 'Discutie despre preferinte proprietati',
      timestamp: 'Acum 2 zile • 10:30',
      color: 'border-purple-400'
    },
    {
      id: '4',
      type: 'system',
      title: 'Contact creat',
      description: 'Contact initial din formular website',
      timestamp: 'Acum 3 zile • 09:15',
      color: 'border-gray-400'
    }
  ];

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'email':
        return (
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
          </svg>
        );
      case 'call':
        return (
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
          </svg>
        );
      case 'meeting':
        return (
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
          </svg>
        );
      case 'note':
        return (
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a2 2 0 002 2h6a2 2 0 002-2V3a2 2 0 012 2v6.586A2 2 0 0117.414 13L16 14.414V17a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">ISTORIC</h3>
      
      <div className="space-y-3">
        {mockActivities.map((activity) => (
          <div key={activity.id} className={`border-l-4 ${activity.color} pl-4 py-3 relative`}>
            {/* Activity icon */}
            <div className={`absolute left-[-8px] top-4 w-4 h-4 rounded-full ${activity.color.replace('border-', 'bg-')} flex items-center justify-center`}>
              {getActivityIcon(activity.type)}
            </div>
            
            <div className="space-y-1">
              <div className="text-sm font-medium text-gray-900">{activity.title}</div>
              <div className="text-xs text-gray-600">{activity.description}</div>
              <div className="text-xs text-gray-400">{activity.timestamp}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state when no activities */}
      {mockActivities.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">Nu exista activitati inregistrate</p>
        </div>
      )}
    </div>
  );
}