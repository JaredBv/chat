// chat.js (fragmentos clave)
var socket = io.connect('http://18.222.255.136:4000');
var persona = document.getElementById('persona'),
    appChat = document.getElementById('app-chat'),
    panelBienvenida = document.getElementById('panel-bienvenida'),
    usuario = document.getElementById('usuario'),
    mensaje = document.getElementById('output'),
    botonEnviar = document.getElementById('enviar'),
    escribiendoMensaje = document.getElementById('escribiendo-mensaje'),
    output = document.getElementById('ventana-mensajes'),
    userList = document.getElementById('user-list'); // crea este div en index.html

// helper: color por nombre
function colorFromName(name){
    let hash = 0;
    for(let i=0;i<name.length;i++) hash = name.charCodeAt(i) + ((hash<<5)-hash);
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue} 60% 40%)`;
}

// render de mensaje (llámala por cada msg)
function renderMessage(msg){
    // si borrado
    const horaLocal = new Date(msg.hora).toLocaleTimeString();
    const esMio = msg.usuario === usuario.value;
    if(msg.deleted){
        output.innerHTML += `
            <div class="mensaje ${esMio ? 'mio' : 'otro'}" id="${msg.id}">
                <div class="burbuja">
                    <div class="cabecera">
                        <strong>${msg.usuario}</strong>
                        ${esMio ? `
                          <span class="acciones">
                            <button class="editar" style="display:none"></button>
                            <button class="eliminar">🗑️</button>
                          </span>` : ''}
                    </div>
                    <div class="contenido">
                        <em class="texto-eliminado">Mensaje eliminado</em>
                        <span class="hora">${horaLocal}</span>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    // reacciones render simple
    const reactionsHTML = msg.reactions ? Object.entries(msg.reactions).map(([e,arr]) => `<span class="reaction">${e} ${arr.length}</span>`).join(' ') : '';

    output.innerHTML += `
      <div class="mensaje ${esMio ? 'mio' : 'otro'}" id="${msg.id}">
        <div class="burbuja">
          <div class="cabecera">
            <div style="display:flex;align-items:center;gap:8px">
              <div class="avatar" style="background:${colorFromName(msg.usuario)}">${msg.usuario.charAt(0).toUpperCase()}</div>
              <strong>${msg.usuario}${msg.edited ? ' <small>(editado)</small>' : ''}</strong>
            </div>
            ${esMio ? `<span class="acciones">
                         <button class="editar"></button>
                         <button class="eliminar">🗑️</button>
                       </span>` : ''}
          </div>
          <div class="contenido">
            <span class="texto">${escapeHtml(msg.mensaje)}</span>
            <span class="hora">${horaLocal}</span>
          </div>
          <div class="reactions">${reactionsHTML}</div>
        </div>
      </div>
    `;

    // añadir listeners para mi mensaje
    if(esMio){
        let msgDiv = document.getElementById(msg.id);
        let btnEditar = msgDiv.querySelector('.editar');
        let btnEliminar = msgDiv.querySelector('.eliminar');
        let textoSpan = msgDiv.querySelector('.texto');

        btnEditar.addEventListener('click', () => {
            let input = document.createElement('input');
            input.type = 'text';
            input.value = textoSpan.innerText;
            input.className = 'editar-input';
            textoSpan.replaceWith(input);
            input.focus();
            const guardar = () => {
                const nuevo = input.value.trim();
                if(nuevo){
                    socket.emit('editar-mensaje', { id: msg.id, nuevoTexto: nuevo, usuario: usuario.value });
                } else {
                    input.replaceWith(textoSpan);
                }
            };
            input.addEventListener('blur', guardar);
            input.addEventListener('keypress', (e) => { if(e.key === 'Enter') guardar(); });
        });

        btnEliminar.addEventListener('click', () => {
            if(confirm('¿Eliminar mensaje?')){
                socket.emit('eliminar-mensaje', { id: msg.id, usuario: usuario.value });
            }
        });
    }
}

function escapeHtml(unsafe){
  return unsafe
     .replace(/&/g, "&amp;")
     .replace(/</g, "&lt;")
     .replace(/>/g, "&gt;");
}

// al ingresar al chat -> registramos username en server
function ingresarAlChat(){
    if(persona.value){
        panelBienvenida.style.display = "none";
        appChat.style.display = "block";
        usuario.value = persona.value;
        usuario.readOnly = true;
        // registramos en server para lista online
        socket.emit('register', persona.value);

        // pedir permisos de notificación
        if("Notification" in window) Notification.requestPermission();
    }
}

// enviar mensaje (sin generar id en cliente)
botonEnviar.addEventListener('click', function(){
    if(mensaje.value.trim()){
        socket.emit('chat', { mensaje: mensaje.value.trim(), usuario: usuario.value });
        mensaje.value = '';
    }
});

// recibir historial
socket.on('history', (msgs) => {
    output.innerHTML = '';
    msgs.forEach(renderMessage);
    output.scrollTop = output.scrollHeight;
});

// recibir nuevo mensaje
socket.on('chat', (msg) => {
    renderMessage(msg);
    // sonido y notificación cuando no es mío
    if(msg.usuario !== usuario.value){
        const audio = new Audio('notificacion.mp3');
        audio.play().catch(()=>{});
        // browser notification si pestaña no visible
        if(document.hidden && Notification.permission === 'granted'){
            new Notification(`${msg.usuario}`, { body: msg.mensaje.slice(0,100) });
        }
    }
    output.scrollTop = output.scrollHeight;
});

// sincronizar edición/eliminación/reacciones/seen
socket.on('editar-mensaje', (data) => {
    const el = document.getElementById(data.id);
    if(el) el.querySelector('.texto').innerText = data.nuevoTexto;
});
socket.on('eliminar-mensaje', (data) => {
    const el = document.getElementById(data.id);
    if(el) {
        el.querySelector('.contenido').innerHTML = `<em class="texto-eliminado">Mensaje eliminado</em><span class="hora"></span>`;
    }
});
socket.on('reaccion', ({ id, reactions }) => {
    const el = document.getElementById(id);
    if(el) el.querySelector('.reactions').innerHTML = Object.entries(reactions).map(([e,arr])=>`<span class="reaction">${e} ${arr.length}</span>`).join(' ');
});
socket.on('message-seen', ({ id, seenBy }) => {
    const el = document.getElementById(id);
    if(el) {
        // opcional: mostrar tick pequeño
        let seenSpan = el.querySelector('.seen-by');
        if(!seenSpan){
           seenSpan = document.createElement('div'); seenSpan.className = 'seen-by';
           el.querySelector('.burbuja').appendChild(seenSpan);
        }
        seenSpan.innerText = `Visto por: ${seenBy.join(', ')}`;
    }
});

// lista de usuarios online
socket.on('users', (list) => {
    if(!userList) return;
    userList.innerHTML = list.map(u=>`<div class="user-item"><div class="avatar" style="background:${colorFromName(u.username)}">${u.username.charAt(0).toUpperCase()}</div><span>${u.username}</span></div>`).join('');
});
