// project_timeliness.js
// Requires: plotly-2.x.x.min.js, papaparse.min.js

// --- Load and process the CSV file ---
async function loadAndProcessData(csvPath) {
    console.log("📂 Loading CSV:", csvPath);

    const response = await fetch(csvPath);
    const csvText = await response.text();

    const allProjects = Papa.parse(csvText, { header: true, skipEmptyLines: true }).data;
    console.log("✅ Loaded rows:", allProjects.length);

    // --- Convert date columns ---
    const dateColumns = [
        "DATA_INIZIO_PREV_STUDIO_FATT",
        "OC_DATA_INIZIO_PROGETTO",
        "OC_DATA_FINE_PROGETTO_EFFETTIVA"
    ];

    allProjects.forEach(row => {
        dateColumns.forEach(col => {
            if (row[col]) {
                const date = new Date(row[col]);
                row[col] = isNaN(date) ? null : date;
            } else {
                row[col] = null;
            }
        });
    });

    // --- Filter between 2014–2024 ---
    const timeSection = allProjects.filter(row => {
        const start = row["OC_DATA_INIZIO_PROGETTO"];
        return start && start.getFullYear() >= 2014 && start.getFullYear() <= 2024;
    });
    console.log("✅ Filtered rows:", timeSection.length);

    // --- Normalize region names ---
    function normalizeRegionName(name) {
        if (typeof name !== "string") return "";
        let normalized = name.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (normalized.includes("trentino") || normalized.includes("bolzano") || normalized.includes("altoadige"))
            return "trentinoaltoadige";
        if (normalized.includes("friuli")) return "friuliveneziagiulia";
        if (normalized.includes("valledaosta") || normalized.includes("aoste")) return "valledaosta";
        if (normalized.includes("emiliaromagna")) return "emiliaromagna";
        if (normalized.includes("lombardia")) return "lombardia";
        if (normalized.includes("piemonte")) return "piemonte";
        if (normalized.includes("veneto")) return "veneto";
        if (normalized.includes("liguria")) return "liguria";
        if (normalized.includes("toscana")) return "toscana";
        if (normalized.includes("umbria")) return "umbria";
        if (normalized.includes("marche")) return "marche";
        if (normalized.includes("lazio")) return "lazio";
        if (normalized.includes("abruzzo")) return "abruzzo";
        if (normalized.includes("molise")) return "molise";
        if (normalized.includes("campania")) return "campania";
        if (normalized.includes("puglia")) return "puglia";
        if (normalized.includes("basilicata")) return "basilicata";
        if (normalized.includes("calabria")) return "calabria";
        if (normalized.includes("sicilia")) return "sicilia";
        if (normalized.includes("sardegna")) return "sardegna";
        return normalized;
    }

    const regionNameMap = {
        "piemonte": "Piemonte",
        "valledaosta": "Valle d’Aosta",
        "lombardia": "Lombardia",
        "trentinoaltoadige": "Trentino-Alto Adige",
        "veneto": "Veneto",
        "friuliveneziagiulia": "Friuli-Venezia Giulia",
        "liguria": "Liguria",
        "emiliaromagna": "Emilia-Romagna",
        "toscana": "Toscana",
        "umbria": "Umbria",
        "marche": "Marche",
        "lazio": "Lazio",
        "abruzzo": "Abruzzo",
        "molise": "Molise",
        "campania": "Campania",
        "puglia": "Puglia",
        "basilicata": "Basilicata",
        "calabria": "Calabria",
        "sicilia": "Sicilia",
        "sardegna": "Sardegna"
    };

    timeSection.forEach(row => {
        const key = normalizeRegionName(row["DEN_REGIONE"]);
        row["REGION_KEY"] = key;
        row["DEN_REGIONE_CLEAN"] = regionNameMap[key] || key;
    });

    // --- Categorize projects by timeliness ---
    const onTime = timeSection.filter(row =>
        row["OC_DATA_INIZIO_PROGETTO"] &&
        row["DATA_INIZIO_PREV_STUDIO_FATT"] &&
        row["OC_DATA_INIZIO_PROGETTO"].getFullYear() === row["DATA_INIZIO_PREV_STUDIO_FATT"].getFullYear()
    );
    const delayed = timeSection.filter(row =>
        row["OC_DATA_INIZIO_PROGETTO"] &&
        row["DATA_INIZIO_PREV_STUDIO_FATT"] &&
        row["OC_DATA_INIZIO_PROGETTO"].getFullYear() > row["DATA_INIZIO_PREV_STUDIO_FATT"].getFullYear()
    );
    const early = timeSection.filter(row =>
        row["OC_DATA_INIZIO_PROGETTO"] &&
        row["DATA_INIZIO_PREV_STUDIO_FATT"] &&
        row["OC_DATA_INIZIO_PROGETTO"].getFullYear() < row["DATA_INIZIO_PREV_STUDIO_FATT"].getFullYear()
    );

    console.log("📊 On Time:", onTime.length);
    console.log("📊 Delayed:", delayed.length);
    console.log("📊 Early:", early.length);

    // --- Pie chart data ---
    const pieData = [onTime.length, delayed.length, early.length];
    const pieLabels = ["On Time", "Delayed", "Early"];
    const total = pieData.reduce((a, b) => a + b, 0);

    const data = [{
        type: "pie",
        labels: pieLabels,
        values: pieData,
        textinfo: "label+percent",
        insidetextorientation: "radial",
        hole: 0.4,
        marker: {
            colors: ["#2A63AD", "#322AAD", "#2AA5AD"]
        }
    }];

    const layout = {
        title: "Fig.10: Projects' Start Timeliness",
        annotations: [
            {
                text: `Total: ${total}`,
                x: 0.5,
                y: 0.5,
                font: { size: 14 },
                showarrow: false
            }
        ],
        legend: {
            x: 1,
            y: 0.5,
            title: { text: "Project start" }
        },
        margin: { l: 20, r: 100, t: 50, b: 20 }
    };

    Plotly.newPlot("piechart", data, layout);
}

// --- Run when page loads ---
document.addEventListener("DOMContentLoaded", () => {
    loadAndProcessData("data/open_coesione.csv");
});
