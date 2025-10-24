const DATA_URL = "data/open_coesione.csv";

function parseNumber(val) {
    if (val === null || val === undefined || val === '') {
        return 0;
    }
    let s = String(val).trim();

    s = s.replace(/€/g, "").replace(/ /g, "");

    if (s.includes(",") && s.includes(".")) {
        s = s.replace(/\./g, "").replace(/,/g, ".");
    } else {
        s = s.replace(/,/g, ".");
    }

    const num = parseFloat(s);
    return isNaN(num) ? 0 : num;
}

function extractYear(dateStr) {
    if (!dateStr) {
        return null;
    }
    const s = String(dateStr);

    if (s.length >= 10 && s[4] === "-") {
        return parseInt(s.substring(0, 4), 10);
    }

    if (s.includes("/")) {
        const parts = s.split("/");
        const lastPart = parts[parts.length - 1];
        if (lastPart.length === 4) {
            return parseInt(lastPart, 10);
        }
    }

    const match = s.match(/(19|20)\d{2}/);
    return match ? parseInt(match[0], 10) : null;
}

async function createChart() {
    try {
        const response = await fetch(DATA_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();

        const rows = csvText.trim().split('\n');

        // REVERTING TO COMMA SPLIT for the header
        const header = rows[0].split(',');

        const data = rows.slice(1).map(row => {
            // REVERTING TO COMMA SPLIT for data rows
            const values = row.split(',');
            const obj = {};

            header.forEach((key, i) => {
                // IMPORTANT: TRIM keys and values, and remove surrounding quotes
                const cleanKey = key.trim().replace(/^"|"$/g, '');
                const cleanValue = values[i] ? values[i].trim().replace(/^"|"$/g, '') : null;
                obj[cleanKey] = cleanValue;
            });
            return obj;
        });

        const COL_FINANZ_PUBBLICO = "FINANZ_TOTALE_PUBBLICO";
        const COL_FINANZ_ESTERO = "FINANZ_STATO_ESTERO";
        const COL_FINANZ_PRIVATO = "FINANZ_PRIVATO";
        const COL_DATA_INIZIO = "OC_DATA_INIZIO_PROGETTO";

        const processedData = data.map(row => {
            const rowData = {
                year: extractYear(row[COL_DATA_INIZIO]),
                pubblico: parseNumber(row[COL_FINANZ_PUBBLICO]),
                estero: parseNumber(row[COL_FINANZ_ESTERO]),
                privato: parseNumber(row[COL_FINANZ_PRIVATO]),
            };
            return rowData;
        });

        const aggMap = new Map();
        processedData.forEach(row => {
            const year = row.year;
            if (year !== null) {
                if (!aggMap.has(year)) {
                    aggMap.set(year, { year, pubblico: 0, estero: 0, privato: 0 });
                }
                const aggRow = aggMap.get(year);
                aggRow.pubblico += row.pubblico;
                aggRow.estero += row.estero;
                aggRow.privato += row.privato;
            }
        });

        let agg = Array.from(aggMap.values());

        agg = agg
            .map(row => ({
                year: row.year,
                pubblico: row.pubblico / 1e6,
                estero: row.estero / 1e6,
                privato: row.privato / 1e6,
            }))
            .filter(row =>
                row.year >= 1997 && row.year !== 2025 &&
                (row.pubblico > 0 || row.estero > 0 || row.privato > 0)
            )
            .sort((a, b) => a.year - b.year);

        const years = agg.map(row => row.year);
        const pubblico = agg.map(row => row.pubblico);
        const estero = agg.map(row => row.estero);
        const privato = agg.map(row => row.privato);

        const traces = [
            {
                x: years, y: pubblico,
                name: "Pubblico", type: "bar",
                marker: { color: "#1976d2" },
                hovertemplate: "<b>%{x}</b><br>Pubblico: €%{y:.2f} M<extra></extra>",
            },
            {
                x: years, y: estero,
                name: "Estero", type: "bar",
                marker: { color: "#43a047" },
                hovertemplate: "<b>%{x}</b><br>Estero: €%{y:.2f} M<extra></extra>",
            },
            {
                x: years, y: privato,
                name: "Privato", type: "bar",
                marker: { color: "#ff7043" },
                hovertemplate: "<b>%{x}</b><br>Privato: €%{y:.2f} M<extra></extra>",
            },
        ];

        const layout = {
            barmode: "stack",
            xaxis: {
                title: "Start Year",
                tickmode: "linear",
                dtick: 1,
                tickangle: -90
            },
            yaxis: {
                title: "Funding (Million €)"
            },
            margin: { t: 40, l: 80, r: 30, b: 100 },
            height: 600,
            width: 950
        };

        Plotly.newPlot("chart3", traces, layout);

    } catch (error) {
        console.error("Error creating the chart:", error);
        document.getElementById("chart3").innerHTML = `Error loading or processing data: ${error.message}`;
    }
}

createChart();