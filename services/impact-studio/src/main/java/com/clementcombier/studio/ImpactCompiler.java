package com.clementcombier.studio;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.zip.*;
import org.w3c.dom.Element;
import static com.clementcombier.studio.ImpactModel.*;

/** Pure compilation: never connects to PostgreSQL or starts a Hop execution. */
public final class ImpactCompiler {
    /** Holds generated artifacts, diagnostics, and the execution-readiness plan for a model. */
    public record Build(ImpactModel model, Map<String, byte[]> artifacts,
                        List<Diagnostic> diagnostics, List<Map<String, Object>> pipelines) {
        /** Reports whether this build has no compilation errors. */
        public boolean valid() { return diagnostics.stream().noneMatch(d -> d.severity().equals("ERROR")); }
        /** Builds the machine-readable summary used by the CLI, API, and archive. */
        public Map<String, Object> report() {
            return Map.of("compilerVersion", "0.1.0", "buildId", model.buildId(),
                    "valid", valid(), "executionVerified", false, "elements", model.elements().size(),
                    "diagnostics", diagnostics.stream().map(Diagnostic::asMap).toList(),
                    "pipelines", pipelines, "artifacts", artifacts.keySet());
        }
        /** Packages artifacts in insertion order with fixed timestamps for reproducible archives. */
        public byte[] zip() throws IOException {
            var bytes = new ByteArrayOutputStream();
            try (var zip = new ZipOutputStream(bytes)) {
                for (var entry : artifacts.entrySet()) {
                    var file = new ZipEntry(entry.getKey());
                    file.setTime(0); // Reproducible builds.
                    zip.putNextEntry(file);
                    zip.write(entry.getValue());
                    zip.closeEntry();
                }
            }
            return bytes.toByteArray();
        }
    }

    /** Compiles a source document into model-storage SQL and explicitly bound Hop pipelines. */
    /** Parsing and binding checks produce diagnostics first; invalid builds expose only their report. */
    public Build compile(byte[] source) throws Exception {
        var model = ImpactModel.parse(source);
        var diagnostics = new ArrayList<>(model.diagnostics());
        var files = new LinkedHashMap<String, byte[]>();
        var plans = new ArrayList<Map<String, Object>>();
        var bindings = new LinkedHashMap<String, Element>();
        for (var binding : model.ofType(EXEC_NS, "sqlBinding")) {
            String id = binding.getAttribute("indicatorRef");
            var indicator = model.elements().get(id);
            if (indicator == null || !"indicator".equals(indicator.getLocalName()))
                diagnostics.add(new Diagnostic("ERROR", "BINDING_TARGET", id, "Binding must reference an indicator."));
            if (bindings.putIfAbsent(id, binding) != null)
                diagnostics.add(new Diagnostic("ERROR", "DUPLICATE_BINDING", id, "Only one SQL binding per indicator is supported."));
            if (!binding.getAttribute("connection").matches("[A-Za-z][A-Za-z0-9_-]{0,63}"))
                diagnostics.add(new Diagnostic("ERROR", "CONNECTION", id, "Supply an existing Hop connection metadata name."));
            String query = binding.getTextContent().strip();
            if (!query.toUpperCase(Locale.ROOT).startsWith("SELECT ") || query.contains(";") || query.contains("${"))
                diagnostics.add(new Diagnostic("ERROR", "QUERY", id, "Prototype bindings require a single SELECT without semicolons or variable expansion. Use a read-only source account."));
        }
        var indicators = model.ofType(NS, "indicator");
        int position = 0;
        for (var indicator : indicators) {
            String id = indicator.getAttribute("id");
            var binding = bindings.get(id);
            String path = "hop/pipelines/indicator-" + (++position) + ".hpl";
            // Descriptive indicators remain valid models even when their execution mapping is incomplete.
            if (binding == null) diagnostics.add(new Diagnostic("WARNING", "BINDING_REQUIRED", id,
                    "No executable mapping. Add an exec:sqlBinding; descriptive calculation text is not executable."));
            plans.add(Map.of("indicatorId", id, "status", binding == null ? "BLOCKED" : "GENERATED_UNVERIFIED",
                    "artifact", binding == null ? "" : path));
            if (binding != null) put(files, path, pipeline(model, indicator, binding, position));
        }
        if (diagnostics.stream().noneMatch(d -> d.severity().equals("ERROR"))) {
            files.put("model.xml", source.clone());
            put(files, "sql/001_schema.sql", schema());
            put(files, "sql/002_model.sql", seed(model));
            put(files, "README.txt", "Build " + model.buildId() + "\nCompiler 0.1.0\n"
                    + "Apply SQL files in order using psql -v ON_ERROR_STOP=1.\n"
                    + "Generated pipelines require preconfigured source connections and target connection observatory_dw.\n"
                    + "Source query must return record_key (text), observed_at (timestamp), value (numeric).\n"
                    + "Pipelines insert observations; replaying the same record fails its unique key.\n"
                    + "Use a read-only source database account. Queries are user-authored code, not sandboxed.\n"
                    + "Hop runtime compatibility and database execution must be verified before production use.\n"
                    + "Missing bindings appear as BLOCKED in diagnostics.json. No deployment was performed.\n");
            // Partial artifacts must not look deployable when a compilation error was found.
        } else files.clear();
        var build = new Build(model, files, diagnostics, plans);
        files.put("diagnostics.json", new byte[0]);
        put(files, "diagnostics.json", Json.encode(build.report()));
        return build;
    }

    /** Adds a UTF-8 text artifact to the build. */
    private static void put(Map<String, byte[]> files, String path, String text) {
        files.put(path, text.getBytes(StandardCharsets.UTF_8));
    }

    /** Quotes model data as a PostgreSQL escape-string literal. */
    private static String sql(String value) {
        // PostgreSQL E strings remain safe independently of standard_conforming_strings.
        return "E'" + value.replace("\\", "\\\\").replace("'", "''") + "'";
    }

    /** Escapes text for generated XML content and double-quoted attributes. */
    static String xml(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    /** Generates transactional registration SQL for a build and its structural entities. */
    /** Elements precede relationships and indicators so their foreign-key targets already exist. */
    private static String seed(ImpactModel model) {
        var out = new StringBuilder("BEGIN;\n");
        out.append("INSERT INTO studio.model_build(build_id, compiler_version, source_xml) VALUES (")
                .append(sql(model.buildId())).append(", '0.1.0', ").append(sql(model.xml()))
                .append(") ON CONFLICT (build_id) DO NOTHING;\n");
        for (var entry : model.elements().entrySet()) {
            var e = entry.getValue();
            out.append("INSERT INTO studio.model_element(build_id, element_id, kind, name) VALUES (")
                    .append(sql(model.buildId())).append(", ").append(sql(entry.getKey())).append(", ")
                    .append(sql(e.getLocalName())).append(", ").append(sql(e.getAttribute("name")))
                    .append(") ON CONFLICT DO NOTHING;\n");
        }
        for (var kind : List.of("contributesTo", "supports")) {
            for (var e : model.ofType(NS, kind)) {
                out.append("INSERT INTO studio.relationship(build_id, element_id, source_id, target_id) VALUES (")
                        .append(sql(model.buildId())).append(", ").append(sql(e.getAttribute("id"))).append(", ")
                        .append(sql(e.getAttribute("from"))).append(", ").append(sql(e.getAttribute("to")))
                        .append(") ON CONFLICT DO NOTHING;\n");
            }
        }
        for (var e : model.ofType(NS, "indicator")) {
            out.append("INSERT INTO studio.indicator(build_id, indicator_id, owner_element_id) VALUES (")
                    .append(sql(model.buildId())).append(", ").append(sql(e.getAttribute("id"))).append(", ")
                    .append(sql(ownerId((Element) e.getParentNode()))).append(") ON CONFLICT DO NOTHING;\n");
        }
        return out.append("COMMIT;\n").toString();
    }

    /** Defines the initial PostgreSQL storage schema and version-specific foreign keys. */
    private static String schema() {
        return """
            BEGIN;
            CREATE SCHEMA IF NOT EXISTS studio;
            CREATE TABLE IF NOT EXISTS studio.model_build (
              build_id text PRIMARY KEY, compiler_version text NOT NULL,
              source_xml text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
            );
            CREATE TABLE IF NOT EXISTS studio.model_element (
              build_id text NOT NULL REFERENCES studio.model_build(build_id),
              element_id text NOT NULL, kind text NOT NULL, name text NOT NULL,
              PRIMARY KEY (build_id, element_id)
            );
            CREATE TABLE IF NOT EXISTS studio.relationship (
              build_id text NOT NULL, element_id text NOT NULL, source_id text NOT NULL, target_id text NOT NULL,
              PRIMARY KEY (build_id, element_id),
              FOREIGN KEY (build_id, element_id) REFERENCES studio.model_element,
              FOREIGN KEY (build_id, source_id) REFERENCES studio.model_element,
              FOREIGN KEY (build_id, target_id) REFERENCES studio.model_element
            );
            CREATE TABLE IF NOT EXISTS studio.indicator (
              build_id text NOT NULL, indicator_id text NOT NULL, owner_element_id text NOT NULL,
              PRIMARY KEY (build_id, indicator_id),
              FOREIGN KEY (build_id, indicator_id) REFERENCES studio.model_element,
              FOREIGN KEY (build_id, owner_element_id) REFERENCES studio.model_element
            );
            CREATE TABLE IF NOT EXISTS studio.observation (
              build_id text NOT NULL, indicator_id text NOT NULL, record_key text NOT NULL,
              observed_at timestamptz NOT NULL, value numeric NOT NULL,
              ingested_at timestamptz NOT NULL DEFAULT now(),
              PRIMARY KEY (build_id, indicator_id, record_key),
              FOREIGN KEY (build_id, indicator_id) REFERENCES studio.indicator
            );
            COMMIT;
            """;
    }

    /** Generates a Hop pipeline that reads a bound SQL query and inserts indicator observations. */
    /** The query is wrapped to attach build and indicator identifiers to every source record. */
    private static String pipeline(ImpactModel model, Element indicator, Element binding, int number) {
        String query = "SELECT " + sql(model.buildId()) + " AS build_id, "
                + sql(indicator.getAttribute("id")) + " AS indicator_id, "
                + "q.record_key, q.observed_at, q.value FROM (" + binding.getTextContent().strip() + ") q";
        var fields = new StringBuilder();
        for (String field : List.of("build_id", "indicator_id", "record_key", "observed_at", "value"))
            fields.append("<field><column_name>").append(field).append("</column_name><stream_name>")
                    .append(field).append("</stream_name></field>");
        return """
            <?xml version="1.0" encoding="UTF-8"?>
            <pipeline>
              <info><name>indicator-%d</name><description>Generated by Impact Studio 0.1.0</description>
                <pipeline_type>Normal</pipeline_type></info>
              <order><hop><from>Extract observations</from><to>Store observations</to><enabled>Y</enabled></hop></order>
              <transform>
                <name>Extract observations</name><type>TableInput</type><copies>1</copies>
                <connection>%s</connection><sql>%s</sql><limit>0</limit>
                <execute_each_row>N</execute_each_row><variables_active>N</variables_active><lazy_conversion_active>N</lazy_conversion_active>
                <GUI><xloc>150</xloc><yloc>150</yloc><draw>Y</draw></GUI>
              </transform>
              <transform>
                <name>Store observations</name><type>TableOutput</type><copies>1</copies>
                <connection>observatory_dw</connection><schema>studio</schema><table>observation</table>
                <commit>1000</commit><truncate>N</truncate><ignore_errors>N</ignore_errors>
                <use_batch>Y</use_batch><specify_fields>Y</specify_fields><fields>%s</fields>
                <GUI><xloc>400</xloc><yloc>150</yloc><draw>Y</draw></GUI>
              </transform>
            </pipeline>
            """.formatted(number, xml(binding.getAttribute("connection")), xml(query), fields);
    }
}
