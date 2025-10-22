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

d3.csv("data/open_coesione.csv").then(data => {
    const sums = d3.rollups(
        data,
        v => {
            return {
                // 🎯 CHANGE 1: Only aggregate 'pubblico'
                pubblico: d3.sum(v, d => parseNumber(d["FINANZ_TOTALE_PUBBLICO"])),
            };
        },
        d => extractYear(d["OC_DATA_INIZIO_PROGETTO"])
    );

    const targetYears = [2016, 2017, 2018, 2019, 2022];

    let dataset = sums
        .map(([year, values]) => ({
            year,
            // 🎯 CHANGE 2: Only include 'pubblico' in the mapped object
            pubblico: values.pubblico / 1e6,
        }))
        .filter(d =>
            d.year &&
            targetYears.includes(d.year) &&
            // Filter out years with zero public funding
            d.pubblico > 0
        );

    dataset.sort((a, b) => a.year - b.year);

    if (!dataset.length) {
        document.getElementById("chart").innerHTML = "<p style='color:red'>No valid data found for selected years.</p>";
        return;
    }

    const tracePubblico = {
        x: dataset.map(d => d.year),
        y: dataset.map(d => d.pubblico),
        name: "Finanziamento Pubblico", // Updated name for clarity
        type: "bar",
        marker: { color: "#1976d2" },
        hovertemplate: "<b>%{x}</b><br>Pubblico: €%{y:.2f} M<extra></extra>"
    };



    const desiredYears = dataset.map(d => d.year);

    const layout = {
        // No need for barmode: "stack" since there's only one trace
        title: "Fig.1.2: Total Funding Per Year",
        xaxis: {
            title: "Year",
            type: 'category',
            tickmode: "array",
            tickvals: desiredYears,
            tickangle: -90
        },
        yaxis: { title: "Funding (Million €)" },
        margin: { t: 40, l: 80, r: 30, b: 100 }
    };


    Plotly.newPlot("chart", [tracePubblico], layout, { responsive: true });
});