import { describe, it, expect, beforeEach } from 'vitest';
import { ObjectUtilitiesNode } from './ObjectUtilitiesNode';
describe('ObjectUtilitiesNode', () => {
    let node;
    let context;
    beforeEach(() => {
        node = new ObjectUtilitiesNode();
        context = {
            state: {},
            inputs: {},
            workflowId: 'test-workflow',
            nodeId: 'test-node',
            executionId: 'test-execution-123'
        };
    });
    describe('metadata', () => {
        it('should have correct metadata', () => {
            expect(node.metadata.id).toBe('objectUtilities');
            expect(node.metadata.name).toBe('Object Utilities');
            expect(node.metadata.version).toBe('1.0.0');
            expect(node.metadata.description).toContain('object manipulation');
        });
        it('should have ai_hints defined', () => {
            expect(node.metadata.ai_hints).toBeDefined();
            expect(node.metadata.ai_hints?.purpose).toBeDefined();
            expect(node.metadata.ai_hints?.when_to_use).toBeDefined();
            expect(node.metadata.ai_hints?.expected_edges).toContain('success');
        });
    });
    describe('operation: keys', () => {
        it('should extract all keys from an object', async () => {
            context.state.testObj = {
                name: 'John',
                age: 30,
                email: 'john@example.com'
            };
            const result = await node.execute(context, {
                operation: 'keys',
                field: 'testObj',
                outputField: 'objKeys'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toEqual(['name', 'age', 'email']);
            expect(context.state.objKeys).toEqual(['name', 'age', 'email']);
        });
        it('should return empty array for non-object', async () => {
            context.state.testValue = 'not an object';
            const result = await node.execute(context, {
                operation: 'keys',
                field: 'testValue',
                outputField: 'keys'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toEqual([]);
        });
    });
    describe('operation: values', () => {
        it('should extract all values from an object', async () => {
            context.state.testObj = {
                name: 'Alice',
                age: 28,
                active: true
            };
            const result = await node.execute(context, {
                operation: 'values',
                field: 'testObj',
                outputField: 'objValues'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toEqual(['Alice', 28, true]);
            expect(context.state.objValues).toEqual(['Alice', 28, true]);
        });
    });
    describe('operation: entries', () => {
        it('should convert object to entries array', async () => {
            context.state.testObj = {
                id: 123,
                name: 'Product'
            };
            const result = await node.execute(context, {
                operation: 'entries',
                field: 'testObj',
                outputField: 'objEntries'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toEqual([
                ['id', 123],
                ['name', 'Product']
            ]);
        });
    });
    describe('operation: has_field', () => {
        it('should check if field exists at top level', async () => {
            context.state.testObj = {
                name: 'John',
                age: 30
            };
            const result = await node.execute(context, {
                operation: 'has_field',
                field: 'testObj',
                path: 'name'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toBe(true);
        });
        it('should check if nested field exists', async () => {
            context.state.testObj = {
                user: {
                    profile: {
                        name: 'John',
                        age: 30
                    }
                }
            };
            const result = await node.execute(context, {
                operation: 'has_field',
                field: 'testObj',
                path: 'user.profile.name'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toBe(true);
        });
        it('should return not_found edge when field does not exist', async () => {
            context.state.testObj = {
                name: 'John'
            };
            const result = await node.execute(context, {
                operation: 'has_field',
                field: 'testObj',
                path: 'email'
            });
            expect(result.not_found).toBeDefined();
            const data = await result.not_found(context);
            expect(data.result).toBe(false);
        });
        it('should require path parameter', async () => {
            context.state.testObj = { name: 'John' };
            const result = await node.execute(context, {
                operation: 'has_field',
                field: 'testObj'
            });
            expect(result.error).toBeDefined();
        });
    });
    describe('operation: is_empty', () => {
        it('should return true for empty object', async () => {
            context.state.testObj = {};
            const result = await node.execute(context, {
                operation: 'is_empty',
                field: 'testObj'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toBe(true);
        });
        it('should return false for non-empty object', async () => {
            context.state.testObj = { name: 'John' };
            const result = await node.execute(context, {
                operation: 'is_empty',
                field: 'testObj'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toBe(false);
        });
    });
    describe('operation: merge', () => {
        it('should perform shallow merge of two objects', async () => {
            context.state.obj1 = {
                name: 'John',
                age: 30
            };
            context.state.obj2 = {
                age: 31,
                email: 'john@example.com'
            };
            const result = await node.execute(context, {
                operation: 'merge',
                field: 'obj1',
                mergeWith: 'obj2',
                overwrite: true
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toEqual({
                name: 'John',
                age: 31,
                email: 'john@example.com'
            });
        });
        it('should not overwrite when overwrite is false', async () => {
            context.state.obj1 = {
                name: 'John',
                age: 30
            };
            context.state.obj2 = {
                age: 31,
                email: 'john@example.com'
            };
            const result = await node.execute(context, {
                operation: 'merge',
                field: 'obj1',
                mergeWith: 'obj2',
                overwrite: false
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toEqual({
                name: 'John',
                age: 30,
                email: 'john@example.com'
            });
        });
        it('should require mergeWith parameter', async () => {
            context.state.obj1 = { name: 'John' };
            const result = await node.execute(context, {
                operation: 'merge',
                field: 'obj1'
            });
            expect(result.error).toBeDefined();
        });
    });
    describe('operation: deep_merge', () => {
        it('should perform deep merge of nested objects', async () => {
            context.state.obj1 = {
                user: {
                    name: 'John',
                    profile: {
                        age: 30,
                        city: 'Boston'
                    }
                }
            };
            context.state.obj2 = {
                user: {
                    profile: {
                        age: 31,
                        country: 'USA'
                    },
                    settings: {
                        theme: 'dark'
                    }
                }
            };
            const result = await node.execute(context, {
                operation: 'deep_merge',
                field: 'obj1',
                mergeWith: 'obj2',
                overwrite: true
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toEqual({
                user: {
                    name: 'John',
                    profile: {
                        age: 31,
                        city: 'Boston',
                        country: 'USA'
                    },
                    settings: {
                        theme: 'dark'
                    }
                }
            });
        });
        it('should handle arrays without merging', async () => {
            context.state.obj1 = {
                tags: ['a', 'b']
            };
            context.state.obj2 = {
                tags: ['c', 'd']
            };
            const result = await node.execute(context, {
                operation: 'deep_merge',
                field: 'obj1',
                mergeWith: 'obj2',
                overwrite: true
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result.tags).toEqual(['c', 'd']);
        });
    });
    describe('operation: clone', () => {
        it('should create shallow copy of object', async () => {
            const nested = { value: 42 };
            context.state.testObj = {
                name: 'John',
                nested
            };
            const result = await node.execute(context, {
                operation: 'clone',
                field: 'testObj',
                outputField: 'clonedObj'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toEqual(context.state.testObj);
            expect(data.result).not.toBe(context.state.testObj);
            // Shallow copy means nested objects are same reference
            expect(data.result.nested).toBe(nested);
        });
        it('should clone arrays', async () => {
            context.state.testArray = [1, 2, 3];
            const result = await node.execute(context, {
                operation: 'clone',
                field: 'testArray'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toEqual([1, 2, 3]);
            expect(data.result).not.toBe(context.state.testArray);
        });
    });
    describe('operation: deep_clone', () => {
        it('should create deep copy of nested object', async () => {
            context.state.testObj = {
                name: 'John',
                profile: {
                    age: 30,
                    address: {
                        city: 'Boston'
                    }
                }
            };
            const result = await node.execute(context, {
                operation: 'deep_clone',
                field: 'testObj',
                outputField: 'deepClonedObj'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toEqual(context.state.testObj);
            expect(data.result).not.toBe(context.state.testObj);
            expect(data.result.profile).not.toBe(context.state.testObj.profile);
            expect(data.result.profile.address).not.toBe(context.state.testObj.profile.address);
        });
        it('should handle Date objects', async () => {
            const testDate = new Date('2025-01-15');
            context.state.testObj = {
                createdAt: testDate
            };
            const result = await node.execute(context, {
                operation: 'deep_clone',
                field: 'testObj'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result.createdAt).toEqual(testDate);
            expect(data.result.createdAt).not.toBe(testDate);
        });
        it('should handle RegExp objects', async () => {
            const testRegex = /test/gi;
            context.state.testObj = {
                pattern: testRegex
            };
            const result = await node.execute(context, {
                operation: 'deep_clone',
                field: 'testObj'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result.pattern.source).toBe('test');
            expect(data.result.pattern.flags).toBe('gi');
            expect(data.result.pattern).not.toBe(testRegex);
        });
    });
    describe('operation: get_nested', () => {
        it('should get value at nested path', async () => {
            context.state.testObj = {
                user: {
                    profile: {
                        name: 'John',
                        age: 30
                    }
                }
            };
            const result = await node.execute(context, {
                operation: 'get_nested',
                field: 'testObj',
                path: 'user.profile.name'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toBe('John');
        });
        it('should return not_found for non-existent path', async () => {
            context.state.testObj = {
                user: {
                    name: 'John'
                }
            };
            const result = await node.execute(context, {
                operation: 'get_nested',
                field: 'testObj',
                path: 'user.profile.name'
            });
            expect(result.not_found).toBeDefined();
        });
        it('should require path parameter', async () => {
            context.state.testObj = { name: 'John' };
            const result = await node.execute(context, {
                operation: 'get_nested',
                field: 'testObj'
            });
            expect(result.error).toBeDefined();
        });
    });
    describe('operation: set_nested', () => {
        it('should set value at nested path', async () => {
            context.state.testObj = {
                user: {
                    name: 'John'
                }
            };
            const result = await node.execute(context, {
                operation: 'set_nested',
                field: 'testObj',
                path: 'user.profile.age',
                value: 30
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result.user.profile.age).toBe(30);
            expect(data.result.user.name).toBe('John');
        });
        it('should create intermediate objects', async () => {
            context.state.testObj = {};
            const result = await node.execute(context, {
                operation: 'set_nested',
                field: 'testObj',
                path: 'level1.level2.level3',
                value: 'deep value'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result.level1.level2.level3).toBe('deep value');
        });
        it('should require path parameter', async () => {
            context.state.testObj = {};
            const result = await node.execute(context, {
                operation: 'set_nested',
                field: 'testObj',
                value: 'test'
            });
            expect(result.error).toBeDefined();
        });
        it('should require value parameter', async () => {
            context.state.testObj = {};
            const result = await node.execute(context, {
                operation: 'set_nested',
                field: 'testObj',
                path: 'test'
            });
            expect(result.error).toBeDefined();
        });
    });
    describe('operation: delete_nested', () => {
        it('should delete field at nested path', async () => {
            context.state.testObj = {
                user: {
                    name: 'John',
                    age: 30,
                    profile: {
                        city: 'Boston'
                    }
                }
            };
            const result = await node.execute(context, {
                operation: 'delete_nested',
                field: 'testObj',
                path: 'user.age'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result.user.name).toBe('John');
            expect(data.result.user.age).toBeUndefined();
            expect(data.result.user.profile.city).toBe('Boston');
        });
        it('should handle non-existent path gracefully', async () => {
            context.state.testObj = {
                user: {
                    name: 'John'
                }
            };
            const result = await node.execute(context, {
                operation: 'delete_nested',
                field: 'testObj',
                path: 'user.profile.age'
            });
            expect(result.success).toBeDefined();
            const data = await result.success(context);
            expect(data.result).toEqual({ user: { name: 'John' } });
        });
        it('should require path parameter', async () => {
            context.state.testObj = { name: 'John' };
            const result = await node.execute(context, {
                operation: 'delete_nested',
                field: 'testObj'
            });
            expect(result.error).toBeDefined();
        });
    });
    describe('error handling', () => {
        it('should return error for missing operation', async () => {
            const result = await node.execute(context, {
                field: 'testObj'
            });
            expect(result.error).toBeDefined();
            const errorData = await result.error(context);
            expect(errorData.error).toContain('operation');
        });
        it('should return error for missing field', async () => {
            const result = await node.execute(context, {
                operation: 'keys'
            });
            expect(result.error).toBeDefined();
            const errorData = await result.error(context);
            expect(errorData.error).toContain('field');
        });
        it('should return error for non-existent field', async () => {
            const result = await node.execute(context, {
                operation: 'keys',
                field: 'nonExistentField'
            });
            expect(result.error).toBeDefined();
            const errorData = await result.error(context);
            expect(errorData.error).toContain('not found');
        });
        it('should return error for unknown operation', async () => {
            context.state.testObj = { name: 'John' };
            const result = await node.execute(context, {
                operation: 'invalid_operation',
                field: 'testObj'
            });
            expect(result.error).toBeDefined();
            const errorData = await result.error(context);
            expect(errorData.error).toContain('Unknown operation');
        });
    });
    describe('state management', () => {
        it('should use custom output field name', async () => {
            context.state.testObj = { name: 'John', age: 30 };
            const result = await node.execute(context, {
                operation: 'keys',
                field: 'testObj',
                outputField: 'customKeys'
            });
            expect(result.success).toBeDefined();
            expect(context.state.customKeys).toBeDefined();
        });
        it('should use default output field name', async () => {
            context.state.testObj = { name: 'John', age: 30 };
            const result = await node.execute(context, {
                operation: 'keys',
                field: 'testObj'
            });
            expect(result.success).toBeDefined();
            expect(context.state.testObj_keys).toBeDefined();
        });
        it('should always set objectUtilResult', async () => {
            context.state.testObj = { name: 'John', age: 30 };
            await node.execute(context, {
                operation: 'keys',
                field: 'testObj'
            });
            expect(context.state.objectUtilResult).toBeDefined();
        });
    });
});
