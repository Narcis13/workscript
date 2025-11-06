import { describe, it, expect, beforeEach } from 'vitest';
import { DateTimeNode } from './DateTimeNode';
describe('DateTimeNode', () => {
    let node;
    let context;
    beforeEach(() => {
        node = new DateTimeNode();
        context = {
            state: {},
            inputs: {},
            workflowId: 'test-workflow',
            nodeId: 'datetime-test',
            executionId: 'test-execution-123'
        };
    });
    describe('metadata', () => {
        it('should have correct metadata', () => {
            expect(node.metadata.id).toBe('dateTime');
            expect(node.metadata.name).toBe('Date & Time Operations');
            expect(node.metadata.version).toBe('1.0.0');
            expect(node.metadata.ai_hints).toBeDefined();
            expect(node.metadata.ai_hints?.purpose).toContain('date');
        });
        it('should have comprehensive expected edges', () => {
            const expectedEdges = node.metadata.ai_hints?.expected_edges || [];
            expect(expectedEdges).toContain('success');
            expect(expectedEdges).toContain('error');
            expect(expectedEdges).toContain('is_before');
            expect(expectedEdges).toContain('is_after');
        });
    });
    describe('now operation', () => {
        it('should return current date/time', async () => {
            const result = await node.execute(context, {
                operation: 'now'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toBeDefined();
            expect(typeof data.result).toBe('string');
            expect(context.state.dateTimeResult).toBeDefined();
        });
    });
    describe('format operation', () => {
        it('should format ISO date to MM/DD/YYYY', async () => {
            context.state.createdAt = '2025-01-15T14:30:00Z';
            const result = await node.execute(context, {
                operation: 'format',
                field: 'createdAt',
                outputFormat: 'MM/DD/YYYY'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toBe('01/15/2025');
        });
        it('should format ISO date to YYYY-MM-DD', async () => {
            context.state.date = '2025-12-25T00:00:00Z';
            const result = await node.execute(context, {
                operation: 'format',
                field: 'date',
                outputFormat: 'YYYY-MM-DD'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toBe('2025-12-25');
        });
        it('should format with time components', async () => {
            context.state.timestamp = '2025-01-15T14:30:45Z';
            const result = await node.execute(context, {
                operation: 'format',
                field: 'timestamp',
                outputFormat: 'YYYY-MM-DD HH:mm:ss'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toContain('2025-01-15');
            expect(data.result).toContain(':');
        });
        it('should handle missing format by returning ISO', async () => {
            context.state.date = '2025-01-15T14:30:00Z';
            const result = await node.execute(context, {
                operation: 'format',
                field: 'date'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toContain('2025-01-15');
        });
    });
    describe('parse operation', () => {
        it('should parse ISO date string', async () => {
            context.state.dateStr = '2025-01-15T14:30:00Z';
            const result = await node.execute(context, {
                operation: 'parse',
                field: 'dateStr'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toBeInstanceOf(Date);
        });
        it('should parse custom format YYYY-MM-DD', async () => {
            context.state.dateStr = '2025-01-15';
            const result = await node.execute(context, {
                operation: 'parse',
                field: 'dateStr',
                inputFormat: 'YYYY-MM-DD'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toBeInstanceOf(Date);
        });
        it('should parse MM/DD/YYYY format', async () => {
            context.state.dateStr = '01/15/2025';
            const result = await node.execute(context, {
                operation: 'parse',
                field: 'dateStr',
                inputFormat: 'MM/DD/YYYY'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toBeInstanceOf(Date);
        });
    });
    describe('add operation', () => {
        it('should add days to a date', async () => {
            context.state.startDate = '2025-01-15T00:00:00Z';
            const result = await node.execute(context, {
                operation: 'add',
                field: 'startDate',
                amount: 5,
                unit: 'days'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toContain('2025-01-20');
        });
        it('should add months to a date', async () => {
            context.state.date = '2025-01-15T00:00:00Z';
            const result = await node.execute(context, {
                operation: 'add',
                field: 'date',
                amount: 2,
                unit: 'months'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toContain('2025-03-15');
        });
        it('should add years to a date', async () => {
            context.state.date = '2025-01-15T00:00:00Z';
            const result = await node.execute(context, {
                operation: 'add',
                field: 'date',
                amount: 1,
                unit: 'years'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toContain('2026-01-15');
        });
        it('should add hours to a date', async () => {
            context.state.timestamp = '2025-01-15T10:00:00Z';
            const result = await node.execute(context, {
                operation: 'add',
                field: 'timestamp',
                amount: 5,
                unit: 'hours'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toContain('T15:00:00');
        });
    });
    describe('subtract operation', () => {
        it('should subtract days from a date', async () => {
            context.state.endDate = '2025-01-20T00:00:00Z';
            const result = await node.execute(context, {
                operation: 'subtract',
                field: 'endDate',
                amount: 5,
                unit: 'days'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toContain('2025-01-15');
        });
        it('should subtract months from a date', async () => {
            context.state.date = '2025-03-15T00:00:00Z';
            const result = await node.execute(context, {
                operation: 'subtract',
                field: 'date',
                amount: 2,
                unit: 'months'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toContain('2025-01-15');
        });
    });
    describe('round operation', () => {
        it('should round to start of day', async () => {
            context.state.timestamp = '2025-01-15T14:30:45Z';
            const result = await node.execute(context, {
                operation: 'round',
                field: 'timestamp',
                roundTo: 'start_of_day'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toContain('T00:00:00.000Z');
        });
        it('should round to end of day', async () => {
            context.state.timestamp = '2025-01-15T14:30:45Z';
            const result = await node.execute(context, {
                operation: 'round',
                field: 'timestamp',
                roundTo: 'end_of_day'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toContain('T23:59:59.999Z');
        });
        it('should round to start of month', async () => {
            context.state.date = '2025-01-15T14:30:45Z';
            const result = await node.execute(context, {
                operation: 'round',
                field: 'date',
                roundTo: 'start_of_month'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toContain('2025-01-01T00:00:00.000Z');
        });
        it('should round to start of year', async () => {
            context.state.date = '2025-06-15T14:30:45Z';
            const result = await node.execute(context, {
                operation: 'round',
                field: 'date',
                roundTo: 'start_of_year'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toContain('2025-01-01T00:00:00.000Z');
        });
    });
    describe('compare operation', () => {
        it('should check if date is before another', async () => {
            context.state.date1 = '2025-01-15T00:00:00Z';
            const result = await node.execute(context, {
                operation: 'compare',
                field: 'date1',
                compareWith: '2025-01-20T00:00:00Z',
                compareOperation: 'is_before'
            });
            expect(result.is_before).toBeDefined();
            const data = await result.is_before(context);
            expect(data.result).toBe(true);
        });
        it('should check if date is after another', async () => {
            context.state.date1 = '2025-01-20T00:00:00Z';
            const result = await node.execute(context, {
                operation: 'compare',
                field: 'date1',
                compareWith: '2025-01-15T00:00:00Z',
                compareOperation: 'is_after'
            });
            expect(result.is_after).toBeDefined();
            const data = await result.is_after(context);
            expect(data.result).toBe(true);
        });
        it('should check if dates are the same', async () => {
            const sameDate = '2025-01-15T00:00:00Z';
            context.state.date1 = sameDate;
            const result = await node.execute(context, {
                operation: 'compare',
                field: 'date1',
                compareWith: sameDate,
                compareOperation: 'is_same'
            });
            expect(result.is_same).toBeDefined();
            const data = await result.is_same(context);
            expect(data.result).toBe(true);
        });
    });
    describe('extract operation', () => {
        it('should extract year', async () => {
            context.state.date = '2025-06-15T14:30:45Z';
            const result = await node.execute(context, {
                operation: 'extract',
                field: 'date',
                extract: 'year'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toBe(2025);
        });
        it('should extract month', async () => {
            context.state.date = '2025-06-15T14:30:45Z';
            const result = await node.execute(context, {
                operation: 'extract',
                field: 'date',
                extract: 'month'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toBe(6);
        });
        it('should extract day', async () => {
            context.state.date = '2025-06-15T14:30:45Z';
            const result = await node.execute(context, {
                operation: 'extract',
                field: 'date',
                extract: 'day'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toBe(15);
        });
        it('should extract hour', async () => {
            context.state.date = '2025-06-15T14:30:45Z';
            const result = await node.execute(context, {
                operation: 'extract',
                field: 'date',
                extract: 'hour'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(typeof data.result).toBe('number');
        });
        it('should extract dayOfWeek', async () => {
            context.state.date = '2025-06-15T14:30:45Z'; // Sunday = 0
            const result = await node.execute(context, {
                operation: 'extract',
                field: 'date',
                extract: 'dayOfWeek'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toBeGreaterThanOrEqual(0);
            expect(data.result).toBeLessThanOrEqual(6);
        });
        it('should extract quarter', async () => {
            context.state.date = '2025-06-15T14:30:45Z'; // Q2
            const result = await node.execute(context, {
                operation: 'extract',
                field: 'date',
                extract: 'quarter'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toBe(2);
        });
    });
    describe('diff operation', () => {
        it('should calculate difference in days', async () => {
            context.state.date1 = '2025-01-15T00:00:00Z';
            const result = await node.execute(context, {
                operation: 'diff',
                field: 'date1',
                compareWith: '2025-01-20T00:00:00Z',
                diffUnit: 'days'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toBe(5);
        });
        it('should calculate difference in hours', async () => {
            context.state.date1 = '2025-01-15T10:00:00Z';
            const result = await node.execute(context, {
                operation: 'diff',
                field: 'date1',
                compareWith: '2025-01-15T15:00:00Z',
                diffUnit: 'hours'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toBe(5);
        });
        it('should calculate difference in months', async () => {
            context.state.date1 = '2025-01-15T00:00:00Z';
            const result = await node.execute(context, {
                operation: 'diff',
                field: 'date1',
                compareWith: '2025-04-15T00:00:00Z',
                diffUnit: 'months'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toBe(3);
        });
    });
    describe('is_valid operation', () => {
        it('should validate a valid ISO date', async () => {
            context.state.date = '2025-01-15T14:30:00Z';
            const result = await node.execute(context, {
                operation: 'is_valid',
                field: 'date'
            });
            expect(result.is_valid).toBeDefined();
            const data = await result.is_valid(context);
            expect(data.result).toBe(true);
        });
        it('should invalidate an invalid date string', async () => {
            context.state.invalidDate = 'not-a-date';
            const result = await node.execute(context, {
                operation: 'is_valid',
                field: 'invalidDate'
            });
            expect(result.is_invalid).toBeDefined();
            const data = await result.is_invalid(context);
            expect(data.result).toBe(false);
        });
    });
    describe('to_iso operation', () => {
        it('should convert date to ISO string', async () => {
            context.state.date = '01/15/2025';
            const result = await node.execute(context, {
                operation: 'to_iso',
                field: 'date',
                inputFormat: 'MM/DD/YYYY'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toContain('2025-01-15');
            expect(data.result).toContain('T');
        });
    });
    describe('error handling', () => {
        it('should return error for missing operation', async () => {
            const result = await node.execute(context, {});
            expect(result.error).toBeDefined();
            const errorData = await result.error(context);
            expect(errorData.error).toContain('operation');
        });
        it('should return error for unknown operation', async () => {
            const result = await node.execute(context, {
                operation: 'invalid_operation'
            });
            expect(result.error).toBeDefined();
            const errorData = await result.error(context);
            expect(errorData.error).toContain('Unknown operation');
        });
        it('should return error for missing field', async () => {
            const result = await node.execute(context, {
                operation: 'format',
                field: 'nonexistentField'
            });
            expect(result.error).toBeDefined();
        });
        it('should use default value on error if configured', async () => {
            const result = await node.execute(context, {
                operation: 'format',
                field: 'nonexistentField',
                onError: 'use_default',
                defaultValue: '2025-01-01T00:00:00Z'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.usedDefault).toBe(true);
            expect(data.result).toBe('2025-01-01T00:00:00Z');
        });
        it('should skip on error if configured', async () => {
            const result = await node.execute(context, {
                operation: 'format',
                field: 'nonexistentField',
                onError: 'skip'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.skipped).toBe(true);
        });
    });
    describe('state management', () => {
        it('should store result in default output field', async () => {
            const result = await node.execute(context, {
                operation: 'now'
            });
            expect(result.success).toBeDefined();
            expect(context.state.dateTimeResult).toBeDefined();
        });
        it('should store result in custom output field', async () => {
            context.state.date = '2025-01-15T00:00:00Z';
            const result = await node.execute(context, {
                operation: 'format',
                field: 'date',
                outputField: 'formattedDate',
                outputFormat: 'MM/DD/YYYY'
            });
            expect(result.success).toBeDefined();
            expect(context.state.formattedDate).toBeDefined();
            expect(context.state.formattedDate).toBe('01/15/2025');
        });
        it('should preserve extracted components in state', async () => {
            context.state.date = '2025-06-15T14:30:45Z';
            await node.execute(context, {
                operation: 'extract',
                field: 'date',
                extract: 'year'
            });
            expect(context.state.dateTimeExtracted).toBe(2025);
        });
    });
    describe('nested field access', () => {
        it('should access nested date field', async () => {
            context.state.user = {
                profile: {
                    createdAt: '2025-01-15T14:30:00Z'
                }
            };
            const result = await node.execute(context, {
                operation: 'format',
                field: 'user.profile.createdAt',
                outputFormat: 'MM/DD/YYYY'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toBe('01/15/2025');
        });
    });
    describe('type handling', () => {
        it('should handle Date object as input', async () => {
            context.state.dateObj = new Date('2025-01-15T14:30:00Z');
            const result = await node.execute(context, {
                operation: 'format',
                field: 'dateObj',
                outputFormat: 'MM/DD/YYYY'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toBe('01/15/2025');
        });
        it('should handle timestamp number as input', async () => {
            context.state.timestamp = new Date('2025-01-15T00:00:00Z').getTime();
            const result = await node.execute(context, {
                operation: 'format',
                field: 'timestamp',
                outputFormat: 'YYYY-MM-DD'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toBe('2025-01-15');
        });
    });
});
