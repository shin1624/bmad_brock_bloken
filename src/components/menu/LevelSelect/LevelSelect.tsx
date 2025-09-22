import React from "react";
import { useLevelData } from "../../../hooks/useLevelData";
import { validateLevelName } from "../../../utils/inputValidation";
import type { LevelData, LevelProgress } from "../../../types/level.types";

export interface LevelSelectProps {
  onSelectLevel: (levelId: number) => void;
}

/**
 * Gets the completion status indicator for a level
 */
const getCompletionStatus = (
  level: LevelData,
  progress: LevelProgress | null,
): string => {
  if (!level.unlocked) return "🔒";

  const isCompleted = progress?.completedLevels?.includes(level.id);
  const hasScore = progress?.levelScores?.[level.id];

  if (isCompleted && hasScore) {
    // Check if score is above required for "perfect"
    if (level.requiredScore && hasScore >= level.requiredScore * 1.5) {
      return "⭐"; // Perfect completion
    }
    return "✅"; // Completed
  }

  return ""; // Available but not completed
};

/**
 * Safely renders level name with validation
 */
const renderLevelName = (name: string): string => {
  const validation = validateLevelName(name);
  return validation.sanitized || "Unknown Level";
};

export const LevelSelect: React.FC<LevelSelectProps> = () => {
  const { levels, progress } = useLevelData();

  return (
    <div>
      <h2>レベル選択</h2>
      <div>
        {levels.map((level) => (
          <div key={level.id}>
            <div>{renderLevelName(level.name)}</div>
            <div>{level.difficulty === "easy" ? "Easy" : level.difficulty}</div>
            <div>{getCompletionStatus(level, progress)}</div>
            {level.bestScore && (
              <div>Best: {level.bestScore.toLocaleString()}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
