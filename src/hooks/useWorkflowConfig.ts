/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * useWorkflowConfig.ts — Workflow configuration hook. Manages the selected workflow,
 * state-to-ID mappings, Shortcut workspace URL, and filtered epic names. Derives
 * filteredStateIds, and exposes loadSelectedWorkflow,
 * handleSelectWorkflow, and generateShortcutUrl.
 */
import { useState, useCallback, useMemo } from 'react';
import { storage } from '../utils';
import { WorkflowConfig, Workflow } from '../types';

const NORMALIZED_WORKFLOW_STATES = ['backlog', 'ready for development', 'in development', 'in review', 'ready for release', 'complete'];

function buildStateMaps(states: Array<{ id: number; name: string }>) {
  const stateIds: Record<string, number> = {};
  const stateOrder: number[] = [];
  const stateNames: Record<number, string> = {};
  states.forEach(state => {
    stateIds[state.name.toLowerCase().trim()] = state.id;
    stateOrder.push(state.id);
    stateNames[state.id] = state.name;
  });
  return { stateIds, stateOrder, stateNames };
}

export function useWorkflowConfig() {
  const [workflowConfig, setWorkflowConfig] = useState<WorkflowConfig>({
    states: {},
    stateOrder: [],
    stateIds: {},
    workflows: [],
    selectedId: null,
    savedId: null,
  });
  const setWorkflowField = useCallback(<K extends keyof WorkflowConfig>(key: K, value: WorkflowConfig[K]) =>
    setWorkflowConfig(prev => ({ ...prev, [key]: value })), []);

  const [shortcutWebUrl, setShortcutWebUrl] = useState('https://app.shortcut.com/<workspace>');
  const [filteredEpicNames, setFilteredEpicNames] = useState<string[]>([]);

  const loadSelectedWorkflow = useCallback(() => {
    try {
      const data = storage.getWorkflowConfig();
      if (data && data.workflow_id) {
        if (data.shortcut_web_url) {
          setShortcutWebUrl(data.shortcut_web_url);
        }
        if (data.states && Array.isArray(data.states)) {
          const { stateIds, stateOrder, stateNames } = buildStateMaps(data.states);
          setWorkflowConfig(prev => ({
            ...prev,
            selectedId: data.workflow_id,
            savedId: data.workflow_id,
            stateIds,
            stateOrder,
            states: stateNames,
          }));
        }
      }
    } catch (err) {}
  }, []);

  const handleSelectWorkflow = useCallback((workflow: Workflow) => {
    try {
      const states = workflow.states.map(state => ({ id: state.id, name: state.name }));
      storage.setWorkflowConfig({
        workflow_name: workflow.name,
        workflow_id: workflow.id,
        shortcut_web_url: shortcutWebUrl,
        states: states
      });
      const { stateIds, stateOrder, stateNames } = buildStateMaps(workflow.states);
      setWorkflowConfig(prev => ({
        ...prev,
        selectedId: workflow.id,
        savedId: workflow.id,
        stateIds,
        stateOrder,
        states: stateNames,
      }));
    } catch (err) {}
  }, [shortcutWebUrl]);

  const filteredStateIds = useMemo(() =>
    workflowConfig.stateOrder.filter(stateId => {
      const stateName = workflowConfig.states[stateId];
      return stateName && NORMALIZED_WORKFLOW_STATES.includes(stateName.toLowerCase().trim());
    }),
  [workflowConfig.stateOrder, workflowConfig.states]);

  const generateShortcutUrl = useCallback((epicId: number | string, stateName?: string): string => {
    if (!epicId) return '#';
    const stateKey = stateName?.toLowerCase().trim();
    const workflowStateId = stateKey ? workflowConfig.stateIds[stateKey] : null;
    let url = `${shortcutWebUrl}/epic/${epicId}`;
    const params: string[] = [];
    if (workflowConfig.savedId) params.push(`workflow_id=${workflowConfig.savedId}`);
    if (workflowStateId) params.push(`workflow_state_ids=${workflowStateId}`);
    if (params.length > 0) url += '?' + params.join('&');
    return url;
  }, [shortcutWebUrl, workflowConfig.savedId, workflowConfig.stateIds]);

  return {
    workflowConfig, setWorkflowConfig, setWorkflowField,
    shortcutWebUrl, setShortcutWebUrl,
    filteredEpicNames, setFilteredEpicNames,
    loadSelectedWorkflow,
    handleSelectWorkflow,
    filteredStateIds,
    generateShortcutUrl,
  };
}
