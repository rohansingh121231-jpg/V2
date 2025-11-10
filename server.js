 // Yeh server.js file hai
// Yeh Render.com par chalega

const express = require('express');
const { ExpressPeerServer } = require('peer');
const cors = require('cors'); // CORS library ko import karein

const app = express();
// Render.com PORT environment variable se leta hai
const port = process.env.PORT || 9000;

// Uptime Robot ke liye ek simple '/' route
app.get('/', (req, res) => {
  res.status(200).send('QR Send Server is live!');
});

// CORS Options
const corsOptions = {
  origin: '*' // Sabhi domains ko allow karein
};

// CORS ko Express app par apply karein
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Sabhi routes ke liye OPTIONS allow karein

// HTTP server banayein
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// PeerJS server ko configure karein
const peerServer = ExpressPeerServer(server, {
  // --- BADLAAV 1 YAHAN ---
  // Path ko '/' (root) par set karein
  path: '/',
  allow_discovery: true,
  corsOptions: corsOptions
});

// --- BADLAAV 2 YAHAN ---
// PeerJS server ko '/mypeer' (ek naya, unique path) par use karein
// Ab aapka server ...onrender.com/mypeer par request ka intezaar karega
app.use('/mypeer', peerServer);

peerServer.on('connection', (client) => {
  console.log(`Client connected: ${client.getId()}`);
});

peerServer.on('disconnect', (client) => {
  console.log(`Client disconnected: ${client.getId()}`);
});
