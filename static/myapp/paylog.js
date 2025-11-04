// paylog
// --- UI Element References ---
const paymentsLogTableBody = document.querySelector('#paymentsLogTable tbody');
const addPaylogRowBtn = document.getElementById('addPaylogRowBtn');
const logAllPaymentsBtn = document.getElementById('logAllPaymentsBtn');
const maintenanceLogArea = document.getElementById('maintenanceLogArea');
const responseMessagePaylog = document.getElementById('responseMessagePaylog');
const loadingSpinnerPaylog = document.getElementById('loadingSpinnerPaylog');

let MaintCache = [];

// --- Utility Functions for UI Updates ---

function appendMaintenanceLog(message) {
    maintenanceLogArea.textContent += message + '\n';
    maintenanceLogArea.scrollTop = maintenanceLogArea.scrollHeight; // Auto-scroll to bottom
}

// --- Data Management Functions ---

// Clears all fields in a specific row
function clearPaylogRowFields(row) {
    row.querySelectorAll('input, textarea, select').forEach(element => {
        element.value = '';
        element.classList.remove('is-invalid'); // Clear validation styles
        const feedback = element.nextElementSibling;
        if (feedback && feedback.classList.contains('invalid-feedback')) {
            feedback.textContent = '';
        }
    });
    // Clear the total field explicitly
    const totalInput = row.querySelector('input[name="total_maintenance_amount"]');
    if (totalInput) totalInput.value = '';
    // Also clear the dataset ID if it's a previously saved row
    row.dataset.id = '';
    row.dataset.maintenanceData = ''; // Clear stored maintenance data
}

// Calculates the total maintenance amount for a given row's data
function calculateMaintenanceTotalPaylog(row, rowData) {
    const fields = [
        'periodic_building_maintenance', 'repair_and_maintenance_fund',
        'sinking_funds', 'parking', 'penalty', 'lease_rent', 'balance', 'charge_standin'
    ];

     let total = 0;
        let chrtotal
        fields.forEach(field => {
            if(field ==='charge_standin'){
                chrtotal = 0;
                row.querySelectorAll('.extra-charge-input').forEach(value => {
                val = parseFloat(value.value);
                chrtotal += val;
                });
                total += chrtotal;
            }
            else{
                const value = parseFloat(rowData[field]) || 0;
                total += value;
            }

        });
        return total.toFixed(2);
}

function multiMonths(row){
    const maintenanceData = JSON.parse(row.dataset.maintenanceData);
    const fieldstoMulti = [
        'periodic_building_maintenance', 'repair_and_maintenance_fund',
        'sinking_funds', 'parking', 'lease_rent'
    ];
    const mnths = row.querySelector('[name="months_covered"]').value;
    fieldstoMulti.forEach(fieldName => {
        const input = row.querySelector(`[name="${fieldName}"]`);
        if (mnths == 1){
            input.value = parseFloat(maintenanceData[fieldName]).toFixed(2);
        }
        input.value = parseFloat(maintenanceData[fieldName]*mnths).toFixed(2) || 0;
    });

    row.querySelectorAll('.extra-charge-input').forEach(input => {
        if (maintenanceData.additional_charges) {
                Object.entries(maintenanceData.additional_charges).forEach(([key, val]) => {
                    const input = row.querySelector(`[name="${key}"]`);
                    if (mnths == 1 && input) {
                        input.value = parseFloat(val || 0).toFixed(2);
                    }
                    input.value = parseFloat(val*mnths).toFixed(2) || 0;
                });
            }
    });
    updateRowTotalPaylog(row);
}

// Adds a new empty row to the payments table
async function addPaymentRow() {
    await fetchallMaintData();
    await renderPaylogHeader();
    const newRow = paymentsLogTableBody.insertRow();
    newRow.dataset.id = ''; // No ID yet, will be set after saving
    newRow.dataset.maintenanceData = ''; // ID of the MaintenanceData entry
    newRow.classList.add('fade-in');


    const today = new Date().toISOString().split('T')[0]; // Current date for payment date
    // Payment modes, including a new "CHEQUE" option
    const paymentModes = ["CASH", "UPI", "IMPS", "NEFT", "CHEQUE"];

    const fields = [
        { name: 'room_no', type: 'select', options: MaintCache, placeholder: 'Room No.', required: true},
        //{ name: 'room_no', type: 'text', placeholder: 'Room No.', required: true },
        { name: 'owners', type: 'text', readonly: true },
        { name: 'date_made', type: 'date', value: today },
        { name: 'months_covered', type: 'text', placeholder: 'e.g.: 2', value:1, required: true },
        { name: 'period_covered', type: 'text', placeholder: 'e.g., AUG-SEP 2024', required: true },
        { name: 'space', type: 'text', readonly: true },
        { name: 'periodic_building_maintenance', type: 'number', readonly: true },
        { name: 'repair_and_maintenance_fund', type: 'number', readonly: true },
        { name: 'sinking_funds', type: 'number', readonly: true },
        { name: 'charge_standin', type:'standin' }, //new
        { name: 'additional_charges', type: 'standin', id:'chrge' }, //new
        { name: 'parking', type: 'number'},
        { name: 'penalty', type: 'number'},
        { name: 'lease_rent', type: 'number'},
        { name: 'balance', type: 'number'},
        { name: 'total_maintenance_amount', type: 'number', readonly: true, isTotal: true },
        { name: 'payment_amount', type: 'number', step: '0.01', required: true },
        { name: 'payment_date', type: 'date', value: today, required: true },
        { name: 'payment_mode', type: 'select', options: paymentModes, required: true },
        { name: 'cheque_num', type: 'number', placeholder: 'Cheque No.', min: '0', style: 'display: none;' },
        { name: 'cheque_draw_date', type: 'date', value: today, style: 'display: none;' },
    ];

    //checkbox new
    const selectCell = newRow.insertCell();
    selectCell.classList.add("select-cell");
    const selectCheckbox = document.createElement('input');
    selectCheckbox.type = 'checkbox';
    selectCheckbox.classList.add('row-select-checkbox', 'ms-2'); // add spacing
    selectCell.appendChild(selectCheckbox);

    fields.forEach(field => {
        const cell = newRow.insertCell();
        let element;

        if (field.type === 'textarea') {
            element = document.createElement('textarea');
            element.rows = field.rows || 1;
            element.placeholder = field.placeholder || '';
        } else if (field.type === 'select') {
            element = document.createElement('select');
            element.classList.add('form-select');

            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Select...';
            defaultOption.disabled = true;
            defaultOption.selected = true;
            element.appendChild(defaultOption);

            if(field.name === 'room_no'){
                MaintCache.forEach((room_no) => {
                    const option = document.createElement('option');
                    option.value = room_no.room;
                    option.textContent = room_no.room;
                    element.placeholder = field.placeholder || '';
                    element.appendChild(option);
                });
            }
            else{
                field.options.forEach(optionText => {
                const option = document.createElement('option');
                option.value = optionText;
                option.textContent = optionText;
                element.appendChild(option);
                });
            }
        }
        else {
            element = document.createElement('input');
            element.type = field.type;
            element.placeholder = field.placeholder || '';
            if (field.value) element.value = field.value;
            if (field.step) element.step = field.step;
            if (field.min) element.min = field.min; // Set min for number inputs
        }

        element.name = field.name;
        element.classList.add('form-control');
        if (field.readonly) element.readOnly = true;
        if (field.required) {
            element.required = true;
            element.addEventListener('input', () => {
                element.classList.remove('is-invalid');
                const feedback = element.nextElementSibling;
                if (feedback && feedback.classList.contains('invalid-feedback')) {
                    feedback.textContent = '';
                }
            });
            element.addEventListener('change', () => {
                element.classList.remove('is-invalid');
                const feedback = element.nextElementSibling;
                if (feedback && feedback.classList.contains('invalid-feedback')) {
                    feedback.textContent = '';
                }
            });
        }
        if (field.style) { // Apply inline styles for initial visibility
            element.style.cssText = field.style;
        }

        // Event listener for Room No. to trigger auto-fill
        if (field.name === 'room_no') {
            element.addEventListener('change', async (event) => {
                await fetchallMaintData();
                const roomNo = event.target.value.trim();
                if (roomNo) {
                    await fetchMaintenanceDataForRoom(newRow, roomNo);
                } else {
                    clearMaintenanceAutoFillFields(newRow);
                }
            });
        }
        else if (field.name === 'months_covered'){
                element.addEventListener('change', async (event) => {
                const mnths = event.target.value
                if (mnths) {
                    multiMonths(newRow);
                } else {
                    clearMaintenanceAutoFillFields(newRow);
                }
            });
        }
        else if(field.name === 'charge_standin'){
            EXTRA_CHARGE_KEYS.forEach(key => {
                createPaylogExtraChargeCell(newRow, key, 0);
            });
            cell.style.display = "none";
            return;
        }
        else if (field.id === 'chrge'){
            cell.style.display = "none";
            return;
        } //end
        // Event listener for numeric fields to update total
        else if (field.type === 'number' && !field.isTotal && !field.readonly) {
            element.addEventListener('input', () => updateRowTotalPaylog(newRow));
        }
        // Event listener for Payment Mode to show/hide Cheque fields
        else if (field.name === 'payment_mode') {
            element.addEventListener('change', (event) => {
                const selectedMode = event.target.value;
                const chequeNumInput = newRow.querySelector('[name="cheque_num"]');
                const chequeDrawDateInput = newRow.querySelector('[name="cheque_draw_date"]');

                if (selectedMode === 'CHEQUE') {
                    chequeNumInput.style.display = ''; // Show
                    chequeDrawDateInput.style.display = ''; // Show
                    chequeNumInput.required = true; // Make required
                    chequeDrawDateInput.required = true; // Make required
                } else {
                    chequeNumInput.style.display = 'none'; // Hide
                    chequeDrawDateInput.style.display = 'none'; // Hide
                    chequeNumInput.required = false; // Not required
                    chequeDrawDateInput.required = false; // Not required
                    // Optionally clear values if hidden
                    chequeNumInput.value = '0'; // Set to default 0
                    chequeDrawDateInput.value = today; // Set to today's date
                    chequeNumInput.classList.remove('is-invalid');
                    chequeDrawDateInput.classList.remove('is-invalid');
                    if (chequeNumInput.nextElementSibling && chequeNumInput.nextElementSibling.classList.contains('invalid-feedback')) {
                        chequeNumInput.nextElementSibling.textContent = '';
                    }
                    if (chequeDrawDateInput.nextElementSibling && chequeDrawDateInput.nextElementSibling.classList.contains('invalid-feedback')) {
                        chequeDrawDateInput.nextElementSibling.textContent = '';
                    }
                }
            });
        }

        cell.appendChild(element);
        // Add invalid feedback div for validation
        if (field.required) {
            const feedbackDiv = document.createElement('div');
            feedbackDiv.classList.add('invalid-feedback');
            cell.appendChild(feedbackDiv);
        }
    });

    // Action Column (Remove Button)
    const actionCell = newRow.insertCell();
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.classList.add('btn', 'btn-danger', 'btn-sm', 'remove-row-btn');
    const icon = document.createElement('i');
    icon.classList.add('fas', 'fa-trash-alt');
    removeBtn.appendChild(icon);
    removeBtn.addEventListener('click', () => removePaymentRow(newRow));
    actionCell.appendChild(removeBtn);

    // Set focus on the first input of the new row
    //newRow.querySelector('input[name="room_no"]').focus();
}

async function renderPaylogHeader(key=null){
const thead = document.querySelector('#paymentsLogTable thead tr');
    thead.innerHTML = `
        <th><input type="checkbox" id="selectAllPaylogCheckbox"></th>
        <th>Room No</th>
        <th>Owners</th>
        <th>Date Made</th>
        <th>Months</th>
        <th>Period Covered</th>
        <th>Space</th>
        <th>PBM</th>
        <th>RMF</th>
        <th>Sinking Funds</th>
    `;

        EXTRA_CHARGE_KEYS.forEach(chargeName => {
            thead.innerHTML += `<th>${chargeName}</th>`;
        });

        if(key){
            thead.innerHTML += `<th>${key}</th>`;
        }

    thead.innerHTML += `
        <th>Parking</th>
        <th>Penalty</th>
        <th>Lease Rent</th>
        <th>Balance</th>
        <th>Total Due</th>
        <th>Payment Amount</th>
        <th>Payment Date</th>
        <th>Payment Mode</th>
        <th>Cheque Number</th>
        <th>Cheque Draw Date</th>
        <th></th>
        `;

    initBulkCheckboxHandlers(
            "paymentsLogTable",      // tableId
            "selectAllPaylogCheckbox",         // select-all checkbox
            "paylog-bulkDeleteBtn",            // bulk delete button
            removePaymentRow  // your row delete function (id, rowElement)
        );
}

function createPaylogExtraChargeCell(row, key, value, ind=null) {
        if(ind){const cell = row.insertCell(ind);
            const input = document.createElement('input');
            input.type = 'number';
            input.name = key;
            input.value = value || '';
            input.readOnly = true;
            input.classList.add('form-control', 'extra-charge-input');
            cell.appendChild(input);
        }
        else{
            const cell = row.insertCell();
            const input = document.createElement('input');
            input.type = 'number';
            input.name = key;
            input.value = value || '';
            input.readOnly = true;
            input.classList.add('form-control', 'extra-charge-input');
            cell.appendChild(input);
        }
    }

// Clears only the auto-filled maintenance data fields for a given row
function clearMaintenanceAutoFillFields(row) {
    const fieldsToClear = [
        'owners', 'space', 'periodic_building_maintenance', 'repair_and_maintenance_fund',
        'sinking_funds', 'parking', 'penalty', 'lease_rent', 'balance', 'total_maintenance_amount'
    ];
    fieldsToClear.forEach(fieldName => {
        const input = row.querySelector(`[name="${fieldName}"]`);
        if (input) input.value = '';
    });
    row.dataset.maintenanceData = ''; // Clear stored data
}

async function fetchallMaintData() {
    const entriesResponse = await fetch(`${API_BASE_URL}maintenance-data-new/`);
    if (!entriesResponse.ok) throw new Error(`HTTP error! status: ${entriesResponse.status} for maintenance entries`);
    MaintCache = await entriesResponse.json();
}

// Fetches maintenance data for a given room number and populates the row
async function fetchMaintenanceDataForRoom(row, roomNo) {
    showLoading(loadingSpinnerPaylog, responseMessagePaylog, `Fetching data for Room: ${roomNo}...`);
    try {
        const response = await fetch(`${API_BASE_URL}maintenance-data-new/?room=${roomNo}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json(); // data will be a list of objects

        if (data && data.length > 0) {
            const maintenanceData = data[0]; // Get the first matching object
            // Store the fetched maintenance data on the row for later use in submission
            row.dataset.maintenanceData = JSON.stringify(maintenanceData);
            const months = row.querySelector('[name="months_covered"]').value
            row.querySelector('[name="owners"]').value = maintenanceData.owners || '';
            row.querySelector('[name="space"]').value = maintenanceData.space_type_val || '';
            row.querySelector('[name="periodic_building_maintenance"]').value = parseFloat(maintenanceData.periodic_building_maintenance || 0).toFixed(2);
            row.querySelector('[name="repair_and_maintenance_fund"]').value = parseFloat(maintenanceData.repair_and_maintenance_fund || 0).toFixed(2);
            row.querySelector('[name="sinking_funds"]').value = parseFloat(maintenanceData.sinking_funds || 0).toFixed(2);
            row.querySelector('[name="parking"]').value = parseFloat(maintenanceData.parking || 0).toFixed(2);
            row.querySelector('[name="penalty"]').value = parseFloat(maintenanceData.penalty || 0).toFixed(2);
            row.querySelector('[name="lease_rent"]').value = parseFloat(maintenanceData.lease_rent || 0).toFixed(2);
            row.querySelector('[name="balance"]').value = parseFloat(maintenanceData.balance || 0).toFixed(2);
            row.querySelector('[name="total_maintenance_amount"]').value = parseFloat(maintenanceData.total || 0).toFixed(2);
            if (maintenanceData.additional_charges) {
                    Object.entries(maintenanceData.additional_charges).forEach(([key, val]) => {
                        const input = row.querySelector(`[name="${key}"]`);
                        if (input) {
                            input.value = parseFloat(val || 0).toFixed(2);
                        }
                        else{
                            renderPaylogHeader(key);
                            createPaylogExtraChargeCell(row, key, val, ind=13);
                        }
                    });
                }
            renderPaylogHeader();
            updateRowTotalPaylog(row); // Calculate and update the total field
            hideLoading(loadingSpinnerPaylog, responseMessagePaylog, `Data auto-filled for Room: ${roomNo}`);
        } else {
            clearMaintenanceAutoFillFields(row);
            hideLoading(loadingSpinnerPaylog, responseMessagePaylog, `No maintenance data found for Room: ${roomNo}`, true);
            showCustomModal("Information", `No maintenance data found for Room: ${roomNo}. Please check the room number.`, true);
        }
    } catch (error) {
        //clearMaintenanceAutoFillFields(row);
        hideLoading(loadingSpinnerPaylog, responseMessagePaylog, `Error fetching maintenance data: ${error.message}`, true);
        console.error('Error fetching maintenance data for log:', error);
        showCustomModal("Error", `Error fetching maintenance data: ${error.message}`, true);
    }
}

// Updates the 'Total Due' field for a specific row
function updateRowTotalPaylog(row) {
    const rowData = {};
    const numericFieldsForTotal = [
        'periodic_building_maintenance', 'repair_and_maintenance_fund',
        'sinking_funds', 'parking', 'penalty', 'lease_rent', 'balance'
    ];
    numericFieldsForTotal.forEach(fieldName => {
        const input = row.querySelector(`[name="${fieldName}"]`);
        rowData[fieldName] = parseFloat(input.value) || 0;
    });

    const total = calculateMaintenanceTotalPaylog(row, rowData);
    const totalInput = row.querySelector('[name="total_maintenance_amount"]');
    if (totalInput) {
        totalInput.value = total;
    }
}

// Removes a payment row from the table
function removePaymentRow(rowElement) {
    if (paymentsLogTableBody.rows.length > 1) { // Ensure at least one row remains
        rowElement.remove();
        appendMaintenanceLog("Row removed.");
    } else {
        showCustomModal("Warning", "Cannot remove the last row. Please clear fields instead if you wish to reset.", false);
        appendMaintenanceLog("Attempted to remove last row, but denied.");
    }
}

// --- Validation Function ---
function validateRow(row) {
    let isValid = true;
    const requiredFields = [
        { name: 'room_no', display: 'Room No.' },
        { name: 'months_covered', display: 'Months Covered' },
        { name: 'period_covered', display: 'Period Covered' },
        { name: 'payment_date', display: 'Payment Date' },
        { name: 'payment_mode', display: 'Payment Mode' },
        { name: 'payment_amount', display: 'Payment Amount' }
    ];

    // Clear previous validation messages and classes for this row
    row.querySelectorAll('.is-invalid').forEach(element => element.classList.remove('is-invalid'));
    row.querySelectorAll('.invalid-feedback').forEach(feedback => feedback.textContent = '');

    for (const field of requiredFields) {
        const element = row.querySelector(`[name="${field.name}"]`);
        const feedback = element.nextElementSibling;

        if (!element.value.trim() || (field.name === 'payment_mode' && element.value === '')) {
            element.classList.add('is-invalid');
            if (feedback) feedback.textContent = `${field.display} is required.`;
            isValid = false;
        } else if (field.name === 'payment_amount' && isNaN(parseFloat(element.value))) {
            element.classList.add('is-invalid');
            if (feedback) feedback.textContent = `Payment Amount must be a number.`;
            isValid = false;
        }
    }

    // Specific validation for Cheque fields if payment mode is CHEQUE
    const paymentModeElement = row.querySelector('[name="payment_mode"]');
    if (paymentModeElement && paymentModeElement.value === 'CHEQUE') {
        const chequeNumElement = row.querySelector('[name="cheque_num"]');
        const chequeDrawDateElement = row.querySelector('[name="cheque_draw_date"]');

        if (!chequeNumElement.value.trim() || isNaN(parseInt(chequeNumElement.value))) {
            chequeNumElement.classList.add('is-invalid');
            if (chequeNumElement.nextElementSibling) chequeNumElement.nextElementSibling.textContent = `Cheque Number is required and must be a number.`;
            isValid = false;
        }
        if (!chequeDrawDateElement.value.trim()) {
            chequeDrawDateElement.classList.add('is-invalid');
            if (chequeDrawDateElement.nextElementSibling) chequeDrawDateElement.nextElementSibling.textContent = `Cheque Draw Date is required.`;
            isValid = false;
        }
    }


    // Check if maintenance data is auto-filled
    if (!row.dataset.maintenanceData || row.dataset.maintenanceData === '{}') {
        const roomNoInput = row.querySelector('[name="room_no"]');
        const feedback = roomNoInput.nextElementSibling;
        roomNoInput.classList.add('is-invalid');
        if (feedback) feedback.textContent = `Please enter a valid Room No. to auto-fill maintenance data.`;
        isValid = false;
    }
    const extraChargeInputs = row.querySelectorAll('.extra-charge-input');
    extraChargeInputs.forEach(input => {
        const value = parseFloat(input.value);
        if (isNaN(value) || value < 0) {
            input.classList.add('is-invalid');
            const feedback = input.nextElementSibling;
            if (feedback) feedback.textContent = `${input.name} must be a valid non-negative number.`;
            isValid = false;
        } else {
            input.classList.remove('is-invalid');
            const feedback = input.nextElementSibling;
            if (feedback) feedback.textContent = '';
        }
    });

    return isValid;
}


// Collects all payment data from the table for batch submission
function getAllPaymentDataForSubmission() {
    const payments = [];
    const rows = paymentsLogTableBody.querySelectorAll('tr');
    let allRowsValid = true;
    //updateRowTotal(rows);

    rows.forEach(row => {
        const rowIsValid = validateRow(row);
        if (!rowIsValid) {
            allRowsValid = false;
            appendMaintenanceLog(`Validation failed for a row. Please correct the errors.`);
            return;
        }

        const roomNoInput = row.querySelector('[name="room_no"]');
        const dateMadeInput = row.querySelector('[name="date_made"]');
        const monthsCoveredInput = row.querySelector('[name="months_covered"]');
        const periodCoveredInput = row.querySelector('[name="period_covered"]');
        const parkingInput = row.querySelector('[name="parking"]');
        const penaltyInput = row.querySelector('[name="penalty"]');
        const lrInput = row.querySelector('[name="lease_rent"]');
        const balanceInput = row.querySelector('[name="balance"]');
        const paymentDateInput = row.querySelector('[name="payment_date"]');
        const paymentModeInput = row.querySelector('[name="payment_mode"]');
        const paymentAmountInput = row.querySelector('[name="payment_amount"]');
        const chequeNumInput = row.querySelector('[name="cheque_num"]');
        const chequeDrawDateInput = row.querySelector('[name="cheque_draw_date"]');

        const maintenanceDataString = row.dataset.maintenanceData;
        const maintenanceData = JSON.parse(maintenanceDataString);

        // Collect additional charges from the row
        let additionalCharges = {};
        row.querySelectorAll('.extra-charge-input').forEach(input => {
            additionalCharges[input.name] = parseFloat(input.value) || 0;
        });

        // Construct the payment object for the API
        payments.push({
            room_no: roomNoInput.value.trim(),
            owners: maintenanceData.owners,
            date_made: dateMadeInput.value,
            months: monthsCoveredInput.value,
            period: periodCoveredInput.value.trim(),
            space: maintenanceData.space_type_val,
            periodic_building_maintenance: parseFloat(maintenanceData.periodic_building_maintenance*monthsCoveredInput.value),
            repair_and_maintenance_fund: parseFloat(maintenanceData.repair_and_maintenance_fund*monthsCoveredInput.value),
            sinking_funds: parseFloat(maintenanceData.sinking_funds*monthsCoveredInput.value),
            additional_charges: additionalCharges,
            parking: parseFloat(maintenanceData.parking*monthsCoveredInput.value),
            penalty: parseFloat(penaltyInput.value),
            lease_rent: parseFloat(maintenanceData.lease_rent*monthsCoveredInput.value),
            balance: parseFloat(balanceInput.value),
            total_maintenance_amount: parseFloat(row.querySelector('[name="total_maintenance_amount"]').value),
            payment_amount: parseFloat(paymentAmountInput.value),
            payment_date: paymentDateInput.value,
            payment_mode: paymentModeInput.value.trim(),
            cheque_num: paymentModeInput.value === 'CHEQUE' ? parseInt(chequeNumInput.value) : 0,
            cheque_draw_date: paymentModeInput.value === 'CHEQUE' ? chequeDrawDateInput.value : null,
        });
    });
    return allRowsValid ? payments : [];
}

// --- Event Handlers ---

// Handles logging all payments in the table
logAllPaymentsBtn.addEventListener('click', async () => {
    const paymentsToSubmit = getAllPaymentDataForSubmission();

    if (paymentsToSubmit.length === 0) {
        hideLoading(loadingSpinnerPaylog, responseMessagePaylog, 'No valid payments to submit. Please correct errors.', true);
        appendMaintenanceLog('Submission aborted: No valid payments found or validation failed.');
        return;
    }

    showLoading(loadingSpinnerPaylog, responseMessagePaylog, `Submitting ${paymentsToSubmit.length} payments...`);
    appendMaintenanceLog(`Attempting to submit ${paymentsToSubmit.length} payments.`);

    try {
        const response = await fetch(`${API_BASE_URL}pay-log/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),
            },
            body: JSON.stringify(paymentsToSubmit)
        });

        if (!response.ok) {
            const responseText = await response.text();
            let errorDetails = `Status: ${response.status}`;
            try {
                const errorData = JSON.parse(responseText);
                errorDetails += `. Details: ${JSON.stringify(errorData)}`;
            } catch (jsonError) {
                errorDetails += `. Response: ${responseText}`;
            }
            throw new Error(`HTTP error! ${errorDetails}`);
        }

        const result = await response.json();
        hideLoading(loadingSpinnerPaylog, responseMessagePaylog, `Successfully logged ${result.length} payments!`, false);
        appendMaintenanceLog(`Batch payment successful. Total records created: ${result.length}`);

        paymentsLogTableBody.innerHTML = '';
        addPaymentRow();
    } catch (error) {
        hideLoading(loadingSpinnerPaylog, responseMessagePaylog, `Error logging payments: ${error.message}`, true);
        console.error('Error logging batch payments:', error);
        showCustomModal("Error", `Failed to log payments. Error: ${error.message}`, true);
    }
});

document.addEventListener('DOMContentLoaded', (async () => {
    await fetchallMaintData();
}));
document.addEventListener('DOMContentLoaded', addPaymentRow);
// Add a new row when the "Add New Row" button is clicked
addPaylogRowBtn.addEventListener('click', addPaymentRow);