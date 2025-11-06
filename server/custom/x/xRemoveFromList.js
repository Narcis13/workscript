var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Node, NodeMetadata, SimpleEdgeMap } from '../../../core/types/node';
import { ExecutionContext } from '../../../core/types/context';
import { RegisterNode } from '../../registry';
let XRemoveFromListNode = class XRemoveFromListNode {
    metadata = {
        name: 'xRemoveFromList',
        description: 'Remove a user from a list',
        type: 'action',
        ai_hints: {
            purpose: 'Manage list membership',
            when_to_use: 'For list cleanup and membership management',
            expected_edges: ['user_removed', 'not_member', 'list_not_found', 'error']
        }
    };
    async execute({ config, state }) {
        const removeConfig = config;
        const authType = state.get('x_auth_type');
        const bearerToken = state.get('x_bearer_token');
        if (!authType || !bearerToken) {
            return {
                error: () => ({
                    error: 'Not authenticated',
                    details: 'Please authenticate using xAuth node first'
                })
            };
        }
        if (!removeConfig?.listId) {
            return {
                error: () => ({
                    error: 'List ID is required',
                    details: 'Provide the ID of the list to remove user from'
                })
            };
        }
        if (!removeConfig.userId) {
            return {
                error: () => ({
                    error: 'User ID is required',
                    details: 'Provide the ID of the user to remove from the list'
                })
            };
        }
        try {
            const response = await fetch(`https://api.twitter.com/2/lists/${removeConfig.listId}/members/${removeConfig.userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${bearerToken}`
                }
            });
            const responseData = await response.json();
            if (response.status === 404) {
                const errorDetail = responseData.errors?.[0]?.detail;
                if (errorDetail?.includes('list')) {
                    return {
                        list_not_found: () => ({
                            error: 'List not found',
                            listId: removeConfig.listId,
                            details: 'The specified list does not exist'
                        })
                    };
                }
            }
            if (!response.ok) {
                const errorDetail = responseData.errors?.[0]?.detail;
                if (errorDetail?.includes('not a member')) {
                    return {
                        not_member: () => ({
                            message: 'User is not a member of this list',
                            listId: removeConfig.listId,
                            userId: removeConfig.userId,
                            removedAt: new Date().toISOString()
                        })
                    };
                }
                return {
                    error: () => ({
                        error: 'Failed to remove user from list',
                        status: response.status,
                        details: responseData
                    })
                };
            }
            const result = {
                isMember: responseData.data.is_member,
                listId: removeConfig.listId,
                userId: removeConfig.userId,
                removedAt: new Date().toISOString()
            };
            // Update last list operation in state
            state.set('lastListOperation', {
                operation: 'remove_member',
                ...result
            });
            return {
                user_removed: () => result
            };
        }
        catch (error) {
            console.error('Error in xRemoveFromList:', error);
            return {
                error: () => ({
                    error: 'Failed to remove user from list',
                    details: error instanceof Error ? error.message : String(error)
                })
            };
        }
    }
};
XRemoveFromListNode = __decorate([
    RegisterNode
], XRemoveFromListNode);
export { XRemoveFromListNode };
export const xRemoveFromList = new XRemoveFromListNode();
