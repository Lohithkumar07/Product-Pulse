import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Dataset } from '../types';
import { datasetsApi } from '../api/datasets';

interface DatasetContextType {
  datasets: Dataset[];
  activeDataset: Dataset | null;
  activeDatasetId: string | null;
  setActiveDatasetId: (id: string) => void;
  refreshDatasets: () => Promise<void>;
  loading: boolean;
  isDemo: boolean;
  loadDemoData: () => Promise<void>;
  deleteDataset: (id: string) => Promise<void>;
}

const DatasetContext = createContext<DatasetContextType | undefined>(undefined);

const STORAGE_KEY = 'productpulse_active_dataset_id';

export const DatasetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [activeDatasetId, setActiveDatasetIdState] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY);
  });
  const [loading, setLoading] = useState(true);

  const refreshDatasets = useCallback(async () => {
    try {
      setLoading(true);
      const list = await datasetsApi.list();
      setDatasets(list);

      // If active dataset is set in localStorage, check if it still exists in list
      const storedId = localStorage.getItem(STORAGE_KEY);
      if (storedId && list.some(d => d.id === storedId)) {
        setActiveDatasetIdState(storedId);
      } else if (list.length > 0) {
        // Pick the most recent one
        const newest = list[0].id;
        setActiveDatasetIdState(newest);
        localStorage.setItem(STORAGE_KEY, newest);
      } else {
        setActiveDatasetIdState(null);
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      console.error('Failed to load datasets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDatasets();
  }, [refreshDatasets]);

  const setActiveDatasetId = useCallback((id: string) => {
    setActiveDatasetIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const activeDataset = datasets.find(d => d.id === activeDatasetId) || (datasets.length > 0 ? datasets[0] : null);
  const isDemo = !!activeDataset && (activeDataset.id === 'ds_demo_saas_flow' || activeDataset.name.includes('[Demo]'));

  const loadDemoData = async () => {
    await datasetsApi.resetDemo();
    await refreshDatasets();
    setActiveDatasetId('ds_demo_saas_flow');
  };

  const deleteDataset = async (id: string) => {
    await datasetsApi.delete(id);
    await refreshDatasets();
  };

  return (
    <DatasetContext.Provider
      value={{
        datasets,
        activeDataset,
        activeDatasetId: activeDataset?.id || null,
        setActiveDatasetId,
        refreshDatasets,
        loading,
        isDemo,
        loadDemoData,
        deleteDataset,
      }}
    >
      {children}
    </DatasetContext.Provider>
  );
};

export const useDataset = () => {
  const context = useContext(DatasetContext);
  if (!context) {
    throw new Error('useDataset must be used within a DatasetProvider');
  }
  return context;
};
