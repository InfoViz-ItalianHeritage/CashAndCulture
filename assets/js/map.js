let fundingDrawMap = null;
let visitorDrawMap = null;
let fundingYears = [];
let visitorYears = [];
let mapInstance1 = null; // Map 1 (Funding)
let mapInstance2 = null; // Map 2 (Visitor)


function initializeSynchronizedSlider() {
    if (fundingDrawMap && visitorDrawMap && fundingYears.length > 0 && visitorYears.length > 0) {


        const allYears = [...fundingYears, ...visitorYears];
        const allowedYears = Array.from({ length: 2024 - 2014 + 1 }, (_, i) => 2014 + i);

        const years = Array.from(new Set(allYears))
            .filter(year => allowedYears.includes(year))
            .sort((a, b) => a - b);

        if (years.length === 0) {
            console.warn("Cannot create synchronized slider: No common years found.");
            return;
        }


        const masterDrawCallback = (selectedYear) => {
            fundingDrawMap(selectedYear);
            visitorDrawMap(selectedYear);
        };


        const CONTAINER_ID = 'synchronized-slider-container';
        if (document.getElementById(CONTAINER_ID)) {
            console.log(`Creating single synchronized slider for Maps 1 and 2 in external container.`);
            createYearSliderControl(CONTAINER_ID, years, masterDrawCallback);
        } else {
            console.error(`Map synchronization failed: Cannot find HTML container ID: ${CONTAINER_ID}. Please ensure this ID exists below your map divs.`);
        }
    }
}


function normalizeRegionName(name) {
    if (typeof name !== 'string') return '';
    let normalized = name.toLowerCase()
        .replace(/[^a-z0-9]/g, '');
    if (normalized.includes('trentino')) return 'trentinoaltoadige';
    if (normalized.includes('valle')) return 'valledaosta';
    return normalized;
}

function createYearSliderControl(containerId, yearsArray, onChangeCallback) {
    if (yearsArray.length === 0) {
        console.warn(`Cannot create slider: No valid years found for container ${containerId}.`);
        return;
    }

    const parentContainer = document.getElementById(containerId);
    if (!parentContainer) {
        return;
    }

    parentContainer.innerHTML = '';


    const container = document.createElement('div');
    container.className = 'year-slider-standalone-control';
    container.style.backgroundColor = 'white';
    container.style.padding = '10px';
    container.style.width = '350px';
    container.style.boxShadow = '0 1px 5px rgba(0,0,0,0.4)';
    container.style.borderRadius = '5px';
    container.style.margin = '10px auto';

    const yearLabel = document.createElement('div');
    yearLabel.className = 'year-label';
    yearLabel.innerHTML = `Year: <b>${yearsArray[0]}</b>`;
    yearLabel.style.marginBottom = '5px';
    yearLabel.style.textAlign = 'center';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 0;
    slider.max = yearsArray.length - 1;
    slider.value = 0;
    slider.step = 1;
    slider.style.width = '100%';

    container.appendChild(yearLabel);
    container.appendChild(slider);
    parentContainer.appendChild(container);


    slider.addEventListener('input', function (e) {
        const yearIndex = parseInt(e.target.value);
        const selectedYear = yearsArray[yearIndex];
        yearLabel.innerHTML = `Year: <b>${selectedYear}</b>`;
        onChangeCallback(selectedYear);
    });


    onChangeCallback(yearsArray[0]);
}

function createFundingMap() {
    const MAP_CONTAINER_ID = 'map';
    const TITLE_CONTAINER_ID = 'funding-map-title';
    const TITLE_TEXT = 'Public Funding Per Region';

    const titleContainer = document.getElementById(TITLE_CONTAINER_ID);
    if (titleContainer) {
        titleContainer.innerHTML = `<div class="map-title">${TITLE_TEXT}</div>`;
    } else {
        console.warn(`Title container not found: #${TITLE_CONTAINER_ID}`);
    }


    const map = L.map(MAP_CONTAINER_ID).setView([41.87194, 12.56738], 5);
    mapInstance1 = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    Promise.all([
        d3.csv('data/open_coesione.csv'),
        d3.json('data/italy_regions.geojson')
    ]).then(([csvData, geojsonData]) => {

        const longData = [];
        csvData.forEach(d => {
            const dateStr = d["OC_DATA_INIZIO_PROGETTO"];
            const year = dateStr ? +dateStr.substring(0, 4) : null;
            if (year) {
                const cleanFunding = d["FINANZ_TOTALE_PUBBLICO"]
                    ? d["FINANZ_TOTALE_PUBBLICO"].replace(/\./g, '').replace(',', '.')
                    : '0';

                longData.push({
                    Year: year,
                    Region: d["DEN_REGIONE"],
                    Funding: parseFloat(cleanFunding) || 0,
                    region_norm: normalizeRegionName(d["DEN_REGIONE"])
                });
            }
        });

        const yearlyRegionData = d3.rollups(
            longData,
            v => d3.sum(v, d => d.Funding),
            d => `${d.region_norm}-${d.Year}`
        );

        const getFunding = (region, year) => {
            const key = `${region}-${year}`;
            const item = yearlyRegionData.find(([k]) => k === key);
            return item ? item[1] : 0;
        };

        const maxFunding = d3.max(longData.map(d => d.Funding));
        const colorScale = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, maxFunding]);

        let geoJsonLayer = null;
        function drawMap(selectedYear) {
            if (geoJsonLayer) map.removeLayer(geoJsonLayer);
            geoJsonLayer = L.geoJson(geojsonData, {
                style: feature => {
                    const name = feature.properties.name || feature.properties.reg_name || '';
                    const region = normalizeRegionName(name);
                    const value = getFunding(region, selectedYear);
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
                    const value = getFunding(normalizeRegionName(name), selectedYear);
                    layer.bindPopup(`<b>${name}</b><br>Year: ${selectedYear}<br>Funding: €${value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`);
                    layer.on({
                        mouseover: e => {
                            e.target.setStyle({ weight: 5, color: '#666', dashArray: '', fillOpacity: 0.9 });
                            if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) e.target.bringToFront();
                        },
                        mouseout: e => geoJsonLayer.resetStyle(e.target)
                    });
                }
            }).addTo(map);
        }

        const allowedYears = Array.from({ length: 2024 - 2014 + 1 }, (_, i) => 2014 + i);
        const years = Array.from(new Set(longData.map(d => d.Year)))
            .filter(year => allowedYears.includes(year))
            .sort((a, b) => a - b);
        fundingDrawMap = drawMap;
        fundingYears = years;
        initializeSynchronizedSlider();

    }).catch(err => console.error("Error loading funding data:", err));
}

function createVisitorMap() {
    const MAP_CONTAINER_ID = 'map1';
    const TITLE_CONTAINER_ID = 'visitor-map-title';
    const TITLE_TEXT = 'Visitors Per Region';
    const titleContainer = document.getElementById(TITLE_CONTAINER_ID);
    if (titleContainer) {
        titleContainer.innerHTML = `<div class="map-title">${TITLE_TEXT}</div>`;
    } else {
        console.warn(`Title container not found: #${TITLE_CONTAINER_ID}`);
    }


    const map1 = L.map(MAP_CONTAINER_ID).setView([41.87194, 12.56738], 5);
    mapInstance2 = map1;

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
        const idCol = csvData.columns && csvData.columns.includes('Unnamed: 0') ? 'Unnamed: 0' : '';
        const idKey = idCol || csvData.columns[0];
        const allowedRegions = [
            'ABRUZZO', 'BASILICATA', 'CALABRIA', 'CAMPANIA', 'EMILIA ROMAGNA',
            'FRIULI-VENEZIA GIULIA', 'LAZIO', 'LIGURIA', 'LOMBARDIA', 'MARCHE',
            'MOLISE', 'PIEMONTE', 'PUGLIA', 'SARDEGNA', 'TOSCANA', 'UMBRIA', 'VENETO'
        ];

        csvData.forEach(row => {
            const id = row[idKey];
            if (!id) return;

            const trimmedId = id.trim().toLowerCase();
            if (trimmedId.startsWith('totale_regione')) {
                const yearMatch = trimmedId.match(/\d{4}$/);
                const year = yearMatch ? +yearMatch[0] : null;
                if (!year) return;

                Object.entries(row).forEach(([region, value]) => {
                    if (allowedRegions.includes(region.toUpperCase())) {
                        const clean = (value || '0').replace(/\./g, '').replace(',', '.');
                        const visitors = parseFloat(clean) || 0;
                        longData.push({
                            Year: year,
                            Region: region,
                            Visitors: visitors,
                            region_norm: normalizeRegionName(region)
                        });
                    }
                });
            }
        });

        if (longData.length === 0) {
            console.warn(`No visitor data rows were successfully processed.`);
            return;
        }

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
        const visitorColorScale = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, maxVisitors]);

        let geoJsonLayer = null;

        function drawMap(selectedYear) {
            if (geoJsonLayer) map1.removeLayer(geoJsonLayer);
            geoJsonLayer = L.geoJson(geoData, {
                style: feature => {
                    const name = feature.properties.name || feature.properties.reg_name || '';
                    const region = normalizeRegionName(name);
                    const value = getVisitors(region, selectedYear);
                    return {
                        fillColor: visitorColorScale(value),
                        weight: 2,
                        opacity: 1,
                        color: 'white',
                        dashArray: '3',
                        fillOpacity: 0.7
                    };
                },
                onEachFeature: (feature, layer) => {
                    const name = feature.properties.name || feature.properties.reg_name || '';
                    const value = getVisitors(normalizeRegionName(name), selectedYear);
                    layer.bindPopup(
                        `<b>${name}</b><br>Year: ${selectedYear}<br>Visitors: ${value.toLocaleString()}`
                    );

                    layer.on({
                        mouseover: e => {
                            e.target.setStyle({ weight: 5, color: '#666', dashArray: '', fillOpacity: 0.9 });
                            if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) e.target.bringToFront();
                        },
                        mouseout: e => geoJsonLayer.resetStyle(e.target)
                    });
                }
            }).addTo(map1);
        }

        const allowedYears = Array.from({ length: 2024 - 2014 + 1 }, (_, i) => 2014 + i);
        const years = Array.from(new Set(longData.map(d => d.Year)))
            .filter(year => allowedYears.includes(year))
            .sort((a, b) => a - b);

        visitorDrawMap = drawMap;
        visitorYears = years;
        initializeSynchronizedSlider();

    }).catch(err => console.error("Error loading visitor data:", err));
}

document.addEventListener("DOMContentLoaded", function () {
    if (typeof d3 === 'undefined' || typeof L === 'undefined') {
        console.error("CRITICAL ERROR: D3.js or Leaflet.js are not loaded yet. Check your script tags.");
        return;
    }
    if (document.getElementById('map') && document.getElementById('map1')) {
        createFundingMap();
        createVisitorMap();
    } else {
        console.warn("Map containers (#map or #map1) missing. Skipping map initialization.");
    }
});