package com.clementcombier.studio;

import com.sun.net.httpserver.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.Executors;

/** Stateless HTTP adapter. Bind to localhost by default; container config opts into all interfaces. */
final class WebServer {

    private static final DeploymentService deployment = new DeploymentService();
    /** Starts the HTTP service with the configured bind address, port, and application prefix. */
    static void start() throws IOException {
        int port = Integer.parseInt(System.getenv().getOrDefault("SERVER_PORT", "8080"));
        String base = System.getenv().getOrDefault("STUDIO_BASE_PATH", "/studio");
        if (!base.matches("(/[A-Za-z0-9_-]+)*")) throw new IllegalArgumentException("Invalid STUDIO_BASE_PATH");
        String prefix = base;
        var server = HttpServer.create(new InetSocketAddress(
                System.getenv().getOrDefault("STUDIO_BIND_ADDRESS", "127.0.0.1"), port), 32);
        server.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
        server.createContext("/", exchange -> handle(exchange, prefix));
        server.start();
        System.out.println("Impact Studio listening on port " + port + " at " + base + "/");
    }

    /** Routes health, compilation, and static-asset requests and translates failures into responses. */
    private static void handle(HttpExchange exchange, String base) throws IOException {
        try {
            String path = exchange.getRequestURI().getPath();
            exchange.getResponseHeaders().set("X-Content-Type-Options", "nosniff");
            exchange.getResponseHeaders().set("Cache-Control", "no-store");
            if (path.equals(base) && !base.isEmpty()) {
                exchange.getResponseHeaders().set("Location", base + "/");
                send(exchange, 308, "text/plain", new byte[0]); return;
            }
            if (!path.startsWith(base + "/")) { sendText(exchange, 404, "Not found"); return; }
            String route = path.substring(base.length());
            if (route.equals("/health") && exchange.getRequestMethod().equals("GET")) {
                sendJson(exchange, 200, Map.of("status", "UP", "version", "0.1.0")); return;
            }
            if (Set.of("/api/validate", "/api/compile").contains(route)) {
                if (!exchange.getRequestMethod().equals("POST")) { sendText(exchange, 405, "Use POST"); return; }
                // Reject cross-origin request before processing XLK or  changing the database
                String origin = exchange.getRequestHeaders().getFirst("Origin");
                String host = exchange.getRequestHeaders().getFirst("Host");
                if (origin != null && !Objects.equals(URI.create(origin).getAuthority(), host)) {
                    sendText(exchange, 403, "Cross-origin requests are disabled"); return;
                }
                // Database-changing requests require the configured deployment credential.
                if (
                        route.equals("/api/compile")
                                && !deployment.authorized(
                                exchange.getRequestHeaders().getFirst("Authorization")
                        )
                ) {
                    sendJson(exchange, 401, Map.of(
                            "error", "UNAUTHORIZED",
                            "message", "A valid deployment token is required."
                    ));
                    return;
                }
                byte[] bytes = exchange.getRequestBody().readNBytes(2_000_001);
                if (bytes.length > 2_000_000) { sendText(exchange, 413, "XML limit is 2 MB"); return; }
                var build = new ImpactCompiler().compile(bytes);
                if (!build.valid() || route.equals("/api/validate")) {
                    sendJson(exchange, build.valid() ? 200 : 422, build.report()); return;
                }
                try {
                    sendJson(exchange, 200, deployment.deploy(build));
                } catch (Exception failure) {
                    System.err.println(
                            "Deployment failed: " + failure.getClass().getSimpleName()
                    );

                    sendJson(exchange, 503, Map.of(
                            "error", "DEPLOYMENT_FAILED",
                            "message",
                            "Check database settings, schema permissions, "
                                    + "JDBC driver, and shared-volume access."
                    ));
                }
                return;
            }
            if (!exchange.getRequestMethod().equals("GET")) { sendText(exchange, 405, "Use GET"); return; }
            String file = route.equals("/") ? "index.html" : route.substring(1);
            String asset = file.startsWith("js/") ? file.substring(3) : file;
            if ((file.startsWith("js/") && !asset.endsWith(".js")) || !Set.of("index.html", "model.js", "style.css", "example.xml", "build.html", "build.js",
                    "state.js", "ui.js", "canvas.js", "inspector-assumptions.js", "inspector-preconditions.js", "inspector-resources.js", "inspector-indicators.js", "inspector.js", "interactions.js", "documents.js", "app.js").contains(asset)) {
                sendText(exchange, 404, "Not found"); return;
            }
            String resource = asset.endsWith(".js") ? "js/" + asset : asset;
            try (var stream = WebServer.class.getResourceAsStream("/web/" + resource)) {
                if (stream == null) { sendText(exchange, 404, "Not found"); return; }
                String type = file.endsWith(".js") ? "text/javascript" : file.endsWith(".css") ? "text/css"
                        : file.endsWith(".xml") ? "application/xml" : "text/html";
                send(exchange, 200, type + "; charset=utf-8", stream.readAllBytes());
            }
        } catch (Exception e) {
            sendJson(exchange, 400, Map.of("valid", false, "error", "INVALID_REQUEST", "message",
                    Objects.toString(e.getMessage(), "Invalid model")));
        } finally { exchange.close(); }
    }

    /** Sends a structured API response as UTF-8 JSON. */
    private static void sendJson(HttpExchange exchange, int status, Object value) throws IOException {
        send(exchange, status, "application/json; charset=utf-8", Json.encode(value).getBytes(StandardCharsets.UTF_8));
    }
    /** Sends a plain-text HTTP response. */
    private static void sendText(HttpExchange exchange, int status, String value) throws IOException {
        send(exchange, status, "text/plain; charset=utf-8", value.getBytes(StandardCharsets.UTF_8));
    }
    /** Writes the HTTP status, content type, and response body. */
    private static void send(HttpExchange exchange, int status, String type, byte[] bytes) throws IOException {
        exchange.getResponseHeaders().set("Content-Type", type);
        exchange.sendResponseHeaders(status, bytes.length);
        exchange.getResponseBody().write(bytes);
    }
}
