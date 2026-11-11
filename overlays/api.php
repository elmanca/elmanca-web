<?php
/**
 * Manca Studio - PHP Backend para Hostinger Business Web Hosting
 * Permite sincronización remota en tiempo real y seguridad por PIN sin requerir Node.js
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$dataFile = __DIR__ . '/state.json';
$configFile = __DIR__ . '/config.json';

// Initialize default config if missing (PIN aleatorio si no existe)
$defaultConfig = [
    'pin' => (string) random_int(1000, 9999)
];
if (!file_exists($configFile)) {
    @file_put_contents($configFile, json_encode($defaultConfig, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
}
$config = json_decode(@file_get_contents($configFile) ?: '{}', true) ?: $defaultConfig;

// Archivo de intentos de login (anti fuerza bruta)
$attemptsFile = __DIR__ . '/attempts.json';

// --- Anti fuerza bruta (por IP, ventana de 15 min) ---
function get_client_ip(): string {
    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}
function read_attempts(string $file): array {
    return json_decode(@file_get_contents($file) ?: '{}', true) ?: [];
}
function write_attempts(string $file, array $data): void {
    @file_put_contents($file, json_encode($data, JSON_UNESCAPED_SLASHES), LOCK_EX);
}

// Initialize state store if missing
if (!file_exists($dataFile)) {
    $initialData = [
        'live' => null,
        'draft' => null,
        'lastUpdated' => round(microtime(true) * 1000)
    ];
    @file_put_contents($dataFile, json_encode($initialData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
}

// Normalize URI path
$uri = $_SERVER['REQUEST_URI'] ?? '';
$path = parse_url($uri, PHP_URL_PATH);
$path = preg_replace('#^.*?/api/#', '/api/', $path);
$method = $_SERVER['REQUEST_METHOD'];

// Parse incoming JSON body
$rawBody = file_get_contents('php://input');
$input = json_decode($rawBody, true) ?: [];

// Health Check
if ($path === '/api/health') {
    echo json_encode([
        'status' => 'ok',
        'platform' => 'hostinger-business-php',
        'timestamp' => round(microtime(true) * 1000)
    ]);
    exit;
}

// Auth Status
if ($path === '/api/auth/status') {
    $currentPin = $config['pin'] ?? '1234';
    echo json_encode([
        'success' => true,
        'requiresAuth' => true,
        'isDefaultPin' => ($currentPin === '1234')
    ]);
    exit;
}

// Auth Verify (con rate limiting por IP)
if ($path === '/api/auth/verify' && $method === 'POST') {
    $ip = get_client_ip();
    $attempts = read_attempts($attemptsFile);
    $now = time();
    $entry = $attempts[$ip] ?? ['count' => 0, 'window' => $now];
    if ($now - (int) ($entry['window'] ?? $now) > 900) {
        $entry = ['count' => 0, 'window' => $now];
    }
    if ((int) ($entry['count'] ?? 0) >= 5) {
        http_response_code(429);
        echo json_encode([
            'success' => false,
            'error' => 'Demasiados intentos. Esperá 15 minutos e intentá de nuevo.'
        ]);
        exit;
    }

    $pin = trim($input['pin'] ?? $_POST['pin'] ?? '');
    $currentPin = trim($config['pin'] ?? '0000');

    if ($pin === $currentPin) {
        $attempts[$ip] = ['count' => 0, 'window' => $now];
        write_attempts($attemptsFile, $attempts);
        $token = 'manca_' . bin2hex(random_bytes(16)) . '_' . time();
        echo json_encode([
            'success' => true,
            'token' => $token,
            'message' => 'Acceso autorizado'
        ]);
    } else {
        $attempts[$ip] = ['count' => (int) ($entry['count'] ?? 0) + 1, 'window' => (int) ($entry['window'] ?? $now)];
        write_attempts($attemptsFile, $attempts);
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'PIN incorrecto. Intenta de nuevo.'
        ]);
    }
    exit;
}

// Auth Update PIN
if ($path === '/api/auth/update-pin' && $method === 'POST') {
    $oldPin = trim($input['oldPin'] ?? $_POST['oldPin'] ?? '');
    $newPin = trim($input['newPin'] ?? $_POST['newPin'] ?? '');
    $currentPin = trim($config['pin'] ?? '1234');

    if ($oldPin !== $currentPin) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'El PIN anterior no coincide']);
        exit;
    }

    if (strlen($newPin) < 4) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'El nuevo PIN debe tener al menos 4 dígitos']);
        exit;
    }

    $config['pin'] = $newPin;
    @file_put_contents($configFile, json_encode($config, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    echo json_encode(['success' => true, 'message' => 'PIN actualizado exitosamente']);
    exit;
}

// State Sync (GET & POST)
if ($path === '/api/state') {
    if ($method === 'POST') {
        $data = json_decode(@file_get_contents($dataFile) ?: '{}', true) ?: [];
        if (isset($input['live'])) {
            $data['live'] = $input['live'];
        }
        if (isset($input['draft'])) {
            $data['draft'] = $input['draft'];
        }
        $data['lastUpdated'] = round(microtime(true) * 1000);
        @file_put_contents($dataFile, json_encode($data, JSON_UNESCAPED_SLASHES));
        echo json_encode(['success' => true, 'lastUpdated' => $data['lastUpdated']]);
        exit;
    } else {
        $data = json_decode(@file_get_contents($dataFile) ?: '{}', true);
        echo json_encode([
            'success' => true,
            'live' => $data['live'] ?? null,
            'draft' => $data['draft'] ?? null,
            'lastUpdated' => $data['lastUpdated'] ?? round(microtime(true) * 1000)
        ]);
        exit;
    }
}

// Scenes Catalog
if ($path === '/api/scenes') {
    $scenes = [
        ['id' => '2cam', 'name' => '2 Cámaras (Dúo 16:9)', 'layout' => '2cam-side', 'mask' => 'chamfer'],
        ['id' => 'diagonal-vs', 'name' => 'Dúo Diagonal VS (Esports Faceoff)', 'layout' => 'diagonal-vs', 'mask' => 'diagonal-split'],
        ['id' => '4cam', 'name' => '4 Cámaras (Panel 2x2)', 'layout' => '4cam-grid', 'mask' => 'chamfer'],
        ['id' => 'vertical-single', 'name' => 'Móvil 9:16 (Celular en 16:9)', 'layout' => 'vertical-single', 'mask' => 'phone'],
        ['id' => 'vertical-split', 'name' => 'Doble Móvil 9:16 (2 Celulares)', 'layout' => 'vertical-split', 'mask' => 'phone'],
        ['id' => 'hybrid-v', 'name' => 'Híbrido (16:9 + Móvil 9:16)', 'layout' => 'hybrid-v', 'mask' => 'rounded'],
        ['id' => '1cam', 'name' => '1 Cámara (Solo Conductor)', 'layout' => '1cam', 'mask' => 'chamfer'],
    ];
    echo json_encode(['success' => true, 'scenes' => $scenes]);
    exit;
}

// Scene Switcher (Stream Deck, Loupedeck, vMix Web Controller)
if (preg_match('#^/api/scene/([a-zA-Z0-9_\-]+)$#', $path, $matches)) {
    $presetId = $matches[1];
    $data = json_decode(@file_get_contents($dataFile) ?: '{}', true) ?: [];
    if (!isset($data['live'])) $data['live'] = [];
    if (!isset($data['live']['cameras'])) $data['live']['cameras'] = [];
    $data['live']['cameras']['activePreset'] = $presetId;
    $data['lastUpdated'] = round(microtime(true) * 1000);
    @file_put_contents($dataFile, json_encode($data, JSON_UNESCAPED_SLASHES));
    echo json_encode([
        'success' => true,
        'action' => 'SCENE_SWITCHED',
        'activePreset' => $presetId,
        'lastUpdated' => $data['lastUpdated']
    ]);
    exit;
}

// Switcher Auto Transition
if ($path === '/api/switcher/auto') {
    $data = json_decode(@file_get_contents($dataFile) ?: '{}', true) ?: [];
    if (!isset($data['live'])) $data['live'] = [];
    if (!isset($data['live']['cameras'])) $data['live']['cameras'] = [];
    $currentActive = $data['live']['cameras']['activePreset'] ?? '2cam';
    $preview = $data['live']['cameras']['previewPreset'] ?? 'diagonal-vs';
    $data['live']['cameras']['activePreset'] = $preview;
    $data['live']['cameras']['previewPreset'] = $currentActive;
    $data['lastUpdated'] = round(microtime(true) * 1000);
    @file_put_contents($dataFile, json_encode($data, JSON_UNESCAPED_SLASHES));
    echo json_encode([
        'success' => true,
        'action' => 'SWITCHER_AUTO',
        'activePreset' => $preview,
        'previewPreset' => $currentActive,
        'lastUpdated' => $data['lastUpdated']
    ]);
    exit;
}

// Switcher Cut Transition
if ($path === '/api/switcher/cut') {
    $data = json_decode(@file_get_contents($dataFile) ?: '{}', true) ?: [];
    if (!isset($data['live'])) $data['live'] = [];
    if (!isset($data['live']['cameras'])) $data['live']['cameras'] = [];
    $currentActive = $data['live']['cameras']['activePreset'] ?? '2cam';
    $preview = $data['live']['cameras']['previewPreset'] ?? 'diagonal-vs';
    $data['live']['cameras']['activePreset'] = $preview;
    $data['live']['cameras']['previewPreset'] = $currentActive;
    $data['live']['cameras']['transitionType'] = 'cut';
    $data['lastUpdated'] = round(microtime(true) * 1000);
    @file_put_contents($dataFile, json_encode($data, JSON_UNESCAPED_SLASHES));
    echo json_encode([
        'success' => true,
        'action' => 'SWITCHER_CUT',
        'activePreset' => $preview,
        'previewPreset' => $currentActive,
        'lastUpdated' => $data['lastUpdated']
    ]);
    exit;
}

// Tally Toggle
if ($path === '/api/tally/toggle') {
    $data = json_decode(@file_get_contents($dataFile) ?: '{}', true) ?: [];
    if (!isset($data['live'])) $data['live'] = [];
    if (!isset($data['live']['cameras'])) $data['live']['cameras'] = [];
    $data['live']['cameras']['showTally'] = !($data['live']['cameras']['showTally'] ?? false);
    $data['lastUpdated'] = round(microtime(true) * 1000);
    @file_put_contents($dataFile, json_encode($data, JSON_UNESCAPED_SLASHES));
    echo json_encode(['success' => true, 'showTally' => $data['live']['cameras']['showTally']]);
    exit;
}

// 404 Fallback for unknown API routes
http_response_code(404);
echo json_encode(['error' => 'Ruta API no encontrada', 'path' => $path]);
