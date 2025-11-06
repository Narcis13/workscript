import { WorkflowNode } from 'shared';
export class DOMNode extends WorkflowNode {
    metadata = {
        id: 'dom',
        name: 'DOM Operations',
        version: '1.0.0',
        description: 'Browser-specific DOM manipulation operations',
        inputs: ['operation', 'selector', 'content', 'attribute'],
        outputs: ['result', 'found', 'not_found'],
        ai_hints: {
            purpose: 'Manipulate DOM elements in the browser (find, set text/HTML, manage attributes and classes)',
            when_to_use: 'When you need to dynamically modify the HTML page structure or content in browser workflows',
            expected_edges: ['success', 'error', 'found', 'not_found'],
            example_usage: '{"dom-1": {"operation": "setText", "selector": "#message", "content": "Hello World", "success?": "next-node"}}',
            example_config: '{"operation": "find|setText|setHTML|getAttribute|setAttribute|addClass|removeClass", "selector": "string", "content?": "string", "attribute?": "string"}',
            get_from_state: [],
            post_to_state: ['domElement', 'domTextSet', 'domHTMLSet', 'domAttribute', 'domAttributeSet', 'domClassAdded', 'domClassRemoved']
        }
    };
    async execute(context, config) {
        const { operation, selector, content, attribute } = config || {};
        if (!operation) {
            return {
                error: () => ({ error: 'Missing operation' })
            };
        }
        // Check if we're in a browser environment
        if (typeof document === 'undefined') {
            return {
                error: () => ({ error: 'DOM is not available in this environment' })
            };
        }
        try {
            switch (operation) {
                case 'find': {
                    if (!selector) {
                        return {
                            error: () => ({ error: 'Missing selector for find operation' })
                        };
                    }
                    const element = document.querySelector(selector);
                    if (element) {
                        context.state.domElement = {
                            tagName: element.tagName,
                            id: element.id,
                            className: element.className,
                            textContent: element.textContent
                        };
                        return {
                            found: () => ({
                                selector,
                                element: {
                                    tagName: element.tagName,
                                    id: element.id,
                                    className: element.className
                                }
                            })
                        };
                    }
                    else {
                        return {
                            not_found: () => ({ selector })
                        };
                    }
                }
                case 'setText': {
                    if (!selector || content === undefined) {
                        return {
                            error: () => ({ error: 'Missing selector or content for setText operation' })
                        };
                    }
                    const element = document.querySelector(selector);
                    if (element) {
                        element.textContent = content;
                        context.state.domTextSet = { selector, content };
                        return {
                            success: () => ({ selector, content })
                        };
                    }
                    else {
                        return {
                            not_found: () => ({ selector })
                        };
                    }
                }
                case 'setHTML': {
                    if (!selector || content === undefined) {
                        return {
                            error: () => ({ error: 'Missing selector or content for setHTML operation' })
                        };
                    }
                    const element = document.querySelector(selector);
                    if (element) {
                        element.innerHTML = content;
                        context.state.domHTMLSet = { selector, content };
                        return {
                            success: () => ({ selector, content })
                        };
                    }
                    else {
                        return {
                            not_found: () => ({ selector })
                        };
                    }
                }
                case 'getAttribute': {
                    if (!selector || !attribute) {
                        return {
                            error: () => ({ error: 'Missing selector or attribute for getAttribute operation' })
                        };
                    }
                    const element = document.querySelector(selector);
                    if (element) {
                        const value = element.getAttribute(attribute);
                        context.state.domAttribute = { selector, attribute, value };
                        return {
                            success: () => ({ selector, attribute, value })
                        };
                    }
                    else {
                        return {
                            not_found: () => ({ selector })
                        };
                    }
                }
                case 'setAttribute': {
                    if (!selector || !attribute || content === undefined) {
                        return {
                            error: () => ({ error: 'Missing selector, attribute, or content for setAttribute operation' })
                        };
                    }
                    const element = document.querySelector(selector);
                    if (element) {
                        element.setAttribute(attribute, content);
                        context.state.domAttributeSet = { selector, attribute, value: content };
                        return {
                            success: () => ({ selector, attribute, value: content })
                        };
                    }
                    else {
                        return {
                            not_found: () => ({ selector })
                        };
                    }
                }
                case 'addClass': {
                    if (!selector || !content) {
                        return {
                            error: () => ({ error: 'Missing selector or class name for addClass operation' })
                        };
                    }
                    const element = document.querySelector(selector);
                    if (element) {
                        element.classList.add(content);
                        context.state.domClassAdded = { selector, className: content };
                        return {
                            success: () => ({ selector, className: content })
                        };
                    }
                    else {
                        return {
                            not_found: () => ({ selector })
                        };
                    }
                }
                case 'removeClass': {
                    if (!selector || !content) {
                        return {
                            error: () => ({ error: 'Missing selector or class name for removeClass operation' })
                        };
                    }
                    const element = document.querySelector(selector);
                    if (element) {
                        element.classList.remove(content);
                        context.state.domClassRemoved = { selector, className: content };
                        return {
                            success: () => ({ selector, className: content })
                        };
                    }
                    else {
                        return {
                            not_found: () => ({ selector })
                        };
                    }
                }
                default:
                    return {
                        error: () => ({ error: `Unknown operation: ${operation}` })
                    };
            }
        }
        catch (error) {
            return {
                error: () => ({
                    error: error instanceof Error ? error.message : 'DOM operation failed',
                    operation,
                    selector
                })
            };
        }
    }
}
