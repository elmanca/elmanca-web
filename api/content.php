<?php
/**
 * Manca Productora - Hostinger Content API
 * Permite guardar y leer el contenido del sitio web permanentemente en Hostinger.
 */
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$dataDir = __DIR__ . '/data';
$dataFile = $dataDir . '/siteContent.json';

if (!file_exists($dataDir)) {
    @mkdir($dataDir, 0755, true);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($dataFile)) {
        echo file_get_contents($dataFile);
    } else {
        // Si aún no se ha guardado, retornar estructura básica
        echo json_encode([
            "status" => "ready",
            "message" => "Hostinger API activa y lista para guardar contenidos",
            "serverTime" => date("Y-m-d H:i:s")
        ]);
    }
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    if (empty($rawInput)) {
        http_response_code(400);
        echo json_encode(["error" => "Cuerpo de solicitud vacío"]);
        exit();
    }

    $decoded = json_decode($rawInput, true);
    if ($decoded === null) {
        http_response_code(400);
        echo json_encode(["error" => "Formato JSON no válido"]);
        exit();
    }

    $saved = file_put_contents(
        $dataFile,
        json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
    );

    if ($saved !== false) {
        echo json_encode([
            "success" => true,
            "message" => "Contenido guardado permanentemente en Hostinger",
            "timestamp" => date("H:i:s"),
            "bytes" => $saved
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            "error" => "No se pudo escribir en 'api/data/siteContent.json'. Verifica los permisos de escritura (755) en Hostinger."
        ]);
    }
    exit();
}
