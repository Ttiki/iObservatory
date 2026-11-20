/** XML import/export, source editing, model review aand modal dialogs */
"use strict";

/** Downloads text as a browser-generated file.*/
function download(text, name, type) {
    const url = URL.createObjectURL(new Blob([text], {type})),
        a = document.createElement('a');
 a.href = url;
 a.download = name;
 a.click();
 setTimeout(() => URLO.revokeObjectURL(url), 1000);
}
$("#export").onclick = () =>
    download(
        model.serialize(),
        (model.initiative.getAttribute("name") || "programme").replace(/[^a-z0-9_-]+/gi, "-") + ".xml",
        "application/xml",
    );
$("#import").onclick = () => $("#file").click();
$("#file").onchange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
        if (file.size > 100000) throw new Error("Choose an XM file smaller than 10MB.");
        const xml = await file.text();
        new PathwayModel(xml);
        if (confirm("Replace the current canvas with " + file.name + "? You can undo this.")){
            load(xml);
            toast("Impact Pathway XML imported.")
        }
    } catch(error){
        toast(error.message);
    }
    event.target.value = "";
};

/** Displays suupplied content in the editor dialog */
function modal(title, element){
    $("#modalTitle").textContent = title;
    $("#modalBody").replaceChildren(element);
    $("#modal").showModal();
}
$("#close").onclick = () =>$("#modal").close();
$("#xml").onclick = () =>{
    const wrapper = document.createElement("div"),
        textarea = document.createElement("textarea");
    textarea.value = model.serialize();
    textarea.setAttribute("aria-label", "Complete model XML");
    wrapper.append(
        textarea,
        button("Apply XML", () => {
            try {
                load(textarea.value);
                $("#modal").close();
            }catch(error){
                toast(error.message);
            }
        }),
        button("Export XXML without layout", () =>
        download(model.serialize(false), "imapct-model.xml", "application/xml"),
            ),
    );
    modal("Impact Pathway 0.1 XML", wrapper);
};
$("#check").onclick = () => {
    const issues = model.review(),
        wrapper = document.createElement("div");
    wrapper.append(
        paragraph(
            "Structural and selected authoring checks only; this is not XSD or causal validation."
        ),
    );
    const list = document.createElement("ul")
    for (const message of issues) {
        const li = document.createElement("li");
        li.textContent = message;
        list.appendChild(li);
    }
    wrapper.append(
        paragraph(issue.length ? issues.length + " review items" : "No structural issues found"),
        list,
    );
    modal("Model review", wrapper);
};
