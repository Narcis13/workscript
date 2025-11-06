/**
 * Tests for StateResolver - State reference resolution functionality
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { StateResolver, StateResolverError } from './StateResolver';
describe('StateResolver', () => {
    let resolver;
    let testState;
    beforeEach(() => {
        resolver = StateResolver.createDefault();
        testState = {
            developer: 'John Doe',
            count: 42,
            active: true,
            user: {
                name: 'Jane Smith',
                age: 30,
                profile: {
                    email: 'jane@example.com'
                }
            },
            list: ['item1', 'item2', 'item3'],
            nullValue: null,
            undefinedValue: undefined
        };
    });
    describe('Basic string resolution', () => {
        test('should resolve simple state reference', () => {
            const config = '$.developer';
            const result = resolver.resolve(config, testState);
            expect(result).toBe('John Doe');
        });
        test('should resolve numeric state reference', () => {
            const config = '$.count';
            const result = resolver.resolve(config, testState);
            expect(result).toBe(42);
        });
        test('should resolve boolean state reference', () => {
            const config = '$.active';
            const result = resolver.resolve(config, testState);
            expect(result).toBe(true);
        });
        test('should return non-state-reference strings unchanged', () => {
            const config = 'regular string';
            const result = resolver.resolve(config, testState);
            expect(result).toBe('regular string');
        });
        test('should return non-state-reference strings with $ unchanged', () => {
            const config = '$not-a-reference';
            const result = resolver.resolve(config, testState);
            expect(result).toBe('$not-a-reference');
        });
    });
    describe('Nested object resolution', () => {
        test('should resolve nested state references', () => {
            const config = '$.user.name';
            const result = resolver.resolve(config, testState);
            expect(result).toBe('Jane Smith');
        });
        test('should resolve deeply nested state references', () => {
            const config = '$.user.profile.email';
            const result = resolver.resolve(config, testState);
            expect(result).toBe('jane@example.com');
        });
        test('should handle missing nested keys', () => {
            const config = '$.user.missing.key';
            const result = resolver.resolve(config, testState);
            expect(result).toBeUndefined();
        });
    });
    describe('Complex object resolution', () => {
        test('should resolve state references in objects', () => {
            const config = {
                message: '$.developer',
                count: '$.count',
                active: '$.active'
            };
            const result = resolver.resolve(config, testState);
            expect(result).toEqual({
                message: 'John Doe',
                count: 42,
                active: true
            });
        });
        test('should resolve nested objects with mixed values', () => {
            const config = {
                greeting: 'Hello, $.user.name!',
                userInfo: {
                    name: '$.user.name',
                    age: '$.user.age',
                    static: 'This is static'
                },
                count: '$.count'
            };
            const result = resolver.resolve(config, testState);
            expect(result).toEqual({
                greeting: 'Hello, $.user.name!', // String not matching pattern
                userInfo: {
                    name: 'Jane Smith',
                    age: 30,
                    static: 'This is static'
                },
                count: 42
            });
        });
    });
    describe('Array resolution', () => {
        test('should resolve state references in arrays', () => {
            const config = ['$.developer', '$.count', 'static value'];
            const result = resolver.resolve(config, testState);
            expect(result).toEqual(['John Doe', 42, 'static value']);
        });
        test('should resolve nested arrays', () => {
            const config = [
                '$.developer',
                {
                    name: '$.user.name',
                    values: ['$.count', '$.active']
                }
            ];
            const result = resolver.resolve(config, testState);
            expect(result).toEqual([
                'John Doe',
                {
                    name: 'Jane Smith',
                    values: [42, true]
                }
            ]);
        });
    });
    describe('Edge cases', () => {
        test('should handle null and undefined values', () => {
            const config = {
                nullVal: '$.nullValue',
                undefinedVal: '$.undefinedValue',
                regular: null
            };
            const result = resolver.resolve(config, testState);
            expect(result).toEqual({
                nullVal: null,
                undefinedVal: undefined,
                regular: null
            });
        });
        test('should handle primitive types', () => {
            expect(resolver.resolve(42, testState)).toBe(42);
            expect(resolver.resolve(true, testState)).toBe(true);
            expect(resolver.resolve(null, testState)).toBe(null);
            expect(resolver.resolve(undefined, testState)).toBe(undefined);
        });
        test('should handle empty objects and arrays', () => {
            expect(resolver.resolve({}, testState)).toEqual({});
            expect(resolver.resolve([], testState)).toEqual([]);
        });
    });
    describe('Missing key handling strategies', () => {
        test('should return undefined for missing keys by default', () => {
            const config = '$.nonexistent';
            const result = resolver.resolve(config, testState);
            expect(result).toBeUndefined();
        });
        test('should preserve original string with preserve strategy', () => {
            const preservingResolver = StateResolver.createPreserving();
            const config = '$.nonexistent';
            const result = preservingResolver.resolve(config, testState);
            expect(result).toBe('$.nonexistent');
        });
        test('should throw error with strict strategy', () => {
            const strictResolver = StateResolver.createStrict();
            const config = '$.nonexistent';
            expect(() => {
                strictResolver.resolve(config, testState);
            }).toThrow(StateResolverError);
        });
    });
    describe('Pattern validation', () => {
        test('should identify state reference patterns correctly', () => {
            expect(StateResolver.isStateReference('$.developer')).toBe(true);
            expect(StateResolver.isStateReference('$.user.name')).toBe(true);
            expect(StateResolver.isStateReference('$developer')).toBe(false);
            expect(StateResolver.isStateReference('regular')).toBe(false);
            expect(StateResolver.isStateReference('$.123invalid')).toBe(false);
        });
        test('should extract key paths correctly', () => {
            expect(StateResolver.extractKeyPath('$.developer')).toBe('developer');
            expect(StateResolver.extractKeyPath('$.user.name')).toBe('user.name');
            expect(StateResolver.extractKeyPath('invalid')).toBe(null);
        });
    });
    describe('Custom patterns', () => {
        test('should work with custom patterns', () => {
            const customPattern = /^state\.([a-zA-Z_][a-zA-Z0-9_.]*)$/;
            const customResolver = new StateResolver({ pattern: customPattern });
            const config = 'state.developer';
            const result = customResolver.resolve(config, testState);
            expect(result).toBe('John Doe');
        });
    });
    describe('Depth limiting', () => {
        test('should prevent infinite recursion with max depth', () => {
            const shallowResolver = new StateResolver({ maxDepth: 2 });
            const deepConfig = {
                level1: {
                    level2: {
                        level3: {
                            level4: '$.developer'
                        }
                    }
                }
            };
            expect(() => {
                shallowResolver.resolve(deepConfig, testState);
            }).toThrow(StateResolverError);
        });
    });
    describe('Real-world scenarios', () => {
        test('should handle workflow node configuration example', () => {
            const nodeConfig = {
                message: '$.developer',
                logLevel: 'info',
                userData: {
                    name: '$.user.name',
                    email: '$.user.profile.email'
                },
                conditions: ['$.active', true, '$.count']
            };
            const result = resolver.resolve(nodeConfig, testState);
            expect(result).toEqual({
                message: 'John Doe',
                logLevel: 'info',
                userData: {
                    name: 'Jane Smith',
                    email: 'jane@example.com'
                },
                conditions: [true, true, 42]
            });
        });
        test('should handle log node configuration as described in user request', () => {
            const logConfig = {
                message: '$.developer'
            };
            const result = resolver.resolve(logConfig, testState);
            expect(result).toEqual({
                message: 'John Doe'
            });
        });
        test('should handle complex workflow configuration', () => {
            const workflowConfig = {
                nodes: [
                    {
                        condition: {
                            field: '$.user.age',
                            operator: 'gte',
                            value: 18
                        }
                    },
                    {
                        notification: {
                            to: '$.user.profile.email',
                            subject: 'Welcome $.user.name',
                            body: 'Hello $.user.name, you have $.count notifications.'
                        }
                    }
                ]
            };
            const result = resolver.resolve(workflowConfig, testState);
            expect(result).toEqual({
                nodes: [
                    {
                        condition: {
                            field: 30,
                            operator: 'gte',
                            value: 18
                        }
                    },
                    {
                        notification: {
                            to: 'jane@example.com',
                            subject: 'Welcome $.user.name', // Not a valid pattern (mixed content)
                            body: 'Hello $.user.name, you have $.count notifications.' // Not a valid pattern (mixed content)
                        }
                    }
                ]
            });
        });
    });
});
