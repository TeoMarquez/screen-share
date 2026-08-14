const startButton = document.getElementById("start");
const stopButton = document.getElementById("stop");
const status = document.getElementById("status");

let socket = null;
let peer = null;
let stream = null;

let pendingCandidates = [];
let viewerConnected = false;


function setStatus(text) {
    status.textContent = text;
}


function connectSocket() {
    socket = new WebSocket(
        `ws://${window.location.host}/ws`
    );

    socket.onopen = () => {
        console.log("[WS] Connected as sender");

        socket.send("sender");

        setStatus("Waiting for viewer...");
    };

    socket.onmessage = async (event) => {
        const message = JSON.parse(event.data);

        console.log("[WS] Received:", message);

        try {
            switch (message.type) {

                case "viewer-joined":
                    console.log("[SIGNAL] Viewer joined");

                    viewerConnected = true;

                    if (stream) {
                        await createOffer();
                    }

                    break;

                case "answer":
                    console.log("[SIGNAL] Received answer");

                    await peer.setRemoteDescription(
                        message.answer
                    );

                    console.log(
                        "[WEBRTC] Remote description set"
                    );

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

                    break;

                case "ice-candidate":
                    console.log(
                        "[ICE] Received candidate"
                    );

                    await handleIceCandidate(
                        message.candidate
                    );

                    break;
            }

        } catch (error) {
            console.error(
                "[SIGNAL] Error:",
                error
            );
        }
    };

    socket.onclose = () => {
        console.log("[WS] Disconnected");

        setStatus("Disconnected");
    };

    socket.onerror = (error) => {
        console.error("[WS] Error:", error);
    };
}


async function createOffer() {
    if (!stream) {
        console.log("[WEBRTC] No stream yet");
        return;
    }

    if (peer) {
        console.log(
            "[WEBRTC] Closing previous peer"
        );

        peer.close();
        peer = null;
    }

    pendingCandidates = [];

    peer = new RTCPeerConnection();

    peer.onicecandidate = (event) => {
        if (event.candidate) {
            console.log(
                "[ICE] Sending candidate"
            );

            socket.send(JSON.stringify({
                type: "ice-candidate",
                candidate: event.candidate
            }));
        }
    };

    peer.onconnectionstatechange = () => {
        console.log(
            "[WEBRTC] Connection state:",
            peer.connectionState
        );

        if (peer.connectionState === "connected") {
            setStatus("Streaming");
        }

        if (
            peer.connectionState === "failed" ||
            peer.connectionState === "disconnected"
        ) {
            setStatus("Connection lost");
        }
    };

    peer.oniceconnectionstatechange = () => {
        console.log(
            "[WEBRTC] ICE state:",
            peer.iceConnectionState
        );
    };

    for (const track of stream.getTracks()) {
        peer.addTrack(track, stream);
    }

    const offer = await peer.createOffer();

    await peer.setLocalDescription(offer);

    console.log("[SIGNAL] Sending offer");

    socket.send(JSON.stringify({
        type: "offer",
        offer: peer.localDescription
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

        console.log(
            "[ICE] Candidate added"
        );

    } catch (error) {
        console.error(
            "[ICE] Failed to add candidate:",
            error
        );
    }
}


startButton.onclick = async () => {
    try {
        console.log(
            "[MEDIA] Requesting screen capture"
        );

        stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
        });

        console.log(
            "[MEDIA] Screen capture started"
        );

        startButton.disabled = true;
        stopButton.disabled = false;

        stream
            .getVideoTracks()[0]
            .addEventListener(
                "ended",
                stopSharing
            );

        if (viewerConnected) {
            setStatus("Connecting...");

            await createOffer();
        } else {
            setStatus(
                "Screen selected. Waiting for viewer..."
            );
        }

    } catch (error) {
        console.error(
            "[MEDIA] Screen sharing failed:",
            error
        );

        setStatus(
            "Screen sharing cancelled."
        );
    }
};


function stopSharing() {
    console.log(
        "[MEDIA] Stopping screen share"
    );

    if (stream) {
        for (const track of stream.getTracks()) {
            track.stop();
        }

        stream = null;
    }

    if (peer) {
        peer.close();
        peer = null;
    }

    pendingCandidates = [];

    startButton.disabled = false;
    stopButton.disabled = true;

    setStatus("Stopped.");
}


stopButton.onclick = stopSharing;


connectSocket();