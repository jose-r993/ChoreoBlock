import React, { useState } from "react";
import "../styles/DancerManagement.scss";

const dancerShapeOptions = [
  { id: "circle", label: "Circle" },
  { id: "triangle", label: "Triangle" },
  { id: "square", label: "Square" },
];

const dancerColorOptions = [
  { id: "#00AAFF", label: "Blue" },
  { id: "#FF00AA", label: "Pink" },
  { id: "#FFFFFF", label: "White" },
  { id: "#FF0000", label: "Red" },
];

const DancerManagement = ({
  dancers,
  onAddDancer,
  onRemoveDancer,
  onEditDancer,
}) => {
  const [newDancerName, setNewDancerName] = useState("");
  const [newDancerShape, setNewDancerShape] = useState("circle");
  const [newDancerColor, setNewDancerColor] = useState("#00AAFF");

  const handleAddDancer = () => {
    if (!newDancerName.trim()) return;

    const newDancer = {
      id: `dancer-${Date.now()}`,
      name: newDancerName,
      shape: newDancerShape,
      color: newDancerColor,
      x: 200, // Default center position
      y: 200,
    };

    onAddDancer(newDancer);
    setNewDancerName("");
  };

  // Render shape icon based on shape type
  const renderShapeIcon = (shape, color) => {
    switch (shape) {
      case "circle":
        return (
          <svg width="16" height="16" viewBox="0 0 16 16">
            <circle cx="8" cy="8" r="8" fill={color} />
          </svg>
        );
      case "triangle":
        return (
          <svg width="16" height="16" viewBox="0 0 16 16">
            <polygon points="8,0 16,16 0,16" fill={color} />
          </svg>
        );
      case "square":
        return (
          <svg width="16" height="16" viewBox="0 0 16 16">
            <rect x="0" y="0" width="16" height="16" fill={color} />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="dancer-management">
      <h3 className="section-title">Manage Dancers</h3>

      {/* Add Dancer Form */}
      <div className="add-dancer-form">
        <div className="form-row">
          <input
            type="text"
            value={newDancerName}
            onChange={(e) => setNewDancerName(e.target.value)}
            placeholder="Dancer Name"
            className="dancer-name-input"
          />
        </div>

        <div className="form-row">
          <div className="shape-selector">
            <label className="selector-label">Shape:</label>
            <div className="option-buttons">
              {dancerShapeOptions.map((option) => (
                <button
                  key={option.id}
                  className={`shape-option ${
                    newDancerShape === option.id ? "active" : ""
                  }`}
                  onClick={() => setNewDancerShape(option.id)}
                  title={option.label}
                >
                  {renderShapeIcon(option.id, newDancerColor)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="color-selector">
            <label className="selector-label">Color:</label>
            <div className="option-buttons">
              {dancerColorOptions.map((option) => (
                <button
                  key={option.id}
                  className={`color-option ${
                    newDancerColor === option.id ? "active" : ""
                  }`}
                  onClick={() => setNewDancerColor(option.id)}
                  style={{ backgroundColor: option.id }}
                  title={option.label}
                />
              ))}
            </div>
          </div>
        </div>

        <button className="add-dancer-button" onClick={handleAddDancer}>
          Add Dancer
        </button>
      </div>

      {/* Dancers List */}
      <div className="dancers-list-container">
        <h4 className="list-header">Current Dancers</h4>
        {dancers.length === 0 ? (
          <div className="empty-list">No dancers added yet.</div>
        ) : (
          <div className="dancers-list">
            {dancers.map((dancer) => (
              <div key={dancer.id} className="dancer-item">
                <div className="dancer-icon">
                  {renderShapeIcon(dancer.shape, dancer.color)}
                </div>
                <div className="dancer-name">{dancer.name}</div>
                <button
                  className="remove-button"
                  onClick={() => onRemoveDancer(dancer.id)}
                  title="Remove Dancer"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DancerManagement;
