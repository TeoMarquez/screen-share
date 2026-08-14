from flask import Flask, render_template
from flask_sock import Sock
import json

app = Flask(__name__)
sock = Sock(app)

sender = None
viewers = set()


@app.route("/")
def index():
    return render_template("watch.html")


@app.route("/watch")
def watch():
    return render_template("watch.html")


@app.route("/send")
def send():
    return render_template("send.html")


def send_json(ws, message):
    ws.send(json.dumps(message))


@sock.route("/ws")
def websocket(ws):
    global sender

    role = None

    try:
        role_message = ws.receive()

        print(f"[WS] New connection: {role_message}")

        if role_message == "sender":
            if sender is not None:
                print("[WS] Replacing previous sender")

                try:
                    sender.close()
                except Exception:
                    pass

            sender = ws
            role = "sender"

            print("[WS] Sender connected")

            for viewer in list(viewers):
                try:
                    send_json(viewer, {
                        "type": "sender-ready"
                    })
                except Exception as error:
                    print(f"[WS] Failed to notify viewer: {error}")
                    viewers.discard(viewer)

        elif role_message == "viewer":
            viewers.add(ws)
            role = "viewer"

            print(f"[WS] Viewer connected ({len(viewers)} viewers)")

            if sender is not None:
                try:
                    send_json(sender, {
                        "type": "viewer-joined"
                    })
                except Exception as error:
                    print(f"[WS] Failed to notify sender: {error}")
                    sender = None

        else:
            print(f"[WS] Invalid role: {role_message}")
            return

        while True:
            message = ws.receive()

            if message is None:
                break

            print(f"[WS] {role} -> {message}")

            if role == "sender":
                for viewer in list(viewers):
                    try:
                        viewer.send(message)
                    except Exception as error:
                        print(f"[WS] Failed sending to viewer: {error}")
                        viewers.discard(viewer)

            elif role == "viewer":
                if sender is not None:
                    try:
                        sender.send(message)
                    except Exception as error:
                        print(f"[WS] Failed sending to sender: {error}")
                        sender = None

    except Exception as error:
        print(f"[WS] Connection error ({role}): {error}")

    finally:
        if role == "sender":
            if sender is ws:
                sender = None

            print("[WS] Sender disconnected")

        elif role == "viewer":
            viewers.discard(ws)

            print(
                f"[WS] Viewer disconnected "
                f"({len(viewers)} viewers remaining)"
            )


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=False,
        use_reloader=False,
    )