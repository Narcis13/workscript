interface PanelHeaderProps {
  firstName?: string | null;
  lastName?: string | null;
  onClose: () => void;
}

export function PanelHeader({ firstName, lastName, onClose }: PanelHeaderProps) {
  const fullName = `${firstName || ''} ${lastName || ''}`.trim() || 'Contact';

  return (
    <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold truncate">
        {fullName}
      </h2>
      <button
        onClick={onClose}
        className="text-white hover:text-gray-200 transition-colors p-2"
        aria-label="Close panel"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}