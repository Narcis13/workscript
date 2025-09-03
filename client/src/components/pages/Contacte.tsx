import { useState, useEffect } from 'react';

interface TableRow {
  nume: string;
  telefon: string;
  email: string;
  adaugat: string;
  data: string;
}

export function Contacte() {
  const [selectedTab, setSelectedTab] = useState('contacte');
  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('http://localhost:3013/api/zoca/contacts');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const contacts = await response.json();
       // console.log(contacts);
        setTableData(contacts.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch contacts');
        console.error('Error fetching contacts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, []);

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
        <p className="text-xs sm:text-sm text-gray-600">Rezultate 1 - 15 din 815</p>
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
                <th className="hidden md:table-cell px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ADAUGAT DE</th>
                <th className="hidden lg:table-cell px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DATA</th>
                <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ACTIUNI</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tableData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No contacts found
                  </td>
                </tr>
              ) : (
                tableData.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-2 sm:px-6 py-2 sm:py-4">
                      <input type="checkbox" className="rounded border-gray-300 w-3 h-3 sm:w-4 sm:h-4" />
                    </td>
                    <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-300 rounded-full mr-2 sm:mr-3"></div>
                        <span className="text-xs sm:text-sm font-medium text-gray-900 truncate">{row.nume}</span>
                      </div>
                    </td>
                    <td className="px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap">
                      <span className="text-xs sm:text-sm text-blue-600 hover:text-blue-800">{row.telefon}</span>
                    </td>
                    <td className="hidden sm:table-cell px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">{row.email}</td>
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
                    <td className="hidden md:table-cell px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">{row.adaugat}</td>
                    <td className="hidden lg:table-cell px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">{row.data}</td>
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
    </div>
  );
}