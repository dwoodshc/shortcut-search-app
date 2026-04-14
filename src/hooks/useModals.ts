/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * useModals.ts — Modal state hook. Controls visibility for all modals and overlays,
 * tracks the setup wizard step, and holds fetched README content. Registers global
 * keyboard (ESC) and click-outside listeners to close open panels.
 */
import { useState, useCallback, useEffect } from 'react';
import { getApiBaseUrl } from '../utils';
import { ModalState, ModalKey } from '../types';

export function useModals() {
  const [modals, setModals] = useState<ModalState>({
    settingsMenu: false,
    about: false,
    readme: false,
    exportImport: false,
    wipeConfirm: false,
    setupWizard: false,
    rateLimit: false,
    storyDetailFilter: null,
  });
  const setModal = useCallback(<K extends ModalKey>(key: K, value: ModalState[K]) =>
    setModals(prev => ({ ...prev, [key]: value })), []);

  const [setupWizardStep, setSetupWizardStep] = useState(1);
  const [readmeContent, setReadmeContent] = useState('');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modals.settingsMenu && !(event.target as Element).closest('.settings-container')) {
        setModal('settingsMenu', false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [modals.settingsMenu, setModal]);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (modals.setupWizard) {
          setModal('setupWizard', false);
        } else if (modals.about) {
          setModal('about', false);
        } else if (modals.readme) {
          setModal('readme', false);
        } else if (modals.exportImport) {
          setModal('exportImport', false);
        } else if (modals.storyDetailFilter) {
          setModal('storyDetailFilter', null);
        } else if (modals.settingsMenu) {
          setModal('settingsMenu', false);
        }
      }
    };
    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [modals.setupWizard, modals.about, modals.readme, modals.exportImport, modals.settingsMenu, modals.storyDetailFilter, setModal]);

  const handleOpenReadme = useCallback(async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/readme`);
      if (response.ok) {
        const data = await response.json();
        setReadmeContent(data.content);
        setModal('readme', true);
      } else {
        setReadmeContent('Failed to load README.md file');
        setModal('readme', true);
      }
    } catch (err) {
      setReadmeContent('Failed to load README.md file');
      setModal('readme', true);
    }
  }, [setModal]);

  return {
    modals, setModal,
    setupWizardStep, setSetupWizardStep,
    readmeContent,
    handleOpenReadme,
  };
}
