// index
    const roomMaintenanceTableBody = document.querySelector('#roomMaintenanceTable tbody');
    const addMaintRowBtn = document.getElementById('addMaintRowBtn');
    const refreshMaintBtn = document.getElementById('refreshMaintBtn');

    const loginPage = document.getElementById('loginPage');
    const mainApp = document.getElementById('mainApp');
    const usernameInput = document.getElementById('usernameInput');
    const passwordInput = document.getElementById('passwordInput');
    const loginBtn = document.getElementById('loginBtn');
    const loginMessage = document.getElementById('loginMessage');
    const logoutBtn = document.getElementById('logoutBtn');

    let spacewiseChargesCache = []; // To store spacewise charges for auto-filling

    async function fetchInitialMaintenanceData() {
        showLoading("Loading data...");
        try {
            // Fetch spacewise charges first to populate the dropdowns
            // const spacewiseResponse = await authenticatedFetch(`${API_BASE_URL}charges/`);
            const spacewiseResponse = await fetch(`${API_BASE_URL}charges/`);
            if (!spacewiseResponse.ok) throw new Error(`HTTP error! status: ${spacewiseResponse.status} for spacewise charges`);
            spacewiseChargesCache = await spacewiseResponse.json();

            // Then fetch room maintenance entries
            // const entriesResponse = await authenticatedFetch(`${API_BASE_URL}maintenance-data-new/`);
            const entriesResponse = await fetch(`${API_BASE_URL}maintenance-data-new/`);
            if (!entriesResponse.ok) throw new Error(`HTTP error! status: ${entriesResponse.status} for maintenance entries`);
            const entriesData = await entriesResponse.json();
            
            renderMaintenanceTable(entriesData);
            hideLoading("Data loaded successfully!");
        } catch (error) {
            hideLoading(`Error loading data: ${error.message}`, true);
            console.error("Error fetching initial data:", error);
            showCustomModal("Error", `Failed to load initial data. Error: ${error.message}`, true);
        }
    }

    function renderMaintenanceTable(data) {
        roomMaintenanceTableBody.innerHTML = '';
        data.forEach(rowData => {
        addMaintenanceTableRow(rowData);
        });
        if (data.length === 0) {
            addMaintenanceTableRow({}); // Add an empty row for new entry if no data
        }
    }

    function isSpaceTypeSelected(row) {
        const spaceTypeSelect = row.querySelector('[name="space_type"]');
        return spaceTypeSelect && spaceTypeSelect.value !== '';
    }

    function updateFieldsAccessibility(row, enableFields = false) {
        const fieldsToControl = [
            'room', 'owners', 'periodic_building_maintenance', 'repair_and_maintenance_fund',
            'sinking_funds', 'num_of_vehicles', 'parking', 'lease_rent',
            'apply_lease_rent', 'penalty', 'balance'
        ];
        
        fieldsToControl.forEach(fieldName => {
            const field = row.querySelector(`[name="${fieldName}"]`);
            if (field) {
                if (enableFields) {
                    field.disabled = false;
                    field.classList.remove('disabled-field');
                } else {
                    field.disabled = true;
                    field.classList.add('disabled-field');
                    // Keep readonly fields as readonly
                    if (field.readOnly) {
                        field.disabled = false; // readonly fields should not be disabled
                    }
                }
            }
        });
    }

    function calculateMaintenanceTotal(rowData) {
        const fields = [
            'periodic_building_maintenance', 'repair_and_maintenance_fund',
            'sinking_funds', 'parking', 'lease_rent',
            'penalty', 'balance'
        ];
        let total = 0;
        fields.forEach(field => {
            const value = parseFloat(rowData[field]) || 0;
            total += value;
        });
        return total.toFixed(2);
    }

    function addMaintenanceTableRow(rowData = {}) {
        const newRow = roomMaintenanceTableBody.insertRow();
        newRow.dataset.id = rowData.id || '';

        const initialApplyLeaseRent = (rowData.apply_lease_rent === undefined || rowData.apply_lease_rent === null) ? true : rowData.apply_lease_rent;
        const initialNumVehicles = rowData.num_of_vehicles !== undefined ? rowData.num_of_vehicles : 0;

        // Check if space type is already selected (for existing data)
        const isExistingDataWithSpaceType = rowData.space_type ? true : false;

        const fields = [
            { name: 'room', type: 'text', value: rowData.room || '', disabled: !isExistingDataWithSpaceType },
            { name: 'owners', type: 'text', value: rowData.owners || '', disabled: !isExistingDataWithSpaceType },
            { name: 'space_type', type: 'select', value: rowData.space_type || '', options: spacewiseChargesCache },
            { name: 'periodic_building_maintenance', type: 'number', value: parseFloat(rowData.periodic_building_maintenance || 0).toFixed(2), readonly: true },
            { name: 'repair_and_maintenance_fund', type: 'number', value: parseFloat(rowData.repair_and_maintenance_fund || 0).toFixed(2), readonly: true },
            { name: 'sinking_funds', type: 'number', value: parseFloat(rowData.sinking_funds || 0).toFixed(2), readonly: true },
            { name: 'num_of_vehicles', type: 'select_num_vehicles', value: initialNumVehicles, disabled: !isExistingDataWithSpaceType },
            { name: 'parking', type: 'number', value: parseFloat(rowData.parking || 0).toFixed(2), readonly: true },
            { name: 'lease_rent', type: 'number', value: parseFloat(rowData.lease_rent || 0).toFixed(2), readonly: true },
            { name: 'apply_lease_rent', type: 'select_boolean', value: initialApplyLeaseRent, disabled: !isExistingDataWithSpaceType },
            { name: 'penalty', type: 'number', value: parseFloat(rowData.penalty || 0).toFixed(2), disabled: !isExistingDataWithSpaceType },
            { name: 'balance', type: 'number', value: parseFloat(rowData.balance || 0).toFixed(2), disabled: !isExistingDataWithSpaceType },
            { name: 'total', type: 'number', value: parseFloat(rowData.total || 0).toFixed(2), readonly: true }
        ];

        fields.forEach(field => {
            const cell = newRow.insertCell();
            let element;

            if (field.type === 'select') {
                element = document.createElement('select');
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = 'Select Space Type First';
                defaultOption.disabled = true;
                if (!field.value) {
                    defaultOption.selected = true;
                }
                element.appendChild(defaultOption);

                field.options.forEach(spaceCharge => {
                    const option = document.createElement('option');
                    option.value = spaceCharge.id;
                    option.textContent = spaceCharge.space_type;
                    if (rowData.space_type === spaceCharge.id || rowData.space_type_display === spaceCharge.space_type) {
                        option.selected = true;
                    }
                    element.appendChild(option);
                });
                element.value = field.value;

                // Modified event listener for space type
                element.addEventListener('change', (event) => {
                    const spaceTypeSelected = event.target.value !== '';
                    
                    // Enable/disable all other fields based on space type selection
                    updateFieldsAccessibility(newRow, spaceTypeSelected);
                    
                    if (spaceTypeSelected) {
                        const currentApplyLeaseRent = newRow.querySelector('[name="apply_lease_rent"]').value === 'true';
                        const currentNumOfVehicles = parseInt(newRow.querySelector('[name="num_of_vehicles"]').value);
                        autoFillMaintenanceCharges(newRow, event.target.value, currentApplyLeaseRent, currentNumOfVehicles);
                        updateMaintenanceRowTotal(newRow);
                        
                        // Focus on room field after space type is selected
                        const roomField = newRow.querySelector('[name="room"]');
                        if (roomField && !roomField.value) {
                            roomField.focus();
                        }
                        
                        // Don't save yet if it's a new row without room number
                        if (newRow.dataset.id || newRow.querySelector('[name="room"]').value) {
                            saveMaintenanceRowData(newRow, event.target.name, event.target.value);
                        }
                    } else {
                        // Clear all fields if space type is deselected
                        clearMaintenanceRowFields(newRow);
                    }
                });

            } else if (field.type === 'select_boolean') {
                element = document.createElement('select');
                element.classList.add('form-select');
                
                const optionYes = document.createElement('option');
                optionYes.value = 'true';
                optionYes.textContent = 'Yes';
                element.appendChild(optionYes);

                const optionNo = document.createElement('option');
                optionNo.value = 'false';
                optionNo.textContent = 'No';
                element.appendChild(optionNo);

                element.value = field.value ? 'true' : 'false';
                if (field.disabled) element.disabled = true;

                element.addEventListener('change', (event) => {
                    if (!isSpaceTypeSelected(newRow)) {
                        showCustomModal("Warning", "Please select a Space Type first.", true);
                        event.target.value = field.value ? 'true' : 'false';
                        return;
                    }
                    
                    const currentSpaceTypeId = newRow.querySelector('[name="space_type"]').value;
                    const currentNumOfVehicles = parseInt(newRow.querySelector('[name="num_of_vehicles"]').value);
                    const newApplyLeaseRent = event.target.value === 'true';
                    autoFillMaintenanceCharges(newRow, currentSpaceTypeId, newApplyLeaseRent, currentNumOfVehicles);
                    updateMaintenanceRowTotal(newRow);
                    saveMaintenanceRowData(newRow, event.target.name, newApplyLeaseRent);
                });

            } else if (field.type === 'select_num_vehicles') {
                element = document.createElement('select');
                element.classList.add('form-select');
                
                const defaultNumVehiclesOption = document.createElement('option');
                defaultNumVehiclesOption.value = '0';
                defaultNumVehiclesOption.textContent = '0 Vehicles';
                element.appendChild(defaultNumVehiclesOption);

                for (let i = 1; i <= 3; i++) {
                    const option = document.createElement('option');
                    option.value = String(i);
                    option.textContent = `${i} Vehicle(s)`;
                    element.appendChild(option);
                }

                element.value = field.value;
                if (field.disabled) element.disabled = true;

                element.addEventListener('change', (event) => {
                    if (!isSpaceTypeSelected(newRow)) {
                        showCustomModal("Warning", "Please select a Space Type first.", true);
                        event.target.value = '0';
                        return;
                    }
                    
                    const currentSpaceTypeId = newRow.querySelector('[name="space_type"]').value;
                    const currentApplyLeaseRent = newRow.querySelector('[name="apply_lease_rent"]').value === 'true';
                    const newNumOfVehicles = parseInt(event.target.value);
                    autoFillMaintenanceCharges(newRow, currentSpaceTypeId, currentApplyLeaseRent, newNumOfVehicles);
                    updateMaintenanceRowTotal(newRow);
                    saveMaintenanceRowData(newRow, event.target.name, newNumOfVehicles);
                });

            } else {
                element = document.createElement('input');
                element.type = field.type;
                element.value = field.value;
                if (field.readonly) element.readOnly = true;
                if (field.disabled) element.disabled = true;
            }

            element.name = field.name;
            element.classList.add('form-control');
            
            // if (!field.readonly && field.name !== 'apply_lease_rent' && field.name !== 'num_of_vehicles')
                if (
                !field.readonly &&
                field.name !== 'apply_lease_rent' &&
                field.name !== 'num_of_vehicles' &&
                field.name !== 'space_type'   //
                )  {
                // Add validation for ALL input fields including room
                element.addEventListener('focus', (event) => {
                    if (!isSpaceTypeSelected(newRow)) {
                        showCustomModal("Warning", "Please select a Space Type first before entering any data.", true);
                        newRow.querySelector('[name="space_type"]').focus();
                        event.preventDefault();
                    }
                });
                
                element.addEventListener('change', async (event) => {
                    if (!isSpaceTypeSelected(newRow)) {
                        event.target.value = field.value || '';
                        return;
                    }
                    await saveMaintenanceRowData(newRow, event.target.name, event.target.value);
                });
                
                if (field.name === 'penalty' || field.name === 'balance') {
                    element.addEventListener('input', () => {
                        if (isSpaceTypeSelected(newRow)) {
                            updateMaintenanceRowTotal(newRow);
                        }
                    });
                }
            }
            
            cell.appendChild(element);
        });

        // Add the action cell (delete button)
        const actionCell = newRow.insertCell();
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.classList.add('btn', 'btn-danger', 'btn-sm', 'remove-row-btn');
        const icon = document.createElement('i');
        icon.classList.add('fas', 'fa-trash-alt');
        removeBtn.appendChild(icon);

        removeBtn.addEventListener('click', async () => {
            const rowId = newRow.dataset.id;
            const roomName = rowData.room || 'this unsaved row';
            
            if (rowId) {
                const confirmationModal = document.createElement('div');
                confirmationModal.innerHTML = `
                    <div class="modal fade" id="deleteConfirmModal-${rowId}" tabindex="-1" aria-labelledby="deleteConfirmModalLabel" aria-hidden="true">
                        <div class="modal-dialog modal-dialog-centered">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title" id="deleteConfirmModalLabel">Confirm Deletion</h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                </div>
                                <div class="modal-body">
                                    Are you sure you want to delete the entry for Room **${roomName}**? This action cannot be undone.
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                    <button type="button" class="btn btn-danger" id="confirmDeleteBtn-${rowId}">Delete</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                document.body.appendChild(confirmationModal);

                const modal = new bootstrap.Modal(confirmationModal.querySelector('.modal'));
                modal.show();

                document.getElementById(`confirmDeleteBtn-${rowId}`).addEventListener('click', async () => {
                    await deleteMaintenanceRowData(rowId, newRow);
                    modal.hide();
                    confirmationModal.remove();
                });
            } else {
                newRow.remove();
                hideLoading("Unsaved row removed.", false);
            }
        });
        actionCell.appendChild(removeBtn);

        // Focus on space type field for new rows
        if (!rowData.id) {
            const spaceTypeField = newRow.querySelector('[name="space_type"]');
            if (spaceTypeField) {
                spaceTypeField.focus();
                // Add visual emphasis to space type field
                spaceTypeField.classList.add('emphasis-field');
            }
        }
        
        // Only auto-fill if there's existing data with space type
        if (rowData.space_type) {
            autoFillMaintenanceCharges(newRow, rowData.space_type, initialApplyLeaseRent, initialNumVehicles);
        } else {
            updateMaintenanceRowTotal(newRow);
        }
    }
    
    function clearMaintenanceRowFields(row) {
        const fields = ['room','owners','periodic_building_maintenance','repair_and_maintenance_fund',
                        'sinking_funds','num_of_vehicles','parking','lease_rent',
                        'apply_lease_rent','penalty','balance','total'];
        fields.forEach(name => {
            const el = row.querySelector(`[name="${name}"]`);
            if (el) el.value = '';
        });
        }

    function autoFillMaintenanceCharges(row, spaceTypeId, applyLeaseRent, num_of_vehicles) {
        const selectedSpaceType = spacewiseChargesCache.find(sc => sc.id == spaceTypeId);
        const leaseRentInput = row.querySelector('[name="lease_rent"]');
        const parkingInput = row.querySelector('[name="parking"]');
        const numVehiclesSelect = row.querySelector('[name="num_of_vehicles"]');
        
        // Rebuild num_of_vehicles dropdown based on selected space type's parking rates
        numVehiclesSelect.innerHTML = '';
        const defaultNumVehiclesOption = document.createElement('option');
        defaultNumVehiclesOption.value = '0';
        defaultNumVehiclesOption.textContent = '0 Vehicles';
        numVehiclesSelect.appendChild(defaultNumVehiclesOption);

        let currentParkingRates = {};

        if (selectedSpaceType) {
            row.querySelector('[name="periodic_building_maintenance"]').value = parseFloat(selectedSpaceType.periodic_building_maintenance || 0).toFixed(2);
            row.querySelector('[name="repair_and_maintenance_fund"]').value = parseFloat(selectedSpaceType.repair_and_maintenance_fund || 0).toFixed(2);
            row.querySelector('[name="sinking_funds"]').value = parseFloat(selectedSpaceType.sinking_funds || 0).toFixed(2);
            
            // Lease Rent logic
            if (applyLeaseRent) {
                leaseRentInput.value = parseFloat(selectedSpaceType.lease_rent || 0).toFixed(2);
            } else {
                leaseRentInput.value = (0).toFixed(2);
            }

             // Parking logic - using JSON field from SpacewiseCharges
        const parkingRates = selectedSpaceType.parking || {};
        
        // Build dropdown options based on available parking rates in the JSON
            Object.keys(parkingRates).forEach(vehicleCount => {
                if (vehicleCount !== '0') { // Skip 0 as we already have it as default
                    const option = document.createElement('option');
                    option.value = vehicleCount;
                    option.textContent = `${vehicleCount} Vehicle(s)`;
                    numVehiclesSelect.appendChild(option);
                }
            });

        // Set the selected number of vehicles
         if (numVehiclesSelect.querySelector(`option[value="${num_of_vehicles}"]`)) {
              numVehiclesSelect.value = num_of_vehicles;
            } else {
              numVehiclesSelect.value = '0';
              num_of_vehicles = 0;
            }

        // Get parking rate from JSON using num_of_vehicles as key
            const parkingRate = parkingRates[String(num_of_vehicles)] || 0;
            parkingInput.value = parseFloat(parkingRate).toFixed(2);

        } else {
            const fieldsToClear = [
                'periodic_building_maintenance', 'repair_and_maintenance_fund',
                'sinking_funds'
            ];
            fieldsToClear.forEach(fieldName => {
                row.querySelector(`[name="${fieldName}"]`).value = (0).toFixed(2);
            });
            leaseRentInput.value = (0).toFixed(2);
            parkingInput.value = (0).toFixed(2);
            numVehiclesSelect.value = '0';
        }
        updateMaintenanceRowTotal(row);
    }

    function updateMaintenanceRowTotal(row) {
        const rowData = {};
        const fieldsForTotal = [
            'periodic_building_maintenance', 'repair_and_maintenance_fund',
            'sinking_funds', 'parking', 'lease_rent',
            'penalty', 'balance'
        ];
        fieldsForTotal.forEach(fieldName => {
            const input = row.querySelector(`[name="${fieldName}"]`);
            rowData[fieldName] = parseFloat(input.value) || 0;
        });

        const total = calculateMaintenanceTotal(rowData);
        const totalInput = row.querySelector('[name="total"]');
        if (totalInput) {
            totalInput.value = total;
        }
    }

    async function saveMaintenanceRowData(row, changedFieldName, changedValue) {
        const rowId = row.dataset.id;
        const rowData = {};
        
        
        row.querySelectorAll('input, select').forEach(element => {
            if (element.name === 'space_type') {
                const selectedSpaceType = spacewiseChargesCache.find(sc => sc.id == element.value);
                //console.log(selectedSpaceType.space_type, element.value);
                rowData[element.name] = element.value;
                rowData['space_type_val'] = selectedSpaceType.space_type;
            } else if (element.name === 'apply_lease_rent') {
                rowData[element.name] = element.value === 'true';
            } else if (element.name === 'num_of_vehicles') {
                rowData[element.name] = parseInt(element.value);
            }
            else {
                rowData[element.name] = element.type === 'number' ? parseFloat(element.value) : element.value.trim();
            }
        });

        if (!rowData.room) {
            showCustomModal("Validation Error", "Room No. cannot be empty.", true);
            return;
        }
        if (!rowData.owners) {
            showCustomModal("Validation Error", "Owners field cannot be empty.", true);
            return;
        }
        if (!rowData.space_type) {
            showCustomModal("Validation Error", "Space Type must be selected.", true);
            return;
        }

        showLoading("Saving data...");

        try {
            let method;
            let url;

            if (rowId) {
                method = 'PUT';
                url = `${API_BASE_URL}maintenance-data-new/${rowId}/`;
            } else {
                method = 'POST';
                url = `${API_BASE_URL}maintenance-data-new/`;
            }

            // const response = await authenticatedFetch(url, {
            //     method: method,
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(rowData)
            // });
            const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rowData)
            });

            if (!response.ok) {
                const contentType = response.headers.get('Content-Type');
                let errorDetails = `Status: ${response.status}`;
                let responseText = await response.text();
                
                if (contentType && contentType.includes('application/json')) {
                    try {
                        const errorData = JSON.parse(responseText);
                        errorDetails = JSON.stringify(errorData, null, 2);
                    } catch (e) {
                        console.error("Failed to parse error JSON:", e);
                        errorDetails = responseText;
                    }
                } else {
                    errorDetails = responseText;
                }
                throw new Error(`Server responded with an error: ${errorDetails}`);
            }

            const responseData = await response.json();
            row.dataset.id = responseData.id; // Update row ID for new entries
            
            // Re-populate the row with fresh data from the server to ensure consistency
            // This is crucial for parking and total, which are calculated on the backend
            //row.querySelector('[name="space_type"]').value = responseData.space_type;
            row.querySelector('[name="periodic_building_maintenance"]').value = parseFloat(responseData.periodic_building_maintenance || 0).toFixed(2);
            row.querySelector('[name="repair_and_maintenance_fund"]').value = parseFloat(responseData.repair_and_maintenance_fund || 0).toFixed(2);
            row.querySelector('[name="sinking_funds"]').value = parseFloat(responseData.sinking_funds || 0).toFixed(2);
            row.querySelector('[name="lease_rent"]').value = parseFloat(responseData.lease_rent || 0).toFixed(2);
            row.querySelector('[name="parking"]').value = parseFloat(responseData.parking || 0).toFixed(2);
            row.querySelector('[name="penalty"]').value = parseFloat(responseData.penalty || 0).toFixed(2);
            row.querySelector('[name="balance"]').value = parseFloat(responseData.balance || 0).toFixed(2);
            row.querySelector('[name="total"]').value = parseFloat(responseData.total || 0).toFixed(2);
            //console.log(responseData);
            hideLoading("Data saved successfully!");
        } catch (error) {
            hideLoading(`Failed to save data: ${error.message}`, true);
            console.error("Save error:", error);
            showCustomModal("Save Error", `There was an issue saving your data. Details: <pre>${error.message}</pre>`, true);
        }
    }

    async function deleteMaintenanceRowData(rowId, rowElement) {
        showLoading("Deleting data...");
        try {
            //const response = await authenticatedFetch(`${API_BASE_URL}maintenance-data-new/${rowId}/`, 
            const response = await fetch(`${API_BASE_URL}maintenance-data-new/${rowId}/`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            rowElement.remove();
            hideLoading("Entry deleted successfully!");
        } catch (error) {
            hideLoading(`Failed to delete data: ${error.message}`, true);
            console.error("Delete error:", error);
            showCustomModal("Delete Error", `Failed to delete the entry. Error: ${error.message}`, true);
        }
    }

    // Event Listeners
    // loginBtn.addEventListener('click', async () => {
    //     const username = usernameInput.value;
    //     const password = passwordInput.value;

    //     try {
    //         const response = await fetch(`${API_BASE_URL}token/`, {
    //             method: 'POST',
    //             headers: { 'Content-Type': 'application/json' },
    //             body: JSON.stringify({ username, password })
    //         });

    //         if (!response.ok) {
    //             const errorData = await response.json();
    //             loginMessage.textContent = errorData.detail || 'Login failed. Please check your credentials.';
    //             return;
    //         }

    //         const data = await response.json();
    //         localStorage.setItem('access_token', data.access);
    //         localStorage.setItem('refresh_token', data.refresh);
    //         loginMessage.textContent = '';
    //         checkAuthentication();
    //     } catch (error) {
    //         loginMessage.textContent = 'Network error or server unavailable.';
    //         console.error("Login error:", error);
    //     }
    // });

    // logoutBtn.addEventListener('click', logout);
    addMaintRowBtn.addEventListener('click', () => addMaintenanceTableRow({}));
    refreshMaintBtn.addEventListener('click', fetchInitialMaintenanceData);

    // Initial authentication check on page load
    // checkAuthentication();

    fetchInitialMaintenanceData();
