
import { WorkflowNode } from 'shared';
import type { ExecutionContext, EdgeMap } from 'shared';

export class FiecareElementNode extends WorkflowNode {
  metadata = {
    id: 'pentru-fiecare-element',
    name: 'Fiecare Element',
    version: '1.0.0',
    description: 'A node that loop on a  data set from real estate agency ',
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    const {  din } = config || {din:''};

    if (!din) {
        return {
          error: () => ({ error: 'Lipseste setul de date care trebuie filtrat' })
        };
      }
    const set_date = context.state[din]  || [];
    if (!set_date) {
        return {
          error: () => ({ error: 'Setul de date  nu exista' })
        };
      }
    try {

  
      if(set_date.length > 0) {
        if(!context.state.current_index){
            context.state.current_index = 0;
        } 
        }
      
      if (context.state.current_index < set_date.length) {
         context.state.currentDataItem = set_date[context.state.current_index];
         context.state.current_index++;
        return {
            executa:()=>{
                return set_date[context.state.current_index];
            }
        }
      }  
      else {
        return {
            terminat:()=>{
                return null;
            }
        }
      }


    } catch (error) {
      console.error(error);
      return {
        error: () => ({ error: 'A aparut o eroare la incarcarea contactelor' })
      };
    };
  }
}