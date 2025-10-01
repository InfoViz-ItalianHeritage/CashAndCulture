function parseNumber(value) {
    if (!value) return 0;
    let s = String(value).trim();
    s = s.replace(/\s+/g, '').replace(/€/g, '');
    if (s.indexOf(',') > -1 && s.indexOf('.') > -1) {
        s = s.replace(/\./g, '').replace(',', '.');
    } else {
        s = s.replace(',', '.');
    }
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
}

function extractYear(dateStr) {
    if (!dateStr) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return +dateStr.slice(0, 4);
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return +dateStr.slice(-4);
    const match = dateStr.match(/(19|20)\d{2}/);
    return match ? +match[0] : null;
}

d3.csv("data/OpenCoesione.csv").then(data => {
    const sums = d3.rollups(
        data,
        v => {
            return {
                pubblico: d3.sum(v, d => parseNumber(d["FINANZ_TOTALE_PUBBLICO"])),
                estero: d3.sum(v, d => parseNumber(d["FINANZ_STATO_ESTERO"])),
                privato: d3.sum(v, d => parseNumber(d["FINANZ_PRIVATO"]))
            };
        },
        d => extractYear(d["OC_DATA_INIZIO_PROGETTO"])
    );

    let dataset = sums
        .map(([year, values]) => ({
            year,
            pubblico: values.pubblico / 1e6,
            estero: values.estero / 1e6,
            privato: values.privato / 1e6
        }))
        .filter(d =>
            d.year &&
            d.year >= 1997 &&
            d.year !== 2025 &&
            (d.pubblico > 0 || d.estero > 0 || d.privato > 0)
        );

    dataset.sort((a, b) => a.year - b.year);

    if (!dataset.length) {
        document.getElementById("chart").innerHTML = "<p style='color:red'>No valid data found.</p>";
        return;
    }

    const tracePubblico = {
        x: dataset.map(d => d.year),
        y: dataset.map(d => d.pubblico),
        name: "Pubblico",
        type: "bar",
        marker: { color: "#1976d2" },
        hovertemplate: "<b>%{x}</b><br>Pubblico: €%{y:.2f} M<extra></extra>"
    };

    const traceEstero = {
        x: dataset.map(d => d.year),
        y: dataset.map(d => d.estero),
        name: "Estero",
        type: "bar",
        marker: { color: "#43a047" },
        hovertemplate: "<b>%{x}</b><br>Estero: €%{y:.2f} M<extra></extra>"
    };

    const tracePrivato = {
        x: dataset.map(d => d.year),
        y: dataset.map(d => d.privato),
        name: "Privato",
        type: "bar",
        marker: { color: "#ff7043" },
        hovertemplate: "<b>%{x}</b><br>Privato: €%{y:.2f} M<extra></extra>"
    };

    const layout = {
        barmode: "stack",
        xaxis: {
            title: "Start Year",
            tickmode: "linear",
            dtick: 1,
            tickangle: -90   // 🔴 vertical years
        },
        yaxis: { title: "Funding (Million €)" },
        margin: { t: 40, l: 80, r: 30, b: 100 } // extra bottom space for vertical labels
    };

    Plotly.newPlot("chart", [tracePubblico, traceEstero, tracePrivato], layout, { responsive: true });
}); function parseNumber(value) {
    if (!value) return 0;
    let s = String(value).trim();
    s = s.replace(/\s+/g, '').replace(/€/g, '');
    if (s.indexOf(',') > -1 && s.indexOf('.') > -1) {
        s = s.replace(/\./g, '').replace(',', '.');
    } else {
        s = s.replace(',', '.');
    }
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
}

function extractYear(dateStr) {
    if (!dateStr) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return +dateStr.slice(0, 4);
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return +dateStr.slice(-4);
    const match = dateStr.match(/(19|20)\d{2}/);
    return match ? +match[0] : null;
}

d3.csv("OpenCoesione.csv").then(data => {
    const sums = d3.rollups(
        data,
        v => {
            return {
                pubblico: d3.sum(v, d => parseNumber(d["FINANZ_TOTALE_PUBBLICO"])),
                estero: d3.sum(v, d => parseNumber(d["FINANZ_STATO_ESTERO"])),
                privato: d3.sum(v, d => parseNumber(d["FINANZ_PRIVATO"]))
            };
        },
        d => extractYear(d["OC_DATA_INIZIO_PROGETTO"])
    );

    let dataset = sums
        .map(([year, values]) => ({
            year,
            pubblico: values.pubblico / 1e6,
            estero: values.estero / 1e6,
            privato: values.privato / 1e6
        }))
        .filter(d =>
            d.year &&
            d.year >= 1997 &&
            d.year !== 2025 &&
            (d.pubblico > 0 || d.estero > 0 || d.privato > 0)
        );

    dataset.sort((a, b) => a.year - b.year);

    if (!dataset.length) {
        document.getElementById("chart").innerHTML = "<p style='color:red'>No valid data found.</p>";
        return;
    }

    const tracePubblico = {
        x: dataset.map(d => d.year),
        y: dataset.map(d => d.pubblico),
        name: "Pubblico",
        type: "bar",
        marker: { color: "#1976d2" },
        hovertemplate: "<b>%{x}</b><br>Pubblico: €%{y:.2f} M<extra></extra>"
    };

    const traceEstero = {
        x: dataset.map(d => d.year),
        y: dataset.map(d => d.estero),
        name: "Estero",
        type: "bar",
        marker: { color: "#43a047" },
        hovertemplate: "<b>%{x}</b><br>Estero: €%{y:.2f} M<extra></extra>"
    };

    const tracePrivato = {
        x: dataset.map(d => d.year),
        y: dataset.map(d => d.privato),
        name: "Privato",
        type: "bar",
        marker: { color: "#ff7043" },
        hovertemplate: "<b>%{x}</b><br>Privato: €%{y:.2f} M<extra></extra>"
    };

    const layout = {
        barmode: "stack",
        xaxis: {
            title: "Start Year",
            tickmode: "linear",
            dtick: 1,
            tickangle: -90   // 🔴 vertical years
        },
        yaxis: { title: "Funding (Million €)" },
        margin: { t: 40, l: 80, r: 30, b: 100 } // extra bottom space for vertical labels
    };

    Plotly.newPlot("chart", [tracePubblico, traceEstero, tracePrivato], layout, { responsive: true });
});