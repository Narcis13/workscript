import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LoopManager } from './LoopManager';
import type { EdgeMap } from 'shared/dist';

describe('LoopManager', () => {
  let loopManager: LoopManager;
  const executionId = 'test-execution-123';

  beforeEach(() => {
    loopManager = new LoopManager();
  });

  describe('hasLoopEdge', () => {
    it('should detect loop edge in edge map', () => {
      const edgeMap: EdgeMap = { loop: 'continue', success: 'done' };
      expect(loopManager.hasLoopEdge(edgeMap)).toBe(true);
    });

    it('should return false when no loop edge present', () => {
      const edgeMap: EdgeMap = { success: 'done', error: 'failed' };
      expect(loopManager.hasLoopEdge(edgeMap)).toBe(false);
    });

    it('should return false for empty edge map', () => {
      const edgeMap: EdgeMap = {};
      expect(loopManager.hasLoopEdge(edgeMap)).toBe(false);
    });
  });

  describe('isInLoop', () => {
    it('should return false when not in loop', () => {
      expect(loopManager.isInLoop(executionId)).toBe(false);
    });

    it('should return true when in active loop', () => {
      loopManager.startLoop(executionId, 'loop-node', ['process', 'validate']);
      expect(loopManager.isInLoop(executionId)).toBe(true);
    });

    it('should return false after loop termination', () => {
      loopManager.startLoop(executionId, 'loop-node', ['process']);
      loopManager.continueLoop(executionId, 'process', { success: true });
      const result = loopManager.continueLoop(executionId, 'loop-node', { complete: true });
      expect(result.terminated).toBe(true);
      expect(loopManager.isInLoop(executionId)).toBe(false);
    });
  });

  describe('startLoop', () => {
    it('should start a new loop successfully', () => {
      const result = loopManager.startLoop(executionId, 'loop-node', ['process', 'validate']);
      
      expect(result.isLoop).toBe(true);
      expect(result.nextNode).toBe('process');
      expect(result.continueLoop).toBe(true);
      expect(result.terminated).toBe(false);
      expect(result.loopState).toBeDefined();
      expect(result.loopState?.iteration).toBe(0);
      expect(result.loopState?.sequenceIndex).toBe(0);
    });

    it('should throw error if already in loop', () => {
      loopManager.startLoop(executionId, 'loop-node', ['process']);
      
      expect(() => {
        loopManager.startLoop(executionId, 'loop-node', ['process']);
      }).toThrow('Execution test-execution-123 is already in a loop');
    });

    it('should throw error for empty loop sequence', () => {
      expect(() => {
        loopManager.startLoop(executionId, 'loop-node', []);
      }).toThrow('Loop sequence cannot be empty');
    });

    it('should use custom max iterations', () => {
      const result = loopManager.startLoop(executionId, 'loop-node', ['process'], 50);
      expect(result.loopState?.maxIterations).toBe(50);
    });

    it('should use custom max execution time', () => {
      const result = loopManager.startLoop(executionId, 'loop-node', ['process'], 100, 60000);
      expect(result.loopState?.maxExecutionTime).toBe(60000);
    });
  });

  describe('continueLoop', () => {
    beforeEach(() => {
      loopManager.startLoop(executionId, 'loop-node', ['process', 'validate']);
    });

    it('should continue to next node in sequence', () => {
      const result = loopManager.continueLoop(executionId, 'process', { success: true });
      
      expect(result.isLoop).toBe(true);
      expect(result.nextNode).toBe('validate');
      expect(result.continueLoop).toBe(true);
      expect(result.terminated).toBe(false);
    });

    it('should return to loop node after sequence completion', () => {
      // Complete first node in sequence
      loopManager.continueLoop(executionId, 'process', { success: true });
      
      // Complete second node in sequence
      const result = loopManager.continueLoop(executionId, 'validate', { success: true });
      
      expect(result.isLoop).toBe(true);
      expect(result.nextNode).toBe('loop-node');
      expect(result.continueLoop).toBe(true);
      expect(result.terminated).toBe(false);
    });

    it('should handle loop continuation from loop node', () => {
      // Complete sequence and return to loop node
      loopManager.continueLoop(executionId, 'process', { success: true });
      loopManager.continueLoop(executionId, 'validate', { success: true });
      
      // Loop node returns loop edge
      const result = loopManager.continueLoop(executionId, 'loop-node', { loop: 'continue' });
      
      expect(result.isLoop).toBe(true);
      expect(result.nextNode).toBe('process');
      expect(result.continueLoop).toBe(true);
      expect(result.terminated).toBe(false);
      expect(result.loopState?.iteration).toBe(1);
    });

    it('should terminate loop on non-loop edge', () => {
      // Complete sequence and return to loop node
      loopManager.continueLoop(executionId, 'process', { success: true });
      loopManager.continueLoop(executionId, 'validate', { success: true });
      
      // Loop node returns non-loop edge
      const result = loopManager.continueLoop(executionId, 'loop-node', { complete: true });
      
      expect(result.isLoop).toBe(false);
      expect(result.nextNode).toBeNull();
      expect(result.continueLoop).toBe(false);
      expect(result.terminated).toBe(true);
      expect(result.terminationReason).toBe('non_loop_edge');
    });

    it('should terminate loop on max iterations', () => {
      // Start loop with max 1 iteration
      loopManager.clear();
      const startResult = loopManager.startLoop(executionId, 'loop-node', ['process'], 1);
      expect(startResult.loopState?.iteration).toBe(0);
      expect(startResult.loopState?.maxIterations).toBe(1);
      
      // Complete first iteration sequence
      const processResult = loopManager.continueLoop(executionId, 'process', { success: true });
      expect(processResult.nextNode).toBe('loop-node');
      
      // Back at loop node - try to continue loop (should reach max iterations)
      const result = loopManager.continueLoop(executionId, 'loop-node', { loop: 'continue' });
      
      expect(result.terminated).toBe(true);
      expect(result.terminationReason).toBe('max_iterations');
    });

    it('should terminate loop on timeout', () => {
      // Start loop with short timeout
      loopManager.clear();
      loopManager.startLoop(executionId, 'loop-node', ['process'], 100, 1); // 1ms timeout
      
      // Wait for timeout
      setTimeout(() => {
        const result = loopManager.continueLoop(executionId, 'loop-node', { loop: 'continue' });
        expect(result.terminated).toBe(true);
        expect(result.terminationReason).toBe('timeout');
      }, 10);
    });

    it('should handle non-existent execution', () => {
      const result = loopManager.continueLoop('non-existent', 'node', { success: true });
      
      expect(result.isLoop).toBe(false);
      expect(result.terminated).toBe(true);
      expect(result.terminationReason).toBe('completed');
    });
  });

  describe('getLoopState', () => {
    it('should return undefined for non-existent execution', () => {
      const state = loopManager.getLoopState('non-existent');
      expect(state).toBeUndefined();
    });

    it('should return loop state for active loop', () => {
      loopManager.startLoop(executionId, 'loop-node', ['process', 'validate']);
      const state = loopManager.getLoopState(executionId);
      
      expect(state).toBeDefined();
      expect(state?.nodeId).toBe('loop-node');
      expect(state?.sequence).toEqual(['process', 'validate']);
      expect(state?.iteration).toBe(0);
      expect(state?.isActive).toBe(true);
    });
  });

  describe('extractLoopSequence', () => {
    it('should extract sequence from route result', () => {
      const routeResult = {
        nextNodes: ['process', 'validate'],
        inlineConfigs: {},
        isOptional: false,
        continueSequence: false,
        isLoop: true
      };
      
      const sequence = loopManager.extractLoopSequence(routeResult);
      expect(sequence).toEqual(['process', 'validate']);
    });

    it('should return null for empty route result', () => {
      const routeResult = {
        nextNodes: [],
        inlineConfigs: {},
        isOptional: false,
        continueSequence: false
      };
      
      const sequence = loopManager.extractLoopSequence(routeResult);
      expect(sequence).toBeNull();
    });
  });

  describe('validateLoopSequence', () => {
    const workflow = {
      id: 'test',
      name: 'Test',
      version: '1.0.0',
      workflow: {
        'node1': { type: 'simple' },
        'node2': { type: 'simple' }
      }
    };

    it('should validate existing nodes', () => {
      const errors = loopManager.validateLoopSequence(['node1', 'node2'], workflow);
      expect(errors).toEqual([]);
    });

    it('should return errors for non-existent nodes', () => {
      const errors = loopManager.validateLoopSequence(['node1', 'non-existent'], workflow);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('non-existent');
    });
  });

  describe('getLoopStats', () => {
    it('should return null for non-existent execution', () => {
      const stats = loopManager.getLoopStats('non-existent');
      expect(stats).toBeNull();
    });

    it('should return stats for active loop', () => {
      loopManager.startLoop(executionId, 'loop-node', ['process', 'validate']);
      const stats = loopManager.getLoopStats(executionId);
      
      expect(stats).toBeDefined();
      expect(stats.nodeId).toBe('loop-node');
      expect(stats.iteration).toBe(0);
      expect(stats.sequenceLength).toBe(2);
      expect(stats.isActive).toBe(true);
      expect(stats.elapsedTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('cleanup', () => {
    it('should clean up loop state', () => {
      loopManager.startLoop(executionId, 'loop-node', ['process']);
      expect(loopManager.isInLoop(executionId)).toBe(true);
      
      loopManager.cleanup(executionId);
      expect(loopManager.isInLoop(executionId)).toBe(false);
    });

    it('should handle cleanup of non-existent execution', () => {
      expect(() => loopManager.cleanup('non-existent')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all loop states', () => {
      loopManager.startLoop('exec1', 'node1', ['process']);
      loopManager.startLoop('exec2', 'node2', ['validate']);
      
      expect(loopManager.isInLoop('exec1')).toBe(true);
      expect(loopManager.isInLoop('exec2')).toBe(true);
      
      loopManager.clear();
      
      expect(loopManager.isInLoop('exec1')).toBe(false);
      expect(loopManager.isInLoop('exec2')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty edge map in continue loop', () => {
      loopManager.startLoop(executionId, 'loop-node', ['process']);
      loopManager.continueLoop(executionId, 'process', { success: true });
      
      const result = loopManager.continueLoop(executionId, 'loop-node', {});
      
      expect(result.terminated).toBe(true);
      expect(result.terminationReason).toBe('completed');
    });

    it('should handle single node loop sequence', () => {
      const result = loopManager.startLoop(executionId, 'loop-node', ['process']);
      
      expect(result.nextNode).toBe('process');
      expect(result.loopState?.sequence).toEqual(['process']);
    });

    it('should maintain iteration count correctly', () => {
      loopManager.startLoop(executionId, 'loop-node', ['process']);
      
      // First iteration
      loopManager.continueLoop(executionId, 'process', { success: true });
      loopManager.continueLoop(executionId, 'loop-node', { loop: 'continue' });
      
      let state = loopManager.getLoopState(executionId);
      expect(state?.iteration).toBe(1);
      
      // Second iteration
      loopManager.continueLoop(executionId, 'process', { success: true });
      loopManager.continueLoop(executionId, 'loop-node', { loop: 'continue' });
      
      state = loopManager.getLoopState(executionId);
      expect(state?.iteration).toBe(2);
    });
  });
});