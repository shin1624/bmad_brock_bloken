/**
 * PowerUp Animations Component
 * Handles spawn, pickup, and effect activation animations for power-ups
 * Story 4.1, Task 4: Power-up spawn and pickup animations
 */
import React, { useEffect, useState, useCallback, useRef } from "react";
import { PowerUpType } from "../HUD/PowerUpStatus";

// Animation types
export enum PowerUpAnimationType {
  Spawn = "spawn",
  Pickup = "pickup",
  Activate = "activate",
  Expire = "expire",
}

// Animation event interface
export interface PowerUpAnimationEvent {
  id: string;
  type: PowerUpAnimationType;
  powerUpType: PowerUpType;
  position: { x: number; y: number };
  color: string;
  icon: string;
  duration?: number;
}

// Props interface
interface PowerUpAnimationsProps {
  animations: PowerUpAnimationEvent[];
  onAnimationComplete?: (animationId: string) => void;
  containerRef?: React.RefObject<HTMLElement>;
}

// Individual animation component
interface AnimationItemProps {
  animation: PowerUpAnimationEvent;
  onComplete: (id: string) => void;
  containerBounds?: DOMRect;
}

const AnimationItem: React.FC<AnimationItemProps> = ({
  animation,
  onComplete,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const animationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const duration = animation.duration || getDefaultDuration(animation.type);

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onComplete(animation.id), 100); // Small delay for fade out
    }, duration);

    return () => clearTimeout(timer);
  }, [animation, onComplete]);

  const getDefaultDuration = (type: PowerUpAnimationType): number => {
    switch (type) {
      case PowerUpAnimationType.Spawn:
        return 1000;
      case PowerUpAnimationType.Pickup:
        return 800;
      case PowerUpAnimationType.Activate:
        return 600;
      case PowerUpAnimationType.Expire:
        return 500;
      default:
        return 800;
    }
  };

  const getAnimationStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      position: "absolute",
      left: animation.position.x,
      top: animation.position.y,
      pointerEvents: "none",
      zIndex: 1000,
      transform: "translate(-50%, -50%)",
      opacity: isVisible ? 1 : 0,
      transition: "opacity 0.1s ease-out",
    };

    switch (animation.type) {
      case PowerUpAnimationType.Spawn:
        return {
          ...baseStyles,
          animation:
            "powerUpSpawnEffect 1s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        };

      case PowerUpAnimationType.Pickup:
        return {
          ...baseStyles,
          animation:
            "powerUpPickupEffect 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        };

      case PowerUpAnimationType.Activate:
        return {
          ...baseStyles,
          animation:
            "powerUpActivateEffect 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        };

      case PowerUpAnimationType.Expire:
        return {
          ...baseStyles,
          animation: "powerUpExpireEffect 0.5s ease-out",
        };

      default:
        return baseStyles;
    }
  };

  const getIconStyles = (): React.CSSProperties => {
    return {
      fontSize: "24px",
      color: animation.color,
      textShadow: `0 0 12px ${animation.color}`,
      filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))",
    };
  };

  const getParticleElements = () => {
    if (animation.type === PowerUpAnimationType.Pickup) {
      // Create particle burst effect for pickup
      return Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: "4px",
            height: "4px",
            backgroundColor: animation.color,
            borderRadius: "50%",
            animation: `pickupParticle${i} 0.8s ease-out`,
            boxShadow: `0 0 4px ${animation.color}`,
          }}
        />
      ));
    }

    if (animation.type === PowerUpAnimationType.Activate) {
      // Create ripple effect for activation
      return (
        <div
          style={{
            position: "absolute",
            width: "60px",
            height: "60px",
            border: `2px solid ${animation.color}`,
            borderRadius: "50%",
            animation: "activateRipple 0.6s ease-out",
            opacity: 0.7,
          }}
        />
      );
    }

    return null;
  };

  return (
    <div ref={animationRef} style={getAnimationStyles()}>
      {/* Main icon */}
      <div style={getIconStyles()}>{animation.icon}</div>

      {/* Particle effects */}
      {getParticleElements()}

      {/* Glow effect */}
      <div
        style={{
          position: "absolute",
          width: "40px",
          height: "40px",
          backgroundColor: animation.color,
          borderRadius: "50%",
          opacity: 0.3,
          filter: "blur(8px)",
          animation:
            animation.type === PowerUpAnimationType.Spawn
              ? "spawnGlow 1s ease-out"
              : "defaultGlow 0.8s ease-out",
        }}
      />
    </div>
  );
};

const PowerUpAnimations: React.FC<PowerUpAnimationsProps> = ({
  animations,
  onAnimationComplete,
  containerRef,
}) => {
  const [activeAnimations, setActiveAnimations] = useState<
    PowerUpAnimationEvent[]
  >([]);
  const [containerBounds, setContainerBounds] = useState<DOMRect | undefined>();

  // Update container bounds when container changes
  useEffect(() => {
    if (containerRef?.current) {
      const updateBounds = () => {
        setContainerBounds(containerRef.current?.getBoundingClientRect());
      };

      updateBounds();
      window.addEventListener("resize", updateBounds);
      return () => window.removeEventListener("resize", updateBounds);
    }
  }, [containerRef]);

  // Add new animations
  useEffect(() => {
    setActiveAnimations((prev) => {
      const newAnimations = animations.filter(
        (anim) => !prev.some((existing) => existing.id === anim.id),
      );
      return [...prev, ...newAnimations];
    });
  }, [animations]);

  // Handle animation completion
  const handleAnimationComplete = useCallback(
    (animationId: string) => {
      setActiveAnimations((prev) =>
        prev.filter((anim) => anim.id !== animationId),
      );
      onAnimationComplete?.(animationId);
    },
    [onAnimationComplete],
  );

  if (activeAnimations.length === 0) {
    return null;
  }

  return (
    <>
      {/* Render active animations */}
      {activeAnimations.map((animation) => (
        <AnimationItem
          key={animation.id}
          animation={animation}
          onComplete={handleAnimationComplete}
          containerBounds={containerBounds}
        />
      ))}

      {/* Animation keyframes */}
      <style>{`
        @keyframes powerUpSpawnEffect {
          0% {
            transform: translate(-50%, -50%) scale(0.3) rotate(0deg);
            opacity: 0;
            filter: blur(4px);
          }
          50% {
            transform: translate(-50%, -60%) scale(1.2) rotate(180deg);
            opacity: 1;
            filter: blur(1px);
          }
          100% {
            transform: translate(-50%, -50%) scale(1) rotate(360deg);
            opacity: 1;
            filter: blur(0);
          }
        }

        @keyframes powerUpPickupEffect {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          30% {
            transform: translate(-50%, -70%) scale(1.3);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -100%) scale(0.5);
            opacity: 0;
          }
        }

        @keyframes powerUpActivateEffect {
          0% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 0;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.4);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
        }

        @keyframes powerUpExpireEffect {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 0;
            filter: blur(3px);
          }
        }

        @keyframes spawnGlow {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 0.5;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 0.3;
          }
          100% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0;
          }
        }

        @keyframes defaultGlow {
          0% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 0.4;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 0;
          }
        }

        @keyframes activateRipple {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 0.7;
          }
          100% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0;
          }
        }

        /* Pickup particle animations */
        @keyframes pickupParticle0 {
          0% { transform: translate(-50%, -50%) translate(0, 0); opacity: 1; }
          100% { transform: translate(-50%, -50%) translate(30px, -20px); opacity: 0; }
        }
        @keyframes pickupParticle1 {
          0% { transform: translate(-50%, -50%) translate(0, 0); opacity: 1; }
          100% { transform: translate(-50%, -50%) translate(20px, -30px); opacity: 0; }
        }
        @keyframes pickupParticle2 {
          0% { transform: translate(-50%, -50%) translate(0, 0); opacity: 1; }
          100% { transform: translate(-50%, -50%) translate(-20px, -30px); opacity: 0; }
        }
        @keyframes pickupParticle3 {
          0% { transform: translate(-50%, -50%) translate(0, 0); opacity: 1; }
          100% { transform: translate(-50%, -50%) translate(-30px, -20px); opacity: 0; }
        }
        @keyframes pickupParticle4 {
          0% { transform: translate(-50%, -50%) translate(0, 0); opacity: 1; }
          100% { transform: translate(-50%, -50%) translate(25px, 15px); opacity: 0; }
        }
        @keyframes pickupParticle5 {
          0% { transform: translate(-50%, -50%) translate(0, 0); opacity: 1; }
          100% { transform: translate(-50%, -50%) translate(-25px, 15px); opacity: 0; }
        }
        @keyframes pickupParticle6 {
          0% { transform: translate(-50%, -50%) translate(0, 0); opacity: 1; }
          100% { transform: translate(-50%, -50%) translate(35px, 0); opacity: 0; }
        }
        @keyframes pickupParticle7 {
          0% { transform: translate(-50%, -50%) translate(0, 0); opacity: 1; }
          100% { transform: translate(-50%, -50%) translate(-35px, 0); opacity: 0; }
        }
      `}</style>
    </>
  );
};

export default PowerUpAnimations;
