// ========== CONFIGURATION ==========
const CSV_FILE = 'airport_large.csv';
const IMAGE_COLUMNS = ['filename']; // Columns that contain image filenames
const IMAGE_FOLDER = 'airport_vector'; // Where images are stored

// ========== GLOBAL STATE ==========
let allData = [];
let table = null;

// ========== INITIALIZE ==========
async function init() {
    try {
        await loadCSVData();
        setupTable();
        setupEventListeners();
        document.getElementById('loading').style.display = 'none';
        document.getElementById('tableWrapper').style.display = 'block';
    } catch (error) {
        showError('Failed to load data: ' + error.message);
    }
}

// ========== CSV LOADING ==========
async function loadCSVData() {
    try {
        const response = await fetch(CSV_FILE);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${CSV_FILE}: ${response.statusText}`);
        }
        const text = await response.text();
        allData = d3.csvParse(text);
        if (allData.length === 0) {
            throw new Error('No data found in CSV file');
        }
    } catch (error) {
        throw error;
    }
}

// ========== TABLE SETUP ==========
function setupTable() {
    if (allData.length === 0) {
        showError('No data found in CSV file');
        return;
    }

    // Get columns from first data row
    const columnIds = Object.keys(allData[0]);

    // Create column definitions for Tabulator
    const columns = columnIds.map(columnId => {
        const columnDef = {
            title: columnId,
            field: columnId,
            headerFilter: "input",
            headerFilterPlaceholder: `Filter ${columnId}...`,
            sorter: "alphanum",
            headerSort: true,
            resizable: true,
        };

        // Check if this column contains images
        if (IMAGE_COLUMNS.includes(columnId)) {
            columnDef.formatter = (cell) => {
                const value = cell.getValue();
                if (value) {
                    return `<img class="image-preview" 
                                 src="${IMAGE_FOLDER}/${value}" 
                                 alt="${value}"
                                 onclick="showImageModal('${IMAGE_FOLDER}/${value}')"
                                 onerror="this.style.display='none';">`;
                }
                return '';
            };
            columnDef.headerSort = false;
        }

        return columnDef;
    });

    // Populate group by dropdown
    const groupBySelect = document.getElementById('groupByColumn');
    columnIds.forEach(col => {
        const option = document.createElement('option');
        option.value = col;
        option.textContent = col;
        groupBySelect.appendChild(option);
    });

    // Create Tabulator instance
    table = new Tabulator("#dataTable", {
        data: allData,
        columns: columns,
        layout: "fitData",
        height: "calc(100vh - 310px)",
        minHeight: "400px",
        // maxHeight: "800px",
        virtualDom: true,
        virtualDomBuffer: 300,
        placeholder: "No Data Available",
        pagination: false,
        
        // Enable sorting
        initialSort: [],
        
        // Callbacks
        dataFiltered: function(filters, rows) {
            updateStats();
        },
        dataSorted: function(sorters, rows) {
            updateStats();
        },
        tableBuilt: function() {
            updateStats();
            // Add event listeners to header filter inputs
            setTimeout(() => {
                const headerFilters = document.querySelectorAll('.tabulator-header-filter input');
                headerFilters.forEach(input => {
                    input.addEventListener('input', () => {
                        // Small delay to let Tabulator process the filter first
                        setTimeout(updateStats, 50);
                    });
                });
            }, 100);
        },
    });

    updateStats();
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
    // Global search
    const globalSearchInput = document.getElementById('globalSearch');
    globalSearchInput.addEventListener('input', (e) => {
        table.setFilter(customGlobalFilter, { value: e.target.value });
    });

    // Group by
    const groupBySelect = document.getElementById('groupByColumn');
    groupBySelect.addEventListener('change', (e) => {
        const groupByColumn = e.target.value;
        if (groupByColumn) {
            table.setGroupBy(groupByColumn);
            table.setGroupHeader((value, count) => {
                return `${groupByColumn}: ${value} <span>(${count} items)</span>`;
            });
        } else {
            table.setGroupBy(false);
        }
        updateStats();
    });

    // Clear filters
    document.getElementById('clearFilters').addEventListener('click', () => {
        globalSearchInput.value = '';
        document.getElementById('groupByColumn').value = '';
        
        // Clear all filters
        table.clearFilter(true);
        table.clearHeaderFilter();
        table.setGroupBy(false);
        table.clearSort();
        
        updateStats();
    });

    // Download CSV
    document.getElementById('downloadCSV').addEventListener('click', () => {
        table.download("csv", "data.csv");
    });

    // Image modal
    const modal = document.getElementById('imageModal');
    modal.addEventListener('click', () => {
        modal.classList.remove('active');
    });
}

// Custom global filter function
function customGlobalFilter(data, filterParams) {
    if (!filterParams.value) return true;
    
    const searchTerm = filterParams.value.toLowerCase();
    return Object.values(data).some(val => 
        String(val || '').toLowerCase().includes(searchTerm)
    );
}

// ========== HELPERS ==========
function showImageModal(src) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    modalImg.src = src;
    modal.classList.add('active');
}

// Make showImageModal available globally for inline onclick handlers
window.showImageModal = showImageModal;

function updateStats() {
    if (!table) return;
    const stats = document.getElementById('stats');
    const totalRows = allData.length;
    
    stats.textContent = `Total: ${totalRows} rows`;
    
    const groups = table.getGroups();
    if (groups && groups.length > 0) {
        stats.textContent += ` | ${groups.length} groups`;
    }
}

function showError(message) {
    const errorContainer = document.getElementById('error-container');
    errorContainer.innerHTML = `<div class="error">${message}</div>`;
    document.getElementById('loading').style.display = 'none';
}

// ========== START ==========
init();

