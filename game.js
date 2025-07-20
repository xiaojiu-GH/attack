document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const backgroundMusic = document.getElementById('backgroundMusic');

    // 处理浏览器自动播放限制
    function playBackgroundMusic() {
        if (backgroundMusic.paused) {
            backgroundMusic.play().catch(e => {
                console.log('需要用户交互才能播放音乐:', e);
            });
        }
    }

    // 监听画布点击以触发音乐播放
    // 使用捕获阶段监听以确保事件触发
    document.addEventListener('click', playBackgroundMusic, true);
    document.addEventListener('keydown', playBackgroundMusic, true);
    const healthElement = document.getElementById('health');
    const survivalTimeElement = document.getElementById('survivalTime');
    const gameOverElement = document.getElementById('gameOver');
    const finalScoreElement = document.getElementById('finalScore');
    const finalSurvivalTimeElement = document.getElementById('finalSurvivalTime');
    const rankCommentElement = document.getElementById('rankComment');

    // 设置画布大小
    canvas.width = 800;
    canvas.height = 600;

    // 游戏状态
    let health = 10; // 减少生命值，增加难度
    let gameOver = false;
    let lastTime = 0;
    let obstacleSpawnTimer = 0;
    let survivalTime = 0; // 存活时间（秒）
    let obstacleSpawnInterval = 50; // 进一步缩短至每0.05秒生成障碍物

    // 玩家设置
    const player = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        radius: 20,
        speed: 4, // 降低玩家速度，增加难度
        color: '#4CAF50',
        keys: {
            up: false,
            down: false,
            left: false,
            right: false
        }
    };

    // 障碍物数组
    let obstacles = [];
    let flames = [];

    // 键盘控制
    document.addEventListener('keydown', (e) => {
        switch(e.key) {
            case 'ArrowUp':
                player.keys.up = true;
                break;
            case 'ArrowDown':
                player.keys.down = true;
                break;
            case 'ArrowLeft':
                player.keys.left = true;
                break;
            case 'ArrowRight':
                player.keys.right = true;
                break;
        }
    });

    document.addEventListener('keyup', (e) => {
        switch(e.key) {
            case 'ArrowUp':
                player.keys.up = false;
                break;
            case 'ArrowDown':
                player.keys.down = false;
                break;
            case 'ArrowLeft':
                player.keys.left = false;
                break;
            case 'ArrowRight':
                player.keys.right = false;
                break;
        }
    });

    // 创建障碍物
    function createObstacle() {
        // 临时提高弹跳球生成概率以便测试
        const obstacleTypes = ['bouncingBall', 'bouncingBall', 'bouncingBall', 'bullet', 'bomb'];
        const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
        const size = Math.random() * 20 + 15;
        const x = Math.random() * canvas.width;
        const y = Math.random() < 0.5 ? -size : canvas.height + size;

        let obstacle;

        switch(type) {
            case 'bullet':
                obstacle = {
                    type: 'bullet',
                    x: x,
                    y: y,
                    width: 20,
                    height: 5,
                    speed: Math.random() * 5 + 4, // 大幅增加子弹速度
                    color: '#ff0000',
                    direction: y < 0 ? 1 : -1
                };
                break;
            case 'bomb':
                obstacle = {
                    type: 'bomb',
                    x: x,
                    y: y,
                    radius: size,
                    speed: Math.random() * 5 + 4, // 大幅增加炮弹速度
                    color: '#000000',
                    direction: y < 0 ? 1 : -1,
                    exploded: false,
                    explosionRadius: 0,
                    lifetime: 0 // 初始化生命周期计时器
                };
                break;
            case 'bouncingBall':
                obstacle = {
                    type: 'bouncingBall',
                    x: x,
                    y: y,
                    radius: size,
                    speedX: (Math.random() - 0.5) * 4, // 调整水平速度，确保可见性
                    speedY: (y < 0 ? 1 : -1) * (Math.random() * 2 + 1), // 调整垂直速度，确保可见性
                    color: '#ff0000',
                    bounces: 0,
                    maxBounces: 5
                };
                break;
        }

        obstacles.push(obstacle);
    }

    // 更新玩家位置
    function updatePlayer() {
        if (player.keys.up && player.y - player.radius > 0) {
            player.y -= player.speed;
        }
        if (player.keys.down && player.y + player.radius < canvas.height) {
            player.y += player.speed;
        }
        if (player.keys.left && player.x - player.radius > 0) {
            player.x -= player.speed;
        }
        if (player.keys.right && player.x + player.radius < canvas.width) {
            player.x += player.speed;
        }
    }

    // 更新障碍物
    function updateObstacles(deltaTime) {
        for (let i = obstacles.length - 1; i >= 0; i--) {
            const obstacle = obstacles[i];

            switch(obstacle.type) {
                case 'bullet':
                    obstacle.y += obstacle.speed * obstacle.direction;
                    // 超出画布移除
                    if ((obstacle.direction === 1 && obstacle.y > canvas.height + obstacle.radius) ||
                        (obstacle.direction === -1 && obstacle.y < -obstacle.radius)) {
                        obstacles.splice(i, 1);
                        // 移除得分机制
                    }
                    break;
                case 'bomb':
                    if (!obstacle.exploded) {
                        obstacle.y += obstacle.speed * obstacle.direction;
                          // 限制横向移动范围，防止超出画布
                          obstacle.x = Math.max(obstacle.radius, Math.min(canvas.width - obstacle.radius, obstacle.x + (Math.random() - 0.5) * 2));
                          // 累加生命周期
                          obstacle.lifetime += deltaTime;
                          // 4秒后自动爆炸
                          if (obstacle.lifetime >= 10000) {
                              obstacle.exploded = true;
                              // 检测玩家是否在爆炸范围内
                              const dx = player.x - obstacle.x;
                              const dy = player.y - obstacle.y;
                              const distance = Math.sqrt(dx * dx + dy * dy);
                              if (distance < 80) {
                                  health -= 5;
                                  healthElement.textContent = health;
                                  if (health <= 0) {
                                      endGame();
                                  }
                              }
                              flames.push({
                                  x: obstacle.x,
                                  y: obstacle.y,
                                  radius: 15 + Math.random() * 10,
                                  lifetime: 3000,
                                  maxLifetime: 3000
                              });
                          }
                        // 添加随机爆炸概率 (5% chance per frame)
                if (Math.random() < 0.05) {
                    obstacle.exploded = true;
                    flames.push({
                        x: obstacle.x,
                        y: obstacle.y,
                        radius: 15 + Math.random() * 10,
                        lifetime: 3000,
                        maxLifetime: 3000
                    });
                }
                // 到达边界自动爆炸
                        if ((obstacle.direction === 1 && obstacle.y > canvas.height) ||
                            (obstacle.direction === -1 && obstacle.y < 0)) {
                            obstacle.exploded = true;
                            flames.push({
                                x: obstacle.x,
                                y: obstacle.y,
                                radius: 15 + Math.random() * 10,
                                lifetime: 3000,
                                maxLifetime: 3000
                            });
                        }
                    } else {
                        // 爆炸动画
                        obstacle.explosionRadius += 2;
                        if (obstacle.explosionRadius > 80) {
                            obstacles.splice(i, 1);
                        }
                    }
                    break;
                case 'bouncingBall':
                    obstacle.x += obstacle.speedX;
                    obstacle.y += obstacle.speedY;

                    // 边界碰撞检测
                    if (obstacle.x - obstacle.radius < 0 || obstacle.x + obstacle.radius > canvas.width) {
                        obstacle.speedX *= -1;
                        obstacle.bounces++;
                    }
                    if (obstacle.y - obstacle.radius < 0 || obstacle.y + obstacle.radius > canvas.height) {
                        obstacle.speedY *= -1;
                        obstacle.bounces++;
                    }

                    // 达到最大反弹次数移除
                    if (obstacle.bounces >= obstacle.maxBounces) {
                        obstacles.splice(i, 1);
                        // 移除得分机制
                    }
                    break;
            }
        }
    }

    // 碰撞检测
    function checkCollisions() {
        for (let i = obstacles.length - 1; i >= 0; i--) {
            const obstacle = obstacles[i];
            
            if (obstacle.type === 'bullet') {
                // 矩形碰撞检测
                const rectLeft = obstacle.x - obstacle.width / 2;
                const rectRight = obstacle.x + obstacle.width / 2;
                const rectTop = obstacle.y - obstacle.height / 2;
                const rectBottom = obstacle.y + obstacle.height / 2;

                // 找到矩形上离圆心最近的点
                const closestX = Math.max(rectLeft, Math.min(player.x, rectRight));
                const closestY = Math.max(rectTop, Math.min(player.y, rectBottom));

                // 计算最近点到圆心的距离
                const dx = player.x - closestX;
                const dy = player.y - closestY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < player.radius) {
                    health -= 1;
                    obstacles.splice(i, 1);
                }
            } else {
                // 圆形碰撞检测
                const dx = player.x - obstacle.x;
                const dy = player.y - obstacle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < player.radius + obstacle.radius) {
                    if (obstacle.type === 'bomb' && !obstacle.exploded) {
                        obstacle.exploded = true;
                    } else if (obstacle.type === 'bouncingBall') {
                        health -= 2;
                        obstacles.splice(i, 1);
                    }
                }
            }

            // 炸弹爆炸范围伤害
            if (obstacle.type === 'bomb' && obstacle.exploded) {
                const dx = player.x - obstacle.x;
                const dy = player.y - obstacle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < player.radius + obstacle.explosionRadius) {
                    health -= 5;
                    obstacles.splice(i, 1);
                }
            }
        }

        // 更新生命值
        healthElement.textContent = health;
        if (health <= 0) {
            gameOver = true;
            gameOverElement.style.display = 'flex';
            finalSurvivalTimeElement.textContent = Math.floor(survivalTime) + 's';
            let comment;
            const time = Math.floor(survivalTime);
            if (time <= 5) {
                comment = "菜鸡。";
            } else if (time <= 10) {
                comment = "青铜";
            } else if (time <= 20) {
                comment = "白银";
            } else if (time <= 30) {
                comment = "黄金";
            } else if (time <= 40) {
                comment = "钻石";
            } else if (time <= 60) {
                comment = "王者";
            } else if (time <= 120) {
                comment = "你是怎么做到的？";
            } else {
                comment = "肮脏的黑客";
            }
            rankCommentElement.textContent = comment;
            // 移除得分显示
        }
    }

    // 绘制游戏元素
    function draw() {
        // 清空画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 绘制玩家
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
        ctx.fillStyle = player.color;
        ctx.fill();
        ctx.closePath();

        // 绘制障碍物

    // 绘制余焰
    flames.forEach(flame => {
        const alpha = flame.lifetime / flame.maxLifetime;
        ctx.beginPath();
        ctx.arc(flame.x, flame.y, flame.radius * alpha, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, ${100 + alpha * 155}, 0, ${alpha})`;
        ctx.fill();
    });
        obstacles.forEach(obstacle => {
            ctx.beginPath();
            if (obstacle.type === 'bomb' && obstacle.exploded) {
                // 绘制爆炸效果
                ctx.arc(obstacle.x, obstacle.y, obstacle.explosionRadius, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 152, 0, 0.5)';
                ctx.fill();
            } else if (obstacle.type === 'bullet') {
                // 绘制子弹为矩形
                ctx.fillRect(obstacle.x - obstacle.width/2, obstacle.y - obstacle.height/2, obstacle.width, obstacle.height);
                ctx.fillStyle = obstacle.color;
                ctx.fill();
            } else {
                ctx.arc(obstacle.x, obstacle.y, obstacle.radius, 0, Math.PI * 2);
                ctx.fillStyle = obstacle.color;
                ctx.fill();
            }
            ctx.closePath();
        });
    }

    // 游戏循环
    function gameLoop(timestamp) {
        if (!lastTime) lastTime = timestamp;
        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;

        if (!gameOver) {
            // 更新游戏状态
            updatePlayer();
            updateObstacles(deltaTime);
            // 更新存活时间
            survivalTime += deltaTime / 1000;
            survivalTimeElement.textContent = Math.floor(survivalTime) + 's';

    // 更新余焰并检测伤害
    flames.forEach((flame, index) => {
        flame.lifetime -= deltaTime;
        // 余焰伤害逻辑
        const dx = player.x - flame.x;
        const dy = player.y - flame.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < player.radius + flame.radius) {
        health -= 2;
        healthElement.textContent = health;
        flames.splice(index, 1);
    }
        
        if (flame.lifetime <= 0) {
            flames.splice(index, 1);
        }
    });
            checkCollisions();
            draw();

            // 生成障碍物
            obstacleSpawnTimer += deltaTime;
            if (obstacleSpawnTimer > obstacleSpawnInterval) {
                // 每次生成1-2个障碍物
                // 动态调整生成数量：20%概率3个，50%概率2个，30%概率1个
                let count;
                const rand = Math.random();
                if (rand < 0.4) {
                    count = 3;
                } else if (rand < 0.9) {
                    count = 2;
                } else {
                    count = 1;
                }
                for (let i = 0; i < count; i++) {
                    createObstacle();
                }
                obstacleSpawnTimer = 0;
                // 已移除得分机制，故删除相关逻辑
            }
        }

        requestAnimationFrame(gameLoop);
    }

    // 重新开始游戏
    window.restartGame = function() {
        playBackgroundMusic();
        health = 10;
        survivalTime = 0;
        survivalTimeElement.textContent = '0s';
        gameOver = false;
        obstacles = [];
        obstacleSpawnTimer = 0;
        obstacleSpawnInterval = 50;
        player.x = canvas.width / 2;
        player.y = canvas.height / 2;
        healthElement.textContent = health;
        gameOverElement.style.display = 'none';
        flames = [];
    };

    // 开始游戏前尝试播放音乐
    playBackgroundMusic();
    requestAnimationFrame(gameLoop);
});