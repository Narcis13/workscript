import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

/**
 * ToateContacteleNode - Fetch all contacts from the database
 *
 * NOTE: This node requires ContactRepository to be provided through dependency injection.
 * The repository should be passed via the execution context or node config.
 * This is a legacy Zoca integration node that depends on the CRM database layer.
 *
 * TODO: After migration, this node will need to be updated to use the proper
 * database abstraction layer or API endpoint from the server package.
 */
export class ToateContacteleNode extends WorkflowNode {
  metadata = {
    id: 'toate-contactele',
    name: 'Toate Contactele',
    version: '1.0.0',
    description: 'A node that fetches all contacts from the database for a real estate agency',
    inputs: ['contactRepository'],
    outputs: ['success', 'error'],
    ai_hints: {
      purpose: 'Fetch all contacts from the CRM database',
      when_to_use: 'When you need to retrieve all contacts for processing in a workflow',
      expected_edges: ['success', 'error'],
      example_usage: '{"toate-contactele": {"contactRepository": "$.contactRepository", "success?": "process-contacts"}}',
      example_config: '{}',
      get_from_state: ['contactRepository'],
      post_to_state: ['contacte']
    }
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    try {
      // Get ContactRepository from context or config
      // This should be injected by the server/API that uses this node
      const contactRepository = config?.contactRepository || context.state.contactRepository;

      if (!contactRepository) {
        return {
          error: () => ({
            error: 'ContactRepository not provided. This node requires a ContactRepository instance to be passed via config or state.'
          })
        };
      }

      const contacts = await contactRepository.findAllWithCounts();
      context.state.contacte = contacts;

      return {
        success: () => ({ contacts }),
      };
    } catch (error) {
      console.error('Error fetching contacts:', error);
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'A aparut o eroare la incarcarea contactelor'
        })
      };
    }
  }
}