import http from "http";
import { WebSocketServer } from "ws";
import { EventEmitter } from "events";

const PORT = process.env.PORT || process.env.SERVER_PORT || 8000;

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

export const monitorEmitter = new EventEmitter();

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
    <title>Bot Monitor - Real-time Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #e4e4e4;
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: rgba(255,255,255,0.05);
            border-radius: 15px;
            backdrop-filter: blur(10px);
        }

        h1 {
            font-size: 2.5em;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }

        .status {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            background: rgba(46, 213, 115, 0.1);
            border: 1px solid #2ed573;
            border-radius: 20px;
            font-size: 0.9em;
        }

        .status-dot {
            width: 8px;
            height: 8px;
            background: #2ed573;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .card {
            background: rgba(255,255,255,0.05);
            padding: 20px;
            border-radius: 15px;
            border: 1px solid rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
        }

        .card-title {
            font-size: 0.85em;
            color: #a0a0a0;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .card-value {
            font-size: 2em;
            font-weight: bold;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .card-subtitle {
            font-size: 0.8em;
            color: #808080;
            margin-top: 5px;
        }

        .section {
            background: rgba(255,255,255,0.05);
            padding: 25px;
            border-radius: 15px;
            border: 1px solid rgba(255,255,255,0.1);
            margin-bottom: 20px;
        }

        .section-title {
            font-size: 1.3em;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid rgba(102, 126, 234, 0.3);
        }

        .messages-container {
            max-height: 500px;
            overflow-y: auto;
        }

        .messages-container::-webkit-scrollbar {
            width: 8px;
        }

        .messages-container::-webkit-scrollbar-track {
            background: rgba(255,255,255,0.05);
            border-radius: 10px;
        }

        .messages-container::-webkit-scrollbar-thumb {
            background: rgba(102, 126, 234, 0.5);
            border-radius: 10px;
        }

        .message-item {
            padding: 15px;
            margin-bottom: 10px;
            background: rgba(255,255,255,0.03);
            border-radius: 10px;
            border-left: 3px solid #667eea;
            animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateX(-20px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        .message-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }

        .message-sender {
            font-weight: 600;
            color: #667eea;
        }

        .message-type {
            padding: 3px 8px;
            border-radius: 5px;
            font-size: 0.75em;
            background: rgba(102, 126, 234, 0.2);
        }

        .message-text {
            color: #d0d0d0;
            word-wrap: break-word;
        }

        .message-time {
            font-size: 0.75em;
            color: #808080;
            margin-top: 5px;
        }

        .chart-container {
            height: 200px;
            display: flex;
            align-items: flex-end;
            gap: 10px;
            padding: 20px;
            background: rgba(255,255,255,0.02);
            border-radius: 10px;
        }

        .chart-bar {
            flex: 1;
            background: linear-gradient(to top, #667eea, #764ba2);
            border-radius: 5px 5px 0 0;
            min-height: 10px;
            transition: height 0.3s ease;
        }

        @media (max-width: 768px) {
            .grid {
                grid-template-columns: repeat(2, 1fr);
            }

            h1 {
                font-size: 1.8em;
            }

            .card-value {
                font-size: 1.5em;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🤖 BOT MONITOR</h1>
            <div class="status">
                <div class="status-dot"></div>
                <span id="status-text">Connected</span>
            </div>
        </header>

        <div class="grid">
            <div class="card">
                <div class="card-title">Total Messages</div>
                <div class="card-value" id="total-messages">0</div>
                <div class="card-subtitle">All time</div>
            </div>

            <div class="card">
                <div class="card-title">Incoming</div>
                <div class="card-value" id="incoming">0</div>
                <div class="card-subtitle">Received</div>
            </div>

            <div class="card">
                <div class="card-title">Outgoing</div>
                <div class="card-value" id="outgoing">0</div>
                <div class="card-subtitle">Sent</div>
            </div>

            <div class="card">
                <div class="card-title">Commands</div>
                <div class="card-value" id="commands">0</div>
                <div class="card-subtitle"><span id="success">0</span> success</div>
            </div>

            <div class="card">
                <div class="card-title">Groups</div>
                <div class="card-value" id="groups">0</div>
                <div class="card-subtitle">Group chats</div>
            </div>

            <div class="card">
                <div class="card-title">Private</div>
                <div class="card-value" id="private">0</div>
                <div class="card-subtitle">Private chats</div>
            </div>

            <div class="card">
                <div class="card-title">Uptime</div>
                <div class="card-value" id="uptime">0s</div>
                <div class="card-subtitle">Running time</div>
            </div>

            <div class="card">
                <div class="card-title">Memory</div>
                <div class="card-value" id="memory">0 MB</div>
                <div class="card-subtitle">Heap used</div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">📊 Live Activity</div>
            <div class="chart-container" id="chart"></div>
        </div>

        <div class="section">
            <div class="section-title">💬 Recent Messages</div>
            <div class="messages-container" id="messages"></div>
        </div>
    </div>

    <script>
        const ws = new WebSocket(\`ws://\${window.location.host}\`);
        
        const activityData = Array(20).fill(0);
        
        ws.onopen = () => {
            document.getElementById('status-text').textContent = 'Connected';
        };

        ws.onclose = () => {
            document.getElementById('status-text').textContent = 'Disconnected';
            document.querySelector('.status').style.borderColor = '#ff4757';
            document.querySelector('.status-dot').style.background = '#ff4757';
        };

        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            
            if (msg.type === 'stats') {
                updateStats(msg.data);
            } else if (msg.type === 'message') {
                addMessage(msg.data);
                updateChart();
            }
        };

        function updateStats(data) {
            document.getElementById('total-messages').textContent = data.messages.total;
            document.getElementById('incoming').textContent = data.messages.incoming;
            document.getElementById('outgoing').textContent = data.messages.outgoing;
            document.getElementById('commands').textContent = data.commands.total;
            document.getElementById('success').textContent = data.commands.success;
            document.getElementById('groups').textContent = data.messages.groups;
            document.getElementById('private').textContent = data.messages.private;
            document.getElementById('memory').textContent = data.memory + ' MB';
            
            const hours = Math.floor(data.uptime / 3600);
            const minutes = Math.floor((data.uptime % 3600) / 60);
            const seconds = data.uptime % 60;
            document.getElementById('uptime').textContent = 
                hours > 0 ? \`\${hours}h \${minutes}m\` : 
                minutes > 0 ? \`\${minutes}m \${seconds}s\` : 
                \`\${seconds}s\`;
        }

        function addMessage(data) {
            const container = document.getElementById('messages');
            const item = document.createElement('div');
            item.className = 'message-item';
            
            const time = new Date().toLocaleTimeString('id-ID');
            const type = data.isGroup ? '👥 Group' : '💬 Private';
            const text = data.text?.substring(0, 100) || '[Media/Sticker]';
            
            item.innerHTML = \`
                <div class="message-header">
                    <span class="message-sender">\${data.sender}</span>
                    <span class="message-type">\${type}</span>
                </div>
                <div class="message-text">\${text}</div>
                <div class="message-time">\${time}</div>
            \`;
            
            container.insertBefore(item, container.firstChild);
            
            if (container.children.length > 50) {
                container.removeChild(container.lastChild);
            }
        }

        function updateChart() {
            activityData.shift();
            activityData.push(activityData[activityData.length - 1] + 1);
            
            const chart = document.getElementById('chart');
            const max = Math.max(...activityData, 1);
            
            chart.innerHTML = activityData.map(value => 
                \`<div class="chart-bar" style="height: \${(value / max) * 100}%"></div>\`
            ).join('');
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