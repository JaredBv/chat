// 1. Importar las librerías necesarias
var express = require('express');
var socket = require('socket.io');

// 2. Configuración de la aplicación Express
var app = express();

// 3. Inicializar el servidor y escuchar en el puerto 4000
var server = app.listen(4000, function(){
    console.log('Servidor corriendo en http://localhost:4000');
});

// 4. Servir archivos estáticos (HTML, CSS, JS del cliente)
// Asume que la carpeta del cliente (donde está el index.html) se llama 'public'
app.use(express.static('public'));

// 5. Configurar Socket.IO para trabajar con el servidor Express
// -------------------------------------------------------------
// CORRECCIÓN CLAVE: Agregar la configuración 'cors' para permitir cualquier origen ('*')
var io = socket(server, {
    cors: {
        origin: "*", // Permite la conexión desde cualquier dominio/IP
        methods: ["GET", "POST"] // Permite los métodos necesarios para el handshake
    }
});
// -------------------------------------------------------------

// 6. Manejo de Eventos de Conexión de Socket.IO
io.on('connection', function(socket){
    // Este código se ejecuta cada vez que un nuevo cliente se conecta
    console.log('Hay una conexion', socket.id);

    // ********** MANEJO DE EVENTOS DEL CHAT **********

    // A. Evento 'chat': Recepción de un mensaje del cliente
    socket.on('chat', function(data){
        console.log(data); // Opcional: registrar el mensaje en el servidor
        
        // io.sockets.emit: Envía el mensaje 'chat' a *todos* los clientes conectados
        io.sockets.emit('chat', data);
    });

    // B. Evento 'typing': Notificación de que un cliente está escribiendo
    socket.on('typing', function(data){
        // socket.broadcast.emit: Envía el evento 'typing' a *todos menos al que lo envió*
        socket.broadcast.emit('typing', data);
    });

});