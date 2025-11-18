document.addEventListener("DOMContentLoaded", function () {
    const container = document.querySelector("#heatmap-container");
    if (container) container.innerHTML = '';
    createHeatmap();
});

function createHeatmap() {
    const CONTAINER_ID = "#heatmap-container";
    const DATA_PATH = "data/income&funding.csv";
    const GRADIENT_ID = "legend-gradient-centered";

    const margin = { top: 80, right: 250, bottom: 100, left: 250 };

    const containerElement = document.querySelector(CONTAINER_ID);
    const width = Math.max(100, containerElement.clientWidth - margin.left - margin.right);

    const height = 800 - margin.top - margin.bottom;

    const svg = d3.select(CONTAINER_ID)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const cellLayer = svg.append("g").attr("class", "cell-layer");
    const textLayer = svg.append("g").attr("class", "text-layer");
    const axisLayer = svg.append("g").attr("class", "axis-layer");

    const sanitizeId = (str) => "t-" + str.replace(/[^a-zA-Z0-9]/g, "");

    d3.csv(DATA_PATH).then(function (data) {

        const headers = data.columns;
        const yearsSet = new Set();
        headers.forEach(h => {
            if (h.includes('_')) {
                const part = h.split('_')[1];
                if (!isNaN(parseInt(part))) yearsSet.add(part);
            }
        });
        const years = Array.from(yearsSet).sort();
        const regions = data.map(d => d.Regione);

        const heatmapData = [];
        let minVal = Infinity;
        let maxVal = -Infinity;

        data.forEach(row => {
            years.forEach(year => {
                const region = row.Regione;
                const introiti = parseFloat(row[`Introiti_${year}`]?.replace(/\./g, '').replace(',', '.') || NaN);
                const fondi = parseFloat(row[`Fondi_${year}`]?.replace(/\./g, '').replace(',', '.') || NaN);

                let returnVal = NaN;
                if (!isNaN(introiti) && !isNaN(fondi)) {
                    returnVal = introiti - fondi;
                    if (returnVal < minVal) minVal = returnVal;
                    if (returnVal > maxVal) maxVal = returnVal;
                }
                heatmapData.push({ region: region, year: year, value: returnVal });
            });
        });

        if (!isFinite(minVal)) minVal = 0;
        if (!isFinite(maxVal)) maxVal = 0;
        if (minVal > 0) minVal = 0;
        if (maxVal < 0) maxVal = 0;

        const x = d3.scaleBand().range([0, width]).domain(years).padding(0.05);
        const y = d3.scaleBand().range([0, height]).domain(regions).padding(0.05);

        const colorScale = d3.scaleLinear()
            .domain([minVal, 0, maxVal])
            .range(["#d73027", "#f7f7f7", "#4575b4"])
            .clamp(true);

        const rects = cellLayer.selectAll()
            .data(heatmapData, d => d.region + ':' + d.year)
            .enter()
            .append("rect")
            .attr("x", d => x(d.year))
            .attr("y", d => y(d.region))
            .attr("width", x.bandwidth())
            .attr("height", y.bandwidth())
            .style("fill", d => isNaN(d.value) ? "#fff3cd" : colorScale(d.value))
            .style("stroke", "#ddd")
            .style("stroke-width", 0.5);

        textLayer.selectAll(".cell-text")
            .data(heatmapData)
            .enter()
            .append("text")
            .attr("id", d => sanitizeId(d.region + d.year))
            .text(d => isNaN(d.value) ? "" : "€" + d3.format(",.0f")(d.value))
            .attr("x", d => x(d.year) + x.bandwidth() / 2)
            .attr("y", d => y(d.region) + y.bandwidth() / 2)
            .style("text-anchor", "middle")
            .style("alignment-baseline", "middle")
            .style("font-size", "11px")
            .style("font-weight", "bold")
            .style("font-family", "var(--heading-font)")
            .style("fill", "black")
            .style("text-shadow", "0px 0px 4px rgba(255,255,255,1)")
            .style("pointer-events", "none")
            .style("opacity", 0);

        rects.on("mouseover", function (event, d) {
            d3.select(this).style("stroke", "black").style("stroke-width", 2).raise();
            d3.select("#" + sanitizeId(d.region + d.year)).style("opacity", 1);
        })
            .on("mouseleave", function (event, d) {
                d3.select(this).style("stroke", "#ddd").style("stroke-width", 0.5);
                d3.select("#" + sanitizeId(d.region + d.year)).style("opacity", 0);
            });

        axisLayer.append("g").attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(x))
            .selectAll("text").style("text-anchor", "end")
            .attr("dx", "-.8em").attr("dy", ".15em").attr("transform", "rotate(-45)")
            .style("font-family", "var(--heading-font)");

        axisLayer.append("g").call(d3.axisLeft(y))
            .selectAll("text")
            .style("font-family", "var(--heading-font)");

        svg.append("text")
            .attr("x", width / 2)
            .attr("y", -30)
            .attr("text-anchor", "middle")
            .style("font-size", "25px")
            .style("font-weight", "700")
            .style("font-family", "var(--heading-font)")
            .style("fill", "var(--heading-color)")
            .text("Annotated Heatmap — Return Amount (Introiti − Fondi)");

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

        const legendScale = d3.scaleLinear()
            .domain([minVal, 0, maxVal])
            .range([legendHeight, legendHeight / 2, 0]);

        const negTicks = d3.ticks(minVal, 0, 5);
        const posTicks = d3.ticks(0, maxVal, 5);
        const customTicks = Array.from(new Set([...negTicks, ...posTicks])).sort((a, b) => a - b);

        svg.append("g")
            .attr("transform", `translate(${legendX + legendWidth}, 0)`)
            .call(
                d3.axisRight(legendScale)
                    .tickValues(customTicks)
                    .tickFormat(d3.format(",.0f"))
            )
            .selectAll("text")
            .style("font-family", "var(--heading-font)");

        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", legendX + legendWidth + 85)
            .attr("x", 0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .style("font-family", "var(--heading-font)")
            .text("Return (Introiti − Fondi) €");

    }).catch(console.error);
}