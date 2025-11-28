CREATE TABLE IF NOT EXISTS game_records (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    room_id VARCHAR(20) NOT NULL,
    winner_id BIGINT UNSIGNED,
    win_type ENUM('ZIMO', 'RON', 'DRAW') NOT NULL,
    tai_count INT DEFAULT 0,
    player_data JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_room_id (room_id),
    INDEX idx_winner_id (winner_id),
    FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

