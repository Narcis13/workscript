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
