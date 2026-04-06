import { io } from 'socket.io-client';

// Use same origin to take advantage of Vite proxy or relative deployment
// Avoids hardcoding localhost so it works immediately via ngrok tunneling or Render deployment
export const URL = process.env.NODE_ENV === 'production' 
  ? window.location.origin 
  : window.location.origin;

export const socket = io(URL, {
  autoConnect: true,
});
