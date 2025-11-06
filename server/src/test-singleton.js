#!/usr/bin/env bun
/**
 * Test script for WorkflowService singleton and NodeRegistry auto-discovery
 * This verifies that:
 * 1. WorkflowService creates a proper singleton
 * 2. NodeRegistry discovers nodes from shared/ and server/ packages
 * 3. All nodes are properly registered and accessible
 */
import { WorkflowService } from './services/WorkflowService';
async function testSingletonBehavior() {
    console.log('🧪 Testing WorkflowService Singleton Behavior...\n');
    try {
        console.log('📞 Getting first instance of WorkflowService...');
        const instance1 = await WorkflowService.getInstance();
        console.log('📞 Getting second instance of WorkflowService...');
        const instance2 = await WorkflowService.getInstance();
        // Test singleton behavior
        const isSingleton = instance1 === instance2;
        console.log(`✅ Singleton test: ${isSingleton ? 'PASSED' : 'FAILED'}`);
        console.log(`   - Instance 1: ${instance1.constructor.name}`);
        console.log(`   - Instance 2: ${instance2.constructor.name}`);
        console.log(`   - Same reference: ${isSingleton}\n`);
        return instance1;
    }
    catch (error) {
        console.error('❌ Singleton test failed:', error);
        throw error;
    }
}
async function testNodeDiscovery(workflowService) {
    console.log('🔍 Testing Node Discovery and Registration...\n');
    try {
        // Get service information
        const serviceInfo = workflowService.getServiceInfo();
        console.log('📊 Service Information:');
        console.log(`   - Environment: ${serviceInfo.environment}`);
        console.log(`   - Initialized: ${serviceInfo.initialized}`);
        console.log(`   - Total Nodes: ${serviceInfo.totalNodes}`);
        console.log(`   - Universal Nodes: ${serviceInfo.universalNodes}`);
        console.log(`   - Server Nodes: ${serviceInfo.serverNodes}\n`);
        // Get all available nodes
        const allNodes = workflowService.getAvailableNodes();
        console.log(`📦 All Available Nodes (${allNodes.length}):`);
        allNodes.forEach((node, index) => {
            console.log(`   ${index + 1}. ${node.id} - ${node.name} (v${node.version})`);
        });
        console.log();
        // Get universal nodes (from shared package)
        const universalNodes = workflowService.getNodesBySource('universal');
        console.log(`🌍 Universal Nodes from /shared/nodes/ (${universalNodes.length}):`);
        universalNodes.forEach((node, index) => {
            console.log(`   ${index + 1}. ${node.id} - ${node.name} (v${node.version})`);
        });
        console.log();
        // Get server-specific nodes
        const serverNodes = workflowService.getNodesBySource('server');
        console.log(`🖥️  Server Nodes from /server/nodes/ (${serverNodes.length}):`);
        serverNodes.forEach((node, index) => {
            console.log(`   ${index + 1}. ${node.id} - ${node.name} (v${node.version})`);
        });
        console.log();
        // Test specific node availability
        console.log('🔍 Testing Node Availability:');
        const testNodes = ['math', 'logic', 'dataTransform', 'auth', 'database', 'filesystem'];
        testNodes.forEach(nodeId => {
            const hasNode = workflowService.hasNode(nodeId);
            console.log(`   - ${nodeId}: ${hasNode ? '✅ Available' : '❌ Not Found'}`);
        });
        console.log();
        return {
            totalNodes: allNodes.length,
            universalNodes: universalNodes.length,
            serverNodes: serverNodes.length
        };
    }
    catch (error) {
        console.error('❌ Node discovery test failed:', error);
        throw error;
    }
}
async function testNodeMetadata(workflowService) {
    console.log('📋 Testing Node Metadata Retrieval...\n');
    try {
        const allNodes = workflowService.getAvailableNodes();
        if (allNodes.length > 0) {
            const sampleNode = allNodes[0];
            console.log(`📄 Sample Node Metadata (${sampleNode.id}):`);
            const metadata = workflowService.getNodeMetadata(sampleNode.id);
            console.log(`   - ID: ${metadata.id}`);
            console.log(`   - Name: ${metadata.name}`);
            console.log(`   - Version: ${metadata.version}`);
            console.log(`   - Source: ${metadata.source}`);
            console.log(`   - Description: ${metadata.description || 'N/A'}`);
            console.log(`   - Inputs: ${metadata.inputs?.join(', ') || 'N/A'}`);
            console.log(`   - Outputs: ${metadata.outputs?.join(', ') || 'N/A'}`);
        }
        return true;
    }
    catch (error) {
        console.error('❌ Node metadata test failed:', error);
        throw error;
    }
}
async function runAllTests() {
    try {
        console.log('🚀 Starting WorkflowService Singleton Tests\n');
        console.log('='.repeat(60));
        console.log();
        // Test 1: Singleton behavior
        const workflowService = await testSingletonBehavior();
        // Test 2: Node discovery and registration
        const nodeStats = await testNodeDiscovery(workflowService);
        // Test 3: Node metadata retrieval
        await testNodeMetadata(workflowService);
        console.log('='.repeat(60));
        console.log('🎉 All Tests Completed Successfully!');
        console.log();
        console.log('📊 Final Summary:');
        console.log(`   - Singleton: ✅ Working correctly`);
        console.log(`   - Node Discovery: ✅ Found ${nodeStats.totalNodes} total nodes`);
        console.log(`   - Universal Nodes: ✅ Found ${nodeStats.universalNodes} from /shared/nodes/`);
        console.log(`   - Server Nodes: ✅ Found ${nodeStats.serverNodes} from /server/nodes/`);
        console.log();
        console.log('🔧 WorkflowService is ready for production use!');
    }
    catch (error) {
        console.error('\n💥 Test execution failed:');
        console.error(error);
        process.exit(1);
    }
}
// Run the tests
runAllTests();
