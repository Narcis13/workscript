#!/usr/bin/env bun
/**
 * Test script to verify node discovery in development environment
 * Task 4.2.2: Test development environment with source files (.ts)
 */

import { NodeRegistry } from './src/registry/NodeRegistry';

async function testDiscovery() {
  console.log('🔍 Testing NodeRegistry Discovery in Development Environment\n');

  const registry = new NodeRegistry();

  console.log('📦 Discovering nodes from /packages/nodes/...');
  const startTime = performance.now();

  try {
    await registry.discoverFromPackages();
    const endTime = performance.now();
    const discoveryTime = endTime - startTime;

    console.log(`✅ Discovery completed in ${discoveryTime.toFixed(2)}ms\n`);

    const allNodes = registry.listNodes();
    console.log(`📊 Total nodes discovered: ${allNodes.length}`);
    console.log(`   Target: 36+ nodes (6 core + 21 data + 3 server + 6 custom)\n`);

    // Group nodes by category based on their location/type
    const coreNodes = allNodes.filter(n =>
      ['math', 'logic', 'data-transform', '__state_setter__', 'empty', 'log'].includes(n.id)
    );
    const dataNodes = allNodes.filter(n =>
      n.id.includes('filter') || n.id.includes('sort') || n.id.includes('aggregate') ||
      n.id.includes('summarize') || n.id.includes('limit') || n.id.includes('split') ||
      n.id.includes('duplicate') || n.id.includes('edit') || n.id.includes('transform') ||
      n.id.includes('json') || n.id.includes('compare') || n.id.includes('switch') ||
      n.id.includes('array') || n.id.includes('object') || n.id.includes('string') ||
      n.id.includes('date') || n.id.includes('validate') || n.id.includes('calculate') ||
      n.id.includes('math-operations')
    );
    const serverNodes = allNodes.filter(n =>
      ['filesystem', 'database', 'auth'].includes(n.id)
    );
    const customNodes = allNodes.filter(n =>
      n.id.includes('gmail') || n.id.includes('google') || n.id.includes('zoca')
    );

    console.log('📋 Node breakdown:');
    console.log(`   Core nodes: ${coreNodes.length}`);
    console.log(`   Data manipulation nodes: ${dataNodes.length}`);
    console.log(`   Server nodes: ${serverNodes.length}`);
    console.log(`   Custom integration nodes: ${customNodes.length}\n`);

    console.log('📝 All discovered nodes:');
    allNodes.forEach((node, index) => {
      console.log(`   ${index + 1}. ${node.id} (${node.name}) - v${node.version} [${node.source}]`);
    });

    console.log('\n✅ Discovery test completed successfully!');

    // Verify performance requirement: < 1 second
    if (discoveryTime > 1000) {
      console.warn(`⚠️  Warning: Discovery time ${discoveryTime.toFixed(2)}ms exceeds 1 second target`);
    } else {
      console.log(`✅ Performance: Discovery time is within 1 second target (${discoveryTime.toFixed(2)}ms)`);
    }

  } catch (error) {
    console.error('❌ Discovery failed:', error);
    process.exit(1);
  }
}

testDiscovery();
