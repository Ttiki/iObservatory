/** Reusable DOM controls, reference selectors and inspector navigation */
"use strict";

/** Creates an action button with a text label */
function button(text, action){
    const e= document.createElement("button");
    e.textContent = text;
    e.onclick = action;
    return e;
}

/*Create a help paragraph using text content. */
function paragraph(text){
    return Object.assign(document.createElement("p"), {textContent: text, className: "help"});
}

/** Creates an initially expanded inspector section*/
function details(title){
    const e = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = title;
    e.append(summary);
    e.open=true;
    return e;
}

/** Creates a labelled text field whose edits participat in model undo*/
function field(title, value, update, multiline = false){
    const wrap = document.createElement("div"),
        label = document.createElement("label"),
        input = document.createElement(multiline ? "textarea" : "input");
    label.textContent = title;
    label.htmlFor = input.id = "field-" + Math.random().toString(36).slice(2);
    input.value = value || "";
    input.onchange = () => change (() => update(input.value));
    wrap.append(label, input);
    return wrap;
}
/** Creates an editor for an XML attribute, removoing the attribute when cleared.*/
function attributeField(e, key, title){
    return field(title, e.getAttribute(key), (value) =>
    value ? e.setAttribute(key,value) : e.removeAttribute(key),
        );
}

/** Creates a multiline editor for a named child text field. */
function textField(e, key, title) {
    return field(title, model.text(e, key), (value) => model.setText(e, key, value), true);
}

/** creates a labelled selection field and rebuilds th inspectror after changes.*/
function picker(title, value, options, update) {
    const wrap = document.createElement("div"),
        label = document.createElement("label"),
        select = document.createElement("select");
    label.textContent = title;
    label.htmlFor = select.id = "field-" + Math.random().toString(36).slice(2);
    for (const [id, text] of options) {
        const option = document.createElement("option");
        option.value = id;
        option.textContent = text;
        select.append(option);
    }
    select.value = value || "";
    select.onchange = () => change(() => update(select.value), true);
    wrap.append(label, select);
    return wrap;
}

/** Creates a reference selector while retaining an existing valye outside the candidate list.
 */

function refField(e, key ,title, candidates){
    const node = model.child(e,key),
        existing = node?.getAttribute("ref") || "";
    const options = [["", "Unspecified"], ...candidates.map((c) => [model.id(c), model.label(c)])];
    if(existing && !options.some(([id]) => id === existing)) options.push([existing, existing]);
    return picker(title, existing, options, (value) => {
        const ref = model.container(e, key);
        if (value) ref.setAttribute("ref", value);
        else ref.removeAttribute("ref");
    });
}

/** Selects a referenced model element and refreshes the canvas and inspector*/
function navigate(e) {
    selection = e;
    render();
    inspect();
}

/**Creates a navigable reference row with an optional detatch action /*
 */
function linkRow(label, target, unlink){
    const row = document.createElement("div");
    row.className = "reference-row";
    row.append(button(label, () => navigate(target)));
    if (unlink) row.append(button("Detatch", unlink));
    return row;
}