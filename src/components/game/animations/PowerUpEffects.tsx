/**
 * PowerUp Visual Effects Component
 * Story 4.2, Task 6: Visual feedback for power-up activation and expiration
 */
import React, { useEffect, useState, useRef } from "react";
import { PowerUpType } from "../../../game/entities/PowerUp";
import { EffectType, PowerUpEffect } from "./PowerUpEffects.types";

// Props for the PowerUpEffects component
interface PowerUpEffectsProps {
  effects: PowerUpEffect[];
  onEffectComplete?: (effectId: string) => void;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
}

/**
 * PowerUpEffects Component
 * Renders visual effects for power-up events
 */
const PowerUpEffects: React.FC<PowerUpEffectsProps> = ({
  effects,
  onEffectComplete,
  canvasRef,
}) => {
  const [activeEffects, setActiveEffects] = useState<
    Map<string, PowerUpEffect>
  >(new Map());
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Effect colors by power-up type
  const getEffectColor = (
    powerUpType: PowerUpType,
    variant?: string,
  ): string => {
    const colorMap: {
      [type in PowerUpType]: string | { [variant: string]: string };
    } = {
      [PowerUpType.MultiBall]: "#ff6b6b",
      [PowerUpType.PaddleSize]: {
        large: "#4ecdc4",
        small: "#ff9f43",
      },
      [PowerUpType.BallSpeed]: {
        fast: "#45b7d1",
        slow: "#96ceb4",
      },
      [PowerUpType.Penetration]: "#96ceb4",
      [PowerUpType.Magnet]: "#feca57",
    };

    const mapping = colorMap[powerUpType];
    if (typeof mapping === "string") {
      return mapping;
    } else if (mapping && variant && mapping[variant]) {
      return mapping[variant];
    } else if (mapping) {
      return Object.values(mapping)[0];
    }
    return "#ffffff";
  };

  // Add new effects to active list
  useEffect(() => {
    effects.forEach((effect) => {
      if (!activeEffects.has(effect.id)) {
        setActiveEffects(
          (prev) =>
            new Map(
              prev.set(effect.id, {
                ...effect,
                duration: effect.duration || 1000,
              }),
            ),
        );
      }
    });
  }, [effects, activeEffects]);

  // Animation loop
  useEffect(() => {
    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      setActiveEffects((prev) => {
        const updated = new Map(prev);
        const toRemove: string[] = [];

        for (const [id, effect] of updated) {
          const newDuration = effect.duration - deltaTime;

          if (newDuration <= 0) {
            toRemove.push(id);
            if (onEffectComplete) {
              onEffectComplete(id);
            }
          } else {
            updated.set(id, { ...effect, duration: newDuration });
          }
        }

        toRemove.forEach((id) => updated.delete(id));
        return updated;
      });

      if (activeEffects.size > 0) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    if (activeEffects.size > 0) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [activeEffects.size, onEffectComplete]);

  // Render canvas-based effects if canvas ref is provided
  useEffect(() => {
    if (!canvasRef?.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear previous effects (this would be integrated with main game loop)
    // For now, we'll just overlay effects on top

    activeEffects.forEach((effect) => {
      renderCanvasEffect(ctx, effect);
    });
  }, [activeEffects, canvasRef]);

  // Render canvas effect
  const renderCanvasEffect = (
    ctx: CanvasRenderingContext2D,
    effect: PowerUpEffect,
  ) => {
    const progress = 1 - effect.duration / (effect.duration + 1000); // Normalized progress
    const { x, y } = effect.position;
    const color = getEffectColor(effect.powerUpType, effect.variant);

    ctx.save();

    switch (effect.type) {
      case EffectType.Collection:
        renderCollectionEffect(ctx, x, y, progress, color);
        break;
      case EffectType.Activation:
        renderActivationEffect(ctx, x, y, progress, color);
        break;
      case EffectType.Expiration:
        renderExpirationEffect(ctx, x, y, progress, color);
        break;
      case EffectType.Impact:
        renderImpactEffect(ctx, x, y, progress, color, effect.strength);
        break;
    }

    ctx.restore();
  };

  // Collection effect - power-up pickup
  const renderCollectionEffect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    progress: number,
    color: string,
  ) => {
    const radius = 30 * (1 - progress);
    const alpha = 1 - progress;

    // Outer glow
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(
      0,
      `${color}${Math.floor(alpha * 255)
        .toString(16)
        .padStart(2, "0")}`,
    );
    gradient.addColorStop(0.7, `${color}40`);
    gradient.addColorStop(1, `${color}00`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Sparkle particles
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + progress * Math.PI;
      const distance = 20 + progress * 15;
      const px = x + Math.cos(angle) * distance;
      const py = y + Math.sin(angle) * distance;
      const size = 2 * (1 - progress);

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // Activation effect - power-up starts
  const renderActivationEffect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    progress: number,
    color: string,
  ) => {
    const scale = 0.5 + progress * 1.5;
    const alpha = Math.sin(progress * Math.PI);

    // Expanding ring
    ctx.strokeStyle = `${color}${Math.floor(alpha * 128)
      .toString(16)
      .padStart(2, "0")}`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 25 * scale, 0, Math.PI * 2);
    ctx.stroke();

    // Energy burst lines
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const length = 15 * scale;
      const startX = x + Math.cos(angle) * 10;
      const startY = y + Math.sin(angle) * 10;
      const endX = x + Math.cos(angle) * (10 + length);
      const endY = y + Math.sin(angle) * (10 + length);

      ctx.strokeStyle = `${color}${Math.floor(alpha * 180)
        .toString(16)
        .padStart(2, "0")}`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
  };

  // Expiration effect - power-up ends
  const renderExpirationEffect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    progress: number,
    color: string,
  ) => {
    const alpha = 1 - progress;
    const radius = 20 + progress * 20;

    // Fading circle
    ctx.fillStyle = `${color}${Math.floor(alpha * 100)
      .toString(16)
      .padStart(2, "0")}`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Dissipating particles
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + progress * Math.PI * 0.5;
      const distance = progress * 30;
      const px = x + Math.cos(angle) * distance;
      const py = y + Math.sin(angle) * distance - progress * 10; // Drift upward
      const size = 1 * alpha;

      ctx.fillStyle = `${color}${Math.floor(alpha * 200)
        .toString(16)
        .padStart(2, "0")}`;
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // Impact effect - power-up affects entities
  const renderImpactEffect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    progress: number,
    color: string,
    strength?: number,
  ) => {
    const intensity = (strength || 1) * 0.5 + 0.5;
    const scale = 1 + progress * intensity;
    const alpha = Math.sin(progress * Math.PI) * intensity;

    // Impact shockwave
    ctx.strokeStyle = `${color}${Math.floor(alpha * 150)
      .toString(16)
      .padStart(2, "0")}`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, 15 * scale, 0, Math.PI * 2);
    ctx.stroke();

    // Secondary wave
    ctx.strokeStyle = `${color}${Math.floor(alpha * 80)
      .toString(16)
      .padStart(2, "0")}`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 25 * scale, 0, Math.PI * 2);
    ctx.stroke();
  };

  // DOM-based effects (overlays)
  const renderDOMEffect = (effect: PowerUpEffect) => {
    const progress = 1 - effect.duration / 1000;
    const color = getEffectColor(effect.powerUpType, effect.variant);

    const baseStyle: React.CSSProperties = {
      position: "absolute",
      left: effect.position.x,
      top: effect.position.y,
      pointerEvents: "none",
      zIndex: 1000,
      transform: "translate(-50%, -50%)",
    };

    switch (effect.type) {
      case EffectType.Collection:
        return (
          <div
            key={effect.id}
            style={{
              ...baseStyle,
              animation: "powerUpCollect 0.6s ease-out forwards",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: `radial-gradient(circle, ${color}80, ${color}00)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                transform: `scale(${1 - progress})`,
              }}
            >
              ✨
            </div>
          </div>
        );

      case EffectType.Activation:
        return (
          <div
            key={effect.id}
            style={{
              ...baseStyle,
              animation: "powerUpActivate 0.8s ease-out forwards",
            }}
          >
            <div
              style={{
                color,
                fontSize: "24px",
                textShadow: `0 0 10px ${color}`,
                fontWeight: "bold",
                transform: `scale(${0.5 + progress * 1.5})`,
              }}
            >
              POWER UP!
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {Array.from(activeEffects.values()).map(renderDOMEffect)}

      <style jsx>{`

        @keyframes powerUpCollect {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
        }

        @keyframes powerUpActivate {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
        }
      
`}</style>
    </div>
  );
};

export default PowerUpEffects;
