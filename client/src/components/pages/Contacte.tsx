import { useState, useEffect } from 'react';
import { ContactDetailsPanel } from '../contact-details/ContactDetailsPanel';

export interface Contact {
  id: number;
  agencyId: number;
  assignedAgentId: number | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  contactType: string;
  source: string | null;
  sourceDetails: string | null;
  interestedIn: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  preferredAreas: string[];
  propertyPreferences: Record<string, any>;
  urgencyLevel: string;
  buyingReadiness: string;
  preferredContactMethod: string;
  bestTimeToCall: string | null;
  communicationNotes: string | null;
  aiLeadScore: string;
  qualificationStatus: string;
  conversionProbability: number | null;
  lastInteractionScore: number | null;
  lastContactAt: string | null;
  lastResponseAt: string | null;
  nextFollowUpAt: string | null;
  interactionCount: number;
  emailCount: number;
  callCount: number;
  whatsappCount: number;
  meetingCount: number;
  occupation: string | null;
  company: string | null;
  notes: string | null;
  tags: string[];
  isBlacklisted: boolean;
  gdprConsent: boolean;
  marketingConsent: boolean;
  createdAt: string;
  updatedAt: string;
  propertiesCount?: number; // Optional property count
  clientRequestsCount?: number; // Optional client request count
  needFollowUp?: boolean | number; // Optional follow-up needed flag (boolean or number)
  assignedAgentName?: string | null; // Optional assigned agent name
}

interface ApiResponse {
  success: boolean;
  count: number;
  data: Contact[];
  pagination?: {
    limit: number;
    offset: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function Contacte() {
  const [selectedTab, setSelectedTab] = useState('contacte');
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(15);
  
  // Filter states
  const [propertiesCountFilter, setPropertiesCountFilter] = useState<number | ''>('');
  const [clientRequestsCountFilter, setClientRequestsCountFilter] = useState<number | ''>('');
  const [needFollowUpFilter, setNeedFollowUpFilter] = useState<string>('all');
  const [assignedAgentFilter, setAssignedAgentFilter] = useState<string>('all');
  
  // Agent states
  const [availableAgents, setAvailableAgents] = useState<{id: number, firstName: string}[]>([]);
  
  // Contact details panel state
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Handler to open contact details panel
  const handleContactClick = (contact: Contact) => {
    setSelectedContact(contact);
    setIsPanelOpen(true);
  };

  // Handler to close contact details panel
  const handleClosePanel = () => {
    setIsPanelOpen(false);
    setTimeout(() => setSelectedContact(null), 300); // Delay to allow animation to complete
  };

  // Filtered contacts based on current filters
  const filteredContacts = allContacts.filter(contact => {
    // Properties count filter
    if (propertiesCountFilter !== '' && (contact.propertiesCount ?? 0) < propertiesCountFilter) {
      return false;
    }
    
    // Client requests count filter  
    if (clientRequestsCountFilter !== '' && (contact.clientRequestsCount ?? 0) < clientRequestsCountFilter) {
      return false;
    }
    
    // Follow-up filter
    if (needFollowUpFilter !== 'all') {
      const needsFollowUp = contact.needFollowUp === true || contact.needFollowUp === 1;
      if (needFollowUpFilter === 'yes' && !needsFollowUp) {
        return false;
      }
      if (needFollowUpFilter === 'no' && needsFollowUp) {
        return false;
      }
    }
    
    // Assigned agent filter
    if (assignedAgentFilter !== 'all') {
      if (assignedAgentFilter === 'unassigned') {
        // Show contacts without assigned agent
        if (contact.assignedAgentId !== null) {
          return false;
        }
      } else {
        // Show contacts assigned to specific agent
        const selectedAgentId = parseInt(assignedAgentFilter);
        if (contact.assignedAgentId !== selectedAgentId) {
          return false;
        }
      }
    }
    
    return true;
  });

  // Apply pagination to filtered results
  const totalFilteredCount = filteredContacts.length;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedContacts = filteredContacts.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [propertiesCountFilter, clientRequestsCountFilter, needFollowUpFilter, assignedAgentFilter]);

  useEffect(() => {
    const fetchAllContacts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let allData: Contact[] = [];
        let currentOffset = 0;
        const batchSize = 100; // Fetch in batches of 100
        let hasMore = true;
        
        // Fetch first batch to get total count
        while (hasMore) {
          const response = await fetch(`http://localhost:3013/api/zoca/contacts?limit=${batchSize}&offset=${currentOffset}`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const result: ApiResponse = await response.json();
          allData = [...allData, ...result.data];
          
          // Set total count from first response
          if (currentOffset === 0) {
            setTotalCount(result.count);
          }
          
          // Check if we have more data
          hasMore = result.data.length === batchSize && allData.length < result.count;
          currentOffset += batchSize;
          
          // Safety check to prevent infinite loop
          if (currentOffset > result.count || currentOffset > 10000) {
            break;
          }
        }
        
        // Remove duplicates based on contact ID
        const uniqueContacts = allData.reduce((acc: Contact[], contact) => {
          if (!acc.find(existingContact => existingContact.id === contact.id)) {
            acc.push(contact);
          }
          return acc;
        }, []);
        
        setAllContacts(uniqueContacts);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch contacts');
        console.error('Error fetching contacts:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchAgents = async () => {
      try {
        const response = await fetch('http://localhost:3013/api/zoca/agents');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        if (result.success && result.data) {
          setAvailableAgents(result.data.map((agent: any) => ({
            id: agent.id,
            firstName: agent.firstName
          })));
        }
      } catch (err) {
        console.error('Error fetching agents:', err);
      }
    };

    fetchAllContacts();
    fetchAgents();
  }, []); // Only fetch once on component mount

  return (
    <div className="flex-1 p-4 sm:p-6">
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button
            onClick={() => setSelectedTab('contacte')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md ${
              selectedTab === 'contacte'
                ? 'bg-gray-200 text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            CONTACTE
          </button>
          <button className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-green-500 rounded-md hover:bg-green-600">
            ADAUGA
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Filtre</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Numar proprietati
            </label>
            <input
              type="number"
              min="0"
              placeholder="Min"
              value={propertiesCountFilter}
              onChange={(e) => setPropertiesCountFilter(e.target.value === '' ? '' : parseInt(e.target.value))}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Numar cereri clienti
            </label>
            <input
              type="number"
              min="0"
              placeholder="Min"
              value={clientRequestsCountFilter}
              onChange={(e) => setClientRequestsCountFilter(e.target.value === '' ? '' : parseInt(e.target.value))}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Necesita follow-up
            </label>
            <select
              value={needFollowUpFilter}
              onChange={(e) => setNeedFollowUpFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Toate</option>
              <option value="yes">Da</option>
              <option value="no">Nu</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Agent asignat
            </label>
            <select
              value={assignedAgentFilter}
              onChange={(e) => setAssignedAgentFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Toti agentii</option>
              <option value="unassigned">Unassigned</option>
              {availableAgents.map((agent) => (
                <option key={agent.id} value={agent.id.toString()}>
                  {agent.firstName}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="mt-4 flex space-x-2">
          <button
            onClick={() => {
              setPropertiesCountFilter('');
              setClientRequestsCountFilter('');
              setNeedFollowUpFilter('all');
              setAssignedAgentFilter('all');
            }}
            className="px-4 py-2 text-xs font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Reseteaza filtrele
          </button>
        </div>
      </div>

      {/* Results Summary */}
      <div className="mb-4">
        <p className="text-xs sm:text-sm text-gray-600">
          Afisate {Math.min(paginatedContacts.length, pageSize)} din {totalFilteredCount} contacte filtrate ({totalCount} total)
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading contacts...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">Error loading contacts: {error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      {!loading && !error && (
        <div className="bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-8 sm:w-12 px-2 sm:px-6 py-3"></th>
                <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NUME</th>
                <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TELEFON</th>
                <th className="hidden sm:table-cell px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-MAIL</th>
                <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STATUS</th>
                <th className="hidden md:table-cell px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AGENT</th>
                <th className="hidden lg:table-cell px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DATA</th>
                <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ACTIUNI</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedContacts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    {totalFilteredCount === 0 
                      ? "Nu au fost gasite contacte cu filtrele aplicate"
                      : "Nu exista contacte pe aceasta pagina"}
                  </td>
                </tr>
              ) : (
                paginatedContacts.map((contact) => (
                  <tr 
                    key={contact.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleContactClick(contact)}
                  >
                    <td className="px-2 sm:px-6 py-2 sm:py-4" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="rounded border-gray-300 w-3 h-3 sm:w-4 sm:h-4" />
                    </td>
                    <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-300 rounded-full mr-2 sm:mr-3"></div>
                        <span className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                          {contact.firstName || '?'} {contact.lastName || ''}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                      <span className="text-xs sm:text-sm text-blue-600 hover:text-blue-800">{contact.phone || 'N/A'}</span>
                    </td>
                    <td className="hidden sm:table-cell px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">{contact.email || 'N/A'}</td>
                    <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                      <div className="flex space-x-1">
                        {/* Property icon - show if contact has properties */}
                        {(contact.propertiesCount ?? 0) > 0 && (
                          <div className="w-4 h-4 sm:w-6 sm:h-6 bg-blue-500 rounded-full flex items-center justify-center" title={`${contact.propertiesCount} properties`}>
                            <svg className="w-2 h-2 sm:w-3 sm:h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                            </svg>
                          </div>
                        )}
                        {/* Client requests icon - show if contact has client requests */}
                        {(contact.clientRequestsCount ?? 0) > 0 && (
                          <div className="w-4 h-4 sm:w-6 sm:h-6 bg-green-500 rounded-full flex items-center justify-center" title={`${contact.clientRequestsCount} client requests`}>
                            <svg className="w-2 h-2 sm:w-3 sm:h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                        {/* Follow-up needed icon - show if contact needs follow-up */}
                        {(contact.needFollowUp === true || contact.needFollowUp === 1) && (
                          <div className="w-4 h-4 sm:w-6 sm:h-6 bg-red-500 rounded-full flex items-center justify-center" title="Needs follow-up">
                            <svg className="w-2 h-2 sm:w-3 sm:h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                      <span className="text-gray-900">
                        {contact.assignedAgentName || 'Unassigned'}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                      {contact.createdAt ? new Date(contact.createdAt).toLocaleDateString('ro-RO') : 'N/A'}
                    </td>
                    <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button className="text-gray-400 hover:text-gray-600">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && totalFilteredCount > 0 && (
        <div className="mt-6 flex flex-col items-center space-y-4">
          {/* <div className="text-sm text-gray-700">
            Pagina {currentPage} din {Math.ceil(totalFilteredCount / pageSize)}
          </div> */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Precedenta
            </button>
            
            {/* Page Numbers */}
            <div className="flex items-center space-x-1">
              {(() => {
                const totalPages = Math.ceil(totalFilteredCount / pageSize);
                const pages = [];
                
                // Always show page 1
                pages.push(
                  <button
                    key={1}
                    onClick={() => setCurrentPage(1)}
                    className={`px-3 py-1 text-sm border rounded-md ${
                      currentPage === 1 
                        ? 'bg-blue-500 text-white border-blue-500' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    1
                  </button>
                );
                
                // Add ellipsis if there's a gap after page 1
                if (currentPage > 3) {
                  pages.push(<span key="ellipsis1" className="px-2 text-gray-500">...</span>);
                }
                
                // Show pages around current page
                const start = Math.max(2, currentPage - 1);
                const end = Math.min(totalPages - 1, currentPage + 1);
                
                for (let i = start; i <= end; i++) {
                  if (i !== 1 && i !== totalPages) { // Don't duplicate page 1 or last page
                    pages.push(
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i)}
                        className={`px-3 py-1 text-sm border rounded-md ${
                          currentPage === i 
                            ? 'bg-blue-500 text-white border-blue-500' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        {i}
                      </button>
                    );
                  }
                }
                
                // Add ellipsis if there's a gap before last page
                if (currentPage < totalPages - 2) {
                  pages.push(<span key="ellipsis2" className="px-2 text-gray-500">...</span>);
                }
                
                // Always show last page (if it's different from page 1)
                if (totalPages > 1) {
                  pages.push(
                    <button
                      key={totalPages}
                      onClick={() => setCurrentPage(totalPages)}
                      className={`px-3 py-1 text-sm border rounded-md ${
                        currentPage === totalPages 
                          ? 'bg-blue-500 text-white border-blue-500' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      {totalPages}
                    </button>
                  );
                }
                
                return pages;
              })()}
            </div>
            
            <button
              onClick={() => setCurrentPage(Math.min(Math.ceil(totalFilteredCount / pageSize), currentPage + 1))}
              disabled={currentPage >= Math.ceil(totalFilteredCount / pageSize)}
              className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Urmatoarea
            </button>
          </div>
        </div>
      )}

      {/* Contact Details Panel */}
      <ContactDetailsPanel
        contact={selectedContact}
        isOpen={isPanelOpen}
        onClose={handleClosePanel}
      />
    </div>
  );
}