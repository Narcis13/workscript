/**
 * Test script to verify node discovery works correctly
 * after migration to @workscript/nodes package
 *
 * Run with: bun run test-node-discovery.ts
 */

import { NodeRegistry } from '@workscript/engine';

async function testNodeDiscovery() {
  console.log('🧪 Testing Node Discovery\n');
  console.log('=' .repeat(60));

  const registry = new NodeRegistry();

  console.log('\n📦 Discovering nodes from @workscript/nodes package...\n');

  const startTime = performance.now();

  try {
    await registry.discoverFromPackages();

    const endTime = performance.now();
    const discoveryTime = (endTime - startTime).toFixed(2);

    // Get node counts
    const totalNodes = registry.size;
    const serverNodes = registry.listNodesBySource('server');

    console.log('✅ Node discovery completed successfully!\n');
    console.log('=' .repeat(60));
    console.log(`\n📊 Discovery Statistics:`);
    console.log(`   - Total nodes discovered: ${totalNodes}`);
    console.log(`   - Server nodes: ${serverNodes.length}`);
    console.log(`   - Discovery time: ${discoveryTime}ms`);
    console.log(`   - Performance: ${discoveryTime < 1000 ? '✅ PASS' : '❌ FAIL'} (target: < 1000ms)`);

    // List all discovered nodes
    console.log(`\n📋 Discovered Nodes:\n`);

    serverNodes.forEach((nodeId, index) => {
      const node = registry.get(nodeId);
      if (node) {
        console.log(`   ${(index + 1).toString().padStart(2, ' ')}. ${nodeId.padEnd(25)} - ${node.metadata.name}`);
      }
    });

    console.log('\n' + '='.repeat(60));

    // Verify expected node count (should be 35+ nodes after migration)
    if (totalNodes < 35) {
      console.log('\n⚠️  WARNING: Expected 35+ nodes, but found', totalNodes);
      console.log('   This may indicate missing nodes from the migration.');
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed!');
      console.log('   Node discovery is working correctly with @workscript/nodes package.');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n❌ Node discovery failed:', error);
    console.error('\nError details:', error instanceof Error ? error.stack : error);
    process.exit(1);
  }
}

// Run the test
testNodeDiscovery();
