package com.clementcombier.studio;

import java.nio.file.*;

/** Starts the web application or runs the compiler from the command line. */
public final class Main {
    /** Dispatches service, validation, and compilation commands and reports command failures. */
    public static void main(String[] args) throws Exception {
        if (args.length == 0 || args[0].equals("serve")) {
            WebServer.start();
            return;
        }
        if (args.length < 2 || !java.util.Set.of("validate", "compile").contains(args[0])) {
            System.err.println("Usage: java -jar impact-studio.jar serve | validate MODEL.xml | compile MODEL.xml BUILD.zip");
            System.exit(2);
        }
        try {
            if (args[0].equals("compile") && args.length != 3)
                throw new IllegalArgumentException("compile requires an output ZIP path");
            var build = new ImpactCompiler().compile(Files.readAllBytes(Path.of(args[1])));
            System.out.println(Json.encode(build.report()));
            if (!build.valid()) System.exit(1);
            if (args[0].equals("compile")) {
                Path destination = Path.of(args[2]);
                if (destination.toAbsolutePath().getParent() != null)
                    Files.createDirectories(destination.toAbsolutePath().getParent());
                Files.write(destination, build.zip());
            }
        } catch (Exception e) {
            System.err.println("Compilation failed: " + e.getMessage());
            System.exit(1);
        }
    }
}
