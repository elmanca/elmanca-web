<?php
/**
 * Manca Productora - Hostinger Image Uploader
 * Recibe imágenes desde el panel de administración y las guarda en /uploads/ dentro de Hostinger.
 * Devuelve la URL pública y definitiva de la imagen (ej: https://elmanca.com.ar/uploads/imagen.jpg).
 */
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Carpeta de almacenamiento en Hostinger: public_html/uploads/
$uploadDir = dirname(__DIR__) . '/uploads/';
if (!file_exists($uploadDir)) {
    @mkdir($uploadDir, 0755, true);
}

// Detección de protocolo y dominio de Hostinger
$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443);
$protocol = $isHttps ? "https://" : "http://";
$host = $_SERVER['HTTP_HOST'];
$baseUrl = $protocol . $host . '/uploads/';

// 1. Método Base64 (JSON)
$rawInput = file_get_contents('php://input');
if (!empty($rawInput)) {
    $data = json_decode($rawInput, true);
    if ($data && isset($data['image']) && is_string($data['image'])) {
        $base64String = $data['image'];
        if (preg_match('/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/', $base64String, $matches)) {
            $type = strtolower($matches[1]);
            $base64Data = $matches[2];

            if ($type === 'jpeg') $type = 'jpg';
            if ($type === 'svg+xml') $type = 'svg';

            $allowed = ['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif'];
            if (!in_array($type, $allowed)) {
                http_response_code(400);
                echo json_encode(["error" => "Tipo de archivo no permitido: " . $type]);
                exit();
            }

            $decoded = base64_decode($base64Data);
            if ($decoded === false) {
                http_response_code(400);
                echo json_encode(["error" => "Datos base64 inválidos"]);
                exit();
            }

            $namePrefix = !empty($data['name']) ? preg_replace('/[^a-zA-Z0-9-_]/', '_', $data['name']) : 'manca';
            $fileName = substr($namePrefix, 0, 35) . '_' . time() . '_' . rand(100, 999) . '.' . $type;
            $targetPath = $uploadDir . $fileName;

            if (file_put_contents($targetPath, $decoded) !== false) {
                echo json_encode([
                    "success" => true,
                    "url" => $baseUrl . $fileName,
                    "filename" => $fileName,
                    "message" => "Imagen guardada con éxito en Hostinger"
                ]);
                exit();
            } else {
                http_response_code(500);
                echo json_encode(["error" => "No se pudo escribir el archivo en /uploads/. Revisa permisos 755."]);
                exit();
            }
        }
    }
}

// 2. Método FormData / Multipart
if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
    $fileTmpPath = $_FILES['image']['tmp_name'];
    $originalName = $_FILES['image']['name'];
    $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

    $allowed = ['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif'];
    if (!in_array($extension, $allowed)) {
        http_response_code(400);
        echo json_encode(["error" => "Extensión no permitida: " . $extension]);
        exit();
    }

    $cleanName = preg_replace('/[^a-zA-Z0-9-_]/', '_', pathinfo($originalName, PATHINFO_FILENAME));
    $fileName = substr($cleanName, 0, 35) . '_' . time() . '_' . rand(100, 999) . '.' . $extension;
    $targetPath = $uploadDir . $fileName;

    if (move_uploaded_file($fileTmpPath, $targetPath)) {
        echo json_encode([
            "success" => true,
            "url" => $baseUrl . $fileName,
            "filename" => $fileName,
            "message" => "Imagen subida exitosamente a Hostinger"
        ]);
        exit();
    }
}

http_response_code(400);
echo json_encode(["error" => "No se recibió ninguna imagen válida"]);
