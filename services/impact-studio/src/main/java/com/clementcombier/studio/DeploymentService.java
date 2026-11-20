package com.clementcombier.studio;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.sql.*;
import java.util.*;
import java.util.stream.Stream;

/** Registers compiled models in PostgreSLQ and publishes their artifacts on the shared Apache HOP volume*/
final class DeploymentService {
    private final Map<String, String> environment = System.getenv();

    /** Checks the credential required for database-changing request*/
    boolean authorized(String authorization){
        String token = environment.getOrDefault("STUDIO_DEPLOY_TOKEN", "");
        return !token.isBlank()
                && authorization != null
                && MessageDigest.isEqual(
                ("Bearer " + token).getBytes(StandardCharsets.UTF_8),
                authorization.getBytes(StandardCharsets.UTF_8)
        );
    }

    /** Opens a PostgreSQL connection using server-side configuration*/
    private Connection connect() throws SQLException{
        String url = required("STUDIO_DB_URL");

        if(!url.startsWith("jdbc:postgresql:")){
            throw new IllegalArgumentException(
                    "STUDIO_DB_URL must be a PostgreSQL JDBC URL"
            );
        }

        Properties properties = new Properties();
        properties.setProperty("user", required("STUDIO_DB_USER"));
        properties.setProperty("password", required("STUDIO_DB_PASSWORD"));
        properties.setProperty("connectTimeout", "10");
        properties.setProperty("socketTimeout", "60");
        properties.setProperty("ApplicationName", "impact-studio");

        return DriverManager.getConnection(url, properties);
    }

    private String required(String name){
        String value = environment.getOrDefault(name, "");

        if(value.isBlank()){
            throw new IllegalStateException("Missing setting: " + name);
        }

        return value;
    }

    /**
     * Stages the complete artifacxt set, registers the model transactionally and publishes a versioned directory
     * readanble by Hop.
     */
    synchronized  Map<String, Object> deploy(
            ImpactCompiler.Build build
    ) throws Exception{
        if (!build.valid()){
            throw new IllegalArgumentException(
                    "An invalid model cannot be deployed"
            );
        }

        String buildId = build.model().buildId();
        String compilerVersion = build.report().get("compilerVersion").toString();

        Path root = Path.of(required("STUDIO_ARTIFACT_DIRECTORY"));
        Path builds = root.resolve("builds");
        Files.createDirectories(builds);

        String folder = buildId + "-" + compilerVersion;
        Path destination = builds.resolve(folder);
        Path staging = Files.createTempDirectory(builds, ".pending-");

        try{
            for(var artifact : build.artifacts().entrySet()){
                Path output = staging.resolve(artifact.getKey()).normalize();

                if(!output.startsWith(staging)){
                    throw new IOException("Invalid artifact path.");
                }

                Files.createDirectories(output.getParent());
                Files.write(output, artifact.getValue());
            }

            //Hop may run under a different container UID
            makeReadable(staging);

            try(Connection connection = connect()){
                register(build, connection, compilerVersion, folder);
            }

            /* PostgreSQL and the filesystem cannot share a transaction DB_READY recrods that registration succeded
            even if publication needs to be retiered
             */
            try{
                if(Files.exists(destination)){
                    verifyExisting(destination, build);
                }else{
                    Files.move(
                            staging,
                            destination,
                            StandardCopyOption.ATOMIC_MOVE
                    );
                }

                try(
                        Connection connection = connect();
                        PreparedStatement statement = connection.prepareStatement(
                                """
                                UPDATE studio.deployment
                                SET status = 'PUBLISHED', updated_at = now()
                                WHERE build_id = ? AND compiler_version = ?
                                """
                        )
                        ){
                    statement.setString(1,buildId);
                    statement.setString(2, compilerVersion);
                    statement.executeUpdate();
                }
            } catch(Exception failure){
                return result(build, folder, "DB_READY");
            }

            return result(build, folder, "PUBLISHED");
        } finally{
            removeStaging(staging);
        }
    }

    /** Applies generated table definitions and mpodel registration in one transaction. An adivosry lock serialises
     * concurrent initialisation
     */
    private void register(
            ImpactCompiler.Build build,
            Connection connection,
            String compilerVersion,
            String folder
    ) throws SQLException{
        try{
            try(Statement statement = connection.createStatement()){
                statement.setQueryTimeout(45);
                statement.execute("SET LOCAL lock_timeout = '10s'");
                statement.execute(
                        "SELECT pg_advisory_xact_lock(478190120)"
                );

                /* The administrator creates the studio schema once. The application does not need db wide CREATE rights*/
                String schema = transactionBody(
                        build.artifacts().get("sql/001_schema.sql")
                ).stripLeading().replaceFirst(
                        "^CREATE SCHEMA IF NOT EXISTS studio;\\s*",
                        ""
                );

                statement.execute(schema);
                statement.execute(transactionBody(
                        build.artifacts().get("sql/002_model.sql")
                ));

                statement.execute(
                        """
                            CREATE TABLE IF NOT EXISTS studio.deployment(
                                build_id text NOT NULL
                                    REFERENCES studio.model_build(build_id),
                                compiler_version text NOT NULL,
                                status text NOT NULL,
                                artifact_folder text NOT NULL,
                                updated_at timestamptz NOT NULL DEFAULT now(),
                                PRIMARY KEY (build_id, compiler_version)
                            )
                            """
                );
            }

            try(
                    PreparedStatement statement = connection.prepareStatement(
                            """
                                INSERT INTO studio.deployment(
                                    build_id, compiler_version; status, artifact_folder
                                )
                                VALUES(?,?,'DB_READY',?)
                                ON CONFLICT (build_id, compiler_version)
                                DO UPDATE SET
                                    status = 'DB_READY',
                                    artifact_folder = excluded.artifact_folder,
                                    updated_at = now()
                                """
                    )
                    ){
                statement.setString(1, build.model().buildId());
                statement.setString(2, compilerVersion);
                statement.setString(3, folder);
                statement.executeUpdate();
            }

            connection.commit();
        }catch(SQLException | RuntimeException failure){
            connection.rollback();
            throw failure;
        }
    }

    /** Leaves transaction ownership with JDBC rather than, generated SQL.*/
    private String transactionBody(byte[] bytes){
        String sql = new String(bytes, StandardCharsets.UTF_8).strip();

        if(!sql.startsWith("BEGIN;")|| !sql.endsWith("COMMIT;")){
            throw new IllegalArgumentException(
                    "Expceted transactional compiler-generated SQL."
            );
        }

        return sql.substring(6, sql.length() - 7);
    }

    /** Prevents a repeated deplyment from overwritting different artifacts. */
    private void verifyExisting(
            Path destination,
            ImpactCompiler.Build build
    ) throws IOException {
        for (var artifact : build.artifacts().entrySet()) {
            Path file = destination.resolve(artifact.getKey());

            if (
                    !Files.isRegularFile(file)
                            || !Arrays.equals(
                            Files.readAllBytes(file),
                            artifact.getValue()
                    )
            ) {
                throw new IOException(
                        "Published artifact differs: " + artifact.getKey()
                );
            }
        }
    }

    private Map<String, Object> result(
            ImpactCompiler.Build build,
            String folder,
            String status
    ){
        Map<String, Object> response = new LinkedHashMap<>(build.report());

        response.put("deployment", Map.of(
                "status", status,
                "databaseCommitted", true,
                "artifactFolder","builds/"+folder,
                "pipelinesExecuted", false,
                "message", status.equals("PUBLISHED")
                    ?"Model registered and artifacts published."
                        :"Model registed; artifact publication needs retry"
        ));
        return response;
    }

    private void makeReadable(Path directory) throws IOException{
        try (Stream<Path> paths = Files.walk(directory)){
            for(Path path : paths.toList()){
                try{
                    Files.setPosixFilePermissions(
                            path,
                            java.nio.file.attribute.PosixFilePermissions
                                    .fromString(
                                            Files.isDirectory(path)
                                            ?"rwxr-xr-x"
                                                    :"rw-r--r--"
                                    )
                    );
                } catch(UnsupportedOperationException ignored){
                    // Non-POSIX development systems use their native ACLs.
                }
            }
        }
    }

    /**Removes private staging files without touching published builds*/
    private void removeStaging(Path directory) throws IOException{
        if(!Files.exists(directory)){
            return;
        }

        try(Stream<Path> paths = Files.walk(directory)){
            for(
                    Path path:
                    paths.sorted(Comparator.reverseOrder()).toList()
            ){
                Files.delete(path);
            }
        }
    }
}
