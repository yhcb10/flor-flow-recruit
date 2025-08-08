import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { JobPosition } from '@/types/recruitment';
import { mockJobPositions } from '@/data/mockData';

// Database type from Supabase
type DatabaseJobPosition = {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  status: string;
  requirements: string[];
  responsibilities: string[];
  benefits: string[];
  salary_range: string;
  description: string;
  created_at: string;
  updated_at: string;
};

// Convert database type to app type
const convertDbToJobPosition = (dbPosition: DatabaseJobPosition): JobPosition => ({
  id: dbPosition.id,
  title: dbPosition.title,
  department: dbPosition.department,
  description: dbPosition.description,
  requirements: dbPosition.requirements,
  responsibilities: dbPosition.responsibilities,
  status: dbPosition.status as JobPosition['status'],
  createdAt: new Date(dbPosition.created_at),
  // Default values for missing fields
  culturalValues: [],
  minimumQualification: 'Ensino Médio completo',
  createdBy: 'Sistema',
  targetHires: 1
});

// Convert app type to database type
const convertJobPositionToDb = (position: Omit<JobPosition, 'id' | 'createdAt' | 'updatedAt'>): Omit<DatabaseJobPosition, 'id' | 'created_at' | 'updated_at'> => ({
  title: position.title,
  department: position.department,
  location: position.department, // Using department as location for now
  type: 'full-time', // Default type
  status: position.status,
  requirements: position.requirements,
  responsibilities: position.responsibilities,
  benefits: [], // Default empty benefits
  salary_range: '', // Default empty salary range
  description: position.description || ''
});

export const useJobPositions = () => {
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadJobPositions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('job_positions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // If no positions in database, migrate from localStorage or use mock data
      if (!data || data.length === 0) {
        const savedPositions = localStorage.getItem('jobPositions');
        const positionsToMigrate = savedPositions ? JSON.parse(savedPositions) : mockJobPositions;
        
        // Insert mock/localStorage data to database
        for (const position of positionsToMigrate) {
          await createJobPosition(position);
        }
        
        // Clear localStorage after migration
        localStorage.removeItem('jobPositions');
        localStorage.removeItem('selectedPosition');
        
        setJobPositions(positionsToMigrate);
      } else {
        const convertedPositions = data.map(convertDbToJobPosition);
        setJobPositions(convertedPositions);
      }
    } catch (err) {
      console.error('Error loading job positions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load job positions');
      
      // Fallback to localStorage/mock data
      const saved = localStorage.getItem('jobPositions');
      setJobPositions(saved ? JSON.parse(saved) : mockJobPositions);
    } finally {
      setLoading(false);
    }
  };

  const createJobPosition = async (position: Omit<JobPosition, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const dbPosition = convertJobPositionToDb(position);
      const { data, error } = await supabase
        .from('job_positions')
        .insert([dbPosition])
        .select()
        .single();

      if (error) throw error;

      const newPosition = convertDbToJobPosition(data);
      setJobPositions(prev => [newPosition, ...prev]);
      return newPosition;
    } catch (err) {
      console.error('Error creating job position:', err);
      setError(err instanceof Error ? err.message : 'Failed to create job position');
      throw err;
    }
  };

  const updateJobPosition = async (id: string, updates: Partial<JobPosition>) => {
    try {
      const { data, error } = await supabase
        .from('job_positions')
        .update({ status: updates.status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const updatedPosition = convertDbToJobPosition(data);
      setJobPositions(prev => 
        prev.map(position => 
          position.id === id ? updatedPosition : position
        )
      );
      return updatedPosition;
    } catch (err) {
      console.error('Error updating job position:', err);
      setError(err instanceof Error ? err.message : 'Failed to update job position');
      throw err;
    }
  };

  const closeJobPosition = async (id: string) => {
    return updateJobPosition(id, { status: 'closed' });
  };

  const pauseJobPosition = async (id: string) => {
    return updateJobPosition(id, { status: 'paused' });
  };

  const deleteJobPosition = async (id: string) => {
    try {
      const { error } = await supabase
        .from('job_positions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setJobPositions(prev => prev.filter(position => position.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting job position:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete job position');
      throw err;
    }
  };

  useEffect(() => {
    loadJobPositions();
  }, []);

  return {
    jobPositions,
    loading,
    error,
    createJobPosition,
    updateJobPosition,
    closeJobPosition,
    pauseJobPosition,
    deleteJobPosition,
    refetch: loadJobPositions
  };
};