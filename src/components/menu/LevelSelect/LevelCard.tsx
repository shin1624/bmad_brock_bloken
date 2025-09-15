import React from "react";

export const LevelCard = ({ level }) => {
  return (
    <div>
      <div>{level.name}</div>
      <div>{level.difficulty === "easy" ? "Easy" : level.difficulty}</div>
    </div>
  );
};
