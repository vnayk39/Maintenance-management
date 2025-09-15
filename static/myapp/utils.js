const API_BASE_URL = 'http://127.0.0.1:8000/api/';
const responseMessage = document.getElementById('responseMessage');
const loadingSpinner = document.getElementById('loadingSpinner');

function showLoading(message = "Processing...") {
    loadingSpinner.style.display = 'inline-block';
    responseMessage.textContent = message;
    responseMessage.style.color = 'orange';
    }

function hideLoading(message = "", isError = false) {
    loadingSpinner.style.display = 'none';
    responseMessage.textContent = message;
    responseMessage.style.color = isError ? 'red' : 'green';
    }

// Custom modal function instead of alert()
function showCustomModal(title, message, isError = false) {
    const modalId = isError ? 'errorModal' : 'infoModal';
    let modalElement = document.getElementById(modalId);

    if (!modalElement) {
        modalElement = document.createElement('div');
        modalElement.innerHTML = `
            <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}Label" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="${modalId}Label">${title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            ${message}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modalElement);
    } else {
        modalElement.querySelector('.modal-title').textContent = title;
        modalElement.querySelector('.modal-body').innerHTML = message;
    }

    const modal = new bootstrap.Modal(modalElement.querySelector('.modal'));
    modal.show();

    modalElement.querySelector('.modal').addEventListener('hidden.bs.modal', function (event) {
        modalElement.remove();
    });
}
// Show notification
function showNotification(message, type = 'info') {
    const notificationDiv = document.createElement('div');
    notificationDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    notificationDiv.style.zIndex = '9999';
    notificationDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notificationDiv);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        notificationDiv.remove();
    }, 3000);
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

//login utils
async function refreshToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return false;

    try {
        const response = await fetch(`${API_BASE_URL}token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: refreshToken })
        });

        if (!response.ok) throw new Error("Could not refresh token.");

        const data = await response.json();
        localStorage.setItem('access_token', data.access);
        console.log("Token refreshed successfully.");
        return true;

    } catch (error) {
        console.error("Token refresh failed:", error);
        logout();
        return false;
    }
}

async function authenticatedFetch(url, options = {}) {
    let accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
        if (!await refreshToken()) {
            showCustomModal("Session Expired", "Please log in again to continue.", true);
            return { ok: false, status: 401 };
        }
        accessToken = localStorage.getItem('access_token');
    }

    options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`,
    };

    const response = await fetch(url, options);

    // If token is expired, try to refresh and re-fetch
    if (response.status === 401) {
        console.log("Access token expired, attempting to refresh...");
        if (await refreshToken()) {
            accessToken = localStorage.getItem('access_token');
            options.headers['Authorization'] = `Bearer ${accessToken}`;
            return await fetch(url, options); // Retry the request with new token
        } else {
            return response; // Token refresh failed, return 401
        }
    }

    return response;
}

function checkAuthentication() {
    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
        loginPage.classList.add('d-none');
        mainApp.classList.remove('d-none');
        fetchInitialMaintenanceData();
    } else {
        loginPage.classList.remove('d-none');
        mainApp.classList.add('d-none');
    }
}

function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    checkAuthentication();
}

function switchStyle(sheet) {
  document.getElementById("page-style").setAttribute("href", sheet);
}

function router() {
    // Hide all pages
    document.querySelectorAll('[id^="page-"]').forEach(p => (p.style.display = "none"));

    const hash = window.location.hash.replace("#", "");
    const pageId = "page-" + (hash || "charges"); // default is charges page

    const page = document.getElementById(pageId);
    if (page) {
        page.style.display = "block";

        // Call initializer per page
        if (pageId === "page-charges") initChargesPage();
        if (pageId === "page-maintenance") initMaintenancePage();
        if (pageId === "page-payments") initPaymentsPage();
        if (pageId === "page-payment-records") initPaymentRecordsPage();
    }
}


function initChargesPage() {
   if (typeof fetchSpacewiseCharges === 'function') {
    switchStyle("/static/myapp/charges.css")
    fetchSpacewiseCharges();
    }
}

function initMaintenancePage() {
    if (typeof fetchInitialMaintenanceData === 'function') {
    switchStyle("/static/myapp/index.css")
    fetchInitialMaintenanceData();
    }
}

function initPaymentsPage() {
    if (typeof addPaymentRow === 'function') {
    switchStyle("/static/myapp/paylog.css")
    }
}

function initPaymentRecordsPage() {
    if (typeof fetchPayments === 'function') {
    switchStyle("/static/myapp/paylog_view.css")        
    fetchPayments();
    }
}

window.addEventListener("hashchange", router);
window.addEventListener("load", router);