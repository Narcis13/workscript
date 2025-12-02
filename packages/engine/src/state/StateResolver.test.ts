/**
 * Tests for StateResolver - State reference resolution functionality
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { StateResolver, StateResolverError } from './StateResolver';

describe('StateResolver', () => {
  let resolver: StateResolver;
  let testState: Record<string, any>;

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

  describe('Template interpolation {{$.path}}', () => {
    describe('Basic template tests', () => {
      test('should interpolate single template in string', () => {
        const config = 'Hello {{$.user.name}}!';
        const result = resolver.resolve(config, testState);
        expect(result).toBe('Hello Jane Smith!');
      });

      test('should interpolate multiple templates in string', () => {
        const config = 'Hello {{$.user.name}}, your score is {{$.count}}!';
        const result = resolver.resolve(config, testState);
        expect(result).toBe('Hello Jane Smith, your score is 42!');
      });

      test('should handle deeply nested paths in templates', () => {
        const config = 'Email: {{$.user.profile.email}}';
        const result = resolver.resolve(config, testState);
        expect(result).toBe('Email: jane@example.com');
      });
    });

    describe('Missing key tests', () => {
      test('should replace missing keys with empty string (silent)', () => {
        const config = 'Value: {{$.nonexistent}}';
        const result = resolver.resolve(config, testState);
        expect(result).toBe('Value: ');
      });

      test('should handle null values as empty string', () => {
        const config = 'Value: {{$.nullValue}}';
        const result = resolver.resolve(config, testState);
        expect(result).toBe('Value: ');
      });

      test('should handle undefined values as empty string', () => {
        const config = 'Value: {{$.undefinedValue}}';
        const result = resolver.resolve(config, testState);
        expect(result).toBe('Value: ');
      });
    });

    describe('Complex value tests', () => {
      test('should stringify objects in templates', () => {
        const config = 'User data: {{$.user}}';
        const result = resolver.resolve(config, testState);
        expect(result).toContain('"name"');
        expect(result).toContain('Jane Smith');
      });

      test('should stringify arrays in templates', () => {
        const config = 'Items: {{$.list}}';
        const result = resolver.resolve(config, testState);
        expect(result).toBe('Items: ["item1","item2","item3"]');
      });
    });

    describe('Backward compatibility tests', () => {
      test('should preserve full $.path pattern behavior - numbers', () => {
        const numConfig = '$.count';
        const numResult = resolver.resolve(numConfig, testState);
        expect(numResult).toBe(42);
        expect(typeof numResult).toBe('number');
      });

      test('should preserve full $.path pattern behavior - booleans', () => {
        const boolConfig = '$.active';
        const boolResult = resolver.resolve(boolConfig, testState);
        expect(boolResult).toBe(true);
        expect(typeof boolResult).toBe('boolean');
      });

      test('should preserve full $.path pattern behavior - objects', () => {
        const objConfig = '$.user';
        const objResult = resolver.resolve(objConfig, testState);
        expect(typeof objResult).toBe('object');
        expect(objResult.name).toBe('Jane Smith');
      });
    });

    describe('Pattern validation tests', () => {
      test('should NOT match template pattern without $. prefix', () => {
        const config = 'Hello {{user.name}}!';
        const result = resolver.resolve(config, testState);
        expect(result).toBe('Hello {{user.name}}!'); // Unchanged
      });

      test('should NOT match JS template literal syntax', () => {
        const config = 'Hello ${$.user.name}!';
        const result = resolver.resolve(config, testState);
        expect(result).toBe('Hello ${$.user.name}!'); // Unchanged
      });
    });

    describe('Nested config tests', () => {
      test('should work with templates in nested objects', () => {
        const config = {
          message: 'Hello {{$.user.name}}!',
          nested: {
            greeting: 'Welcome {{$.developer}}'
          }
        };
        const result = resolver.resolve(config, testState);
        expect(result).toEqual({
          message: 'Hello Jane Smith!',
          nested: {
            greeting: 'Welcome John Doe'
          }
        });
      });

      test('should work with templates in arrays', () => {
        const config = [
          'Hello {{$.developer}}',
          'Email: {{$.user.profile.email}}'
        ];
        const result = resolver.resolve(config, testState);
        expect(result).toEqual([
          'Hello John Doe',
          'Email: jane@example.com'
        ]);
      });
    });

    describe('Static helper methods for templates', () => {
      test('containsTemplate should detect template patterns', () => {
        expect(StateResolver.containsTemplate('Hello {{$.name}}')).toBe(true);
        expect(StateResolver.containsTemplate('No templates here')).toBe(false);
        expect(StateResolver.containsTemplate('$.path')).toBe(false);
        expect(StateResolver.containsTemplate('{{name}}')).toBe(false);
      });

      test('extractTemplatePaths should return all paths', () => {
        const paths = StateResolver.extractTemplatePaths('{{$.user.name}} and {{$.score}}');
        expect(paths).toEqual(['user.name', 'score']);
      });

      test('extractTemplatePaths should return empty array for no templates', () => {
        const paths = StateResolver.extractTemplatePaths('No templates');
        expect(paths).toEqual([]);
      });
    });

    describe('Edge case tests', () => {
      test('should handle adjacent templates', () => {
        const config = '{{$.developer}}{{$.user.name}}';
        const result = resolver.resolve(config, testState);
        expect(result).toBe('John DoeJane Smith');
      });

      test('should handle mixed content with multiple templates', () => {
        const config = 'User {{$.user.name}} (count: {{$.count}}) - {{$.developer}}';
        const result = resolver.resolve(config, testState);
        expect(result).toBe('User Jane Smith (count: 42) - John Doe');
      });

      test('should handle same template multiple times', () => {
        const config = '{{$.user.name}} loves {{$.user.name}}';
        const result = resolver.resolve(config, testState);
        expect(result).toBe('Jane Smith loves Jane Smith');
      });
    });
  });
});