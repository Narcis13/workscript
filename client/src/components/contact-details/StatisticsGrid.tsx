import { useState, useEffect } from 'react';
import { Contact } from '../pages/Contacte';

interface StatisticsGridProps {
  contact: Contact;
  onFullContextChange?: (fullContext: FullContextData | null) => void;
}

interface StatisticItem {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}

interface FullContextData {
  contact: Contact | null;
  ownedProperty: any | null;
  clientRequest: any | null;
  activities: any[];
}

// Helper function to parse DD-MM-YYYY HH:MM:SS format
function parseDateString(dateString: string): Date | null {
  if (!dateString) return null;
  
  // Handle format like '15-07-2025  20:30:00' (note the double spaces)
  const trimmed = dateString.trim();
  const match = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  
  if (match) {
    const [, day, month, year, hour, minute, second] = match;
    // Create date in ISO format: YYYY-MM-DDTHH:MM:SS
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
  }
  
  // Fallback to native Date parsing
  return new Date(dateString);
}

export function StatisticsGrid({ contact, onFullContextChange }: StatisticsGridProps) {
  const [fullContext, setFullContext] = useState<FullContextData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFullContext = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:3013/api/zoca/contacts/fullcontext/${contact.id}`);
        const result = await response.json();
        
        if (result.success) {
          setFullContext(result.data);
          onFullContextChange?.(result.data);
        } else {
          setError(result.error || 'Failed to fetch contact context');
        }
      } catch (err) {
        setError('Network error while fetching contact context');
        console.error('Error fetching full context:', err);
        onFullContextChange?.(null);
      } finally {
        setLoading(false);
      }
    };

    if (contact.id) {
      fetchFullContext();
    }
  }, [contact.id]);

  if (loading) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Statistici</h3>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-100 p-3 rounded-lg animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-6 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Statistici</h3>
        <div className="text-red-600 text-sm">{error}</div>
      </div>
    );
  }

  const currentContact = fullContext?.contact || contact;
  const statistics: StatisticItem[] = [
    {
      label: 'Interactiuni',
      value: currentContact.interactionCount || 0,
      color: 'bg-blue-50 text-blue-600',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
        </svg>
      )
    },
    {
      label: 'Email-uri',
      value: currentContact.emailCount || 0,
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
      value: currentContact.callCount || 0,
      color: 'bg-purple-50 text-purple-600',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
        </svg>
      )
    },
    {
      label: 'Intalniri',
      value: currentContact.meetingCount || 0,
      color: 'bg-yellow-50 text-yellow-600',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
        </svg>
      )
    }
  ];

  // Additional statistics based on full context
  const additionalStats: StatisticItem[] = [];
  
  // Show owned property count
  if (fullContext?.ownedProperty) {
    additionalStats.push({
      label: 'Proprietati',
      value: 1,
      color: 'bg-indigo-50 text-indigo-600',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
        </svg>
      )
    });
  }

  // Show client request count
  if (fullContext?.clientRequest) {
    additionalStats.push({
      label: 'Cereri',
      value: 1,
      color: 'bg-pink-50 text-pink-600',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      )
    });
  }

  // Show activities count
  if (fullContext?.activities && fullContext.activities.length > 0) {
    additionalStats.push({
      label: 'Activitati',
      value: fullContext.activities.length,
      color: 'bg-orange-50 text-orange-600',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
        </svg>
      )
    });
  }

  // Fallback to original counts if no full context available
  if (!fullContext) {
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
  }

  const allStats = [...statistics, ...additionalStats];

  const handlePropertyClick = () => {
    if (fullContext?.ownedProperty?.virtualTourUrl) {
      window.open(fullContext.ownedProperty.virtualTourUrl, '_blank');
    }
  };
//console.log(fullContext)
  // If contact owns a property, show property owner card instead of statistics
  if (fullContext?.ownedProperty) {
    const property = fullContext.ownedProperty;
    const photos = Array.isArray(property.photos) ? property.photos : [];
    const mainPhoto = photos.length > 0 ? photos[0] : null;

    return (
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">PROPRIETAR LA</h3>
        <div 
          className={`bg-white border border-gray-200 rounded-lg p-4 ${property.virtualTourUrl ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
          onClick={handlePropertyClick}
        >
          <div className="flex gap-4">
            {/* Property Image */}
            <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
              {mainPhoto ? (
                <img 
                  src={mainPhoto} 
                  alt="Property" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                </div>
              )}
            </div>
            
            {/* Property Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    property.status === 'activ' ? 'bg-green-100 text-green-800' : 
                    property.status === 'vandut' ? 'bg-gray-100 text-gray-800' :
                    property.status === 'rezervat' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {property.status === 'activ' ? 'Activa' : 
                     property.status === 'vandut' ? 'Vandut' :
                     property.status === 'rezervat' ? 'Rezervat' :
                     property.status}
                  </span>
                  {property.internalCode && (
                    <span className="text-sm font-medium text-gray-900">
                      P{property.internalCode}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="text-sm font-semibold text-gray-900">
                  {property.price && property.currency && (
                    <span>{property.price}{property.currency} / </span>
                  )}
                  {property.transactionType === 'vanzare' ? 'Vanzare' : 
                   property.transactionType === 'inchiriere' ? 'Inchiriere' : property.transactionType}
                  {property.propertyType && (
                    <span> / {property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1)}</span>
                  )}
                  {property.neighborhood && (
                    <span> / {property.neighborhood}</span>
                  )}
                </div>
                
                {(property.rooms || property.surfaceArea) && (
                  <div className="text-xs text-gray-600">
                    {property.rooms && <span>{property.rooms} camere</span>}
                    {property.rooms && property.surfaceArea && <span> • </span>}
                    {property.surfaceArea && <span>{property.surfaceArea}mp</span>}
                  </div>
                )}
              </div>
            </div>
            
            {/* Virtual Tour Icon */}
            {property.virtualTourUrl && (
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
        </div>
        
        {/* ISTORIC Section */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">ISTORIC</h3>
          <div className="space-y-4">
            {/* Property Added Timeline Entry */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Proprietate adaugata
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {property.availableFrom && new Date(property.availableFrom).toLocaleString('ro-RO', {
                    day: '2-digit',
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                {property.internalCode && (
                  <div className="mt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      P{property.internalCode}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Additional timeline entries from activities */}
            {fullContext?.activities && fullContext.activities.length > 0 && (
              <>
                {fullContext.activities
                  .sort((a: any, b: any) => {
                    const dateA = new Date(a.scheduledDateTime || a.createdAt || 0);
                    const dateB = new Date(b.scheduledDateTime || b.createdAt || 0);
                    return dateB.getTime() - dateA.getTime();
                  })
                  .slice(0, 3).map((activity: any) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        activity.activityType === 'call' ? 'bg-green-100' :
                        activity.activityType === 'meeting' ? 'bg-purple-100' :
                        activity.activityType === 'viewing' ? 'bg-orange-100' :
                        'bg-gray-100'
                      }`}>
                        <svg className={`w-4 h-4 ${
                          activity.activityType === 'call' ? 'text-green-600' :
                          activity.activityType === 'meeting' ? 'text-purple-600' :
                          activity.activityType === 'viewing' ? 'text-orange-600' :
                          'text-gray-600'
                        }`} fill="currentColor" viewBox="0 0 20 20">
                          {activity.activityType === 'call' ? (
                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                          ) : activity.activityType === 'meeting' || activity.activityType === 'viewing' ? (
                            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                          ) : (
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                          )}
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          activity.activityType === 'call' ? 'bg-green-100 text-green-800' :
                          activity.activityType === 'meeting' ? 'bg-purple-100 text-purple-800' :
                          activity.activityType === 'viewing' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {activity.name || activity.activityType}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {activity.scheduledDate && parseDateString(activity.scheduledDate)?.toLocaleString('ro-RO', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      {activity.memo && (
                        <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {activity.memo}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {fullContext.activities.length > 3 && (
                  <div className="text-center">
                    <span className="text-xs text-gray-500">
                      +{fullContext.activities.length - 3} mai multe activitati
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // If contact has a client request but no owned property, show client request card
  if (fullContext?.clientRequest && !fullContext?.ownedProperty) {
    const request = fullContext.clientRequest;
    
    const handleClientRequestClick = () => {
      if (request?.virtualTourUrl) {
        window.open(request.virtualTourUrl, '_blank');
      }
    };

    return (
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">CERERE INITIALA</h3>
        <div 
          className={`bg-white border border-gray-200 rounded-lg p-4 ${
            request?.virtualTourUrl ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
          }`}
          onClick={handleClientRequestClick}
        >
          <div className="flex gap-4">
            {/* Request Icon */}
            <div className="w-20 h-20 bg-orange-100 rounded-lg flex-shrink-0 flex items-center justify-center">
              <svg className="w-8 h-8 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            
            {/* Request Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    request.status === 'nou' ? 'bg-blue-100 text-blue-800' : 
                    request.status === 'in_procesare' ? 'bg-yellow-100 text-yellow-800' :
                    request.status === 'finalizat' ? 'bg-green-100 text-green-800' :
                    request.status === 'anulat' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {request.status === 'nou' ? 'Nou' : 
                     request.status === 'in_procesare' ? 'In procesare' :
                     request.status === 'finalizat' ? 'Finalizat' :
                     request.status === 'anulat' ? 'Anulat' :
                     request.status}
                  </span>
                  {request.propertyInternalCode && (
                    <span className="text-sm font-medium text-gray-900">
                      P{request.propertyInternalCode}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="text-sm font-semibold text-gray-900">
                  {request.requestType === 'cumparare' ? 'Cumparare' : 
                   request.requestType === 'inchiriere' ? 'Inchiriere' : 
                   request.requestType === 'evaluare' ? 'Evaluare' :
                   request.requestType === 'vanzare' ? 'Vanzare' :
                   request.requestType}
                  {request.propertyType && (
                    <span> / {request.propertyType.charAt(0).toUpperCase() + request.propertyType.slice(1)}</span>
                  )}
                  {request.budgetMin && request.budgetMax && (
                    <span> / {Math.floor(request.budgetMin)}-{Math.floor(request.budgetMax)}€</span>
                  )}
                </div>
                
                <div className="text-xs text-gray-600">
                  {request.title && <div className="line-clamp-2">{request.title}</div>}
                  {(request.minRooms || request.maxRooms || request.minSurface || request.maxSurface) && (
                    <div className="mt-1">
                      {(request.minRooms || request.maxRooms) && (
                        <span>
                          {request.minRooms && request.maxRooms ? `${request.minRooms}-${request.maxRooms}` :
                           request.minRooms ? `${request.minRooms}+` :
                           `până la ${request.maxRooms}`} camere
                        </span>
                      )}
                      {(request.minRooms || request.maxRooms) && (request.minSurface || request.maxSurface) && <span> • </span>}
                      {(request.minSurface || request.maxSurface) && (
                        <span>
                          {request.minSurface && request.maxSurface ? `${request.minSurface}-${request.maxSurface}` :
                           request.minSurface ? `${request.minSurface}+` :
                           `până la ${request.maxSurface}`}mp
                        </span>
                      )}
                    </div>
                  )}
                  {request.preferredLocations && Array.isArray(request.preferredLocations) && request.preferredLocations.length > 0 && (
                    <div className="mt-1 text-xs text-gray-500">
                      Zone: {request.preferredLocations.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Priority Indicator */}
            <div className="flex-shrink-0">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                request.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                request.priority === 'ridicat' ? 'bg-orange-100 text-orange-800' :
                request.priority === 'mediu' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {request.priority === 'urgent' ? 'Urgent' :
                 request.priority === 'ridicat' ? 'Ridicat' :
                 request.priority === 'mediu' ? 'Mediu' :
                 request.priority === 'scazut' ? 'Scazut' :
                 request.priority}
              </span>
            </div>
          </div>
        </div>
        
        {/* ISTORIC Section for Client Request */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">ISTORIC</h3>
          <div className="space-y-4">
            {/* Request Created Timeline Entry */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    Cerere creata
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {request.createdAt && new Date(request.createdAt).toLocaleString('ro-RO', {
                    day: '2-digit',
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                {request.propertyInternalCode && (
                  <div className="mt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      P{request.propertyInternalCode}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Additional timeline entries from activities */}
            {fullContext?.activities && fullContext.activities.length > 0 && (
              <>
                {fullContext.activities
                  .sort((a: any, b: any) => {
                    const dateA = new Date(a.scheduledDateTime || a.createdAt || 0);
                    const dateB = new Date(b.scheduledDateTime || b.createdAt || 0);
                    return dateB.getTime() - dateA.getTime();
                  })
                  .map((activity: any) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        activity.activityType === 'call' ? 'bg-green-100' :
                        activity.activityType === 'meeting' ? 'bg-purple-100' :
                        activity.activityType === 'viewing' ? 'bg-orange-100' :
                        'bg-gray-100'
                      }`}>
                        <svg className={`w-4 h-4 ${
                          activity.activityType === 'call' ? 'text-green-600' :
                          activity.activityType === 'meeting' ? 'text-purple-600' :
                          activity.activityType === 'viewing' ? 'text-orange-600' :
                          'text-gray-600'
                        }`} fill="currentColor" viewBox="0 0 20 20">
                          {activity.activityType === 'call' ? (
                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                          ) : activity.activityType === 'meeting' || activity.activityType === 'viewing' ? (
                            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                          ) : (
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                          )}
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          activity.activityType === 'call' ? 'bg-green-100 text-green-800' :
                          activity.activityType === 'meeting' ? 'bg-purple-100 text-purple-800' :
                          activity.activityType === 'viewing' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {activity.name || activity.activityType}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {activity.scheduledDate && parseDateString(activity.scheduledDate)?.toLocaleString('ro-RO', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      {activity.memo && (
                        <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {activity.memo}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default statistics view
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