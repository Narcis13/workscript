// Dashboard UI Node - Interactive dashboard container
import { UINode } from '@workscript/engine';
export class DashboardUINode extends UINode {
    metadata = {
        id: 'ui-dashboard',
        name: 'Dashboard Container UI',
        description: 'Creates interactive dashboard layouts with multiple sections',
        version: '1.0.0',
        category: 'ui-layout',
        renderMode: 'container',
        inputs: ['layout', 'sections', 'title', 'data'],
        outputs: ['dashboard_ready', 'section_interaction', 'refresh_triggered']
    };
    async prepareRenderData(context, config) {
        const layout = config.layout || 'grid';
        const title = config.title || 'Dashboard';
        const sections = this.processSections(config.sections || []);
        return {
            layout,
            title,
            sections,
            data: context.state.dashboardData || {},
            loading: context.state.dashboardLoading || false,
            error: context.state.dashboardError || null,
            refreshEnabled: config.refreshEnabled !== false,
            refreshInterval: config.refreshInterval || 0, // 0 = no auto refresh
            lastUpdated: context.state.dashboardLastUpdated || null,
            className: config.className || '',
            style: config.style || {}
        };
    }
    async getEdges(context, config) {
        // Check for dashboard actions
        if (context.state.dashboardAction) {
            const action = context.state.dashboardAction;
            context.state.dashboardAction = null; // Clear action
            switch (action.type) {
                case 'section_click':
                    return {
                        section_interaction: () => ({
                            sectionId: action.sectionId,
                            interactionType: 'click',
                            data: action.data
                        })
                    };
                case 'refresh':
                    return {
                        refresh: () => ({
                            timestamp: action.timestamp,
                            triggeredBy: action.triggeredBy || 'user'
                        })
                    };
                case 'section_update':
                    return {
                        section_updated: () => ({
                            sectionId: action.sectionId,
                            updatedData: action.data
                        })
                    };
                default:
                    return {
                        action: () => ({ actionType: action.type, actionData: action.data })
                    };
            }
        }
        // Check if dashboard is ready
        if (context.state.dashboardInitialized) {
            return {
                ready: () => ({
                    status: 'dashboard_ready',
                    sectionsCount: (config.sections || []).length
                })
            };
        }
        // Default - initializing
        return {
            initializing: () => ({ status: 'initializing' })
        };
    }
    getComponentName() {
        return 'Dashboard';
    }
    handleInteraction(event, context) {
        switch (event.type) {
            case 'dashboard_initialized':
                this.handleDashboardInitialized(context);
                break;
            case 'section_interaction':
                this.handleSectionInteraction(event.data, context);
                break;
            case 'dashboard_refresh':
                this.handleDashboardRefresh(event.data, context);
                break;
            case 'section_update':
                this.handleSectionUpdate(event.data, context);
                break;
            default:
                super.handleInteraction(event, context);
        }
    }
    handleDashboardInitialized(context) {
        context.state.dashboardInitialized = true;
        context.state.dashboardLastUpdated = new Date().toISOString();
    }
    handleSectionInteraction(data, context) {
        context.state.dashboardAction = {
            type: 'section_click',
            sectionId: data.sectionId,
            data: data.interactionData,
            timestamp: Date.now()
        };
    }
    handleDashboardRefresh(data, context) {
        context.state.dashboardAction = {
            type: 'refresh',
            timestamp: Date.now(),
            triggeredBy: data.triggeredBy || 'user'
        };
        // Reset loading state for refresh
        context.state.dashboardLoading = true;
        context.state.dashboardError = null;
    }
    handleSectionUpdate(data, context) {
        const { sectionId, updatedData } = data;
        // Update section data in dashboard state
        if (!context.state.dashboardSectionData) {
            context.state.dashboardSectionData = {};
        }
        context.state.dashboardSectionData[sectionId] = updatedData;
        context.state.dashboardAction = {
            type: 'section_update',
            sectionId,
            data: updatedData,
            timestamp: Date.now()
        };
    }
    processSections(sections) {
        return sections.map((section, index) => ({
            id: section.id || `section-${index}`,
            title: section.title || `Section ${index + 1}`,
            component: section.component || 'Card',
            props: section.props || {},
            layout: {
                width: section.layout?.width || 'auto',
                height: section.layout?.height || 'auto',
                position: section.layout?.position || 'left'
            }
        }));
    }
    // Helper method to update dashboard data from external sources
    updateDashboardData(context, data) {
        context.state.dashboardData = { ...context.state.dashboardData, ...data };
        context.state.dashboardLastUpdated = new Date().toISOString();
        context.state.dashboardLoading = false;
        context.state.dashboardError = null;
    }
    // Helper method to set dashboard error state
    setDashboardError(context, error) {
        context.state.dashboardError = error;
        context.state.dashboardLoading = false;
    }
}
