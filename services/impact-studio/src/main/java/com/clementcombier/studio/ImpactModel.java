package com.clementcombier.studio;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import org.w3c.dom.*;
import org.xml.sax.*;

/** Namespace-aware source model; original XML bytes are retained without rewriting. */
public record ImpactModel(byte[] source, Document document, String buildId,
                          Map<String, Element> elements, List<Diagnostic> diagnostics) {
    public static final String NS = "urn:impact-pathway:0.1";
    public static final String EXEC_NS = "urn:iobservatory:execution:0.1";

    /** Identifies a validation finding and the model element to which it applies. */
    public record Diagnostic(String severity, String code, String elementId, String message) {
        /** Exposes the diagnostic as fields for JSON reports. */
        public Map<String, Object> asMap() {
            return Map.of("severity", severity, "code", code, "elementId", elementId, "message", message);
        }
    }

    /** Parses XML, indexes domain identifiers, and checks structural references. */
    /** The identifier index is completed before references are resolved, allowing forward references. */
    public static ImpactModel parse(byte[] bytes) throws Exception {
        var factory = DocumentBuilderFactory.newInstance();
        // Imported models must not resolve external entities or read server-local files.
        factory.setNamespaceAware(true);
        factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
        factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
        factory.setXIncludeAware(false);
        factory.setExpandEntityReferences(false);
        var builder = factory.newDocumentBuilder();
        builder.setErrorHandler(new ErrorHandler() {
            public void warning(SAXParseException e) throws SAXException { throw e; }
            public void error(SAXParseException e) throws SAXException { throw e; }
            public void fatalError(SAXParseException e) throws SAXException { throw e; }
        });
        var doc = builder.parse(new ByteArrayInputStream(bytes));
        var errors = new ArrayList<Diagnostic>();
        Element root = doc.getDocumentElement();
        if (!NS.equals(root.getNamespaceURI()) || !"impactModel".equals(root.getLocalName())) {
            errors.add(new Diagnostic("ERROR", "ROOT", "", "Expected impactModel in " + NS));
        }
        if (!"0.1".equals(root.getAttribute("version"))) {
            errors.add(new Diagnostic("ERROR", "VERSION", "", "Only language version 0.1 is supported."));
        }
        var index = new LinkedHashMap<String, Element>();
        var nodes = doc.getElementsByTagName("*");
        for (int i = 0; i < nodes.getLength(); i++) {
            var e = (Element) nodes.item(i);
            if (!NS.equals(e.getNamespaceURI())) continue;
            if (e.hasAttribute("id")) {
                String id = e.getAttribute("id");
                if (id.isBlank()) errors.add(new Diagnostic("ERROR", "EMPTY_ID", "", "IDs cannot be blank."));
                else if (index.putIfAbsent(id, e) != null)
                    errors.add(new Diagnostic("ERROR", "DUPLICATE_ID", id, "Duplicate identifier."));
            }
        }
        // References are checked after indexing so declaration order does not affect validity.
        var initiatives = doc.getElementsByTagNameNS(NS, "initiative");
        if (initiatives.getLength() != 1 || initiatives.item(0).getParentNode() != root) {
            errors.add(new Diagnostic("ERROR", "INITIATIVE", "", "Exactly one direct initiative is required."));
        }
        Set<String> definitions = Set.of("impactModel", "initiative", "activity", "input", "output",
                "outcome", "impact", "indicator", "precondition", "contributesTo", "supports");
        for (int i = 0; i < nodes.getLength(); i++) {
            var e = (Element) nodes.item(i);
            if (!NS.equals(e.getNamespaceURI())) continue;
            if (definitions.contains(e.getLocalName()) && e.getAttribute("id").isBlank())
                errors.add(new Diagnostic("ERROR", "MISSING_ID", "", "Missing id on " + e.getLocalName()));
            for (String attr : List.of("ref", "from", "to", "sourceRef", "targetRef")) {
                if (e.hasAttribute(attr) && !index.containsKey(e.getAttribute(attr))) {
                    errors.add(new Diagnostic("ERROR", "UNRESOLVED_REFERENCE", ownerId(e),
                            attr + " does not resolve: " + e.getAttribute(attr)));
                }
            }
            if (Set.of("contributesTo", "supports").contains(e.getLocalName())) {
                for (String attr : List.of("from", "to")) {
                    if (e.getAttribute(attr).isBlank()) errors.add(new Diagnostic("ERROR", "ENDPOINT", ownerId(e), "Missing " + attr));
                    var target = index.get(e.getAttribute(attr));
                    if (target != null && !Set.of("input", "activity", "output", "outcome", "impact").contains(target.getLocalName()))
                        errors.add(new Diagnostic("ERROR", "ENDPOINT_TYPE", ownerId(e), "Invalid pathway endpoint: " + target.getLocalName()));
                }
            }
        }
        String hash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        return new ImpactModel(bytes.clone(), doc, hash, Collections.unmodifiableMap(index), errors);
    }

    /** Finds the nearest identifier-bearing ancestor, including the supplied element. */
    public static String ownerId(Element e) {
        for (Node node = e; node instanceof Element item; node = node.getParentNode()) {
            if (item.hasAttribute("id")) return item.getAttribute("id");
        }
        return "";
    }

    /** Returns elements matching a namespace and local name in document order. */
    public List<Element> ofType(String namespace, String type) {
        var result = new ArrayList<Element>();
        var list = document.getElementsByTagNameNS(namespace, type);
        for (int i = 0; i < list.getLength(); i++) result.add((Element) list.item(i));
        return result;
    }

    /** Reports whether structural validation produced no errors; warnings do not invalidate the model. */
    public boolean valid() { return diagnostics.stream().noneMatch(d -> d.severity().equals("ERROR")); }
    /** Decodes the retained source as UTF-8 for storage in generated SQL. */
    public String xml() { return new String(source, StandardCharsets.UTF_8); }
}
