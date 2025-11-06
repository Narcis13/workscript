import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Contact } from '../pages/Contacte';
// Helper function to parse DD-MM-YYYY HH:MM:SS format
function parseDateString(dateString) {
    if (!dateString)
        return null;
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
export function StatisticsGrid({ contact, onFullContextChange }) {
    const [fullContext, setFullContext] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        const fetchFullContext = async () => {
            try {
                setLoading(true);
                const response = await fetch(`http://localhost:3013/api/zoca/contacts/fullcontext/${contact.id}`);
                const result = await response.json();
                if (result.success) {
                    setFullContext(result.data);
                    onFullContextChange?.(result.data);
                }
                else {
                    setError(result.error || 'Failed to fetch contact context');
                }
            }
            catch (err) {
                setError('Network error while fetching contact context');
                console.error('Error fetching full context:', err);
                onFullContextChange?.(null);
            }
            finally {
                setLoading(false);
            }
        };
        if (contact.id) {
            fetchFullContext();
        }
    }, [contact.id]);
    if (loading) {
        return (_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-semibold text-gray-800 mb-3", children: "Statistici" }), _jsx("div", { className: "grid grid-cols-2 gap-4", children: [1, 2, 3, 4].map((i) => (_jsxs("div", { className: "bg-gray-100 p-3 rounded-lg animate-pulse", children: [_jsx("div", { className: "h-4 bg-gray-200 rounded mb-2" }), _jsx("div", { className: "h-6 bg-gray-200 rounded" })] }, i))) })] }));
    }
    if (error) {
        return (_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-semibold text-gray-800 mb-3", children: "Statistici" }), _jsx("div", { className: "text-red-600 text-sm", children: error })] }));
    }
    const currentContact = fullContext?.contact || contact;
    const statistics = [
        {
            label: 'Interactiuni',
            value: currentContact.interactionCount || 0,
            color: 'bg-blue-50 text-blue-600',
            icon: (_jsx("svg", { className: "w-4 h-4", fill: "currentColor", viewBox: "0 0 20 20", children: _jsx("path", { fillRule: "evenodd", d: "M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z", clipRule: "evenodd" }) }))
        },
        {
            label: 'Email-uri',
            value: currentContact.emailCount || 0,
            color: 'bg-green-50 text-green-600',
            icon: (_jsxs("svg", { className: "w-4 h-4", fill: "currentColor", viewBox: "0 0 20 20", children: [_jsx("path", { d: "M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" }), _jsx("path", { d: "M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" })] }))
        },
        {
            label: 'Apeluri',
            value: currentContact.callCount || 0,
            color: 'bg-purple-50 text-purple-600',
            icon: (_jsx("svg", { className: "w-4 h-4", fill: "currentColor", viewBox: "0 0 20 20", children: _jsx("path", { d: "M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" }) }))
        },
        {
            label: 'Intalniri',
            value: currentContact.meetingCount || 0,
            color: 'bg-yellow-50 text-yellow-600',
            icon: (_jsx("svg", { className: "w-4 h-4", fill: "currentColor", viewBox: "0 0 20 20", children: _jsx("path", { d: "M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" }) }))
        }
    ];
    // Additional statistics based on full context
    const additionalStats = [];
    // Show owned property count
    if (fullContext?.ownedProperty) {
        additionalStats.push({
            label: 'Proprietati',
            value: 1,
            color: 'bg-indigo-50 text-indigo-600',
            icon: (_jsx("svg", { className: "w-4 h-4", fill: "currentColor", viewBox: "0 0 20 20", children: _jsx("path", { d: "M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" }) }))
        });
    }
    // Show client request count
    if (fullContext?.clientRequest) {
        additionalStats.push({
            label: 'Cereri',
            value: 1,
            color: 'bg-pink-50 text-pink-600',
            icon: (_jsx("svg", { className: "w-4 h-4", fill: "currentColor", viewBox: "0 0 20 20", children: _jsx("path", { fillRule: "evenodd", d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z", clipRule: "evenodd" }) }))
        });
    }
    // Show activities count
    if (fullContext?.activities && fullContext.activities.length > 0) {
        additionalStats.push({
            label: 'Activitati',
            value: fullContext.activities.length,
            color: 'bg-orange-50 text-orange-600',
            icon: (_jsx("svg", { className: "w-4 h-4", fill: "currentColor", viewBox: "0 0 20 20", children: _jsx("path", { fillRule: "evenodd", d: "M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z", clipRule: "evenodd" }) }))
        });
    }
    // Fallback to original counts if no full context available
    if (!fullContext) {
        if (contact.propertiesCount !== undefined && contact.propertiesCount > 0) {
            additionalStats.push({
                label: 'Proprietati',
                value: contact.propertiesCount,
                color: 'bg-indigo-50 text-indigo-600',
                icon: (_jsx("svg", { className: "w-4 h-4", fill: "currentColor", viewBox: "0 0 20 20", children: _jsx("path", { d: "M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" }) }))
            });
        }
        if (contact.clientRequestsCount !== undefined && contact.clientRequestsCount > 0) {
            additionalStats.push({
                label: 'Cereri',
                value: contact.clientRequestsCount,
                color: 'bg-pink-50 text-pink-600',
                icon: (_jsx("svg", { className: "w-4 h-4", fill: "currentColor", viewBox: "0 0 20 20", children: _jsx("path", { fillRule: "evenodd", d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z", clipRule: "evenodd" }) }))
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
        return (_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-semibold text-gray-800 mb-3", children: "PROPRIETAR LA" }), _jsx("div", { className: `bg-white border border-gray-200 rounded-lg p-4 ${property.virtualTourUrl ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`, onClick: handlePropertyClick, children: _jsxs("div", { className: "flex gap-4", children: [_jsx("div", { className: "w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden", children: mainPhoto ? (_jsx("img", { src: mainPhoto, alt: "Property", className: "w-full h-full object-cover" })) : (_jsx("div", { className: "w-full h-full bg-gray-300 flex items-center justify-center", children: _jsx("svg", { className: "w-8 h-8 text-gray-500", fill: "currentColor", viewBox: "0 0 20 20", children: _jsx("path", { d: "M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" }) }) })) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "flex items-start justify-between mb-2", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${property.status === 'activ' ? 'bg-green-100 text-green-800' :
                                                        property.status === 'vandut' ? 'bg-gray-100 text-gray-800' :
                                                            property.status === 'rezervat' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-blue-100 text-blue-800'}`, children: property.status === 'activ' ? 'Activa' :
                                                        property.status === 'vandut' ? 'Vandut' :
                                                            property.status === 'rezervat' ? 'Rezervat' :
                                                                property.status }), property.internalCode && (_jsxs("span", { className: "text-sm font-medium text-gray-900", children: ["P", property.internalCode] }))] }) }), _jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "text-sm font-semibold text-gray-900", children: [property.price && property.currency && (_jsxs("span", { children: [property.price, property.currency, " / "] })), property.transactionType === 'vanzare' ? 'Vanzare' :
                                                        property.transactionType === 'inchiriere' ? 'Inchiriere' : property.transactionType, property.propertyType && (_jsxs("span", { children: [" / ", property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1)] })), property.neighborhood && (_jsxs("span", { children: [" / ", property.neighborhood] }))] }), (property.rooms || property.surfaceArea) && (_jsxs("div", { className: "text-xs text-gray-600", children: [property.rooms && _jsxs("span", { children: [property.rooms, " camere"] }), property.rooms && property.surfaceArea && _jsx("span", { children: " \u2022 " }), property.surfaceArea && _jsxs("span", { children: [property.surfaceArea, "mp"] })] }))] })] }), property.virtualTourUrl && (_jsx("div", { className: "flex-shrink-0", children: _jsx("svg", { className: "w-5 h-5 text-blue-600", fill: "currentColor", viewBox: "0 0 20 20", children: _jsx("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z", clipRule: "evenodd" }) }) }))] }) }), _jsxs("div", { className: "mt-6", children: [_jsx("h3", { className: "text-sm font-semibold text-gray-800 mb-4", children: "ISTORIC" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: "flex-shrink-0 mt-1", children: _jsx("div", { className: "w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center", children: _jsx("svg", { className: "w-4 h-4 text-blue-600", fill: "currentColor", viewBox: "0 0 20 20", children: _jsx("path", { d: "M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" }) }) }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "flex items-center gap-2 mb-1", children: _jsx("span", { className: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800", children: "Proprietate adaugata" }) }), _jsx("div", { className: "text-xs text-gray-500", children: property.availableFrom && new Date(property.availableFrom).toLocaleString('ro-RO', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    }) }), property.internalCode && (_jsx("div", { className: "mt-1", children: _jsxs("span", { className: "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800", children: ["P", property.internalCode] }) }))] })] }), fullContext?.activities && fullContext.activities.length > 0 && (_jsxs(_Fragment, { children: [fullContext.activities
                                            .sort((a, b) => {
                                            const dateA = new Date(a.scheduledDateTime || a.createdAt || 0);
                                            const dateB = new Date(b.scheduledDateTime || b.createdAt || 0);
                                            return dateB.getTime() - dateA.getTime();
                                        })
                                            .slice(0, 3).map((activity) => (_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: "flex-shrink-0 mt-1", children: _jsx("div", { className: `w-8 h-8 rounded-full flex items-center justify-center ${activity.activityType === 'call' ? 'bg-green-100' :
                                                            activity.activityType === 'meeting' ? 'bg-purple-100' :
                                                                activity.activityType === 'viewing' ? 'bg-orange-100' :
                                                                    'bg-gray-100'}`, children: _jsx("svg", { className: `w-4 h-4 ${activity.activityType === 'call' ? 'text-green-600' :
                                                                activity.activityType === 'meeting' ? 'text-purple-600' :
                                                                    activity.activityType === 'viewing' ? 'text-orange-600' :
                                                                        'text-gray-600'}`, fill: "currentColor", viewBox: "0 0 20 20", children: activity.activityType === 'call' ? (_jsx("path", { d: "M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" })) : activity.activityType === 'meeting' || activity.activityType === 'viewing' ? (_jsx("path", { d: "M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" })) : (_jsx("path", { fillRule: "evenodd", d: "M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z", clipRule: "evenodd" })) }) }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "flex items-center gap-2 mb-1", children: _jsx("span", { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${activity.activityType === 'call' ? 'bg-green-100 text-green-800' :
                                                                    activity.activityType === 'meeting' ? 'bg-purple-100 text-purple-800' :
                                                                        activity.activityType === 'viewing' ? 'bg-orange-100 text-orange-800' :
                                                                            'bg-gray-100 text-gray-800'}`, children: activity.name || activity.activityType }) }), _jsx("div", { className: "text-xs text-gray-500", children: activity.scheduledDate && parseDateString(activity.scheduledDate)?.toLocaleString('ro-RO', {
                                                                day: '2-digit',
                                                                month: '2-digit',
                                                                year: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            }) }), activity.memo && (_jsx("div", { className: "text-xs text-gray-600 mt-1 line-clamp-2", children: activity.memo }))] })] }, activity.id))), fullContext.activities.length > 3 && (_jsx("div", { className: "text-center", children: _jsxs("span", { className: "text-xs text-gray-500", children: ["+", fullContext.activities.length - 3, " mai multe activitati"] }) }))] }))] })] })] }));
    }
    // If contact has a client request but no owned property, show client request card
    if (fullContext?.clientRequest && !fullContext?.ownedProperty) {
        const request = fullContext.clientRequest;
        const handleClientRequestClick = () => {
            if (request?.virtualTourUrl) {
                window.open(request.virtualTourUrl, '_blank');
            }
        };
        return (_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-semibold text-gray-800 mb-3", children: "CERERE INITIALA" }), _jsx("div", { className: `bg-white border border-gray-200 rounded-lg p-4 ${request?.virtualTourUrl ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`, onClick: handleClientRequestClick, children: _jsxs("div", { className: "flex gap-4", children: [_jsx("div", { className: "w-20 h-20 bg-orange-100 rounded-lg flex-shrink-0 flex items-center justify-center", children: _jsx("svg", { className: "w-8 h-8 text-orange-600", fill: "currentColor", viewBox: "0 0 20 20", children: _jsx("path", { fillRule: "evenodd", d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z", clipRule: "evenodd" }) }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "flex items-start justify-between mb-2", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${request.status === 'nou' ? 'bg-blue-100 text-blue-800' :
                                                        request.status === 'in_procesare' ? 'bg-yellow-100 text-yellow-800' :
                                                            request.status === 'finalizat' ? 'bg-green-100 text-green-800' :
                                                                request.status === 'anulat' ? 'bg-red-100 text-red-800' :
                                                                    'bg-gray-100 text-gray-800'}`, children: request.status === 'nou' ? 'Nou' :
                                                        request.status === 'in_procesare' ? 'In procesare' :
                                                            request.status === 'finalizat' ? 'Finalizat' :
                                                                request.status === 'anulat' ? 'Anulat' :
                                                                    request.status }), request.propertyInternalCode && (_jsxs("span", { className: "text-sm font-medium text-gray-900", children: ["P", request.propertyInternalCode] }))] }) }), _jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "text-sm font-semibold text-gray-900", children: [request.requestType === 'cumparare' ? 'Cumparare' :
                                                        request.requestType === 'inchiriere' ? 'Inchiriere' :
                                                            request.requestType === 'evaluare' ? 'Evaluare' :
                                                                request.requestType === 'vanzare' ? 'Vanzare' :
                                                                    request.requestType, request.propertyType && (_jsxs("span", { children: [" / ", request.propertyType.charAt(0).toUpperCase() + request.propertyType.slice(1)] })), request.budgetMin && request.budgetMax && (_jsxs("span", { children: [" / ", Math.floor(request.budgetMin), "-", Math.floor(request.budgetMax), "\u20AC"] }))] }), _jsxs("div", { className: "text-xs text-gray-600", children: [request.title && _jsx("div", { className: "line-clamp-2", children: request.title }), (request.minRooms || request.maxRooms || request.minSurface || request.maxSurface) && (_jsxs("div", { className: "mt-1", children: [(request.minRooms || request.maxRooms) && (_jsxs("span", { children: [request.minRooms && request.maxRooms ? `${request.minRooms}-${request.maxRooms}` :
                                                                        request.minRooms ? `${request.minRooms}+` :
                                                                            `până la ${request.maxRooms}`, " camere"] })), (request.minRooms || request.maxRooms) && (request.minSurface || request.maxSurface) && _jsx("span", { children: " \u2022 " }), (request.minSurface || request.maxSurface) && (_jsxs("span", { children: [request.minSurface && request.maxSurface ? `${request.minSurface}-${request.maxSurface}` :
                                                                        request.minSurface ? `${request.minSurface}+` :
                                                                            `până la ${request.maxSurface}`, "mp"] }))] })), request.preferredLocations && Array.isArray(request.preferredLocations) && request.preferredLocations.length > 0 && (_jsxs("div", { className: "mt-1 text-xs text-gray-500", children: ["Zone: ", request.preferredLocations.join(', ')] }))] })] })] }), _jsx("div", { className: "flex-shrink-0", children: _jsx("span", { className: `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${request.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                        request.priority === 'ridicat' ? 'bg-orange-100 text-orange-800' :
                                            request.priority === 'mediu' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-gray-100 text-gray-800'}`, children: request.priority === 'urgent' ? 'Urgent' :
                                        request.priority === 'ridicat' ? 'Ridicat' :
                                            request.priority === 'mediu' ? 'Mediu' :
                                                request.priority === 'scazut' ? 'Scazut' :
                                                    request.priority }) })] }) }), _jsxs("div", { className: "mt-6", children: [_jsx("h3", { className: "text-sm font-semibold text-gray-800 mb-4", children: "ISTORIC" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: "flex-shrink-0 mt-1", children: _jsx("div", { className: "w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center", children: _jsx("svg", { className: "w-4 h-4 text-orange-600", fill: "currentColor", viewBox: "0 0 20 20", children: _jsx("path", { fillRule: "evenodd", d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z", clipRule: "evenodd" }) }) }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "flex items-center gap-2 mb-1", children: _jsx("span", { className: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800", children: "Cerere creata" }) }), _jsx("div", { className: "text-xs text-gray-500", children: request.createdAt && new Date(request.createdAt).toLocaleString('ro-RO', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    }) }), request.propertyInternalCode && (_jsx("div", { className: "mt-1", children: _jsxs("span", { className: "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800", children: ["P", request.propertyInternalCode] }) }))] })] }), fullContext?.activities && fullContext.activities.length > 0 && (_jsx(_Fragment, { children: fullContext.activities
                                        .sort((a, b) => {
                                        const dateA = new Date(a.scheduledDateTime || a.createdAt || 0);
                                        const dateB = new Date(b.scheduledDateTime || b.createdAt || 0);
                                        return dateB.getTime() - dateA.getTime();
                                    })
                                        .map((activity) => (_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: "flex-shrink-0 mt-1", children: _jsx("div", { className: `w-8 h-8 rounded-full flex items-center justify-center ${activity.activityType === 'call' ? 'bg-green-100' :
                                                        activity.activityType === 'meeting' ? 'bg-purple-100' :
                                                            activity.activityType === 'viewing' ? 'bg-orange-100' :
                                                                'bg-gray-100'}`, children: _jsx("svg", { className: `w-4 h-4 ${activity.activityType === 'call' ? 'text-green-600' :
                                                            activity.activityType === 'meeting' ? 'text-purple-600' :
                                                                activity.activityType === 'viewing' ? 'text-orange-600' :
                                                                    'text-gray-600'}`, fill: "currentColor", viewBox: "0 0 20 20", children: activity.activityType === 'call' ? (_jsx("path", { d: "M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" })) : activity.activityType === 'meeting' || activity.activityType === 'viewing' ? (_jsx("path", { d: "M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" })) : (_jsx("path", { fillRule: "evenodd", d: "M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z", clipRule: "evenodd" })) }) }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "flex items-center gap-2 mb-1", children: _jsx("span", { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${activity.activityType === 'call' ? 'bg-green-100 text-green-800' :
                                                                activity.activityType === 'meeting' ? 'bg-purple-100 text-purple-800' :
                                                                    activity.activityType === 'viewing' ? 'bg-orange-100 text-orange-800' :
                                                                        'bg-gray-100 text-gray-800'}`, children: activity.name || activity.activityType }) }), _jsx("div", { className: "text-xs text-gray-500", children: activity.scheduledDate && parseDateString(activity.scheduledDate)?.toLocaleString('ro-RO', {
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        }) }), activity.memo && (_jsx("div", { className: "text-xs text-gray-600 mt-1 line-clamp-2", children: activity.memo }))] })] }, activity.id))) }))] })] })] }));
    }
    // Default statistics view
    return (_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-semibold text-gray-800 mb-3", children: "Statistici" }), _jsx("div", { className: `grid grid-cols-2 gap-4 ${allStats.length > 4 ? 'md:grid-cols-3' : ''}`, children: allStats.map((stat, index) => (_jsxs("div", { className: `${stat.color.split(' ')[0]} p-3 rounded-lg`, children: [_jsxs("div", { className: "flex items-center justify-between mb-1", children: [_jsx("div", { className: `${stat.color.split(' ')[1]}`, children: stat.icon }), _jsx("div", { className: `text-lg font-bold ${stat.color.split(' ')[1]}`, children: stat.value })] }), _jsx("div", { className: "text-xs text-gray-600", children: stat.label })] }, index))) })] }));
}
