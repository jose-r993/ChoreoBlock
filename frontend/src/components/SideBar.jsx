import React, { useState } from "react";
import CustomBeatGroups from "./CustomBeatGroups";
import DancerManagement from "./DancerManagement";
import TransitionControls from "./TransitionControls";
import PathDrawing from "./PathDrawing";
import "../styles/SideBar.scss";
import stylusIcon from "../assets/stylusIcon.svg";
import dancerIcon from "../assets/dancerIcon.svg";

const SideBar = ({
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
  currentPathMode,
  onPathModeChange,
  onAddDancerPathForSidebar,
  selectedDancerIds,
  onDancersSelected,
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
          onUpdateGroup={onUpdateGroup}
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
      id: "paths",
      label: "Paths",
      icon: stylusIcon,
      component: (
        <PathDrawing
          dancers={dancers}
          activeGroupIndex={activeGroupIndex}
          formations={formations}
          onAddDancerPathForSidebar={onAddDancerPathForSidebar}
          onPathModeChange={onPathModeChange}
          currentPathMode={currentPathMode}
          selectedDancerIds={selectedDancerIds}
          onDancersSelected={onDancersSelected}
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
