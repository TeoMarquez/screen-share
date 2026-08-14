const unmuteButton = document.getElementById("unmute");

unmuteButton.onclick = async () => {
    video.muted = false;
    video.volume = 1.0;

    try {
        await video.play();

        unmuteButton.classList.add("inactive");

    } catch (error) {
        console.error(
            "[VIDEO] Failed to enable audio:",
            error
        );
    }
};

const video = document.getElementById("screen");

let socket = null;
let peer = null;
let pendingCandidates = [];


function connectSocket() {
    socket = new WebSocket(
        `ws://${window.location.host}/ws`
    );

    socket.onopen = () => {
        console.log("[WS] Connected as viewer");

        socket.send("viewer");
    };

    socket.onmessage = async (event) => {
        const message = JSON.parse(event.data);

        console.log("[WS] Received:", message);

        try {
            switch (message.type) {

                case "sender-ready":
                    console.log("[SIGNAL] Sender is ready");

                    socket.send(JSON.stringify({
                        type: "viewer-joined"
                    }));

                    break;

                case "offer":
                    console.log("[SIGNAL] Received offer");

                    await handleOffer(message.offer);

                    break;

                case "ice-candidate":
                    console.log("[ICE] Received candidate");

                    await handleIceCandidate(message.candidate);

                    break;
            }

        } catch (error) {
            console.error("[SIGNAL] Error:", error);
        }
    };

    socket.onclose = () => {
        console.log("[WS] Disconnected");
    };

    socket.onerror = (error) => {
        console.error("[WS] Error:", error);
    };
}


async function handleOffer(offer) {
    console.log("[WEBRTC] Creating peer connection");

    if (peer) {
        peer.close();
    }

    pendingCandidates = [];

    peer = new RTCPeerConnection();

    peer.onicecandidate = (event) => {
        if (event.candidate) {
            console.log("[ICE] Sending candidate");

            socket.send(JSON.stringify({
                type: "ice-candidate",
                candidate: event.candidate
            }));
        }
    };

    peer.ontrack = (event) => {
        console.log("[WEBRTC] Received media stream");

        video.srcObject = event.streams[0];

        video.play().catch(error => {
            console.error("[VIDEO] Playback failed:", error);
        });
    };

    peer.onconnectionstatechange = () => {
        console.log(
            "[WEBRTC] Connection state:",
            peer.connectionState
        );
    };

    peer.oniceconnectionstatechange = () => {
        console.log(
            "[WEBRTC] ICE state:",
            peer.iceConnectionState
        );
    };

    await peer.setRemoteDescription(offer);

    console.log("[WEBRTC] Remote description set");

    for (const candidate of pendingCandidates) {
        try {
            await peer.addIceCandidate(candidate);
        } catch (error) {
            console.error(
                "[ICE] Failed queued candidate:",
                error
            );
        }
    }

    pendingCandidates = [];

    const answer = await peer.createAnswer();

    await peer.setLocalDescription(answer);

    console.log("[SIGNAL] Sending answer");

    socket.send(JSON.stringify({
        type: "answer",
        answer: peer.localDescription
    }));
}


async function handleIceCandidate(candidate) {
    if (!peer || !peer.remoteDescription) {
        console.log(
            "[ICE] Peer not ready, queueing candidate"
        );

        pendingCandidates.push(candidate);

        return;
    }

    try {
        await peer.addIceCandidate(candidate);

        console.log("[ICE] Candidate added");

    } catch (error) {
        console.error(
            "[ICE] Failed to add candidate:",
            error
        );
    }
}


connectSocket();