<?php
/**
 * Manca - Seguridad comun de la API
 * Carga configuracion, maneja CORS, sesiones de administrador y rate limiting.
 */

declare(strict_types=1);

/** Lee api/config.json (generado localmente, NO se sube a git). */
function manca_config(): array {
    static $cfg = null;
    if ($cfg !== null) return $cfg;
    $file = __DIR__ . '/config.json';
    $cfg = (file_exists($file) ? json_decode((string) file_get_contents($file), true) : []) ?: [];
    return $cfg;
}

/** Respuesta JSON y salida. */
function manca_json(array $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

/** Inicio de sesion PHP seguro (cookie HttpOnly + SameSite + Secure). */
function manca_session_start(): void {
    if (session_status() === PHP_SESSION_NONE) {
        $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (isset($_SERVER['SERVER_PORT']) && (int) $_SERVER['SERVER_PORT'] === 443);
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'httponly' => true,
            'secure' => $secure,
            'samesite' => 'Lax',
        ]);
        session_start();
    }
}

/**
 * CORS: solo origenes permitidos para escritura (POST/PUT/DELETE).
 * GET publico sigue disponible (el sitio lee el contenido sin credenciales).
 */
function manca_cors(): void {
    $cfg = manca_config();
    $allowed = array_values(array_filter(array_map('trim', $cfg['allowed_origins'] ?? ['https://elmanca.com.ar'])));
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

    if ($method === 'OPTIONS') {
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
        http_response_code(204);
        exit;
    }

    $isWrite = in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true);

    if ($origin === '') {
        // Cliente sin header Origin (curl, navegacion directa).
        header('Access-Control-Allow-Origin: *');
        return;
    }

    if ($isWrite && !in_array($origin, $allowed, true)) {
        manca_json(['error' => 'Origen no autorizado.'], 403);
    }

    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    if ($isWrite) {
        header('Access-Control-Allow-Credentials: true');
    }
}

/** Bloquea endpoints de escritura si no hay sesion de admin activa. */
function manca_require_admin(): void {
    manca_session_start();
    if (empty($_SESSION['manca_admin'])) {
        manca_json(['error' => 'No autorizado. Iniciá sesion desde el panel de administracion.'], 401);
    }
}

/** IP del cliente. */
function manca_client_ip(): string {
    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

/** Lee el registro de intentos de login. */
function manca_login_attempts(): array {
    $file = __DIR__ . '/data/login_attempts.json';
    $data = file_exists($file) ? json_decode((string) file_get_contents($file), true) : [];
    return is_array($data) ? $data : [];
}

/** Guarda el registro de intentos de login. */
function manca_login_attempts_save(array $data): void {
    $file = __DIR__ . '/data/login_attempts.json';
    @file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);
}

/** Rate limiting: devuelve true si la IP puede intentar login. */
function manca_login_allowed(): bool {
    $cfg = manca_config();
    $limit = max(1, (int) ($cfg['login_rate_limit'] ?? 5));
    $ip = manca_client_ip();
    $now = time();
    $all = manca_login_attempts();
    $entry = $all[$ip] ?? ['count' => 0, 'window' => $now];
    if ($now - (int) ($entry['window'] ?? $now) > 900) {
        $entry = ['count' => 0, 'window' => $now];
    }
    if ((int) ($entry['count'] ?? 0) >= $limit) {
        return false;
    }
    return true;
}

/** Registra un intento (el exito resetea el contador de la IP). */
function manca_login_register(bool $ok): void {
    $ip = manca_client_ip();
    $now = time();
    $all = manca_login_attempts();
    if ($ok) {
        $all[$ip] = ['count' => 0, 'window' => $now];
    } else {
        $entry = $all[$ip] ?? ['count' => 0, 'window' => $now];
        $all[$ip] = ['count' => (int) ($entry['count'] ?? 0) + 1, 'window' => (int) ($entry['window'] ?? $now)];
    }
    manca_login_attempts_save($all);
}