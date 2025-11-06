import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { ContactDetailsPanel } from '../contact-details/ContactDetailsPanel';
export function Contacte() {
    const [selectedTab, setSelectedTab] = useState('contacte');
    const [allContacts, setAllContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [pageSize] = useState(15);
    // Filter states
    const [propertiesCountFilter, setPropertiesCountFilter] = useState('');
    const [clientRequestsCountFilter, setClientRequestsCountFilter] = useState('');
    const [needFollowUpFilter, setNeedFollowUpFilter] = useState('all');
    const [assignedAgentFilter, setAssignedAgentFilter] = useState('all');
    // Agent states
    const [availableAgents, setAvailableAgents] = useState([]);
    // Contact details panel state
    const [selectedContact, setSelectedContact] = useState(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    // Handler to open contact details panel
    const handleContactClick = (contact) => {
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
            }
            else {
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
                let allData = [];
                let currentOffset = 0;
                const batchSize = 100; // Fetch in batches of 100
                let hasMore = true;
                // Fetch first batch to get total count
                while (hasMore) {
                    const response = await fetch(`http://localhost:3013/api/zoca/contacts?limit=${batchSize}&offset=${currentOffset}`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const result = await response.json();
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
                const uniqueContacts = allData.reduce((acc, contact) => {
                    if (!acc.find(existingContact => existingContact.id === contact.id)) {
                        acc.push(contact);
                    }
                    return acc;
                }, []);
                setAllContacts(uniqueContacts);
            }
            catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch contacts');
                console.error('Error fetching contacts:', err);
            }
            finally {
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
                    setAvailableAgents(result.data.map((agent) => ({
                        id: agent.id,
                        firstName: agent.firstName
                    })));
                }
            }
            catch (err) {
                console.error('Error fetching agents:', err);
            }
        };
        fetchAllContacts();
        fetchAgents();
    }, []); // Only fetch once on component mount
    return (_jsxs("div", { className: "flex-1 p-4 sm:p-6", children: [_jsx("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-4 sm:space-y-0", children: _jsxs("div", { className: "flex items-center space-x-2 sm:space-x-4", children: [_jsx("button", { onClick: () => setSelectedTab('contacte'), className: `px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md ${selectedTab === 'contacte'
                                ? 'bg-gray-200 text-gray-900'
                                : 'text-gray-600 hover:text-gray-900'}`, children: "CONTACTE" }), _jsx("button", { className: "px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-green-500 rounded-md hover:bg-green-600", children: "ADAUGA" })] }) }), _jsxs("div", { className: "mb-6 bg-white rounded-lg shadow p-4", children: [_jsx("h3", { className: "text-sm font-medium text-gray-700 mb-4", children: "Filtre" }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-600 mb-1", children: "Numar proprietati" }), _jsx("input", { type: "number", min: "0", placeholder: "Min", value: propertiesCountFilter, onChange: (e) => setPropertiesCountFilter(e.target.value === '' ? '' : parseInt(e.target.value)), className: "w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-600 mb-1", children: "Numar cereri clienti" }), _jsx("input", { type: "number", min: "0", placeholder: "Min", value: clientRequestsCountFilter, onChange: (e) => setClientRequestsCountFilter(e.target.value === '' ? '' : parseInt(e.target.value)), className: "w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-600 mb-1", children: "Necesita follow-up" }), _jsxs("select", { value: needFollowUpFilter, onChange: (e) => setNeedFollowUpFilter(e.target.value), className: "w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500", children: [_jsx("option", { value: "all", children: "Toate" }), _jsx("option", { value: "yes", children: "Da" }), _jsx("option", { value: "no", children: "Nu" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs font-medium text-gray-600 mb-1", children: "Agent asignat" }), _jsxs("select", { value: assignedAgentFilter, onChange: (e) => setAssignedAgentFilter(e.target.value), className: "w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500", children: [_jsx("option", { value: "all", children: "Toti agentii" }), _jsx("option", { value: "unassigned", children: "Unassigned" }), availableAgents.map((agent) => (_jsx("option", { value: agent.id.toString(), children: agent.firstName }, agent.id)))] })] })] }), _jsx("div", { className: "mt-4 flex space-x-2", children: _jsx("button", { onClick: () => {
                                setPropertiesCountFilter('');
                                setClientRequestsCountFilter('');
                                setNeedFollowUpFilter('all');
                                setAssignedAgentFilter('all');
                            }, className: "px-4 py-2 text-xs font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50", children: "Reseteaza filtrele" }) })] }), _jsx("div", { className: "mb-4", children: _jsxs("p", { className: "text-xs sm:text-sm text-gray-600", children: ["Afisate ", Math.min(paginatedContacts.length, pageSize), " din ", totalFilteredCount, " contacte filtrate (", totalCount, " total)"] }) }), loading && (_jsxs("div", { className: "bg-white rounded-lg shadow p-8 text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600", children: "Loading contacts..." })] })), error && (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4 mb-4", children: _jsxs("div", { className: "flex", children: [_jsx("div", { className: "flex-shrink-0", children: _jsx("svg", { className: "h-5 w-5 text-red-400", viewBox: "0 0 20 20", fill: "currentColor", children: _jsx("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z", clipRule: "evenodd" }) }) }), _jsx("div", { className: "ml-3", children: _jsxs("p", { className: "text-sm text-red-800", children: ["Error loading contacts: ", error] }) })] }) })), !loading && !error && (_jsx("div", { className: "bg-white rounded-lg shadow overflow-hidden overflow-x-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "w-8 sm:w-12 px-2 sm:px-6 py-3" }), _jsx("th", { className: "px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "NUME" }), _jsx("th", { className: "px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "TELEFON" }), _jsx("th", { className: "hidden sm:table-cell px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "E-MAIL" }), _jsx("th", { className: "px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "STATUS" }), _jsx("th", { className: "hidden md:table-cell px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "AGENT" }), _jsx("th", { className: "hidden lg:table-cell px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "DATA" }), _jsx("th", { className: "px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "ACTIUNI" })] }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: paginatedContacts.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 8, className: "px-6 py-12 text-center text-gray-500", children: totalFilteredCount === 0
                                        ? "Nu au fost gasite contacte cu filtrele aplicate"
                                        : "Nu exista contacte pe aceasta pagina" }) })) : (paginatedContacts.map((contact) => (_jsxs("tr", { className: "hover:bg-gray-50 cursor-pointer", onClick: () => handleContactClick(contact), children: [_jsx("td", { className: "px-2 sm:px-6 py-2 sm:py-4", onClick: (e) => e.stopPropagation(), children: _jsx("input", { type: "checkbox", className: "rounded border-gray-300 w-3 h-3 sm:w-4 sm:h-4" }) }), _jsx("td", { className: "px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap", children: _jsxs("div", { className: "flex items-center", children: [_jsx("div", { className: "w-6 h-6 sm:w-8 sm:h-8 bg-gray-300 rounded-full mr-2 sm:mr-3" }), _jsxs("span", { className: "text-xs sm:text-sm font-medium text-gray-900 truncate", children: [contact.firstName || '?', " ", contact.lastName || ''] })] }) }), _jsx("td", { className: "px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap", children: _jsx("span", { className: "text-xs sm:text-sm text-blue-600 hover:text-blue-800", children: contact.phone || 'N/A' }) }), _jsx("td", { className: "hidden sm:table-cell px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900", children: contact.email || 'N/A' }), _jsx("td", { className: "px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap", children: _jsxs("div", { className: "flex space-x-1", children: [(contact.propertiesCount ?? 0) > 0 && (_jsx("div", { className: "w-4 h-4 sm:w-6 sm:h-6 bg-blue-500 rounded-full flex items-center justify-center", title: `${contact.propertiesCount} properties`, children: _jsx("svg", { className: "w-2 h-2 sm:w-3 sm:h-3 text-white", fill: "currentColor", viewBox: "0 0 20 20", children: _jsx("path", { d: "M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" }) }) })), (contact.clientRequestsCount ?? 0) > 0 && (_jsx("div", { className: "w-4 h-4 sm:w-6 sm:h-6 bg-green-500 rounded-full flex items-center justify-center", title: `${contact.clientRequestsCount} client requests`, children: _jsx("svg", { className: "w-2 h-2 sm:w-3 sm:h-3 text-white", fill: "currentColor", viewBox: "0 0 20 20", children: _jsx("path", { fillRule: "evenodd", d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z", clipRule: "evenodd" }) }) })), (contact.needFollowUp === true || contact.needFollowUp === 1) && (_jsx("div", { className: "w-4 h-4 sm:w-6 sm:h-6 bg-red-500 rounded-full flex items-center justify-center", title: "Needs follow-up", children: _jsx("svg", { className: "w-2 h-2 sm:w-3 sm:h-3 text-white", fill: "currentColor", viewBox: "0 0 20 20", children: _jsx("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z", clipRule: "evenodd" }) }) }))] }) }), _jsx("td", { className: "hidden md:table-cell px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900", children: _jsx("span", { className: "text-gray-900", children: contact.assignedAgentName || 'Unassigned' }) }), _jsx("td", { className: "hidden lg:table-cell px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500", children: contact.createdAt ? new Date(contact.createdAt).toLocaleDateString('ro-RO') : 'N/A' }), _jsx("td", { className: "px-2 sm:px-6 py-2 sm:py-4 whitespace-nowrap", onClick: (e) => e.stopPropagation(), children: _jsx("button", { className: "text-gray-400 hover:text-gray-600", children: _jsx("svg", { className: "w-4 h-4 sm:w-5 sm:h-5", fill: "currentColor", viewBox: "0 0 20 20", children: _jsx("path", { d: "M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" }) }) }) })] }, contact.id)))) })] }) })), !loading && !error && totalFilteredCount > 0 && (_jsx("div", { className: "mt-6 flex flex-col items-center space-y-4", children: _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("button", { onClick: () => setCurrentPage(Math.max(1, currentPage - 1)), disabled: currentPage === 1, className: "px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50", children: "Precedenta" }), _jsx("div", { className: "flex items-center space-x-1", children: (() => {
                                const totalPages = Math.ceil(totalFilteredCount / pageSize);
                                const pages = [];
                                // Always show page 1
                                pages.push(_jsx("button", { onClick: () => setCurrentPage(1), className: `px-3 py-1 text-sm border rounded-md ${currentPage === 1
                                        ? 'bg-blue-500 text-white border-blue-500'
                                        : 'hover:bg-gray-50'}`, children: "1" }, 1));
                                // Add ellipsis if there's a gap after page 1
                                if (currentPage > 3) {
                                    pages.push(_jsx("span", { className: "px-2 text-gray-500", children: "..." }, "ellipsis1"));
                                }
                                // Show pages around current page
                                const start = Math.max(2, currentPage - 1);
                                const end = Math.min(totalPages - 1, currentPage + 1);
                                for (let i = start; i <= end; i++) {
                                    if (i !== 1 && i !== totalPages) { // Don't duplicate page 1 or last page
                                        pages.push(_jsx("button", { onClick: () => setCurrentPage(i), className: `px-3 py-1 text-sm border rounded-md ${currentPage === i
                                                ? 'bg-blue-500 text-white border-blue-500'
                                                : 'hover:bg-gray-50'}`, children: i }, i));
                                    }
                                }
                                // Add ellipsis if there's a gap before last page
                                if (currentPage < totalPages - 2) {
                                    pages.push(_jsx("span", { className: "px-2 text-gray-500", children: "..." }, "ellipsis2"));
                                }
                                // Always show last page (if it's different from page 1)
                                if (totalPages > 1) {
                                    pages.push(_jsx("button", { onClick: () => setCurrentPage(totalPages), className: `px-3 py-1 text-sm border rounded-md ${currentPage === totalPages
                                            ? 'bg-blue-500 text-white border-blue-500'
                                            : 'hover:bg-gray-50'}`, children: totalPages }, totalPages));
                                }
                                return pages;
                            })() }), _jsx("button", { onClick: () => setCurrentPage(Math.min(Math.ceil(totalFilteredCount / pageSize), currentPage + 1)), disabled: currentPage >= Math.ceil(totalFilteredCount / pageSize), className: "px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50", children: "Urmatoarea" })] }) })), _jsx(ContactDetailsPanel, { contact: selectedContact, isOpen: isPanelOpen, onClose: handleClosePanel })] }));
}
