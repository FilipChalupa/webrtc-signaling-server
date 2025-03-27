# WebRTC signaling server

[webrtc-signaling.deno.dev](https://webrtc-signaling.deno.dev/)

## Flow

Two clients are involved. Let's call them `initiator` and `responder`.

1. The `initiator` creates `RTCPeerConnection` offer, sets local description and
   sends it to the `/api/v1/initiator/local-description` in body using `POST`
   method.
1. The `responder` periodically polls the `/api/v1/initiator/local-description`
   endpoint to get the `initiator`'s local description.
1. Once the `responder` gets the `initiator`'s local description, it creates
   `RTCPeerConnection`, sets remote description and creates an answer. The
   answer is sent to the `/api/v1/responder/local-description` in body using
   `POST` method.
1. The `initiator` periodically polls the `/api/v1/responder/local-description`
   endpoint to get the `responder`'s local description.
1. Once the `initiator` gets the `responder`'s local description, the connection
   is established.
1. Both clients on new ICE candidates `POST` them to
   `/api/v1/initiator/ice-candidate` and `/api/v1/responder/ice-candidate`
   respectively.
1. The other client periodically polls the `/api/v1/initiator/ice-candidate` for
   new ICE candidates.
