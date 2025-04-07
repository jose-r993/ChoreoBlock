import React, { useState } from "react";
import CustomBeatGroups from "./CustomBeatGroups";
import PlaybackControls from "./PlaybackControls";
import DancerManagement from "./DancerManagement";
import "../styles/SideBar.scss";
import volumeIcon from "../assets/volumeIcon.svg";
import stylusIcon from "../assets/stylusIcon.svg";
import dancerIcon from "../assets/dancerIcon.svg";

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
  onAddDancer,
  onRemoveDancer,
  onEditDancer,
}) => {
  const [activeTab, setActiveTab] = useState("beatGroups"); // Default to beat groups tab for choreography

  const handleGroupLengthChange = (e) => {
    const value = parseInt(e.target.value, 10) || ""; // Empty string if parsing fails
    onGroupLengthChange(value);
  };

  const handleInitialGroupStartChange = (e) => {
    const value = parseInt(e.target.value, 10) || 1; // Default to 1 if invalid
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
      icon: dancerIcon || stylusIcon, // Fallback to stylusIcon if dancerIcon is missing
      component: (
        <DancerManagement
          dancers={dancers}
          onAddDancer={onAddDancer}
          onRemoveDancer={onRemoveDancer}
          onEditDancer={onEditDancer}
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
