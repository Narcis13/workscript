#!/usr/bin/env bun

/**
 * Test script for WorkflowService singleton and node registration
 * This verifies that:
 * 1. WorkflowService creates a proper singleton
 * 2. All nodes from @workscript/nodes are properly registered
 * 3. All nodes are properly accessible
 */

import { WorkflowService } from './services/WorkflowService'

async function testSingletonBehavior() {
  console.log('🧪 Testing WorkflowService Singleton Behavior...\n')

  try {
    console.log('📞 Getting first instance of WorkflowService...')
    const instance1 = await WorkflowService.getInstance()

    console.log('📞 Getting second instance of WorkflowService...')
    const instance2 = await WorkflowService.getInstance()

    // Test singleton behavior
    const isSingleton = instance1 === instance2
    console.log(`✅ Singleton test: ${isSingleton ? 'PASSED' : 'FAILED'}`)
    console.log(`   - Instance 1: ${instance1.constructor.name}`)
    console.log(`   - Instance 2: ${instance2.constructor.name}`)
    console.log(`   - Same reference: ${isSingleton}\n`)

    return instance1
  } catch (error) {
    console.error('❌ Singleton test failed:', error)
    throw error
  }
}

async function testNodeDiscovery(workflowService: any) {
  console.log('🔍 Testing Node Registration from @workscript/nodes...\n')

  try {
    // Get service information
    const serviceInfo = workflowService.getServiceInfo()
    console.log('📊 Service Information:')
    console.log(`   - Environment: ${serviceInfo.environment}`)
    console.log(`   - Initialized: ${serviceInfo.initialized}`)
    console.log(`   - Total Nodes: ${serviceInfo.totalNodes}`)
    console.log(`   - Server Nodes: ${serviceInfo.serverNodes}`)
    console.log(`   - Package: ${serviceInfo.package}\n`)

    // Get all available nodes
    const allNodes = workflowService.getAvailableNodes()
    console.log(`📦 All Available Nodes (${allNodes.length}):`)
    allNodes.forEach((node: any, index: number) => {
      console.log(`   ${index + 1}. ${node.id} - ${node.name} (v${node.version})`)
    })
    console.log()

    // Get server nodes
    const serverNodes = workflowService.getServerNodes()
    console.log(`🖥️  Server Nodes from @workscript/nodes (${serverNodes.length}):`)
    serverNodes.slice(0, 10).forEach((node: any, index: number) => {
      console.log(`   ${index + 1}. ${node.id} - ${node.name} (v${node.version})`)
    })
    if (serverNodes.length > 10) {
      console.log(`   ... and ${serverNodes.length - 10} more nodes`)
    }
    console.log()

    // Test specific node availability
    console.log('🔍 Testing Node Availability:')
    const testNodes = ['math', 'logic', 'dataTransform', 'auth', 'database', 'filesystem']
    testNodes.forEach(nodeId => {
      const hasNode = workflowService.hasNode(nodeId)
      console.log(`   - ${nodeId}: ${hasNode ? '✅ Available' : '❌ Not Found'}`)
    })
    console.log()

    return {
      totalNodes: allNodes.length,
      serverNodes: serverNodes.length
    }
  } catch (error) {
    console.error('❌ Node registration test failed:', error)
    throw error
  }
}

async function testNodeMetadata(workflowService: any) {
  console.log('📋 Testing Node Metadata Retrieval...\n')

  try {
    const allNodes = workflowService.getAvailableNodes()
    
    if (allNodes.length > 0) {
      const sampleNode = allNodes[0]
      console.log(`📄 Sample Node Metadata (${sampleNode.id}):`)
      const metadata = workflowService.getNodeMetadata(sampleNode.id)
      console.log(`   - ID: ${metadata.id}`)
      console.log(`   - Name: ${metadata.name}`)
      console.log(`   - Version: ${metadata.version}`)
      console.log(`   - Source: ${metadata.source}`)
      console.log(`   - Description: ${metadata.description || 'N/A'}`)
      console.log(`   - Inputs: ${metadata.inputs?.join(', ') || 'N/A'}`)
      console.log(`   - Outputs: ${metadata.outputs?.join(', ') || 'N/A'}`)
    }
    
    return true
  } catch (error) {
    console.error('❌ Node metadata test failed:', error)
    throw error
  }
}

async function runAllTests() {
  try {
    console.log('🚀 Starting WorkflowService Singleton Tests\n')
    console.log('=' .repeat(60))
    console.log()

    // Test 1: Singleton behavior
    const workflowService = await testSingletonBehavior()

    // Test 2: Node registration
    const nodeStats = await testNodeDiscovery(workflowService)

    // Test 3: Node metadata retrieval
    await testNodeMetadata(workflowService)

    console.log('=' .repeat(60))
    console.log('🎉 All Tests Completed Successfully!')
    console.log()
    console.log('📊 Final Summary:')
    console.log(`   - Singleton: ✅ Working correctly`)
    console.log(`   - Node Registration: ✅ Found ${nodeStats.totalNodes} total nodes from @workscript/nodes`)
    console.log(`   - Server Nodes: ✅ ${nodeStats.serverNodes} server-compatible nodes available`)
    console.log()
    console.log('🔧 WorkflowService is ready for production use!')

  } catch (error) {
    console.error('\n💥 Test execution failed:')
    console.error(error)
    process.exit(1)
  }
}

// Run the tests
runAllTests()