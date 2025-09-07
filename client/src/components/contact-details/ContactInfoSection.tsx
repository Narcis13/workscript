import { Contact } from '../pages/Contacte';

interface ContactInfoSectionProps {
  contact: Contact;
}

export function ContactInfoSection({ contact }: ContactInfoSectionProps) {
  return (
    <div className="space-y-6">
      {/* Basic Contact Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="text-xs text-gray-500 mb-2">
          ADAUGAT: {contact.createdAt ? new Date(contact.createdAt).toLocaleDateString('ro-RO') : 'N/A'} | 
          MODIFICAT: {contact.updatedAt ? new Date(contact.updatedAt).toLocaleDateString('ro-RO') : 'N/A'}
        </div>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-600">Agent:</span>
            <span className="text-sm text-gray-900">{contact.assignedAgentName || 'Neasignat'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-600">Telefon:</span>
            <span className="text-sm text-blue-600">{contact.phone || 'N/A'}</span>
          </div>
          {contact.whatsapp && (
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-600">WhatsApp:</span>
              <span className="text-sm text-green-600">{contact.whatsapp}</span>
            </div>
          )}
          {contact.email && (
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-600">Email:</span>
              <span className="text-sm text-gray-900">{contact.email}</span>
            </div>
          )}
        </div>
      </div>

      {/* Contact Details */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Informatii Contact</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Tip Contact:</span>
            <span className="text-sm font-medium text-gray-900">{contact.contactType}</span>
          </div>
          {contact.source && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Sursa:</span>
              <span className="text-sm font-medium text-gray-900">{contact.source}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Urgenta:</span>
            <span className="text-sm font-medium text-gray-900">{contact.urgencyLevel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Status Calificare:</span>
            <span className="text-sm font-medium text-gray-900">{contact.qualificationStatus}</span>
          </div>
          {contact.interestedIn && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Interesat in:</span>
              <span className="text-sm font-medium text-gray-900">{contact.interestedIn}</span>
            </div>
          )}
          {contact.budgetMin && contact.budgetMax && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Buget:</span>
              <span className="text-sm font-medium text-gray-900">
                €{contact.budgetMin.toLocaleString()} - €{contact.budgetMax.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {contact.notes && (
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Notite</h3>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-700">{contact.notes}</p>
          </div>
        </div>
      )}
    </div>
  );
}