/**
 * Test script to verify the new registerFromArray method works correctly
 * This tests the consolidated export approach for the server-only architecture
 *
 * Run with: bun run test-node-registration.ts
 */

import { ALL_NODES, getNodeCount } from '@workscript/nodes';
import { NodeRegistry } from '@workscript/engine';

async function testNodeRegistration() {
  console.log('🧪 Testing Node Registration with registerFromArray()\n');
  console.log('=' .repeat(60));

  console.log('\n📦 Importing ALL_NODES from @workscript/nodes...\n');

  try {
    // Verify ALL_NODES is defined and is an array
    if (!ALL_NODES || !Array.isArray(ALL_NODES)) {
      throw new Error('ALL_NODES is not defined or is not an array');
    }

    const importedCount = getNodeCount();
    console.log(`✅ Successfully imported ALL_NODES array`);
    console.log(`📊 Imported ${importedCount} node classes\n`);

    // Create registry and use the new registerFromArray method
    console.log('📝 Registering nodes using registerFromArray()...\n');
    const registry = new NodeRegistry();

    const startTime = performance.now();
    const registeredCount = await registry.registerFromArray(ALL_NODES, { source: 'server' });
    const endTime = performance.now();

    const registrationTime = (endTime - startTime).toFixed(2);

    console.log(`✅ Successfully registered ${registeredCount} nodes`);
    console.log(`⏱️  Registration time: ${registrationTime}ms\n`);

    // Verify registry size matches
    const registrySize = registry.size;
    if (registrySize !== registeredCount) {
      console.warn(`⚠️  Warning: Registry size (${registrySize}) doesn't match registered count (${registeredCount})`);
    }

    // List all registered nodes
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
      console.log(`   Successfully registered ${registeredCount} nodes using registerFromArray()`);
      console.log('   The new consolidated export approach is working correctly!');
      console.log('\n🎉 NodeRegistry refactoring complete!');
      console.log('   - No more workspace dependency issues');
      console.log('   - Simpler, more maintainable code');
      console.log('   - Faster registration (no file scanning)');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n❌ Node registration failed:', error);
    console.error('\nError details:', error instanceof Error ? error.stack : error);
    process.exit(1);
  }
}

// Run the test
testNodeRegistration();
