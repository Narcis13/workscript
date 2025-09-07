import { Contact } from '../pages/Contacte';

interface StatisticsGridProps {
  contact: Contact;
}

interface StatisticItem {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}

export function StatisticsGrid({ contact }: StatisticsGridProps) {
  const statistics: StatisticItem[] = [
    {
      label: 'Interactiuni',
      value: contact.interactionCount || 0,
      color: 'bg-blue-50 text-blue-600',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
        </svg>
      )
    },
    {
      label: 'Email-uri',
      value: contact.emailCount || 0,
      color: 'bg-green-50 text-green-600',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
        </svg>
      )
    },
    {
      label: 'Apeluri',
      value: contact.callCount || 0,
      color: 'bg-purple-50 text-purple-600',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
        </svg>
      )
    },
    {
      label: 'Intalniri',
      value: contact.meetingCount || 0,
      color: 'bg-yellow-50 text-yellow-600',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
        </svg>
      )
    }
  ];

  // Additional statistics if available
  const additionalStats: StatisticItem[] = [];
  
  if (contact.propertiesCount !== undefined && contact.propertiesCount > 0) {
    additionalStats.push({
      label: 'Proprietati',
      value: contact.propertiesCount,
      color: 'bg-indigo-50 text-indigo-600',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
        </svg>
      )
    });
  }

  if (contact.clientRequestsCount !== undefined && contact.clientRequestsCount > 0) {
    additionalStats.push({
      label: 'Cereri',
      value: contact.clientRequestsCount,
      color: 'bg-pink-50 text-pink-600',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      )
    });
  }

  const allStats = [...statistics, ...additionalStats];

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-800 mb-3">Statistici</h3>
      <div className={`grid grid-cols-2 gap-4 ${allStats.length > 4 ? 'md:grid-cols-3' : ''}`}>
        {allStats.map((stat, index) => (
          <div key={index} className={`${stat.color.split(' ')[0]} p-3 rounded-lg`}>
            <div className="flex items-center justify-between mb-1">
              <div className={`${stat.color.split(' ')[1]}`}>
                {stat.icon}
              </div>
              <div className={`text-lg font-bold ${stat.color.split(' ')[1]}`}>
                {stat.value}
              </div>
            </div>
            <div className="text-xs text-gray-600">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}