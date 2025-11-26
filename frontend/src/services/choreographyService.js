import { supabase } from './supabase';

/**
 * Service for managing choreography projects in Supabase
 */
export const choreographyService = {
  /**
   * Save a complete choreography project
   * @param {Object} projectData - All project data including formations, dancers, etc.
   * @returns {Promise<Object>} Saved project with ID
   */
  async saveProject(projectData) {
    try {
      const {
        name,
        description,
        bpm,
        audioFileName,
        audioFileUrl,
        beatTimestamps,
        customGroups,
        dancers,
        formations,
      } = projectData;

      // Start a transaction-like operation
      // 1. Insert or update project
      let projectId;

      if (projectData.id) {
        // Update existing project
        const { data: updatedProject, error: updateError } = await supabase
          .from('projects')
          .update({
            name,
            description,
            bpm,
            audio_file_name: audioFileName,
            audio_file_url: audioFileUrl,
          })
          .eq('id', projectData.id)
          .select()
          .single();

        if (updateError) throw updateError;
        projectId = updatedProject.id;
      } else {
        // Insert new project
        const { data: newProject, error: insertError } = await supabase
          .from('projects')
          .insert({
            name,
            description,
            bpm,
            audio_file_name: audioFileName,
            audio_file_url: audioFileUrl,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        projectId = newProject.id;
      }

      // 2. Save beat timestamps
      if (beatTimestamps && beatTimestamps.length > 0) {
        // Delete existing beat timestamps for this project
        await supabase
          .from('beat_timestamps')
          .delete()
          .eq('project_id', projectId);

        // Insert new beat timestamps
        const beatTimestampsData = beatTimestamps.map((timestamp, index) => ({
          project_id: projectId,
          beat_index: index,
          timestamp: timestamp,
        }));

        const { error: beatError } = await supabase
          .from('beat_timestamps')
          .insert(beatTimestampsData);

        if (beatError) throw beatError;
      }

      // 3. Save dancers
      const dancerIdMap = new Map(); // Map old IDs to new database IDs

      if (dancers && dancers.length > 0) {
        // Delete existing dancers for this project
        await supabase
          .from('dancers')
          .delete()
          .eq('project_id', projectId);

        // Insert new dancers
        const dancersData = dancers.map((dancer) => ({
          project_id: projectId,
          name: dancer.name || null,
          initial_x: dancer.initialX,
          initial_y: dancer.initialY,
          order_index: dancer.orderIndex,
        }));

        const { data: insertedDancers, error: dancersError } = await supabase
          .from('dancers')
          .insert(dancersData)
          .select();

        if (dancersError) throw dancersError;

        // Map old dancer IDs to new database IDs
        dancers.forEach((dancer, index) => {
          dancerIdMap.set(dancer.id, insertedDancers[index].id);
        });
      }

      // 4. Save formations (custom groups)
      const formationIdMap = new Map(); // Map array index to new database IDs

      if (customGroups && customGroups.length > 0) {
        // Delete existing formations for this project
        await supabase
          .from('formations')
          .delete()
          .eq('project_id', projectId);

        // Insert new formations
        const formationsData = customGroups.map((group, index) => ({
          project_id: projectId,
          name: group.groupName || `Formation ${index + 1}`,
          color: group.color,
          start_time: group.startTime,
          end_time: group.endTime,
          transition_start_time: group.transitionStartTime,
          transition_end_time: group.transitionEndTime,
          display_order: index,
        }));

        const { data: insertedFormations, error: formationsError } = await supabase
          .from('formations')
          .insert(formationsData)
          .select();

        if (formationsError) throw formationsError;

        // Map array indices to new database IDs
        customGroups.forEach((_, index) => {
          formationIdMap.set(index, insertedFormations[index].id);
        });
      }

      // 5. Save dancer paths
      if (formations && formations.length > 0 && dancers && dancers.length > 0) {
        // Delete existing dancer paths for this project's formations
        const formationIds = Array.from(formationIdMap.values());
        if (formationIds.length > 0) {
          await supabase
            .from('dancer_paths')
            .delete()
            .in('formation_id', formationIds);

          // Insert new dancer paths
          const dancerPathsData = [];

          formations.forEach((formation, formationIndex) => {
            const formationId = formationIdMap.get(formationIndex);
            if (!formationId) return;

            dancers.forEach((dancer) => {
              const dancerId = dancerIdMap.get(dancer.id);
              if (!dancerId) return;

              const dancerData = formation[dancer.id];
              if (dancerData) {
                dancerPathsData.push({
                  formation_id: formationId,
                  dancer_id: dancerId,
                  raw_stage_path: dancerData.rawStagePath || null,
                  path_metadata: dancerData.pathMetadata || null,
                });
              }
            });
          });

          if (dancerPathsData.length > 0) {
            const { error: pathsError } = await supabase
              .from('dancer_paths')
              .insert(dancerPathsData);

            if (pathsError) throw pathsError;
          }
        }
      }

      return { id: projectId, success: true };
    } catch (error) {
      console.error('Error saving project:', error);
      throw error;
    }
  },

  /**
   * Load a choreography project by ID
   * @param {string} projectId - Project UUID
   * @returns {Promise<Object>} Complete project data
   */
  async loadProject(projectId) {
    try {
      // 1. Load project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      // 2. Load beat timestamps
      const { data: beatTimestamps, error: beatError } = await supabase
        .from('beat_timestamps')
        .select('*')
        .eq('project_id', projectId)
        .order('beat_index', { ascending: true });

      if (beatError) throw beatError;

      // 3. Load dancers
      const { data: dancers, error: dancersError } = await supabase
        .from('dancers')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index', { ascending: true });

      if (dancersError) throw dancersError;

      // 4. Load formations
      const { data: formations, error: formationsError } = await supabase
        .from('formations')
        .select('*')
        .eq('project_id', projectId)
        .order('display_order', { ascending: true });

      if (formationsError) throw formationsError;

      // 5. Load dancer paths
      const { data: dancerPaths, error: pathsError } = await supabase
        .from('dancer_paths')
        .select('*')
        .in('formation_id', formations.map(f => f.id));

      if (pathsError) throw pathsError;

      // Transform data back to application format
      const transformedDancers = dancers.map((dancer) => ({
        id: `dancer-${dancer.id}`, // Use a string ID for the frontend
        name: dancer.name,
        initialX: dancer.initial_x,
        initialY: dancer.initial_y,
        orderIndex: dancer.order_index,
        dbId: dancer.id, // Keep database ID for reference
      }));

      const transformedCustomGroups = formations.map((formation) => ({
        groupName: formation.name,
        color: formation.color,
        startTime: formation.start_time,
        endTime: formation.end_time,
        transitionStartTime: formation.transition_start_time,
        transitionEndTime: formation.transition_end_time,
        dbId: formation.id, // Keep database ID for reference
      }));

      // Build formations structure
      const transformedFormations = formations.map((formation) => {
        const formationObj = {};

        // Find all paths for this formation
        const pathsForFormation = dancerPaths.filter(
          (p) => p.formation_id === formation.id
        );

        pathsForFormation.forEach((path) => {
          // Find the dancer for this path
          const dancer = transformedDancers.find((d) => d.dbId === path.dancer_id);
          if (dancer) {
            formationObj[dancer.id] = {
              rawStagePath: path.raw_stage_path,
              pathMetadata: path.path_metadata,
            };
          }
        });

        return formationObj;
      });

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        bpm: project.bpm,
        audioFileName: project.audio_file_name,
        audioFileUrl: project.audio_file_url,
        beatTimestamps: beatTimestamps.map((bt) => bt.timestamp),
        customGroups: transformedCustomGroups,
        dancers: transformedDancers,
        formations: transformedFormations,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
      };
    } catch (error) {
      console.error('Error loading project:', error);
      throw error;
    }
  },

  /**
   * Get all projects (list view)
   * @returns {Promise<Array>} List of projects with basic info
   */
  async listProjects() {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, description, bpm, created_at, updated_at')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error listing projects:', error);
      throw error;
    }
  },

  /**
   * Delete a project
   * @param {string} projectId - Project UUID
   * @returns {Promise<boolean>} Success status
   */
  async deleteProject(projectId) {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  },
};
