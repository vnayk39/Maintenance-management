// charges
const spacewiseChargesTableBody = document.querySelector('#spacewiseChargesTable tbody');
const addchargesRowBtn = document.getElementById('addChargesRowBtn');
const refreshchargesBtn = document.getElementById('refreshChargesBtn');

const SPACE_TYPES = ["1BHK", "2BHK", "1RK", "SHP", "OTHER"];

async function fetchSpacewiseCharges() {
    showLoading("Fetching spacewise charges...");
    try {
        const response = await fetch(`${API_BASE_URL}charges/`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        renderChargesTable(data);
        hideLoading("Spacewise charges loaded.");
    } catch (error) {
        hideLoading(`Error loading spacewise charges: ${error.message}`, true);
        console.error("Error fetching spacewise charges:", error);
        showCustomModal("Error", `Failed to load spacewise charges. Error: ${error.message}`, true);
    }
}

function renderChargesTable(data) {
    spacewiseChargesTableBody.innerHTML = '';
    data.forEach(rowData => {
        addChargesTableRow(rowData);
    });
    if (data.length === 0) {
        addChargesTableRow({}); // Add an empty row for new entry if no data
    }
}

function addChargesTableRow(rowData = {}) {
    const newRow = spacewiseChargesTableBody.insertRow();
    newRow.dataset.id = rowData.id || '';

    const fields = [
        //{ name: 'space_type', type: 'select', value: rowData.space_type || '', options: SPACE_TYPES, editable: !rowData.id },
        { name: 'space_type', type: 'text', value: rowData.space_type },
        { name: 'periodic_building_maintenance', type: 'number', value: parseFloat(rowData.periodic_building_maintenance || 0).toFixed(2) },
        { name: 'repair_and_maintenance_fund', type: 'number', value: parseFloat(rowData.repair_and_maintenance_fund || 0).toFixed(2) },
        { name: 'sinking_funds', type: 'number', value: parseFloat(rowData.sinking_funds || 0).toFixed(2) },
        { name: 'parking', type: 'textarea', value: JSON.stringify(rowData.parking || {}, null, 2) }, // Changed to textarea for JSON
        { name: 'lease_rent', type: 'number', value: parseFloat(rowData.lease_rent || 0).toFixed(2) }
    ];

    fields.forEach(field => {
        const cell = newRow.insertCell();
        let element;

        if (field.type === 'select') {
            element = document.createElement('select');
            SPACE_TYPES.forEach(optionText => {
                const option = document.createElement('option');
                option.value = optionText;
                option.textContent = optionText;
                element.appendChild(option);
            });
            element.value = field.value;
            if (!field.editable) {
                element.disabled = true;
            }
        } else if (field.type === 'textarea') { // Handle textarea for JSON
            element = document.createElement('textarea');
            element.rows = 3; // Adjust rows as needed
            element.value = field.value;
            element.placeholder = 'e.g., {"1": 30.00, "2": 90.00}';
            element.style.resize = 'vertical'; // Allow vertical resizing
            // Add JSON validation on change
            element.addEventListener('input', (event) => {
                try {
                    JSON.parse(event.target.value);
                    event.target.style.borderColor = ''; // Clear error border
                } catch (e) {
                    event.target.style.borderColor = 'red'; // Indicate invalid JSON
                }
            });
        } else {
            element = document.createElement('input');
            element.type = field.type;
            element.value = field.value;
        }

        element.name = field.name;
        element.classList.add('form-control');
        
        element.addEventListener('change', async (event) => {
            await saveChargesRowData(newRow, event.target.name, event.target.value);
        });
        
        cell.appendChild(element);
    });

    // Action Column (Remove Button)
    const actionCell = newRow.insertCell();
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.classList.add('btn', 'btn-danger', 'btn-sm', 'remove-row-btn');
    const icon = document.createElement('i');
    icon.classList.add('fas', 'fa-trash-alt');
    removeBtn.appendChild(icon);
    removeBtn.addEventListener('click', async () => {
        const rowId = newRow.dataset.id;
        if (rowId && confirm(`Are you sure you want to delete charges for ${rowData.space_type}?`)) {
            await deleteChargesRowData(rowId, newRow);
        } else if (!rowId) {
            newRow.remove();
            hideLoading("Unsaved row removed.", false);
        }
    });
    actionCell.appendChild(removeBtn);

    if (!rowData.id) {
        newRow.querySelector('[name="space_type"]').focus();
    }
}

async function saveChargesRowData(row, changedFieldName, changedValue) {
    const rowId = row.dataset.id;
    const rowData = {};
    row.querySelectorAll('input, select, textarea').forEach(element => { // Added textarea
        if (element.name === 'parking') { // Special handling for JSON field
            try {
                rowData[element.name] = JSON.parse(element.value);
                element.style.borderColor = ''; // Clear error border on successful parse
            } catch (e) {
                showCustomModal("Validation Error", `Invalid JSON for Parking field: ${e.message}`, true);
                element.style.borderColor = 'red';
                throw new Error("Invalid JSON input for parking."); // Stop save process
            }
        } else {
            rowData[element.name] = element.type === 'number' ? parseFloat(element.value) : element.value.trim();
        }
    });

    if (!rowData.space_type) {
        showCustomModal("Validation Error", "Space Type cannot be empty.", true);
        return;
    }

    showLoading("Saving data...");

    try {
        let response;
        let method;
        let url;

        if (rowId) {
            method = 'PUT';
            url = `${API_BASE_URL}charges/${rowId}/`;
        } else {
            method = 'POST';
            url = `${API_BASE_URL}charges/`;
        }

        response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),
            },
            body: JSON.stringify(rowData)
        });

        if (!response.ok) {
            const errorResponse = await response.json();
            if (response.status === 400 && errorResponse.space_type && errorResponse.space_type.includes('already exists')) {
                throw new Error(`Space Type '${rowData.space_type}' already exists. Please use a unique space type.`);
            }
            throw new Error(`HTTP error! Status: ${response.status}. Details: ${JSON.stringify(errorResponse)}`);
        }

        const savedData = await response.json();
        row.dataset.id = savedData.id;
        // Disable space_type select after successful save for new rows
        const spaceTypeSelect = row.querySelector('[name="space_type"]');
        if (spaceTypeSelect) {
            spaceTypeSelect.disabled = true;
        }

        hideLoading("Data saved successfully!");
        if (!rowId) {
            addChargesTableRow({});
        }
    } catch (error) {
        hideLoading(`Error saving: ${error.message}`, true);
        console.error("Error saving spacewise charges:", error);
        showCustomModal("Error", `Failed to save data. Error: ${error.message}`, true);
    }
}

async function deleteChargesRowData(rowId, rowElement) {
    showLoading("Deleting data...");
    try {
        const response = await fetch(`${API_BASE_URL}charges/${rowId}/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
            }
        });

        if (response.status === 204) {
            rowElement.remove();
            hideLoading("Charges deleted successfully!");
            if (spacewiseChargesTableBody.rows.length === 0) {
                addChargesTableRow({});
            }
        } else {
            const errorText = await response.text();
            throw new Error(`Server responded with status ${response.status}: ${errorText}`);
        }
    } catch (error) {
        hideLoading(`Error deleting: ${error.message}`, true);
        console.error("Error deleting spacewise charges:", error);
        showCustomModal("Error", `Failed to delete data. Error: ${error.message}`, true);
    }
}

addchargesRowBtn.addEventListener('click', () => addChargesTableRow({}));
refreshchargesBtn.addEventListener('click', fetchSpacewiseCharges);

document.addEventListener('DOMContentLoaded', fetchSpacewiseCharges);
