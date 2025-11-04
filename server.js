import http from "http";

const PORT = process.env.PORT || process.env.SERVER_PORT || 8000;

const generateRandomString = (length = 16) => {
    return Math.random().toString(36).substring(2, length + 2) + 
           Date.now().toString(36);
};

const server = http.createServer((req, res) => {
    const startTime = Date.now();
    
    const healthData = {
        status: "healthy",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        randomString: generateRandomString(),
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        },
        responseTime: Date.now() - startTime
    };

    res.writeHead(200, { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
    });
    
    res.end(JSON.stringify(healthData, null, 2));
});

server.listen(PORT, () => {
    console.log(`🏥 Health server running on port ${PORT}`);
    console.log(`🔗 http://localhost:${PORT}`);
});

process.on("SIGINT", () => {
    console.log("\n⏹️  Health server stopped");
    server.close();
    process.exit(0);
});