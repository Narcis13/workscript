// Chart UI Node - Data visualization components

import { UINode } from '@workscript/engine';
import type { 
  UINodeMetadata, 
  ExecutionContext, 
  EdgeMap, 
  UIInteractionEvent,
  ChartData,
  ChartConfig 
} from '@workscript/engine';

export class ChartUINode extends UINode {
  metadata: UINodeMetadata = {
    id: 'ui-chart',
    name: 'Data Chart UI',
    description: 'Creates interactive data visualization charts',
    version: '1.0.0',
    category: 'ui-visualization',
    renderMode: 'component',
    inputs: ['data', 'chartType', 'config', 'title'],
    outputs: ['chart_ready', 'data_point_click', 'chart_interaction']
  };

  protected async prepareRenderData(context: ExecutionContext, config: any) {
    const chartType = config.chartType || 'line';
    const data = this.processChartData(config.data || context.state.chartData || [], chartType);
    
    return {
      data,
      type: chartType,
      config: config.config || {},
      title: config.title || '',
      loading: context.state.chartLoading || false,
      interactive: config.interactive !== false,
      height: config.height || 400,
      width: config.width || '100%'
    };
  }

  protected async getEdges(context: ExecutionContext, config: any): Promise<EdgeMap> {
    if (context.state.chartInteraction) {
      const interaction = context.state.chartInteraction;
      context.state.chartInteraction = null;
      
      return {
        [interaction.type]: () => ({ 
          interactionData: interaction.data,
          timestamp: interaction.timestamp
        })
      };
    }
    
    return {
      ready: () => ({ status: 'chart_ready' })
    };
  }

  protected getComponentName(): string {
    return 'WorkflowChart';
  }

  protected handleInteraction(event: UIInteractionEvent, context: ExecutionContext): void {
    context.state.chartInteraction = {
      type: event.type,
      data: event.data,
      timestamp: Date.now()
    };
    super.handleInteraction(event, context);
  }

  private processChartData(data: any[], chartType: string): ChartData {
    // Transform data based on chart type - placeholder implementation
    return {
      labels: data.map((d: any) => d.label || d.name || ''),
      datasets: [{
        label: 'Dataset 1',
        data: data.map((d: any) => d.value || 0)
      }]
    };
  }
}