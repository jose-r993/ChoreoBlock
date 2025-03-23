import React, { useState } from "react";
import CustomBeatGroups from "./CustomBeatGroups";
import PlaybackControls from "./PlaybackControls";
import "../styles/SideBar.scss";

const SideBar = ({
  isPlaying,
  onPlayPause,
  currentZoom,
  onZoomChange,
  volume,
  onVolumeChange,
  currentTime,
  bpm,
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
}) => {
  const [activeTab, setActiveTab] = useState("playback");
  const handleGroupLengthChange = (e) => onGroupLengthChange(e.target.value);
  const handleInitialGroupStartChange = (e) =>
    onInitialGroupStartChange(e.target.value);

  const tabs = [
    {
      id: "playback",
      label: "Playback",
      icon: "🎵",
      component: (
        <PlaybackControls
          isPlaying={isPlaying}
          onPlayPause={onPlayPause}
          currentZoom={currentZoom}
          onZoomChange={onZoomChange}
          volume={volume}
          onVolumeChange={onVolumeChange}
          currentTime={currentTime}
          bpm={bpm}
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
      icon: "📋",
      component: (
        <CustomBeatGroups
          customGroups={customGroups}
          onAddGroup={onAddGroup}
          onRemoveGroup={onRemoveGroup}
          onClearGroups={onClearGroups}
          newGroupColor={newGroupColor}
          onNewGroupColorChange={onNewGroupColorChange}
          groupLengthInput={groupLengthInput}
          onGroupLengthChange={handleGroupLengthChange}
          initialGroupStart={initialGroupStart}
          onInitialGroupStartChange={handleInitialGroupStartChange}
          markerColors={markerColors}
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
            <span className="tab-icon">{tab.icon}</span>
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
