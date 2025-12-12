/**
 * Reflection Services Index
 *
 * Central export point for all reflection services
 */

// Node categorization utilities
export {
  NODE_CATEGORIES,
  NODE_FILE_PATHS,
  getNodeCategory,
  getNodeFilePath,
  getNodesByCategory,
  getNodeCountsByCategory,
  getAllNodeIds,
  isKnownNode,
} from './nodeCategories';

// Source extraction service
export {
  SourceExtractor,
  getSourceExtractor,
} from './SourceExtractor';

// Manifest generation service
export {
  ManifestGenerator,
  getManifestGenerator,
} from './ManifestGenerator';

// Workflow analysis service
export {
  WorkflowAnalyzer,
  getWorkflowAnalyzer,
} from './WorkflowAnalyzer';

// Composability graph service
export {
  ComposabilityGraph,
  getComposabilityGraph,
} from './ComposabilityGraph';

// Pattern library service
export {
  PatternLibrary,
  getPatternLibrary,
} from './PatternLibrary';
