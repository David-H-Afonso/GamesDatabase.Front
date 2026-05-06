import type { Game } from '@/models/api/Game'
import type { GameStatus } from '@/models/api/GameStatus'
import type { GamePlatform } from '@/models/api/GamePlatform'
import type { GamePlayWith } from '@/models/api/GamePlayWith'
import type { GamePlayedStatus } from '@/models/api/GamePlayedStatus'
import type { GameView, ViewConfiguration } from '@/models/api/GameView'
import type { GameReplay } from '@/models/api/GameReplay'
import type { GameReplayType } from '@/models/api/GameReplayType'
import type { GameHistoryEntry } from '@/models/api/GameHistoryEntry'
import type { User } from '@/models/api/User'

// ─── Counter for unique IDs ──────────────────────────────────
let _nextId = 1
function nextId(): number {
	return _nextId++
}

/** Reset the ID counter (call in beforeEach if needed) */
export function resetIdCounter(start = 1) {
	_nextId = start
}

// ─── Game ────────────────────────────────────────────────────
export function createGame(overrides: Partial<Game> = {}): Game {
	const id = overrides.id ?? nextId()
	return {
		id,
		name: `Game ${id}`,
		statusId: 1,
		statusName: 'Playing',
		playWithIds: [],
		playWithNames: [],
		...overrides,
	}
}

export function createGameList(count: number, overrides: Partial<Game> = {}): Game[] {
	return Array.from({ length: count }, () => createGame(overrides))
}

// ─── Game Status ─────────────────────────────────────────────
export function createGameStatus(overrides: Partial<GameStatus> = {}): GameStatus {
	const id = overrides.id ?? nextId()
	return {
		id,
		name: `Status ${id}`,
		isActive: true,
		color: '#4CAF50',
		sortOrder: id,
		...overrides,
	}
}

// ─── Game Platform ───────────────────────────────────────────
export function createGamePlatform(overrides: Partial<GamePlatform> = {}): GamePlatform {
	const id = overrides.id ?? nextId()
	return {
		id,
		name: `Platform ${id}`,
		isActive: true,
		color: '#2196F3',
		sortOrder: id,
		...overrides,
	}
}

// ─── Game Play With ──────────────────────────────────────────
export function createGamePlayWith(overrides: Partial<GamePlayWith> = {}): GamePlayWith {
	const id = overrides.id ?? nextId()
	return {
		id,
		name: `PlayWith ${id}`,
		isActive: true,
		color: '#FF9800',
		sortOrder: id,
		...overrides,
	}
}

// ─── Game Played Status ──────────────────────────────────────
export function createGamePlayedStatus(overrides: Partial<GamePlayedStatus> = {}): GamePlayedStatus {
	const id = overrides.id ?? nextId()
	return {
		id,
		name: `PlayedStatus ${id}`,
		isActive: true,
		color: '#9C27B0',
		sortOrder: id,
		...overrides,
	}
}

// ─── Game View ───────────────────────────────────────────────
export function createGameView(overrides: Partial<GameView> = {}): GameView {
	const id = overrides.id ?? nextId()
	return {
		id,
		name: `View ${id}`,
		isPublic: true,
		createdAt: '2025-01-01T00:00:00Z',
		updatedAt: '2025-01-01T00:00:00Z',
		configuration: {
			sorting: [],
		} satisfies ViewConfiguration,
		...overrides,
	}
}

// ─── Game Replay ─────────────────────────────────────────────
export function createGameReplay(overrides: Partial<GameReplay> = {}): GameReplay {
	const id = overrides.id ?? nextId()
	return {
		id,
		gameId: 1,
		replayTypeId: 1,
		userId: 1,
		...overrides,
	}
}

// ─── Game Replay Type ────────────────────────────────────────
export function createGameReplayType(overrides: Partial<GameReplayType> = {}): GameReplayType {
	const id = overrides.id ?? nextId()
	return {
		id,
		name: `ReplayType ${id}`,
		isActive: true,
		sortOrder: id,
		...overrides,
	}
}

// ─── Game History Entry ──────────────────────────────────────
export function createGameHistoryEntry(overrides: Partial<GameHistoryEntry> = {}): GameHistoryEntry {
	const id = overrides.id ?? nextId()
	return {
		id,
		gameId: 1,
		gameName: 'Test Game',
		userId: 1,
		field: 'name',
		oldValue: 'Old Name',
		newValue: 'New Name',
		description: 'Updated name',
		actionType: 'Updated',
		changedAt: '2025-01-01T00:00:00Z',
		...overrides,
	}
}

// ─── User ────────────────────────────────────────────────────
export function createUser(overrides: Partial<User> = {}): User {
	const id = overrides.id ?? nextId()
	return {
		id,
		username: `user${id}`,
		role: 'Standard',
		isDefault: false,
		hasPassword: true,
		useScoreColors: true,
		scoreProvider: 'Metacritic',
		showPriceComparisonIcon: false,
		createdAt: '2025-01-01T00:00:00Z',
		updatedAt: '2025-01-01T00:00:00Z',
		...overrides,
	}
}
