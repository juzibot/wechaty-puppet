export enum CallType {
  UNKNOWN = 0,
  VOICE,
  VIDEO,
}

export enum CallStatus {
  UNKNOWN = 0,
  CANCELED, // caller cancel
  REJECTED, // callee reject
  MISSED,
  ONGOING,
  ENDED,
}

export interface CallRecordPayload {
  starter: string,
  participants: string[],
  length: number, // in seconds
  type: CallType,
  status: CallStatus,
}

/**
 * Call media type for the signaling domain.
 * String values are used for JSON payload debugging friendliness.
 */
export enum CallMediaType {
  Audio = 'audio',
  Video = 'video',
}

/**
 * Uplink call event signals (used by EventCallPayload).
 *
 * Downlink actions are dedicated puppet methods:
 * callInvite / callAccept / callReject / callCancel / callHangup.
 * There is no downlink ringing — the ringing acknowledgement is an automatic
 * protocol-side behavior, not a business action.
 */
export enum CallSignal {
  Invite  = 'invite',   // incoming-call event
  Ringing = 'ringing',  // callee ringing acknowledgement (uplink only)
  Accept  = 'accept',   // callee accepts
  Reject  = 'reject',   // callee rejects
  Cancel  = 'cancel',   // caller cancels before the call is connected
  Hangup  = 'hangup',   // either side hangs up after connected
}

/**
 * Admission ticket for the direct-to-gateway media path.
 * The bot link only hands out this ticket; SDP/ICE negotiation and media
 * transport happen on the holder ↔ gateway direct channel, outside the
 * puppet contract.
 */
export interface CallMediaEndpointPayload {
  url        : string  // negotiation entry of the media gateway (wss:// or https://) — NOT a media address; the media path is selected by ICE during negotiation
  token      : string  // short-lived admission credential, bound to callId + the local identity: one ticket admits exactly one call
  expiresAt? : number  // epoch ms when the token expires; pull again after expiry
  protocol?  : string  // dialect of the entry, e.g. 'whip' | 'livekit' | custom — consumed by the media SDK to pick the handshake, opaque to this contract
}
