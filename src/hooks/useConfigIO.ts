/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * useConfigIO.ts — Configuration import/export hook. Export serialises all settings
 * to a downloadable JSON file; import reads an uploaded JSON file, writes each setting
 * back to storage, and reloads the page. Tracks success and error feedback for both.
 */
import { useState } from 'react';
import { storage } from '../utils';

export function useConfigIO() {
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');

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
        migrationCompleted: localStorage.getItem('migration_completed'),
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

      setImportSuccess('Configuration exported successfully!');
      setTimeout(() => setImportSuccess(''), 3000);
    } catch (err) {
      setImportError('Failed to export configuration. Please try again.');
      setTimeout(() => setImportError(''), 3000);
    }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const importData = JSON.parse(e.target?.result as string);

        if (!importData.version) {
          setImportError('Invalid configuration file format.');
          setTimeout(() => setImportError(''), 3000);
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
        if (importData.migrationCompleted) localStorage.setItem('migration_completed', importData.migrationCompleted);

        setImportSuccess('Configuration imported successfully! Reloading page...');
        setTimeout(() => window.location.reload(), 2000);
      } catch (err) {
        setImportError('Failed to import configuration. Please ensure the file is valid.');
        setTimeout(() => setImportError(''), 3000);
      }
    };

    reader.onerror = () => {
      setImportError('Failed to read file. Please try again.');
      setTimeout(() => setImportError(''), 3000);
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  return { importError, importSuccess, handleExportData, handleImportData };
}
