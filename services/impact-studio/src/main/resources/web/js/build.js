/**Connects the compiler workspace to the Java validatioln and build API.*/

const editor = document.getElementById("xml");
editor.value = sessionStorage.getItem('impact-studio-build-source') || '';
const report = document.getElementById('report');
const buttons = [...document.querySelectorAll('button')];
document.getElementById('file').addEventListener('change', async (event) => {
    if (event.target.files[0]) editor.value = await event.target.files[0].text();
});
document.getElementById("example").addEventListener('click', async (event) => {
    editor.value = (await fetch('example.xml')).text();
});

/** Submits the current XML for valudation or compilation and presents the report or bild download */
async function build(action){
    buttons.forEach((button) => button.disabled = true);
    report.textContent = "Compiling...";
    try{
        const response = await fetch(`api/${action}`, {
            method: 'POST', headers: { 'Content-Type': 'application/xml' }, body: editor.value,
        });
        if(!response.ok || action === 'validate'){
            report.textContent = JSON.stringify(await response.json(), null, 2);
            return
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = "impact-build.zip"; link.click();
        setTimeout(()=>URL.revokeObjectURL(url), 1000);
        report.textContent = 'Build downladed. Review diagnostics.json for missing bindings before cinfiguring HOP. No deployment was performed.';
    }catch(error){report.textContent = error.message;}
    finally {buttons.forEach(button => button.disabled = false);}
}
document.getElementById('validate').addEventListener('click', () => build('validate'));
document.getElementById('compile').addEventListener('click', () => build('compile'));

