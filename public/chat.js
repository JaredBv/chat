// 1. Establecer la conexión de Socket.IO con el servidor
var socket = io.connect('http://18.219.61.54:4000');
// 2. Obtener referencias a los elementos del DOM (Interfaz de Usuario)
var persona = document.getElementById('persona'),
    appChat = document.getElementById('app-chat'),
    panelBienvenida = document.getElementById('panel-bienvenida'),
    usuario = document.getElementById('usuario'),
    mensaje = document.getElementById('output'), // Corregido: 'mensaje' apunta al input 'output' en el HTML
    botonEnviar = document.getElementById('enviar'),
    escribiendoMensaje = document.getElementById('escribiendo-mensaje'),
    output = document.getElementById('ventana-mensajes'); // Corregido: 'output' apunta al div 'ventana-mensajes' en el HTML

// 3. Función para ingresar al chat (Invocada por el botón "Ingresar al chat" en el HTML)
function ingresarAlChat(){
    // Verificar que se haya ingresado un nombre
    if(persona.value){
        // Ocultar el panel de bienvenida
        panelBienvenida.style.display = "none";
        // Mostrar la aplicación de chat
        appChat.style.display = "block";
        
        // Asignar el nombre de usuario y hacerlo de solo lectura en el chat
        var nombreDeUsuario = persona.value;
        usuario.value = nombreDeUsuario;
        usuario.readOnly = true;
    }
}

// 4. Manejo del Evento "Enviar Mensaje" (Click en el botón)
botonEnviar.addEventListener('click', function(){
    // Verificar que el campo de mensaje no esté vacío
    if(mensaje.value){
        // Enviar evento 'chat' al servidor con el mensaje y el usuario
        socket.emit('chat', {
            mensaje: mensaje.value,
            usuario: usuario.value
        });
    }
    // Limpiar el campo de mensaje después de enviarlo
    mensaje.value = '';
});

// 5. Manejo del Evento "Escribiendo" (Al presionar una tecla en el campo de mensaje)
mensaje.addEventListener('keyup', function(){
    // Se asume que la comprobación `if(persona.value)` es un vestigio o error del código original.
    // La lógica aquí debería ser simplemente emitir el evento 'typing'.
    
    // Emitir evento 'typing' al servidor
    socket.emit('typing', {
        nombre: usuario.value,
        texto: mensaje.value // El valor del texto es usado para saber si el campo está vacío (ver línea 36)
    });
});

// ********** MANEJO DE EVENTOS RECIBIDOS DEL SERVIDOR **********

// 6. Escuchar el Evento 'chat' (Recepción de un mensaje de otro usuario)
socket.on('chat', function(data){
    // Limpiar la notificación de "escribiendo"
    escribiendoMensaje.innerHTML = '';
    
    // Agregar el nuevo mensaje al div 'output' (ventana-mensajes)
    output.innerHTML += '<p><strong>' + data.usuario + ': </strong>' + data.mensaje + '</p>';
});

// 7. Escuchar el Evento 'typing' (Recepción de la notificación "está escribiendo")
socket.on('typing', function(data){
    // Si el campo de texto no está vacío (data.texto.length > 0 o simplemente data.texto)
    if(data.texto){
        // Mostrar la notificación de que el usuario está escribiendo
        escribiendoMensaje.innerHTML = '<p><em>' + data.nombre + '</em> está escribiendo un mensaje...</p>';
    } else {
        // Si el campo de texto está vacío (el usuario dejó de escribir o borró el texto), limpiar la notificación
        escribiendoMensaje.innerHTML = '';
    }
});