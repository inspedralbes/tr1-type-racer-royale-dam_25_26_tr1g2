// server.js
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid'); // Per generar IDs únics als clients

// Crear servidor de WebSocket a port 8080
const wss = new WebSocket.Server({ port: 8080 }, () => {
    console.log('Servidor WebSocket en marxa al port 8080');
});

// Map per guardar clients amb el seu ID
const clients = new Map();

wss.on('connection', (ws) => {
    // Assignem un ID únic a cada client
    const clientId = uuidv4();
    clients.set(clientId, ws);
    console.log(`[${new Date().toLocaleTimeString()}] Nou client connectat: ${clientId}`);

    // Enviar missatge de benvinguda
    ws.send(JSON.stringify({ type: 'welcome', message: 'Benvingut al servidor WebSocket!', clientId }));

    // Quan el client envia un missatge
    ws.on('message', (message) => {
        let data;
        try {
            data = JSON.parse(message);
        } catch (err) {
            console.log('No és JSON:', message);
            data = { type: 'text', message };
        }

        console.log(`[${new Date().toLocaleTimeString()}] Missatge rebut de ${clientId}:`, data);

        // Broadcast: enviar a tots els clients
        for (const [id, client] of clients.entries()) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    from: clientId,
                    type: data.type || 'text',
                    message: data.message || data
                }));
            }
        }
    });

    // Quan el client es desconnecta
    ws.on('close', () => {
        clients.delete(clientId);
        console.log(`[${new Date().toLocaleTimeString()}] Client desconnectat: ${clientId}`);
    });

    // Maneig d’errors
    ws.on('error', (err) => {
        console.log(`Error WS amb client ${clientId}:`, err);
    });
});
