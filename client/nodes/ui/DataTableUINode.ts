// Data Table UI Node - Interactive data tables

import { 
  UINode, 
  UINodeMetadata, 
  ExecutionContext, 
  EdgeMap, 
  UIInteractionEvent,
  Column 
} from 'shared';

export class DataTableUINode extends UINode {
  metadata: UINodeMetadata = {
    id: 'ui-data-table',
    name: 'Data Table UI',
    description: 'Creates interactive data tables with sorting, filtering, and selection',
    version: '1.0.0',
    category: 'ui-data',
    renderMode: 'component',
    inputs: ['data', 'columns', 'title'],
    outputs: ['row_selected', 'data_filtered', 'data_sorted']
  };

  protected async prepareRenderData(context: ExecutionContext, config: any) {
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

  protected async getEdges(context: ExecutionContext, config: any): Promise<EdgeMap> {
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

  protected getComponentName(): string {
    return 'DataTable';
  }

  protected handleInteraction(event: UIInteractionEvent, context: ExecutionContext): void {
    context.state.tableInteraction = {
      type: event.type,
      data: event.data
    };
    super.handleInteraction(event, context);
  }

  private processColumns(columns: any[]): Column[] {
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