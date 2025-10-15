// --- 1. SHARED DATA & CONSTANTS ---
const INVENTORY_KEY = 'labInventoryData';
const inventoryRegistry = new Map();
let itemIDCounter = 100;
const LOW_STOCK_THRESHOLD = 10; 
const LAB_LOCATION = { name: 'Lab Central Depot', lat: 18.6655, lng: 73.7635 };

// --- 2. THE CLASS AND ITS METHOD ---
class Item {
    constructor(id, name, price, quantity, initialQuantity = quantity) {
        this.id = id;
        this.name = name;
        this.unitPrice = parseFloat(price); 
        this.quantity = parseInt(quantity); 
        this.initialQuantity = parseInt(initialQuantity); 
    }

    calculateCurrentValue() { return (this.unitPrice * this.quantity); }
    calculateInitialInvestment() { return (this.unitPrice * this.initialQuantity); }

    formatINR(value) {
        return `₹${parseFloat(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
}


// --- 3. STORAGE & DATA FLOW FUNCTIONS (omitted for brevity) ---

function saveInventory() {
    const dataArray = Array.from(inventoryRegistry.values());
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(dataArray));
}

function loadInventory() {
    const storedData = localStorage.getItem(INVENTORY_KEY);
    if (storedData) {
        const dataArray = JSON.parse(storedData);
        inventoryRegistry.clear();
        
        dataArray.forEach(data => {
            const item = new Item(data.id, data.name, data.unitPrice, data.quantity, data.initialQuantity); 
            inventoryRegistry.set(item.id, item);
        });

        const lastIdNum = dataArray.reduce((max, item) => Math.max(max, parseInt(item.id.replace('ITM', ''))), 100);
        itemIDCounter = lastIdNum + 1;
        return true;
    }
    return false;
}


// --- 4. ITEM/CONTACT FORM LOGIC (Setup functions and handlers are unchanged) ---

function validateItemForm(name, price, quantity) {
    const errors = [];
    if (name.length < 3) { errors.push("Item Name must be at least 3 characters."); }
    if (price <= 0 || isNaN(price)) { errors.push("Unit Price must be a positive number."); }
    if (quantity < 0 || isNaN(quantity)) { errors.push("Quantity must be zero or a positive integer."); }
    return errors;
}

function handleItemFormSubmission(e) {
    e.preventDefault();
    
    const itemId = document.getElementById('itemIdHidden').value;
    const name = document.getElementById('itemName').value.trim();
    const price = parseFloat(document.getElementById('itemPrice').value);
    const quantityInput = document.getElementById('itemQuantity'); 

    const isEditMode = !!itemId;
    let quantity = isEditMode ? inventoryRegistry.get(itemId).quantity : parseInt(quantityInput.value);
    
    const validationErrors = validateItemForm(name, price, quantity);

    if (validationErrors.length > 0) {
        alert("Validation Error:\n\n" + validationErrors.join("\n"));
        return;
    }

    if (isEditMode) {
        const item = inventoryRegistry.get(itemId);
        item.name = name;
        item.unitPrice = price;
        alert(`[UPDATE SUCCESS] Item ${name} (ID: ${itemId}) updated.`);
    } else {
        const id = `ITM${itemIDCounter++}`;
        const newItem = new Item(id, name, price, quantity, quantity); 
        inventoryRegistry.set(id, newItem);
        alert(`[NEW ENTRY] Item ${name} added. Redirecting to dashboard.`);
    }

    saveInventory();
    window.location.href = 'index.html';
}

function setupAddMode() {
    const pageTitle = document.getElementById('pageTitle');
    const headerTitle = document.getElementById('headerTitle');
    const headerSubtitle = document.getElementById('headerSubtitle');
    const formSubmitBtn = document.getElementById('formSubmitBtn');

    if (pageTitle) pageTitle.textContent = 'Item Form | ADD';
    if (headerTitle) headerTitle.textContent = '📥 ITEM ENTRY FORM';
    if (headerSubtitle) headerSubtitle.textContent = 'Execute new entry.';
    if (formSubmitBtn) formSubmitBtn.textContent = 'EXECUTE ADDITION';
}

function setupEditMode(itemId) {
    const item = inventoryRegistry.get(itemId);
    if (!item) return;
    
    const pageTitle = document.getElementById('pageTitle');
    const headerTitle = document.getElementById('headerTitle');
    const headerSubtitle = document.getElementById('headerSubtitle');
    const formSubmitBtn = document.getElementById('formSubmitBtn');
    const itemIdHidden = document.getElementById('itemIdHidden');
    const itemName = document.getElementById('itemName');
    const itemPrice = document.getElementById('itemPrice');
    const quantityGroup = document.getElementById('quantityGroup');

    if (pageTitle) pageTitle.textContent = `Item Form | EDIT ${item.id}`;
    if (headerTitle) headerTitle.textContent = `✏️ EDIT ITEM ${item.id}`;
    if (headerSubtitle) headerSubtitle.textContent = `Modifying details for: ${item.name}`;
    if (formSubmitBtn) formSubmitBtn.textContent = 'APPLY UPDATE';

    if (itemIdHidden) itemIdHidden.value = itemId;
    if (itemName) itemName.value = item.name;
    if (itemPrice) itemPrice.value = item.unitPrice;
    
    if (quantityGroup) quantityGroup.style.display = 'none'; 
}

function handleContactSubmission(e) {
    e.preventDefault();
    const form = document.getElementById('contactForm');
    
    const errors = [];
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const rollNumber = document.getElementById('rollNumber').value.trim();
    const securityCode = parseInt(document.getElementById('securityCode').value);
    const message = document.getElementById('message').value.trim();

    if (fullName.length < 3) errors.push("Full Name must be at least 3 characters.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Invalid Email format.");
    if (!/^[A-Z0-9]{3,8}$/.test(rollNumber)) errors.push("Roll/Employee ID must be 3-8 uppercase letters/numbers.");
    if (securityCode !== 100) errors.push("Security Code must be a 3 digit number.");
    if (message.split(/\s+/).filter(w => w).length < 5) errors.push("Detailed Message must contain at least 5 words.");

    if (errors.length > 0) {
        alert("FORM ERROR:\n\n" + errors.join("\n"));
        return;
    }

    alert("[COMMS SUCCESS] Message Submitted. Awaiting response.");
    form.reset();
}


// --- 5. DASHBOARD RENDERING & ACTIONS ---

function getStockStatus(quantity) {
    if (quantity === 0) return { label: 'ZERO', class: 'zero' };
    if (quantity < LOW_STOCK_THRESHOLD) return { label: 'LOW', class: 'low' };
    return { label: 'HEALTHY', class: 'healthy' };
}

function renderInventoryTable() {
    const inventoryTableBody = document.querySelector('#inventoryTable tbody');
    const itemCountDisplay = document.getElementById('itemCountDisplay');
    if (!inventoryTableBody) return; 
    
    inventoryTableBody.innerHTML = '';
    
    for (const item of inventoryRegistry.values()) {
        const row = inventoryTableBody.insertRow();
        const status = getStockStatus(item.quantity);

        row.innerHTML = `
            <td>${item.id}</td>
            <td>${item.name}</td>
            <td>${item.formatINR(item.unitPrice)}</td>
            <td><span class="stock-pill ${status.class}">${status.label}</span></td>
            <td>${item.quantity}</td>
            <td>${item.formatINR(item.calculateCurrentValue())}</td>
            <td>
                <button class="action-btn add-btn" data-id="${item.id}" data-action="add" title="Add +1">+1</button>
                <button class="action-btn remove-btn" data-id="${item.id}" data-action="remove" title="Remove -1">-1</button>
                <button class="action-btn delete-btn" data-id="${item.id}" data-action="delete" title="Delete Entry">Delete</button>
                <button class="action-btn geo-btn" data-name="${item.name}" data-id="${item.id}" data-action="geo" title="Locate Suppliers">Locate</button>
            </td>
        `;
    }
        calculateTotalValue();
    checkAndDisplayLowStockStatus();
    if(itemCountDisplay) itemCountDisplay.textContent = inventoryRegistry.size;
}

function handleStockAction(e) {
    const button = e.target.closest('.action-btn');
    
    if (!button) return;
    
    const itemId = button.dataset.id;
    const action = button.dataset.action;

    if (!action) return;

    // Handle Locate button (uses data-name)
    if (action === 'geo') {
        showGeoLocation(button.dataset.name);
        return;
    } 

    if (!itemId) return; // All other actions require an ID

    if (action === 'delete') {
        showConfirmationModal(itemId);
        return;
    }

    const item = inventoryRegistry.get(itemId);
    
    if (item) {
        if (action === 'add') {
            item.quantity += 1;
            item.initialQuantity += 1; 
        } else if (action === 'remove' && item.quantity > 0) {
            item.quantity -= 1;
        } else if (action === 'remove' && item.quantity === 0) {
            alert("Warning: Stock already at 0.");
            return;
        }
        
        saveInventory(); 
        renderInventoryTable();
    }
}

function showConfirmationModal(itemId) {
    const modalContainer = document.getElementById('modal-container');
    const item = inventoryRegistry.get(itemId);

    modalContainer.style.display = 'flex';
    modalContainer.innerHTML = `
        <div class="modal-content" style="max-width: 400px; text-align: center;">
            <div class="modal-icon" style="color: var(--status-zero);">⚠️</div>
            <h3 style="color: var(--status-zero);">CONFIRM DELETION</h3>
            <p style="color:var(--color-text-main); margin-top: 10px;">Permanent deletion of **${item.name}** (ID: ${itemId})?</p>
            <div style="margin-top: 25px; display: flex; justify-content: space-around;">
                <button onclick="deleteItem('${itemId}')" class="action-btn delete-btn" style="background: var(--status-zero);">DELETE_CONFIRM</button>
                <button onclick="document.getElementById('modal-container').style.display='none'" class="action-btn" style="background-color: #5C6773;">CANCEL</button>
            </div>
        </div>
    `;
}

function deleteItem(itemId) {
    inventoryRegistry.delete(itemId);
    saveInventory();
    renderInventoryTable();
    document.getElementById('modal-container').style.display = 'none';
}


// --- 6. API & UTIL FUNCTIONS (Geolocation/Metrics/Init) ---

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2);
}

function showGeoLocation(itemName) {
    const modalContainer = document.getElementById('modal-container');
    
    if (!("geolocation" in navigator)) {
        alert("Geolocation is not supported by your browser.");
        return;
    }
    
    modalContainer.style.display = 'flex';
    modalContainer.innerHTML = `
        <div class="modal-content" style="max-width: 400px; text-align: center;">
            <div class="modal-icon">📡</div>
            <h3 style="color:var(--color-primary-accent);">LOCATING VENDOR...</h3>
            <p style="margin-top: 15px; color: var(--color-line);">Pinging logistics networks...</p>
        </div>
    `;

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            
            const distance = calculateDistance(userLat, userLng, LAB_LOCATION.lat, LAB_LOCATION.lng);
            const supplierLink = `https://www.google.com/maps/search/buy{itemName}+suppliers+near+Pimpri+Chinchwad`;
            
            modalContainer.innerHTML = `
                <div class="modal-content" style="max-width: 450px; text-align: center;">
                    <div class="modal-icon" style="color: var(--color-secondary-accent);">📍</div>
                    <h3>LOGISTICS REPORT: ${itemName.toUpperCase()}</h3>
                    <p style="color:var(--color-text-main); font-weight: bold; font-family: var(--font-mono);">
                        Distance from ${LAB_LOCATION.name}: 
                        <span style="color:var(--color-secondary-accent);">${distance} KM</span>
                    </p>
                    <p style="margin-top: 15px; color: var(--color-line);">Search local suppliers for procurement:</p>
                    <a href="${supplierLink}" target="_blank" class="modal-link-btn animated-btn" style="text-decoration: none; display: block; margin-top: 15px;">
                        [EXECUTE] MAP SEARCH
                    </a>
                    <button onclick="document.getElementById('modal-container').style.display='none'" class="action-btn" style="margin-top: 20px; background-color: #5C6773;">CLOSE WINDOW</button>
                </div>
            `;
        },
        (error) => {
             let errorMessage = "Geolocation Error. Check permissions.";
             if (error.code === error.PERMISSION_DENIED) { errorMessage = "ACCESS DENIED: Location permission blocked."; }
             else if (error.code === error.POSITION_UNAVAILABLE) { errorMessage = "ERROR: Location data unavailable."; }

             modalContainer.innerHTML = `
                <div class="modal-content" style="max-width: 400px; text-align: center;">
                    <div class="modal-icon" style="color: var(--status-zero);">❌</div>
                    <h3 style="color:var(--status-zero);">GEOLOCATION FAILURE</h3>
                    <p style="color: var(--color-text-main);">${errorMessage}</p>
                    <button onclick="document.getElementById('modal-container').style.display='none'" class="action-btn" style="margin-top: 20px; background-color: #5C6773;">CLOSE WINDOW</button>
                </div>
            `;
        }
    );
}

function playBackgroundMusic() {
    const audio = document.getElementById('bg-music');
    document.body.addEventListener('click', () => {
        if (audio && audio.paused) {
            audio.volume = 0.15; 
            audio.play().catch(e => console.log("Music play failed, requires user interaction."));
        }
    }, { once: true });
}

function checkAndDisplayLowStockStatus() {
    const lowStockAlert = document.getElementById('lowStockAlert');
    const lowStockMessage = document.getElementById('lowStockMessage');
    if (!lowStockAlert) return; 
    
    let lowStockCount = 0;
    
    for (const item of inventoryRegistry.values()) {
        if (item.quantity < LOW_STOCK_THRESHOLD) {
            lowStockCount++;
        }
    }
    
    // Logic for the visual alert
    const messageText = (lowStockCount > 0) ? `ALERT: ${lowStockCount} items need restocking!` : 'STATUS: ALL STOCK HEALTHY';

    lowStockMessage.textContent = messageText;

    if (lowStockCount > 0) {
        lowStockAlert.classList.add('alert-low-stock');
    } else {
        lowStockAlert.classList.remove('alert-low-stock');
        lowStockAlert.style.borderLeftColor = 'var(--status-healthy)';
        lowStockAlert.style.color = 'var(--color-secondary-accent)';
    }
}

function calculateTotalValue() {
    const totalValueDisplay = document.getElementById('totalValueDisplay');
    const totalInvestmentDisplay = document.getElementById('totalInvestmentDisplay'); 
    
    if (!totalValueDisplay) return; 
    
    let grandTotalCurrentValue = 0;
    let grandTotalInvestment = 0;
    
    for (const item of inventoryRegistry.values()) {
        grandTotalCurrentValue += item.calculateCurrentValue();
        grandTotalInvestment += item.calculateInitialInvestment();
    }
    
    totalValueDisplay.textContent = new Item().formatINR(grandTotalCurrentValue);
    if (totalInvestmentDisplay) totalInvestmentDisplay.textContent = new Item().formatINR(grandTotalInvestment);
}


// --- 7. INITIALIZATION FUNCTION FOR DASHBOARD ---
function initDashboard() {
    if (document.getElementById('inventoryTable')) {
        loadInventory();
        renderInventoryTable();
    }
}

// --- 8. INITIALIZATION FUNCTION FOR ADD/CONTACT PAGES ---
function initForms() {
    const currentPath = window.location.pathname.split('/').pop();

    if (currentPath === 'add_item.html') {
        const urlParams = new URLSearchParams(window.location.search);
        const itemId = urlParams.get('id');
        loadInventory(); 
        if (itemId && inventoryRegistry.has(itemId)) {
            setupEditMode(itemId);
        } else {
            setupAddMode();
        }
        const itemForm = document.getElementById('itemForm');
        if (itemForm) {
            itemForm.addEventListener('submit', handleItemFormSubmission);
        }
    } else if (currentPath === 'contact.html') {
        const contactForm = document.getElementById('contactForm');
        if (contactForm) {
            contactForm.addEventListener('submit', handleContactSubmission);
        }
    }
}


// --- 9. INITIAL DUMMY DATA SETUP ---
if (!localStorage.getItem(INVENTORY_KEY)) {
    const i1 = new Item('ITM100', 'Oscilloscope Probe', 1250.00, 5, 10);
    const i2 = new Item('ITM101', 'Breadboard (Large)', 250.50, 45, 45); 
    const i3 = new Item('ITM102', 'Power Supply Cable', 80.00, 0, 10); 
    const i4 = new Item('ITM103', 'LED Pack (100pcs)', 35.00, 7, 20); 
    const i5 = new Item('ITM104', 'Digital Storage Oscilloscope', 35000.00, 1, 1); 

    inventoryRegistry.set(i1.id, i1);
    inventoryRegistry.set(i2.id, i2);
    inventoryRegistry.set(i3.id, i3);
    inventoryRegistry.set(i4.id, i4);
    inventoryRegistry.set(i5.id, i5);

    saveInventory();
}

// Global initialization call, ensuring all functions are ready when the DOM loads
document.addEventListener('DOMContentLoaded', () => {
    initDashboard(); 
    initForms();     
    playBackgroundMusic();

    // **ULTIMATE FIX:** Attach the delegated listener to the entire document.
    document.addEventListener('click', (e) => {
        const targetButton = e.target.closest('.action-btn');
        if (targetButton) {
            handleStockAction(e);
        }
    });
});