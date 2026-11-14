<%@taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions"%>
<%@page contentType="text/html" pageEncoding="UTF-8"%>
        </div>
        <!-- End view-viewport -->
    </main>
    <!-- End workspace -->
</div>
<!-- End app-container -->

<!-- =========================================================================
     MODALS: HARDWARE LINK, USER MANAGEMENT, PLANT PROFILES, AND AUTH
     ========================================================================= -->

<!-- Modal: Connect IoT Hardware (Single Connect Button in Ribbon triggers this) -->
<div class="modal-backdrop" id="modal-connect-hardware">
    <div class="modal-card" style="max-width: 480px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <div class="jewel-icon-box jewel-emerald">
                    <svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line></svg>
                </div>
                <div>
                    <h3 style="font-family: var(--font-heading); font-size: 16px; font-weight: 700; color: var(--text-main);">Connect IoT Hardware</h3>
                    <div style="font-size: 12px; color: var(--text-secondary);">Arduino Uno | Direct USB Serial Interface</div>
                </div>
            </div>
            <button class="btn btn-glass btn-sm" onclick="closeModal('modal-connect-hardware')">&times;</button>
        </div>

        
        <!-- Direct USB Serial Cable Interface (Zero Clutter) -->
        <input type="hidden" id="hw-connect-port" value="USB">

        <!-- TAB 1: Direct USB Serial Cable -->
        <div class="liquid-tab-pane active" id="pane-hw-usb">
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-radius: var(--radius-md); background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.20); margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 9px;">
                    <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; stroke: var(--accent-emerald); fill: none; stroke-width: 2;"><rect x="4" y="4" width="16" height="16" rx="2"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line></svg>
                    <span style="font-weight: 600; color: var(--accent-emerald); font-size: 13px;">Direct USB Serial Cable</span>
                </div>
                <span class="badge-pill badge-emerald" style="font-size: 10px;">9600 BAUD</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
                <button type="button" class="btn btn-amber btn-sm" onclick="startSimulatedDemoMode()">Demo Simulation</button>
                <button type="button" class="btn btn-emerald" id="btn-confirm-connect-usb" onclick="executeUsbSerialConnect()">
                    <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 2;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                    <span>Connect USB Cable</span>
                </button>
            </div>
        </div>

        <!-- Hidden backward-compatibility elements for tests -->
        <div id="pane-hw-bt" style="display: none;"></div>
        <button type="button" id="btn-confirm-connect-bt" style="display: none;" onclick="executeBluetoothConnect()"></button>
        <button type="button" id="tab-btn-usb" style="display: none;"></button>
        <button type="button" id="tab-btn-bt" style="display: none;"></button>

        <!-- Shared Status Log Box -->
        <div id="hw-connect-status-log" class="status-log-box" style="margin-top: 14px;"></div>
        
        <!-- Legacy bridge button for E2E tests -->
        <button type="button" id="btn-confirm-connect" style="display: none;" onclick="executeHardwareConnect()"></button>

    </div>
</div>

<!-- Modal: Sole Confirmation Sign Out (Sidebar Identity Pod triggers this) -->
<div class="modal-backdrop" id="modal-signout">
    <div class="modal-card" style="max-width: 440px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
            <div class="jewel-icon-box jewel-crimson">
                <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            </div>
            <h3 style="font-family: var(--font-heading); font-size: 16px; font-weight: 700; color: var(--text-main);">Sign Out Confirmation</h3>
        </div>
        <p style="font-size: 13.5px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 20px;">
            Are you sure you want to sign out of your session as <strong>${sessionScope.user != null ? fn:escapeXml(sessionScope.user.fullName) : "Administrator"}</strong>? Autonomous background misting schedules will continue operating safely on the controller.
        </p>
        <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button class="btn btn-glass" onclick="closeModal('modal-signout')">Cancel</button>
            <a href="${pageContext.request.contextPath}/logout" class="btn btn-crimson" style="text-decoration: none;">
                Sign Out
            </a>
        </div>
    </div>
</div>

<!-- Modal: Safety Confirmation - Switch from AUTO to MANUAL -->
<div class="modal-backdrop" id="modal-confirm-switch-manual">
    <div class="modal-card" style="max-width: 440px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
            <div class="jewel-icon-box jewel-amber">
                <svg viewBox="0 0 24 24" style="stroke: currentColor; fill: none; stroke-width: 2.2;">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
            </div>
            <h3 style="font-family: var(--font-heading); font-size: 16px; font-weight: 700; color: var(--text-main);">Confirm Manual Override</h3>
        </div>
        <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 20px;" id="modal-confirm-manual-desc">
            Switching to <strong>MANUAL</strong> mode will pause autonomous sensor-driven irrigation cycles. The system will rely solely on operator commands. Are you sure you want to proceed?
        </p>
        <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button type="button" class="btn btn-glass" onclick="closeModal('modal-confirm-switch-manual')">Cancel</button>
            <button type="button" class="btn btn-amber" id="btn-modal-confirm-manual-proceed" style="font-weight: 700;">
                Switch to Manual
            </button>
        </div>
    </div>
</div>

<!-- Modal: Create New User -->
<div class="modal-backdrop" id="modal-create-user">
    <div class="modal-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
            <h3 style="font-family: var(--font-heading); font-size: 16px; font-weight: 700; color: var(--text-main);">Create User Account</h3>
            <button class="btn btn-glass btn-sm" onclick="closeModal('modal-create-user')">&times;</button>
        </div>

        <div class="form-group">
            <label class="form-label">Username (Unique Identifier)</label>
            <input type="text" class="input-control mono" id="new-user-name" placeholder="e.g. staff_alex">
        </div>

        <div class="form-group">
            <label class="form-label">Full Name</label>
            <input type="text" class="input-control" id="new-user-fullname" placeholder="e.g. Alex Henderson">
        </div>

        <div class="form-group">
            <label class="form-label">Email Address</label>
            <input type="email" class="input-control" id="new-user-email" placeholder="alex@example.com">
        </div>

        <div class="form-group">
            <label class="form-label">Initial Password</label>
            <input type="password" class="input-control" id="new-user-password" value="12345">
        </div>

        <div class="form-group">
            <label class="form-label">Role Permissions (RBAC)</label>
            <select class="input-control" id="new-user-role">
                <option value="STAFF">STAFF (Operations &amp; Pump Control)</option>
                <option value="VIEWER">VIEWER (Telemetry Monitoring Only)</option>
                <option value="ADMIN">ADMIN (Full System Administrator)</option>
            </select>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px;">
            <button class="btn btn-glass" onclick="closeModal('modal-create-user')">Cancel</button>
            <button class="btn btn-emerald" onclick="submitCreateUser()">Add User</button>
        </div>
    </div>
</div>

<!-- Modal: Edit User -->
<div class="modal-backdrop" id="modal-edit-user">
    <div class="modal-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
            <h3 style="font-family: var(--font-heading); font-size: 16px; font-weight: 700; color: var(--text-main);">Edit User Account</h3>
            <button class="btn btn-glass btn-sm" onclick="closeModal('modal-edit-user')">&times;</button>
        </div>

        <input type="hidden" id="edit-user-id">

        <div class="form-group">
            <label class="form-label">Username</label>
            <input type="text" class="input-control mono" id="edit-user-name" readonly style="opacity: 0.7;">
        </div>

        <div class="form-group">
            <label class="form-label">Full Name</label>
            <input type="text" class="input-control" id="edit-user-fullname">
        </div>

        <div class="form-group">
            <label class="form-label">Email Address</label>
            <input type="email" class="input-control" id="edit-user-email">
        </div>

        <div class="form-group">
            <label class="form-label">Role Permissions (RBAC)</label>
            <select class="input-control" id="edit-user-role">
                <option value="ADMIN">ADMIN</option>
                <option value="STAFF">STAFF</option>
                <option value="VIEWER">VIEWER</option>
            </select>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px;">
            <button class="btn btn-glass" onclick="closeModal('modal-edit-user')">Cancel</button>
            <button class="btn btn-emerald" onclick="submitUpdateUser()">Save Changes</button>
        </div>
    </div>
</div>

<!-- Modal: Add Plant Profile -->
<div class="modal-backdrop" id="modal-create-plant">
    <div class="modal-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
            <h3 style="font-family: var(--font-heading); font-size: 16px; font-weight: 700; color: var(--text-main);">Add New Plant Profile</h3>
            <button class="btn btn-glass btn-sm" onclick="closeModal('modal-create-plant')">&times;</button>
        </div>

        <div class="form-group">
            <label class="form-label">Common Species Name</label>
            <input type="text" class="input-control" id="plant-name" placeholder="e.g. Boston Fern, Cherry Tomato...">
        </div>

        <div class="form-group">
            <label class="form-label">Scientific Botanical Nomenclature</label>
            <input type="text" class="input-control mono" id="plant-sci" placeholder="e.g. Nephrolepis exaltata">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
                <label class="form-label">Misting Trigger Minimum Moisture (%)</label>
                <input type="number" class="input-control mono" id="plant-min" value="40" min="10" max="90">
            </div>
            <div class="form-group">
                <label class="form-label">Misting Cutoff Target Moisture (%)</label>
                <input type="number" class="input-control mono" id="plant-max" value="65" min="20" max="95">
            </div>
        </div>

        <div class="form-group">
            <label class="form-label">Misting Cycle Duration (Seconds)</label>
            <input type="number" class="input-control mono" id="plant-burst" value="10" min="3" max="60">
        </div>

        <div class="form-group">
            <label class="form-label">Horticultural Care Guidelines</label>
            <input type="text" class="input-control" id="plant-notes" placeholder="e.g. Porous soil, prefers fine ultrasonic mist...">
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px;">
            <button class="btn btn-glass" onclick="closeModal('modal-create-plant')">Cancel</button>
            <button class="btn btn-emerald" onclick="submitCreatePlant()">Add Plant Profile</button>
        </div>
    </div>
</div>

<!-- Modal: Edit Plant Profile -->
<div class="modal-backdrop" id="modal-edit-plant">
    <div class="modal-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
            <h3 style="font-family: var(--font-heading); font-size: 16px; font-weight: 700; color: var(--text-main);">Edit Plant Profile</h3>
            <button class="btn btn-glass btn-sm" onclick="closeModal('modal-edit-plant')">&times;</button>
        </div>

        <input type="hidden" id="edit-plant-id">

        <div class="form-group">
            <label class="form-label">Common Species Name</label>
            <input type="text" class="input-control" id="edit-plant-name" placeholder="e.g. Lavender">
        </div>

        <div class="form-group">
            <label class="form-label">Scientific Botanical Nomenclature</label>
            <input type="text" class="input-control mono" id="edit-plant-sci" placeholder="e.g. Lavandula angustifolia">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
                <label class="form-label">Misting Trigger Minimum Moisture (%)</label>
                <input type="number" class="input-control mono" id="edit-plant-min" min="10" max="90">
            </div>
            <div class="form-group">
                <label class="form-label">Misting Cutoff Target Moisture (%)</label>
                <input type="number" class="input-control mono" id="edit-plant-max" min="20" max="95">
            </div>
        </div>

        <div class="form-group">
            <label class="form-label">Misting Cycle Duration (Seconds)</label>
            <input type="number" class="input-control mono" id="edit-plant-burst" min="3" max="60">
        </div>

        <div class="form-group">
            <label class="form-label">Horticultural Care Guidelines</label>
            <input type="text" class="input-control" id="edit-plant-notes" placeholder="e.g. Well-draining soil, delicate misting.">
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px;">
            <button class="btn btn-glass" onclick="closeModal('modal-edit-plant')">Cancel</button>
            <button class="btn btn-emerald" onclick="submitUpdatePlant()">Save Changes</button>
        </div>
    </div>
</div>

<!-- SweetAlert2 UI Engine -->
<script charset="UTF-8" src="${pageContext.request.contextPath}/js/sweetalert2.all.min.js"></script>
<!-- 3D Digital Twin Simulation Engine & Vendor Dependencies -->
<script charset="UTF-8" src="${pageContext.request.contextPath}/js/vendor/three.min.js"></script>
<script charset="UTF-8" src="${pageContext.request.contextPath}/js/garden3d.js?v=36_v34"></script>
<!-- Master Core JS Engine with Cache Busting -->
<script charset="UTF-8" src="${pageContext.request.contextPath}/js/main.js?v=42"></script>
<script src="${pageContext.request.contextPath}/js/prj-integration.js?v=36_v34"></script>
</body>
</html>
