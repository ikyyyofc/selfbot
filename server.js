import http from "http";
import { WebSocketServer } from "ws";
import { EventEmitter } from "events";

const PORT = process.env.PORT || process.env.SERVER_PORT || 8000;

export const monitorEmitter = new EventEmitter();

const isPortAvailable = async (port) => {
    return new Promise((resolve) => {
        const testServer = http.createServer();
        testServer.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(false);
            }
        });
        testServer.once('listening', () => {
            testServer.close();
            resolve(true);
        });
        testServer.listen(port);
    });
};

const findAvailablePort = async (startPort) => {
    let port = startPort;
    while (!(await isPortAvailable(port))) {
        port++;
    }
    return port;
};

const stats = {
    startTime: Date.now(),
    messages: {
        total: 0,
        incoming: 0,
        outgoing: 0,
        groups: 0,
        private: 0
    },
    commands: {
        total: 0,
        success: 0,
        failed: 0
    },
    system: {
        cpu: 0,
        memory: 0
    }
};

const recentMessages = [];
const MAX_RECENT = 50;

monitorEmitter.on("message", data => {
    stats.messages.total++;
    if (data.fromMe) stats.messages.outgoing++;
    else stats.messages.incoming++;
    if (data.isGroup) stats.messages.groups++;
    else stats.messages.private++;
    
    recentMessages.unshift({
        ...data,
        timestamp: Date.now()
    });
    
    if (recentMessages.length > MAX_RECENT) {
        recentMessages.pop();
    }
    
    broadcast({ type: "message", data });
    broadcast({ type: "stats", data: getStats() });
});

monitorEmitter.on("command", data => {
    stats.commands.total++;
    if (data.success) stats.commands.success++;
    else stats.commands.failed++;
    
    broadcast({ type: "command", data });
    broadcast({ type: "stats", data: getStats() });
});

const getStats = () => ({
    ...stats,
    uptime: Math.floor((Date.now() - stats.startTime) / 1000),
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    memoryTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
});

const HTML_DASHBOARD = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bot Monitor Dashboard</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #0a0e27;
            color: #fff;
            overflow-x: hidden;
        }

        .bg-animated {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 0;
            overflow: hidden;
        }

        .bg-gradient {
            position: absolute;
            border-radius: 50%;
            filter: blur(80px);
            opacity: 0.3;
            animation: float 20s ease-in-out infinite;
        }

        .bg-gradient-1 {
            width: 500px;
            height: 500px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            top: -200px;
            left: -200px;
            animation-delay: 0s;
        }

        .bg-gradient-2 {
            width: 400px;
            height: 400px;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            bottom: -100px;
            right: -100px;
            animation-delay: -10s;
        }

        .bg-gradient-3 {
            width: 350px;
            height: 350px;
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            animation-delay: -5s;
        }

        @keyframes float {
            0%, 100% {
                transform: translate(0, 0) scale(1);
            }
            25% {
                transform: translate(50px, -50px) scale(1.1);
            }
            50% {
                transform: translate(-50px, 50px) scale(0.9);
            }
            75% {
                transform: translate(30px, 30px) scale(1.05);
            }
        }

        .container {
            position: relative;
            z-index: 1;
            max-width: 1600px;
            margin: 0 auto;
            padding: 30px 20px;
        }

        header {
            text-align: center;
            margin-bottom: 40px;
            animation: slideDown 0.8s ease;
        }

        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-50px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .logo {
            font-size: 3.5em;
            margin-bottom: 10px;
            animation: bounce 2s ease-in-out infinite;
        }

        @keyframes bounce {
            0%, 100% {
                transform: translateY(0);
            }
            50% {
                transform: translateY(-10px);
            }
        }

        h1 {
            font-size: 2.8em;
            font-weight: 800;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 15px;
            letter-spacing: -1px;
        }

        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 12px 24px;
            background: rgba(46, 213, 115, 0.1);
            border: 2px solid #2ed573;
            border-radius: 30px;
            font-size: 1em;
            font-weight: 600;
            backdrop-filter: blur(10px);
            box-shadow: 0 0 30px rgba(46, 213, 115, 0.3);
            animation: glow 2s ease-in-out infinite;
        }

        @keyframes glow {
            0%, 100% {
                box-shadow: 0 0 30px rgba(46, 213, 115, 0.3);
            }
            50% {
                box-shadow: 0 0 50px rgba(46, 213, 115, 0.5);
            }
        }

        .status-dot {
            width: 12px;
            height: 12px;
            background: #2ed573;
            border-radius: 50%;
            animation: pulse 1.5s ease-in-out infinite;
            box-shadow: 0 0 15px #2ed573;
        }

        @keyframes pulse {
            0%, 100% {
                transform: scale(1);
                opacity: 1;
            }
            50% {
                transform: scale(1.2);
                opacity: 0.7;
            }
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 25px;
            margin-bottom: 40px;
        }

        .stat-card {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(20px);
            padding: 30px;
            border-radius: 25px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            position: relative;
            overflow: hidden;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            animation: fadeIn 0.6s ease backwards;
        }

        .stat-card:nth-child(1) { animation-delay: 0.1s; }
        .stat-card:nth-child(2) { animation-delay: 0.2s; }
        .stat-card:nth-child(3) { animation-delay: 0.3s; }
        .stat-card:nth-child(4) { animation-delay: 0.4s; }
        .stat-card:nth-child(5) { animation-delay: 0.5s; }
        .stat-card:nth-child(6) { animation-delay: 0.6s; }
        .stat-card:nth-child(7) { animation-delay: 0.7s; }
        .stat-card:nth-child(8) { animation-delay: 0.8s; }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .stat-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
            opacity: 0;
            transition: opacity 0.4s ease;
        }

        .stat-card:hover {
            transform: translateY(-10px) scale(1.02);
            box-shadow: 0 20px 60px rgba(102, 126, 234, 0.3);
            border-color: rgba(102, 126, 234, 0.5);
        }

        .stat-card:hover::before {
            opacity: 1;
        }

        .stat-icon {
            font-size: 2.5em;
            margin-bottom: 15px;
            display: block;
            filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
        }

        .stat-label {
            font-size: 0.85em;
            color: #a0a0a0;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            font-weight: 600;
            margin-bottom: 10px;
        }

        .stat-value {
            font-size: 2.8em;
            font-weight: 800;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            line-height: 1;
            margin-bottom: 8px;
        }

        .stat-change {
            font-size: 0.85em;
            color: #2ed573;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 5px;
        }

        .section {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(20px);
            padding: 35px;
            border-radius: 25px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            margin-bottom: 30px;
            animation: fadeIn 0.8s ease backwards;
            animation-delay: 0.9s;
        }

        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid rgba(102, 126, 234, 0.2);
        }

        .section-title {
            font-size: 1.8em;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .section-icon {
            font-size: 1.2em;
            filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
        }

        .chart-wrapper {
            background: rgba(0, 0, 0, 0.2);
            padding: 30px;
            border-radius: 20px;
            position: relative;
            overflow: hidden;
        }

        .chart-container {
            height: 250px;
            display: flex;
            align-items: flex-end;
            gap: 8px;
            position: relative;
        }

        .chart-bar {
            flex: 1;
            background: linear-gradient(to top, #667eea 0%, #764ba2 50%, #f093fb 100%);
            border-radius: 8px 8px 0 0;
            min-height: 10px;
            transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            position: relative;
            box-shadow: 0 -4px 20px rgba(102, 126, 234, 0.4);
            animation: chartGrow 0.8s ease backwards;
        }

        @keyframes chartGrow {
            from {
                transform: scaleY(0);
            }
            to {
                transform: scaleY(1);
            }
        }

        .chart-bar:hover {
            filter: brightness(1.3);
            transform: scaleX(1.05);
        }

        .messages-container {
            max-height: 600px;
            overflow-y: auto;
            padding-right: 10px;
        }

        .messages-container::-webkit-scrollbar {
            width: 10px;
        }

        .messages-container::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
        }

        .messages-container::-webkit-scrollbar-thumb {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 10px;
            border: 2px solid rgba(255, 255, 255, 0.05);
        }

        .messages-container::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
        }

        .message-item {
            background: rgba(255, 255, 255, 0.03);
            padding: 20px;
            margin-bottom: 15px;
            border-radius: 18px;
            border-left: 4px solid #667eea;
            position: relative;
            overflow: hidden;
            transition: all 0.3s ease;
            animation: slideInRight 0.5s ease backwards;
        }

        @keyframes slideInRight {
            from {
                opacity: 0;
                transform: translateX(50px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        .message-item::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .message-item:hover {
            transform: translateX(5px);
            box-shadow: 0 10px 30px rgba(102, 126, 234, 0.2);
            border-left-width: 6px;
        }

        .message-item:hover::before {
            opacity: 1;
        }

        .message-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            position: relative;
            z-index: 1;
        }

        .message-sender {
            font-weight: 700;
            font-size: 1.1em;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .message-badges {
            display: flex;
            gap: 8px;
        }

        .message-badge {
            padding: 6px 14px;
            border-radius: 12px;
            font-size: 0.75em;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .badge-group {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .badge-private {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }

        .badge-outgoing {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }

        .message-text {
            color: #d0d0d0;
            line-height: 1.6;
            word-wrap: break-word;
            font-size: 0.95em;
            position: relative;
            z-index: 1;
            margin-bottom: 10px;
        }

        .message-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.8em;
            color: #808080;
            position: relative;
            z-index: 1;
        }

        .message-time {
            display: flex;
            align-items: center;
            gap: 5px;
        }

        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #808080;
        }

        .empty-icon {
            font-size: 4em;
            margin-bottom: 20px;
            opacity: 0.5;
            animation: float 3s ease-in-out infinite;
        }

        .loading {
            text-align: center;
            padding: 40px;
        }

        .spinner {
            width: 60px;
            height: 60px;
            border: 4px solid rgba(102, 126, 234, 0.2);
            border-top-color: #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
            .container {
                padding: 20px 15px;
            }

            h1 {
                font-size: 2em;
            }

            .logo {
                font-size: 2.5em;
            }

            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 15px;
            }

            .stat-card {
                padding: 20px;
            }

            .stat-value {
                font-size: 2em;
            }

            .section {
                padding: 25px 20px;
            }

            .section-title {
                font-size: 1.4em;
            }

            .chart-container {
                height: 180px;
            }

            .message-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="bg-animated">
        <div class="bg-gradient bg-gradient-1"></div>
        <div class="bg-gradient bg-gradient-2"></div>
        <div class="bg-gradient bg-gradient-3"></div>
    </div>

    <div class="container">
        <header>
            <div class="logo">🤖</div>
            <h1>BOT MONITOR DASHBOARD</h1>
            <div class="status-badge">
                <div class="status-dot"></div>
                <span id="status-text">Connecting...</span>
            </div>
        </header>

        <div class="stats-grid">
            <div class="stat-card">
                <span class="stat-icon">💬</span>
                <div class="stat-label">Total Messages</div>
                <div class="stat-value" id="total-messages">0</div>
                <div class="stat-change">📈 All time</div>
            </div>

            <div class="stat-card">
                <span class="stat-icon">📥</span>
                <div class="stat-label">Incoming</div>
                <div class="stat-value" id="incoming">0</div>
                <div class="stat-change">⬇️ Received</div>
            </div>

            <div class="stat-card">
                <span class="stat-icon">📤</span>
                <div class="stat-label">Outgoing</div>
                <div class="stat-value" id="outgoing">0</div>
                <div class="stat-change">⬆️ Sent</div>
            </div>

            <div class="stat-card">
                <span class="stat-icon">⚡</span>
                <div class="stat-label">Commands</div>
                <div class="stat-value" id="commands">0</div>
                <div class="stat-change"><span id="success">0</span> ✅ success</div>
            </div>

            <div class="stat-card">
                <span class="stat-icon">👥</span>
                <div class="stat-label">Groups</div>
                <div class="stat-value" id="groups">0</div>
                <div class="stat-change">🔗 Group chats</div>
            </div>

            <div class="stat-card">
                <span class="stat-icon">👤</span>
                <div class="stat-label">Private</div>
                <div class="stat-value" id="private">0</div>
                <div class="stat-change">💭 Private chats</div>
            </div>

            <div class="stat-card">
                <span class="stat-icon">⏱️</span>
                <div class="stat-label">Uptime</div>
                <div class="stat-value" id="uptime">0s</div>
                <div class="stat-change">🚀 Running time</div>
            </div>

            <div class="stat-card">
                <span class="stat-icon">💾</span>
                <div class="stat-label">Memory</div>
                <div class="stat-value" id="memory">0 MB</div>
                <div class="stat-change">🔥 Heap used</div>
            </div>
        </div>

        <div class="section">
            <div class="section-header">
                <div class="section-title">
                    <span class="section-icon">📊</span>
                    Live Activity
                </div>
            </div>
            <div class="chart-wrapper">
                <div class="chart-container" id="chart">
                    <div class="loading">
                        <div class="spinner"></div>
                        <div>Waiting for data...</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-header">
                <div class="section-title">
                    <span class="section-icon">💬</span>
                    Recent Messages
                </div>
            </div>
            <div class="messages-container" id="messages">
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <div>No messages yet...</div>
                </div>
            </div>
        </div>
    </div>

    <script>
        const ws = new WebSocket(\`ws://\${window.location.host}\`);
        const activityData = Array(30).fill(0);
        let chartInitialized = false;

        ws.onopen = () => {
            document.getElementById('status-text').textContent = 'Connected';
        };

        ws.onclose = () => {
            document.getElementById('status-text').textContent = 'Disconnected';
            const badge = document.querySelector('.status-badge');
            badge.style.borderColor = '#ff4757';
            badge.style.background = 'rgba(255, 71, 87, 0.1)';
            badge.style.boxShadow = '0 0 30px rgba(255, 71, 87, 0.3)';
            document.querySelector('.status-dot').style.background = '#ff4757';
            document.querySelector('.status-dot').style.boxShadow = '0 0 15px #ff4757';
        };

        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            
            if (msg.type === 'stats') {
                updateStats(msg.data);
            } else if (msg.type === 'message') {
                addMessage(msg.data);
                updateChart();
            } else if (msg.type === 'init') {
                msg.data.messages.forEach(m => addMessage(m, true));
            }
        };

        function updateStats(data) {
            animateValue('total-messages', data.messages.total);
            animateValue('incoming', data.messages.incoming);
            animateValue('outgoing', data.messages.outgoing);
            animateValue('commands', data.commands.total);
            animateValue('success', data.commands.success);
            animateValue('groups', data.messages.groups);
            animateValue('private', data.messages.private);
            
            document.getElementById('memory').textContent = data.memory + ' MB';
            
            const hours = Math.floor(data.uptime / 3600);
            const minutes = Math.floor((data.uptime % 3600) / 60);
            const seconds = data.uptime % 60;
            document.getElementById('uptime').textContent = 
                hours > 0 ? \`\${hours}h \${minutes}m\` : 
                minutes > 0 ? \`\${minutes}m \${seconds}s\` : 
                \`\${seconds}s\`;
        }

        function animateValue(id, newValue) {
            const element = document.getElementById(id);
            const currentValue = parseInt(element.textContent) || 0;
            
            if (currentValue === newValue) return;
            
            const duration = 500;
            const steps = 20;
            const increment = (newValue - currentValue) / steps;
            let current = currentValue;
            let step = 0;
            
            const timer = setInterval(() => {
                step++;
                current += increment;
                element.textContent = Math.round(current);
                
                if (step >= steps) {
                    element.textContent = newValue;
                    clearInterval(timer);
                }
            }, duration / steps);
        }

        function addMessage(data, isInit = false) {
            const container = document.getElementById('messages');
            
            if (container.querySelector('.empty-state')) {
                container.innerHTML = '';
            }
            
            const item = document.createElement('div');
            item.className = 'message-item';
            if (!isInit) {
                item.style.animationDelay = '0s';
            }
            
            const time = new Date(data.timestamp || Date.now()).toLocaleTimeString('id-ID');
            const typeIcon = data.isGroup ? '👥' : '💬';
            const typeText = data.isGroup ? 'Group' : 'Private';
            const directionClass = data.fromMe ? 'badge-outgoing' : (data.isGroup ? 'badge-group' : 'badge-private');
            const directionText = data.fromMe ? 'Outgoing' : 'Incoming';
            const text = data.text?.substring(0, 150) || '[Media/Sticker]';
            
            item.innerHTML = \`
                <div class="message-header">
                    <div class="message-sender">
                        \${typeIcon} \${data.sender}
                    </div>
                    <div class="message-badges">
                        <span class="message-badge \${directionClass}">\${directionText}</span>
                    </div>
                </div>
                <div class="message-text">\${text}</div>
                <div class="message-footer">
                    <div class="message-time">🕐 \${time}</div>
                    <div>\${typeIcon} \${typeText}</div>
                </div>
            \`;
            
            container.insertBefore(item, container.firstChild);
            
            if (container.children.length > 50) {
                container.removeChild(container.lastChild);
            }
        }

        function updateChart() {
            if (!chartInitialized) {
                document.getElementById('chart').innerHTML = '';
                chartInitialized = true;
            }
            
            activityData.shift();
            activityData.push((activityData[activityData.length - 1] || 0) + 1);
            
            const chart = document.getElementById('chart');
            const max = Math.max(...activityData, 1);
            
            chart.innerHTML = activityData.map((value, index) => {
                const height = (value / max) * 100;
                return \`<div class="chart-bar" style="height: \${height}%; animation-delay: \${index * 0.02}s"></div>\`;
            }).join('');
        }

        setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000);
    </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
    if (req.url === "/" || req.url === "/monitor") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(HTML_DASHBOARD);
    } else if (req.url === "/api/stats") {
        res.writeHead(200, { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        });
        res.end(JSON.stringify({
            ...getStats(),
            recentMessages: recentMessages.slice(0, 10)
        }));
    } else {
        res.writeHead(200, { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        });
        res.end(JSON.stringify({
            status: "healthy",
            uptime: Math.floor((Date.now() - stats.startTime) / 1000),
            timestamp: new Date().toISOString()
        }));
    }
});

const wss = new WebSocketServer({ server });
const clients = new Set();

wss.on("connection", ws => {
    clients.add(ws);
    console.log("🔌 New monitor client connected");
    
    ws.send(JSON.stringify({
        type: "stats",
        data: getStats()
    }));
    
    ws.send(JSON.stringify({
        type: "init",
        data: {
            messages: recentMessages.slice(0, 20)
        }
    }));
    
    ws.on("close", () => {
        clients.delete(ws);
        console.log("🔌 Monitor client disconnected");
    });
});

function broadcast(data) {
    const message = JSON.stringify(data);
    clients.forEach(client => {
        if (client.readyState === 1) {
            client.send(message);
        }
    });
}

const startServer = async () => {
    const availablePort = await findAvailablePort(PORT);
    
    server.listen(availablePort, () => {
        console.log(`🏥 Monitor server running on port ${availablePort}`);
        console.log(`🔗 Dashboard: http://localhost:${availablePort}/monitor`);
        console.log(`🔗 API: http://localhost:${availablePort}/api/stats`);
    });
};

startServer();

process.on("SIGINT", () => {
    console.log("\n⏹️  Monitor server stopped");
    server.close();
    process.exit(0);
});