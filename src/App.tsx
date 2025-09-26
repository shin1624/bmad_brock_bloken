import { useState } from "react";
import { MainMenu } from "./components/menu/MainMenu";
import { Game } from "./components/game/Game";
import EditorWorkspace from "./components/editor/EditorWorkspace";

type Screen = "menu" | "game" | "editor";

const App = (): JSX.Element => {
  const [currentScreen, setCurrentScreen] = useState<Screen>("menu");

  const handleStartGame = () => {
    setCurrentScreen("game");
  };

  const handleOpenEditor = () => {
    setCurrentScreen("editor");
  };

  const handleBackToMenu = () => {
    setCurrentScreen("menu");
  };

  switch (currentScreen) {
    case "game":
      return <Game onBack={handleBackToMenu} />;
    case "editor":
      return <EditorWorkspace />;
    case "menu":
    default:
      return (
        <MainMenu
          onStartGame={handleStartGame}
          onOpenEditor={handleOpenEditor}
        />
      );
  }
};

export default App;
