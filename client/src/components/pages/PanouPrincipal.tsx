export function PanouPrincipal() {
  return (
    <div className="flex-1 p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Panou Principal</h1>
        <p className="text-sm sm:text-base text-gray-600">Dashboard principal cu statistici și overview</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center">
            <div className="text-xl sm:text-2xl">📊</div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Total Proprietati</p>
              <p className="text-xl sm:text-2xl font-semibold text-gray-900">1,234</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center">
            <div className="text-xl sm:text-2xl">👥</div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Total Contacte</p>
              <p className="text-xl sm:text-2xl font-semibold text-gray-900">815</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center">
            <div className="text-xl sm:text-2xl">🎯</div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Leads Active</p>
              <p className="text-xl sm:text-2xl font-semibold text-gray-900">156</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center">
            <div className="text-xl sm:text-2xl">📝</div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Cereri Noi</p>
              <p className="text-xl sm:text-2xl font-semibold text-gray-900">42</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-4">Activitate Recenta</h2>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between py-2 sm:py-3 border-b border-gray-200">
              <div className="flex items-center">
                <div className="w-6 sm:w-8 h-6 sm:h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-xs sm:text-sm">✓</span>
                </div>
                <div className="ml-3">
                  <p className="text-xs sm:text-sm font-medium text-gray-900">Contact nou adaugat</p>
                  <p className="text-xs sm:text-sm text-gray-500">Andrei Dan - acum 2 ore</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 sm:py-3 border-b border-gray-200">
              <div className="flex items-center">
                <div className="w-6 sm:w-8 h-6 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-xs sm:text-sm">📧</span>
                </div>
                <div className="ml-3">
                  <p className="text-xs sm:text-sm font-medium text-gray-900">Email trimis</p>
                  <p className="text-xs sm:text-sm text-gray-500">Maria Popescu - acum 4 ore</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}