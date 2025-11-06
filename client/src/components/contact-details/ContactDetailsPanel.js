import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Contact } from '../pages/Contacte';
import { PanelHeader } from './PanelHeader';
import { TabNavigation } from './TabNavigation';
import { ContactInfoSection } from './ContactInfoSection';
import { ActivityHistorySection } from './ActivityHistorySection';
import { StatisticsGrid } from './StatisticsGrid';
import { FollowUpModal } from './FollowUpModal';
const tabs = [
    { id: 'detalii', label: 'Detalii' },
    { id: 'activitati', label: 'Activitati' },
    { id: 'propuseri', label: 'Propuseri' },
    { id: 'mesaje', label: 'Mesaje' },
];
export function ContactDetailsPanel({ contact, isOpen, onClose }) {
    const [activeTab, setActiveTab] = useState('detalii');
    const [fullContextFromChild, setFullContextFromChild] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [aiResponse, setAiResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const handleFollowUp = async () => {
        const followup_context = { fullContext: fullContextFromChild };
        followup_context.fullContext.clientRequest.agentName = followup_context.fullContext.contact.assignedAgentName;
        followup_context.fullContext.clientRequest.agentPhone = followup_context.fullContext.contact.assignedAgentPhone;
        const followup_userprompt = JSON.stringify(followup_context.fullContext.clientRequest).replace(/\\\\r\\\\n/g, ' ');
        setIsModalOpen(true);
        setIsLoading(true);
        setAiResponse('');
        try {
            const response = await fetch('http://localhost:3013/api/zoca/ai-agents/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: 'Follow Up Agent',
                    user_prompt: followup_userprompt
                }),
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            // console.log('data', data);
            setAiResponse(data.data.ai_response || 'No response received from the AI agent.');
        }
        catch (error) {
            console.error('Error calling follow-up API:', error);
            setAiResponse(`Error: ${error instanceof Error ? error.message : 'Failed to get response from AI agent'}`);
        }
        finally {
            setIsLoading(false);
        }
    };
    // Reset active tab when contact changes
    useEffect(() => {
        if (contact) {
            setActiveTab('detalii');
        }
    }, [contact?.id]);
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);
    if (!contact)
        return null;
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: `fixed inset-0 z-40 bg-black transition-opacity duration-300 ${isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'}`, onClick: onClose }), _jsxs("div", { className: `fixed right-0 top-0 h-full z-50 bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} 
        w-full md:w-[480px] lg:w-[550px] xl:w-[600px]`, children: [_jsx(PanelHeader, { firstName: contact.firstName, lastName: contact.lastName, onClose: onClose }), _jsx(TabNavigation, { tabs: tabs, activeTab: activeTab, onTabChange: setActiveTab }), _jsxs("div", { className: `flex-1 overflow-y-auto p-4 ${activeTab === 'detalii' ? 'pb-20' : ''}`, children: [activeTab === 'detalii' && (_jsxs("div", { className: "space-y-6", children: [_jsx(ContactInfoSection, { contact: contact }), _jsx(StatisticsGrid, { contact: contact, onFullContextChange: setFullContextFromChild })] })), activeTab === 'activitati' && (_jsx(ActivityHistorySection, { contact: contact })), activeTab !== 'detalii' && activeTab !== 'activitati' && (_jsxs("div", { className: "text-center py-8", children: [_jsx("div", { className: "text-gray-400 mb-2", children: _jsx("svg", { className: "w-12 h-12 mx-auto", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1, d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" }) }) }), _jsxs("p", { className: "text-sm text-gray-500", children: ["Sectiunea ", tabs.find(t => t.id === activeTab)?.label, " va fi implementata"] })] }))] }), activeTab === 'detalii' && (_jsx("div", { className: "absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200", children: _jsx("button", { onClick: handleFollowUp, className: "bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors", children: "Follow-up" }) }))] }), _jsx(FollowUpModal, { isOpen: isModalOpen, onClose: () => setIsModalOpen(false), response: aiResponse, isLoading: isLoading })] }));
}
