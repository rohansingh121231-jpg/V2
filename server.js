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
// Yeh zaroori hai taaki aapki Netlify website (alag domain)
// aapke Render server (alag domain) se baat kar sake.
const corsOptions = {
  // '*' ka matlab hai 'kisi bhi domain se request ko allow karo'
  // Yeh setup ke liye aasaan hai.
  origin: '*'
};

// CORS ko Express app par apply karein
app.use(cors(corsOptions));

// HTTP server banayein
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// PeerJS server ko configure karein
const peerServer = ExpressPeerServer(server, {
  path: '/peerjs', // Humara custom path
  allow_discovery: true,
  corsOptions: corsOptions // PeerServer ko bhi CORS options dein
});

// PeerJS server ko '/peerjs' path par use karein
app.use('/peerjs', peerServer);

peerServer.on('connection', (client) => {
  console.log(`Client connected: ${client.getId()}`);
});

peerServer.on('disconnect', (client) => {
  console.log(`Client disconnected: ${client.getId()}`);
});
