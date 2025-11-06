/**
 * Central export point for all universal workflow nodes
 * These nodes work across all environments (server, client, CLI) with zero external dependencies
 *
 * Each universal node should be exported here to enable automatic registration
 * in environments where file-based discovery is not available (like browsers).
 */
// Import all universal nodes
export { MathNode } from './MathNode';
export { LogicNode } from './LogicNode';
export { DataTransformNode } from './DataTransformNode';
export { EmptyNode } from './EmptyNode';
export { LogNode } from './LogNode';
export { StateSetterNode } from './StateSetterNode';
// Import data manipulation nodes
export { SplitOutNode } from './data/SplitOutNode';
export { AggregateNode } from './data/AggregateNode';
export { RemoveDuplicatesNode } from './data/RemoveDuplicatesNode';
export { SortNode } from './data/SortNode';
export { LimitNode } from './data/LimitNode';
// Import data transformation nodes
export { EditFieldsNode } from './data/EditFieldsNode';
export { SummarizeNode } from './data/SummarizeNode';
// Import object manipulation nodes
export { TransformObjectNode } from './data/TransformObjectNode';
export { JSONExtractNode } from './data/JSONExtractNode';
// Import string manipulation nodes
export { StringOperationsNode } from './data/StringOperationsNode';
export { ExtractTextNode } from './data/ExtractTextNode';
// Import comparison & filtering nodes
export { FilterNode } from './data/FilterNode';
export { CompareDatasetsNode } from './data/CompareDatasetsNode';
export { SwitchNode } from './data/SwitchNode';
// Import calculation nodes
export { CalculateFieldNode } from './data/CalculateFieldNode';
export { MathOperationsNode } from './data/MathOperationsNode';
// Import date/time nodes
export { DateTimeNode } from './data/DateTimeNode';
// Import validation nodes
export { ValidateDataNode } from './data/ValidateDataNode';
// Import utility nodes
export { ArrayUtilitiesNode } from './data/ArrayUtilitiesNode';
export { ObjectUtilitiesNode } from './data/ObjectUtilitiesNode';
// Import for array creation
import { MathNode } from './MathNode';
import { LogicNode } from './LogicNode';
import { DataTransformNode } from './DataTransformNode';
import { EmptyNode } from './EmptyNode';
import { LogNode } from './LogNode';
import { StateSetterNode } from './StateSetterNode';
import { SplitOutNode } from './data/SplitOutNode';
import { AggregateNode } from './data/AggregateNode';
import { RemoveDuplicatesNode } from './data/RemoveDuplicatesNode';
import { SortNode } from './data/SortNode';
import { LimitNode } from './data/LimitNode';
import { EditFieldsNode } from './data/EditFieldsNode';
import { SummarizeNode } from './data/SummarizeNode';
import { TransformObjectNode } from './data/TransformObjectNode';
import { JSONExtractNode } from './data/JSONExtractNode';
import { StringOperationsNode } from './data/StringOperationsNode';
import { ExtractTextNode } from './data/ExtractTextNode';
import { FilterNode } from './data/FilterNode';
import { CompareDatasetsNode } from './data/CompareDatasetsNode';
import { SwitchNode } from './data/SwitchNode';
import { CalculateFieldNode } from './data/CalculateFieldNode';
import { MathOperationsNode } from './data/MathOperationsNode';
import { DateTimeNode } from './data/DateTimeNode';
import { ValidateDataNode } from './data/ValidateDataNode';
import { ArrayUtilitiesNode } from './data/ArrayUtilitiesNode';
import { ObjectUtilitiesNode } from './data/ObjectUtilitiesNode';
/**
 * Array of all universal node classes for automatic registration
 * Used by services in environments without file system access
 */
export const UNIVERSAL_NODES = [
    MathNode,
    LogicNode,
    DataTransformNode,
    EmptyNode,
    LogNode,
    StateSetterNode,
    // Data manipulation nodes
    SplitOutNode,
    AggregateNode,
    RemoveDuplicatesNode,
    SortNode,
    LimitNode,
    // Data transformation nodes
    EditFieldsNode,
    SummarizeNode,
    // Object manipulation nodes
    TransformObjectNode,
    JSONExtractNode,
    // String manipulation nodes
    StringOperationsNode,
    ExtractTextNode,
    // Comparison & filtering nodes
    FilterNode,
    CompareDatasetsNode,
    SwitchNode,
    // Calculation nodes
    CalculateFieldNode,
    MathOperationsNode,
    // Date/time nodes
    DateTimeNode,
    // Validation nodes
    ValidateDataNode,
    // Utility nodes
    ArrayUtilitiesNode,
    ObjectUtilitiesNode
];
/**
 * Get all universal node classes
 * @returns Array of universal node class constructors
 */
export function getAllUniversalNodes() {
    return [...UNIVERSAL_NODES];
}
/**
 * Get universal node metadata for development/debugging
 * @returns Array of node metadata objects
 */
export function getUniversalNodeMetadata() {
    return UNIVERSAL_NODES.map(NodeClass => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const instance = new NodeClass();
            return {
                ...instance.metadata,
                source: 'universal'
            };
        }
        catch (error) {
            console.warn(`Failed to get metadata for universal node class:`, NodeClass, error);
            return null;
        }
    }).filter(Boolean);
}
