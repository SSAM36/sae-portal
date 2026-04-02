import { io } from 'socket.io-client';

const URL = import.meta.env.MODE === 'production' ? window.location.origin : 'http://localhost:3001';

export const socket = io(URL);
