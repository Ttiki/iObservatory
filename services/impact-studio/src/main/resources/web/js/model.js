"use strict";

// XML is the source of truth. Canvas coordinates live in a processing instruction,
// keeping layout data out of the impact-pathway vocabulary.
class PathwayModel {
    static namespace = "urn:impact-pathway:0.1";
    static blockTypes = ["input", "activity", "output", "outcome", "impact", "precondition"];

    /** Parses a pathway document and restores its optional canvas layout. */
    constructor(xml) {
        if (/<!DOCTYPE|<!ENTITY/i.test(xml))
            throw new Error("DOCTYPE and entity declarations are not supported.");
        this.document = new DOMParser().parseFromString(xml, "application/xml");
        const root = this.document.documentElement;
        if (this.elements(this.document).some((e) => e.localName === "parsererror"))
            throw new Error("The XML is not well formed.");
        if (root.localName !== "impactModel" || root.namespaceURI !== PathwayModel.namespace) {
            throw new Error(
                'Expected <impactModel xmlns="urn:impact-pathway:0.1">. Use the included legacy editor for older programme XML.',
            );
        }
        this.positions = {};
        for (const node of Array.from(this.document.childNodes)) {
            if (node.nodeType === 7 && node.target === "pathway-studio") {
                try {
                    const saved = JSON.parse(decodeURIComponent(node.data));
                    for (const [id, p] of Object.entries(saved.positions || {})) {
                        if (Number.isFinite(p.x) && Number.isFinite(p.y))
                            this.positions[id] = { x: Math.max(20, p.x), y: Math.max(20, p.y) };
                    }
                } catch {
                    /* A damaged layout does not invalidate the programme model. */
                }
            }
        }
        this.initiativeId = this.initiatives()[0]?.getAttribute("id");
        const errors = this.validate();
        if (errors.length) throw new Error(errors.slice(0, 5).join("\n"));
    }

    /** Returns descendant elements beneath a document or element. */
    elements(parent = this.document) {
        return Array.from(parent.getElementsByTagName("*"));
    }
    /** Returns direct element children, optionally filtered by local name. */
    children(parent, name) {
        return Array.from(parent?.childNodes || []).filter(
            (n) => n.nodeType === 1 && (!name || n.localName === name),
        );
    }
    /** Returns the first direct child with the requested local name. */
    child(parent, name) {
        return this.children(parent, name)[0];
    }
    /** Returns the text of a named child, or an empty string when absent. */
    text(parent, name) {
        return this.child(parent, name)?.textContent || "";
    }
    /** Returns an element identifier, or an empty string for an absent identifier. */
    id(element) {
        return element?.getAttribute("id") || "";
    }
    /** Finds a document element by its XML identifier. */
    byId(id) {
        return this.elements().find((e) => e.getAttribute("id") === id);
    }
    /** Returns initiatives declared directly under the model root. */
    initiatives() {
        return this.children(this.document.documentElement, "initiative");
    }
    /** Returns the active initiative, falling back to the first available initiative. */
    get initiative() {
        return (
            this.initiatives().find((e) => this.id(e) === this.initiativeId) || this.initiatives()[0]
        );
    }
    /** Creates an element in the pathway namespace. */
    create(name) {
        return this.document.createElementNS(PathwayModel.namespace, name);
    }
    /** Returns a named child container, creating it when needed. */
    container(parent, name) {
        return this.child(parent, name) || parent.appendChild(this.create(name));
    }
    /** Generates an identifier that does not collide with an existing document element. */
    uid(prefix) {
        let id;
        do {
            id = prefix + "-" + Math.random().toString(36).slice(2, 10);
        } while (this.byId(id));
        return id;
    }
    /** Updates a named child text field, creating the child when absent. */
    setText(parent, name, value) {
        this.container(parent, name).textContent = value;
    }
    /** Returns the visible pathway blocks belonging to the active initiative. */
    blocks() {
        return this.elements(this.initiative).filter(
            (e) => PathwayModel.blockTypes.includes(e.localName) && e.hasAttribute("id"),
        );
    }
    /** Returns assumption definitions, excluding reference-only elements. */
    assumptions() {
        return this.elements(this.initiative).filter(
            (e) => e.localName === "assumption" && e.hasAttribute("id"),
        );
    }
    /** Returns contribution and resource-support relationships for the active initiative. */
    links() {
        return this.children(this.child(this.initiative, "relationships")).filter((e) =>
            ["contributesTo", "supports"].includes(e.localName),
        );
    }
    /** Finds preconditions whose target is the supplied block. */
    preconditionsFor(target) {
        return this.blocks().filter(
            (e) => e.localName === "precondition" && e.getAttribute("targetRef") === this.id(target),
        );
    }
    /** Chooses a readable block label from its name, description, or identifier. */
    label(e) {
        return (
            e?.getAttribute("name") || this.text(e, "description").trim() || this.id(e) || "Unspecified"
        );
    }
    /** Returns saved canvas coordinates or the default position. */
    position(e) {
        return this.positions[this.id(e)] || { x: 40, y: 60 };
    }
    /** Stores rounded coordinates within the canvas margins. */
    setPosition(e, x, y) {
        this.positions[this.id(e)] = { x: Math.round(Math.max(20, x)), y: Math.round(Math.max(20, y)) };
    }
    /** Estimates block height from label length before DOM measurements are available. */
    estimatedHeight(e) {
        return Math.max(136, 91 + Math.ceil(this.label(e).length / 24) * 19);
    }

    // Rank each block below its downstream targets, then group equal ranks into rows.
    // Row spacing uses estimated heights; inputs follow the lowest activity row.
    // Cycles are retained, but cannot all be represented by strictly upward arrows.
    /** Arranges blocks vertically by contribution rank and places preconditions below the pathway. */
    arrange(onlyMissing = false) {
        const main = this.blocks().filter((e) => e.localName !== "precondition");
        const ranks = new Map(),
            visiting = new Set();
        const minimum = { impact: 0, outcome: 1, output: 2, activity: 3, input: 4 };
        const rank = (e) => {
            if (ranks.has(e)) return ranks.get(e);
            if (e.localName === "impact") return 0;
            // Feedback cycles must not make recursive rank calculation loop indefinitely.
            if (visiting.has(e)) return minimum[e.localName];
            visiting.add(e);
            const targets = this.links()
                .filter((l) => l.getAttribute("from") === this.id(e))
                .map((l) => this.byId(l.getAttribute("to")))
                .filter((t) => main.includes(t) && !visiting.has(t));
            const value = Math.max(minimum[e.localName], ...targets.map((t) => rank(t) + 1));
            visiting.delete(e);
            ranks.set(e, value);
            return value;
        };
        main.forEach((e) => ranks.set(e, rank(e)));
        const activityBottom = Math.max(
            3,
            ...main.filter((e) => e.localName === "activity").map((e) => ranks.get(e)),
        );
        main
            .filter((e) => e.localName === "input")
            .forEach((e) => ranks.set(e, Math.max(ranks.get(e), activityBottom + 1)));
        const rows = new Map();
        for (const e of main) {
            const r = ranks.get(e);
            if (!rows.has(r)) rows.set(r, []);
            rows.get(r).push(e);
        }
        const width = Math.max(1, ...Array.from(rows.values(), (row) => row.length)) * 270;
        let y = 60;
        for (const [, row] of [...rows.entries()].sort((a, b) => a[0] - b[0])) {
            row.forEach((e, i) => {
                if (!onlyMissing || !this.positions[this.id(e)])
                    this.setPosition(e, 35 + (width - row.length * 270) / 2 + i * 270, y);
            });
            y += Math.max(...row.map((e) => this.estimatedHeight(e))) + 160;
        }
        this.blocks()
            .filter((e) => e.localName === "precondition")
            .forEach((e, i) => {
                if (!onlyMissing || !this.positions[this.id(e)])
                    this.setPosition(e, 35 + (i % 5) * 270, y + Math.floor(i / 5) * 250);
            });
    }

    /** Derives the accountability ceiling from the bottom edge of the lowest impact block. */
    ceilingY(height = (e) => this.estimatedHeight(e)) {
        const impacts = this.blocks().filter((e) => e.localName === "impact");
        return impacts.length
            ? Math.max(...impacts.map((e) => this.position(e).y + height(e))) + 58
            : null;
    }

    /** Creates a block in its appropriate initiative container with an unused identifier. */
    addBlock(type) {
        if (!PathwayModel.blockTypes.includes(type)) throw new Error("Unknown block type.");
        const containers = { input: "inputs", activity: "activities", precondition: "preconditions" };
        const e = this.container(this.initiative, containers[type] || "pathway").appendChild(
            this.create(type),
        );
        e.setAttribute("id", this.uid(type));
        if (type === "precondition") this.setText(e, "description", "New precondition");
        else e.setAttribute("name", "New " + type);
        return e;
    }

    /** Creates or reuses a relationship, routing preconditions and inputs to their supported link types. */
    connect(a, b) {
        if (a === b) throw new Error("Choose two different blocks.");
        if (a.localName === "precondition" || b.localName === "precondition") {
            const condition = a.localName === "precondition" ? a : b;
            const target = condition === a ? b : a;
            this.assignPrecondition(condition, target);
            return condition;
        }
        let type = "contributesTo",
            from = a,
            to = b;
        if (a.localName === "input" || b.localName === "input") {
            type = "supports";
            from = a.localName === "input" ? a : b;
            to = from === a ? b : a;
            if (to.localName !== "activity")
                throw new Error("Inputs support activities. Choose an activity as the target.");
        }
        const existing = this.links().find(
            (l) =>
                l.localName === type &&
                l.getAttribute("from") === this.id(from) &&
                l.getAttribute("to") === this.id(to),
        );
        if (existing) return existing;
        const link = this.container(this.initiative, "relationships").appendChild(this.create(type));
        link.setAttribute("id", this.uid(type));
        link.setAttribute("from", this.id(from));
        link.setAttribute("to", this.id(to));
        return link;
    }
    /** Assigns a precondition to a pathway block without silently replacing an existing target. */
    assignPrecondition(condition, target) {
        if (
            condition.localName !== "precondition" ||
            target.localName === "precondition" ||
            !this.blocks().includes(target)
        )
            throw new Error("Attach a precondition to an input, activity, output, outcome or impact.");
        const current = condition.getAttribute("targetRef");
        if (current && current !== this.id(target))
            throw new Error(
                "This precondition already has a target. Change Required for in its inspector to move it.",
            );
        condition.setAttribute("targetRef", this.id(target));
    }
    /** Creates an assumption definition and attaches a reference to the supplied owner. */
    addAssumption(link) {
        const e = this.container(this.initiative, "assumptions").appendChild(this.create("assumption"));
        e.setAttribute("id", this.uid("assumption"));
        this.setText(e, "description", "New assumption");
        this.attachAssumption(link, e);
        return e;
    }
    /** Attaches an assumption reference unless that attachment already exists. */
    attachAssumption(owner, assumption) {
        if (
            this.children(owner, "assumption").some((r) => r.getAttribute("ref") === this.id(assumption))
        )
            return;
        const ref = owner.appendChild(this.create("assumption"));
        ref.setAttribute("ref", this.id(assumption));
    }
    /** Creates an indicator with editable monitoring and expected-change fields. */
    addIndicator(owner) {
        const e = owner.appendChild(this.create("indicator"));
        e.setAttribute("id", this.uid("indicator"));
        e.setAttribute("name", "New indicator");
        for (const name of [
            "definition",
            "dataSource",
            "owner",
            "calculation",
            "unit",
            "collectionSchedule",
        ])
            e.appendChild(this.create(name));
        const change = e.appendChild(this.create("change"));
        for (const name of ["population", "coverage", "magnitude", "deadline"])
            change.appendChild(this.create(name));
        return e;
    }

    // Removing an element must not leave references to identifiers that no longer exist.
    /** Removes an element, its incident links, and references to deleted identifiers. */
    remove(e) {
        const ids = new Set([e, ...this.elements(e)].map((n) => this.id(n)).filter(Boolean));
        const removedLinks = this.links().filter(
            (l) => ids.has(l.getAttribute("from")) || ids.has(l.getAttribute("to")),
        );
        for (const link of removedLinks)
            for (const n of [link, ...this.elements(link)]) if (this.id(n)) ids.add(this.id(n));
        for (const link of removedLinks) link.parentNode.removeChild(link);
        for (const n of this.elements()) {
            for (const name of ["ref", "sourceRef", "targetRef", "relationRef"]) {
                if (!ids.has(n.getAttribute(name))) continue;
                if (name === "targetRef") n.removeAttribute(name);
                else if (n.parentNode) n.parentNode.removeChild(n);
            }
        }
        if (e.parentNode) e.parentNode.removeChild(e);
        for (const id of ids) delete this.positions[id];
    }
    /** Checks identifier uniqueness, reference resolution, and relationship endpoints. */
    validate() {
        const errors = [],
            ids = new Set();
        if (!this.initiatives().length) errors.push("The model needs at least one initiative.");
        for (const e of this.elements())
            if (e.hasAttribute("id")) {
                const id = this.id(e);
                if (!id || ids.has(id)) errors.push("Empty or duplicate ID: " + id);
                ids.add(id);
            }
        for (const e of this.elements()) {
            for (const key of ["ref", "from", "to", "targetRef", "sourceRef", "relationRef"]) {
                if (e.hasAttribute(key) && !ids.has(e.getAttribute(key)))
                    errors.push("Unresolved " + key + ": " + e.getAttribute(key));
            }
            if (
                ["contributesTo", "supports"].includes(e.localName) &&
                (!e.getAttribute("from") || !e.getAttribute("to"))
            )
                errors.push("Relationship needs from and to: " + this.id(e));
        }
        return errors;
    }
    /** Combines structural errors with authoring reminders about incomplete monitoring details. */
    review() {
        const issues = this.validate();
        for (const e of this.blocks()) {
            if (e.localName === "precondition" && !e.getAttribute("targetRef"))
                issues.push("Precondition has no target: " + this.label(e));
            if (
                e.localName === "input" &&
                !this.links().some((l) => l.getAttribute("from") === this.id(e))
            )
                issues.push("Input is not linked to an activity: " + this.label(e));
        }
        for (const link of this.links())
            if (!this.text(link, "rationale").trim()) issues.push("Missing rationale: " + this.id(link));
        for (const ind of this.elements(this.initiative).filter((e) => e.localName === "indicator")) {
            for (const field of ["population", "coverage", "magnitude", "deadline"])
                if (!this.text(this.child(ind, "change"), field).trim())
                    issues.push(this.label(ind) + ": change " + field + " is unspecified.");
        }
        return issues;
    }
    /** Serializes a cloned document, optionally including canvas coordinates as a processing instruction. */
    serialize(includeLayout = true) {
        // Export must not add or remove layout instructions in the live editable document.
        const copy = this.document.cloneNode(true);
        for (const node of Array.from(copy.childNodes))
            if (node.nodeType === 7 && node.target === "pathway-studio") copy.removeChild(node);
        if (includeLayout)
            copy.insertBefore(
                copy.createProcessingInstruction(
                    "pathway-studio",
                    encodeURIComponent(JSON.stringify({ positions: this.positions })),
                ),
                copy.documentElement,
            );
        let xml = new XMLSerializer().serializeToString(copy);
        if (!xml.startsWith("<?xml")) xml = '<?xml version="1.0" encoding="UTF-8"?>\n' + xml;
        return xml;
    }
}
globalThis.PathwayModel = PathwayModel;
