// chart2.js
// Plotly chart: Top 5 Regions + Others (Yearly Visitor Distribution)

const csvPath = "data/mic_visitors.csv";
const yearsToShow = [2016, 2017, 2018, 2019, 2022];

function parseNumber(str) {
    if (!str) return 0;
    return parseFloat(str.toString().replace(/\./g, '')) || 0;
}

function createVisitorChart(containerId = "chart2") {
    Papa.parse(csvPath, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
            let df = results.data;

            if (!df || df.length === 0) {
                console.error("❌ CSV is empty or could not be parsed.");
                return;
            }

            // --- Log header names so we can inspect the structure ---
            console.log("✅ CSV columns detected:", Object.keys(df[0]));

            // --- Dynamically find the first column ---
            const firstCol = Object.keys(df[0])[0];
            console.log("📄 Using first column:", firstCol);

            // --- Filter only rows containing 'Totale_regione' (flexible regex) ---
            df = df.filter(row => {
                const cell = row[firstCol];
                return cell && /totale.?regione/i.test(cell); // matches Totale_regione or Totale regione
            });

            if (df.length === 0) {
                console.error("❌ No rows found containing 'Totale_regione' (case-insensitive).");
                return;
            }

            // --- Extract year (flexible match for 4 digits at end) ---
            df.forEach(row => {
                const match = row[firstCol].match(/(\d{4})/);
                row.Year = match ? parseInt(match[1]) : null;
            });

            df = df.filter(row => yearsToShow.includes(row.Year));
            if (df.length === 0) {
                console.error("❌ No matching years found in CSV:", yearsToShow);
                return;
            }

            // --- Define region columns dynamically ---
            const columns = Object.keys(df[0]);
            const regionCols = columns.filter(
                c => c !== firstCol && c !== "Totale complessivo" && c !== "Year"
            );

            // --- Convert numbers ---
            df.forEach(row => {
                regionCols.concat(["Totale complessivo"]).forEach(col => {
                    row[col] = parseNumber(row[col]);
                });
            });

            // --- Convert to percentages ---
            const percentData = df.map(row => {
                let newRow = { Year: row.Year };
                regionCols.forEach(col => {
                    newRow[col] = (row[col] / row["Totale complessivo"]) * 100;
                });
                return newRow;
            });

            // --- Build Top 5 + Other Regions ---
            const stackedData = percentData.map(row => {
                const year = row.Year;
                const sorted = Object.entries(row)
                    .filter(([k]) => k !== "Year")
                    .sort((a, b) => b[1] - a[1]);
                const top5 = sorted.slice(0, 5);
                const others = sorted.slice(5).reduce((sum, [, val]) => sum + val, 0);

                let combined = {};
                top5.forEach(([region, val]) => (combined[region] = val));
                combined["Other Regions"] = others;
                combined["Year"] = year;
                return combined;
            });

            // --- Gather region names ---
            let allRegions = new Set();
            stackedData.forEach(r =>
                Object.keys(r).forEach(k => {
                    if (k !== "Year") allRegions.add(k);
                })
            );
            allRegions = Array.from(allRegions);

            // --- Colors ---
            const blueShades = ["#08306B", "#08519C", "#2171B5", "#4292C6", "#6BAED6"];
            const colorMap = {};
            allRegions.forEach((r, i) => {
                colorMap[r] = r === "Other Regions" ? "#A0A0A0" : blueShades[i % blueShades.length];
            });

            // --- Plotly Traces ---
            const traces = allRegions.map(region => ({
                name: region,
                type: "bar",
                orientation: "h",
                y: stackedData.map(d => d.Year),
                x: stackedData.map(d => d[region] || 0),
                marker: { color: colorMap[region] },
                text: stackedData.map(d => (d[region] ? d[region].toFixed(1) + "%" : "")),
                textposition: "inside",
            }));

            const layout = {
                title: "Top 5 Regions + Others: Yearly Visitor Distribution (2016–2019, 2022)",
                barmode: "stack",
                xaxis: { title: "Percentage of Total Visitors" },
                yaxis: {
                    title: "Year",
                    type: "category",
                    tickvals: yearsToShow.map(String),
                },
                legend: { title: { text: "Regions" } },
                template: "plotly_white",
                bargap: 0.15,

            };

            Plotly.newPlot('chart2', traces, layout, { responsive: true }).then(() => {
                const svgContainer = document.querySelector('#chart2 .svg-container');
                if (svgContainer) {
                    svgContainer.style.removeProperty('height');
                    svgContainer.style.removeProperty('width');
                }
            });

        },
    });
}

// Auto-run
window.addEventListener("load", () => createVisitorChart("chart2"));
