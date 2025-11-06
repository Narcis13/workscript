var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Node, NodeMetadata, SimpleEdgeMap } from '../../../core/types/node';
import { ExecutionContext } from '../../../core/types/context';
import { RegisterNode } from '../../registry';
let XGetUserNode = class XGetUserNode {
    metadata = {
        name: 'xGetUser',
        description: 'Get user information by ID or username',
        type: 'action',
        ai_hints: {
            purpose: 'Fetch user profile data and metrics',
            when_to_use: 'When analyzing users or building user-centric features',
            expected_edges: ['user_found', 'user_not_found', 'private_user', 'suspended_user']
        }
    };
    async execute({ config, state }) {
        const userConfig = config;
        const authType = state.get('x_auth_type');
        const bearerToken = state.get('x_bearer_token');
        if (!authType || !bearerToken) {
            return {
                user_not_found: () => ({
                    error: 'Not authenticated',
                    details: 'Please authenticate using xAuth node first'
                })
            };
        }
        if (!userConfig?.userId && !userConfig?.username) {
            return {
                user_not_found: () => ({
                    error: 'User identifier required',
                    details: 'Provide either userId or username'
                })
            };
        }
        if (userConfig.userId && userConfig.username) {
            return {
                user_not_found: () => ({
                    error: 'Only one identifier allowed',
                    details: 'Provide either userId or username, not both'
                })
            };
        }
        try {
            const params = new URLSearchParams();
            if (userConfig.userFields?.length) {
                params.append('user.fields', userConfig.userFields.join(','));
            }
            if (userConfig.expansions?.length) {
                params.append('expansions', userConfig.expansions.join(','));
            }
            let url;
            if (userConfig.userId) {
                url = `https://api.twitter.com/2/users/${userConfig.userId}`;
            }
            else {
                url = `https://api.twitter.com/2/users/by/username/${userConfig.username}`;
            }
            if (params.toString()) {
                url += '?' + params.toString();
            }
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${bearerToken}`
                }
            });
            const responseData = await response.json();
            if (response.status === 404) {
                return {
                    user_not_found: () => ({
                        error: 'User not found',
                        identifier: userConfig.userId || userConfig.username,
                        identifierType: userConfig.userId ? 'userId' : 'username'
                    })
                };
            }
            if (!response.ok) {
                const errorData = responseData.errors?.[0];
                if (errorData?.title === 'Forbidden') {
                    if (errorData.detail?.includes('suspended')) {
                        return {
                            suspended_user: () => ({
                                error: 'User is suspended',
                                identifier: userConfig.userId || userConfig.username,
                                details: errorData.detail
                            })
                        };
                    }
                    return {
                        private_user: () => ({
                            error: 'User account is private',
                            identifier: userConfig.userId || userConfig.username,
                            details: errorData.detail
                        })
                    };
                }
                return {
                    user_not_found: () => ({
                        error: 'Failed to retrieve user',
                        status: response.status,
                        details: responseData
                    })
                };
            }
            const result = {
                user: responseData.data,
                includes: responseData.includes || {},
                retrievedAt: new Date().toISOString()
            };
            state.set('lastRetrievedUser', result);
            return {
                user_found: () => result
            };
        }
        catch (error) {
            console.error('Error in xGetUser:', error);
            return {
                user_not_found: () => ({
                    error: 'Failed to retrieve user',
                    details: error instanceof Error ? error.message : String(error)
                })
            };
        }
    }
};
XGetUserNode = __decorate([
    RegisterNode
], XGetUserNode);
export { XGetUserNode };
export const xGetUser = new XGetUserNode();
