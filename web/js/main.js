/**
 * SMART MISTING SYSTEM - JAVASCRIPT UTILITIES
 * PRJ301 - Group 5
 */

document.addEventListener('DOMContentLoaded', function () {
    // 1. Auto-dismiss flash alerts after 5 seconds
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(function (alert) {
        setTimeout(function () {
            alert.style.opacity = '0';
            alert.style.transition = 'opacity 0.5s ease-out';
            setTimeout(function () {
                alert.remove();
            }, 500);
        }, 5000);
    });

    // 2. Modal open/close triggers
    document.querySelectorAll('[data-modal-target]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('data-modal-target');
            const modal = document.getElementById(targetId);
            if (modal) {
                modal.classList.add('show');
            }
        });
    });

    document.querySelectorAll('.modal-close, [data-modal-close]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const modal = this.closest('.modal-overlay');
            if (modal) {
                modal.classList.remove('show');
            }
        });
    });

    // Close modal when clicking outside container
    document.querySelectorAll('.modal-overlay').forEach(function (overlay) {
        overlay.addEventListener('click', function (e) {
            if (e.target === this) {
                this.classList.remove('show');
            }
        });
    });

    // 3. Confirm prompts
    document.querySelectorAll('[data-confirm]').forEach(function (el) {
        el.addEventListener('click', function (e) {
            const msg = this.getAttribute('data-confirm') || 'Bạn có chắc chắn muốn thực hiện thao tác này?';
            if (!confirm(msg)) {
                e.preventDefault();
            }
        });
    });

    // 4. Live Telemetry Poller for Dashboard (if on dashboard page)
    const dashboardGauge = document.getElementById('telemetry-temp');
    if (dashboardGauge) {
        setInterval(function () {
            fetch(window.contextPath + '/api/sensor')
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    if (data && data.status === 'success') {
                        // Update Temp
                        const tempEl = document.getElementById('telemetry-temp');
                        if (tempEl && data.temperature_c !== undefined) {
                            tempEl.innerText = parseFloat(data.temperature_c).toFixed(1);
                        }
                        // Update Humidity
                        const humEl = document.getElementById('telemetry-hum');
                        if (humEl && data.humidity_pct !== undefined) {
                            humEl.innerText = parseFloat(data.humidity_pct).toFixed(1);
                        }
                        // Update Pump Status badge
                        const pumpBadge = document.getElementById('pump-status-badge');
                        if (pumpBadge) {
                            if (data.pump_on) {
                                pumpBadge.className = 'badge badge-success';
                                pumpBadge.innerHTML = '<span class="pulse-indicator active"></span> ĐANG BẬT';
                            } else {
                                pumpBadge.className = 'badge badge-viewer';
                                pumpBadge.innerHTML = '<span class="pulse-indicator"></span> ĐANG TẮT';
                            }
                        }
                        // Update Mode Badge
                        const modeBadge = document.getElementById('mode-status-badge');
                        if (modeBadge && data.reported_mode) {
                            modeBadge.innerText = data.reported_mode;
                        }
                        // Update Water Badge
                        const waterBadge = document.getElementById('water-status-badge');
                        if (waterBadge) {
                            if (data.water_ok) {
                                waterBadge.className = 'badge badge-success';
                                waterBadge.innerText = 'ĐỦ NƯỚC';
                            } else {
                                waterBadge.className = 'badge badge-danger';
                                waterBadge.innerText = 'CẠN NƯỚC';
                            }
                        }
                    }
                })
                .catch(function (err) {
                    // Fail silently in case of temporary network glitches
                });
        }, 3500); // Poll every 3.5 seconds
    }
});
