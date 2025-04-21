import React, { useState } from "react";
import CustomBeatGroups from "./CustomBeatGroups";
import PlaybackControls from "./PlaybackControls";
import DancerManagement from "./DancerManagement";
import TransitionControls from "./TransitionControls";
import PathDrawing from "./PathDrawing";
import "../styles/SideBar.scss";
import volumeIcon from "../assets/volumeIcon.svg";
import stylusIcon from "../assets/stylusIcon.svg";
import dancerIcon from "../assets/dancerIcon.svg";
// import transitionIcon from "../assets/transitionIcon.svg"; // Add this icon to assets
// import pathIcon from "../assets/pathIcon.svg"; // Add this icon to assets

const SideBar = ({
  currentZoom,
  onZoomChange,
  volume,
  onVolumeChange,
  groupSize,
  onGroupSizeChange,
  markerOffset,
  onOffsetChange,
  subdivisionFactor,
  onSubdivisionChange,
  customGroups,
  onAddGroup,
  onUpdateGroup,
  onRemoveGroup,
  onClearGroups,
  newGroupColor,
  onNewGroupColorChange,
  groupLengthInput,
  onGroupLengthChange,
  initialGroupStart,
  onInitialGroupStartChange,
  markerColors,
  beatTimestamps = [],
  onJumpToPosition,
  activeGroupIndex,
  dancers,
  formations,
  onAddDancer,
  onRemoveDancer,
  onEditDancer,
  onUpdateFormation,
  setDancerTransitionType,
  onAddDancerPath,
}) => {
  const [activeTab, setActiveTab] = useState("beatGroups");

  const handleGroupLengthChange = (e) => {
    const value = parseInt(e.target.value, 10) || "";
    onGroupLengthChange(value);
  };

  const handleInitialGroupStartChange = (e) => {
    const value = parseInt(e.target.value, 10) || 1;
    onInitialGroupStartChange(value);
  };

  const handleAddGroup = (newGroup) => {
    onAddGroup(newGroup);
  };

  const tabs = [
    {
      id: "playback",
      label: "Playback",
      icon: volumeIcon,
      component: (
        <PlaybackControls
          currentZoom={currentZoom}
          onZoomChange={onZoomChange}
          volume={volume}
          onVolumeChange={onVolumeChange}
          groupSize={groupSize}
          onGroupSizeChange={onGroupSizeChange}
          markerOffset={markerOffset}
          onOffsetChange={onOffsetChange}
          subdivisionFactor={subdivisionFactor}
          onSubdivisionChange={onSubdivisionChange}
          beatTimestamps={beatTimestamps}
        />
      ),
    },
    {
      id: "beatGroups",
      label: "Beat Groups",
      icon: stylusIcon,
      component: (
        <CustomBeatGroups
          customGroups={customGroups}
          onAddGroup={handleAddGroup}
          onRemoveGroup={onRemoveGroup}
          onClearGroups={onClearGroups}
          newGroupColor={newGroupColor}
          onNewGroupColorChange={onNewGroupColorChange}
          groupLengthInput={groupLengthInput}
          onGroupLengthChange={handleGroupLengthChange}
          initialGroupStart={initialGroupStart}
          onInitialGroupStartChange={handleInitialGroupStartChange}
          markerColors={markerColors}
          beatTimestamps={beatTimestamps}
          onJumpToPosition={onJumpToPosition}
          activeGroupIndex={activeGroupIndex}
        />
      ),
    },
    {
      id: "dancers",
      label: "Dancers",
      icon: dancerIcon || stylusIcon,
      component: (
        <DancerManagement
          dancers={dancers}
          onAddDancer={onAddDancer}
          onRemoveDancer={onRemoveDancer}
          onEditDancer={onEditDancer}
        />
      ),
    },
    {
      id: "transitions",
      label: "Transitions",
      icon: stylusIcon,
      component: (
        <TransitionControls
          activeGroupIndex={activeGroupIndex}
          customGroups={customGroups}
          formations={formations}
          dancers={dancers}
          onUpdateGroup={onUpdateGroup}
          onUpdateFormation={onUpdateFormation}
          setDancerTransitionType={setDancerTransitionType}
        />
      ),
    },
    {
      id: "paths",
      label: "Paths",
      icon: dancerIcon,
      component: (
        <PathDrawing
          dancers={dancers}
          activeGroupIndex={activeGroupIndex}
          formations={formations}
          onAddDancerPath={onAddDancerPath}
        />
      ),
    },
  ];

  return (
    <>
      <div className="tabs-header">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
            title={tab.label}
          >
            <img className="tab-icon" src={tab.icon} alt={tab.label} />
          </button>
        ))}
      </div>
      <div className="tab-content">
        {tabs.find((tab) => tab.id === activeTab)?.component}
      </div>
    </>
  );
};

export default SideBar;
