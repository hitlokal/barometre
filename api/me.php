<?php
/* Renvoie le membre actuellement connecté (forfait), ou auth=false */
require __DIR__ . '/db.php';
session_start();
if (empty($_SESSION['uid'])) json_out(['auth' => false]);

$st = db()->prepare("SELECT email, name, tier, active FROM hl_members WHERE id = ?");
$st->execute([(int)$_SESSION['uid']]);
$u = $st->fetch();

if (!$u || (int)$u['active'] !== 1) {
  $_SESSION = [];
  session_destroy();
  json_out(['auth' => false]);
}
json_out(['auth' => true, 'email' => $u['email'], 'name' => $u['name'], 'tier' => $u['tier']]);
