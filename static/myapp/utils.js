const API_BASE_URL = 'http://127.0.0.1:8000/api/';
const responseMessage = document.getElementById('responseMessage');
const loadingSpinner = document.getElementById('loadingSpinner');
let EXTRA_CHARGE_KEYS = new Set();

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

/**
 * Make table columns resizable like Excel, with auto-fit and persistence
 * @param {string|HTMLElement} tableSelector - CSS selector or table element
 * @param {string} storageKey - unique key to store widths in localStorage
 */
function makeTableResizable(tableSelector, storageKey = "tableColumnWidths") {
    const table = (typeof tableSelector === "string")
        ? document.querySelector(tableSelector)
        : tableSelector;

    if (!table) return;

    const thElems = table.querySelectorAll("th");

    // === Restore saved widths from localStorage ===
    const saved = localStorage.getItem(storageKey);
    if (saved) {
        try {
            const widths = JSON.parse(saved);
            thElems.forEach((th, i) => {
                if (widths[i]) th.style.width = widths[i];
            });
        } catch (e) {
            console.warn("Failed to load saved column widths:", e);
        }
    }

    thElems.forEach((th, index) => {
        // Avoid duplicate handles
        if (th.querySelector(".resize-handle")) return;

        const handle = document.createElement("div");
        handle.classList.add("resize-handle");
        th.style.position = "relative";
        th.appendChild(handle);

        let startX, startWidth;

        function saveWidths() {
            const widths = Array.from(thElems).map(th => th.style.width || "");
            localStorage.setItem(storageKey, JSON.stringify(widths));
        }

        // Drag resizing
       handle.addEventListener("mousedown", (e) => {
        startX = e.pageX;
        startWidth = th.offsetWidth;

        // Freeze all column widths at drag start
        const table = th.closest("table");
        const colWidths = Array.from(table.querySelectorAll("th")).map(th => th.offsetWidth);
        table.style.tableLayout = "fixed"; // freeze layout

        table.querySelectorAll("th").forEach((header, i) => {
            header.style.width = colWidths[i] + "px";  // lock each col
        });

        function onMouseMove(e) {
            const newWidth = startWidth + (e.pageX - startX);
            th.style.width = `${newWidth}px`; // only this column resizes
        }

        function onMouseUp() {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        }

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    });

        // Double-click to auto-fit
        handle.addEventListener("dblclick", () => {
            th.style.width = "auto";
            saveWidths(); // persist reset action
        });
    });
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