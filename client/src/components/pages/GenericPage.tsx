interface GenericPageProps {
  title: string;
  icon: string;
  description?: string;
}

export function GenericPage({ title, icon, description }: GenericPageProps) {
  return (
    <div className="flex-1 p-4 sm:p-6">
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <span className="text-2xl sm:text-3xl mr-3 sm:mr-4">{icon}</span>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">{title}</h1>
            {description && (
              <p className="text-sm sm:text-base text-gray-600">{description}</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 sm:p-6">
          <div className="text-center py-8 sm:py-12">
            <div className="text-4xl sm:text-6xl mb-4">{icon}</div>
            <h2 className="text-lg sm:text-xl font-medium text-gray-900 mb-2">{title}</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              Această secțiune va fi implementată în curând.
            </p>
            <button className="px-4 py-2 text-xs sm:text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700">
              Coming Soon
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}