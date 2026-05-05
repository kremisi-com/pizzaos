<?php
header("Content-Type: application/json");

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(["success" => false, "error" => "Method not allowed"]);
    exit;
}

function sanitize($data) {
    return htmlspecialchars(trim($data), ENT_QUOTES, "UTF-8");
}

function is_valid_email($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL);
}

function send_plain_mail($to, $subject, $body, $replyTo = "") {
    $headers = "From: Kremisi <no-reply@kremisi.com>\r\n";

    if (!empty($replyTo) && is_valid_email($replyTo)) {
        $headers .= "Reply-To: $replyTo\r\n";
    }

    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

    if (mail($to, $subject, $body, $headers)) {
        echo json_encode(["success" => true, "message" => "Email sent successfully"]);
    } else {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => "Error sending email"]);
    }

    exit;
}

$name = sanitize($_POST["name"] ?? "");
$email = filter_var($_POST["email"] ?? "", FILTER_SANITIZE_EMAIL);
$pizzeriaName = sanitize($_POST["pizzeriaName"] ?? "");
$city = sanitize($_POST["city"] ?? "");

$errors = [];

if (empty($name)) {
    $errors[] = "Name is required.";
}

if (!is_valid_email($email)) {
    $errors[] = "Invalid email.";
}

if (empty($pizzeriaName)) {
    $errors[] = "Pizzeria name is required.";
}

if (!empty($errors)) {
    http_response_code(400);
    echo json_encode(["success" => false, "errors" => $errors]);
    exit;
}

$to = "info@kremisi.com";
$subject = "Nuova richiesta demo PizzaOS";
$timestamp = gmdate("c");

$body = "Nuova richiesta demo PizzaOS:\n\n";
$body .= "Nome e cognome: $name\n";
$body .= "Email: $email\n";
$body .= "Nome pizzeria: $pizzeriaName\n";

if (!empty($city)) {
    $body .= "Citta: $city\n";
}

$body .= "Timestamp: $timestamp\n";
$body .= "Sorgente: PizzaOS landing\n";

send_plain_mail($to, $subject, $body, $email);
?>
