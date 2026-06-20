<?php
/* Déconnexion */
require __DIR__ . '/db.php';
session_start();
$_SESSION = [];
session_destroy();
json_out(['ok' => true]);
