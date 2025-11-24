/**
 * Test script to verify nodes can be imported from @workscript/nodes package
 * This tests the consolidated package exports without dynamic discovery
 *
 * Run with: bun run test-node-import.ts
 */

import { ALL_NODES, getNodeCount, getAllNodes } from '@workscript/nodes';
import { NodeRegistry } from '@workscript/engine';

async function testNodeImport() {
  console.log('🧪 Testing Node Import from @workscript/nodes\n');
  console.log('=' .repeat(60));

  console.log('\n📦 Importing ALL_NODES array from @workscript/nodes...\n');

  try {
    // Check if ALL_NODES is defined and is an array
    if (!ALL_NODES || !Array.isArray(ALL_NODES)) {
      throw new Error('ALL_NODES is not defined or is not an array');
    }

    const nodeCount = getNodeCount();
    console.log(`✅ Successfully imported ALL_NODES array`);
    console.log(`📊 Node count: ${nodeCount} nodes\n`);

    // Register all nodes with the registry
    console.log('📝 Registering all nodes with NodeRegistry...\n');
    const registry = new NodeRegistry();

    for (const NodeClass of ALL_NODES) {
      await registry.register(NodeClass, { source: 'server' });
    }

    const registeredCount = registry.size;
    console.log(`✅ Successfully registered ${registeredCount} nodes\n`);

    // List all nodes
    console.log('=' .repeat(60));
    console.log(`\n📋 Registered Nodes:\n`);

    const nodes = registry.listNodes();
    nodes.forEach((node, index) => {
      console.log(`   ${(index + 1).toString().padStart(2, ' ')}. ${node.id.padEnd(25)} - ${node.name}`);
    });

    console.log('\n' + '='.repeat(60));

    // Verify expected node count
    if (registeredCount < 35) {
      console.log('\n⚠️  WARNING: Expected 35+ nodes, but registered', registeredCount);
      console.log('   This may indicate missing nodes from the migration.');
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed!');
      console.log(`   Successfully imported and registered ${registeredCount} nodes from @workscript/nodes package.`);
      console.log('   The consolidated package structure is working correctly!');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n❌ Node import failed:', error);
    console.error('\nError details:', error instanceof Error ? error.stack : error);
    process.exit(1);
  }
}

// Run the test
testNodeImport();
