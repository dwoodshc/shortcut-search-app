/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * useConfigIO.ts — Configuration import/export hook. Export serialises all settings
 * to a downloadable JSON file; import reads an uploaded JSON file, writes each setting
 * back to storage, and reloads the page. Tracks success and error feedback for both.
 */
import { useState, useRef, useEffect } from 'react';
import { storage, STORAGE_KEYS } from '../utils';

export function useConfigIO() {
  const [configError, setConfigError] = useState('');
  const [configSuccess, setConfigSuccess] = useState('');
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => { timersRef.current.forEach(clearTimeout); };
  }, []);

  const addTimer = (fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay);
    timersRef.current.push(id);
    return id;
  };

  const handleExportData = (): void => {
    try {
      const rawEpicsConfig = storage.getEpicsConfig();
      const epicsConfig = rawEpicsConfig?.epics
        ? { ...rawEpicsConfig, epics: rawEpicsConfig.epics.map(({ ...epic }) => epic) }
        : rawEpicsConfig;

      const exportData = {
        apiToken: storage.getApiToken(),
        workflowConfig: storage.getWorkflowConfig(),
        epicsConfig,
        teamConfig: storage.getTeamConfig(),
        ignoredUsers: storage.getIgnoredUsers(),
        migrationCompleted: localStorage.getItem(STORAGE_KEYS.MIGRATION_COMPLETED),
        exportDate: new Date().toISOString(),
        version: '1.0'
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `shortcut-viewer-config-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setConfigSuccess('Configuration exported successfully!');
      addTimer(() => setConfigSuccess(''), 3000);
    } catch (err) {
      setConfigError('Failed to export configuration. Please try again.');
      addTimer(() => setConfigError(''), 3000);
    }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const raw = e.target?.result;
        if (typeof raw !== 'string') throw new Error('Unexpected file content type');
        const importData = JSON.parse(raw);

        if (!importData.version) {
          setConfigError('Invalid configuration file format.');
          addTimer(() => setConfigError(''), 3000);
          return;
        }

        if (importData.apiToken) storage.setApiToken(importData.apiToken);
        if (importData.workflowConfig) storage.setWorkflowConfig(importData.workflowConfig);
        if (importData.epicsConfig) {
          const epicsConfig = importData.epicsConfig?.epics
            ? { ...importData.epicsConfig, epics: importData.epicsConfig.epics.map(({ ...epic }: { name: string }) => epic) }
            : importData.epicsConfig;
          storage.setEpicsConfig(epicsConfig);
        }
        if (importData.teamConfig) storage.setTeamConfig(importData.teamConfig);
        if (importData.ignoredUsers) storage.setIgnoredUsers(importData.ignoredUsers);
        if (importData.migrationCompleted) localStorage.setItem(STORAGE_KEYS.MIGRATION_COMPLETED, importData.migrationCompleted);

        setConfigSuccess('Configuration imported successfully! Reloading page...');
        addTimer(() => window.location.reload(), 2000);
      } catch (err) {
        setConfigError('Failed to import configuration. Please ensure the file is valid.');
        addTimer(() => setConfigError(''), 3000);
      }
    };

    reader.onerror = () => {
      setConfigError('Failed to read file. Please try again.');
      addTimer(() => setConfigError(''), 3000);
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  return { configError, configSuccess, handleExportData, handleImportData };
}
