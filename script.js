// CONFIGURATION : Intégration directe de votre clé API Groq
const GROQ_API_KEY = "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";

let extText = "", imgBase64 = "", fType = "";
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cloudflare.com';

// Gestion de la sélection et extraction locale des documents
async function handleFileSelect(e) {
    const file = e.target.files[0]; if (!file) return;
    fType = file.type; extText = ""; imgBase64 = "";
    document.getElementById('fileInfo').innerText = `📄 ${file.name}`;
    document.getElementById('filePreview').classList.remove('hidden');

    if (fType.includes('image/')) {
        const r = new FileReader(); r.onload = x => imgBase64 = x.target.result; r.readAsDataURL(file);
    } else if (fType === 'application/pdf') {
        const pdf = await pdfjsLib.getDocument(new Uint8Array(await file.arrayBuffer())).promise;
        for (let i = 1; i <= pdf.numPages; i++) extText += (await (await pdf.getPage(i)).getTextContent()).items.map(m => m.str).join(" ") + "\n";
    } else if (fType.includes('sheet') || fType.includes('excel')) {
        const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), {type: 'array'});
        wb.SheetNames.forEach(n => extText += `[${n}]\n` + XLSX.utils.sheet_to_csv(wb.Sheets[n]) + "\n");
    } else {
        extText = await file.text();
    }
}

function clearFile() {
    document.getElementById('fileInput').value = ""; document.getElementById('filePreview').classList.add('hidden');
    extText = ""; imgBase64 = ""; fType = "";
}

function addMsg(sender, text) {
    const w = document.getElementById('chatWindow'), d = document.createElement('div');
    d.className = `msg ${sender}`; d.innerText = text; w.appendChild(d); w.scrollTop = w.scrollHeight;
    return d;
}

// Envoi de la requête au modèle Groq approprié
async function sendMessage() {
    const input = document.getElementById('userInput'), txt = input.value.trim();
    if (!GROQ_API_KEY || GROQ_API_KEY.includes("VOTRE_CLE")) return alert("Veuillez configurer votre clé API dans script.js");
    if (!txt && !imgBase64 && !extText) return;

    addMsg('user', txt + (fType ? " (Fichier joint)" : "")); input.value = "";
    
    let body = { 
        model: imgBase64 ? "llama-3.2-11b-vision-preview" : "llama-3.2-11b-vision-preview", 
        temperature: 0.2, 
        messages: [] 
    };
    
    if (imgBase64) {
        body.messages.push({ role: "user", content: [{ type: "text", text: txt || "Analyse l'image" }, { type: "image_url", image_url: { url: imgBase64 } }] });
    } else {
        body.messages.push({ role: "user", content: extText ? `Contenu du document :\n${extText}\n\nQuestion : ${txt}` : txt });
    }

    const status = addMsg('bot', "En train de réfléchir...");
    try {
        // Utilisation d'un proxy CORS pour autoriser l'appel direct depuis le navigateur
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST", 
            headers: { "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" }, 
            body: JSON.stringify(body)
        });
        const data = await res.json();
        status.innerText = data.choices[0].message.content;
    } catch (err) { 
        status.innerText = "Erreur : Impossible de joindre l'API Groq."; 
    }
}

// Gestion du raccourci clavier Touche Entrée
document.getElementById('userInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});
