<?php
/* Inscription — crée un compte en attente d'activation (active=0) */
require __DIR__ . '/db.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(['ok' => false], 405);

$d     = body();
$email = strtolower(trim((string)($d['email'] ?? '')));
$pass  = (string)($d['password'] ?? '');
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($pass) < 6) {
  json_out(['ok' => false, 'error' => 'invalid'], 422);
}
try {
  db()->prepare("INSERT INTO hl_members (email, pass_hash, name, profile) VALUES (?,?,?,?)")
     ->execute([$email, password_hash($pass, PASSWORD_DEFAULT), (string)($d['name'] ?? ''), (string)($d['profile'] ?? '')]);
  json_out(['ok' => true]);
} catch (PDOException $e) {
  $dup = ($e->getCode() === '23000');
  json_out(['ok' => false, 'error' => $dup ? 'exists' : 'db'], $dup ? 409 : 500);
}
