import { ClientWorkflowService } from './services/ClientWorkflowService';
/**
 * Quick test to validate node discovery is working correctly
 * Run this in the browser console to test
 */
async function testNodeDiscovery() {
    try {
        console.log('🧪 Testing ClientWorkflowService node discovery...');
        const service = await ClientWorkflowService.getInstance();
        const info = service.getServiceInfo();
        console.log('📊 Service Info:', info);
        console.log('🔧 Available nodes:', service.getAvailableNodes().map(n => n.id));
        console.log('🌐 Universal nodes:', service.getNodesBySource('universal').map(n => n.id));
        console.log('💻 Client nodes:', service.getNodesBySource('client').map(n => n.id));
        // Test specific node checks
        console.log('✅ Has fetch node:', service.hasNode('fetch'));
        console.log('✅ Has localStorage node:', service.hasNode('localStorage'));
        console.log('✅ Has log-input node:', service.hasNode('log-input'));
        console.log('✅ Has math node:', service.hasNode('math'));
        return info;
    }
    catch (error) {
        console.error('❌ Node discovery test failed:', error);
        throw error;
    }
}
// Export for browser console usage
// eslint-disable-next-line @typescript-eslint/no-explicit-any
globalThis.testNodeDiscovery = testNodeDiscovery;
export { testNodeDiscovery };
