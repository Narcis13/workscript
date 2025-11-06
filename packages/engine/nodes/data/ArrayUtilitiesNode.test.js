import { describe, it, expect, beforeEach } from 'vitest';
import { ArrayUtilitiesNode } from './ArrayUtilitiesNode';
describe('ArrayUtilitiesNode', () => {
    let node;
    let context;
    beforeEach(() => {
        node = new ArrayUtilitiesNode();
        context = {
            state: {},
            inputs: {},
            workflowId: 'test-workflow',
            nodeId: 'array-util-1',
            executionId: 'test-execution-123'
        };
    });
    describe('metadata', () => {
        it('should have correct metadata', () => {
            expect(node.metadata.id).toBe('arrayUtilities');
            expect(node.metadata.name).toBe('Array Utilities');
            expect(node.metadata.version).toBe('1.0.0');
            expect(node.metadata.description).toContain('array manipulation');
        });
        it('should have ai_hints defined', () => {
            expect(node.metadata.ai_hints).toBeDefined();
            expect(node.metadata.ai_hints?.purpose).toBeDefined();
            expect(node.metadata.ai_hints?.when_to_use).toBeDefined();
            expect(node.metadata.ai_hints?.expected_edges).toContain('success');
            expect(node.metadata.ai_hints?.expected_edges).toContain('error');
        });
    });
    describe('chunk operation', () => {
        it('should chunk array into specified sizes', async () => {
            const data = {
                numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9]
            };
            context.inputs = { data };
            const result = await node.execute(context, {
                operation: 'chunk',
                field: 'numbers',
                chunkSize: 3,
                outputField: 'chunked'
            });
            expect(result.success).toBeDefined();
            const response = await result.success(context);
            expect(response.chunked).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
        });
        it('should handle chunk size larger than array', async () => {
            const data = {
                numbers: [1, 2, 3]
            };
            context.inputs = { data };
            const result = await node.execute(context, {
                operation: 'chunk',
                field: 'numbers',
                chunkSize: 10
            });
            expect(result.success).toBeDefined();
            const response = await result.success(context);
            expect(response.numbersResult).toEqual([[1, 2, 3]]);
        });
        it('should handle uneven chunks', async () => {
            const data = {
                tags: ['a', 'b', 'c', 'd', 'e']
            };
            context.inputs = { data };
            const result = await node.execute(context, {
                operation: 'chunk',
                field: 'tags',
                chunkSize: 2
            });
            expect(result.success).toBeDefined();
            const response = await result.success(context);
            expect(response.tagsResult).toEqual([['a', 'b'], ['c', 'd'], ['e']]);
        });
    });
    describe('compact operation', () => {
        it('should remove falsy values', async () => {
            const data = {
                values: [1, null, 'hello', undefined, 0, false, '', 'world', 2]
            };
            context.inputs = { data };
            const result = await node.execute(context, {
                operation: 'compact',
                field: 'values'
            });
            expect(result.success).toBeDefined();
            const response = await result.success(context);
            expect(response.valuesResult).toEqual([1, 'hello', 'world', 2]);
        });
        it('should handle array with no falsy values', async () => {
            const data = {
                values: [1, 2, 'test', true]
            };
            context.inputs = { data };
            const result = await node.execute(context, {
                operation: 'compact',
                field: 'values'
            });
            expect(result.success).toBeDefined();
            const response = await result.success(context);
            expect(response.valuesResult).toEqual([1, 2, 'test', true]);
        });
    });
    describe('difference operation', () => {
        it('should return elements in first array but not in second', async () => {
            const data = {
                array1: [1, 2, 3, 4, 5],
                array2: [3, 4, 5, 6, 7]
            };
            context.inputs = { data };
            const result = await node.execute(context, {
                operation: 'difference',
                field: 'array1',
                compareArray: 'array2'
            });
            expect(result.success).toBeDefined();
            const response = await result.success(context);
            expect(response.array1Result).toEqual([1, 2]);
        });
        it('should handle object arrays', async () => {
            const data = {
                users1: [{ id: 1 }, { id: 2 }, { id: 3 }],
                users2: [{ id: 2 }, { id: 3 }, { id: 4 }]
            };
            context.inputs = { data };
            const result = await node.execute(context, {
                operation: 'difference',
                field: 'users1',
                compareArray: 'users2'
            });
            expect(result.success).toBeDefined();
            const response = await result.success(context);
            expect(response.users1Result).toEqual([{ id: 1 }]);
        });
        it('should return error if compareArray is missing', async () => {
            const data = {
                array1: [1, 2, 3]
            };
            context.inputs = { data };
            const result = await node.execute(context, {
                operation: 'difference',
                field: 'array1'
            });
            expect(result.error).toBeDefined();
            const response = await result.error(context);
            expect(response.error).toContain('compareArray parameter is required');
        });
    });
    describe('intersection operation', () => {
        it('should return common elements between arrays', async () => {
            const data = {
                array1: [1, 2, 3, 4, 5],
                array2: [3, 4, 5, 6, 7]
            };
            context.inputs = { data };
            const result = await node.execute(context, {
                operation: 'intersection',
                field: 'array1',
                compareArray: 'array2'
            });
            expect(result.success).toBeDefined();
            const response = await result.success(context);
            expect(response.array1Result).toEqual([3, 4, 5]);
        });
        it('should handle no common elements', async () => {
            const data = {
                array1: [1, 2, 3],
                array2: [4, 5, 6]
            };
            context.inputs = { data };
            const result = await node.execute(context, {
                operation: 'intersection',
                field: 'array1',
                compareArray: 'array2'
            });
            expect(result.success).toBeDefined();
            const response = await result.success(context);
            expect(response.array1Result).toEqual([]);
        });
    });
    describe('union operation', () => {
        it('should combine arrays and remove duplicates', async () => {
            const data = {
                array1: [1, 2, 3],
                array2: [3, 4, 5]
            };
            context.inputs = { data };
            const result = await node.execute(context, {
                operation: 'union',
                field: 'array1',
                compareArray: 'array2'
            });
            expect(result.success).toBeDefined();
            const response = await result.success(context);
            expect(response.array1Result).toEqual([1, 2, 3, 4, 5]);
        });
        it('should handle all duplicates', async () => {
            const data = {
                array1: [1, 2, 3],
                array2: [1, 2, 3]
            };
            context.inputs = { data };
            const result = await node.execute(context, {
                operation: 'union',
                field: 'array1',
                compareArray: 'array2'
            });
            expect(result.success).toBeDefined();
            const response = await result.success(context);
            expect(response.array1Result).toEqual([1, 2, 3]);
        });
    });
    describe('unique operation', () => {
        it('should remove duplicate primitive values', async () => {
            const data = {
                numbers: [1, 2, 2, 3, 4, 4, 5]
            };
            context.inputs = { data };
            const result = await node.execute(context, {
                operation: 'unique',
                field: 'numbers'
            });
            expect(result.success).toBeDefined();
            const response = await result.success(context);
            expect(response.numbersResult).toEqual([1, 2, 3, 4, 5]);
        });
        it('should remove duplicates by specific field', async () => {
            const data = {
                users: [
                    { id: 1, name: 'Alice' },
                    { id: 2, name: 'Bob' },
                    { id: 1, name: 'Alice Updated' }
                ]
            };
            context.inputs = { data };
            const result = await node.execute(context, {
                operation: 'unique',
                field: 'users',
                uniqueBy: 'id'
            });
            expect(result.success).toBeDefined();
            const response = await result.success(context);
            expect(response.usersResult.length).toBe(2);
            expect(response.usersResult[0].id).toBe(1);
            expect(response.usersResult[1].id).toBe(2);
        });
        it('should handle string duplicates', async () => {
            const data = {
                tags: ['red', 'blue', 'red', 'green', 'blue']
            };
            context.inputs = { data };
            const result = await node.execute(context, {
                operation: 'unique',
                field: 'tags'
            });
            expect(result.success).toBeDefined();
            const response = await result.success(context);
            expect(response.tagsResult).toEqual(['red', 'blue', 'green']);
        });
    });
    describe('reverse operation', () => {
        it('should reverse array order', async () => {
            const data = {
                numbers: [1, 2, 3, 4, 5]
            };
            context.inputs = { data };
            const result = await node.execute(context, {
                operation: 'reverse',
                field: 'numbers'
            });
            expect(result.success).toBeDefined();
            const response = await result.success(context);
            expect(response.numbersResult).toEqual([5, 4, 3, 2, 1]);
            // Original should be unchanged
            expect(response.numbers).toEqual([1, 2, 3, 4, 5]);
        });
    });
    describe('shuffle operation', () => {
        it('should shuffle array elements', async () => {
            const data = {
                numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
            };
            context.inputs = { data };
            const result = await node.execute(context, {
                operation: 'shuffle',
                field: 'numbers'
            });
            expect(result.success).toBeDefined();
            const response = await result.success(context);
            // Should have same elements
            expect(response.numbersResult.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
            // Should have same length
            expect(response.numbersResult.length).toBe(10);
        });
    });
    describe('flatten operation', () => {
        it('should flatten nested arrays to default depth', async () => {
            const data = {
                nested: [1, [2, 3], [4, [5, 6]]]
            };
            context.inputs = { data };
            const result = await node.execute(context, {
                operation: 'flatten',
                field: 'nested'
            });
            expect(result.success).toBeDefined();
            const response = await result.success(context);
            expect(response.nestedResult).toEqual([1, 2, 3, 4, 5, 6]);
        });
        it('should flatten to specified depth', async () => {
            const data = {
                nested: [1, [2, [3, [4, [5]]]]]
            };
            context.inputs = { data };
            const result = await node.execute(context, {
                operation: 'flatten',
                field: 'nested',
                depth: 2
            });
            expect(result.success).toBeDefined();
            const response = await result.success(context);
            expect(response.nestedResult).toEqual([1, 2, 3, [4, [5]]]);
        });
        it('should not flatten when depth is 0', async () => {
            const data = {
                nested: [1, [2, 3]]
            };
            context.inputs = { data };
            const result = await node.execute(context, {
                operation: 'flatten',
                field: 'nested',
                depth: 0
            });
            expect(result.success).toBeDefined();
            const response = await result.success(context);
            expect(response.nestedResult).toEqual([1, [2, 3]]);
        });
    });
    describe('first operation', () => {
        it('should get first N elements', async () => {
            const data = {
                items: [1, 2, 3, 4, 5]
            };
            context.inputs = { data };
            const result = await node.execute(context, {
                operation: 'first',
                field: 'items',
                count: 3
            });
            expect(result.success).toBeDefined();
            const response = await result.success(context);
            expect(response.itemsResult).toEqual([1, 2, 3]);
        });
        it('should get first element when count is 1', async () => {
            const data = {
                items: [1, 2, 3, 4, 5]
            };
            context.inputs = { data };
            const result = await node.execute(context, {
                operation: 'first',
                field: 'items',
                count: 1
            });
            expect(result.success).toBeDefined();
            const response = await result.success(context);
            expect(response.itemsResult).toEqual([1]);
        });
        it('should return all elements when count exceeds length', async () => {
            const data = {
                items: [1, 2, 3]
            };
            context.inputs = { data };
            const result = await node.execute(context, {
                operation: 'first',
                field: 'items',
                count: 10
            });
            expect(result.success).toBeDefined();
            const response = await result.success(context);
            expect(response.itemsResult).toEqual([1, 2, 3]);
        });
    });
    describe('last operation', () => {
        it('should get last N elements', async () => {
            const data = {
                items: [1, 2, 3, 4, 5]
            };
            context.inputs = { data };
            const result = await node.execute(context, {
                operation: 'last',
                field: 'items',
                count: 3
            });
            expect(result.success).toBeDefined();
            const response = await result.success(context);
            expect(response.itemsResult).toEqual([3, 4, 5]);
        });
        it('should get last element when count is 1', async () => {
            const data = {
                items: [1, 2, 3, 4, 5]
            };
            context.inputs = { data };
            const result = await node.execute(context, {
                operation: 'last',
                field: 'items',
                count: 1
            });
            expect(result.success).toBeDefined();
            const response = await result.success(context);
            expect(response.itemsResult).toEqual([5]);
        });
    });
    describe('sample operation', () => {
        it('should get random samples', async () => {
            const data = {
                items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
            };
            context.inputs = { data };
            const result = await node.execute(context, {
                operation: 'sample',
                field: 'items',
                sampleSize: 3
            });
            expect(result.success).toBeDefined();
            const response = await result.success(context);
            // Should have correct size
            expect(response.itemsResult.length).toBe(3);
            // All samples should be from original array
            response.itemsResult.forEach((item) => {
                expect(data.items).toContain(item);
            });
        });
        it('should return all elements when sample size exceeds length', async () => {
            const data = {
                items: [1, 2, 3]
            };
            context.inputs = { data };
            const result = await node.execute(context, {
                operation: 'sample',
                field: 'items',
                sampleSize: 10
            });
            expect(result.success).toBeDefined();
            const response = await result.success(context);
            expect(response.itemsResult.length).toBe(3);
        });
    });
    describe('error handling', () => {
        it('should return error when field is missing', async () => {
            const data = { items: [1, 2, 3] };
            context.inputs = { data };
            const result = await node.execute(context, {
                operation: 'unique'
                // field missing
            });
            expect(result.error).toBeDefined();
            const response = await result.error(context);
            expect(response.error).toContain('Missing required parameter: field');
        });
        it('should return error when field is not an array', async () => {
            const data = { items: 'not an array' };
            context.inputs = { data };
            const result = await node.execute(context, {
                operation: 'unique',
                field: 'items'
            });
            expect(result.error).toBeDefined();
            const response = await result.error(context);
            expect(response.error).toContain('is not an array');
        });
        it('should return error for unknown operation', async () => {
            const data = { items: [1, 2, 3] };
            context.inputs = { data };
            const result = await node.execute(context, {
                operation: 'invalid_op',
                field: 'items'
            });
            expect(result.error).toBeDefined();
            const response = await result.error(context);
            expect(response.error).toContain('Unknown operation');
        });
    });
    describe('empty array handling', () => {
        it('should handle empty arrays', async () => {
            const data = { items: [] };
            context.inputs = { data };
            const result = await node.execute(context, {
                operation: 'unique',
                field: 'items'
            });
            expect(result.empty).toBeDefined();
            const response = await result.empty(context);
            expect(response.itemsResult).toEqual([]);
        });
    });
    describe('state management', () => {
        it('should store operation results in state', async () => {
            const data = { numbers: [1, 2, 2, 3] };
            context.inputs = { data };
            await node.execute(context, {
                operation: 'unique',
                field: 'numbers',
                outputField: 'uniqueNumbers'
            });
            expect(context.state.arrayUtilResult).toBeDefined();
            expect(context.state.arrayUtilResult.operation).toBe('unique');
            expect(context.state.arrayUtilResult.field).toBe('numbers');
            expect(context.state.arrayUtilResult.resultField).toBe('uniqueNumbers');
        });
    });
    describe('nested field access', () => {
        it('should access nested arrays using dot notation', async () => {
            const data = {
                user: {
                    tags: ['a', 'b', 'b', 'c']
                }
            };
            context.inputs = { data };
            const result = await node.execute(context, {
                operation: 'unique',
                field: 'user.tags'
            });
            expect(result.success).toBeDefined();
            const response = await result.success(context);
            expect(response['user.tagsResult']).toEqual(['a', 'b', 'c']);
        });
    });
});
