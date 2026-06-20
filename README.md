# Spicy Ride - HTML/JS Game

A fast-paced dodging game built with vanilla HTML, CSS, and JavaScript.

## Project Structure

```
spicy ride. beta/
├── index.html          # Main game HTML file
├── css/
│   └── style.css       # Game styling
├── js/
│   └── game.js         # Game logic and mechanics
└── README.md           # This file
```

## Features

- **Responsive Canvas-based Game**: Uses HTML5 Canvas for smooth gameplay
- **Dynamic Difficulty**: Game speed increases as your score goes up
- **Keyboard Controls**: Use Arrow Keys or A/D to move left and right
- **Collision Detection**: Avoid falling enemies to keep playing
- **Score System**: Earn points for each enemy that passes you
- **Game Over Screen**: Displays final score with option to restart

## How to Play

1. Open `index.html` in a web browser
2. Use **Arrow Keys** (← →) or **A/D** to move your character
3. Avoid the falling enemies (cyan squares)
4. Score points for each enemy you dodge
5. The game gets faster as your score increases
6. When hit, press **SPACE** to restart

## Controls

| Key | Action |
|-----|--------|
| ← / A | Move Left |
| → / D | Move Right |
| SPACE | Restart (on Game Over) |

## Game Mechanics

- **Player**: Red square controlled by the player
- **Enemies**: Cyan squares that fall from the top
- **Score**: Increments each time an enemy passes the bottom
- **Speed**: Increases gradually with score (formula: 2 + score/10)
- **Spawn Rate**: Enemies spawn at a ~2% chance each frame

## Browser Compatibility

Works on all modern browsers that support:
- HTML5 Canvas
- ES6 JavaScript
- CSS3

## Future Enhancements

- Add sound effects
- Power-ups system
- Multiple difficulty levels
- High score leaderboard
- Mobile touch controls
- Different enemy types
- Visual effects and animations

## Installation

Simply download or clone the project and open `index.html` in your browser. No build process or dependencies required!

---

Built with vanilla JavaScript - no frameworks needed! 🎮
