<?php
/**
 * Manca - Login del panel de administracion.
 * Verifica usuario/contraseña contra api/config.json y crea una sesion segura.
 */
require __DIR__ . '/common.php';

manca_cors();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    manca_json(['error' => 'Método no permitido.'], 405);
}

$cfg = manca_config();
if (empty($cfg['password_salt']) || empty($cfg['password_hash'])) {
    manca_json(['error' => 'Servidor mal configurado: falta api/config.json. Subilo desde el proyecto.'], 500);
}

if (!manca_login_allowed()) {
    manca_json(['error' => 'Demasiados intentos. Esperá 15 minutos e intentá de nuevo.'], 429);
}

$raw = json_decode((string) file_get_contents('php://input'), true) ?: [];
$username = trim((string) ($raw['username'] ?? ''));
$password = (string) ($raw['password'] ?? '');

$expected = hash('sha256', $cfg['password_salt'] . $password);
$validUser = hash_equals((string) ($cfg['admin_user'] ?? 'admin'), $username);
$validPass = hash_equals($expected, $cfg['password_hash']);

if ($validUser && $validPass) {
    manca_session_start();
    session_regenerate_id(true);
    $_SESSION['manca_admin'] = true;
    manca_login_register(true);
    manca_json(['success' => true, 'message' => 'Acceso autorizado.']);
}

manca_login_register(false);
manca_json(['error' => 'Usuario o contraseña incorrectos. Verifique sus credenciales.'], 401);