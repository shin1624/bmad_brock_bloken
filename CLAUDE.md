# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a comprehensive block-breaker game project built with React + Canvas hybrid architecture, managed through the BMAD (Brock Bloken) framework for agile development with AI agents.

## Development Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview
```

## Architecture Overview

### Hybrid React + Canvas System
- **React Layer**: UI components (menus, HUD, settings, level editor)
- **Canvas Layer**: Game rendering and physics
- **State Management**: Zustand for UI state, custom GameState for game logic
- **Performance Target**: 60 FPS with <16ms input latency

### Directory Structure
```
src/
├── components/        # React UI components
│   ├── common/        # Reusable UI components
│   ├── game/          # Game-related UI (HUD, pause menu)
│   ├── menu/          # Main menu, settings, high scores
│   └── editor/        # Level editor interface
├── game/              # Canvas game engine
│   ├── core/          # Game loop, state management, event bus
│   ├── entities/      # Game objects (Ball, Paddle, Block, PowerUp)
│   ├── physics/       # Collision detection, movement calculations
│   ├── rendering/     # Canvas rendering system with optimizations
│   ├── systems/       # ECS systems (Physics, Collision, Particles, Audio)
│   └── plugins/       # Extensible plugin architecture
├── stores/            # Zustand state stores
├── services/          # Business logic services
├── hooks/             # Custom React hooks for game integration
├── types/             # TypeScript type definitions
├── themes/            # Visual theme definitions
└── utils/             # Utility functions
```

## BMAD Framework Integration

This project uses the BMAD framework with specialized AI agents:

### Agent Commands (use @ prefix)
- `@dev` - Full Stack Developer agent for implementation
- `@pm` - Product Manager agent for PRD and story creation
- `@architect` - System Architect for technical design
- `@qa` - Quality Assurance agent for testing

### Core Configuration
- Project config: `.bmad-core/core-config.yaml`
- PRD location: `docs/prd.md` (configured for sharding)
- Stories location: `docs/stories/`
- Architecture docs: `docs/architecture/`

### Development Workflow
1. Stories are created in `docs/stories/` following BMAD templates
2. Use `@dev` agent with `*develop-story` command for implementation
3. Dev agent updates story files with progress and validation results
4. Follow defined acceptance criteria and testing requirements

## Key Technical Requirements

### Performance Standards
- Maintain 60 FPS during gameplay (95% of time)
- Initial load time under 3 seconds
- Memory usage under 200MB
- Test coverage above 90%

### Code Quality
- TypeScript strict mode enabled
- ESLint and Prettier configured
- No console.log in production builds
- Follow React 19 patterns with hooks

### Game Engine Patterns
- **Entity-Component-System**: Modular game object architecture
- **Event-Driven**: EventBus for decoupled communication
- **Plugin Architecture**: Extensible power-up and theme systems
- **Object Pooling**: Memory-efficient particle and entity management
- **Fixed Timestep**: Consistent physics regardless of frame rate

## State Management Strategy

### UI State (Zustand)
- Current screen/menu state
- User preferences and settings
- Theme selection
- Volume controls

### Game State (Custom)
- Game loop and timing
- Entity positions and velocities
- Score, lives, level progression
- Active power-ups and effects

### State Synchronization
React components subscribe to game state changes through custom hooks that bridge Canvas events to React re-renders.

## Canvas Optimization Techniques

### Rendering Pipeline
- Double buffering with OffscreenCanvas
- Frustum culling for off-screen entities
- Z-order sorting for proper layering
- Batch rendering for similar entities

### Performance Monitoring
- Built-in FPS counter for development
- Performance profiling hooks
- Memory usage tracking
- Automatic quality scaling based on performance

## Testing Strategy

The project follows a testing pyramid:
- **Unit Tests (60%)**: Game logic, physics calculations, utility functions
- **Integration Tests (30%)**: Component interactions, state management
- **E2E Tests (10%)**: Complete user workflows

Test files should be co-located with source files using `.test.ts` or `.test.tsx` extensions.

## Development Guidelines

### React-Canvas Integration
- Use `useGameEngine` hook to initialize and manage game instances
- Canvas components should be wrapped in React.memo for performance
- Game state updates trigger React re-renders through event subscriptions
- Keep UI state separate from game state to avoid render loops

### Code Organization
- One class/component per file
- Use barrel exports in index.ts files
- Follow naming conventions: PascalCase for classes, camelCase for functions
- Private methods don't need underscore prefix

### Asset Management
- Sprites: `src/assets/sprites/`
- Sounds: `src/assets/sounds/`
- Levels: `src/assets/levels/` (JSON format)

## Browser Support

- Modern browsers with ES2020+ support
- Canvas 2D API required
- Web Audio API for sound
- LocalStorage for save data
- Touch events for mobile support

## Current Implementation Status

Based on existing code structure, the project has:
- ✅ Basic Vite + React + TypeScript setup
- ✅ Tailwind CSS configuration
- ✅ Zustand for state management
- ✅ ESLint and Prettier setup
- ✅ Comprehensive PRD and architecture documentation
- ❌ Game engine implementation (planned)
- ❌ Canvas rendering system (planned)
- ❌ Physics and collision detection (planned)

Stories and epics defined in the PRD need to be sharded into individual files using BMAD commands before development begins.

## Language

思考は英語で, 出力は日本語で