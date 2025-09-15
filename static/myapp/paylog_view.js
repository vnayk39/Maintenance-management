// paylog-view
        // DOM elements
        const paymentList = document.getElementById('paymentList');
        const detailContent = document.getElementById('detailContent');
        const searchBox = document.getElementById('searchBox');
        const refreshPayrecBtn = document.getElementById('refreshPayrecBtn');
        const listLoadingSpinner = document.getElementById('listLoadingSpinner');
        
        let isEditMode = false;
        let currentPayment = null;
        let allPayments = [];
        let chargedata = [];
        let filteredPayments = [];
        let selectedPaymentId = null;

        // Format date to readable format
        function formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
        }

        // Format currency
        function formatCurrency(amount) {
            return `₹${parseFloat(amount).toFixed(2)}`;
        }

        // Fetch all payments
        async function fetchPayments() {
            showLoading();
            try {
                const response = await fetch(`${API_BASE_URL}pay-log/`);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                
                allPayments = await response.json();
                filteredPayments = [...allPayments];
                renderPaymentList();
                hideLoading();
            } catch (error) {
                console.error('Error fetching payments:', error);
                hideLoading();
                paymentList.innerHTML = '<div class="text-center p-3 text-danger">Error loading payments</div>';
            }
        }
       
        // Render payment list
        function renderPaymentList() {
            paymentList.innerHTML = '';
            
            if (filteredPayments.length === 0) {
                paymentList.innerHTML = '<div class="text-center p-3 text-muted">No payments found</div>';
                return;
            }

            filteredPayments.forEach(payment => {
                const paymentItem = document.createElement('div');
                paymentItem.className = 'payment-item';
                if (payment.id === selectedPaymentId) {
                    paymentItem.classList.add('active');
                }
                
                paymentItem.innerHTML = `
                    <div>
                        <div class="payment-item-title">${payment.room_no} : ${payment.owners}</div>
                        <div class="payment-item-date">${formatDate(payment.payment_date)} | ${payment.period}</div>
                    </div>
                    <div>
                        <div class="payment-amount">${formatCurrency(payment.payment_amount)}</div>
                        <span class="badge bg-secondary badge-payment-mode">${payment.payment_mode}</span>
                    </div>
                `;
                
                paymentItem.addEventListener('click', () => selectPayment(payment));
                paymentList.appendChild(paymentItem);
            });
        }

        // Select and display payment details
        function selectPayment(payment) {
            selectedPaymentId = payment.id;
            renderPaymentList(); // Re-render to update active state
            displayPaymentDetails(payment);
        }

        // Display payment details with edit capability
        function displayPaymentDetails(payment) {
            currentPayment = payment;
            isEditMode = false;
            renderPaymentDetails();
        }

        async function fetchCharges() {
             try {
                const Response = await fetch(`${API_BASE_URL}maintenance-data-new/?room=${currentPayment.room_no}`);
                if (!Response.ok) throw new Error(`HTTP error! status: ${Response.status} for maintenance entries`);
                const data = await Response.json();
                // Handle different possible response formats
                // If the API returns an array, get the first item
                if (Array.isArray(data) && data.length > 0) {
                    return data[0];
                }
                // If it returns an object directly
                else if (data && typeof data === 'object') {
                    return data;
                }
                // If no data found
                return null;
            } catch (error) {
                console.error('Error fetching charges:', error);
                showNotification('Error fetching maintenance charges', 'error');
                return null;
            }
            }

        // Render payment details based on mode (view/edit)
        async function renderPaymentDetails() {
            const payment = currentPayment;
            
            if (isEditMode) {
                fetchedCharges = await fetchCharges();
                const periodicMaintenance = fetchedCharges?.periodic_building_maintenance || payment.periodic_building_maintenance;
                const repairFund = fetchedCharges?.repair_and_maintenance_fund || payment.repair_and_maintenance_fund;
                const sinkingFunds = fetchedCharges?.sinking_funds || payment.sinking_funds;
                const parking = fetchedCharges?.parking || payment.parking;
                const leaseRent = fetchedCharges?.lease_rent || payment.lease_rent;
                // Edit mode

                detailContent.innerHTML = `
                    <form id="paymentEditForm">
                        <div class="detail-section">
                            <h6>Basic Information</h6>
                            <div class="detail-row">
                                <span class="detail-label">Room No:</span>
                                <span class="detail-value">
                                <input type="text" class="form-control form-control-sm" name="room_no" value="${payment.room_no}" readonly style="background-color: #f0f0f0;">
                            </span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Owners:</span>
                            <span class="detail-value">
                                <input type="text" class="form-control form-control-sm" name="owners" value="${payment.owners}" readonly style="background-color: #f0f0f0;">
                            </span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Space Type:</span>
                            <span class="detail-value">
                                <input type="text" class="form-control form-control-sm" name="space" value="${payment.space}" readonly style="background-color: #f0f0f0;">
                            </span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Period Covered:</span>
                            <span class="detail-value">
                                <input type="text" class="form-control form-control-sm" name="period" value="${payment.period}">
                            </span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Months:</span>
                            <span class="detail-value">
                                <input type="number" class="form-control form-control-sm" name="months" value="${payment.months}"  oninput="calculateEditTotal()" min="1">
                            </span>
                        </div> 
                    <div class="detail-section">
                        <h6>Charges Breakdown</h6>
                        <div class="detail-row">
                            <span class="detail-label">Periodic Building Maintenance:</span>
                            <span class="detail-value">
                                <input type="number" class="form-control form-control-sm charge-input" 
                                    name="periodic_building_maintenance" value="${periodicMaintenance}" readonly style="background-color: #f0f0f0;">
                            </span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Repair & Maintenance Fund:</span>
                            <span class="detail-value">
                                <input type="number" class="form-control form-control-sm charge-input" 
                                    name="repair_and_maintenance_fund" value="${repairFund}" readonly style="background-color: #f0f0f0;">
                            </span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Sinking Funds:</span>
                            <span class="detail-value">
                                <input type="number" class="form-control form-control-sm charge-input" 
                                    name="sinking_funds" value="${sinkingFunds}" <!--readonly style="background-color: #f0f0f0;-->">
                            </span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Parking:</span>
                            <span class="detail-value">
                                <input type="number" step="0.01" class="form-control form-control-sm charge-input" 
                                    name="parking" value="${parking}">
                            </span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Penalty:</span>
                            <span class="detail-value">
                                <input type="number" step="0.01" class="form-control form-control-sm charge-input" 
                                    name="penalty" value="${payment.penalty}">
                            </span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Lease Rent:</span>
                            <span class="detail-value">
                                <input type="number" step="0.01" class="form-control form-control-sm charge-input" 
                                    name="lease_rent" value="${leaseRent}">
                            </span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Balance:</span>
                            <span class="detail-value">
                                <input type="number" step="0.01" class="form-control form-control-sm charge-input" 
                                    name="balance" value="${payment.balance}">
                            </span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label"><strong>Total Maintenance Amount:</strong></span>
                            <span class="detail-value">
                                <input type="number" class="form-control form-control-sm" 
                                    name="total_maintenance_amount" "value="${calculateEditTotal()}" readonly style="background-color: #f0f0f0; font-weight: bold;">
                            </span>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h6>Payment Information</h6>
                        <div class="detail-row">
                            <span class="detail-label">Payment Amount:</span>
                            <span class="detail-value">
                                <input type="number" step="0.01" class="form-control form-control-sm" 
                                    name="payment_amount" value="${payment.payment_amount}" style="font-weight: bold;">
                            </span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Payment Date:</span>
                            <span class="detail-value">
                                <input type="date" class="form-control form-control-sm" 
                                    name="payment_date" value="${payment.payment_date}">
                            </span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Payment Mode:</span>
                            <span class="detail-value">
                                <select class="form-control form-control-sm" name="payment_mode" onchange="toggleChequeFields(this.value)">
                                    <option value="CASH" ${payment.payment_mode === 'CASH' ? 'selected' : ''}>CASH</option>
                                    <option value="UPI" ${payment.payment_mode === 'UPI' ? 'selected' : ''}>UPI</option>
                                    <option value="IMPS" ${payment.payment_mode === 'IMPS' ? 'selected' : ''}>IMPS</option>
                                    <option value="NEFT" ${payment.payment_mode === 'NEFT' ? 'selected' : ''}>NEFT</option>
                                    <option value="CHEQUE" ${payment.payment_mode === 'CHEQUE' ? 'selected' : ''}>CHEQUE</option>
                                </select>
                            </span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Receipt Date:</span>
                            <span class="detail-value">
                                <input type="date" class="form-control form-control-sm" 
                                    name="date_made" value="${payment.date_made}">
                            </span>
                        </div>
                        <div class="detail-row" id="chequeNumRow" style="${payment.payment_mode === 'CHEQUE' ? '' : 'display: none;'}">
                            <span class="detail-label">Cheque Number:</span>
                            <span class="detail-value">
                                <input type="number" class="form-control form-control-sm" 
                                    name="cheque_num" value="${payment.cheque_num || 0}">
                            </span>
                        </div>
                        <div class="detail-row" id="chequeDrawDateRow" style="${payment.payment_mode === 'CHEQUE' ? '' : 'display: none;'}">
                            <span class="detail-label">Cheque Draw Date:</span>
                            <span class="detail-value">
                                <input type="date" class="form-control form-control-sm" 
                                    name="cheque_draw_date" value="${payment.cheque_draw_date || ''}">
                            </span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Notes:</span>
                            <span class="detail-value">
                                <textarea class="form-control form-control-sm" name="description" rows="2">${payment.description || ''}</textarea>
                            </span>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h6>Record Information</h6>
                        <div class="detail-row">
                            <span class="detail-label">Record ID:</span>
                            <span class="detail-value">#${payment.id}</span>
                        </div>
                    </div>

                    <div class="text-center mt-4">
                        <button type="button" class="btn btn-success me-2" onclick="savePaymentChanges()">
                            <i class="fas fa-save"></i> Save Changes
                        </button>
                        <button class="btn btn-danger me-2" onclick="deletePayment(${payment.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                        <button type="button" class="btn btn-secondary me-2" onclick="cancelEdit()">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                        <button type="button" class="btn btn-primary" onclick="viewReceipt(currentPayment)">
                            <i class="fas fa-file-invoice"></i> View Receipt
                        </button>
                    </div>
                </form>
            `;
            // Add event listeners for charge inputs to recalculate total
            document.querySelectorAll('.charge-input').forEach(input => {
                input.addEventListener('input', calculateEditTotal);
            });
            
        } else {
            // View mode
            detailContent.innerHTML = `
                <div class="detail-section">
                    <h6>Basic Information</h6>
                    <div class="detail-row">
                        <span class="detail-label">Room No:</span>
                        <span class="detail-value">${payment.room_no}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Owners:</span>
                        <span class="detail-value">${payment.owners}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Space Type:</span>
                        <span class="detail-value">${payment.space}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Period Covered:</span>
                        <span class="detail-value">${payment.period}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Months:</span>
                        <span class="detail-value">${payment.months}</span>
                    </div>
                </div>

                <div class="detail-section">
                    <h6>Charges Breakdown</h6>
                    <div class="detail-row">
                        <span class="detail-label">Periodic Building Maintenance:</span>
                        <span class="detail-value">${formatCurrency(payment.periodic_building_maintenance)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Repair & Maintenance Fund:</span>
                        <span class="detail-value">${formatCurrency(payment.repair_and_maintenance_fund)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Sinking Funds:</span>
                        <span class="detail-value">${formatCurrency(payment.sinking_funds)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Parking:</span>
                        <span class="detail-value">${formatCurrency(payment.parking)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Penalty:</span>
                        <span class="detail-value">${formatCurrency(payment.penalty)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Lease Rent:</span>
                        <span class="detail-value">${formatCurrency(payment.lease_rent)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Balance:</span>
                        <span class="detail-value">${formatCurrency(payment.balance)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label"><strong>Total Maintenance Amount:</strong></span>
                        <span class="detail-value"><strong>${formatCurrency(payment.total_maintenance_amount)}</strong></span>
                    </div>
                </div>

                <div class="detail-section">
                    <h6>Payment Information</h6>
                    <div class="detail-row">
                        <span class="detail-label">Payment Amount:</span>
                        <span class="detail-value"><strong>${formatCurrency(payment.payment_amount)}</strong></span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Payment Date:</span>
                        <span class="detail-value">${formatDate(payment.payment_date)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Payment Mode:</span>
                        <span class="detail-value">${payment.payment_mode}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Receipt Date:</span>
                        <span class="detail-value">${formatDate(payment.date_made)}</span>
                    </div>
                    ${payment.payment_mode === 'CHEQUE' ? `
                        <div class="detail-row">
                            <span class="detail-label">Cheque Number:</span>
                            <span class="detail-value">${payment.cheque_num}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Cheque Draw Date:</span>
                            <span class="detail-value">${formatDate(payment.cheque_draw_date)}</span>
                        </div>
                    ` : ''}
                    ${payment.description ? `
                        <div class="detail-row">
                            <span class="detail-label">Notes:</span>
                            <span class="detail-value">${payment.description}</span>
                        </div>
                    ` : ''}
                </div>

                <div class="detail-section">
                    <h6>Record Information</h6>
                    <div class="detail-row">
                        <span class="detail-label">Record ID:</span>
                        <span class="detail-value">#${payment.id}</span>
                    </div>
                </div>

                <div class="text-center mt-4">
                    <button class="btn btn-warning me-2" onclick="toggleEditMode()">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-danger me-2" onclick="deletePayment(${payment.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                    <button class="btn btn-primary" onclick="viewReceipt(currentPayment)">
                        <i class="fas fa-file-invoice"></i> View Receipt
                    </button>
                </div>
            `;
        }
    }

        // Toggle edit mode
        function toggleEditMode() {
            isEditMode = true;
            renderPaymentDetails();
        }

        // Cancel edit mode
        function cancelEdit() {
            isEditMode = false;
            renderPaymentDetails();
        }

        // Toggle cheque fields visibility
        function toggleChequeFields(paymentMode) {
            const chequeNumRow = document.getElementById('chequeNumRow');
            const chequeDrawDateRow = document.getElementById('chequeDrawDateRow');
        
            if (paymentMode === 'CHEQUE') {
                chequeNumRow.style.display = '';
                chequeDrawDateRow.style.display = '';
            } else {
                chequeNumRow.style.display = 'none';
                chequeDrawDateRow.style.display = 'none';
                document.querySelector('[name="cheque_num"]').value = '0';
                document.querySelector('[name="cheque_draw_date"]').value = '';
            }
        }

        // Calculate total in edit mode
        function calculateEditTotal() {
            const fields = [
                'periodic_building_maintenance', 'repair_and_maintenance_fund',
                'sinking_funds', 'parking', 'penalty', 'lease_rent', 'balance'
            ];
        
            let total = 0;
            fields.forEach(field => {
                const input = document.querySelector(`[name="${field}"]`);
                if (input) {
                    total += parseFloat(input.value) || 0;
                }
            });
        
            const totalInput = document.querySelector('[name="total_maintenance_amount"]');
            if (totalInput) {
                totalInput.value = total.toFixed(2);
            }
        }

        // Save payment changes
        async function savePaymentChanges() {
            const form = document.getElementById('paymentEditForm');
            const formData = new FormData(form);        
            // Prepare the updated payment data
            const updatedPayment = {
                id: currentPayment.id,
                room_no: formData.get('room_no'),
                owners: formData.get('owners'),
                space: formData.get('space'),
                period: formData.get('period'),
                months: parseInt(formData.get('months')),
                periodic_building_maintenance: parseFloat(formData.get('periodic_building_maintenance')*parseInt(formData.get('months'))),
                repair_and_maintenance_fund: parseFloat(formData.get('repair_and_maintenance_fund')*parseInt(formData.get('months'))),
                sinking_funds: parseFloat(formData.get('sinking_funds')*parseInt(formData.get('months'))),
                parking: parseFloat(formData.get('parking')*parseInt(formData.get('months'))),
                penalty: parseFloat(formData.get('penalty')),
                lease_rent: parseFloat(formData.get('lease_rent')*parseInt(formData.get('months'))),
                balance: parseFloat(formData.get('balance')),
                //total_maintenance_amount: parseFloat(formData.get('total_maintenance_amount')),
                get total_maintenance_amount() {
                    return this.periodic_building_maintenance +
                        this.repair_and_maintenance_fund +
                        this.sinking_funds +
                        this.parking +
                        this.penalty +
                        this.lease_rent +
                        this.balance;
                },
                payment_amount: parseFloat(formData.get('payment_amount')),
                payment_date: formData.get('payment_date'),
                payment_mode: formData.get('payment_mode'),
                date_made: formData.get('date_made'),
                cheque_num: formData.get('payment_mode') === 'CHEQUE' ? parseInt(formData.get('cheque_num')) : 0,
                cheque_draw_date: formData.get('payment_mode') === 'CHEQUE' ? formData.get('cheque_draw_date') : null,
                //description: formData.get('description')
            };
            //console.log(updatedPayment);
            try {
                // Show loading state
                const saveButton = event.target;
                const originalText = saveButton.innerHTML;
                saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
                saveButton.disabled = true;
            
                // Make API call to update the payment
                const response = await fetch(`${API_BASE_URL}pay-log/${currentPayment.id}/`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken') // Django CSRF token
                    },
                    body: JSON.stringify(updatedPayment)
                });
            
                if (response.ok) {
                    const savedPayment = await response.json();
                
                // Update the current payment with saved data
                    currentPayment = savedPayment;
                
                // Update the payment in the payments array
                    const index = allPayments.findIndex(p => p.id === savedPayment.id);
                    if (index !== -1) {
                        allPayments[index] = savedPayment;
                    }
                
                // Exit edit mode and refresh the display
                    isEditMode = false;
                    renderPaymentDetails();
                
                    // Update the payment row in the list
                    updatePaymentRow(savedPayment);
                
                // Show success message
                    showNotification('Payment details updated successfully!', 'success');
                } else {
                    throw new Error('Failed to save payment');
                }
            } catch (error) {
                console.error('Error saving payment:', error);
                showNotification('Error saving payment. Please try again.', 'error');
            } finally {
                // Restore button state
                const saveButton = document.querySelector('.btn-success');
                if (saveButton) {
                    saveButton.innerHTML = '<i class="fas fa-save"></i> Save Changes';
                    saveButton.disabled = false;
                }
            }
        }

        // Update payment row in the list after saving
        function updatePaymentRow(payment) {
            const row = document.querySelector(`tr[data-payment-id="${payment.id}"]`);
            if (row) {
                row.innerHTML = `
                    <td>${payment.room_no}</td>
                    <td>${payment.owners}</td>
                    <td>${formatDate(payment.payment_date)}</td>
                    <td>${formatCurrency(payment.payment_amount)}</td>
                    <td>${payment.payment_mode}</td>
                    <td>
                        <span class="badge bg-success">Paid</span>
                    </td>
                `;
            
                // Re-attach click event
                row.onclick = () => selectPayment(row, payment);
            }
        }
        async function deletePayment(paymentId) {
            // Simple confirmation
            if (!confirm('Are you sure you want to delete this payment record? This action cannot be undone.')) {
                return;
            }
            
            try {
                const response = await fetch(`${API_BASE_URL}pay-log/${paymentId}/`, {
                    method: 'DELETE',
                    headers: {
                        'X-CSRFToken': getCookie('csrftoken')
                    }
                });
                
                if (response.ok || response.status === 204) {
                    // Remove from payments array
                    allPayments = allPayments.filter(p => p.id !== paymentId);
                    
                    // Clear detail view
                    detailContent.innerHTML = '<div class="text-center p-5">Payment deleted successfully</div>';
                    
                    // Remove row from list
                    document.querySelector(`tr[data-payment-id="${paymentId}"]`)?.remove();
                    
                    showNotification('Payment deleted successfully!', 'success');
                    currentPayment = null;
                } else {
                    throw new Error('Delete failed');
                }
            } catch (error) {
                console.error('Delete error:', error);
                showNotification('Error deleting payment', 'error');
            }
        }
        
        function viewReceipt(payment) {
            // Store payment data in sessionStorage
            sessionStorage.setItem('receiptData', JSON.stringify(payment));
            // Open receipt in new window
            window.open('/static/myapp/rec_tempp.html', '_blank');
        }   

        function filterPayments() {
            // Get all filter values
            const filters = {
                roomNo: document.getElementById('filterRoomNo')?.value.toLowerCase() || '',
                owner: document.getElementById('filterOwner')?.value.toLowerCase() || '',
                paymentDate: document.getElementById('filterPaymentDate')?.value || '',
                paymentMode: document.getElementById('filterPaymentMode')?.value || '',
                period: document.getElementById('filterPeriod')?.value.toLowerCase() || '',
                dateMade: document.getElementById('filterDateMade')?.value || ''
            };
            
            // Check if any filters are active
            const hasActiveFilters = Object.values(filters).some(value => value !== '');
            
            if (!hasActiveFilters) {
                filteredPayments = [...allPayments];
            } else {
                filteredPayments = allPayments.filter(payment => {
                    // Check room number
                    if (filters.roomNo && !payment.room_no.toLowerCase().includes(filters.roomNo)) {
                        return false;
                    }
                    
                    // Check owner
                    if (filters.owner && !payment.owners.toLowerCase().includes(filters.owner)) {
                        return false;
                    }
                    
                    // Check payment date (exact match)
                    if (filters.paymentDate && payment.payment_date !== filters.paymentDate) {
                        return false;
                    }
                    
                    // Check payment mode
                    if (filters.paymentMode && payment.payment_mode !== filters.paymentMode) {
                        return false;
                    }
                    
                    // Check period
                    if (filters.period && !payment.period.toLowerCase().includes(filters.period)) {
                        return false;
                    }
                    
                    // Check date made (receipt date)
                    if (filters.dateMade && payment.date_made !== filters.dateMade) {
                        return false;
                    }
                    
                    return true;
                });
            }
            
            // Update result count
            updateFilterResultCount();
            
            // Re-render the payment list
            renderPaymentList();
        }
        
        function clearFilters() {
            // Clear all filter inputs
            document.getElementById('filterRoomNo').value = '';
            document.getElementById('filterOwner').value = '';
            document.getElementById('filterPaymentDate').value = '';
            document.getElementById('filterPaymentMode').value = '';
            document.getElementById('filterPeriod').value = '';
            document.getElementById('filterDateMade').value = '';
            
            // Reset to show all payments
            filteredPayments = [...allPayments];
            renderPaymentList();
            updateFilterResultCount();
        }

        // Update filter result count
        function updateFilterResultCount() {
            const countElement = document.getElementById('filterResultCount');
            if (countElement) {
                const hasFilters = filteredPayments.length !== allPayments.length;
                if (hasFilters) {
                    countElement.textContent = `Showing ${filteredPayments.length} of ${allPayments.length} records`;
                } else {
                    countElement.textContent = `Showing all ${allPayments.length} records`;
                }
            }
        }

        // Toggle filter section visibility
        function toggleFilters() {
            const filterSection = document.getElementById('filterSection');
            const toggleIcon = document.getElementById('filterToggleIcon');
            
            if (filterSection.style.display === 'none') {
                filterSection.style.display = 'block';
                toggleIcon.className = 'fas fa-chevron-up';
            } else {
                filterSection.style.display = 'none';
                toggleIcon.className = 'fas fa-chevron-down';
            }
        }
                
                

        // Event listeners
        //searchBox.addEventListener('input', filterPayments);
        refreshPayrecBtn.addEventListener('click', fetchPayments);

        // Initial load
        document.addEventListener('DOMContentLoaded', () => {
            fetchPayments();
        });
