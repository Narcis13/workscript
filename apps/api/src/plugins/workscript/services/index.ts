// Workflow execution service
export { WorkflowService } from './WorkflowService';

// FlexDB services
export {
  FlexSchemaValidator,
  flexSchemaValidator,
  validateColumnDefinition,
  validateTableName,
  assignIndexSlots,
  getSlotType,
} from './FlexSchemaValidator';
export type { IndexSlotAssignment } from './FlexSchemaValidator';

export {
  FlexVersionService,
  flexVersionService,
  computeSchemaChanges,
} from './FlexVersionService';

export {
  FlexDBService,
  flexDBService,
} from './FlexDBService';
export type { ServiceResult, FlexDBErrorCode } from './FlexDBService';

// FlexDB Query Builder
export {
  FlexQueryBuilder,
  buildFilterConditions,
  buildSingleCondition,
  buildOrderBy,
  slotNameToDbColumn,
  getIndexSlotForField,
  getIndexedColumnRef,
} from './FlexQueryBuilder';
export type {
  FlexFilterCondition,
  FlexAdvancedFilter,
  FlexQueryParams,
} from './FlexQueryBuilder';

// FlexDB Record Service
export {
  FlexRecordService,
  flexRecordService,
  extractIndexedValues,
  buildSearchText,
} from './FlexRecordService';
export type { RecordServiceResult, FlexRecordErrorCode } from './FlexRecordService';
