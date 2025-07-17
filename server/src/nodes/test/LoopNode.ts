import { WorkflowNode } from 'shared/dist';
import type { NodeMetadata, ExecutionContext, EdgeMap } from 'shared/dist';

/**
 * LoopNode - A node that demonstrates loop functionality
 * Processes items in state and can trigger loop or completion
 */
export class LoopNode extends WorkflowNode {
  metadata: NodeMetadata = {
    id: 'loop',
    name: 'Loop Node',
    version: '1.0.0',
    description: 'A node that can trigger loops based on conditions',
    inputs: ['items', 'batchSize', 'maxIterations'],
    outputs: ['loop', 'complete', 'error']
  };

  async execute(context: ExecutionContext, config?: Record<string, any>): Promise<EdgeMap> {
    try {
      // Get configuration
      const items = config?.items || context.inputs?.items || context.state.items || [];
      const batchSize = config?.batchSize || context.inputs?.batchSize || 1;
      const maxIterations = config?.maxIterations || context.inputs?.maxIterations || 10;

      // Initialize processing state if not present
      if (!context.state.processedCount) {
        context.state.processedCount = 0;
        context.state.totalItems = Array.isArray(items) ? items.length : 0;
        context.state.iterations = 0;
      }

      // Increment iteration counter
      context.state.iterations = (context.state.iterations || 0) + 1;

      // Check max iterations
      if (context.state.iterations > maxIterations) {
        return { 
          error: `Max iterations (${maxIterations}) exceeded`
        };
      }

      // Process batch
      const startIndex = context.state.processedCount;
      const endIndex = Math.min(startIndex + batchSize, context.state.totalItems);
      
      if (startIndex < context.state.totalItems) {
        // Process current batch
        const batch = Array.isArray(items) ? items.slice(startIndex, endIndex) : [];
        context.state.currentBatch = batch;
        context.state.processedCount = endIndex;
        
        // Add batch processing results
        if (!context.state.results) {
          context.state.results = [];
        }
        
        // Simulate processing
        const processedBatch = batch.map((item: any, index: number) => ({
          item,
          processed: true,
          index: startIndex + index
        }));
        
        context.state.results.push(...processedBatch);
        
        // Check if more items to process
        if (endIndex < context.state.totalItems) {
          // More items to process, trigger loop
          return { 
            loop: `Processed ${endIndex}/${context.state.totalItems} items`
          };
        }
      }

      // All items processed
      context.state.completed = true;
      return { 
        complete: `Processed all ${context.state.totalItems} items in ${context.state.iterations} iterations`
      };

    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * BatchProcessorNode - A node that processes items in a batch
 * Used in loop sequences
 */
export class BatchProcessorNode extends WorkflowNode {
  metadata: NodeMetadata = {
    id: 'batch-processor',
    name: 'Batch Processor Node',
    version: '1.0.0',
    description: 'Processes a batch of items',
    inputs: ['currentBatch'],
    outputs: ['success', 'error']
  };

  async execute(context: ExecutionContext, config?: Record<string, any>): Promise<EdgeMap> {
    try {
      const batch = context.state.currentBatch || [];
      const processingDelay = config?.delay || 0;

      // Simulate processing delay
      if (processingDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, processingDelay));
      }

      // Process each item in batch
      const processedItems = batch.map((item: any) => ({
        ...item,
        processed: true,
        processedAt: new Date().toISOString()
      }));

      // Update state
      context.state.lastProcessedBatch = processedItems;
      context.state.batchProcessedCount = (context.state.batchProcessedCount || 0) + 1;

      return { 
        success: `Processed batch of ${batch.length} items`
      };

    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'Batch processing failed'
      };
    }
  }
}

/**
 * ValidationNode - A node that validates processed items
 * Used in loop sequences
 */
export class ValidationNode extends WorkflowNode {
  metadata: NodeMetadata = {
    id: 'validator',
    name: 'Validation Node',
    version: '1.0.0',
    description: 'Validates processed items',
    inputs: ['results'],
    outputs: ['valid', 'invalid', 'error']
  };

  async execute(context: ExecutionContext, config?: Record<string, any>): Promise<EdgeMap> {
    try {
      const results = context.state.results || [];
      const validationThreshold = config?.threshold || 0.8;

      // Validate results
      const validItems = results.filter((item: any) => item.processed);
      const validationRatio = results.length > 0 ? validItems.length / results.length : 0;

      // Update state
      context.state.validationRatio = validationRatio;
      context.state.validItemCount = validItems.length;
      context.state.totalValidated = results.length;

      if (validationRatio >= validationThreshold) {
        return { 
          valid: `Validation passed: ${validationRatio.toFixed(2)} ratio`
        };
      } else {
        return { 
          invalid: `Validation failed: ${validationRatio.toFixed(2)} ratio below threshold ${validationThreshold}`
        };
      }

    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'Validation failed'
      };
    }
  }
}