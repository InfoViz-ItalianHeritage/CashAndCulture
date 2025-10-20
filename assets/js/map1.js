// --- Helper: Normalize region names ---
function normalizeRegionName(name) {
    if (typeof name !== 'string') return '';
    let normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalized.includes('trentino')) normalized = 'trentinoaltoadige';
    if (normalized.includes('valle')) normalized = 'valledaosta';
    return normalized;
}

// --- Create unified map ---
function createCombinedMap() {
    // --- Initialize map ---
    if (L.DomUtil.get('map2') != null) {
        L.DomUtil.get('map2')._leaflet_id = null;
    }
    const map = L.map('map2').setView([41.87194, 12.56738], 5.5);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // --- Load all data in parallel ---
    Promise.all([
        d3.csv('CashAndCulture/data/open_coesione.csv'),
        d3.csv('CashAndCulture/data/mic_visitors.csv'),
        d3.json('CashAndCulture/data/italy_regions.geojson')
    ]).then(([fundingData, visitorData, geoData]) => {
        // === 1. FUNDING CHOROPLETH ===
        const fundingRegionData = d3.rollup(fundingData,
            v => d3.sum(v, d => {
                const clean = d["FINANZ_TOTALE_PUBBLICO"]
                    ? d["FINANZ_TOTALE_PUBBLICO"].replace(/\./g, '').replace(',', '.')
                    : '0';
                return parseFloat(clean) || 0;
            }),
            d => normalizeRegionName(d["DEN_REGIONE"])
        );

        const maxFunding = d3.max(Array.from(fundingRegionData.values()));
        const colorScale = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, maxFunding]);

        const fundingLayer = L.geoJson(geoData, {
            style: feature => {
                const name = feature.properties.name || feature.properties.reg_name || '';
                const region = normalizeRegionName(name);
                const value = fundingRegionData.get(region) || 0;
                return {
                    fillColor: colorScale(value),
                    weight: 1,
                    color: 'white',
                    fillOpacity: 0.6
                };
            },
            onEachFeature: (feature, layer) => {
                const name = feature.properties.name || feature.properties.reg_name || '';
                const region = normalizeRegionName(name);
                const value = fundingRegionData.get(region) || 0;
                layer.bindPopup(`<b>${name}</b><br>Funding: €${value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`);
            }
        });

        // === 2. VISITOR CIRCLE LAYER ===
        const longData = [];
        visitorData.forEach(row => {
            const yearMatch = row['Unnamed: 0']?.match(/\d{4}/);
            const year = yearMatch ? +yearMatch[0] : null;
            Object.entries(row).forEach(([region, value]) => {
                if (region === 'Unnamed: 0') return;
                const clean = (value || '0').replace(/\./g, '').replace(',', '.');
                longData.push({
                    Year: year,
                    Region: region,
                    Visitors: parseFloat(clean) || 0,
                    region_norm: normalizeRegionName(region)
                });
            });
        });

        const yearlyData = d3.rollups(
            longData,
            v => d3.sum(v, d => d.Visitors),
            d => `${d.region_norm}-${d.Year}`
        );

        const getVisitors = (region, year) => {
            const key = `${region}-${year}`;
            const item = yearlyData.find(([k]) => k === key);
            return item ? item[1] : 0;
        };

        const maxVisitors = d3.max(longData, d => d.Visitors);
        const minRadius = 4, maxRadius = 25;
        const scaleRadius = v => v <= 0 ? 0 : minRadius + Math.sqrt(v / maxVisitors) * (maxRadius - minRadius);

        let visitorLayer = L.layerGroup();

        function drawVisitorCircles(selectedYear) {
            visitorLayer.clearLayers();
            const yearData = longData.filter(d => d.Year === selectedYear);
            const totalVisitors = d3.sum(yearData, d => d.Visitors);

            geoData.features.forEach(feature => {
                const props = feature.properties;
                const regionName = props.name || props.reg_name || '';
                const norm = normalizeRegionName(regionName);
                const visitors = getVisitors(norm, selectedYear);
                if (visitors <= 0) return;
                const centroid = turf.centroid(feature).geometry.coordinates;
                const percentage = (visitors / totalVisitors) * 100;

                const circle = L.circleMarker([centroid[1], centroid[0]], {
                    radius: scaleRadius(visitors),
                    color: '#3186cc',
                    fillColor: '#3186cc',
                    fillOpacity: 0.7
                }).bindPopup(
                    `<b>${regionName}</b><br>Year: ${selectedYear}<br>Visitors: ${visitors.toLocaleString()} (${percentage.toFixed(1)}%)`
                );

                visitorLayer.addLayer(circle);
            });
        }

        // --- Create initial visitor layer ---
        const years = Array.from(new Set(longData.map(d => d.Year))).sort();
        drawVisitorCircles(years[0]);

        // --- Add to map ---
        fundingLayer.addTo(map);
        visitorLayer.addTo(map);

        // --- Layer control ---
        const overlayMaps = {
            "Funding Choropleth": fundingLayer,
            "Visitor Circles": visitorLayer
        };
        L.control.layers(null, overlayMaps, { collapsed: false }).addTo(map);

        // --- Add year dropdown control ---
        const YearControl = L.Control.extend({
            onAdd: function () {
                const div = L.DomUtil.create('div', 'year-control');
                div.innerHTML = `<label><b>Year:</b></label>
                                 <select id="yearSelect">${years.map(y => `<option value="${y}">${y}</option>`).join('')}</select>`;
                return div;
            }
        });
        map.addControl(new YearControl({ position: 'topright' }));

        // Handle year change
        document.getElementById('yearSelect').addEventListener('change', e => {
            drawVisitorCircles(+e.target.value);
        });

    }).catch(err => console.error("Error loading combined data:", err));
}

// --- Initialize ---
createCombinedMap();
