'use strict';

const readline = require('readline');

// ===== 游戏配置 =====
const WIDTH = 20;   // 游戏区域宽度（格子数）
const HEIGHT = 15;  // 游戏区域高度（格子数）
const TICK_MS = 150; // 蛇移动间隔（毫秒），数值越小越快

// ===== 方向定义 =====
const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

// ===== 游戏状态 =====
let snake;        // 蛇身坐标数组，snake[0] 是蛇头
let dir;          // 当前移动方向
let nextDir;      // 下一步方向（缓冲，避免一帧内反向）
let food;         // 食物坐标
let score;        // 当前得分
let timer;        // 定时器句柄
let gameOver;     // 是否结束

function reset() {
  const cx = Math.floor(WIDTH / 2);
  const cy = Math.floor(HEIGHT / 2);
  snake = [
    { x: cx, y: cy },
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy },
  ];
  dir = DIRS.right;
  nextDir = DIRS.right;
  score = 0;
  gameOver = false;
  placeFood();
}

// 在空格子中随机放置食物
function placeFood() {
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * WIDTH),
      y: Math.floor(Math.random() * HEIGHT),
    };
  } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
  food = pos;
}

// 推进一帧
function step() {
  dir = nextDir;
  const head = snake[0];
  const newHead = { x: head.x + dir.x, y: head.y + dir.y };

  // 撞墙判定
  if (
    newHead.x < 0 ||
    newHead.x >= WIDTH ||
    newHead.y < 0 ||
    newHead.y >= HEIGHT
  ) {
    return end();
  }

  // 撞到自己判定
  if (snake.some((s) => s.x === newHead.x && s.y === newHead.y)) {
    return end();
  }

  snake.unshift(newHead);

  // 吃到食物：加分并放置新食物；否则去掉尾巴（保持长度）
  if (newHead.x === food.x && newHead.y === food.y) {
    score += 10;
    placeFood();
  } else {
    snake.pop();
  }

  render();
}

// 渲染整个画面
function render() {
  // 用集合加速查询蛇身位置
  const cells = new Map();
  snake.forEach((s, i) => cells.set(`${s.x},${s.y}`, i === 0 ? 'head' : 'body'));

  let out = '';
  out += '\x1b[H'; // 光标移到左上角
  out += `🐍 贪吃蛇   得分: ${score}\n`;
  out += '┌' + '──'.repeat(WIDTH) + '┐\n';

  for (let y = 0; y < HEIGHT; y++) {
    out += '│';
    for (let x = 0; x < WIDTH; x++) {
      const cell = cells.get(`${x},${y}`);
      if (cell === 'head') {
        out += '██';
      } else if (cell === 'body') {
        out += '▓▓';
      } else if (food.x === x && food.y === y) {
        out += '🍎';
      } else {
        out += '  ';
      }
    }
    out += '│\n';
  }

  out += '└' + '──'.repeat(WIDTH) + '┘\n';
  out += '方向键 / WASD 移动   P 暂停   Q 退出\n';

  process.stdout.write(out);
}

function end() {
  gameOver = true;
  clearInterval(timer);
  render();
  process.stdout.write(`\n💀 游戏结束！最终得分: ${score}\n按 R 重新开始，按 Q 退出\n`);
}

// 改变方向（禁止 180° 反向）
function changeDir(d) {
  if (gameOver) return;
  // 不能直接反向：例如正在向右时不能立刻向左
  if (d.x === -dir.x && d.y === -dir.y) return;
  nextDir = d;
}

let paused = false;
function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (paused) {
    clearInterval(timer);
    process.stdout.write('\n⏸  已暂停，按 P 继续\n');
  } else {
    startLoop();
  }
}

function startLoop() {
  clearInterval(timer);
  timer = setInterval(step, TICK_MS);
}

function startGame() {
  reset();
  paused = false;
  process.stdout.write('\x1b[2J'); // 清屏
  render();
  startLoop();
}

// ===== 键盘输入处理 =====
function setupInput() {
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);

  process.stdin.on('keypress', (str, key) => {
    if (!key) return;
    const name = key.name;

    // Ctrl+C 或 Q 退出
    if ((key.ctrl && name === 'c') || name === 'q') {
      return quit();
    }

    if (gameOver) {
      if (name === 'r') startGame();
      return;
    }

    if (name === 'p') return togglePause();
    if (paused) return;

    switch (name) {
      case 'up':
      case 'w':
        changeDir(DIRS.up);
        break;
      case 'down':
      case 's':
        changeDir(DIRS.down);
        break;
      case 'left':
      case 'a':
        changeDir(DIRS.left);
        break;
      case 'right':
      case 'd':
        changeDir(DIRS.right);
        break;
    }
  });
}

function quit() {
  clearInterval(timer);
  if (process.stdin.isTTY) process.stdin.setRawMode(false);
  process.stdout.write('\x1b[2J\x1b[H'); // 清屏并归位
  process.stdout.write('谢谢游玩，再见！👋\n');
  process.exit(0);
}

// ===== 启动 =====
setupInput();
startGame();
