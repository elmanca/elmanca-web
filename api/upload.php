<?php
/**
 * Manca - Subida de imagenes.
 * Acepta Base64 (JSON) o multipart. Requiere sesion de administrador.
 */
require __DIR__ . '/common.php';

manca_cors();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    manca_json(['error' => 'Método no permitido.'], 405);
}

manca_require_admin();

$uploadDir = dirname(__DIR__) . '/uploads/';
if (!is_dir($uploadDir)) {
    @mkdir($uploadDir, 0755, true);
}

$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (isset($_SERVER['SERVER_PORT']) && (int) $_SERVER['SERVER_PORT'] === 443);
$protocol = $isHttps ? 'https://' : 'http://';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$baseUrl = $protocol . $host . '/uploads/';

$allowed = ['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif'];

function manca_sanitize_name(string $name): string {
    $clean = preg_replace('/[^a-zA-Z0-9-_]/', '_', $name) ?? 'manca';
    return substr($clean, 0, 35);
}

function manca_store_upload(string $data, string $ext, string $prefix, string $uploadDir): string {
    $fileName = manca_sanitize_name($prefix) . '_' . time() . '_' . rand(100, 999) . '.' . $ext;
    if (file_put_contents($uploadDir . $fileName, $data, LOCK_EX) === false) {
        return '';
    }
    return $fileName;
}

// 1) Base64 / JSON
$rawInput = (string) file_get_contents('php://input');
if ($rawInput !== '') {
    $data = json_decode($rawInput, true);
    if (is_array($data) && isset($data['image']) && is_string($data['image'])) {
        if (preg_match('/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/', $data['image'], $matches)) {
            $type = strtolower($matches[1]);
            if ($type === 'jpeg') $type = 'jpg';
            if ($type === 'svg+xml') $type = 'svg';
            if (!in_array($type, $allowed, true)) {
                manca_json(['error' => 'Tipo de archivo no permitido: ' . $type], 400);
            }
            $decoded = base64_decode($matches[2], true);
            if ($decoded === false) {
                manca_json(['error' => 'Datos base64 inválidos.'], 400);
            }
            $fileName = manca_store_upload($decoded, $type, (string) ($data['name'] ?? 'manca'), $uploadDir);
            if ($fileName !== '') {
                manca_json(['success' => true, 'url' => $baseUrl . $fileName, 'filename' => $fileName, 'message' => 'Imagen guardada con éxito en Hostinger.']);
            }
            manca_json(['error' => 'No se pudo escribir el archivo en /uploads/. Revisá permisos 755.'], 500);
        }
    }
}

// 2) Multipart / FormData
if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
    $extension = strtolower((string) pathinfo((string) $_FILES['image']['name'], PATHINFO_EXTENSION));
    if (!in_array($extension, $allowed, true)) {
        manca_json(['error' => 'Extensión no permitida: ' . $extension], 400);
    }
    $cleanName = manca_sanitize_name((string) pathinfo((string) $_FILES['image']['name'], PATHINFO_FILENAME));
    $fileName = $cleanName . '_' . time() . '_' . rand(100, 999) . '.' . $extension;
    if (move_uploaded_file($_FILES['image']['tmp_name'], $uploadDir . $fileName)) {
        manca_json(['success' => true, 'url' => $baseUrl . $fileName, 'filename' => $fileName, 'message' => 'Imagen subida exitosamente a Hostinger.']);
    }
    manca_json(['error' => 'No se pudo mover el archivo a /uploads/. Revisá permisos 755.'], 500);
}

manca_json(['error' => 'No se recibió ninguna imagen válida.'], 400);