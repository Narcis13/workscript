import { ContactRepository } from '../../../src/db/repositories/contactRepository';
import { WorkflowNode } from 'shared';
import type { ExecutionContext, EdgeMap } from 'shared';

export class ToateContacteleNode extends WorkflowNode {
  metadata = {
    id: 'toate-contactele',
    name: 'Toate Contactele',
    version: '1.0.0',
    description: 'A node that fetches all contacts from the database for a real estate agency',
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    try {
    const contacts = await new ContactRepository().findAllWithCounts();
    context.state.contacte = contacts;
    return {
       success :() => ({contacts}),
      };
    } catch (error) {
      console.error(error);
      return {
        error: () => ({ error: 'A aparut o eroare la incarcarea contactelor' })
      };
    };
  }
}