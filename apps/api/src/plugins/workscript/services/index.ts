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
