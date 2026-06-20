<?php
/* Page admin — gérer / activer les comptes membres */
require __DIR__ . '/../api/db.php';
session_start();
if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
$csrf = $_SESSION['csrf'];
$msg = '';

$action = $_POST['action'] ?? '';
if ($action === 'login') {
  if (hash_equals(ADMIN_PASS, (string)($_POST['pass'] ?? ''))) $_SESSION['admin'] = 1;
  else $msg = 'Mot de passe incorrect.';
}
if ($action === 'logout') { unset($_SESSION['admin']); }

$isAdmin = !empty($_SESSION['admin']);

if ($isAdmin && $_SERVER['REQUEST_METHOD'] === 'POST' && in_array($action, ['save', 'delete'], true)) {
  if (!hash_equals($csrf, (string)($_POST['csrf'] ?? ''))) {
    $msg = 'Session expirée, réessayez.';
  } else {
    $id = (int)($_POST['id'] ?? 0);
    if ($action === 'delete') {
      db()->prepare("DELETE FROM hl_members WHERE id = ?")->execute([$id]);
      $msg = 'Compte supprimé.';
    } else {
      $tier   = in_array($_POST['tier'] ?? '', ['decouverte', 'pro', 'business'], true) ? $_POST['tier'] : 'decouverte';
      $active = isset($_POST['active']) ? 1 : 0;
      db()->prepare("UPDATE hl_members SET tier = ?, active = ? WHERE id = ?")->execute([$tier, $active, $id]);
      $msg = 'Compte mis à jour.';
    }
  }
}

$members = $isAdmin ? db()->query("SELECT * FROM hl_members ORDER BY created_at DESC")->fetchAll() : [];
function h($s) { return htmlspecialchars((string)$s, ENT_QUOTES); }
$TIERS = ['decouverte' => 'Découverte', 'pro' => 'Pro', 'business' => 'Business'];
?>
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex,nofollow">
<title>Admin · Baromètre Hit Lokal</title>
<style>
  :root{--bg:#0a0e1a;--panel:#141b30;--bg2:#0f1525;--line:#222c47;--ink:#eef2ff;--muted:#9aa6c4;--faint:#69739a;
    --gold:#ffce4f;--coral:#ff5d73;--teal:#2fe3c4;--violet:#8a6bff;--grad:linear-gradient(100deg,#ffce4f,#ff5d73 45%,#8a6bff)}
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--ink);font-family:system-ui,'Segoe UI',sans-serif;line-height:1.5;padding:28px 18px}
  .wrap{max-width:980px;margin:0 auto}
  h1{font-size:1.5rem;margin-bottom:4px}
  .sub{color:var(--muted);font-size:.9rem;margin-bottom:22px}
  .msg{background:rgba(47,227,196,.12);border:1px solid rgba(47,227,196,.4);color:#8ff3df;padding:11px 16px;border-radius:10px;margin-bottom:18px;font-size:.92rem}
  .card{background:linear-gradient(180deg,var(--panel),var(--bg2));border:1px solid var(--line);border-radius:14px;padding:24px}
  label{display:block;font-size:.82rem;color:var(--muted);margin-bottom:6px}
  input[type=password],input[type=text]{width:100%;background:var(--bg2);border:1px solid var(--line);border-radius:10px;padding:12px 14px;color:var(--ink);font-size:1rem}
  .btn{background:var(--grad);color:#0a0e1a;border:0;font-weight:700;padding:11px 20px;border-radius:10px;cursor:pointer;font-size:.95rem}
  .btn-ghost{background:rgba(255,255,255,.06);border:1px solid var(--line);color:#fff}
  .btn-danger{background:rgba(255,93,115,.15);border:1px solid rgba(255,93,115,.5);color:#ff9fb0}
  .topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:22px;gap:14px;flex-wrap:wrap}
  table{width:100%;border-collapse:collapse;font-size:.88rem}
  th{text-align:left;color:var(--muted);font-weight:600;padding:10px;border-bottom:1px solid var(--line);font-size:.76rem;text-transform:uppercase;letter-spacing:.04em}
  td{padding:10px;border-bottom:1px solid var(--line);vertical-align:middle}
  tr:hover td{background:rgba(255,255,255,.02)}
  select{background:var(--bg2);border:1px solid var(--line);border-radius:8px;padding:7px 9px;color:var(--ink)}
  .pill{display:inline-block;font-size:.72rem;font-weight:700;padding:3px 9px;border-radius:999px}
  .on{background:rgba(47,227,196,.16);color:var(--teal)} .off{background:rgba(255,93,115,.14);color:#ff9fb0}
  .row-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
  .chk{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:.82rem;white-space:nowrap}
  .empty{color:var(--faint);text-align:center;padding:40px}
  .mark{display:inline-grid;place-items:center;width:34px;height:34px;border-radius:9px;background:var(--grad);color:#0a0e1a;font-weight:800;font-size:.85rem}
</style>
</head>
<body>
<div class="wrap">
<?php if ($msg): ?><div class="msg"><?= h($msg) ?></div><?php endif; ?>

<?php if (!$isAdmin): ?>
  <div class="card" style="max-width:380px;margin:60px auto">
    <div class="topbar"><span class="mark">HL</span><b>Espace admin</b></div>
    <form method="post">
      <input type="hidden" name="action" value="login">
      <label>Mot de passe admin</label>
      <input type="password" name="pass" autofocus required>
      <button class="btn" style="width:100%;margin-top:16px">Se connecter</button>
    </form>
  </div>
<?php else: ?>
  <div class="topbar">
    <div>
      <h1>Comptes membres</h1>
      <div class="sub"><?= count($members) ?> compte(s) · Baromètre Hit Lokal</div>
    </div>
    <form method="post"><input type="hidden" name="action" value="logout"><button class="btn-ghost btn">Déconnexion</button></form>
  </div>
  <div class="card">
    <?php if (!$members): ?>
      <div class="empty">Aucun compte pour l'instant. Les inscriptions apparaîtront ici.</div>
    <?php else: ?>
    <table>
      <thead><tr><th>Email</th><th>Nom / Profil</th><th>Inscrit le</th><th>Forfait & activation</th><th></th></tr></thead>
      <tbody>
      <?php foreach ($members as $m): ?>
        <tr>
          <td><b><?= h($m['email']) ?></b><br><span class="pill <?= $m['active'] ? 'on' : 'off' ?>"><?= $m['active'] ? 'Actif' : 'En attente' ?></span></td>
          <td><?= h($m['name'] ?: '—') ?><br><span style="color:var(--faint);font-size:.8rem"><?= h($m['profile'] ?: '') ?></span></td>
          <td style="color:var(--muted)"><?= h(date('d/m/Y H:i', strtotime($m['created_at']))) ?></td>
          <td>
            <form method="post" class="row-actions">
              <input type="hidden" name="action" value="save">
              <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
              <input type="hidden" name="id" value="<?= (int)$m['id'] ?>">
              <select name="tier">
                <?php foreach ($TIERS as $k => $lbl): ?>
                  <option value="<?= $k ?>" <?= $m['tier'] === $k ? 'selected' : '' ?>><?= $lbl ?></option>
                <?php endforeach; ?>
              </select>
              <label class="chk"><input type="checkbox" name="active" value="1" <?= $m['active'] ? 'checked' : '' ?>> Actif</label>
              <button class="btn" type="submit">Enregistrer</button>
            </form>
          </td>
          <td>
            <form method="post" onsubmit="return confirm('Supprimer ce compte ?')">
              <input type="hidden" name="action" value="delete">
              <input type="hidden" name="csrf" value="<?= h($csrf) ?>">
              <input type="hidden" name="id" value="<?= (int)$m['id'] ?>">
              <button class="btn btn-danger" type="submit">Suppr.</button>
            </form>
          </td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>
    <?php endif; ?>
  </div>
<?php endif; ?>
</div>
</body>
</html>
