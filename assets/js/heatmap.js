document.addEventListener("DOMContentLoaded", function () {
    const container = document.querySelector("#heatmap-container");
    if (container) container.innerHTML = '';
    createHeatmap();
});

function createHeatmap() {
    const CONTAINER_ID = "#heatmap-container";
    const SELECTOR_ID = "#view-selector";
    const DATA_PATH = "data/income&funding.csv";
    const GRADIENT_ID = "legend-gradient-centered";

    const margin = { top: 80, right: 150, bottom: 100, left: 150 };

    const sanitizeId = (str) => "t-" + str.replace(/[^a-zA-Z0-9]/g, "");

    d3.csv(DATA_PATH).then(function (data) {

        // ============================================
        // 1. DATA PROCESSING
        // ============================================

        const headers = data.columns;
        const yearsSet = new Set();
        headers.forEach(h => {
            if (h.includes('_')) {
                const part = h.split('_')[1];
                if (!isNaN(parseInt(part))) yearsSet.add(part);
            }
        });
        const years = Array.from(yearsSet).sort();
        const regions = data.map(d => d.Regione).sort();

        const heatmapData = [];
        const regionStats = {};

        let minVal = Infinity;
        let maxVal = -Infinity;

        data.forEach(row => {
            const region = row.Regione;

            if (!regionStats[region]) {
                regionStats[region] = { sum: 0, count: 0 };
            }

            years.forEach(year => {
                const introiti = parseFloat(row[`Introiti_${year}`] || NaN);
                const fondi = parseFloat(row[`Fondi_${year}`] || NaN);

                let returnVal = NaN;
                if (!isNaN(introiti) && !isNaN(fondi)) {
                    returnVal = introiti - fondi;
                    if (returnVal < minVal) minVal = returnVal;
                    if (returnVal > maxVal) maxVal = returnVal;

                    regionStats[region].sum += returnVal;
                    regionStats[region].count += 1;
                }
                heatmapData.push({ region: region, year: year, value: returnVal });
            });
        });

        // Compute averages
        Object.keys(regionStats).forEach(r => {
            const s = regionStats[r];
            s.average = s.count > 0 ? s.sum / s.count : NaN;
        });

        if (!isFinite(minVal)) minVal = 0;
        if (!isFinite(maxVal)) maxVal = 0;
        if (minVal > 0) minVal = 0;
        if (maxVal < 0) maxVal = 0;

        // ============================================
        // 2. POPULATE DROPDOWN (SIMPLIFIED)
        // ============================================
        const dropdown = d3.select(SELECTOR_ID);
        dropdown.selectAll("option").remove(); // Clear all

        // Option 1: Default view
        dropdown.append("option")
            .attr("value", "ALL")
            .text("Show Full Heatmap (Yearly)");

        // Option 2: Average view
        dropdown.append("option")
            .attr("value", "AVG_SUMMARY")
            .text("Show Average per Region (All Years)");

        // ============================================
        // 3. RENDER FUNCTION
        // ============================================

        function renderChart(selectedView) {
            const containerEl = document.querySelector(CONTAINER_ID);
            containerEl.innerHTML = '';

            const width = Math.max(900, containerEl.clientWidth - margin.left - margin.right);
            const height = 700 - margin.top - margin.bottom;

            const svg = d3.select(CONTAINER_ID)
                .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            // --- Common Elements (Color Scale & Legend) ---
            const colorScale = d3.scaleLinear()
                .domain([minVal, 0, maxVal])
                .range(["#d73027", "#f7f7f7", "#4575b4"])
                .clamp(true);

            const defs = svg.append("defs");
            const linearGradient = defs.append("linearGradient")
                .attr("id", GRADIENT_ID)
                .attr("x1", "0%").attr("y1", "100%")
                .attr("x2", "0%").attr("y2", "0%");
            linearGradient.append("stop").attr("offset", "0%").attr("stop-color", "#d73027");
            linearGradient.append("stop").attr("offset", "50%").attr("stop-color", "#f7f7f7");
            linearGradient.append("stop").attr("offset", "100%").attr("stop-color", "#4575b4");

            const legendHeight = height;
            const legendWidth = 20;
            const legendX = width + 30;

            svg.append("rect")
                .attr("x", legendX).attr("y", 0)
                .attr("width", legendWidth).attr("height", legendHeight)
                .style("fill", `url(#${GRADIENT_ID})`)
                .style("stroke", "#ccc").style("stroke-width", "1px");

            const legendScale = d3.scaleLinear().domain([minVal, 0, maxVal]).range([legendHeight, legendHeight / 2, 0]);
            const negTicks = d3.ticks(minVal, 0, 5);
            const posTicks = d3.ticks(0, maxVal, 5);
            const customTicks = Array.from(new Set([...negTicks, ...posTicks])).sort((a, b) => a - b);

            svg.append("g")
                .attr("transform", `translate(${legendX + legendWidth}, 0)`)
                .call(d3.axisRight(legendScale).tickValues(customTicks).tickFormat(d3.format(",.0f")))
                .selectAll("text").style("font-family", "var(--heading-font)");

            svg.append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", legendX + legendWidth + 85)
                .attr("x", 0 - (height / 2))
                .attr("dy", "1em")
                .style("text-anchor", "middle").style("font-family", "var(--heading-font)")
                .text("Return (Introiti − Fondi) €");


            // =========================
            // VIEW LOGIC
            // =========================

            if (selectedView === "ALL") {
                // --- 1. FULL HEATMAP (YEARLY) ---

                const x = d3.scaleBand().range([0, width]).domain(years).padding(0.05);
                const y = d3.scaleBand().range([0, height]).domain(regions).padding(0.05);

                svg.append("g").attr("transform", `translate(0, ${height})`)
                    .call(d3.axisBottom(x))
                    .selectAll("text").style("text-anchor", "end")
                    .attr("dx", "-.8em").attr("dy", ".15em").attr("transform", "rotate(-45)")
                    .style("font-family", "var(--heading-font)");

                svg.append("g").call(d3.axisLeft(y)).selectAll("text").style("font-family", "var(--heading-font)");

                svg.append("text")
                    .attr("x", width / 2).attr("y", -30).attr("text-anchor", "middle")
                    .style("font-size", "25px").style("font-weight", "700")
                    .style("font-family", "var(--heading-font)").style("fill", "var(--heading-color)")
                    .text("Annotated Heatmap — Return Amount");

                const cellLayer = svg.append("g");
                const textLayer = svg.append("g");

                const rects = cellLayer.selectAll()
                    .data(heatmapData, d => d.region + ':' + d.year)
                    .enter().append("rect")
                    .attr("x", d => x(d.year)).attr("y", d => y(d.region))
                    .attr("width", x.bandwidth()).attr("height", y.bandwidth())
                    .style("fill", d => isNaN(d.value) ? "#fff3cd" : colorScale(d.value))
                    .style("stroke", "#ddd").style("stroke-width", 0.5);

                textLayer.selectAll()
                    .data(heatmapData)
                    .enter().append("text")
                    .attr("id", d => sanitizeId(d.region + d.year))
                    .text(d => isNaN(d.value) ? "" : "€" + d3.format(",.0f")(d.value))
                    .attr("x", d => x(d.year) + x.bandwidth() / 2)
                    .attr("y", d => y(d.region) + y.bandwidth() / 2)
                    .style("text-anchor", "middle").style("alignment-baseline", "middle")
                    .style("font-size", "11px").style("fill", "black")
                    .style("text-shadow", "0px 0px 4px rgba(255,255,255,1)")
                    .style("pointer-events", "none").style("opacity", 0);

                rects.on("mouseover", function (event, d) {
                    d3.select(this).style("stroke", "black").style("stroke-width", 2).raise();
                    d3.select("#" + sanitizeId(d.region + d.year)).style("opacity", 1).raise();
                }).on("mouseleave", function (event, d) {
                    d3.select(this).style("stroke", "#ddd").style("stroke-width", 0.5);
                    d3.select("#" + sanitizeId(d.region + d.year)).style("opacity", 0);
                });

            } else {
                // --- 2. AVERAGE SUMMARY VIEW ---

                const avgData = regions.map(r => ({
                    region: r,
                    value: regionStats[r].average
                }));

                // X Axis has only one "Year" called "Average"
                const x = d3.scaleBand().range([0, width]).domain(["Average Return"]).padding(0.05);
                const y = d3.scaleBand().range([0, height]).domain(regions).padding(0.05);

                svg.append("g").attr("transform", `translate(0, ${height})`)
                    .call(d3.axisBottom(x))
                    .selectAll("text").style("font-size", "14px").style("font-weight", "bold")
                    .style("font-family", "var(--heading-font)");

                svg.append("g").call(d3.axisLeft(y)).selectAll("text").style("font-family", "var(--heading-font)");

                svg.append("text")
                    .attr("x", width / 2).attr("y", -30).attr("text-anchor", "middle")
                    .style("font-size", "25px").style("font-weight", "700")
                    .style("font-family", "var(--heading-font)").style("fill", "var(--heading-color)")
                    .text("Average Return per Region (All Years)");

                const cellLayer = svg.append("g");
                const textLayer = svg.append("g");

                const rects = cellLayer.selectAll()
                    .data(avgData)
                    .enter().append("rect")
                    .attr("x", x("Average Return"))
                    .attr("y", d => y(d.region))
                    .attr("width", x.bandwidth())
                    .attr("height", y.bandwidth())
                    .style("fill", d => isNaN(d.value) ? "#fff3cd" : colorScale(d.value))
                    .style("stroke", "#ddd").style("stroke-width", 0.5);

                textLayer.selectAll()
                    .data(avgData)
                    .enter().append("text")
                    .text(d => isNaN(d.value) ? "No Data" : "€" + d3.format(",.0f")(d.value))
                    .attr("x", x("Average Return") + x.bandwidth() / 2)
                    .attr("y", d => y(d.region) + y.bandwidth() / 2)
                    .style("text-anchor", "middle").style("alignment-baseline", "middle")
                    .style("font-size", "12px").style("fill", "black")
                    .style("font-weight", "bold")
                    .style("text-shadow", "0px 0px 4px rgba(255,255,255,1)")
                    .style("pointer-events", "none");

                rects.on("mouseover", function () {
                    d3.select(this).style("stroke", "black").style("stroke-width", 2).raise();
                }).on("mouseleave", function () {
                    d3.select(this).style("stroke", "#ddd").style("stroke-width", 0.5);
                });
            }
        }

        renderChart("ALL");
        d3.select(SELECTOR_ID).on("change", function (event) {
            renderChart(event.target.value);
        });

    }).catch(console.error);
}