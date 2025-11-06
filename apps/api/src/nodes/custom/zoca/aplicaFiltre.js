import { WorkflowNode } from 'shared';
export class AplicaFiltreNode extends WorkflowNode {
    metadata = {
        id: 'aplica-filtre',
        name: 'Aplica Filtre',
        version: '1.0.0',
        description: 'A node that filter data sets from real estate agency on many criteria',
    };
    async execute(context, config) {
        const { filtre, setDate } = config || { filtre: [] };
        if (!setDate) {
            return {
                error: () => ({ error: 'Lipseste setul de date care trebuie filtrat' })
            };
        }
        const set_date = context.state[setDate] || [];
        if (!set_date) {
            return {
                error: () => ({ error: 'Setul de date care trebuie filtrat nu exista' })
            };
        }
        try {
            // console.log('set_date', set_date.length, filtre);
            // Apply filters to the dataset
            let filteredData = set_date;
            if (filtre && filtre.length > 0) {
                filteredData = set_date.filter((item) => {
                    return filtre.every((filtru) => {
                        const { camp, valoare } = filtru;
                        // Special case for assignedAgentName with "toti" value
                        if (camp === 'assignedAgentName' && valoare === 'toti') {
                            return true; // Include all items regardless of assignedAgentName
                        }
                        // Standard filtering logic
                        const itemValue = item[camp];
                        // Handle string comparison (case-insensitive)
                        if (typeof itemValue === 'string' && typeof valoare === 'string') {
                            return itemValue.toLowerCase() === valoare.toLowerCase();
                        }
                        // Handle exact value comparison (for numbers, booleans, etc.)
                        return itemValue == valoare;
                    });
                });
            }
            // Save filtered data to state
            context.state.filteredData = filteredData;
            console.log('Filtered data count:', filteredData.length);
            return {
                success: () => ({ filteredCount: filteredData.length }),
            };
        }
        catch (error) {
            console.error(error);
            return {
                error: () => ({ error: 'A aparut o eroare la incarcarea contactelor' })
            };
        }
        ;
    }
}
