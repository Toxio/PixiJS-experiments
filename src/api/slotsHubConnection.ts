import * as signalR from '@microsoft/signalr';

export const SLOTS_HUB_URL = 'https://slotgamesapi.yogames.win/slots';

/** Value for `InitialState` `GameName` (required by the slots API). */
export const SLOTS_INITIAL_STATE_GAME_NAME = 'ShiningCrown';

export const DEFAULT_SLOTS_INITIAL_STATE = {
  GameName: SLOTS_INITIAL_STATE_GAME_NAME,
  IsDemo: true,
  PartnerId: 1,
} as const;

/** Builds a SignalR client for the slots hub (reconnect enabled). */
export function createSlotsHubConnection(): signalR.HubConnection {
  return new signalR.HubConnectionBuilder().withUrl(SLOTS_HUB_URL).withAutomaticReconnect().build();
}
