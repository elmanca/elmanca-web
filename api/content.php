<?php
/**
 * Manca - API de contenido.
 * GET : lectura publica del contenido del sitio (el frontend lo consume).
 * POST: guardado permanente, requiere sesion de administrador.
 */
require __DIR__ . '/common.php';

manca_cors();

$dataDir = __DIR__ . '/data';
$dataFile = $dataDir . '/siteContent.json';
if (!is_dir($dataDir)) {
    @mkdir($dataDir, 0755, true);
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
    if (is_file($dataFile)) {
        header('Content-Type: application/json; charset=UTF-8');
        echo (string) file_get_contents($dataFile);
    } else {
        manca_json([
            'status' => 'ready',
            'message' => 'Hostinger API activa y lista para guardar contenidos',
            'serverTime' => date('Y-m-d H:i:s'),
        ]);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    manca_require_admin();

    $rawInput = (string) file_get_contents('php://input');
    if ($rawInput === '') {
        manca_json(['error' => 'Cuerpo de solicitud vacío.'], 400);
    }

    $decoded = json_decode($rawInput, true);
    if (!is_array($decoded)) {
        manca_json(['error' => 'Formato JSON no válido.'], 400);
    }

    $saved = file_put_contents(
        $dataFile,
        json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        LOCK_EX
    );

    if ($saved !== false) {
        manca_json([
            'success' => true,
            'message' => 'Contenido guardado permanentemente en Hostinger.',
            'timestamp' => date('H:i:s'),
            'bytes' => $saved,
        ]);
    }

    manca_json([
        'error' => "No se pudo escribir en 'api/data/siteContent.json'. Verificá los permisos (755) en Hostinger.",
    ], 500);
}

manca_json(['error' => 'Método no permitido.'], 405);