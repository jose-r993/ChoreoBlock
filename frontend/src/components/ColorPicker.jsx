import React from "react";
import "../styles/ColorPicker.scss";

const ColorPicker = ({ colors, selectedColor, onColorChange }) => {
  return (
    <div className="color-picker">
      <div className="color-grid">
        {colors.map((color, index) => (
          <div
            key={index}
            className={`color-swatch ${
              selectedColor === color ? "selected" : ""
            }`}
            style={{ backgroundColor: color }}
            onClick={() => onColorChange(color)}
            title={`Color ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default ColorPicker;
