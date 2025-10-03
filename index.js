// index.js (Express + Socket.IO) - minimal, persistencia en /public/messages.json
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

const DATA_FILE = path.join(__dirname, 'public', 'messages.json');
let messages = [];
try { messages = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '[]'); } catch(e){ messages = []; }

function saveMessages(){ fs.writeFileSync(DATA_FILE, JSON.stringify(messages, null, 2)); }

let users = {}; // socketId -> { username }

io.on('connection', socket => {
  console.log('conectado', socket.id);

  // Enviamos historial (últimos 100)
  socket.emit('history', messages.slice(-100));

  // Registro de username desde cliente
  socket.on('register', (username) => {
    socket.username = username;
    users[socket.id] = { username };
    io.emit('users', Object.values(users)); // actualizar lista online
  });

  // Nuevo mensaje: servidor genera ID y lo guarda
  socket.on('chat', (data) => {
    const msg = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2,5),
      usuario: data.usuario,
      mensaje: data.mensaje,
      hora: new Date().toISOString(),
      edited: false,
      deleted: false,
      reactions: {}, // emoji -> [usernames]
      seenBy: [] // lista de usernames que han visto
    };
    messages.push(msg);
    saveMessages();
    io.emit('chat', msg);
  });

  // Editar mensaje (servidor valida autor)
  socket.on('editar-mensaje', (data) => {
    const msg = messages.find(m => m.id === data.id);
    if(msg && msg.usuario === data.usuario){
      msg.mensaje = data.nuevoTexto;
      msg.edited = true;
      msg.editedAt = new Date().toISOString();
      saveMessages();
      io.emit('editar-mensaje', { id: msg.id, nuevoTexto: msg.mensaje, editedAt: msg.editedAt });
    }
  });

  // "Borrado" lógico (marcar deleted = true)
  socket.on('eliminar-mensaje', (data) => {
    const msg = messages.find(m => m.id === data.id);
    if(msg && msg.usuario === data.usuario){
      msg.deleted = true;
      msg.deletedAt = new Date().toISOString();
      saveMessages();
      io.emit('eliminar-mensaje', { id: msg.id });
    }
  });

  // Reacciones
  socket.on('reaccion', ({ id, emoji, usuario }) => {
    const msg = messages.find(m => m.id === id);
    if(!msg) return;
    msg.reactions[emoji] = msg.reactions[emoji] || [];
    const idx = msg.reactions[emoji].indexOf(usuario);
    if(idx === -1) msg.reactions[emoji].push(usuario);
    else msg.reactions[emoji].splice(idx,1);
    saveMessages();
    io.emit('reaccion', { id, reactions: msg.reactions });
  });

  // Read receipt: cliente dice que vio mensaje
  socket.on('message-seen', ({ id, usuario }) => {
    const msg = messages.find(m => m.id === id);
    if(!msg) return;
    if(!msg.seenBy.includes(usuario)) msg.seenBy.push(usuario);
    saveMessages();
    io.emit('message-seen', { id, seenBy: msg.seenBy });
  });

  socket.on('disconnect', () => {
    delete users[socket.id];
    io.emit('users', Object.values(users));
    console.log('desconectado', socket.id);
  });
});

server.listen(4000, () => console.log('Servidor en http://18.219.61.54:4000'));
