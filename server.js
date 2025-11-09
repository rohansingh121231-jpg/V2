const express = require('express');
const { ExpressPeerServer } = require('peer');
const http = require('http');
const cors = require('cors'); // Naya: CORS library ko import karein

const app = express();
// Render.com 'PORT' naam ka ek environment variable dega.
// Agar woh nahi milta, to local testing ke liye 9000 use karein.
const port = process.env.PORT || 9000;

// --- NAYA CODE START ---
// CORS (Cross-Origin Resource Sharing) ko enable karein
// Iske bina Netlify (e.g., 'app.netlify.app') aapke Render server ('app.onrender.com') se connect nahi kar paayega.
// Yeh server ko batata hai ki kisi bhi domain se aa rahi request ko allow karo.
app.use(cors());
// --- NAYA CODE END ---

// Yeh route Uptime Robot ke liye hai, taaki server jaagta rahe.
app.get('/', (req, res) => {
  // Hum 'index.html' serve nahi kar rahe hain, kyonki woh ab Netlify par hai.
  res.send('PeerJS signaling server is alive and running!');
});

// HTTP server banayein
const server = http.createServer(app);

// PeerServer ko configure karein
const peerServer = ExpressPeerServer(server, {
  path: '/peerjs', // Humara server is path par chalega (e.g., my-app.onrender.com/peerjs)
  allow_discovery: true, // Users ko connect karne de
});

// PeerServer ko Express app ke saath jodein
app.use(peerServer);

// Server ko chalu karein
server.listen(port, () => {
  console.log(`Server ${port} par chalu ho gaya hai.`);
});
