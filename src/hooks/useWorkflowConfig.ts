/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * useWorkflowConfig.ts — Workflow configuration hook. Manages the selected workflow,
 * state-to-ID mappings, Shortcut workspace URL, and filtered epic names. Derives
 * filteredStateIds and summaryStateIds, and exposes loadSelectedWorkflow,
 * handleSelectWorkflow, and generateShortcutUrl.
 */
import { useState, useCallback, useMemo } from 'react';
import { storage } from '../utils';
import { WorkflowConfig, Workflow } from '../types';

const NORMALIZED_WORKFLOW_STATES = ['backlog', 'ready for development', 'in development', 'in review', 'ready for release', 'complete'];

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
          const stateMapping: Record<string, number> = {};
          const stateOrder: number[] = [];
          const stateIdToName: Record<number, string> = {};
          data.states.forEach(state => {
            const key = state.name.toLowerCase().trim();
            stateMapping[key] = state.id;
            stateOrder.push(state.id);
            stateIdToName[state.id] = state.name;
          });
          setWorkflowConfig(prev => ({
            ...prev,
            selectedId: data.workflow_id,
            savedId: data.workflow_id,
            stateIds: stateMapping,
            stateOrder: stateOrder,
            states: stateIdToName,
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
      const stateMapping: Record<string, number> = {};
      const stateOrder: number[] = [];
      const stateIdToName: Record<number, string> = {};
      workflow.states.forEach(state => {
        const key = state.name.toLowerCase().trim();
        stateMapping[key] = state.id;
        stateOrder.push(state.id);
        stateIdToName[state.id] = state.name;
      });
      setWorkflowConfig(prev => ({
        ...prev,
        selectedId: workflow.id,
        savedId: workflow.id,
        stateIds: stateMapping,
        stateOrder: stateOrder,
        states: stateIdToName,
      }));
    } catch (err) {}
  }, [shortcutWebUrl]);

  const filteredStateIds = useMemo(() =>
    workflowConfig.stateOrder.filter(stateId => {
      const stateName = workflowConfig.states[stateId];
      return stateName && NORMALIZED_WORKFLOW_STATES.includes(stateName.toLowerCase().trim());
    }),
  [workflowConfig.stateOrder, workflowConfig.states]);

  const summaryStateIds = filteredStateIds;

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
    summaryStateIds,
    generateShortcutUrl,
  };
}
