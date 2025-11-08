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
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
            color: #ffffff;
            min-height: 100vh;
            padding: 15px;
            overflow-x: hidden;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        header {
            text-align: center;
            margin-bottom: 25px;
            padding: 25px 15px;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
            border-radius: 20px;
            backdrop-filter: blur(20px);
            border: 2px solid rgba(102, 126, 234, 0.3);
            box-shadow: 0 8px 32px rgba(102, 126, 234, 0.2);
            animation: fadeInDown 0.5s ease;
        }

        @keyframes fadeInDown {
            from {
                opacity: 0;
                transform: translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        h1 {
            font-size: clamp(1.8em, 5vw, 2.8em);
            background: linear-gradient(135deg, #667eea 0%, #f093fb 50%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 15px;
            font-weight: 800;
            animation: glow 3s ease-in-out infinite;
        }

        @keyframes glow {
            0%, 100% { filter: drop-shadow(0 0 10px rgba(102, 126, 234, 0.5)); }
            50% { filter: drop-shadow(0 0 20px rgba(118, 75, 162, 0.8)); }
        }

        .status {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 10px 20px;
            background: linear-gradient(135deg, rgba(46, 213, 115, 0.2) 0%, rgba(88, 214, 141, 0.2) 100%);
            border: 2px solid #2ed573;
            border-radius: 25px;
            font-size: 0.95em;
            font-weight: 600;
            box-shadow: 0 4px 15px rgba(46, 213, 115, 0.3);
            animation: fadeIn 0.6s ease;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .status-dot {
            width: 10px;
            height: 10px;
            background: #2ed573;
            border-radius: 50%;
            box-shadow: 0 0 10px #2ed573;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { 
                opacity: 1;
                transform: scale(1);
            }
            50% { 
                opacity: 0.6;
                transform: scale(1.2);
            }
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 25px;
        }

        .card {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
            padding: 20px 15px;
            border-radius: 18px;
            border: 2px solid rgba(102, 126, 234, 0.3);
            backdrop-filter: blur(20px);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
            animation: slideUp 0.5s ease;
        }

        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 100%);
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
            border-color: rgba(102, 126, 234, 0.6);
        }

        .card:hover::before {
            opacity: 1;
        }

        .card-title {
            font-size: 0.75em;
            color: #b8b8ff;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            font-weight: 600;
        }

        .card-value {
            font-size: clamp(1.5em, 4vw, 2.2em);
            font-weight: 800;
            background: linear-gradient(135deg, #667eea 0%, #f093fb 50%, #4facfe 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 5px;
        }

        .card-subtitle {
            font-size: 0.75em;
            color: #9b9bff;
            margin-top: 5px;
            font-weight: 500;
        }

        .section {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
            padding: 20px 15px;
            border-radius: 18px;
            border: 2px solid rgba(102, 126, 234, 0.25);
            margin-bottom: 20px;
            backdrop-filter: blur(20px);
            animation: slideUp 0.6s ease;
        }

        .section-title {
            font-size: clamp(1.1em, 3vw, 1.4em);
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 3px solid;
            border-image: linear-gradient(90deg, #667eea 0%, #f093fb 100%) 1;
            font-weight: 700;
            color: #ffffff;
        }

        .messages-container {
            max-height: 450px;
            overflow-y: auto;
            padding-right: 5px;
        }

        .messages-container::-webkit-scrollbar {
            width: 6px;
        }

        .messages-container::-webkit-scrollbar-track {
            background: rgba(102, 126, 234, 0.1);
            border-radius: 10px;
        }

        .messages-container::-webkit-scrollbar-thumb {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 10px;
        }

        .message-item {
            padding: 15px;
            margin-bottom: 12px;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.12) 0%, rgba(118, 75, 162, 0.12) 100%);
            border-radius: 12px;
            border-left: 4px solid;
            border-image: linear-gradient(135deg, #667eea 0%, #f093fb 100%) 1;
            animation: slideIn 0.4s ease;
            transition: all 0.3s ease;
        }

        .message-item:hover {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
            transform: translateX(5px);
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateX(-30px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        .message-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            flex-wrap: wrap;
            gap: 8px;
        }

        .message-sender {
            font-weight: 700;
            background: linear-gradient(135deg, #667eea 0%, #f093fb 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-size: 0.95em;
        }

        .message-type {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.7em;
            font-weight: 600;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%);
            border: 1px solid rgba(102, 126, 234, 0.5);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .message-text {
            color: #e0e0ff;
            word-wrap: break-word;
            line-height: 1.5;
            font-size: 0.9em;
        }

        .message-time {
            font-size: 0.7em;
            color: #9b9bff;
            margin-top: 8px;
            font-weight: 500;
        }

        .chart-container {
            height: 180px;
            display: flex;
            align-items: flex-end;
            gap: 8px;
            padding: 20px 15px;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
            border-radius: 12px;
            border: 2px solid rgba(102, 126, 234, 0.2);
        }

        .chart-bar {
            flex: 1;
            background: linear-gradient(to top, #667eea 0%, #f093fb 50%, #4facfe 100%);
            border-radius: 6px 6px 0 0;
            min-height: 8px;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 -4px 10px rgba(102, 126, 234, 0.3);
            animation: barGrow 0.5s ease;
        }

        .chart-bar:hover {
            opacity: 0.8;
            transform: scaleY(1.05);
        }

        @keyframes barGrow {
            from {
                height: 0;
                opacity: 0;
            }
            to {
                opacity: 1;
            }
        }

        @media (max-width: 768px) {
            body {
                padding: 10px;
            }

            .grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
            }

            .card {
                padding: 15px 12px;
            }

            .section {
                padding: 15px 12px;
            }

            .messages-container {
                max-height: 350px;
            }

            .chart-container {
                height: 140px;
                padding: 15px 10px;
            }
        }

        @media (max-width: 480px) {
            .grid {
                grid-template-columns: 1fr;
            }

            .card-value {
                font-size: 1.8em;
            }

            .message-header {
                flex-direction: column;
                align-items: flex-start;
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
        const ws = new WebSocket('ws://' + window.location.host);
        
        const activityData = Array(20).fill(0);
        window.lastUptime = 0;
        
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
            } else if (msg.type === 'init') {
                if (msg.data.messages) {
                    msg.data.messages.forEach(m => addMessage(m));
                }
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
            const text = data.text ? data.text.substring(0, 100) : '[Media/Sticker]';
            
            item.innerHTML = '<div class="message-header">' +
                '<span class="message-sender">' + (data.sender || 'Unknown') + '</span>' +
                '<span class="message-type">' + type + '</span>' +
                '</div>' +
                '<div class="message-text">' + text + '</div>' +
                '<div class="message-time">' + time + '</div>';
            
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
            
            chart.innerHTML = activityData.map(value => {
                const height = (value / max) * 100;
                return '<div class="chart-bar" style="height: ' + height + '%"></div>';
            }).join('');
        }

        setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 5000);

        setInterval(() => {
            window.lastUptime++;
            document.getElementById('uptime').textContent = formatUptime(window.lastUptime);
        }, 1000);
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
    
    ws.on("message", msg => {
        try {
            const data = JSON.parse(msg);
            if (data.type === "ping") {
                ws.send(JSON.stringify({
                    type: "pong",
                    timestamp: Date.now()
                }));
            }
        } catch (e) {}
    });
});

setInterval(() => {
    broadcast({
        type: "stats",
        data: getStats()
    });
}, 2000);

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