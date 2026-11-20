package com.clementcombier.studio;

import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.zip.*;
import java.io.*;

/** Dependency-free regression suite; throws on failure regardless of JVM -ea flags. */
public final class CompilerTest {
    private static int checks;
    /** Records a check and fails the suite when its invariant is violated. */
    private static void check(boolean condition, String message) {
        checks++;
        if (!condition) throw new AssertionError(message);
    }
    /** Compiles an inline UTF-8 fixture for validation tests. */
    private static ImpactCompiler.Build compile(String xml) throws Exception {
        return new ImpactCompiler().compile(xml.getBytes(StandardCharsets.UTF_8));
    }
    /** Exercises real-model preservation, artifact generation, and invalid-input rejection. */
    public static void main(String[] args) throws Exception {
        var compiler = new ImpactCompiler();
        byte[] dto = Files.readAllBytes(Path.of("examples/dto-bip.xml"));
        var build = compiler.compile(dto);
        check(build.valid(), "Real DTO–BIP must validate: " + Json.encode(build.report()));
        check(build.pipelines().size() == 20, "20 indicators retained");
        check(build.model().ofType(ImpactModel.NS, "contributesTo").size() == 28, "28 contributions retained");
        check(build.model().ofType(ImpactModel.NS, "supports").size() == 15, "15 support links retained");
        check(Arrays.equals(dto, build.artifacts().get("model.xml")), "XML byte preservation");
        check(build.pipelines().stream().allMatch(p -> p.get("status").equals("BLOCKED")), "Incomplete indicators explicitly blocked");
        check(Arrays.equals(build.zip(), compiler.compile(dto).zip()), "Deterministic ZIP");
        var demo = compiler.compile(Files.readAllBytes(Path.of("examples/executable-demo.xml")));
        check(demo.valid(), "Executable demo validates");
        check(demo.pipelines().getFirst().get("status").equals("GENERATED_UNVERIFIED"), "Honest runtime status");
        check(demo.artifacts().containsKey("hop/pipelines/indicator-1.hpl"), "Hop pipeline generated");
        check(new String(demo.artifacts().get("sql/002_model.sql"), StandardCharsets.UTF_8).contains("participant-count"), "Indicator registered in SQL");
        try (var zip = new ZipInputStream(new ByteArrayInputStream(demo.zip()))) {
            for (ZipEntry entry; (entry = zip.getNextEntry()) != null;) {
                byte[] bytes = zip.readAllBytes();
                if (entry.getName().endsWith(".hpl")) {
                    // Check well-formedness with the same hardened parser; root errors are expected.
                    check(!ImpactModel.parse(bytes).valid(), "Hop XML is well-formed and distinct from source model");
                }
            }
        }
        String base = Files.readString(Path.of("examples/executable-demo.xml"));
        var duplicate = compile(base.replace("<activities>", "<actors><actor id=\"demo\"/></actors><activities>"));
        check(!duplicate.valid() && duplicate.artifacts().size() == 1, "Invalid model emits diagnostics only");
        var dangling = compile(base.replace("<activities>", "<preconditions><precondition id=\"p\" targetRef=\"absent\"/></preconditions><activities>"));
        check(!dangling.valid(), "Dangling reference rejected");
        var foreign = compile(base.replace("urn:impact-pathway:0.1", "urn:wrong"));
        check(!foreign.valid(), "Wrong namespace rejected");
        check(!compile(base.replace("version=\"0.1\"", "version=\"9\"")).valid(), "Unsupported version rejected");
        check(!compile(base.replace("connection=\"observatory_dw\"", "connection=\"../bad\"")).valid(), "Invalid connection rejected");
        check(!compile(base.replace("12::numeric AS value", "12::numeric AS value; DROP TABLE x")).valid(), "Multiple SQL statements rejected");
        check(!compile(base.replace("id=\"workshop\"", "")).valid(), "Missing pathway IDs rejected");
        boolean blocked = false;
        try { compile("<!DOCTYPE impactModel [<!ENTITY x SYSTEM 'file:///etc/passwd'>]><impactModel>&x;</impactModel>"); }
        catch (Exception expected) { blocked = true; }
        check(blocked, "External entities blocked");
        String escaped = base.replace("name=\"Workshop\"", "name=\"L&apos;atelier \\ test\"");
        check(compile(escaped).valid(), "Quotes and backslashes accepted as data");
        check(Json.encode(Map.of("text", "\n\t\"\\")).contains("\\n\\t\\\"\\\\"), "JSON encoding");
        System.out.println("Passed " + checks + " compiler checks.");
    }
}
