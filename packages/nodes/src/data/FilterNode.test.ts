import { describe, it, expect, beforeEach } from 'vitest';
import { FilterNode } from './FilterNode';
import type { ExecutionContext } from '@workscript/engine';

describe('FilterNode', () => {
  let node: FilterNode;
  let context: ExecutionContext;

  beforeEach(() => {
    node = new FilterNode();
    context = {
      state: {},
      inputs: {},
      workflowId: 'test-workflow',
      nodeId: 'filter-test',
      executionId: 'test-exec-123'
    };
  });

  describe('metadata', () => {
    it('should have correct metadata', () => {
      expect(node.metadata.id).toBe('filter');
      expect(node.metadata.name).toBe('Filter');
      expect(node.metadata.version).toBe('1.0.0');
    });

    it('should have ai_hints defined', () => {
      expect(node.metadata.ai_hints).toBeDefined();
      expect(node.metadata.ai_hints?.purpose).toBeDefined();
      expect(node.metadata.ai_hints?.expected_edges).toContain('passed');
      expect(node.metadata.ai_hints?.expected_edges).toContain('filtered');
    });
  });

  describe('validation', () => {
    it('should return error for missing items', async () => {
      const result = await node.execute(context, {
        conditions: [{ field: 'name', dataType: 'string', operation: 'equals', value: 'test' }]
      });

      expect(result.error).toBeDefined();
      const errorData = await result.error!(context);
      expect(errorData.error).toContain('Missing or invalid items');
    });

    it('should return error for invalid items type', async () => {
      const result = await node.execute(context, {
        items: 'not-an-array',
        conditions: [{ field: 'name', dataType: 'string', operation: 'equals', value: 'test' }]
      });

      expect(result.error).toBeDefined();
      const errorData = await result.error!(context);
      expect(errorData.error).toContain('Missing or invalid items');
    });

    it('should return error for missing conditions', async () => {
      const result = await node.execute(context, {
        items: [{ name: 'test' }]
      });

      expect(result.error).toBeDefined();
      const errorData = await result.error!(context);
      expect(errorData.error).toContain('Missing or invalid conditions');
    });

    it('should return error for invalid matchMode', async () => {
      const result = await node.execute(context, {
        items: [{ name: 'test' }],
        conditions: [{ field: 'name', dataType: 'string', operation: 'equals', value: 'test' }],
        matchMode: 'invalid' as any
      });

      expect(result.error).toBeDefined();
      const errorData = await result.error!(context);
      expect(errorData.error).toContain('Invalid matchMode');
    });
  });

  describe('string operations', () => {
    const items = [
      { name: 'Product A', description: 'Great product' },
      { name: 'Product B', description: 'Another great item' },
      { name: 'Item C', description: '' }
    ];

    it('should filter by string equals', async () => {
      const result = await node.execute(context, {
        items,
        conditions: [
          { field: 'name', dataType: 'string', operation: 'equals', value: 'Product A' }
        ],
        matchMode: 'all'
      });

      expect(result.passed).toBeDefined();
      const passedData = await result.passed!(context);
      expect(passedData.items).toHaveLength(1);
      expect(passedData.items[0].name).toBe('Product A');
    });

    it('should filter by string contains', async () => {
      const result = await node.execute(context, {
        items,
        conditions: [
          { field: 'name', dataType: 'string', operation: 'contains', value: 'Product' }
        ],
        matchMode: 'all'
      });

      expect(result.passed).toBeDefined();
      const passedData = await result.passed!(context);
      expect(passedData.items).toHaveLength(2);
    });

    it('should filter by string startsWith', async () => {
      const result = await node.execute(context, {
        items,
        conditions: [
          { field: 'name', dataType: 'string', operation: 'startsWith', value: 'Product' }
        ],
        matchMode: 'all'
      });

      expect(result.passed).toBeDefined();
      const passedData = await result.passed!(context);
      expect(passedData.items).toHaveLength(2);
    });

    it('should filter by string isEmpty', async () => {
      const result = await node.execute(context, {
        items,
        conditions: [
          { field: 'description', dataType: 'string', operation: 'isEmpty' }
        ],
        matchMode: 'all'
      });

      expect(result.passed).toBeDefined();
      const passedData = await result.passed!(context);
      expect(passedData.items).toHaveLength(1);
      expect(passedData.items[0].name).toBe('Item C');
    });

    it('should filter by regex', async () => {
      const result = await node.execute(context, {
        items,
        conditions: [
          { field: 'name', dataType: 'string', operation: 'regex', value: '^Product [AB]$' }
        ],
        matchMode: 'all'
      });

      expect(result.passed).toBeDefined();
      const passedData = await result.passed!(context);
      expect(passedData.items).toHaveLength(2);
    });
  });

  describe('number operations', () => {
    const items = [
      { name: 'Product A', price: 25.99, stock: 10 },
      { name: 'Product B', price: 15.50, stock: 0 },
      { name: 'Product C', price: 45.00, stock: 5 }
    ];

    it('should filter by number equals', async () => {
      const result = await node.execute(context, {
        items,
        conditions: [
          { field: 'stock', dataType: 'number', operation: 'equals', value: 0 }
        ],
        matchMode: 'all'
      });

      expect(result.passed).toBeDefined();
      const passedData = await result.passed!(context);
      expect(passedData.items).toHaveLength(1);
      expect(passedData.items[0].name).toBe('Product B');
    });

    it('should filter by number gt', async () => {
      const result = await node.execute(context, {
        items,
        conditions: [
          { field: 'price', dataType: 'number', operation: 'gt', value: 20 }
        ],
        matchMode: 'all'
      });

      expect(result.passed).toBeDefined();
      const passedData = await result.passed!(context);
      expect(passedData.items).toHaveLength(2);
    });

    it('should filter by number between', async () => {
      const result = await node.execute(context, {
        items,
        conditions: [
          { field: 'price', dataType: 'number', operation: 'between', value: 20, value2: 30 }
        ],
        matchMode: 'all'
      });

      expect(result.passed).toBeDefined();
      const passedData = await result.passed!(context);
      expect(passedData.items).toHaveLength(1);
      expect(passedData.items[0].name).toBe('Product A');
    });

    it('should filter by number lte', async () => {
      const result = await node.execute(context, {
        items,
        conditions: [
          { field: 'stock', dataType: 'number', operation: 'lte', value: 5 }
        ],
        matchMode: 'all'
      });

      expect(result.passed).toBeDefined();
      const passedData = await result.passed!(context);
      expect(passedData.items).toHaveLength(2);
    });
  });

  describe('boolean operations', () => {
    const items = [
      { name: 'Product A', active: true, featured: false },
      { name: 'Product B', active: false, featured: true },
      { name: 'Product C', active: true, featured: true }
    ];

    it('should filter by boolean true', async () => {
      const result = await node.execute(context, {
        items,
        conditions: [
          { field: 'active', dataType: 'boolean', operation: 'true' }
        ],
        matchMode: 'all'
      });

      expect(result.passed).toBeDefined();
      const passedData = await result.passed!(context);
      expect(passedData.items).toHaveLength(2);
    });

    it('should filter by boolean false', async () => {
      const result = await node.execute(context, {
        items,
        conditions: [
          { field: 'featured', dataType: 'boolean', operation: 'false' }
        ],
        matchMode: 'all'
      });

      expect(result.passed).toBeDefined();
      const passedData = await result.passed!(context);
      expect(passedData.items).toHaveLength(1);
      expect(passedData.items[0].name).toBe('Product A');
    });
  });

  describe('date operations', () => {
    const items = [
      { name: 'Event A', date: '2025-01-15T10:00:00Z' },
      { name: 'Event B', date: '2025-02-20T14:00:00Z' },
      { name: 'Event C', date: '2025-03-25T18:00:00Z' }
    ];

    it('should filter by date before', async () => {
      const result = await node.execute(context, {
        items,
        conditions: [
          { field: 'date', dataType: 'date', operation: 'before', value: '2025-02-01T00:00:00Z' }
        ],
        matchMode: 'all'
      });

      expect(result.passed).toBeDefined();
      const passedData = await result.passed!(context);
      expect(passedData.items).toHaveLength(1);
      expect(passedData.items[0].name).toBe('Event A');
    });

    it('should filter by date after', async () => {
      const result = await node.execute(context, {
        items,
        conditions: [
          { field: 'date', dataType: 'date', operation: 'after', value: '2025-02-01T00:00:00Z' }
        ],
        matchMode: 'all'
      });

      expect(result.passed).toBeDefined();
      const passedData = await result.passed!(context);
      expect(passedData.items).toHaveLength(2);
    });

    it('should filter by date between', async () => {
      const result = await node.execute(context, {
        items,
        conditions: [
          {
            field: 'date',
            dataType: 'date',
            operation: 'between',
            value: '2025-02-01T00:00:00Z',
            value2: '2025-03-01T00:00:00Z'
          }
        ],
        matchMode: 'all'
      });

      expect(result.passed).toBeDefined();
      const passedData = await result.passed!(context);
      expect(passedData.items).toHaveLength(1);
      expect(passedData.items[0].name).toBe('Event B');
    });
  });

  describe('array operations', () => {
    const items = [
      { name: 'Product A', tags: ['electronics', 'featured'] },
      { name: 'Product B', tags: ['books', 'bestseller'] },
      { name: 'Product C', tags: [] }
    ];

    it('should filter by array contains', async () => {
      const result = await node.execute(context, {
        items,
        conditions: [
          { field: 'tags', dataType: 'array', operation: 'contains', value: 'featured' }
        ],
        matchMode: 'all'
      });

      expect(result.passed).toBeDefined();
      const passedData = await result.passed!(context);
      expect(passedData.items).toHaveLength(1);
      expect(passedData.items[0].name).toBe('Product A');
    });

    it('should filter by array isEmpty', async () => {
      const result = await node.execute(context, {
        items,
        conditions: [
          { field: 'tags', dataType: 'array', operation: 'isEmpty' }
        ],
        matchMode: 'all'
      });

      expect(result.passed).toBeDefined();
      const passedData = await result.passed!(context);
      expect(passedData.items).toHaveLength(1);
      expect(passedData.items[0].name).toBe('Product C');
    });
  });

  describe('object operations', () => {
    const items = [
      { name: 'User A', metadata: { role: 'admin' } },
      { name: 'User B', metadata: {} },
      { name: 'User C', metadata: null }
    ];

    it('should filter by object isNotEmpty', async () => {
      const result = await node.execute(context, {
        items,
        conditions: [
          { field: 'metadata', dataType: 'object', operation: 'isNotEmpty' }
        ],
        matchMode: 'all'
      });

      expect(result.passed).toBeDefined();
      const passedData = await result.passed!(context);
      expect(passedData.items).toHaveLength(1);
      expect(passedData.items[0].name).toBe('User A');
    });

    it('should filter by object isEmpty', async () => {
      const result = await node.execute(context, {
        items,
        conditions: [
          { field: 'metadata', dataType: 'object', operation: 'isEmpty' }
        ],
        matchMode: 'all'
      });

      expect(result.passed).toBeDefined();
      const passedData = await result.passed!(context);
      expect(passedData.items).toHaveLength(2);
    });
  });

  describe('multiple conditions', () => {
    const items = [
      { name: 'Product A', price: 25.99, inStock: true, category: 'Electronics' },
      { name: 'Product B', price: 15.50, inStock: false, category: 'Books' },
      { name: 'Product C', price: 45.00, inStock: true, category: 'Electronics' }
    ];

    it('should filter with ALL matchMode (AND logic)', async () => {
      const result = await node.execute(context, {
        items,
        conditions: [
          { field: 'price', dataType: 'number', operation: 'gt', value: 20 },
          { field: 'inStock', dataType: 'boolean', operation: 'true' },
          { field: 'category', dataType: 'string', operation: 'equals', value: 'Electronics' }
        ],
        matchMode: 'all'
      });

      expect(result.passed).toBeDefined();
      const passedData = await result.passed!(context);
      expect(passedData.items).toHaveLength(2);
      expect(passedData.items.every((item: any) => item.category === 'Electronics')).toBe(true);
    });

    it('should filter with ANY matchMode (OR logic)', async () => {
      const result = await node.execute(context, {
        items,
        conditions: [
          { field: 'price', dataType: 'number', operation: 'lt', value: 20 },
          { field: 'category', dataType: 'string', operation: 'equals', value: 'Books' }
        ],
        matchMode: 'any'
      });

      expect(result.passed).toBeDefined();
      const passedData = await result.passed!(context);
      expect(passedData.items).toHaveLength(1);
      expect(passedData.items[0].name).toBe('Product B');
    });
  });

  describe('nested field access', () => {
    const items = [
      { name: 'User A', profile: { settings: { theme: 'dark' } } },
      { name: 'User B', profile: { settings: { theme: 'light' } } },
      { name: 'User C', profile: { settings: { theme: 'dark' } } }
    ];

    it('should filter by nested field using dot notation', async () => {
      const result = await node.execute(context, {
        items,
        conditions: [
          { field: 'profile.settings.theme', dataType: 'string', operation: 'equals', value: 'dark' }
        ],
        matchMode: 'all'
      });

      expect(result.passed).toBeDefined();
      const passedData = await result.passed!(context);
      expect(passedData.items).toHaveLength(2);
    });
  });

  describe('state management', () => {
    const items = [
      { name: 'Product A', price: 25 },
      { name: 'Product B', price: 15 }
    ];

    it('should store filtered results in state', async () => {
      await node.execute(context, {
        items,
        conditions: [
          { field: 'price', dataType: 'number', operation: 'gt', value: 20 }
        ],
        matchMode: 'all'
      });

      expect(context.state.filterPassed).toBeDefined();
      expect(context.state.filterPassed).toHaveLength(1);
      expect(context.state.filterFiltered).toBeDefined();
      expect(context.state.filterFiltered).toHaveLength(1);
      expect(context.state.filterStats).toBeDefined();
      expect(context.state.filterStats.passedCount).toBe(1);
      expect(context.state.filterStats.filteredCount).toBe(1);
      expect(context.state.filterStats.totalCount).toBe(2);
    });
  });

  describe('edge routing', () => {
    it('should return both passed and filtered edges', async () => {
      const items = [{ value: 10 }, { value: 20 }];
      const result = await node.execute(context, {
        items,
        conditions: [
          { field: 'value', dataType: 'number', operation: 'gt', value: 15 }
        ],
        matchMode: 'all'
      });

      expect(result.passed).toBeDefined();
      expect(result.filtered).toBeDefined();

      const passedData = await result.passed!(context);
      expect(passedData.items).toHaveLength(1);

      const filteredData = await result.filtered!(context);
      expect(filteredData.items).toHaveLength(1);
    });
  });
});
