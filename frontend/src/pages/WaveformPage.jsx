import React, { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "react-router";
import Waveform from "../components/Waveform";
import SideBar from "../components/SideBar";
import Stage from "../components/Stage";
import SaveProjectModal from "../components/SaveProjectModal";
import LoadProjectModal from "../components/LoadProjectModal";
import useFormationController from "../components/FormationController";
import { choreographyService } from "../services/choreographyService";
import "../styles/WaveformPage.scss";

const MARKER_COLORS = ["#FF5500", "#00AAFF", "#22CCAA", "#FFAA00", "#FF00AA"];
const STAGE_WIDTH = 1600;
const STAGE_HEIGHT = 780;
const DANCER_SIZE = 24;
const SIDE_MARGIN = 60;
const VERTICAL_MARGIN = 40;

const WaveformPage = () => {
  const location = useLocation();
  const { audioFile, bpm, beatTimestamps = [], loadedProject } = location.state || {};
  const wavesurferRef = useRef(null);
  const nextDancerIndexRef = useRef(0);

  // Project state - initialize from loadedProject if available
  const [projectId, setProjectId] = useState(loadedProject?.id || null);
  const [projectName, setProjectName] = useState(loadedProject?.name || '');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.25);

  const [groupSize, setGroupSize] = useState(8);
  const [markerOffset, setMarkerOffset] = useState(0);
  const [subdivisionFactor, setSubdivisionFactor] = useState(1);
  const [customGroups, setCustomGroups] = useState(
    location.state?.customGroups || []
  );
  const [newGroupColor, setNewGroupColor] = useState(MARKER_COLORS[0]);
  const [groupLengthInput, setGroupLengthInput] = useState("");
  const [initialGroupStart, setInitialGroupStart] = useState("1");
  const [activeGroupIndex, setActiveGroupIndex] = useState(null);

  const [dancers, setDancers] = useState(loadedProject?.dancers || []);
  const [formations, setFormations] = useState(loadedProject?.formations || []);

  const [pathMode, setPathMode] = useState("auto");
  const [selectedDancerIds, setSelectedDancerIds] = useState(new Set());

  // Initialize nextDancerIndexRef from loaded project
  useEffect(() => {
    if (loadedProject?.dancers && loadedProject.dancers.length > 0) {
      const maxIndex = Math.max(...loadedProject.dancers.map(d => d.orderIndex));
      nextDancerIndexRef.current = maxIndex + 1;
    }
  }, []);

  useEffect(() => {
    setFormations((prevFormations) => {
      const targetLength = customGroups.length;
      const newFormations = prevFormations.slice(0, targetLength);
      while (newFormations.length < targetLength) {
        const newFormationEntry = {};
        dancers.forEach((dancer) => {
          newFormationEntry[dancer.id] = { rawStagePath: null };
        });
        newFormations.push(newFormationEntry);
      }
      return newFormations;
    });
  }, [customGroups.length, dancers]);

  const handleUpdateFormation = useCallback(
    (groupIndex, updatedFormationDataFromHook) => {
      if (groupIndex === null || groupIndex < 0) return;
      setFormations((prevFormations) => {
        const newFormations = [...prevFormations];
        if (groupIndex >= newFormations.length) {
          while (newFormations.length <= groupIndex) {
            newFormations.push({});
          }
        }
        if (
          typeof updatedFormationDataFromHook === "object" &&
          updatedFormationDataFromHook !== null &&
          !Array.isArray(updatedFormationDataFromHook)
        ) {
          newFormations[groupIndex] = updatedFormationDataFromHook;
        } else {
          console.error(
            "WaveformPage: Malformed updatedFormationDataFromHook received",
            updatedFormationDataFromHook
          );
          newFormations[groupIndex] = prevFormations[groupIndex] || {};
        }
        return newFormations;
      });
    },
    []
  );

  const [initialPositions, setInitialPositions] = useState({});
  useEffect(() => {
    const newInitialPositions = dancers.reduce((acc, dancer) => {
      acc[dancer.id] = { x: dancer.initialX || 200, y: dancer.initialY || 200 };
      return acc;
    }, {});
    setInitialPositions(newInitialPositions);
  }, [dancers]);

  const formationController = useFormationController({ 
    dancers,
    formations,
    customGroups,
    beatTimestamps,
    currentTime,
    activeGroupIndex,
    onUpdateFormation: handleUpdateFormation,
    initialPositions: initialPositions,
  });

  const handleDancersSelected = useCallback((newlySelectedIdsSet) => {
    setSelectedDancerIds(newlySelectedIdsSet);
  }, []);

  const handlePathApplication = useCallback(
    (initiatingDancerId, gesturePath, pathKind, pathSubKind) => {
      console.log("WAVEFORMPAGE: handlePathApplication", {
        initiatingDancerId,
        gesturePath,
        pathKind,
        pathSubKind,
        activeGroupIndex,
        selectedDancerIds: Array.from(selectedDancerIds),
      });

      if (activeGroupIndex === null) return;

      if (gesturePath === null && initiatingDancerId) {
        formationController.addDancerPath(initiatingDancerId, null, "direct");
        return;
      }

      if (!gesturePath || gesturePath.length === 0) {
        return;
      }

      const currentSelectedIds = selectedDancerIds;

      let effectivePathMode = "direct";
      if (pathKind === "curve") {
        effectivePathMode = "curved";
      } else if (pathKind === "straight") {
        effectivePathMode = "direct";
      }

      if (
        currentSelectedIds &&
        currentSelectedIds.size > 0 &&
        !(
          currentSelectedIds.size === 1 &&
          currentSelectedIds.has(initiatingDancerId)
        )
      ) {
        const gestureStartPoint = gesturePath[0];
        if (
          !gestureStartPoint ||
          typeof gestureStartPoint.x !== "number" ||
          typeof gestureStartPoint.y !== "number"
        ) {
          return;
        }

        currentSelectedIds.forEach((selectedDancerId) => {
          const dancerActualStart =
            formationController.getActualStartForFormation(
              selectedDancerId,
              activeGroupIndex
            );
          if (
            !dancerActualStart ||
            typeof dancerActualStart.x !== "number" ||
            typeof dancerActualStart.y !== "number"
          ) {
            return;
          }

          const deltaX = dancerActualStart.x - gestureStartPoint.x;
          const deltaY = dancerActualStart.y - gestureStartPoint.y;

          const individualPath = gesturePath.map((p) => ({
            x: p.x + deltaX,
            y: p.y + deltaY,
          }));

          formationController.addDancerPath(
            selectedDancerId,
            individualPath,
            effectivePathMode,
            { pathKind, pathSubKind }
          );
        });
      } else if (initiatingDancerId) {
        formationController.addDancerPath(
          initiatingDancerId,
          gesturePath,
          effectivePathMode,
          { pathKind, pathSubKind }
        );
      }
    },
    [activeGroupIndex, selectedDancerIds, formationController]
  );

  const handlePathModeChange = useCallback((mode) => {
    console.log("WAVEFORMPAGE: Path mode changed to:", mode);
    setPathMode(mode);
  }, []);

  const updateWavesurfer = useCallback((callback) => {
    if (wavesurferRef.current) callback(wavesurferRef.current);
  }, []);
  const togglePlayPause = useCallback(() => {
    updateWavesurfer((ws) => {
      ws.playPause();
      setIsPlaying(ws.isPlaying());
    });
  }, [updateWavesurfer]);
  const handleVolumeChange = useCallback(
    (newVolume) => {
      setVolume(newVolume);
      updateWavesurfer((ws) => {
        ws.setVolume(newVolume);
      });
    },
    [updateWavesurfer]
  );
  const handleGroupSizeChange = useCallback((event) => {
    setGroupSize(parseInt(event.target.value, 10));
  }, []);
  const handleOffsetChange = useCallback((value) => {
    setMarkerOffset(value);
  }, []);
  const handleSubdivisionChange = useCallback((event) => {
    setSubdivisionFactor(parseInt(event.target.value, 10));
  }, []);

  const handleAddGroup = useCallback(
    (newGroupData) => {
      // Calculate startTime based on the last group's endTime, or 0 if first group
      let startTime = 0;
      if (customGroups.length > 0) {
        const lastGroup = customGroups[customGroups.length - 1];
        startTime = lastGroup.endTime || 0;
      }

      // Default duration is ~8 seconds
      const defaultDuration = 8;
      const endTime = startTime + defaultDuration;

      // Default transition: last 2 seconds before the end
      const defaultTransitionDuration = Math.min(2, defaultDuration);
      const defaultTransitionStartTime = endTime - defaultTransitionDuration;
      const defaultTransitionEndTime = endTime;

      const addedGroup = {
        ...newGroupData,
        startTime: newGroupData.startTime ?? startTime,
        endTime: newGroupData.endTime ?? endTime,
        transitionStartTime: newGroupData.transitionStartTime ?? defaultTransitionStartTime,
        transitionEndTime: newGroupData.transitionEndTime ?? defaultTransitionEndTime,
      };

      const newGroupIndex = customGroups.length;
      setCustomGroups((prevGroups) => [...prevGroups, addedGroup]);
      setActiveGroupIndex(newGroupIndex);
    },
    [customGroups]
  );

  const handleUpdateGroup = useCallback(
    (index, updatedGroup) => {
      if (index < 0 || index >= customGroups.length) return;
      setCustomGroups((prev) => {
        const ng = [...prev];
        ng[index] = updatedGroup;
        return ng;
      });
    },
    [customGroups.length]
  );

  const handleRemoveGroup = useCallback(
    (indexToRemove) => {
      setCustomGroups((prev) => prev.filter((_, idx) => idx !== indexToRemove));
      if (activeGroupIndex === indexToRemove) setActiveGroupIndex(null);
      else if (activeGroupIndex !== null && activeGroupIndex > indexToRemove)
        setActiveGroupIndex(activeGroupIndex - 1);
    },
    [activeGroupIndex]
  );

  const handleClearCustomGroups = useCallback(() => {
    setCustomGroups([]);
    setActiveGroupIndex(null);
    setSelectedDancerIds(new Set());
  }, []);

  const handleNewGroupColorChange = useCallback((event) => {
    setNewGroupColor(event.target.value);
  }, []);
  const handleTimeUpdate = useCallback((time) => {
    setCurrentTime(time);
  }, []);
  const setWavesurferRef = useCallback((instance) => {
    wavesurferRef.current = instance;
  }, []);

  const handleJumpToPosition = useCallback((timestamp, index) => {
    if (!wavesurferRef.current || typeof timestamp !== "number") return;
    const duration = wavesurferRef.current.getDuration();
    if (duration > 0) wavesurferRef.current.seekTo(timestamp / duration);
    setActiveGroupIndex(index);
  }, []);

  const calculateInitialDancerPosition = useCallback((index) => {
    const dancersPerSide = 5;
    const totalInitialDancers = dancersPerSide * 2;

    const usableHeight = STAGE_HEIGHT - 2 * VERTICAL_MARGIN;
    const verticalSpacing = usableHeight / (dancersPerSide - 1);

    if (index < totalInitialDancers) {
      const isLeft = index % 2 === 0;
      const sideIndex = Math.floor(index / 2);

      const x = isLeft ? SIDE_MARGIN : STAGE_WIDTH - SIDE_MARGIN - DANCER_SIZE;
      const y = VERTICAL_MARGIN + sideIndex * verticalSpacing;

      return { x, y };
    } else {
      const adjustedIndex = index - totalInitialDancers;
      const isLeft = adjustedIndex % 2 === 0;
      const sideIndex = Math.floor(adjustedIndex / 2);

      const x = isLeft ? SIDE_MARGIN : STAGE_WIDTH - SIDE_MARGIN - DANCER_SIZE;
      const y =
        VERTICAL_MARGIN + verticalSpacing / 2 + sideIndex * verticalSpacing;

      return { x, y };
    }
  }, []);

  const handleAddDancer = useCallback(
    (newDancerData) => {
      const position = calculateInitialDancerPosition(
        nextDancerIndexRef.current
      );

      const dancerWithId = {
        ...newDancerData,
        id: newDancerData.id || `dancer-${Date.now()}`,
        initialX: position.x,
        initialY: position.y,
        orderIndex: nextDancerIndexRef.current,
      };

      nextDancerIndexRef.current += 1;
      setDancers((prevDancers) => [...prevDancers, dancerWithId]);
    },
    [calculateInitialDancerPosition]
  );

  const handleRemoveDancer = useCallback((dancerIdToRemove) => {
    setDancers((prevDancers) =>
      prevDancers.filter((d) => d.id !== dancerIdToRemove)
    );

    setFormations((prevFormations) =>
      prevFormations.map((fo) => {
        const newFo = { ...fo };
        delete newFo[dancerIdToRemove];
        return newFo;
      })
    );
    setSelectedDancerIds((prevSelected) => {
      const newSelected = new Set(prevSelected);
      newSelected.delete(dancerIdToRemove);
      return newSelected;
    });
  }, []);

  const handleSetDancerStaticHold = useCallback(
    (dancerId, x, y, groupIndex) => {
      if (groupIndex === null || groupIndex < 0) return;
      formationController.addDancerPath(dancerId, null, "direct");
    },
    [formationController]
  );

  const handleUpdateDancerPosition = useCallback((dancerId, x, y) => {
    setDancers((prevDancers) =>
      prevDancers.map((dancer) =>
        dancer.id === dancerId
          ? { ...dancer, initialX: x, initialY: y }
          : dancer
      )
    );
  }, []);

  const handleSelectFormation = (index) => {
    setActiveGroupIndex(index);
    if (
      index !== null &&
      customGroups[index] &&
      typeof customGroups[index].startTime === 'number'
    ) {
      const group = customGroups[index];
      const timestamp = group.startTime;
      handleJumpToPosition(timestamp, index);
    }
    setSelectedDancerIds(new Set());
  };

  // Save project handler
  const handleSaveProject = async ({ name, description }) => {
    try {
      const projectData = {
        id: projectId, // null for new projects, existing ID for updates
        name,
        description,
        bpm,
        audioFileName: audioFile?.name,
        audioFileUrl: null, // TODO: Implement audio file upload to Supabase Storage
        beatTimestamps,
        customGroups,
        dancers,
        formations,
      };

      const result = await choreographyService.saveProject(projectData);
      setProjectId(result.id);
      setProjectName(name);
      alert(`Project "${name}" saved successfully!`);
    } catch (error) {
      console.error('Failed to save project:', error);
      throw error;
    }
  };

  // Load project handler
  const handleLoadProject = (loadedProject) => {
    try {
      setProjectId(loadedProject.id);
      setProjectName(loadedProject.name);
      setCustomGroups(loadedProject.customGroups);
      setDancers(loadedProject.dancers);
      setFormations(loadedProject.formations);

      // Update nextDancerIndexRef
      if (loadedProject.dancers.length > 0) {
        const maxIndex = Math.max(...loadedProject.dancers.map(d => d.orderIndex));
        nextDancerIndexRef.current = maxIndex + 1;
      }

      alert(`Project "${loadedProject.name}" loaded successfully!`);
    } catch (error) {
      console.error('Failed to load project:', error);
      throw error;
    }
  };

  if (!audioFile || !beatTimestamps || beatTimestamps.length === 0) {
    return (
      <div className="waveform-page empty-state">
        <h2>No audio file loaded or beat timestamps missing</h2>
        <p>Please upload an audio file and ensure beat data is processed.</p>
      </div>
    );
  }

  return (
    <div className="waveform-page">
      <div className="main-content">
        <div className="sidebar">
          <SideBar
            volume={volume}
            onVolumeChange={handleVolumeChange}
            groupSize={groupSize}
            onGroupSizeChange={handleGroupSizeChange}
            markerOffset={markerOffset}
            onOffsetChange={handleOffsetChange}
            subdivisionFactor={subdivisionFactor}
            onSubdivisionChange={handleSubdivisionChange}
            customGroups={customGroups}
            onAddGroup={handleAddGroup}
            onUpdateGroup={handleUpdateGroup}
            onRemoveGroup={handleRemoveGroup}
            onClearGroups={handleClearCustomGroups}
            newGroupColor={newGroupColor}
            onNewGroupColorChange={handleNewGroupColorChange}
            groupLengthInput={groupLengthInput}
            onGroupLengthChange={setGroupLengthInput}
            initialGroupStart={initialGroupStart}
            onInitialGroupStartChange={setInitialGroupStart}
            markerColors={MARKER_COLORS}
            currentTime={currentTime}
            bpm={bpm}
            beatTimestamps={beatTimestamps}
            onJumpToPosition={handleJumpToPosition}
            activeGroupIndex={activeGroupIndex}
            dancers={dancers}
            onAddDancer={handleAddDancer}
            onRemoveDancer={handleRemoveDancer}
            formations={formations}
            currentPathMode={pathMode}
            onPathModeChange={handlePathModeChange}
            onAddDancerPathForSidebar={formationController.addDancerPath}
            selectedDancerIds={selectedDancerIds}
            onDancersSelected={handleDancersSelected}
            onSaveProject={() => setIsSaveModalOpen(true)}
            onLoadProject={() => setIsLoadModalOpen(true)}
            projectName={projectName}
            audioFileName={audioFile?.name}
          />
        </div>
        <Stage
          dancers={dancers}
          activeGroupIndex={activeGroupIndex}
          customGroups={customGroups}
          currentTimelineState={formationController.currentTimelineState}
          getDancerPosition={formationController.getDancerPosition}
          onSetDancerPosition={handleSetDancerStaticHold}
          onSavePath={handlePathApplication}
          pathMode={pathMode}
          isStageInPathDrawingMode={activeGroupIndex !== null}
          selectedDancerIds={selectedDancerIds}
          onDancersSelected={handleDancersSelected}
          getActualStartForFormation={
            formationController.getActualStartForFormation
          }
          getActualEndForFormation={
            formationController.getActualEndForFormation
          }
          formations={formations}
          onUpdateDancerPosition={handleUpdateDancerPosition}
        />
      </div>
      <div className="waveform-container">
        <Waveform
          audioFile={audioFile}
          beatTimestamps={beatTimestamps}
          onPlayPause={togglePlayPause}
          isPlaying={isPlaying}
          bpm={bpm}
          groupSize={groupSize}
          onTimeUpdate={handleTimeUpdate}
          onWavesurferInit={setWavesurferRef}
          markerOffset={markerOffset}
          subdivisionFactor={subdivisionFactor}
          customGroups={customGroups}
          onUpdateGroup={handleUpdateGroup}
          onAddGroup={handleAddGroup}
          onSelectGroup={handleSelectFormation}
          currentTime={currentTime}
          volume={volume}
          activeGroupIndex={activeGroupIndex}
        />
      </div>

      {/* Save and Load Modals */}
      <SaveProjectModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={handleSaveProject}
        currentProjectName={projectName}
      />

      <LoadProjectModal
        isOpen={isLoadModalOpen}
        onClose={() => setIsLoadModalOpen(false)}
        onLoad={handleLoadProject}
      />
    </div>
  );
};

export default WaveformPage;
