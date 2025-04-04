class Ball {
    constructor(color) {
        this.color = color;
        this.element = document.createElement('div');
        this.element.className = 'ball';
        this.element.style.backgroundColor = color;
        this.isMoving = false;
        // 添加到系统容器而不是黑盒
        document.querySelector('.system-container').appendChild(this.element);
    }

    // 在两点之间移动球
    async moveBetweenPoints(startX, startY, endX, endY, duration = 1000) {
        this.isMoving = true;
        
        // 获取系统容器的位置信息用于相对定位
        const container = document.querySelector('.system-container');
        const containerRect = container.getBoundingClientRect();
        
        // 计算相对于系统容器的位置
        const relativeStartX = startX - containerRect.left;
        const relativeStartY = startY - containerRect.top;
        const relativeEndX = endX - containerRect.left;
        const relativeEndY = endY - containerRect.top;
        
        // 设置初始位置
        this.element.style.display = 'block';
        this.element.style.transition = 'none';
        this.element.style.left = `${relativeStartX}px`;
        this.element.style.top = `${relativeStartY}px`;
        
        // 强制重排
        this.element.offsetHeight;
        
        // 设置过渡效果并移动
        this.element.style.transition = `all ${duration}ms linear`;
        this.element.style.left = `${relativeEndX}px`;
        this.element.style.top = `${relativeEndY}px`;

        return new Promise(resolve => {
            setTimeout(() => {
                this.isMoving = false;
                resolve();
            }, duration);
        });
    }

    // 添加到DOM
    addToContainer(container) {
        container.appendChild(this.element);
    }

    // 从DOM移除
    remove() {
        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

class Terminal {
    constructor(color) {
        this.color = color;
        this.element = document.querySelector(`#${color}Terminal`);
        this.port = this.element.querySelector('.io-port');
        
        // 获取统计元素 - 修改选择器以匹配HTML结构
        const stats = this.element.querySelector('.stats-container');
        this.statsElements = {
            // 发射统计 - 根据终端类型设置不同的统计元素
            red: null,
            blue: null,
            yellow: null,
            receive: null
        };

        // 根据终端颜色设置对应的统计元素
        switch(color) {
            case 'red':
                this.statsElements.yellow = stats.querySelector('.emit-stats .yellow-count');
                this.statsElements.blue = stats.querySelector('.emit-stats .blue-count');
                break;
            case 'blue':
                this.statsElements.red = stats.querySelector('.emit-stats .red-count');
                this.statsElements.yellow = stats.querySelector('.emit-stats .yellow-count');
                break;
            case 'yellow':
                this.statsElements.red = stats.querySelector('.emit-stats .red-count');
                this.statsElements.blue = stats.querySelector('.emit-stats .blue-count');
                break;
        }
        
        // 设置接收统计
        this.statsElements.receive = stats.querySelector('.receive-stats .receive-count');

        // 获取滑块元素
        const controls = this.element.closest('.terminal-group').querySelector('.terminal-controls');
        this.speedSlider = controls.querySelector('.speed-slider');
        this.ratioSlider = controls.querySelector('.ratio-slider');
        
        // 添加滑块值显示元素
        this.speedValue = document.createElement('span');
        this.speedValue.className = 'slider-value';
        this.speedValue.setAttribute('aria-label', `${color}终端当前发出速度`);
        this.speedValue.textContent = this.speedSlider?.value || '1';
        this.speedSlider?.parentNode.appendChild(this.speedValue);

        this.ratioValue = document.createElement('span');
        this.ratioValue.className = 'slider-value';
        this.ratioValue.setAttribute('aria-label', `${color}终端当前颜色比例`);
        this.ratioValue.textContent = this.ratioSlider?.value || '50';
        this.ratioSlider?.parentNode.appendChild(this.ratioValue);

        // 添加滑块事件监听器
        this.speedSlider?.addEventListener('input', (e) => {
            this.speedValue.textContent = e.target.value;
        });

        this.ratioSlider?.addEventListener('input', (e) => {
            this.ratioValue.textContent = e.target.value;
        });
        
        // 验证所有必需的元素
        if (!this.speedSlider || !this.ratioSlider) {
            console.error(`无法找到 ${color} 终端的滑块控件`, {
                terminal: this.element,
                controls: controls
            });
            this.defaultSpeed = 5;
            this.defaultRatio = 0.5;
        }

        // 验证统计元素 - 只检查当前终端需要的统计元素
        const requiredStats = this.getRequiredStats();
        requiredStats.forEach(statKey => {
            if (!this.statsElements[statKey]) {
                console.error(`无法找到 ${color} 终端的 ${statKey} 统计元素`, {
                    stats: stats,
                    selector: `.${statKey}-count`
                });
            }
        });

        this.sentCounts = {
            red: 0,
            blue: 0,
            yellow: 0
        };
        this.receivedCount = 0;
        this.emissionInterval = null;
    }

    // 获取当前终端需要的统计元素
    getRequiredStats() {
        const stats = ['receive'];
        switch(this.color) {
            case 'red':
                stats.push('yellow', 'blue');
                break;
            case 'blue':
                stats.push('red', 'yellow');
                break;
            case 'yellow':
                stats.push('red', 'blue');
                break;
        }
        return stats;
    }

    getEmissionRate() {
        if (!this.speedSlider) {
            return this.defaultSpeed;
        }
        return parseFloat(this.speedSlider.value);
    }

    getColorRatio() {
        if (!this.ratioSlider) {
            return this.defaultRatio;
        }
        return parseFloat(this.ratioSlider.value) / 100;
    }

    // 获取要发射的球的颜色
    getEmitColor() {
        const ratio = this.getColorRatio();
        const random = Math.random();
        
        switch(this.color) {
            case 'red':
                return random < ratio ? 'yellow' : 'blue';
            case 'blue':
                return random < ratio ? 'red' : 'yellow';
            case 'yellow':
                return random < ratio ? 'red' : 'blue';
        }
    }

    // 开始发射球
    startEmission(blackBox) {
        const rate = this.getEmissionRate();
        if (rate === 0) return;

        const interval = 1000 / rate;
        this.emissionInterval = setInterval(() => this.emitBall(blackBox), interval);
    }

    // 停止发射球
    stopEmission() {
        if (this.emissionInterval) {
            clearInterval(this.emissionInterval);
            this.emissionInterval = null;
        }
    }

    // 修改终端的发射球方法
    async emitBall(blackBox) {
        const color = this.getEmitColor();
        const ball = new Ball(color);
        
        // 获取起始和终点位置
        const portRect = this.port.getBoundingClientRect();
        const targetPort = document.querySelector(`.${this.color}-port`);
        const targetRect = targetPort.getBoundingClientRect();

        try {
            // 计算连线的方向向量
            const dx = targetRect.left - portRect.left;
            const dy = targetRect.top - portRect.top;
            
            // 根据终端颜色和位置选择偏移方向
            const offset = 30;
            let offsetX, offsetY;
            
            if (this.color === 'blue') {
                // 蓝色终端发出的球固定在连线左侧
                offsetX = -dy * offset / Math.sqrt(dx * dx + dy * dy);
                offsetY = dx * offset / Math.sqrt(dx * dx + dy * dy);
            } else {
                // 红色终端的球总是在右侧，黄色终端的球总是在左侧
                const goRight = this.color === 'red';
                offsetX = goRight ? 
                    dy * offset / Math.sqrt(dx * dx + dy * dy) :
                    -dy * offset / Math.sqrt(dx * dx + dy * dy);
                offsetY = goRight ?
                    -dx * offset / Math.sqrt(dx * dx + dy * dy) :
                    dx * offset / Math.sqrt(dx * dx + dy * dy);
            }

            // 设置控制点
            const controlPoint = {
                x: (portRect.left + targetRect.left) / 2 + offsetX,
                y: (portRect.top + targetRect.top) / 2 + offsetY
            };

            // 使用贝塞尔曲线移动球
            await blackBox.moveAlongCurve(
                ball,
                portRect.left + portRect.width / 2,
                portRect.top + portRect.height / 2,
                targetRect.left + targetRect.width / 2,
                targetRect.top + targetRect.height / 2,
                controlPoint.x,
                controlPoint.y,
                1000
            );

            // 只有在移动成功完成后才更新计数并传递给黑盒
            this.sentCounts[color]++;
            this.updateStats();
            blackBox.receiveBall(ball);

        } catch (error) {
            console.error('球移动过程中发生错误:', error);
            // 移动失败时清理球，但不计入发射计数
            if (ball.element && ball.element.parentNode) {
                ball.remove();
            }
        }
    }

    // 修改接收球的方法
    async receiveBall(ball) {
        // 先增加接收计数，因为球已经成功到达黑盒
        this.receivedCount++;
        this.updateStats();

        if (this.mode === 'shared') {
            await this.handleSharedMode(ball);
        } else {
            await this.handleSeparateMode(ball);
        }
    }

    // 更新统计信息
    updateStats() {
        // 只更新当前终端发射的球的计数
        const requiredStats = this.getRequiredStats();
        Object.entries(this.sentCounts).forEach(([color, count]) => {
            if (requiredStats.includes(color)) {
                const element = this.statsElements[color];
                if (element) {
                    element.textContent = count;
                }
            }
        });

        // 更新接收计数
        if (this.statsElements.receive) {
            this.statsElements.receive.textContent = this.receivedCount;
        }
    }
}

class BlackBox {
    constructor() {
        this.mode = 'shared';
        this.bufferDepth = 10;
        this.sharedBuffer = [];
        this.separateBuffers = {
            red: [],
            blue: [],
            yellow: []
        };
        this.stats = {
            received: 0,
            sent: 0,
            overflow: {
                red: 0,
                blue: 0,
                yellow: 0,
                total: 0
            }
        };
        this.outputIntervals = {};
        this.element = document.querySelector('.black-box');
        
        // 添加互斥锁
        this.bufferLock = false;
    }

    // 添加获取锁的方法
    async acquireLock() {
        while (this.bufferLock) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        this.bufferLock = true;
    }

    // 添加释放锁的方法
    releaseLock() {
        this.bufferLock = false;
    }

    // 切换工作模式
    switchMode(mode) {
        this.mode = mode;
        // 清空所有缓存
        this.sharedBuffer = [];
        this.separateBuffers = {
            red: [],
            blue: [],
            yellow: []
        };
        
        // 更新显示
        const sharedMode = document.querySelector('.shared-mode');
        const separateMode = document.querySelector('.separate-mode');
        
        if (mode === 'shared') {
            sharedMode.style.display = 'flex';
            separateMode.style.display = 'none';
        } else {
            sharedMode.style.display = 'none';
            separateMode.style.display = 'flex';
        }
        
        this.updateStats();
    }

    // 修改设置缓存深度的方法
    setBufferDepth(depth) {
        this.bufferDepth = parseInt(depth);  // 确保转换为整数
        this.updateStats();
    }

    // 接收球并处理
    async receiveBall(ball) {
        // 先增加接收计数，因为球已经成功到达黑盒
        this.stats.received++;
        this.updateStats();

        if (this.mode === 'shared') {
            await this.handleSharedMode(ball);
        } else {
            await this.handleSeparateMode(ball);
        }
    }

    // 处理共享缓存模式
    async handleSharedMode(ball) {
        const bufferRect = document.querySelector('.shared-buffer').getBoundingClientRect();
        const ballRect = ball.element.getBoundingClientRect();
        const blackBoxRect = this.element.getBoundingClientRect();
        
        try {
            // 第一步：移动到黑盒侧边中部
            const isFromBlueTerminal = ballRect.left > blackBoxRect.left + blackBoxRect.width / 2 - 50 && 
                                     ballRect.left < blackBoxRect.left + blackBoxRect.width / 2 + 50;
            
            // 根据球的来源确定轨迹
            let goToLeft;
            if (isFromBlueTerminal) {
                // 蓝色终端来的球随机选择左右两侧
                goToLeft = Math.random() < 0.5;
            } else {
                // 红色和黄色终端的球保持原有逻辑
                goToLeft = ballRect.left < blackBoxRect.left + blackBoxRect.width / 2;
            }

            const sidePoint = {
                x: goToLeft ? blackBoxRect.left + 30 : blackBoxRect.right - 30,
                y: blackBoxRect.top + blackBoxRect.height * 0.5
            };

            // 使用贝塞尔曲线移动到侧边中部
            await this.moveAlongCurve(
                ball,
                ballRect.left,
                ballRect.top,
                sidePoint.x,
                sidePoint.y,
                (ballRect.left + sidePoint.x) / 2,
                Math.min(ballRect.top, sidePoint.y) - 30, // 控制点在上方
                400
            );

            // 第二步：斜向移动到黑盒上部中心
            const topPoint = {
                x: blackBoxRect.left + blackBoxRect.width * 0.5,
                y: blackBoxRect.top + blackBoxRect.height * 0.2
            };

            await this.moveAlongCurve(
                ball,
                sidePoint.x,
                sidePoint.y,
                topPoint.x,
                topPoint.y,
                sidePoint.x,
                topPoint.y - 30, // 控制点在上方
                500
            );

            // 第三步：移动到缓存区上方
            const bufferTopPoint = {
                x: bufferRect.left + bufferRect.width / 2,
                y: topPoint.y
            };

            await this.moveAlongCurve(
                ball,
                topPoint.x,
                topPoint.y,
                bufferTopPoint.x,
                bufferTopPoint.y,
                (topPoint.x + bufferTopPoint.x) / 2,
                Math.min(topPoint.y - 20, blackBoxRect.top + 20), // 保持在黑盒内部
                400
            );

            // 第四步：下落到缓存区内
            // 根据球的颜色确定下落区域
            let targetX;
            const randomOffset = (Math.random() - 0.5) * (bufferRect.width * 0.15);
            switch(ball.color) {
                case 'red':
                    targetX = bufferRect.left + bufferRect.width * 0.25 + randomOffset;
                    break;
                case 'blue':
                    targetX = bufferRect.left + bufferRect.width * 0.5 + randomOffset;
                    break;
                case 'yellow':
                    targetX = bufferRect.left + bufferRect.width * 0.75 + randomOffset;
                    break;
            }
            const finalY = bufferRect.top + Math.random() * (bufferRect.height - 20);

            // 完成所有移动后再检查缓存状态
            await this.moveAlongCurve(
                ball,
                bufferTopPoint.x,
                bufferTopPoint.y,
                targetX,
                finalY,
                targetX,
                bufferTopPoint.y + 20,
                300
            );

            // 获取锁并检查缓存
            await this.acquireLock();
            try {
                if (this.isBufferFull()) {
                    this.stats.overflow[ball.color]++;
                    this.stats.overflow.total++;
                    ball.remove();
                    this.updateStats();
                    return;
                }
                this.sharedBuffer.push(ball);
                this.updateStats();
            } finally {
                this.releaseLock();
            }

        } catch (error) {
            console.error('小球移动过程中发生错误:', error);
            // 移动失败时只清理球，不影响统计
            if (ball.element && ball.element.parentNode) {
                ball.remove();
            }
        }
    }

    // 处理独立缓存模式
    async handleSeparateMode(ball) {
        const bufferElement = document.querySelector(`.${ball.color}-buffer`);
        const bufferRect = bufferElement.getBoundingClientRect();
        const ballRect = ball.element.getBoundingClientRect();
        const blackBoxRect = this.element.getBoundingClientRect();
        const portRect = this.element.querySelector(`.${ball.color}-port`).getBoundingClientRect();

        try {
            // 第一步：移动到黑盒侧边中部
            const isFromBlueTerminal = ballRect.left > blackBoxRect.left + blackBoxRect.width / 2 - 50 && 
                                     ballRect.left < blackBoxRect.left + blackBoxRect.width / 2 + 50;
            
            // 根据球的来源确定轨迹
            let goToLeft;
            if (isFromBlueTerminal) {
                // 蓝色终端来的球随机选择左右两侧
                goToLeft = Math.random() < 0.5;
            } else {
                // 红色和黄色终端的球保持原有逻辑
                goToLeft = ballRect.left < blackBoxRect.left + blackBoxRect.width / 2;
            }

            const sidePoint = {
                x: goToLeft ? blackBoxRect.left + 30 : blackBoxRect.right - 30,
                y: blackBoxRect.top + blackBoxRect.height * 0.5
            };

            // 使用贝塞尔曲线移动到侧边中部
            await this.moveAlongCurve(
                ball,
                ballRect.left,
                ballRect.top,
                sidePoint.x,
                sidePoint.y,
                (ballRect.left + sidePoint.x) / 2,
                Math.min(ballRect.top, sidePoint.y) - 30, // 控制点在上方
                400
            );

            // 第二步：斜向移动到黑盒上部
            const topPoint = {
                x: portRect.left + portRect.width / 2,
                y: blackBoxRect.top + blackBoxRect.height * 0.2
            };

            await this.moveAlongCurve(
                ball,
                sidePoint.x,
                sidePoint.y,
                topPoint.x,
                topPoint.y,
                sidePoint.x,
                topPoint.y - 30, // 控制点在上方
                500
            );

            // 第三步：斜向移动到缓存区上方
            const bufferTopPoint = {
                x: bufferRect.left + bufferRect.width / 2,
                y: topPoint.y
            };

            await this.moveAlongCurve(
                ball,
                topPoint.x,
                topPoint.y,
                bufferTopPoint.x,
                bufferTopPoint.y,
                (topPoint.x + bufferTopPoint.x) / 2,
                Math.min(topPoint.y - 20, blackBoxRect.top + 20), // 保持在黑盒内部
                400
            );

            // 第四步：下落到缓存区内
            const randomOffset = (Math.random() - 0.5) * (bufferRect.width * 0.4);
            const finalX = bufferRect.left + bufferRect.width / 2 + randomOffset;
            const finalY = bufferRect.top + Math.random() * (bufferRect.height - 20);

            // 完成所有移动后再检查缓存状态
            await this.moveAlongCurve(
                ball,
                bufferTopPoint.x,
                bufferTopPoint.y,
                finalX,
                finalY,
                finalX,
                bufferTopPoint.y + 20,
                300
            );

            // 获取锁并检查缓存
            await this.acquireLock();
            try {
                if (this.isBufferFull(ball.color)) {
                    this.stats.overflow[ball.color]++;
                    this.stats.overflow.total++;
                    ball.remove();
                    this.updateStats();
                    return;
                }
                this.separateBuffers[ball.color].push(ball);
                this.updateStats();
            } finally {
                this.releaseLock();
            }

        } catch (error) {
            console.error('小球移动过程中发生错误:', error);
            // 移动失败时只清理球，不影响统计
            if (ball.element && ball.element.parentNode) {
                ball.remove();
            }
        }
    }

    // 开始输出球
    startOutput(terminals) {
        const colors = ['red', 'blue', 'yellow'];
        colors.forEach(color => {
            const rate = terminals[color].getEmissionRate();
            if (rate === 0) return;

            const interval = 1000 / rate;
            this.outputIntervals[color] = setInterval(() => {
                this.outputBall(color, terminals[color]);
            }, interval);
        });
    }

    // 停止输出球
    stopOutput() {
        Object.values(this.outputIntervals).forEach(interval => {
            clearInterval(interval);
        });
        this.outputIntervals = {};
    }

    // 修改输出球的方法
    async outputBall(color, terminal) {
        let ball;
        
        // 获取锁以确保安全移除球
        await this.acquireLock();
        try {
            if (this.mode === 'shared') {
                const index = this.sharedBuffer.findIndex(b => b.color === color);
                if (index === -1) {
                    this.releaseLock();
                    return;
                }
                ball = this.sharedBuffer.splice(index, 1)[0];
            } else {
                if (this.separateBuffers[color].length === 0) {
                    this.releaseLock();
                    return;
                }
                ball = this.separateBuffers[color].shift();
            }
            this.updateStats();
        } finally {
            this.releaseLock();
        }

        if (!ball) return;

        // 获取起始和终点位置
        const port = this.element.querySelector(`.${color}-port`);
        const portRect = port.getBoundingClientRect();
        const terminalPort = terminal.port;
        const terminalRect = terminalPort.getBoundingClientRect();

        // 计算连线的方向向量
        const dx = terminalRect.left - portRect.left;
        const dy = terminalRect.top - portRect.top;
        
        // 根据终端颜色选择偏移方向
        const offset = 30;
        let offsetX, offsetY;
        
        if (color === 'blue') {
            // 发向蓝色终端的球固定在连线左侧
            offsetX = -dy * offset / Math.sqrt(dx * dx + dy * dy);
            offsetY = dx * offset / Math.sqrt(dx * dx + dy * dy);
        } else {
            // 到红色终端的球总是在右侧，到黄色终端的球总是在左侧
            const goRight = color === 'red';
            offsetX = goRight ? 
                dy * offset / Math.sqrt(dx * dx + dy * dy) :
                -dy * offset / Math.sqrt(dx * dx + dy * dy);
            offsetY = goRight ?
                -dx * offset / Math.sqrt(dx * dx + dy * dy) :
                dx * offset / Math.sqrt(dx * dx + dy * dy);
        }

        // 设置控制点
        const controlPoint = {
            x: (portRect.left + terminalRect.left) / 2 + offsetX,
            y: (portRect.top + terminalRect.top) / 2 + offsetY
        };

        // 使用贝塞尔曲线移动球
        await this.moveAlongCurve(
            ball,
            portRect.left + portRect.width / 2,
            portRect.top + portRect.height / 2,
            terminalRect.left + terminalRect.width / 2,
            terminalRect.top + terminalRect.height / 2,
            controlPoint.x,
            controlPoint.y,
            1000
        );

        this.stats.sent++;
        terminal.receiveBall(ball);
        this.updateStats();
    }

    // 更新统计信息
    updateStats() {
        // 更新接收和发送数
        document.getElementById('totalReceived').textContent = this.stats.received;
        document.getElementById('totalSent').textContent = this.stats.sent;
        
        // 根据模式更新缓存数和溢出数显示
        if (this.mode === 'shared') {
            // 共享缓存模式：显示总数
            document.getElementById('currentBuffer').textContent = this.getCurrentBufferCount();
            document.getElementById('overflowCount').textContent = this.stats.overflow.total;
        } else {
            // 独立缓存模式：显示总数和各颜色的数量
            const redCount = this.separateBuffers.red.length;
            const blueCount = this.separateBuffers.blue.length;
            const yellowCount = this.separateBuffers.yellow.length;
            const totalCount = redCount + blueCount + yellowCount;
            
            document.getElementById('currentBuffer').textContent = 
                `${totalCount} (${redCount}-${blueCount}-${yellowCount})`;
            document.getElementById('overflowCount').textContent = 
                `${this.stats.overflow.total} (${this.stats.overflow.red}-${this.stats.overflow.blue}-${this.stats.overflow.yellow})`;
        }
    }

    // 添加弧线运动方法到 BlackBox 类
    async moveAlongCurve(ball, startX, startY, endX, endY, controlX, controlY, duration) {
        const steps = 30;
        const stepDuration = duration / steps;

        // 获取系统容器的位置信息
        const container = document.querySelector('.system-container');
        const containerRect = container.getBoundingClientRect();

        // 确保球已添加到DOM
        if (!ball.element.parentNode) {
            container.appendChild(ball.element);
        }

        // 计算相对于容器的位置
        const relativeStartX = startX - containerRect.left;
        const relativeStartY = startY - containerRect.top;
        const relativeControlX = controlX - containerRect.left;
        const relativeControlY = controlY - containerRect.top;
        const relativeEndX = endX - containerRect.left;
        const relativeEndY = endY - containerRect.top;

        // 设置初始位置
        ball.element.style.display = 'block';
        ball.element.style.transition = 'none';
        ball.element.style.left = `${relativeStartX}px`;
        ball.element.style.top = `${relativeStartY}px`;

        // 强制重排
        ball.element.offsetHeight;

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = Math.pow(1-t, 2) * relativeStartX + 
                     2 * (1-t) * t * relativeControlX + 
                     Math.pow(t, 2) * relativeEndX;
            const y = Math.pow(1-t, 2) * relativeStartY + 
                     2 * (1-t) * t * relativeControlY + 
                     Math.pow(t, 2) * relativeEndY;

            ball.element.style.transition = `all ${stepDuration}ms linear`;
            ball.element.style.left = `${x}px`;
            ball.element.style.top = `${y}px`;

            await new Promise(resolve => setTimeout(resolve, stepDuration));
        }
    }

    // 修改获取当前缓存数的方法
    getCurrentBufferCount() {
        if (this.mode === 'shared') {
            return this.sharedBuffer.length;
        } else {
            return Object.values(this.separateBuffers).reduce((sum, buffer) => sum + buffer.length, 0);
        }
    }

    // 修改检查缓存是否已满的方法
    isBufferFull(color) {
        if (this.mode === 'shared') {
            return this.sharedBuffer.length >= this.bufferDepth;
        } else {
            return this.separateBuffers[color].length >= this.bufferDepth;
        }
    }
}

// 初始化系统
const system = {
    blackBox: new BlackBox(),
    terminals: {
        red: new Terminal('red'),
        blue: new Terminal('blue'),
        yellow: new Terminal('yellow')
    },
    isRunning: false
};

// 事件监听器
document.getElementById('toggleBtn').addEventListener('click', function() {
    system.isRunning = !system.isRunning;
    this.textContent = system.isRunning ? '暂停' : '运行';
    if (system.isRunning) {
        startSimulation();
    } else {
        stopSimulation();
    }
});

document.getElementById('resetBtn').addEventListener('click', function() {
    // 无论当前状态如何，都强制停止并重置
    system.isRunning = false;
    document.getElementById('toggleBtn').textContent = '运行';
    resetSystem();
});

document.getElementById('modeSelect').addEventListener('change', function(e) {
    const sharedMode = document.querySelector('.shared-mode');
    const separateMode = document.querySelector('.separate-mode');
    
    if (e.target.value === 'shared') {
        sharedMode.classList.remove('hidden');
        separateMode.classList.add('hidden');
        system.blackBox.switchMode('shared');
    } else {
        sharedMode.classList.add('hidden');
        separateMode.classList.remove('hidden');
        system.blackBox.switchMode('separate');
    }

    // 清除所有现有的球
    document.querySelectorAll('.ball').forEach(ball => ball.remove());
    
    // 重置缓存
    system.blackBox.sharedBuffer = [];
    system.blackBox.separateBuffers = {
        red: [],
        blue: [],
        yellow: []
    };
    
    // 更新统计信息
    system.blackBox.updateStats();
});

function startSimulation() {
    Object.values(system.terminals).forEach(terminal => {
        terminal.startEmission(system.blackBox);
    });
    system.blackBox.startOutput(system.terminals);
}

function stopSimulation() {
    Object.values(system.terminals).forEach(terminal => {
        terminal.stopEmission();
    });
    system.blackBox.stopOutput();
}

function resetSystem() {
    // 确保先停止所有运行中的操作
    stopSimulation();
    
    // 清除所有可能存在的球元素
    document.querySelectorAll('.ball').forEach(ball => ball.remove());
    
    // 重置黑盒状态
    system.blackBox.switchMode(system.blackBox.mode);
    system.blackBox.stats = {
        received: 0,
        sent: 0,
        overflow: {
            red: 0,
            blue: 0,
            yellow: 0,
            total: 0
        }
    };
    
    // 重置所有终端状态
    Object.values(system.terminals).forEach(terminal => {
        terminal.sentCounts = {
            red: 0,
            blue: 0,
            yellow: 0
        };
        terminal.receivedCount = 0;
        terminal.updateStats();
        
        // 重置速度和比例滑块到默认值，并更新显示的数值
        terminal.speedSlider.value = 1;
        terminal.speedValue.textContent = '1';
        terminal.ratioSlider.value = 50;
        terminal.ratioValue.textContent = '50';
    });
    
    // 重置黑盒缓存深度到默认值，并更新显示的数值
    const bufferDepthSlider = document.getElementById('bufferDepth');
    const bufferDepthValue = bufferDepthSlider.parentNode.querySelector('.slider-value');
    bufferDepthSlider.value = 10;
    bufferDepthValue.textContent = '10';
    system.blackBox.setBufferDepth(10);
    
    // 更新统计信息
    system.blackBox.updateStats();
}

// 更新连接线的函数
function updateConnectionLines() {
    const blackBox = document.querySelector('.black-box');
    const terminals = document.querySelectorAll('.terminal');
    
    terminals.forEach((terminal, index) => {
        const blackBoxPort = blackBox.querySelector(`.port:nth-child(${index + 1})`);
        const terminalPort = terminal.querySelector('.io-port');
        
        // 获取端口的位置信息
        const blackBoxRect = blackBoxPort.getBoundingClientRect();
        const terminalRect = terminalPort.getBoundingClientRect();
        
        // 计算连接线的起点和终点（相对于黑盒的位置）
        const startX = blackBoxRect.left + blackBoxRect.width / 2;
        const startY = blackBoxRect.top + blackBoxRect.height / 2;
        const endX = terminalRect.left + terminalRect.width / 2;
        const endY = terminalRect.top + terminalRect.height / 2;
        
        // 计算线的长度和角度
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const angle = Math.atan2(deltaY, deltaX) - Math.PI/2; // 减去90度因为线默认是垂直的
        
        // 获取对应的连接线元素
        const line = document.querySelector(`.connection-line:nth-child(${index + 1})`);
        
        // 设置线的位置、长度和旋转角度
        line.style.height = `${length}px`;
        line.style.transform = `rotate(${angle}rad)`;
        
        // 调整线的起点位置
        const blackBoxPosition = blackBox.getBoundingClientRect();
        line.style.left = `${startX - blackBoxPosition.left}px`;
        line.style.top = `${startY - blackBoxPosition.top}px`;
    });
}

// 在页面加载和窗口调整时更新连接线
window.addEventListener('load', updateConnectionLines);
window.addEventListener('resize', updateConnectionLines);

// 在模式切换时也更新连接线
document.getElementById('modeSelect').addEventListener('change', updateConnectionLines);

// 修改系统初始化部分，为黑盒缓存深度滑块添加值显示
document.addEventListener('DOMContentLoaded', () => {
    const bufferDepthSlider = document.getElementById('bufferDepth');
    const bufferDepthValue = document.createElement('span');
    bufferDepthValue.className = 'slider-value';
    bufferDepthValue.setAttribute('aria-label', '当前缓存深度值');
    bufferDepthValue.textContent = bufferDepthSlider.value;
    bufferDepthSlider.parentNode.appendChild(bufferDepthValue);

    bufferDepthSlider.addEventListener('input', (e) => {
        bufferDepthValue.textContent = e.target.value;
    });

    // 设置初始模式
    const modeSelect = document.getElementById('modeSelect');
    const initialMode = modeSelect.value;
    const sharedMode = document.querySelector('.shared-mode');
    const separateMode = document.querySelector('.separate-mode');
    
    if (initialMode === 'shared') {
        sharedMode.classList.remove('hidden');
        separateMode.classList.add('hidden');
        system.blackBox.switchMode('shared');
    } else {
        sharedMode.classList.add('hidden');
        separateMode.classList.remove('hidden');
        system.blackBox.switchMode('separate');
    }
});

// 修改所有终端的速度滑块默认值
document.querySelectorAll('.speed-slider').forEach(slider => {
    slider.value = '1';
});

// 添加缓存深度滑块的事件监听器
document.getElementById('bufferDepth').addEventListener('input', (e) => {
    system.blackBox.setBufferDepth(e.target.value);
}); 
