import { useState, useEffect } from 'react';

interface Contact {
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
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(15);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const offset = (currentPage - 1) * pageSize;
        const response = await fetch(`http://localhost:3013/api/zoca/contacts?limit=${pageSize}&offset=${offset}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result: ApiResponse = await response.json();
        setContacts(result.data);
        setTotalCount(result.count);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch contacts');
        console.error('Error fetching contacts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [currentPage, pageSize]);

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

      {/* Results Summary */}
      <div className="mb-4">
        <p className="text-xs sm:text-sm text-gray-600">
          Rezultate {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)} din {totalCount}
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
                <th className="hidden md:table-cell px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CALIFICARE</th>
                <th className="hidden lg:table-cell px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DATA</th>
                <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ACTIUNI</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No contacts found
                  </td>
                </tr>
              ) : (
                contacts.map((contact, index) => (
                  <tr key={contact.id} className="hover:bg-gray-50">
                    <td className="px-2 sm:px-6 py-2 sm:py-4">
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
                        <div className="w-4 h-4 sm:w-6 sm:h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-2 h-2 sm:w-3 sm:h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                          </svg>
                        </div>
                        {index % 3 === 1 && (
                          <div className="w-4 h-4 sm:w-6 sm:h-6 bg-purple-500 rounded-full flex items-center justify-center">
                            <svg className="w-2 h-2 sm:w-3 sm:h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        contact.qualificationStatus === 'calificat' ? 'bg-green-100 text-green-800' : 
                        contact.qualificationStatus === 'nequalificat' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {contact.qualificationStatus || 'N/A'}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                      {contact.createdAt ? new Date(contact.createdAt).toLocaleDateString('ro-RO') : 'N/A'}
                    </td>
                    <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
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
      {!loading && !error && totalCount > 0 && (
        <div className="mt-6 flex flex-col items-center space-y-4">
          {/* <div className="text-sm text-gray-700">
            Pagina {currentPage} din {Math.ceil(totalCount / pageSize)}
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
                const totalPages = Math.ceil(totalCount / pageSize);
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
              onClick={() => setCurrentPage(Math.min(Math.ceil(totalCount / pageSize), currentPage + 1))}
              disabled={currentPage >= Math.ceil(totalCount / pageSize)}
              className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Urmatoarea
            </button>
          </div>
        </div>
      )}
    </div>
  );
}