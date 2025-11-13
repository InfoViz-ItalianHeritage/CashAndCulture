// This is an IIFE (Immediately Invoked Function Expression)
// It runs automatically as soon as the file is loaded.
(async function () {

    // --- A predefined list of darker, distinct colors ---
    const DISTINCT_COLORS = [
        'rgba(170, 0, 0, 0.9)',    // Dark Red
        'rgba(0, 100, 0, 0.9)',    // Dark Green
        'rgba(0, 0, 128, 0.9)',    // Navy
        'rgba(128, 0, 128, 0.9)',  // Purple
        'rgba(230, 120, 0, 0.9)',  // Dark Orange
        'rgba(0, 128, 128, 0.9)',  // Teal
        'rgba(128, 0, 0, 0.9)',    // Maroon
        'rgba(75, 0, 130, 0.9)',   // Indigo
        'rgba(139, 69, 19, 0.9)',  // Saddle Brown
        'rgba(0, 0, 0, 0.9)',      // Black
        'rgba(100, 100, 100, 0.9)',// Dark Grey
        'rgba(0, 200, 150, 0.9)',  // Dark Cyan/Green
        'rgba(210, 0, 210, 0.9)',  // Dark Magenta
        'rgba(128, 128, 0, 0.9)',  // Olive
        'rgba(180, 180, 0, 0.9)',  // Dark Yellow
        'rgba(0, 150, 255, 0.9)',  // Strong Blue
        'rgba(190, 0, 90, 0.9)',   // Dark Pink
        'rgba(90, 130, 0, 0.9)',   // Dark Lime
        'rgba(255, 0, 0, 0.9)',    // Bright Red
        'rgba(0, 200, 0, 0.9)'     // Bright Green
    ];

    // --- Helper function to parse the specific currency format ---
    // "1.234,50" -> 1234.50
    function parseCurrency(str) {
        if (!str) return 0;
        // Remove thousands dots, replace decimal comma with a dot
        return parseFloat(
            str.replace(/\./g, '').replace(',', '.')
        ) || 0; // Return 0 if parsing fails
    }

    try {
        // --- 1. Fetch the CSV data ---
        const response = await fetch('data/mic_income.csv');
        if (!response.ok) {
            throw new Error(`Failed to fetch CSV: ${response.statusText}`);
        }
        const csvText = await response.text();

        // --- 2. Parse the CSV text ---
        const parsed = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true
        });

        if (parsed.errors.length) {
            console.error("Errors parsing CSV:", parsed.errors);
            throw new Error("Could not parse CSV file.");
        }

        const data = parsed.data;

        // --- 3. Process and Aggregate Data ---
        const yearlyTotals = {};

        const regions = parsed.meta.fields.filter(field =>
            field && field !== 'Totale complessivo'
        );

        for (const row of data) {
            const period = row[""]; // The first column

            if (!period || !period.includes('_')) {
                continue; // Skip invalid rows
            }

            const year = parseInt(period.split('_')[1], 10);

            if (isNaN(year) || year < 2014 || year > 2024) {
                continue;
            }

            if (!yearlyTotals[year]) {
                yearlyTotals[year] = {};
                for (const region of regions) {
                    yearlyTotals[year][region] = 0;
                }
            }

            for (const region of regions) {
                yearlyTotals[year][region] += parseCurrency(row[region]);
            }
        }

        // --- 4. Identify Top 5 Regions ---
        const regionTotalIncomes = {};
        for (const region of regions) {
            regionTotalIncomes[region] = 0;
            // Sum up the total for each year
            for (const year in yearlyTotals) {
                regionTotalIncomes[region] += yearlyTotals[year][region];
            }
        }

        // Convert to an array, sort it, and get the top 5 names
        const sortedRegions = Object.entries(regionTotalIncomes)
            .sort(([, totalA], [, totalB]) => totalB - totalA) // Sort descending
            .slice(0, 5) // Get the top 5
            .map(([name]) => name); // Get just the names

        const top5Regions = new Set(sortedRegions);

        // --- 5. Format data for Chart.js ---
        const labels = Object.keys(yearlyTotals).sort();

        // The 'index' is provided by the .map() function
        const datasets = regions.map((region, index) => {
            const dataForRegion = labels.map(year => yearlyTotals[year][region]);

            // Pick color from the new dark list
            const color = DISTINCT_COLORS[index % DISTINCT_COLORS.length];

            // Check if this region is NOT in the top 5
            const isHidden = !top5Regions.has(region);

            return {
                label: region,
                data: dataForRegion,
                borderColor: color,
                backgroundColor: color,
                fill: false,
                tension: 0.1,
                borderWidth: 2,
                pointRadius: 3,
                hidden: isHidden
            };
        });

        // --- 6. Render the chart ---
        const ctx = document.getElementById('chart');
        if (!ctx) {
            throw new Error("Could not find canvas element with id 'chart'");
        }

        // Define the title text
        const chartTitle = 'Total Annual Income by Region (2014-2024)';

        new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        // --- UPDATED: Disable the built-in title ---
                        display: false,
                        text: chartTitle
                    },
                    legend: {
                        position: 'right',
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += new Intl.NumberFormat('it-IT', {
                                        style: 'currency',
                                        currency: 'EUR'
                                    }).format(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Year'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Total Income'
                        },
                        ticks: {
                            callback: function (value) {
                                return '€' + new Intl.NumberFormat('it-IT').format(value);
                            }
                        }
                    }
                }
            }
        });

        // --- UPDATED: Find the new title element and set its text ---
        const titleElement = document.querySelector('.chart-title');
        if (titleElement) {
            titleElement.textContent = chartTitle;
        } else {
            console.warn("Could not find element with id 'map-title' to set the chart title.");
        }
        // --- -------------------------------------------------- ---

    } catch (error) {
        console.error("Failed to create chart:", error);
        const container = document.getElementById('chart')?.parentElement;
        if (container) {
            container.innerHTML = `<p style="color: red; text-align: center;">Could not load chart: ${error.message}</p>`;
        }
    }

})();