// --- Shared Helper: Normalize region names ---
function normalizeRegionName(name) {
    if (typeof name !== 'string') return '';
    let normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalized.includes('trentino')) normalized = 'trentinoaltoadige';
    if (normalized.includes('valle')) normalized = 'valledaosta';
    return normalized;
}

// --- 1. FUNDING MAP (OpenCoesione) ---
function createFundingMap() {
    const map = L.map('map').setView([41.87194, 12.56738], 5);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    Promise.all([
        d3.csv('data/open_coesione.csv'),
        d3.json('data/italy_regions.geojson')
    ]).then(([csvData, geojsonData]) => {
        const regionData = d3.rollup(csvData,
            v => d3.sum(v, d => {
                const clean = d["FINANZ_TOTALE_PUBBLICO"]
                    ? d["FINANZ_TOTALE_PUBBLICO"].replace(/\./g, '').replace(',', '.')
                    : '0';
                return parseFloat(clean) || 0;
            }),
            d => normalizeRegionName(d["DEN_REGIONE"])
        );

        const maxFunding = d3.max(Array.from(regionData.values()));
        const colorScale = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, maxFunding]);

        const geoJsonLayer = L.geoJson(geojsonData, {
            style: feature => {
                const name = feature.properties.name || feature.properties.reg_name || '';
                const region = normalizeRegionName(name);
                const value = regionData.get(region) || 0;
                return {
                    fillColor: colorScale(value),
                    weight: 2,
                    opacity: 1,
                    color: 'white',
                    dashArray: '3',
                    fillOpacity: 0.7
                };
            },
            onEachFeature: (feature, layer) => {
                const name = feature.properties.name || feature.properties.reg_name || '';
                const region = normalizeRegionName(name);
                const value = regionData.get(region) || 0;
                layer.bindPopup(`<b>${name}</b><br>Total Funding: €${value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`);

                layer.on({
                    mouseover: e => {
                        e.target.setStyle({ weight: 5, color: '#666', dashArray: '', fillOpacity: 0.9 });
                        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) e.target.bringToFront();
                    },
                    mouseout: e => geoJsonLayer.resetStyle(e.target)
                });
            }
        }).addTo(map);
    }).catch(err => console.error("Error loading funding data:", err));
}

// --- 2. VISITOR MAP (MiC data) ---
function createVisitorMap() {
    const map1 = L.map('map1').setView([41.87194, 12.56738], 5.5);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map1);

    Promise.all([
        d3.csv('data/mic_visitors.csv'),
        d3.json('data/italy_regions.geojson')
    ]).then(([csvData, geoData]) => {
        const longData = [];
        csvData.forEach(row => {
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
        const minRadius = 4, maxRadius = 30;
        const scaleRadius = v => v <= 0 ? 0 : minRadius + Math.sqrt(v / maxVisitors) * (maxRadius - minRadius);

        function drawMap(selectedYear) {
            map1.eachLayer(layer => {
                if (layer instanceof L.CircleMarker) map1.removeLayer(layer);
            });

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

                L.circleMarker([centroid[1], centroid[0]], {
                    radius: scaleRadius(visitors),
                    color: '#3186cc',
                    fillColor: '#3186cc',
                    fillOpacity: 0.6
                })
                    .bindPopup(`<b>${regionName}</b><br>Year: ${selectedYear}<br>Visitors: ${visitors.toLocaleString()} (${percentage.toFixed(1)}%)`)
                    .addTo(map1);
            });
        }

        const years = Array.from(new Set(longData.map(d => d.Year))).sort();
        const dropdown = d3.select('#yearDropdown')
            .append('select')
            .on('change', function () { drawMap(+this.value); });

        dropdown.selectAll('option')
            .data(years)
            .enter()
            .append('option')
            .text(d => d)
            .attr('value', d => d);

        drawMap(years[0]);
    }).catch(err => console.error("Error loading visitor data:", err));
}

// --- 3. Initialize both maps ---
createFundingMap();
createVisitorMap();
