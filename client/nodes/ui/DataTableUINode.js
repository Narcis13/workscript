// Data Table UI Node - Interactive data tables
import { UINode } from '@workscript/engine';
export class DataTableUINode extends UINode {
    metadata = {
        id: 'ui-data-table',
        name: 'Data Table UI',
        description: 'Creates interactive data tables with sorting, filtering, and selection',
        version: '1.0.0',
        category: 'ui-data',
        renderMode: 'component',
        inputs: ['data', 'columns', 'title'],
        outputs: ['row_selected', 'data_filtered', 'data_sorted']
    };
    async prepareRenderData(context, config) {
        return {
            data: config.data || context.state.tableData || [],
            columns: this.processColumns(config.columns || []),
            title: config.title || '',
            sortable: config.sortable !== false,
            filterable: config.filterable !== false,
            selectable: config.selectable !== false,
            pagination: config.pagination || { enabled: true, pageSize: 10 },
            loading: context.state.tableLoading || false
        };
    }
    async getEdges(context, config) {
        if (context.state.tableInteraction) {
            const interaction = context.state.tableInteraction;
            context.state.tableInteraction = null;
            return {
                [interaction.type]: () => interaction.data
            };
        }
        return {
            ready: () => ({ status: 'table_ready' })
        };
    }
    getComponentName() {
        return 'DataTable';
    }
    handleInteraction(event, context) {
        context.state.tableInteraction = {
            type: event.type,
            data: event.data
        };
        super.handleInteraction(event, context);
    }
    processColumns(columns) {
        return columns.map(col => ({
            key: col.key || col.name,
            label: col.label || col.key || col.name,
            type: col.type || 'text',
            sortable: col.sortable !== false,
            filterable: col.filterable !== false,
            width: col.width
        }));
    }
}
