<?php
/*
 * Inkstation beheer: inloggen en content/winkel.json opslaan.
 * Eén bestand, geen extra pakketten. Werkt op gewone webhosting met PHP 8.1 of nieuwer.
 *
 * Acties (api.php?action=...):
 *   GET  me      -> { loggedIn, email, csrf }
 *   POST login   -> { email, password }
 *   POST logout  (header X-CSRF-Token)
 *   POST save    -> { data } (header X-CSRF-Token); controleert alles en schrijft winkel.json
 *
 * Inloggegevens staan in config.php (zie config.example.php). Pogingen, sessies en back-ups staan in data/,
 * dat via .htaccess voor bezoekers is afgesloten.
 */
declare(strict_types=1);

const DATA_DIR = __DIR__ . '/data';
const CONTENT_FILE = __DIR__ . '/../content/winkel.json';
const MAX_FAILS_PER_IP = 5;      // foute pogingen per IP-adres ...
const FAIL_WINDOW = 900;         // ... binnen 15 minuten
const MAX_FAILS_TOTAL = 30;      // en over alle IP-adressen samen per uur
const SESSION_DAYS = 30;
const KEEP_BACKUPS = 30;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function reply(int $status, array $body): never {
  http_response_code($status);
  echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) reply(500, ['error' => 'De beheerpagina is nog niet ingesteld (config.php ontbreekt).']);
$config = require $configFile;

foreach ([DATA_DIR, DATA_DIR . '/sessions', DATA_DIR . '/backups'] as $dir) {
  if (!is_dir($dir) && !mkdir($dir, 0700, true)) reply(500, ['error' => 'Kan de map data/ niet aanmaken.']);
}

// Sessie: eigen map (gedeelde hosting ruimt /tmp soms vroeg op), cookie alleen voor deze site en niet leesbaar voor scripts.
$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
session_save_path(DATA_DIR . '/sessions');
ini_set('session.gc_maxlifetime', (string)(SESSION_DAYS * 86400));
ini_set('session.use_strict_mode', '1');
session_name('inkstation_beheer');
session_set_cookie_params([
  'lifetime' => SESSION_DAYS * 86400,
  'path' => rtrim(dirname($_SERVER['SCRIPT_NAME']), '/') . '/',
  'secure' => $https,
  'httponly' => true,
  'samesite' => 'Strict',
]);
session_start();

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

function body(): array {
  $raw = file_get_contents('php://input', false, null, 0, 65536);
  $data = json_decode($raw ?: '', true);
  return is_array($data) ? $data : [];
}

function loggedIn(): bool {
  return !empty($_SESSION['user']);
}

function requireCsrf(): void {
  $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
  if (!loggedIn() || !is_string($sent) || !hash_equals($_SESSION['csrf'] ?? '', $sent)) {
    reply(401, ['error' => 'U bent niet (meer) ingelogd. Log opnieuw in.']);
  }
}

// --- Inlogpogingen bijhouden (bestand met tijdstempels per IP) ---
function attempts(?callable $change = null): array {
  $file = DATA_DIR . '/attempts.json';
  $fh = fopen($file, 'c+');
  flock($fh, LOCK_EX);
  $list = json_decode(stream_get_contents($fh) ?: '[]', true) ?: [];
  $now = time();
  $list = array_values(array_filter($list, fn($a) => $a['t'] > $now - 3600));
  if ($change) {
    $list = $change($list);
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, json_encode($list));
  }
  flock($fh, LOCK_UN);
  fclose($fh);
  return $list;
}

function ip(): string {
  return $_SERVER['REMOTE_ADDR'] ?? 'onbekend';
}

if ($action === 'me' && $method === 'GET') {
  if (loggedIn() && empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
  reply(200, ['loggedIn' => loggedIn(), 'email' => $_SESSION['user'] ?? null, 'csrf' => loggedIn() ? $_SESSION['csrf'] : null]);
}

if ($action === 'login' && $method === 'POST') {
  $now = time();
  $list = attempts();
  $mine = array_filter($list, fn($a) => $a['ip'] === ip() && $a['t'] > $now - FAIL_WINDOW);
  if (count($mine) >= MAX_FAILS_PER_IP || count($list) >= MAX_FAILS_TOTAL) {
    reply(429, ['error' => 'Te veel pogingen. Probeer het over een kwartier opnieuw.']);
  }
  $in = body();
  $email = strtolower(trim((string)($in['email'] ?? '')));
  $password = (string)($in['password'] ?? '');
  $ok = hash_equals(strtolower($config['email']), $email) && password_verify($password, $config['password_hash']);
  if (!$ok) {
    attempts(function ($l) { $l[] = ['ip' => ip(), 't' => time()]; return $l; });
    usleep(400000); // vertraagt het raden
    reply(401, ['error' => 'E-mailadres of wachtwoord klopt niet.']);
  }
  attempts(fn($l) => array_values(array_filter($l, fn($a) => $a['ip'] !== ip())));
  session_regenerate_id(true);
  $_SESSION['user'] = $config['email'];
  $_SESSION['csrf'] = bin2hex(random_bytes(32));
  reply(200, ['loggedIn' => true, 'email' => $config['email'], 'csrf' => $_SESSION['csrf']]);
}

if ($action === 'logout' && $method === 'POST') {
  requireCsrf();
  $_SESSION = [];
  session_destroy();
  reply(200, ['loggedIn' => false]);
}

// --- Controle van wat er opgeslagen wordt: alleen bekende velden, juiste soort, beperkte lengte ---
const DAYS = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];

function text($v, int $max, string $label): string {
  if ($v === null) return '';
  if (!is_string($v)) throw new InvalidArgumentException("$label is geen tekst.");
  $v = trim(preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $v) ?? '');
  if (mb_strlen($v) > $max) throw new InvalidArgumentException("$label is te lang (maximaal $max tekens).");
  return $v;
}
function timeVal($v, string $label): string {
  $v = text($v, 5, $label);
  if ($v === '') return '';
  if (!preg_match('/^([01]?\d|2[0-3]):[0-5]\d$/', $v)) throw new InvalidArgumentException("$label: schrijf de tijd als 10:00.");
  return str_pad($v, 5, '0', STR_PAD_LEFT);
}
function dateVal($v, string $label, bool $required): string {
  $v = text($v, 10, $label);
  if ($v === '') {
    if ($required) throw new InvalidArgumentException("$label ontbreekt.");
    return '';
  }
  if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $v, $m) || !checkdate((int)$m[2], (int)$m[3], (int)$m[1])) {
    throw new InvalidArgumentException("$label is geen geldige datum.");
  }
  return $v;
}
function minutes(string $t): int {
  [$h, $m] = array_map('intval', explode(':', $t));
  return $h * 60 + $m;
}

function clean(array $in): array {
  $out = ['openingstijden' => [], 'afwijkend' => [], 'aanbieding' => []];

  $week = is_array($in['openingstijden'] ?? null) ? $in['openingstijden'] : [];
  foreach (DAYS as $day) {
    $d = is_array($week[$day] ?? null) ? $week[$day] : [];
    $label = ucfirst($day);
    $open = !empty($d['open']);
    $van = timeVal($d['van'] ?? '', "$label, open vanaf");
    $tot = timeVal($d['tot'] ?? '', "$label, open tot");
    if ($open && ($van === '' || $tot === '')) throw new InvalidArgumentException("$label: vul beide tijden in, of zet de dag op gesloten.");
    if ($open && minutes($van) >= minutes($tot)) throw new InvalidArgumentException("$label: de sluitingstijd moet na de openingstijd liggen.");
    $out['openingstijden'][$day] = ['open' => $open, 'van' => $open ? $van : '', 'tot' => $open ? $tot : ''];
  }

  $periods = is_array($in['afwijkend'] ?? null) ? array_values($in['afwijkend']) : [];
  if (count($periods) > 40) throw new InvalidArgumentException('Te veel afwijkende periodes (maximaal 40).');
  foreach ($periods as $i => $p) {
    if (!is_array($p)) continue;
    $n = 'Periode ' . ($i + 1);
    $van = dateVal($p['van'] ?? '', "$n, van", true);
    $tot = dateVal($p['tot'] ?? '', "$n, tot en met", true);
    if ($tot < $van) throw new InvalidArgumentException("$n: de einddatum ligt voor de begindatum.");
    $closed = !empty($p['gesloten']);
    $ov = timeVal($p['open_van'] ?? '', "$n, open vanaf");
    $ot = timeVal($p['open_tot'] ?? '', "$n, open tot");
    if (!$closed && ($ov === '' || $ot === '')) throw new InvalidArgumentException("$n: vul de afwijkende tijden in, of kies gesloten.");
    if (!$closed && minutes($ov) >= minutes($ot)) throw new InvalidArgumentException("$n: de sluitingstijd moet na de openingstijd liggen.");
    $out['afwijkend'][] = [
      'van' => $van, 'tot' => $tot, 'gesloten' => $closed,
      'open_van' => $closed ? '' : $ov, 'open_tot' => $closed ? '' : $ot,
      'opmerking' => text($p['opmerking'] ?? '', 80, "$n, opmerking"),
    ];
  }
  usort($out['afwijkend'], fn($a, $b) => strcmp($a['van'], $b['van']));

  $o = is_array($in['aanbieding'] ?? null) ? $in['aanbieding'] : [];
  $out['aanbieding'] = [
    'tonen' => !empty($o['tonen']),
    'bovenregel' => text($o['bovenregel'] ?? '', 32, 'Sticker, bovenste regel'),
    'prijs' => text($o['prijs'] ?? '', 8, 'Sticker, prijs'),
    'onderregel' => text($o['onderregel'] ?? '', 32, 'Sticker, onderste regel'),
    'kop' => text($o['kop'] ?? '', 140, 'Kop van de aanbieding'),
    'tekst' => text($o['tekst'] ?? '', 320, 'Uitleg bij de aanbieding'),
    'kleine_letters' => text($o['kleine_letters'] ?? '', 60, 'Kleine letters'),
    'tot_en_met' => dateVal($o['tot_en_met'] ?? '', 'Laatste dag van de aanbieding', false),
  ];
  if ($out['aanbieding']['tonen'] && $out['aanbieding']['kop'] === '') {
    throw new InvalidArgumentException('Geef de aanbieding een kop, of zet "Aanbieding op de site" uit.');
  }
  return $out;
}

if ($action === 'save' && $method === 'POST') {
  requireCsrf();
  $in = body();
  try {
    $clean = clean(is_array($in['data'] ?? null) ? $in['data'] : []);
  } catch (InvalidArgumentException $e) {
    reply(422, ['error' => $e->getMessage()]);
  }
  $json = json_encode($clean, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";

  // Back-up van de vorige versie, de oudste back-ups gaan weg.
  if (is_file(CONTENT_FILE)) {
    copy(CONTENT_FILE, DATA_DIR . '/backups/winkel-' . date('Ymd-His') . '.json');
    $old = glob(DATA_DIR . '/backups/winkel-*.json') ?: [];
    sort($old);
    foreach (array_slice($old, 0, max(0, count($old) - KEEP_BACKUPS)) as $f) unlink($f);
  }
  // Eerst naar een tijdelijk bestand, dan in één keer vervangen: de site leest nooit een half bestand.
  $tmp = CONTENT_FILE . '.tmp';
  if (file_put_contents($tmp, $json, LOCK_EX) === false || !rename($tmp, CONTENT_FILE)) {
    reply(500, ['error' => 'Opslaan is niet gelukt. Probeer het nog eens.']);
  }
  reply(200, ['ok' => true, 'data' => $clean]);
}

reply(404, ['error' => 'Onbekende actie.']);
