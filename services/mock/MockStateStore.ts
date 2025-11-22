
import { GameStateDTO, Meld, Player, Tile, Suit } from '../../types';
import { generateDeck } from '../mahjongLogic';
import { MOCK_PLAYERS } from '../../constants';

export class MockStateStore {
  public deck: Tile[] = [];
  public players: {
    info: Player;
    hand: Tile[];
    discards: Tile[];
    melds: Meld[];
  }[] = [];
  
  public dto: GameStateDTO;

  constructor() {
    this.dto = {
      deckCount: 0,
      players: [],
      turn: -1,
      state: 'INIT',
      lastDiscard: null,
      actionTimer: 0,
      availableActions: [],
      initData: undefined
    };
  }

  initGame() {
    this.deck = generateDeck();
    this.players = [0, 1, 2, 3].map(i => ({
      info: {
        id: i === 0 ? 10001 : MOCK_PLAYERS[i].id,
        name: i === 0 ? "玩家 (您)" : MOCK_PLAYERS[i].name,
        avatar: "",
        score: i === 0 ? 2000 : MOCK_PLAYERS[i].score,
        isDealer: false,
        flowerCount: 0,
        flowers: [], // Init empty
        wind: "",
        seatWind: "",
        isRichii: false,
        richiiDiscardIndex: -1
      },
      hand: [],
      discards: [],
      melds: []
    }));
    this.dto.turn = -1;
    this.dto.lastDiscard = null;
    this.dto.availableActions = [];
    this.dto.initData = undefined;
    this.syncDto();
  }

  getPlayerPos(idx: number) {
      if (idx === 0) return { x: 0, y: 200 }; 
      if (idx === 1) return { x: 300, y: 0 }; 
      if (idx === 2) return { x: 0, y: -200 };
      if (idx === 3) return { x: -300, y: 0 }; 
      return { x: 0, y: 0 };
  }

  syncDto() {
    this.dto.deckCount = this.deck.length;
    this.dto.players = this.players.map((p, i) => ({
        info: p.info,
        hand: i === 0 ? p.hand : [], // Hide opponent hands
        handCount: p.hand.length,
        discards: p.discards,
        melds: p.melds
    }));
  }

  sortHand(playerIdx: number) {
      this.players[playerIdx].hand.sort((a, b) => {
        // Sort Flowers to end or keep logic consistent, though they should be removed
        if (a.suit === Suit.FLOWERS && b.suit !== Suit.FLOWERS) return 1;
        if (a.suit !== Suit.FLOWERS && b.suit === Suit.FLOWERS) return -1;

        if (a.suit !== b.suit) {
            // Order: Dot, Bamboo, Char, Wind, Dragon, Flower
            const order = [Suit.DOTS, Suit.BAMBOO, Suit.CHARACTERS, Suit.WINDS, Suit.DRAGONS, Suit.FLOWERS];
            return order.indexOf(a.suit) - order.indexOf(b.suit);
        }
        return a.value - b.value;
      });
  }
}
