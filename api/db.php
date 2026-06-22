<?php
/* Connexion BDD + helpers — création automatique de la table au 1er appel */
require __DIR__ . '/config.php';

function db() {
  static $pdo = null;
  if ($pdo === null) {
    $pdo = new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4', DB_USER, DB_PASS, [
      PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $pdo->exec("CREATE TABLE IF NOT EXISTS hl_members (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(190) NOT NULL UNIQUE,
      pass_hash VARCHAR(255) NOT NULL,
      name VARCHAR(120) NOT NULL DEFAULT '',
      profile VARCHAR(80) NOT NULL DEFAULT '',
      tier ENUM('gratuit','decouverte','pro','business') NOT NULL DEFAULT 'gratuit',
      active TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
  }
  return $pdo;
}

function json_out($x, $code = 200) {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($x);
  exit;
}
function body() {
  $j = json_decode(file_get_contents('php://input'), true);
  return is_array($j) ? $j : $_POST;
}
