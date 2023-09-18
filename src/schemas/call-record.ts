export enum CallType {
  UNKNOWN = 0,
  VOICE,
  VIDEO,
}

export enum CallStatus {
  UNKNOWN = 0,
  CANCELED, // caller cancel
  REJECTED, // callee reject
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
