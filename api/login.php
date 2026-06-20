<?php
/* Connexion — vérifie email+mot de passe, refuse si compte non activé */
require __DIR__ . '/db.php';
session_start();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(['ok' => false], 405);

$d     = body();
$email = strtolower(trim((string)($d['email'] ?? '')));
$pass  = (string)($d['password'] ?? '');

$st = db()->prepare("SELECT * FROM hl_members WHERE email = ?");
$st->execute([$email]);
$u = $st->fetch();

if (!$u || !password_verify($pass, $u['pass_hash'])) {
  json_out(['ok' => false, 'error' => 'bad'], 401);
}
if ((int)$u['active'] !== 1) {
  json_out(['ok' => false, 'error' => 'pending'], 403);
}
$_SESSION['uid'] = (int)$u['id'];
json_out(['ok' => true, 'email' => $u['email'], 'name' => $u['name'], 'tier' => $u['tier']]);
