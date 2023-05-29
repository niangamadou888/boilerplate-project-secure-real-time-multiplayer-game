import Player from './Player.mjs';
import Collectible from './Collectible.mjs';
import controls from './controls.mjs';
import { generateStartPos, canvasCalcs} from './canvas-data.mjs';

const socket = io();
const canvas = document.getElementById('game-window');
const context = canvas.getContext('2d',{alpha:false});

// Preload Game Assets
const loadImage = (src) => {
  const img = new Image();
  img.src = src;
  return img;
};

const bronzeCoinArt = loadImage("https://cdn.freecodecamp.org/demo-projects/bronze-coin.png");

const silverCoinArt = loadImage("https://cdn.freecodecamp.org/demo-projects/silver-coin.png");

const goldCoinArt = loadImage("https://cdn.freecodecamp.org/demo-projects/gold-coin.png");

const mainPlayerArt = loadImage("https://cdn.freecodecamp.org/demo-projects/main-player.png");

const otherPlayerArt = loadImage("https://cdn.freecodecamp.org/demo-projects/other-player.png");

let tick;
let currPlayers = [];
let item;
let endGame;

socket.on("init",({id,players,coin}) => {
  console.log(`Connected ${id}`);

  /*
    Cancel animation if it exists and the page is not refreshed 
  */
  cancelAnimationFrame(tick);

  // Create new player wnen we log on
  const mainPlayer = new Player({
    x: generateStartPos(canvasCalcs.playFieldMinX,canvasCalcs.playFieldMaxX,5),
    y: generateStartPos(canvasCalcs.playFieldMinY,canvasCalcs.playFieldMaxY,5),
    id,
    main: true
  });

  controls(mainPlayer,socket);

  // Send our player back to the server
  socket.emit("new-player",mainPlayer);

  // Add new player when someone logs on
  socket.on("new-player", (obj) => {
    // Check that player does not already exist
    const playerIds = currPlayers.map((player) => player.id);
    if (!playerIds.includes(obj.id)) {
      currPlayers.push(new Player(obj));
    }
  });

  // Handle Movement
  socket.on("move-player",({id, dir, posObj}) => {
    const movingPlayer = currPlayers.find((obj) => obj.id === id);
    movingPlayer.moveDir(dir);

    // Force sync in case of lag
    stoppingPlayer.x = posObj.x;
    stoppingPlayer.y = posObj.y;
  });

  // Handle new coin gen
  socket.on("new-coin", (newCoin) => {
    item = new Collectible(newCoin);
  });

  // Handle player disconnection
  socket.on("remove-player", (id) => {
    console.log(`${id} disconnected`);
    currPlayers = currPlayers.filter((player) => player.id !== id);
  });

  // Handle endGame state
  socket.on("end-game", (result) => (endGame=result));

  // Update scoring player's score
  socket.on("update-player", (playerObj) => {
    const scoringPlayer = currPlayers.find((obj) => obj.id === playerObj.id);
    scoringPlayer.score = playerObj.score;
  });

  /*
    Populate list of current players and
    create current coin when logging in
  */
  currPlayers = players.map((val) => new Player(val)).concat(mainPlayer);
  item = new Collectible(coin);

  draw();

});

// Function draw
const draw = () => {
  context.clearRect(0,0,canvas.width,canvas.height);

  // Set background color
  context.fillStyle = "#220";
  context.fillRect(0,0,canvas.width,canvas.height);

  // Create border for play field
  context.strokeStyle = "white";
  context.strokeRect(
    canvasCalcs.playFieldMinX,
    canvasCalcs.playFieldMinY,
    canvasCalcs.playFieldWidth,
    canvasCalcs.playFieldHeight
  );

  // Controls Text
  context.fillStyle = "white";
  context.font = `13px 'Press Start 2P'`;
  context.textAlign = "center";
  context.fillText("Controls: WASD", 100, 32.5);

  // Game Title
  context.font = `16px 'Press Start 2P'`;
  context.fillText("Coin Race", canvasCalcs.canvasWidth/2,32.5);

  // Calculate score and draw players each frame
  currPlayers.forEach((player) => {
    player.draw(context,item, {mainPlayerArt, otherPlayerArt}, currPlayers);
  });

  // Draw Current Coin
  item.draw(context, {bronzeCoinArt, silverCoinArt, goldCoinArt});

  // Remove destroyed coin
  if (item.destroyed) {
    socket.emit("destroy-item", {
      playerId: item.destroyed,
      coinValue: item.value,
      coinId: item.id
    });
  }

  // EndGame
  if (endGame) {
    context.fillStyle = "white";
    context.font = `13px 'Press Start 2P'`;
    context.fillText(`You ${endGame}! Restart and try again.`, canvasCalcs.canvasWidth / 2, 80);
  }

  if (!endGame) tick = requestAnimationFrame(draw);
};