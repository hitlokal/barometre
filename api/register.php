<?php
/* Inscription — crée un compte GRATUIT actif tout de suite (accès édition 2021) */
require __DIR__ . '/db.php';
session_start();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(['ok' => false], 405);

$d     = body();
$email = strtolower(trim((string)($d['email'] ?? '')));
$pass  = (string)($d['password'] ?? '');
$name  = (string)($d['name'] ?? '');
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($pass) < 6) {
  json_out(['ok' => false, 'error' => 'invalid'], 422);
}
try {
  // tier='gratuit', active=1 → l'utilisateur voit 2021 immédiatement, sans validation admin
  db()->prepare("INSERT INTO hl_members (email, pass_hash, name, profile, tier, active) VALUES (?,?,?,?, 'gratuit', 1)")
     ->execute([$email, password_hash($pass, PASSWORD_DEFAULT), $name, (string)($d['profile'] ?? '')]);
  $_SESSION['uid'] = (int)db()->lastInsertId();   // connecté directement
  json_out(['ok' => true, 'email' => $email, 'name' => $name, 'tier' => 'gratuit']);
} catch (PDOException $e) {
  $dup = ($e->getCode() === '23000');
  json_out(['ok' => false, 'error' => $dup ? 'exists' : 'db'], $dup ? 409 : 500);
}
