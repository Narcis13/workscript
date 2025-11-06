// UI Workflow Security Validation Framework
// Default security configuration for AI-generated UI workflows
export const DEFAULT_UI_SECURITY_CONFIG = {
    allowedComponents: new Set([
        'Dashboard', 'TaskList', 'TaskForm', 'Chart', 'DataTable',
        'Button', 'Input', 'Select', 'Card', 'Modal', 'Container',
        'Form', 'List', 'Grid', 'Tabs', 'Accordion', 'Progress',
        'FileUpload', 'DatePicker', 'NumberInput', 'TextArea',
        'Checkbox', 'Radio', 'Switch', 'Slider', 'Badge', 'Alert'
    ]),
    allowedActions: new Set([
        'localStorage', 'sessionStorage', 'fetch', 'formSubmit',
        'dataTransform', 'validation', 'notification', 'navigate',
        'sort', 'filter', 'search', 'export', 'import', 'save',
        'load', 'create', 'update', 'delete', 'view', 'edit'
    ]),
    maxComplexity: 50, // Maximum number of nodes in a workflow
    allowExternalData: false // Restrict external API calls
};
// Security patterns to detect potentially malicious content
const DANGEROUS_PATTERNS = [
    // Code execution patterns
    { pattern: /eval\s*\(/, severity: 'high', message: 'Code execution via eval() detected' },
    { pattern: /Function\s*\(/, severity: 'high', message: 'Dynamic function creation detected' },
    { pattern: /setTimeout\s*\(/, severity: 'medium', message: 'Timed execution detected' },
    { pattern: /setInterval\s*\(/, severity: 'medium', message: 'Interval execution detected' },
    // Data access patterns
    { pattern: /document\.cookie/, severity: 'high', message: 'Cookie access detected' },
    { pattern: /window\.location/, severity: 'medium', message: 'Location access detected' },
    { pattern: /localStorage\.setItem.*password/i, severity: 'high', message: 'Sensitive data storage detected' },
    // External URL patterns
    { pattern: /https?:\/\/(?!localhost|127\.0\.0\.1)/, severity: 'medium', message: 'External URL detected' },
    { pattern: /fetch\s*\(\s*['"]\w+:\/\//, severity: 'high', message: 'External API call detected' },
    // Script injection patterns
    { pattern: /<script/i, severity: 'high', message: 'Script tag detected' },
    { pattern: /javascript:/i, severity: 'high', message: 'JavaScript protocol detected' },
    { pattern: /on\w+\s*=/i, severity: 'medium', message: 'Inline event handler detected' },
    // File system patterns
    { pattern: /\.\.\//, severity: 'medium', message: 'Path traversal pattern detected' },
    { pattern: /\/etc\/|\/var\/|\/tmp\//, severity: 'medium', message: 'System path access detected' }
];
export class UIWorkflowSecurityValidator {
    config;
    constructor(config = {}) {
        this.config = {
            ...DEFAULT_UI_SECURITY_CONFIG,
            ...config,
            // Merge Sets properly
            allowedComponents: new Set([
                ...DEFAULT_UI_SECURITY_CONFIG.allowedComponents,
                ...(config.allowedComponents || [])
            ]),
            allowedActions: new Set([
                ...DEFAULT_UI_SECURITY_CONFIG.allowedActions,
                ...(config.allowedActions || [])
            ])
        };
    }
    // Main validation method
    validateWorkflow(workflow) {
        const errors = [];
        const warnings = [];
        try {
            // Basic structure validation
            this.validateStructure(workflow, errors);
            // Component security validation
            this.validateComponents(workflow, errors, warnings);
            // Data access validation
            this.validateDataAccess(workflow, errors, warnings);
            // Complexity validation
            this.validateComplexity(workflow, errors, warnings);
            // Props validation
            this.validateProps(workflow, errors, warnings);
            // Resource usage validation
            this.validateResourceUsage(workflow, errors, warnings);
        }
        catch (error) {
            errors.push({
                path: '/workflow',
                message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                code: 'VALIDATION_ERROR'
            });
        }
        return {
            valid: errors.length === 0,
            errors,
            securityWarnings: warnings
        };
    }
    validateStructure(workflow, errors) {
        if (!workflow.id || typeof workflow.id !== 'string') {
            errors.push({
                path: '/id',
                message: 'Workflow ID is required and must be a string',
                code: 'MISSING_ID'
            });
        }
        if (!workflow.workflow || !Array.isArray(workflow.workflow)) {
            errors.push({
                path: '/workflow',
                message: 'Workflow steps array is required',
                code: 'MISSING_WORKFLOW'
            });
        }
        if (!workflow.renderMode || !['artifact', 'inline', 'modal'].includes(workflow.renderMode)) {
            errors.push({
                path: '/renderMode',
                message: 'Valid renderMode is required (artifact, inline, or modal)',
                code: 'INVALID_RENDER_MODE'
            });
        }
    }
    validateComponents(workflow, errors, warnings) {
        if (!workflow.workflow)
            return;
        workflow.workflow.forEach((step, index) => {
            if (typeof step === 'object') {
                Object.entries(step).forEach(([nodeId, config]) => {
                    if (typeof config === 'object' && config !== null) {
                        // Check component name
                        if ('component' in config && typeof config.component === 'string') {
                            if (!this.config.allowedComponents.has(config.component)) {
                                errors.push({
                                    path: `/workflow[${index}]/${nodeId}/component`,
                                    message: `Component '${config.component}' is not allowed`,
                                    code: 'FORBIDDEN_COMPONENT'
                                });
                            }
                        }
                        // Check for suspicious component names
                        if ('component' in config && typeof config.component === 'string') {
                            if (config.component.toLowerCase().includes('script') ||
                                config.component.toLowerCase().includes('iframe')) {
                                warnings.push({
                                    severity: 'high',
                                    message: `Potentially dangerous component: ${config.component}`,
                                    path: `/workflow[${index}]/${nodeId}/component`,
                                    recommendation: 'Use standard UI components instead'
                                });
                            }
                        }
                    }
                });
            }
        });
    }
    validateDataAccess(workflow, errors, warnings) {
        const workflowString = JSON.stringify(workflow);
        DANGEROUS_PATTERNS.forEach(({ pattern, severity, message }) => {
            const matches = workflowString.match(pattern);
            if (matches) {
                if (severity === 'high') {
                    errors.push({
                        path: '/workflow',
                        message: `Security violation: ${message}`,
                        code: 'SECURITY_VIOLATION'
                    });
                }
                else {
                    warnings.push({
                        severity,
                        message: `Security warning: ${message}`,
                        path: '/workflow',
                        recommendation: 'Review the flagged content for security implications'
                    });
                }
            }
        });
        // Check for external data access when not allowed
        if (!this.config.allowExternalData) {
            if (workflowString.includes('fetch') || workflowString.includes('XMLHttpRequest')) {
                warnings.push({
                    severity: 'medium',
                    message: 'External data access detected but not explicitly allowed',
                    path: '/workflow',
                    recommendation: 'Enable allowExternalData in security config if needed'
                });
            }
        }
    }
    validateComplexity(workflow, errors, warnings) {
        const nodeCount = workflow.workflow?.length || 0;
        if (nodeCount > this.config.maxComplexity) {
            errors.push({
                path: '/workflow',
                message: `Workflow complexity exceeds limit: ${nodeCount} > ${this.config.maxComplexity}`,
                code: 'COMPLEXITY_EXCEEDED'
            });
        }
        else if (nodeCount > this.config.maxComplexity * 0.8) {
            warnings.push({
                severity: 'low',
                message: `Workflow is approaching complexity limit: ${nodeCount}/${this.config.maxComplexity}`,
                path: '/workflow',
                recommendation: 'Consider breaking into smaller workflows'
            });
        }
    }
    validateProps(workflow, errors, warnings) {
        if (!workflow.workflow)
            return;
        workflow.workflow.forEach((step, index) => {
            if (typeof step === 'object') {
                Object.entries(step).forEach(([nodeId, config]) => {
                    this.validateNodeProps(config, `/workflow[${index}]/${nodeId}`, errors, warnings);
                });
            }
        });
    }
    validateNodeProps(config, basePath, errors, warnings) {
        if (typeof config !== 'object' || config === null)
            return;
        Object.entries(config).forEach(([key, value]) => {
            if (typeof value === 'string') {
                // Check for code injection in string props
                DANGEROUS_PATTERNS.forEach(({ pattern, severity, message }) => {
                    if (pattern.test(value)) {
                        if (severity === 'high') {
                            errors.push({
                                path: `${basePath}/${key}`,
                                message: `Security violation in prop: ${message}`,
                                code: 'PROP_SECURITY_VIOLATION'
                            });
                        }
                        else {
                            warnings.push({
                                severity,
                                message: `Security warning in prop: ${message}`,
                                path: `${basePath}/${key}`,
                                recommendation: 'Sanitize or remove the flagged content'
                            });
                        }
                    }
                });
            }
            else if (typeof value === 'object' && value !== null) {
                // Recursively validate nested props
                this.validateNodeProps(value, `${basePath}/${key}`, errors, warnings);
            }
        });
    }
    validateResourceUsage(workflow, errors, warnings) {
        const workflowString = JSON.stringify(workflow);
        // Check for potential memory/CPU intensive patterns
        const resourcePatterns = [
            { pattern: /while\s*\(true\)/, message: 'Infinite loop detected' },
            { pattern: /setInterval.*0/, message: 'High-frequency interval detected' },
            { pattern: /new\s+Array\s*\(\s*\d{6,}\s*\)/, message: 'Large array allocation detected' },
            { pattern: /\.repeat\s*\(\s*\d{4,}\s*\)/, message: 'Large string repeat detected' }
        ];
        resourcePatterns.forEach(({ pattern, message }) => {
            if (pattern.test(workflowString)) {
                warnings.push({
                    severity: 'medium',
                    message: `Resource usage warning: ${message}`,
                    path: '/workflow',
                    recommendation: 'Review for potential performance impact'
                });
            }
        });
    }
    // Update security configuration
    updateConfig(config) {
        this.config = {
            ...this.config,
            ...config,
            allowedComponents: config.allowedComponents || this.config.allowedComponents,
            allowedActions: config.allowedActions || this.config.allowedActions
        };
    }
    // Get current security configuration
    getConfig() {
        return { ...this.config };
    }
    // Add allowed component
    addAllowedComponent(component) {
        this.config.allowedComponents.add(component);
    }
    // Remove allowed component
    removeAllowedComponent(component) {
        this.config.allowedComponents.delete(component);
    }
    // Add allowed action
    addAllowedAction(action) {
        this.config.allowedActions.add(action);
    }
    // Remove allowed action
    removeAllowedAction(action) {
        this.config.allowedActions.delete(action);
    }
}
// Quick validation function for simple use cases
export function validateUIWorkflow(workflow, config) {
    const validator = new UIWorkflowSecurityValidator(config);
    return validator.validateWorkflow(workflow);
}
// Security utilities
export class UISecurityUtils {
    // Sanitize string inputs to prevent injection
    static sanitizeString(input) {
        return input
            .replace(/[<>]/g, '') // Remove angle brackets
            .replace(/javascript:/gi, '') // Remove javascript protocol
            .replace(/on\w+\s*=/gi, '') // Remove event handlers
            .trim();
    }
    // Validate URL for safety
    static isUrlSafe(url) {
        try {
            const urlObj = new URL(url);
            // Only allow http/https protocols
            if (!['http:', 'https:'].includes(urlObj.protocol)) {
                return false;
            }
            // Block localhost/private IPs in production
            const hostname = urlObj.hostname.toLowerCase();
            if (hostname === 'localhost' ||
                hostname === '127.0.0.1' ||
                hostname.startsWith('192.168.') ||
                hostname.startsWith('10.') ||
                hostname.startsWith('172.')) {
                return false;
            }
            return true;
        }
        catch {
            return false;
        }
    }
    // Generate a security report
    static generateSecurityReport(result) {
        const { valid, errors, securityWarnings } = result;
        let report = `Security Validation Report\n`;
        report += `========================\n\n`;
        report += `Status: ${valid ? 'VALID' : 'INVALID'}\n`;
        report += `Errors: ${errors?.length || 0}\n`;
        report += `Warnings: ${securityWarnings?.length || 0}\n\n`;
        if (errors?.length) {
            report += `ERRORS:\n`;
            errors.forEach((error, index) => {
                report += `${index + 1}. [${error.code}] ${error.message}\n`;
                report += `   Path: ${error.path}\n\n`;
            });
        }
        if (securityWarnings?.length) {
            report += `WARNINGS:\n`;
            securityWarnings.forEach((warning, index) => {
                report += `${index + 1}. [${warning.severity.toUpperCase()}] ${warning.message}\n`;
                report += `   Path: ${warning.path}\n`;
                if (warning.recommendation) {
                    report += `   Recommendation: ${warning.recommendation}\n`;
                }
                report += `\n`;
            });
        }
        return report;
    }
}
