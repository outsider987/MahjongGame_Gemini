
import { ActionType, GameStateDTO, Player, Tile } from '../../types';

// The Context interface that States will interact with
export interface IMockContext {
  store: any; // MockStateStore
  socket: any; // MockSocket
  bot: any; // MockBot
  
  // State Transition
  transitionTo(state: IGameState): void;
  
  // Timers
  schedule(fn: () => void, delay: number): void;
  clearTimers(): void;
}

// The State Interface (Strategy)
export interface IGameState {
  name: string;
  enter(ctx: IMockContext): void;
  handleDiscard(ctx: IMockContext, tileIndex: number): void;
  handleOperation(ctx: IMockContext, action: ActionType): void;
}
