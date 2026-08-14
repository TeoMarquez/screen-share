# Screen Share

Aplicación minimalista para compartir la pantalla de un PC con otro dispositivo mediante **WebRTC**.

Está pensada para uso personal dentro de una red local, utilizando un servidor **Flask** únicamente como intermediario para el *signaling* de WebRTC.

---

## Arquitectura

```text
PC (emisor)
    │
    │ WebRTC
    ▼
Navegador (visor)
```

El servidor Flask no transmite ni procesa el video. Únicamente se encarga de:

* Descubrir emisor y visor.
* Mantener la conexión WebSocket.
* Intercambiar ofertas y respuestas WebRTC.
* Intercambiar candidatos ICE.

Una vez establecida la conexión, el audio y video se transmiten directamente entre los dispositivos mediante WebRTC.

---

## Páginas

### `/watch`

* Interfaz destinada al dispositivo que recibe la transmisión.
* Pensada principalmente para utilizarse desde una TV u otro dispositivo que solo necesite visualizar la pantalla.

### `/send`

* Interfaz destinada al PC que transmite.
* Dispone únicamente de los controles necesarios para:
  * Seleccionar qué pantalla o ventana compartir.
  * Comenzar la transmisión.
  * Detener la transmisión.

---

## Requisitos

* Python 3.10 o superior.
* Flask.
* Flask-Sock.
* Navegador compatible con WebRTC y Screen Capture API.

---

## Instalación

1. Crear un entorno virtual:

```bash
python -m venv venv
```

2. Activarlo (en Windows):

```dos
venv\Scripts\activate
```

3. Instalar las dependencias:

```bash
pip install -r requirements.txt
```

---

## Ejecución

1. Iniciar el servidor:

```bash
python app.py
```

2. Por defecto, el servidor escucha en: `http://127.0.0.1:5000`

Para utilizarlo desde otros dispositivos de la red local, configura Flask para escuchar en todas las interfaces (`host="0.0.0.0"`). Luego accede usando:

* Dispositivo receptor: `http://<IP-DE-LA-MINIPC>:5000/watch`
* PC emisor: `http://<IP-DE-LA-MINIPC>:5000/send`

---

## Funcionamiento

1. El PC emisor utiliza `getDisplayMedia()` para capturar la pantalla seleccionada.
2. La captura se agrega a una conexión `RTCPeerConnection`.
3. El servidor Flask utiliza WebSocket para intercambiar la información necesaria para establecer la conexión WebRTC entre ambos dispositivos.
4. Una vez completada la negociación, el audio y video se transmiten directamente entre el emisor y el receptor.

> **Nota:** El servidor Flask jamás recibe ni procesa el contenido de la pantalla.

---

## Estructura del Proyecto

```text
screen-share/
├── app.py
├── requirements.txt
├── static/
│   ├── send.js
│   └── watch.js
└── templates/
    ├── send.html
    └── watch.html
```

---

## Uso Previsto

El proyecto está diseñado para uso personal dentro de una red local de confianza.

No implementa:

* Usuarios o autenticación.
* Salas o sesiones multiusuario.
* Grabación.
* Servidores TURN.
* Configuración persistente.

La simplicidad es intencional.

---
