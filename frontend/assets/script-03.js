
        // --- AUTHENTICATION & ROLE CONFIG ---
        const STAFF_ACCOUNTS = [
            { role: 'admin', label: 'ADMIN', name: 'Quản trị viên', email: 'admin@gmail.com', password: 'admin123', defaultTab: 'dashboard' },
            { role: 'reception', label: 'LỄ TÂN', name: 'Nhân viên Lễ tân', email: 'letan@gmail.com', password: 'letan123', defaultTab: 'rooms' }
        ];

        let ROLE_CONFIG = null;
        let CURRENT_USER = null;

        function getCustomerAccounts() {
            try { return JSON.parse(localStorage.getItem('grandhotel_customers') || '[]'); }
            catch (_) { return []; }
        }

        function saveCustomerAccounts(accounts) {
            localStorage.setItem('grandhotel_customers', JSON.stringify(accounts));
        }

        function showAuthTab(tab) {
            const loginForm = document.getElementById('role-login-form');
            const registerForm = document.getElementById('customer-register-form');
            const loginTab = document.getElementById('auth-tab-login');
            const registerTab = document.getElementById('auth-tab-register');
            const active = ['bg-white','text-slate-900','shadow-sm'];
            const inactive = ['text-slate-500'];
            [loginTab, registerTab].forEach(btn => btn.className = 'rounded-xl py-2.5 text-sm font-bold hover:bg-white');
            if (tab === 'register') {
                loginForm.classList.add('hidden');
                registerForm.classList.remove('hidden');
                registerTab.classList.add(...active);
                loginTab.classList.add(...inactive);
            } else {
                registerForm.classList.add('hidden');
                loginForm.classList.remove('hidden');
                loginTab.classList.add(...active);
                registerTab.classList.add(...inactive);
            }
        }

        function setupUnifiedAuth() {
            document.getElementById('role-login-form').addEventListener('submit', function(e) {
                e.preventDefault();
                const email = document.getElementById('login-email').value.trim().toLowerCase();
                const password = document.getElementById('login-password').value;
                const error = document.getElementById('login-error');
                error.classList.add('hidden');

                if (!email.endsWith('@gmail.com')) {
                    return showLoginError('Email đăng nhập phải có đuôi @gmail.com.');
                }

                const staff = STAFF_ACCOUNTS.find(a => a.email.toLowerCase() === email && a.password === password);
                if (staff) {
                    loginSuccess(staff, { name: staff.name, email: staff.email, role: staff.role });
                    return;
                }

                const customer = getCustomerAccounts().find(a => a.email.toLowerCase() === email && a.password === password);
                if (customer) {
                    const config = { role: 'customer', label: 'KHÁCH HÀNG', name: customer.name, email: customer.email, password: '', defaultTab: 'customer-profile' };
                    loginSuccess(config, { name: customer.name, email: customer.email, phone: customer.phone, role: 'customer' });
                    return;
                }

                showLoginError('Email hoặc mật khẩu không đúng. Khách hàng chưa có tài khoản hãy chọn “Đăng ký khách hàng”.');
            });

            document.getElementById('customer-register-form').addEventListener('submit', function(e) {
                e.preventDefault();
                const name = document.getElementById('register-name').value.trim();
                const email = document.getElementById('register-email').value.trim().toLowerCase();
                const phone = document.getElementById('register-phone').value.trim();
                const password = document.getElementById('register-password').value;
                const confirm = document.getElementById('register-confirm-password').value;
                const error = document.getElementById('register-error');
                const success = document.getElementById('register-success');
                error.classList.add('hidden'); success.classList.add('hidden');

                if (!email.endsWith('@gmail.com')) return showRegisterError('Email khách hàng phải có đuôi @gmail.com.');
                if (STAFF_ACCOUNTS.some(a => a.email.toLowerCase() === email)) return showRegisterError('Email này là tài khoản nhân viên và không thể đăng ký khách hàng.');
                if (password.length < 6) return showRegisterError('Mật khẩu phải có ít nhất 6 ký tự.');
                if (password !== confirm) return showRegisterError('Hai mật khẩu nhập lại không khớp.');
                if (!/^0\d{9}$/.test(phone)) return showRegisterError('Số điện thoại cần gồm 10 chữ số và bắt đầu bằng 0.');

                const accounts = getCustomerAccounts();
                if (accounts.some(a => a.email.toLowerCase() === email)) return showRegisterError('Email này đã được đăng ký. Hãy chuyển sang Đăng nhập.');

                accounts.push({ id: 'CUS-' + Date.now(), name, email, phone, password, createdAt: new Date().toISOString() });
                saveCustomerAccounts(accounts);
                logSystemActivity('AUTH', 'Khách hàng đăng ký tài khoản', `${name} đã tạo tài khoản khách hàng ${email}.`, { actor: { name, email, role: 'customer' } });
                success.textContent = 'Đăng ký thành công! Bạn có thể đăng nhập bằng tài khoản vừa tạo.';
                success.classList.remove('hidden');
                document.getElementById('customer-register-form').reset();
                setTimeout(() => {
                    showAuthTab('login');
                    document.getElementById('login-email').value = email;
                    document.getElementById('login-password').focus();
                }, 700);
            });

            restoreSession();
        }

        function showLoginError(message) {
            const el = document.getElementById('login-error');
            el.textContent = message; el.classList.remove('hidden');
        }
        function showRegisterError(message) {
            const el = document.getElementById('register-error');
            el.textContent = message; el.classList.remove('hidden');
        }

        function loginSuccess(config, user) {
            ROLE_CONFIG = config;
            CURRENT_USER = user;
            document.body.dataset.role = config.role || '';
            sessionStorage.setItem('grandhotel_session', JSON.stringify({ config, user }));
            logSystemActivity('AUTH', 'Đăng nhập hệ thống', `${user.email} đăng nhập với vai trò ${config.label || config.role}.`);
            document.getElementById('login-overlay').classList.add('hidden');
            updateCurrentUserUI();
            renderRooms();
            applyRolePermissions();
            updateStaffNotifications();
            if (config.role === 'customer') { renderCustomerProfile(); renderCustomerPortal(); renderCustomerAdminSupportHistory(); }
            else renderStaffRequests();
            setTimeout(restoreAiConversation, 0);
            switchTab(config.role === 'customer' ? 'customer-booking' : config.defaultTab);
        }

        function restoreSession() {
            try {
                const session = JSON.parse(sessionStorage.getItem('grandhotel_session') || 'null');
                if (!session || !session.config || !session.user) return;
                ROLE_CONFIG = session.config;
                CURRENT_USER = session.user;
                document.body.dataset.role = ROLE_CONFIG.role || '';
                document.getElementById('login-overlay').classList.add('hidden');
                updateCurrentUserUI();
                renderRooms();
                applyRolePermissions();
                updateStaffNotifications();
                if (ROLE_CONFIG.role === 'customer') { renderCustomerProfile(); renderCustomerPortal(); renderCustomerAdminSupportHistory(); renderCustomerPayments(); }
                else renderStaffRequests();
                setTimeout(restoreAiConversation, 0);
                switchTab(ROLE_CONFIG.role === 'customer' ? 'customer-booking' : ROLE_CONFIG.defaultTab);
            } catch (_) { sessionStorage.removeItem('grandhotel_session'); }
        }

        function getCurrentCustomerAccount() {
            if (!CURRENT_USER || ROLE_CONFIG?.role !== 'customer') return null;
            return getCustomerAccounts().find(a => (a.email || '').toLowerCase() === (CURRENT_USER.email || '').toLowerCase()) || null;
        }

        function renderCustomerProfile() {
            if (!CURRENT_USER || ROLE_CONFIG?.role !== 'customer') return;
            const account = getCurrentCustomerAccount() || CURRENT_USER;
            const setVal = (id, value='') => { const el = document.getElementById(id); if (el) el.value = value || ''; };
            setVal('customer-profile-name', account.name);
            setVal('customer-profile-email', account.email);
            setVal('customer-profile-phone', account.phone);
            setVal('customer-profile-dob', account.dob);
            setVal('customer-profile-idcard', account.idCard);
            setVal('customer-profile-gender', account.gender);
            setVal('customer-profile-address', account.address);
            setVal('customer-profile-preferences', account.preferences);
            const name = account.name || 'Khách hàng';
            const initials = name.trim().split(/\s+/).slice(-2).map(x => x[0]?.toUpperCase() || '').join('') || 'KH';
            const text = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value || '---'; };
            text('customer-profile-avatar', initials);
            text('customer-profile-heading', `Xin chào, ${name}`);
            text('customer-profile-summary-name', name);
            text('customer-profile-summary-email', account.email);
            text('customer-profile-summary-phone', account.phone);
            let created = '---';
            if (account.createdAt) { try { created = new Date(account.createdAt).toLocaleString('vi-VN'); } catch (_) {} }
            text('customer-profile-created', created);
            const msg = document.getElementById('customer-profile-message');
            if (msg) { msg.textContent = ''; msg.className = 'text-sm font-semibold'; }
        }

        function saveCustomerProfile(e) {
            e.preventDefault();
            if (!CURRENT_USER || ROLE_CONFIG?.role !== 'customer') return;
            const name = document.getElementById('customer-profile-name').value.trim();
            const phone = document.getElementById('customer-profile-phone').value.trim();
            const message = document.getElementById('customer-profile-message');
            if (!name) { message.textContent = 'Vui lòng nhập họ và tên.'; message.className='text-sm font-semibold text-rose-600'; return; }
            if (!/^0\d{9}$/.test(phone)) { message.textContent = 'Số điện thoại cần gồm 10 chữ số và bắt đầu bằng 0.'; message.className='text-sm font-semibold text-rose-600'; return; }
            const accounts = getCustomerAccounts();
            const idx = accounts.findIndex(a => (a.email || '').toLowerCase() === (CURRENT_USER.email || '').toLowerCase());
            if (idx < 0) { message.textContent = 'Không tìm thấy tài khoản khách hàng để cập nhật.'; message.className='text-sm font-semibold text-rose-600'; return; }
            const oldName = accounts[idx].name;
            accounts[idx] = {
                ...accounts[idx],
                name,
                phone,
                dob: document.getElementById('customer-profile-dob').value,
                idCard: document.getElementById('customer-profile-idcard').value.trim(),
                gender: document.getElementById('customer-profile-gender').value,
                address: document.getElementById('customer-profile-address').value.trim(),
                preferences: document.getElementById('customer-profile-preferences').value.trim(),
                updatedAt: new Date().toISOString()
            };
            saveCustomerAccounts(accounts);
            CURRENT_USER = { ...CURRENT_USER, ...accounts[idx], password: undefined, role: 'customer' };
            if (ROLE_CONFIG) ROLE_CONFIG.name = name;
            sessionStorage.setItem('grandhotel_session', JSON.stringify({ config: ROLE_CONFIG, user: CURRENT_USER }));
            updateCurrentUserUI();
            renderCustomerProfile();
            renderCustomerPortal();
            logSystemActivity('PROFILE', 'Khách hàng cập nhật hồ sơ', `${CURRENT_USER.email} cập nhật thông tin cá nhân${oldName !== name ? `, đổi tên từ ${oldName} thành ${name}` : ''}.`);
            message.textContent = 'Đã lưu thông tin cá nhân thành công.';
            message.className = 'text-sm font-semibold text-emerald-600';
            setTimeout(() => { if (message.textContent.includes('thành công')) message.textContent=''; }, 3500);
        }

        function toggleAccountMenu(force) {
            const menu = document.getElementById('account-menu');
            const open = typeof force === 'boolean' ? force : menu.hidden;
            menu.hidden = !open;
            document.getElementById('account-trigger').setAttribute('aria-expanded', String(open));
        }

        function openProfileDialog() {
            if (ROLE_CONFIG?.role !== 'customer') return;
            toggleAccountMenu(false);
            let dialog = document.getElementById('profile-dialog');
            if (!dialog) {
                dialog = document.createElement('dialog');
                dialog.id = 'profile-dialog';
                dialog.setAttribute('aria-labelledby', 'profile-dialog-title');
                dialog.innerHTML = '<div class="profile-dialog-head"><div><h3 id="profile-dialog-title" class="font-bold text-lg">Thông tin cá nhân</h3><p class="text-sm text-slate-500">Quản lý hồ sơ của bạn tại đây.</p></div><button type="button" onclick="closeProfileDialog()" aria-label="Đóng hồ sơ" class="w-10 h-10 rounded-full hover:bg-slate-100">✕</button></div>';
                document.body.appendChild(dialog);
                dialog.appendChild(document.getElementById('module-customer-profile'));
                dialog.addEventListener('click', e => {
                    const r = dialog.getBoundingClientRect();
                    if(e.target === dialog && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) closeProfileDialog();
                });
                dialog.addEventListener('close', () => document.getElementById('account-trigger').focus());
            }
            renderCustomerProfile();
            document.getElementById('module-customer-profile').classList.remove('hidden');
            if (!dialog.open) dialog.showModal();
        }

        function closeProfileDialog() { document.getElementById('profile-dialog')?.close(); }
        document.addEventListener('click', e => { if (!e.target.closest('#account-area')) toggleAccountMenu(false); });
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && !document.getElementById('account-menu').hidden) { toggleAccountMenu(false); document.getElementById('account-trigger').focus(); } });

        function updateCurrentUserUI() {
            if (!CURRENT_USER || !ROLE_CONFIG) return;
            document.getElementById('profile-role-name').textContent = ROLE_CONFIG.role === 'customer' ? CURRENT_USER.name : ROLE_CONFIG.name;
            document.getElementById('profile-role-email').textContent = CURRENT_USER.email;
            document.getElementById('account-name').textContent = CURRENT_USER.name || 'Tài khoản';
            document.getElementById('account-email').textContent = CURRENT_USER.email || '';
            document.getElementById('account-avatar').textContent = (CURRENT_USER.name || 'KH').trim().split(/\s+/).slice(-2).map(x=>x[0]).join('').toUpperCase();
        }

        function togglePassword(id = 'login-password') {
            const input = document.getElementById(id);
            input.type = input.type === 'password' ? 'text' : 'password';
        }

        function logoutRole() {
            closeProfileDialog();
            toggleAccountMenu(false);
            sessionStorage.removeItem('grandhotel_session');
            ROLE_CONFIG = null;
            CURRENT_USER = null;
            delete document.body.dataset.role;
            document.getElementById('profile-role-name').textContent = 'Chưa đăng nhập';
            document.getElementById('profile-role-email').textContent = '---';
            document.getElementById('login-password').value = '';
            showAuthTab('login');
            document.getElementById('login-overlay').classList.remove('hidden');
            document.getElementById('customer-booking-modal')?.classList.add('hidden');
            updateStaffNotifications();
        }

        function applyRolePermissions() {
            if (!ROLE_CONFIG) return;
            const role = ROLE_CONFIG.role;
            const hide = (selector) => document.querySelectorAll(selector).forEach(el => el.classList.add('hidden'));
            const show = (selector) => document.querySelectorAll(selector).forEach(el => el.classList.remove('hidden'));

            // Reset menu/header controls before applying each role.
            show('#nav-dashboard, #nav-rooms, #nav-bookings, #nav-services, #nav-customers, #nav-ai-assistant, #global-search-wrap, #notification-btn, #quick-action-btn');
            hide('#nav-admin-control, #nav-admin-reports, #nav-requests, #nav-customer-profile, #nav-customer-booking, #nav-customer-services, #nav-customer-payment, #nav-customer-feedback, #customer-admin-support, #customer-ai-actions, #customer-consult-switch');
            show('button[onclick^="openAddRoomModal"], button[onclick^="toggleMaintenance"], button[onclick^="quickCheckin"], button[onclick^="openInvoiceModal"], #btn-confirm-checkout');

            const quickBtn = document.getElementById('quick-action-btn');
            const quickLabel = document.getElementById('quick-action-label');
            const quickIcon = document.getElementById('quick-action-icon');
            if (quickBtn) quickBtn.setAttribute('onclick', "openBookingModal()");
            if (quickLabel) quickLabel.textContent = 'Tạo Đặt Phòng';
            if (quickIcon) quickIcon.className = 'fa-solid fa-plus text-amber-400';

            if (role === 'admin') {
                show('#nav-admin-control, #nav-admin-reports, #nav-requests');
            } else if (role === 'reception') {
                // Lễ tân chỉ quản lý khách ở phòng nào và dịch vụ theo phòng.
                hide('#nav-dashboard, #nav-bookings, #nav-customers, #nav-ai-assistant, #nav-admin-control');
                show('#nav-requests');
                hide('button[onclick^="openAddRoomModal"], button[onclick^="toggleMaintenance"]');
                hide('#quick-action-btn');
            } else if (role === 'customer') {
                // Khách hàng có: đặt phòng, yêu cầu dịch vụ và AI tư vấn du lịch/ngân sách.
                hide('#nav-dashboard, #nav-rooms, #nav-bookings, #nav-services, #nav-customers, #nav-admin-control, #nav-requests');
                show('#nav-customer-profile, #nav-customer-booking, #nav-customer-services, #nav-customer-payment, #nav-customer-feedback, #nav-ai-assistant, #customer-ai-actions, #customer-consult-switch');
                setTimeout(() => setCustomerConsultMode('ai'), 0);
                hide('button[onclick^="openAddRoomModal"], button[onclick^="toggleMaintenance"], button[onclick^="quickCheckin"], button[onclick^="openInvoiceModal"], #btn-confirm-checkout');
                hide('#global-search-wrap, #notification-btn');
                if (quickBtn) quickBtn.setAttribute('onclick', "switchTab('customer-booking')");
                if (quickLabel) quickLabel.textContent = 'Chọn phòng trống';
                if (quickIcon) quickIcon.className = 'fa-solid fa-bed text-amber-400';
            }

            // Tùy biến phần AI theo vai trò.
            const aiNavLabel = document.getElementById('ai-nav-label');
            const aiTitle = document.getElementById('ai-module-title');
            const aiSubtitle = document.getElementById('ai-module-subtitle');
            const aiPlanner = document.getElementById('customer-ai-planner');
            if (aiPlanner) aiPlanner.classList.add('hidden');
            if (role === 'customer') {
                if (aiNavLabel) aiNavLabel.textContent = 'AI trợ lý khách hàng';
                if (aiTitle) aiTitle.childNodes[0].textContent = 'AI Smart Concierge • Grand Hotel ';
                if (aiSubtitle) aiSubtitle.textContent = 'Tư vấn địa điểm du lịch, phòng và dịch vụ theo ngân sách của bạn';
                if (aiPlanner) aiPlanner.classList.remove('hidden');
            } else {
                if (aiNavLabel) aiNavLabel.textContent = 'Trợ lý Hotel AI';
                if (aiTitle) aiTitle.childNodes[0].textContent = 'Hotel AI Concierge ';
                if (aiSubtitle) aiSubtitle.textContent = 'Hỗ trợ quản lý khách sạn, gói dịch vụ và tư vấn trải nghiệm cho khách';
            }
        }

        function calculateStayNights(room) {
            if (!room || !room.checkin || !room.checkout) return 1;
            const start = new Date(room.checkin + 'T00:00:00');
            const end = new Date(room.checkout + 'T00:00:00');
            const diff = Math.round((end - start) / 86400000);
            return Number.isFinite(diff) && diff > 0 ? diff : 1;
        }

        function getOpenServiceLogsForRoom(roomId) {
            return serviceLogs.filter(s => s.roomId === roomId && !s.closed);
        }

        function renderAdminControl() {
            if (!ROLE_CONFIG || ROLE_CONFIG.role !== 'admin') return;
            renderAdminActivityCenter();
            renderAdminRoomOverview();
            const accounts = getCustomerAccounts();
            const tbody = document.getElementById('admin-accounts-table');
            if (!tbody) return;

            const serviceRevenueAll = serviceLogs.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
            const paidRevenue = revenueHistory.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
            const activeRooms = rooms.filter(r => r.guest && (r.status === 'OCCUPIED' || r.status === 'BOOKED'));
            const activeRoomRevenue = activeRooms.reduce((sum, room) => sum + (Number(room.price) || 0) * calculateStayNights(room), 0);
            const openServiceRevenue = activeRooms.reduce((sum, room) => sum + getOpenServiceLogsForRoom(room.id).reduce((a, x) => a + (Number(x.total) || 0), 0), 0);
            const totalControl = paidRevenue + activeRoomRevenue + openServiceRevenue;

            document.getElementById('admin-customer-account-count').textContent = accounts.length;
            document.getElementById('admin-room-count').textContent = rooms.length;
            document.getElementById('admin-occupied-count').textContent = rooms.filter(r => r.status === 'OCCUPIED').length;
            document.getElementById('admin-service-revenue').textContent = serviceRevenueAll.toLocaleString('vi-VN') + ' ₫';
            const setMoney = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value.toLocaleString('vi-VN') + ' ₫'; };
            setMoney('admin-active-room-revenue', activeRoomRevenue);
            setMoney('admin-service-revenue-detail', serviceRevenueAll);
            setMoney('admin-paid-revenue', paidRevenue);
            setMoney('admin-total-revenue-control', totalControl);

            const roomRevenueBody = document.getElementById('admin-room-revenue-table');
            if (roomRevenueBody) {
                roomRevenueBody.innerHTML = activeRooms.length ? activeRooms.map(room => {
                    const nights = calculateStayNights(room);
                    const roomRevenue = (Number(room.price) || 0) * nights;
                    const serviceRevenue = getOpenServiceLogsForRoom(room.id).reduce((sum, x) => sum + (Number(x.total) || 0), 0);
                    const status = room.status === 'OCCUPIED' ? 'Đang ở' : 'Đã đặt';
                    return `<tr class="hover:bg-slate-50"><td class="p-3 font-bold">${room.id}</td><td class="p-3">${room.guest || '—'}</td><td class="p-3"><span class="text-xs font-bold px-2 py-1 rounded-full ${room.status==='OCCUPIED'?'bg-blue-100 text-blue-700':'bg-amber-100 text-amber-700'}">${status}</span></td><td class="p-3">${nights}</td><td class="p-3 text-right font-semibold">${roomRevenue.toLocaleString('vi-VN')} ₫</td><td class="p-3 text-right">${serviceRevenue.toLocaleString('vi-VN')} ₫</td><td class="p-3 text-right font-extrabold text-emerald-700">${(roomRevenue + serviceRevenue).toLocaleString('vi-VN')} ₫</td></tr>`;
                }).join('') : '<tr><td colspan="7" class="p-5 text-center text-slate-400">Hiện không có phòng đặt/đang ở để tính doanh thu.</td></tr>';
            }

            const paymentBody = document.getElementById('admin-payment-history-table');
            if (paymentBody) {
                paymentBody.innerHTML = revenueHistory.length ? revenueHistory.slice().reverse().map(r => `<tr><td class="p-3 text-xs text-slate-500">${r.time || '—'}</td><td class="p-3 font-bold">${r.roomId || '—'}</td><td class="p-3">${r.guest || '—'}</td><td class="p-3 text-right">${(Number(r.roomRevenue)||0).toLocaleString('vi-VN')} ₫</td><td class="p-3 text-right">${(Number(r.serviceRevenue)||0).toLocaleString('vi-VN')} ₫</td><td class="p-3 text-right font-extrabold text-emerald-700">${(Number(r.total)||0).toLocaleString('vi-VN')} ₫</td></tr>`).join('') : '<tr><td colspan="6" class="p-5 text-center text-slate-400">Chưa có hóa đơn nào được thanh toán trong phiên dữ liệu này.</td></tr>';
            }

            const serviceSummaryBody = document.getElementById('admin-service-summary-table');
            if (serviceSummaryBody) {
                const summary = {};
                Object.keys(serviceCatalog).forEach(type => summary[type] = { qty: 0, revenue: 0 });
                serviceLogs.forEach(log => {
                    const type = log.type || 'Khác';
                    if (!summary[type]) summary[type] = { qty: 0, revenue: 0 };
                    summary[type].qty += Number(log.qty) || 0;
                    summary[type].revenue += Number(log.total) || 0;
                });
                serviceSummaryBody.innerHTML = Object.entries(summary).map(([type, x]) => `<tr><td class="p-3 font-semibold">${type}</td><td class="p-3 text-right">${x.qty}</td><td class="p-3 text-right font-bold">${x.revenue.toLocaleString('vi-VN')} ₫</td></tr>`).join('');
            }

            const categorySelect = document.getElementById('admin-service-category');
            if (categorySelect) categorySelect.innerHTML = Object.keys(serviceCatalog).map(type => `<option value="${type}">${type}</option>`).join('');

            const catalogBody = document.getElementById('admin-service-catalog-table');
            if (catalogBody) {
                const rows = [];
                Object.entries(serviceCatalog).forEach(([type, items]) => items.forEach((item, index) => rows.push(`<tr><td class="p-3"><span class="text-xs bg-purple-50 text-purple-700 font-semibold px-2 py-1 rounded">${type}</span></td><td class="p-3 font-medium">${item.name}</td><td class="p-3 text-right">${(Number(item.price)||0).toLocaleString('vi-VN')} ₫</td><td class="p-3 text-right"><button onclick="deleteCatalogService('${type.replace(/'/g,"\\'")}', ${index})" class="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100"><i class="fa-solid fa-trash"></i></button></td></tr>`)));
                catalogBody.innerHTML = rows.join('') || '<tr><td colspan="4" class="p-5 text-center text-slate-400">Chưa có dịch vụ trong danh mục.</td></tr>';
            }

            const serviceDetailBody = document.getElementById('admin-service-detail-table');
            if (serviceDetailBody) {
                serviceDetailBody.innerHTML = serviceLogs.length ? serviceLogs.map((log, index) => `<tr><td class="p-3 text-xs text-slate-500">${log.time || '—'}</td><td class="p-3 font-bold">${log.roomId || '—'}</td><td class="p-3">${log.name || '—'}</td><td class="p-3">${log.type || '—'}</td><td class="p-3 text-right">${Number(log.qty)||0}</td><td class="p-3 text-right font-bold">${(Number(log.total)||0).toLocaleString('vi-VN')} ₫</td><td class="p-3"><span class="text-xs font-bold px-2 py-1 rounded-full ${log.closed?'bg-slate-100 text-slate-600':'bg-emerald-100 text-emerald-700'}">${log.closed?'Đã chốt':'Đang phát sinh'}</span></td><td class="p-3 text-right"><button onclick="deleteServiceLog(${index})" class="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('') : '<tr><td colspan="8" class="p-5 text-center text-slate-400">Chưa có dịch vụ phát sinh.</td></tr>';
            }

            const staffRows = STAFF_ACCOUNTS.map(a => `
                <tr class="bg-slate-50/40">
                    <td class="p-4"><span class="px-2.5 py-1 rounded-full text-xs font-bold ${a.role==='admin'?'bg-rose-100 text-rose-700':'bg-blue-100 text-blue-700'}">${a.label}</span></td>
                    <td class="p-4 font-semibold text-slate-900">${a.name}</td>
                    <td class="p-4 text-slate-600">${a.email}</td>
                    <td class="p-4 text-slate-400">—</td>
                    <td class="p-4"><span class="text-emerald-700 font-semibold text-xs">Tài khoản cố định</span></td>
                    <td class="p-4 text-right text-xs text-slate-400">Được bảo vệ</td>
                </tr>`).join('');

            const customerRows = accounts.length ? accounts.map((a, i) => `
                <tr>
                    <td class="p-4"><span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">KHÁCH HÀNG</span></td>
                    <td class="p-4 font-semibold text-slate-900">${a.name}</td>
                    <td class="p-4 text-slate-600">${a.email}</td>
                    <td class="p-4 text-slate-600">${a.phone || '—'}</td>
                    <td class="p-4"><span class="text-emerald-700 font-semibold text-xs">Đang hoạt động</span></td>
                    <td class="p-4 text-right"><button onclick="deleteCustomerAccount(${i})" class="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100"><i class="fa-solid fa-user-xmark mr-1"></i>Xóa</button></td>
                </tr>`).join('') : '<tr><td colspan="6" class="p-6 text-center text-slate-400">Chưa có khách hàng đăng ký tài khoản.</td></tr>';
            tbody.innerHTML = staffRows + customerRows;
        }


        function renderAdminReports() {
            if (!ROLE_CONFIG || ROLE_CONFIG.role !== 'admin') return;
            const totalRooms = rooms.filter(r=>r.status!=='MAINTENANCE').length || 1;
            const occupied = rooms.filter(r => r.status === 'OCCUPIED').length;
            const occupancy = Math.round((occupied / totalRooms) * 100);
            const paidRevenue = revenueHistory.reduce((s,x)=>s+(Number(x.total)||0),0);
            const activeRevenue = rooms.filter(r=>r.guest).reduce((sum,r)=>sum+(Number(r.price)||0)*calculateStayNights(r),0);
            const serviceRevenue = serviceLogs.reduce((s,x)=>s+(Number(x.total)||0),0);
            const pending = getPendingRequestCount();
            const avgRating = customerFeedbacks.length ? (customerFeedbacks.reduce((s,x)=>s+(Number(x.rating)||0),0)/customerFeedbacks.length).toFixed(1) : '—';
            const set = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
            set('report-occupancy', occupancy + '%');
            set('report-total-revenue', (paidRevenue).toLocaleString('vi-VN') + ' ₫');
            set('report-pending', pending);
            set('report-rating', avgRating === '—' ? '—' : avgRating + '/5');

            const pricingBox = document.getElementById('admin-dynamic-pricing');
            if (pricingBox) {
                const suggestions = [
                    {title:'Standard Single', desc: occupancy > 80 ? 'Nhu cầu cao, có thể tăng 5–8% vào cuối tuần.' : 'Giữ giá ổn định để tăng tỷ lệ lấp phòng.', level: occupancy>80?'Tăng nhẹ':'Ổn định'},
                    {title:'Deluxe Double', desc: pending > 3 ? 'Nhiều yêu cầu chờ, ưu tiên gói phòng + ăn sáng/spa.' : 'Tạo combo dịch vụ để tăng giá trị đơn.', level: pending>3?'Ưu tiên duyệt':'Combo'},
                    {title:'Executive/Suite', desc: serviceRevenue > 0 ? 'Khách có xu hướng dùng dịch vụ, đề xuất bán thêm spa/đưa đón.' : 'Cần khuyến mãi dịch vụ đi kèm để kích cầu.', level:'Bán thêm'}
                ];
                pricingBox.innerHTML = suggestions.map(sg=>`<div class="rounded-2xl border border-slate-200 p-4 hover:border-amber-300 transition"><div class="flex items-center justify-between gap-3"><h5 class="font-extrabold text-slate-900">${sg.title}</h5><span class="text-[10px] font-black px-2 py-1 rounded-full bg-amber-100 text-amber-700">${sg.level}</span></div><p class="text-sm text-slate-600 mt-2">${sg.desc}</p></div>`).join('');
            }

            const forecastBox = document.getElementById('admin-demand-forecast');
            if (forecastBox) {
                forecastBox.innerHTML = [`Hôm nay: công suất ${occupancy}%`, `Yêu cầu chờ xử lý: ${pending}`, occupancy > 75 ? 'Dự báo: cuối tuần có khả năng kín phòng, nên ưu tiên xử lý yêu cầu đặt phòng nhanh.' : 'Dự báo: còn dư phòng, nên dùng AI tư vấn gói tiết kiệm/cân bằng để tăng chuyển đổi.' ].map((t,i)=>`<div class="rounded-2xl ${i===2?'bg-blue-50 border-blue-100 text-blue-900':'bg-slate-50 border-slate-200 text-slate-700'} border p-4 text-sm font-semibold">${t}</div>`).join('');
            }

            const feedbackBox = document.getElementById('admin-feedback-insights');
            if (feedbackBox) {
                if (!customerFeedbacks.length) feedbackBox.innerHTML = '<div class="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-slate-400">Chưa có đánh giá khách hàng.</div>';
                else {
                    const lows = customerFeedbacks.filter(f=>Number(f.rating)<=3).length;
                    const good = customerFeedbacks.filter(f=>Number(f.rating)>=4).length;
                    const latest = customerFeedbacks.slice(0,5).map(f=>`<div class="rounded-xl bg-slate-50 border border-slate-100 p-3"><div class="flex justify-between gap-3"><strong>${escapeHtml(f.customerName||'Khách')}</strong><span class="text-amber-600 font-black">${'★'.repeat(Number(f.rating)||0)}</span></div><p class="text-xs text-slate-500 mt-1">${escapeHtml(f.category||'Khác')} • ${formatRequestTime(f.createdAt)}</p><p class="text-sm text-slate-700 mt-2">${escapeHtml(f.content||'')}</p></div>`).join('');
                    feedbackBox.innerHTML = `<div class="grid grid-cols-2 gap-3"><div class="rounded-2xl bg-emerald-50 p-4 border border-emerald-100"><p class="text-xs font-bold text-emerald-600">Tích cực</p><h4 class="text-2xl font-black text-emerald-800">${good}</h4></div><div class="rounded-2xl bg-rose-50 p-4 border border-rose-100"><p class="text-xs font-bold text-rose-600">Cần cải thiện</p><h4 class="text-2xl font-black text-rose-800">${lows}</h4></div></div><div class="mt-4 space-y-3">${latest}</div>`;
                }
            }

            const auditBox = document.getElementById('admin-ai-audit');
            if (auditBox) {
                const items = systemActivities.filter(a => ['AI','SUPPORT','BOOKING','SERVICE','PAYMENT','FEEDBACK'].includes(a.type)).slice(0,20);
                auditBox.innerHTML = items.length ? items.map(a=>`<div class="rounded-2xl border border-slate-200 p-4"><div class="flex items-center justify-between gap-3"><span class="text-[10px] font-black px-2 py-1 rounded-full bg-slate-100 text-slate-700">${escapeHtml(a.type||'LOG')}</span><span class="text-xs text-slate-400">${formatRequestTime(a.createdAt)}</span></div><h5 class="font-bold text-slate-900 mt-2">${escapeHtml(a.title||'Hoạt động')}</h5><p class="text-sm text-slate-600 mt-1">${escapeHtml(a.detail||'')}</p></div>`).join('') : '<div class="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-slate-400">Chưa có nhật ký AI/hỗ trợ.</div>';
            }
        }

        function renderCustomerFeedback() {
            if (!CURRENT_USER || ROLE_CONFIG?.role !== 'customer') return;
            const email=(CURRENT_USER.email||'').toLowerCase();
            const roomSelect=document.getElementById('feedback-room');
            const mineRooms=rooms.filter(r=>(r.customerEmail||'').toLowerCase()===email || (r.guest||'')===CURRENT_USER.name);
            if(roomSelect) roomSelect.innerHTML = mineRooms.length ? mineRooms.map(r=>`<option value="${escapeHtml(r.id)}">${escapeHtml(r.id)} - ${escapeHtml(r.type||'Phòng')}</option>`).join('') : '<option value="GENERAL">Đánh giá chung về khách sạn</option>';
            const box=document.getElementById('customer-feedback-history');
            if(box){
                const mine=customerFeedbacks.filter(f=>(f.customerEmail||'').toLowerCase()===email);
                box.innerHTML = mine.length ? mine.map(f=>`<div class="rounded-2xl border border-slate-200 p-4 bg-white"><div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"><div><span class="text-[10px] font-black px-2 py-1 rounded-full bg-amber-100 text-amber-700">${escapeHtml(f.category||'Góp ý')}</span><h5 class="font-extrabold text-slate-900 mt-2">${escapeHtml(f.roomId||'Đánh giá chung')}</h5></div><div class="text-amber-500 font-black">${'★'.repeat(Number(f.rating)||0)}</div></div><p class="text-sm text-slate-700 mt-3">${escapeHtml(f.content||'')}</p><p class="text-xs text-slate-400 mt-3">${formatRequestTime(f.createdAt)}</p></div>`).join('') : '<div class="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400"><i class="fa-regular fa-star text-3xl mb-3"></i><p class="font-semibold">Bạn chưa gửi đánh giá nào.</p></div>';
            }
        }

        function submitCustomerFeedback(event){
            event.preventDefault();
            if(!CURRENT_USER || ROLE_CONFIG?.role !== 'customer') return;
            const fb={ id:'FB-'+Date.now(), roomId:document.getElementById('feedback-room')?.value||'GENERAL', rating:Number(document.getElementById('feedback-rating')?.value)||5, category:document.getElementById('feedback-category')?.value||'Khác', content:document.getElementById('feedback-content')?.value.trim()||'', customerName:CURRENT_USER.name, customerEmail:CURRENT_USER.email, createdAt:new Date().toISOString() };
            if(!fb.content) return alert('Vui lòng nhập nội dung đánh giá.');
            customerFeedbacks.unshift(fb);
            logSystemActivity('FEEDBACK','Khách gửi đánh giá',`${CURRENT_USER.email} đánh giá ${fb.rating} sao về ${fb.category}.`,{relatedKind:'feedback',relatedId:fb.id});
            persistHotelData();
            document.getElementById('feedback-content').value='';
            renderCustomerFeedback();
            updateStaffNotifications();
            showCenterNotice({ title: 'Cảm ơn bạn', message: 'Đánh giá của bạn đã được ghi nhận thành công. Grand Hotel rất trân trọng góp ý này.', icon: '<i class="fa-solid fa-star"></i>' });
        }

        function handleAdminAddCatalogService(event) {
            event.preventDefault();
            if (!ROLE_CONFIG || ROLE_CONFIG.role !== 'admin') return;
            const type = document.getElementById('admin-service-category').value;
            const name = document.getElementById('admin-new-service-name').value.trim();
            const price = Math.max(0, parseHotelMoney(document.getElementById('admin-new-service-price').value) || 0);
            if (!type || !name) return alert('Vui lòng nhập đầy đủ thông tin dịch vụ.');
            if (!serviceCatalog[type]) serviceCatalog[type] = [];
            if (serviceCatalog[type].some(x => x.name.toLowerCase() === name.toLowerCase())) return alert('Dịch vụ này đã tồn tại trong nhóm.');
            serviceCatalog[type].push({ name, price });
            persistHotelData();
            document.getElementById('admin-new-service-name').value = '';
            document.getElementById('admin-new-service-price').value = '';
            updateServiceOptions();
            updateCustomerServiceOptions();
            renderAdminControl();
            alert('Đã thêm dịch vụ mới.');
        }

        async function deleteCatalogService(type, index) {
            if (!ROLE_CONFIG || ROLE_CONFIG.role !== 'admin') return;
            if (!serviceCatalog[type] || !serviceCatalog[type][index]) return;
            const item = serviceCatalog[type][index];
            if (!(await window.ghSweetConfirm(`Xóa dịch vụ "${item.name}" khỏi danh mục?`))) return;
            serviceCatalog[type].splice(index, 1);
            persistHotelData();
            updateServiceOptions();
            updateCustomerServiceOptions();
            renderAdminControl();
        }

        async function deleteServiceLog(index) {
            if (!ROLE_CONFIG || ROLE_CONFIG.role !== 'admin') return;
            const log = serviceLogs[index];
            if (!log) return;
            if (!(await window.ghSweetConfirm(`Xóa ghi nhận dịch vụ "${log.name}" của phòng ${log.roomId}?`))) return;
            serviceLogs.splice(index, 1);
            persistHotelData();
            renderServicesLog();
            renderDashboard();
            renderAdminControl();
        }

        async function deleteCustomerAccount(index) {
            if (!ROLE_CONFIG || ROLE_CONFIG.role !== 'admin') return;
            const accounts = getCustomerAccounts();
            const account = accounts[index];
            if (!account) return;
            if (!(await window.ghSweetConfirm(`Xóa tài khoản khách hàng ${account.email}?`))) return;
            accounts.splice(index, 1);
            saveCustomerAccounts(accounts);
            renderAdminControl();
        }

        // --- 1. INITIAL MOCK DATA ---
        let rooms = [
            { id: 'P101', type: 'Standard Single', price: 800000, capacity: 1, status: 'OCCUPIED', guest: 'Nguyễn Văn An', checkin: '2026-09-06', checkout: '2026-09-08' },
            { id: 'P102', type: 'Standard Single', price: 800000, capacity: 1, status: 'AVAILABLE', guest: '', checkin: '', checkout: '' },
            { id: 'P103', type: 'Deluxe Double', price: 1500000, capacity: 2, status: 'OCCUPIED', guest: 'Trần Thị Bích', checkin: '2026-09-05', checkout: '2026-09-09' },
            { id: 'P104', type: 'Deluxe Double', price: 1500000, capacity: 2, status: 'BOOKED', guest: 'Lê Hoàng Nam', checkin: '2026-09-08', checkout: '2026-09-10' },
            { id: 'P201', type: 'Deluxe Double', price: 1600000, capacity: 2, status: 'OCCUPIED', guest: 'Phạm Minh Tuấn', checkin: '2026-09-07', checkout: '2026-09-10' },
            { id: 'P202', type: 'Executive Suite', price: 2800000, capacity: 3, status: 'AVAILABLE', guest: '', checkin: '', checkout: '' },
            { id: 'P203', type: 'Executive Suite', price: 2800000, capacity: 3, status: 'OCCUPIED', guest: 'Hoàng Anh Đức', checkin: '2026-09-06', checkout: '2026-09-09' },
            { id: 'P204', type: 'Executive Suite', price: 3000000, capacity: 4, status: 'MAINTENANCE', guest: '', checkin: '', checkout: '' },
            { id: 'P301', type: 'Presidential Suite', price: 6500000, capacity: 4, status: 'OCCUPIED', guest: 'Sơn Tùng M-TP', checkin: '2026-09-07', checkout: '2026-09-11' },
            { id: 'P302', type: 'Presidential Suite', price: 6500000, capacity: 4, status: 'AVAILABLE', guest: '', checkin: '', checkout: '' },
            { id: 'P303', type: 'Deluxe Double', price: 1500000, capacity: 2, status: 'OCCUPIED', guest: 'Đặng Thu Thảo', checkin: '2026-09-06', checkout: '2026-09-08' },
            { id: 'P304', type: 'Standard Single', price: 850000, capacity: 1, status: 'AVAILABLE', guest: '', checkin: '', checkout: '' }
        ];

        let serviceCatalog = {
            'Ăn uống': [
                { name: 'Bữa sáng Buffet tại phòng', price: 250000 },
                { name: 'Cơm gà Hội An', price: 120000 },
                { name: 'Cơm bò lúc lắc', price: 180000 },
                { name: 'Phở bò đặc biệt', price: 95000 },
                { name: 'Bún chả Hà Nội', price: 110000 },
                { name: 'Mì Ý sốt bò bằm', price: 160000 },
                { name: 'Pizza Hải sản', price: 220000 },
                { name: 'Burger bò & khoai tây', price: 180000 },
                { name: 'Salad Caesar', price: 130000 },
                { name: 'Bò Bít tết Wagyu', price: 890000 },
                { name: 'Set cơm gia đình 2 người', price: 420000 },
                { name: 'Set ăn tối lãng mạn 2 người', price: 1200000 }
            ],
            'Đồ uống': [
                { name: 'Nước suối', price: 30000 },
                { name: 'Nước cam tươi', price: 65000 },
                { name: 'Nước ép dưa hấu', price: 65000 },
                { name: 'Trà đào cam sả', price: 70000 },
                { name: 'Cà phê đen', price: 50000 },
                { name: 'Cà phê sữa', price: 55000 },
                { name: 'Cà phê Cappuccino', price: 75000 },
                { name: 'Latte', price: 80000 },
                { name: 'Sinh tố bơ', price: 85000 },
                { name: 'Nước ngọt lon', price: 45000 }
            ],
            'Minibar': [
                { name: 'Nước suối Evian', price: 50000 },
                { name: 'Bia Heineken', price: 60000 },
                { name: 'Nước ngọt Coca-Cola', price: 45000 },
                { name: 'Red Wine Glass', price: 180000 },
                { name: 'Snack Pringles', price: 45000 },
                { name: 'Chocolate', price: 60000 },
                { name: 'Hạt điều rang', price: 70000 }
            ],
            'Spa': [
                { name: 'Massage Toàn Thân (60p)', price: 650000 },
                { name: 'Massage Chân (45p)', price: 350000 },
                { name: 'Xông hơi Thảo dược', price: 300000 },
                { name: 'Chăm sóc Da mặt', price: 550000 },
                { name: 'Combo Spa thư giãn', price: 950000 }
            ],
            'Giặt là': [
                { name: 'Giặt hấp Bộ Vest / Blazer', price: 150000 },
                { name: 'Giặt sấy Áo sơ mi / Quần', price: 60000 },
                { name: 'Giặt váy / đầm', price: 90000 },
                { name: 'Ủi nhanh 1 món', price: 40000 }
            ],
            'Buồng phòng': [
                { name: 'Dọn phòng bổ sung', price: 0 },
                { name: 'Thêm khăn tắm', price: 0 },
                { name: 'Thêm nước uống miễn phí', price: 0 },
                { name: 'Thêm gối', price: 0 },
                { name: 'Thêm chăn', price: 0 },
                { name: 'Thay ga giường', price: 0 },
                { name: 'Bộ bàn chải & kem đánh răng', price: 0 }
            ],
            'Di chuyển': [
                { name: 'Đón sân bay', price: 350000 },
                { name: 'Tiễn sân bay', price: 350000 },
                { name: 'Thuê xe 4 chỗ / lượt', price: 450000 },
                { name: 'Thuê xe 7 chỗ / lượt', price: 650000 },
                { name: 'Hỗ trợ gọi taxi', price: 0 }
            ],
            'Yêu cầu khác': [
                { name: 'Hỗ trợ hành lý', price: 0 },
                { name: 'Gọi báo thức', price: 0 },
                { name: 'Chuẩn bị sinh nhật / kỷ niệm', price: 300000 },
                { name: 'Trang trí phòng lãng mạn', price: 500000 },
                { name: 'Yêu cầu đặc biệt khác', price: 0 }
            ]
        };

        // Điểm du lịch mẫu để AI vẫn có thể tư vấn ở chế độ demo khi chưa kết nối API.
        // Không lưu giờ mở cửa/giá vé cố định vì các thông tin này có thể thay đổi theo thời gian.
        const TOURISM_CATALOG = {
            'hà nội': { name: 'Hà Nội', attractions: [
                { name: 'Hồ Hoàn Kiếm & Phố cổ', cost: 'thấp/miễn phí', tags: 'đi bộ, check-in, ẩm thực' },
                { name: 'Văn Miếu - Quốc Tử Giám', cost: 'thấp', tags: 'văn hóa, lịch sử' },
                { name: 'Hồ Tây', cost: 'thấp/miễn phí', tags: 'ngắm cảnh, cà phê, hoàng hôn' },
                { name: 'Khu vực Lăng Chủ tịch Hồ Chí Minh', cost: 'thấp/miễn phí', tags: 'lịch sử, tham quan' }
            ]},

            'ninh bình': { name: 'Ninh Bình', attractions: [
                { name: 'Quần thể danh thắng Tràng An', cost: 'trung bình', tags: 'thuyền, thiên nhiên, di sản, check-in' },
                { name: 'Tam Cốc - Bích Động', cost: 'trung bình', tags: 'thuyền, đồng lúa, thiên nhiên' },
                { name: 'Hang Múa', cost: 'trung bình', tags: 'leo núi, ngắm cảnh, check-in' },
                { name: 'Chùa Bái Đính', cost: 'thấp-trung bình', tags: 'tâm linh, kiến trúc, tham quan' },
                { name: 'Cố đô Hoa Lư', cost: 'thấp', tags: 'lịch sử, văn hóa' },
                { name: 'Vườn quốc gia Cúc Phương', cost: 'thấp-trung bình', tags: 'rừng, thiên nhiên, trekking' },
                { name: 'Đầm Vân Long', cost: 'thấp-trung bình', tags: 'thuyền, thiên nhiên, yên tĩnh' }
            ]},
            'hà giang': { name: 'Hà Giang', attractions: [
                { name: 'Đèo Mã Pì Lèng', cost: 'thấp', tags: 'đèo, ngắm cảnh, check-in' },
                { name: 'Sông Nho Quế', cost: 'trung bình', tags: 'thuyền, hẻm vực, thiên nhiên' },
                { name: 'Cột cờ Lũng Cú', cost: 'thấp', tags: 'biên giới, lịch sử, check-in' },
                { name: 'Phố cổ Đồng Văn', cost: 'thấp', tags: 'văn hóa, ẩm thực, đi bộ' }
            ]},
            'cao bằng': { name: 'Cao Bằng', attractions: [
                { name: 'Thác Bản Giốc', cost: 'thấp-trung bình', tags: 'thác nước, thiên nhiên, check-in' },
                { name: 'Động Ngườm Ngao', cost: 'thấp', tags: 'hang động, thiên nhiên' },
                { name: 'Núi Mắt Thần', cost: 'thấp', tags: 'cắm trại, thiên nhiên, check-in' },
                { name: 'Khu di tích Pác Bó', cost: 'thấp', tags: 'lịch sử, thiên nhiên' }
            ]},
            'mộc châu': { name: 'Mộc Châu', attractions: [
                { name: 'Đồi chè trái tim', cost: 'thấp', tags: 'check-in, thiên nhiên' },
                { name: 'Thác Dải Yếm', cost: 'thấp-trung bình', tags: 'thác nước, tham quan' },
                { name: 'Rừng thông Bản Áng', cost: 'thấp', tags: 'cắm trại, hồ, check-in' },
                { name: 'Cầu kính Bạch Long', cost: 'cao', tags: 'trải nghiệm, check-in' }
            ]},
            'cát bà': { name: 'Cát Bà', attractions: [
                { name: 'Vịnh Lan Hạ', cost: 'trung bình-cao', tags: 'du thuyền, kayak, biển' },
                { name: 'Vườn quốc gia Cát Bà', cost: 'thấp-trung bình', tags: 'trekking, thiên nhiên' },
                { name: 'Bãi tắm Cát Cò', cost: 'miễn phí/thấp', tags: 'biển, nghỉ dưỡng' },
                { name: 'Pháo đài Thần Công', cost: 'thấp', tags: 'ngắm cảnh, lịch sử' }
            ]},
            'quảng bình': { name: 'Quảng Bình', attractions: [
                { name: 'Động Phong Nha', cost: 'trung bình', tags: 'hang động, thuyền, thiên nhiên' },
                { name: 'Động Thiên Đường', cost: 'trung bình', tags: 'hang động, thiên nhiên' },
                { name: 'Suối Nước Moọc', cost: 'trung bình', tags: 'suối, vui chơi, thiên nhiên' },
                { name: 'Biển Nhật Lệ', cost: 'miễn phí/thấp', tags: 'biển, nghỉ dưỡng' }
            ]},
            'hội an': { name: 'Hội An', attractions: [
                { name: 'Phố cổ Hội An', cost: 'thấp-trung bình', tags: 'di sản, đi bộ, ẩm thực, check-in' },
                { name: 'Chùa Cầu', cost: 'thấp', tags: 'kiến trúc, lịch sử' },
                { name: 'Làng rau Trà Quế', cost: 'thấp-trung bình', tags: 'trải nghiệm, làng quê' },
                { name: 'Biển An Bàng', cost: 'miễn phí/thấp', tags: 'biển, nghỉ dưỡng' }
            ]},
            'quy nhơn': { name: 'Quy Nhơn', attractions: [
                { name: 'Kỳ Co', cost: 'trung bình', tags: 'biển, check-in' },
                { name: 'Eo Gió', cost: 'thấp-trung bình', tags: 'ngắm cảnh, biển, check-in' },
                { name: 'Ghềnh Ráng - Tiên Sa', cost: 'thấp', tags: 'ngắm cảnh, lịch sử' },
                { name: 'Tháp Đôi', cost: 'thấp', tags: 'văn hóa Chăm, kiến trúc' }
            ]},
            'phú yên': { name: 'Phú Yên', attractions: [
                { name: 'Gành Đá Đĩa', cost: 'thấp', tags: 'địa chất, biển, check-in' },
                { name: 'Bãi Xép', cost: 'thấp', tags: 'biển, check-in' },
                { name: 'Hải đăng Đại Lãnh', cost: 'thấp', tags: 'ngắm bình minh, trekking nhẹ' },
                { name: 'Đầm Ô Loan', cost: 'tùy chi tiêu', tags: 'ẩm thực, hải sản, ngắm cảnh' }
            ]},
            'vũng tàu': { name: 'Vũng Tàu', attractions: [
                { name: 'Bãi Sau', cost: 'miễn phí/thấp', tags: 'biển, nghỉ dưỡng' },
                { name: 'Tượng Chúa Kitô Vua', cost: 'miễn phí/thấp', tags: 'leo bộ, ngắm cảnh' },
                { name: 'Hải đăng Vũng Tàu', cost: 'thấp', tags: 'ngắm cảnh, check-in' },
                { name: 'Mũi Nghinh Phong', cost: 'miễn phí', tags: 'biển, check-in' }
            ]},
            'cần thơ': { name: 'Cần Thơ', attractions: [
                { name: 'Chợ nổi Cái Răng', cost: 'thấp-trung bình', tags: 'sông nước, ẩm thực, trải nghiệm' },
                { name: 'Bến Ninh Kiều', cost: 'miễn phí/thấp', tags: 'đi bộ, ngắm cảnh' },
                { name: 'Nhà cổ Bình Thủy', cost: 'thấp', tags: 'kiến trúc, lịch sử' },
                { name: 'Cồn Sơn', cost: 'trung bình', tags: 'miệt vườn, trải nghiệm, ẩm thực' }
            ]},
            'đà nẵng': { name: 'Đà Nẵng', attractions: [
                { name: 'Biển Mỹ Khê', cost: 'miễn phí', tags: 'biển, nghỉ dưỡng, check-in' },
                { name: 'Bán đảo Sơn Trà', cost: 'thấp', tags: 'thiên nhiên, ngắm cảnh' },
                { name: 'Ngũ Hành Sơn', cost: 'thấp', tags: 'tham quan, văn hóa' },
                { name: 'Bà Nà Hills', cost: 'cao', tags: 'vui chơi, check-in' },
                { name: 'Phố cổ Hội An', cost: 'thấp-trung bình', tags: 'đi bộ, ẩm thực, check-in' }
            ]},
            'nha trang': { name: 'Nha Trang', attractions: [
                { name: 'Bãi biển Trần Phú', cost: 'miễn phí', tags: 'biển, nghỉ dưỡng' },
                { name: 'Tháp Bà Ponagar', cost: 'thấp', tags: 'văn hóa, lịch sử' },
                { name: 'Hòn Chồng', cost: 'thấp', tags: 'ngắm cảnh, check-in' },
                { name: 'Tour đảo/vịnh', cost: 'trung bình-cao', tags: 'biển, trải nghiệm' }
            ]},
            'hồ chí minh': { name: 'TP. Hồ Chí Minh', attractions: [
                { name: 'Phố đi bộ Nguyễn Huệ', cost: 'miễn phí', tags: 'đi bộ, check-in' },
                { name: 'Chợ Bến Thành', cost: 'tùy chi tiêu', tags: 'ẩm thực, mua sắm' },
                { name: 'Bảo tàng Chứng tích Chiến tranh', cost: 'thấp', tags: 'lịch sử' },
                { name: 'Bưu điện Trung tâm & Nhà thờ Đức Bà', cost: 'miễn phí/thấp', tags: 'kiến trúc, check-in' }
            ]},
            'đà lạt': { name: 'Đà Lạt', attractions: [
                { name: 'Hồ Xuân Hương', cost: 'miễn phí', tags: 'đi bộ, ngắm cảnh' },
                { name: 'Quảng trường Lâm Viên', cost: 'miễn phí', tags: 'check-in' },
                { name: 'Thác Datanla', cost: 'trung bình', tags: 'thiên nhiên, trải nghiệm' },
                { name: 'Núi Langbiang', cost: 'trung bình', tags: 'thiên nhiên, ngắm cảnh' }
            ]},
            'sa pa': { name: 'Sa Pa', attractions: [
                { name: 'Bản Cát Cát', cost: 'thấp-trung bình', tags: 'văn hóa, check-in' },
                { name: 'Núi Hàm Rồng', cost: 'trung bình', tags: 'ngắm cảnh, thiên nhiên' },
                { name: 'Thung lũng Mường Hoa', cost: 'thấp-trung bình', tags: 'thiên nhiên, bản làng' },
                { name: 'Fansipan', cost: 'cao', tags: 'cáp treo, ngắm cảnh' }
            ]},
            'huế': { name: 'Huế', attractions: [
                { name: 'Đại Nội Huế', cost: 'trung bình', tags: 'văn hóa, lịch sử' },
                { name: 'Chùa Thiên Mụ', cost: 'thấp/miễn phí', tags: 'văn hóa, ngắm cảnh' },
                { name: 'Chợ Đông Ba', cost: 'tùy chi tiêu', tags: 'ẩm thực, mua sắm' },
                { name: 'Các lăng vua Nguyễn', cost: 'trung bình', tags: 'lịch sử, kiến trúc' }
            ]},
            'hạ long': { name: 'Hạ Long', attractions: [
                { name: 'Bãi Cháy', cost: 'miễn phí/thấp', tags: 'biển, đi bộ' },
                { name: 'Du thuyền tham quan Vịnh Hạ Long', cost: 'trung bình-cao', tags: 'vịnh, trải nghiệm' },
                { name: 'Sun World Hạ Long', cost: 'cao', tags: 'vui chơi, gia đình' }
            ]},
            'phú quốc': { name: 'Phú Quốc', attractions: [
                { name: 'Bãi Sao', cost: 'thấp', tags: 'biển, nghỉ dưỡng' },
                { name: 'Chợ đêm Phú Quốc', cost: 'tùy chi tiêu', tags: 'ẩm thực, mua sắm' },
                { name: 'Thiền viện Trúc Lâm Hộ Quốc', cost: 'miễn phí/thấp', tags: 'ngắm cảnh, văn hóa' },
                { name: 'Tour đảo/cáp treo Hòn Thơm', cost: 'trung bình-cao', tags: 'biển, trải nghiệm' }
            ]}
        };

        let serviceLogs = [
            { time: '10:30 07/09', roomId: 'P301', name: 'Bò Bít tết Wagyu', type: 'Ăn uống', qty: 2, total: 1780000 },
            { time: '09:15 07/09', roomId: 'P103', name: 'Massage Toàn Thân (60p)', type: 'Spa', qty: 1, total: 650000 },
            { time: '08:00 07/09', roomId: 'P101', name: 'Cà phê Capuchino', type: 'Ăn uống', qty: 1, total: 75000 }
        ];

        let revenueHistory = [];
        let bookingRequests = [];
        let serviceRequests = [];
        let adminSupportRequests = [];
        let paymentRequests = [];
        let systemActivities = [];
        let customerFeedbacks = [];


        function addDemoVacantRooms() {
            const marker = 'grandhotel_extra_rooms_v1';
            if (localStorage.getItem(marker)) return;
            const types = [
                ['Standard Single', 800000, 1], ['Deluxe Double', 1500000, 2],
                ['Executive Suite', 2800000, 3], ['Presidential Suite', 6500000, 4]
            ];
            for (let i = 0; i < 24; i++) {
                const id = 'P' + (401 + Math.floor(i / 8) * 100 + i % 8);
                if (rooms.some(room => room.id === id)) continue;
                const [type, price, capacity] = types[i % types.length];
                rooms.push({id, type, price, capacity, status: 'AVAILABLE',
                    guest: '', checkin: '', checkout: '', demo: true});
            }
            localStorage.setItem('grandhotel_rooms', JSON.stringify(rooms));
            localStorage.setItem(marker, '1');
        }

        function restoreHotelData() {
            try {
                const savedRooms = JSON.parse(localStorage.getItem('grandhotel_rooms') || 'null');
                const savedServices = JSON.parse(localStorage.getItem('grandhotel_service_logs') || 'null');
                const savedCatalog = JSON.parse(localStorage.getItem('grandhotel_service_catalog') || 'null');
                const savedRevenue = JSON.parse(localStorage.getItem('grandhotel_revenue_history') || 'null');
                const savedBookingRequests = JSON.parse(localStorage.getItem('grandhotel_booking_requests') || 'null');
                const savedServiceRequests = JSON.parse(localStorage.getItem('grandhotel_service_requests') || 'null');
                const savedAdminSupport = JSON.parse(localStorage.getItem('grandhotel_admin_support_requests') || 'null');
                const savedPayments = JSON.parse(localStorage.getItem('grandhotel_payment_requests') || 'null');
                const savedActivities = JSON.parse(localStorage.getItem('grandhotel_system_activities') || 'null');
                const savedFeedbacks = JSON.parse(localStorage.getItem('grandhotel_customer_feedbacks') || 'null');
                if (Array.isArray(savedRooms) && savedRooms.length) rooms = savedRooms;
                if (Array.isArray(savedServices)) serviceLogs = savedServices;
                if (savedCatalog && typeof savedCatalog === 'object' && !Array.isArray(savedCatalog)) {
                    const defaults = serviceCatalog;
                    serviceCatalog = savedCatalog;
                    Object.entries(defaults).forEach(([type, items]) => {
                        if (!Array.isArray(serviceCatalog[type])) serviceCatalog[type] = [];
                        items.forEach(item => {
                            if (!serviceCatalog[type].some(x => (x.name || '').toLowerCase() === item.name.toLowerCase())) {
                                serviceCatalog[type].push(item);
                            }
                        });
                    });
                }
                if (Array.isArray(savedRevenue)) revenueHistory = savedRevenue;
                if (Array.isArray(savedBookingRequests)) bookingRequests = savedBookingRequests;
                if (Array.isArray(savedServiceRequests)) serviceRequests = savedServiceRequests;
                if (Array.isArray(savedAdminSupport)) adminSupportRequests = savedAdminSupport;
                if (Array.isArray(savedPayments)) paymentRequests = savedPayments;
                if (Array.isArray(savedActivities)) systemActivities = savedActivities;
                if (Array.isArray(savedFeedbacks)) customerFeedbacks = savedFeedbacks;
            } catch (_) {
                // Nếu dữ liệu trình duyệt lỗi, dùng dữ liệu mẫu hiện tại.
            }
            addDemoVacantRooms();
        }

        function persistHotelData() {
            localStorage.setItem('grandhotel_rooms', JSON.stringify(rooms));
            localStorage.setItem('grandhotel_service_logs', JSON.stringify(serviceLogs));
            localStorage.setItem('grandhotel_service_catalog', JSON.stringify(serviceCatalog));
            localStorage.setItem('grandhotel_revenue_history', JSON.stringify(revenueHistory));
            localStorage.setItem('grandhotel_booking_requests', JSON.stringify(bookingRequests));
            localStorage.setItem('grandhotel_service_requests', JSON.stringify(serviceRequests));
            localStorage.setItem('grandhotel_admin_support_requests', JSON.stringify(adminSupportRequests));
            localStorage.setItem('grandhotel_payment_requests', JSON.stringify(paymentRequests));
            localStorage.setItem('grandhotel_system_activities', JSON.stringify(systemActivities.slice(0, 500)));
            localStorage.setItem('grandhotel_customer_feedbacks', JSON.stringify(customerFeedbacks.slice(0, 300)));
        }

        // Đồng bộ yêu cầu thanh toán giữa tài khoản/trình duyệt qua cùng backend localhost.
        let paymentSyncReady = false;
        let paymentPollBusy = false;
        async function paymentApi(url, payload) {
            const response = await fetch(url,{method:payload?'POST':'GET',headers:{'Content-Type':'application/json'},body:payload?JSON.stringify(payload):undefined,cache:'no-store'});
            const result = await response.json().catch(()=>({}));
            if(!response.ok) throw new Error(result.error || 'Không thể kết nối máy chủ thanh toán');
            return result;
        }
        async function syncPaymentRequests() {
            if(paymentPollBusy) return;
            paymentPollBusy=true;
            try {
                const data=await paymentApi('/api/payment-requests');
                if(!Array.isArray(data.requests)) return;
                const fresh=JSON.stringify(data.requests)!==JSON.stringify(paymentRequests);
                paymentRequests=data.requests;
                // Phản ánh quyết định của nhân viên lên dữ liệu phòng của khách trên máy này.
                if(ROLE_CONFIG?.role==='customer' && CURRENT_USER){
                    let roomChanged=false;
                    for(const pay of paymentRequests.filter(x=>x.status==='APPROVED' && String(x.customerEmail).toLowerCase()===String(CURRENT_USER.email).toLowerCase())){
                        const room=rooms.find(x=>x.id===pay.roomId && String(x.guestEmail).toLowerCase()===String(CURRENT_USER.email).toLowerCase());
                        if(room && room.paymentStatus!=='PAID'){
                            room.paymentStatus='PAID';room.paymentRequestId=pay.id;roomChanged=true;
                            if(!revenueHistory.some(x=>x.paymentRequestId===pay.id)) revenueHistory.push({createdAt:pay.decidedAt||new Date().toISOString(),time:new Date(pay.decidedAt||Date.now()).toLocaleString('vi-VN'),roomId:pay.roomId,guest:pay.customerName,roomRevenue:pay.roomRevenue,serviceRevenue:pay.serviceRevenue,total:pay.total,paymentMethod:pay.method==='BANK'?'Chuyển khoản':'Tiền mặt',paymentRequestId:pay.id});
                        }
                    }
                    if(roomChanged)persistHotelData();
                }
                paymentSyncReady=true;
                localStorage.setItem('grandhotel_payment_requests',JSON.stringify(paymentRequests));
                if(fresh){
                    updateStaffNotifications();
                    if(isStaffRole()) renderStaffRequests();
                    if(ROLE_CONFIG?.role==='admin') renderAdminActivityCenter();
                    if(ROLE_CONFIG?.role==='customer') renderCustomerPayments();
                }
            }catch(e){if(!paymentSyncReady) console.warn('[Payment sync]',e.message);}
            finally{paymentPollBusy=false;}
        }
        setInterval(()=>{if(ROLE_CONFIG)syncPaymentRequests();},4000);
        window.addEventListener('load',()=>syncPaymentRequests());

        function getActorSnapshot(override = null) {
            if (override) return {
                name: override.name || 'Người dùng', email: override.email || '', role: override.role || 'system'
            };
            return {
                name: CURRENT_USER?.name || ROLE_CONFIG?.name || 'Hệ thống',
                email: CURRENT_USER?.email || '',
                role: ROLE_CONFIG?.role || 'system'
            };
        }

        function logSystemActivity(type, title, detail = '', options = {}) {
            const actor = getActorSnapshot(options.actor || null);
            const item = {
                id: 'ACT-' + Date.now() + '-' + Math.random().toString(36).slice(2,6).toUpperCase(),
                type: type || 'SYSTEM', title: title || 'Hoạt động hệ thống', detail: detail || '',
                actorName: actor.name, actorEmail: actor.email, actorRole: actor.role,
                createdAt: new Date().toISOString(), reviewed: actor.role === 'admin',
                relatedKind: options.relatedKind || '', relatedId: options.relatedId || '',
                result: options.result || ''
            };
            systemActivities.unshift(item);
            if (systemActivities.length > 500) systemActivities = systemActivities.slice(0, 500);
            localStorage.setItem('grandhotel_system_activities', JSON.stringify(systemActivities));
            return item;
        }

        function createAdminSupportRequest(category, message, options = {}) {
            const actor = getActorSnapshot(options.actor || null);
            const req = {
                id: 'AD-' + Date.now() + '-' + Math.random().toString(36).slice(2,5).toUpperCase(),
                category: category || 'SUPPORT', message: String(message || '').trim(),
                actorName: actor.name, actorEmail: actor.email, actorRole: actor.role,
                status: actor.role === 'admin' ? 'DONE' : 'PENDING', createdAt: new Date().toISOString(),
                handledAt: actor.role === 'admin' ? new Date().toISOString() : '', handledBy: actor.role === 'admin' ? actor.email : '',
                adminReply: '', aiReplyPreview: options.aiReplyPreview || ''
            };
            adminSupportRequests.unshift(req);
            logSystemActivity(category === 'AI_QUESTION' ? 'AI' : 'SYSTEM',
                category === 'AI_QUESTION' ? 'Câu hỏi gửi AI' : 'Yêu cầu hỗ trợ Admin',
                req.message,
                { actor, relatedKind: 'admin_support', relatedId: req.id });
            persistHotelData();
            updateStaffNotifications();
            return req;
        }

        function adminSupportStatusBadge(status) {
            if (status === 'DONE') return '<span class="text-[10px] font-extrabold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">ĐÃ XỬ LÝ</span>';
            if (status === 'PROCESSING') return '<span class="text-[10px] font-extrabold px-2 py-1 rounded-full bg-blue-100 text-blue-700">ĐANG XỬ LÝ</span>';
            return '<span class="text-[10px] font-extrabold px-2 py-1 rounded-full bg-rose-100 text-rose-700">CẦN XỬ LÝ</span>';
        }

        function setCustomerConsultMode(mode) {
            if (ROLE_CONFIG?.role !== 'customer') return;
            const aiMode = mode !== 'staff';
            const aiIds = ['customer-ai-actions','customer-ai-planner','ai-chat-history','ai-input-bar'];
            aiIds.forEach(id => document.getElementById(id)?.classList.toggle('hidden', !aiMode));
            document.getElementById('customer-admin-support')?.classList.toggle('hidden', aiMode);
            const a = document.getElementById('consult-ai-btn');
            const s = document.getElementById('consult-staff-btn');
            a?.classList.toggle('active-ai', aiMode); a?.classList.remove('active-staff');
            s?.classList.toggle('active-staff', !aiMode); s?.classList.remove('active-ai');
            const subtitle = document.getElementById('ai-module-subtitle');
            if (subtitle) subtitle.textContent = aiMode
                ? 'Hỏi AI tự nhiên như ChatGPT • phản hồi ngay về phòng, dịch vụ, chi phí, lưu trú và du lịch'
                : 'Gửi câu hỏi trực tiếp cho Admin/Lễ tân • nhân viên tiếp nhận và trả lời trong hệ thống';
            if (!aiMode) { renderCustomerAdminSupportHistory(); setTimeout(()=>document.getElementById('admin-support-input')?.focus(),80); }
            else setTimeout(()=>document.getElementById('ai-input')?.focus(),80);
        }

        function sendDirectAdminSupport() {
            if (!CURRENT_USER || ROLE_CONFIG?.role !== 'customer') return;
            const input = document.getElementById('admin-support-input');
            const message = input?.value.trim() || '';
            if (!message) { alert('Vui lòng nhập nội dung cần Admin hỗ trợ.'); input?.focus(); return; }
            createAdminSupportRequest('STAFF_SUPPORT', message);
            input.value = '';
            renderCustomerAdminSupportHistory();
            showCenterNotice({ title: 'Đã gửi nhân viên', message: 'Câu hỏi của bạn đã được gửi thành công. Admin và Lễ tân đều có thể tiếp nhận và trả lời sớm nhất.', icon: '<i class="fa-solid fa-headset"></i>' });
        }

        function renderCustomerAdminSupportHistory() {
            const box = document.getElementById('customer-admin-support-history');
            if (!box || ROLE_CONFIG?.role !== 'customer' || !CURRENT_USER) return;
            const email = (CURRENT_USER.email || '').toLowerCase();
            const mine = adminSupportRequests.filter(r => (r.actorEmail || '').toLowerCase() === email).slice(0, 8);
            if (!mine.length) { box.innerHTML = ''; return; }
            box.innerHTML = mine.map(r => `<div class="rounded-xl bg-white/80 border border-indigo-100 p-3 text-xs">
                <div class="flex items-center justify-between gap-2">${adminSupportStatusBadge(r.status)}<span class="text-slate-400">${formatRequestTime(r.createdAt)}</span></div>
                <p class="text-slate-700 mt-2"><strong>Bạn:</strong> ${escapeHtml(r.message)}</p>
                ${r.adminReply ? `<p class="text-indigo-800 mt-2"><strong>Nhân viên phản hồi:</strong> ${escapeHtml(r.adminReply)}</p>` : `<p class="text-slate-400 mt-2">Admin/Lễ tân chưa gửi phản hồi trực tiếp.</p>`}
            </div>`).join('');
        }

        function adminSetSupportProcessing(id) {
            if (!isStaffRole()) return;
            const req = adminSupportRequests.find(r => r.id === id);
            if (!req || req.status === 'DONE') return;
            req.status = 'PROCESSING'; req.handledBy = CURRENT_USER.email; req.handledAt = new Date().toISOString();
            logSystemActivity('SYSTEM', 'Nhân viên tiếp nhận tư vấn', req.message, { relatedKind: 'admin_support', relatedId: req.id, result: 'Đang xử lý' });
            persistHotelData(); renderAdminActivityCenter(); updateStaffNotifications();
        }

        function adminResolveSupportRequest(id) {
            if (!isStaffRole()) return;
            const req = adminSupportRequests.find(r => r.id === id);
            if (!req) return;
            const reply = prompt('Nhập phản hồi/kết quả xử lý gửi cho người dùng:', req.adminReply || 'Đã tiếp nhận và xử lý yêu cầu của bạn.') ?? null;
            if (reply === null) return;
            req.status = 'DONE'; req.adminReply = reply.trim() || 'Nhân viên khách sạn đã kiểm tra và phản hồi yêu cầu.';
            req.handledBy = CURRENT_USER.email; req.handledAt = new Date().toISOString();
            logSystemActivity('SYSTEM', 'Nhân viên hoàn tất tư vấn', req.message, { relatedKind: 'admin_support', relatedId: req.id, result: req.adminReply });
            persistHotelData(); renderAdminActivityCenter(); updateStaffNotifications();
        }

        function adminMarkAllActivitiesReviewed() {
            if (ROLE_CONFIG?.role !== 'admin') return;
            systemActivities.forEach(a => a.reviewed = true);
            persistHotelData(); renderAdminActivityCenter();
        }

        function currentLocalDateKey(iso) {
            try { return new Date(iso).toLocaleDateString('vi-VN'); } catch (_) { return ''; }
        }

        function renderAdminActivityCenter() {
            if (ROLE_CONFIG?.role !== 'admin') return;
            const pendingBookings = bookingRequests.filter(r => r.status === 'PENDING');
            const pendingServices = serviceRequests.filter(r => r.status === 'PENDING');
            const pendingSupport = adminSupportRequests.filter(r => r.category !== 'AI_QUESTION' && r.status !== 'DONE');
            const pendingPayments = paymentRequests.filter(r => r.status === 'PENDING');
            const handled = bookingRequests.filter(r => r.status !== 'PENDING').length + serviceRequests.filter(r => r.status !== 'PENDING').length + adminSupportRequests.filter(r => r.status === 'DONE').length;
            const today = new Date().toLocaleDateString('vi-VN');
            const todayCount = systemActivities.filter(a => currentLocalDateKey(a.createdAt) === today).length;
            const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = String(value); };
            set('admin-global-pending', pendingBookings.length + pendingServices.length + pendingSupport.length + pendingPayments.length);
            set('admin-activity-today', todayCount);
            set('admin-support-pending', pendingSupport.length);
            set('admin-handled-count', handled);

            const pendingBox = document.getElementById('admin-unified-pending');
            if (pendingBox) {
                const rows = [];
                const addPending = (r, html) => rows.push({createdAt:r.createdAt||"", html});
                pendingBookings.forEach(r => addPending(r, `<div class="rounded-xl bg-white border border-amber-200 p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3"><div><div class="flex items-center gap-2"><span class="text-[10px] font-extrabold px-2 py-1 rounded-full bg-amber-100 text-amber-800">ĐẶT PHÒNG</span><span class="font-mono text-[10px] text-slate-400">${escapeHtml(r.id)}</span></div><p class="font-bold text-slate-900 mt-2">${escapeHtml(r.customerName)} muốn đặt ${escapeHtml(r.roomId)}</p><p class="text-xs text-slate-500 mt-1">${escapeHtml(r.checkin)} → ${escapeHtml(r.checkout)} • ${r.guests || 1} khách • ${formatRequestTime(r.createdAt)}</p></div><div class="flex gap-2"><button onclick="approveBookingRequest('${r.id}')" class="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold">Duyệt</button><button onclick="rejectBookingRequest('${r.id}')" class="px-3 py-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">Từ chối</button></div></div>`));
                pendingServices.forEach(r => addPending(r, `<div class="rounded-xl bg-white border border-purple-200 p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3"><div><div class="flex items-center gap-2"><span class="text-[10px] font-extrabold px-2 py-1 rounded-full bg-purple-100 text-purple-800">DỊCH VỤ</span><span class="font-mono text-[10px] text-slate-400">${escapeHtml(r.id)}</span></div><p class="font-bold text-slate-900 mt-2">${escapeHtml(r.customerName)} • ${escapeHtml(r.roomId)} • ${escapeHtml(r.name)}</p><p class="text-xs text-slate-500 mt-1">SL ${r.qty || 1} • ${r.total ? Number(r.total).toLocaleString('vi-VN') + ' ₫' : 'Theo yêu cầu'} • ${formatRequestTime(r.createdAt)}</p></div><div class="flex gap-2"><button onclick="approveServiceRequest('${r.id}')" class="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold">Duyệt</button><button onclick="rejectServiceRequest('${r.id}')" class="px-3 py-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">Từ chối</button></div></div>`));
                pendingPayments.forEach(r => addPending(r, `<div class="rounded-xl bg-white border border-emerald-200 p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3"><div><div class="flex items-center gap-2"><span class="text-[10px] font-extrabold px-2 py-1 rounded-full bg-emerald-100 text-emerald-800">THANH TOÁN</span><span class="font-mono text-[10px] text-slate-400">${escapeHtml(r.id)}</span></div><p class="font-bold text-slate-900 mt-2">${escapeHtml(r.customerName)} • Phòng ${escapeHtml(r.roomId)} • ${r.method==='BANK'?'Chuyển khoản':'Tiền mặt'}</p><p class="text-xs text-slate-500 mt-1">${Number(r.total||0).toLocaleString('vi-VN')} ₫ ${r.transactionCode?'• Mã GD: '+escapeHtml(r.transactionCode):''} • ${formatRequestTime(r.createdAt)}</p></div><div class="flex gap-2"><button onclick="adminApprovePayment('${r.id}')" class="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold">Xác nhận</button><button onclick="adminRejectPayment('${r.id}')" class="px-3 py-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">Từ chối</button></div></div>`));
                pendingSupport.forEach(r => addPending(r, `<div class="rounded-xl bg-white border border-indigo-200 p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3"><div class="min-w-0"><div class="flex flex-wrap items-center gap-2">${adminSupportStatusBadge(r.status)}<span class="text-[10px] font-extrabold px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">${r.category === 'AI_QUESTION' ? 'CÂU HỎI AI' : 'HỖ TRỢ'}</span><span class="font-mono text-[10px] text-slate-400">${escapeHtml(r.id)}</span></div><p class="font-bold text-slate-900 mt-2">${escapeHtml(r.actorName)} (${escapeHtml(r.actorRole)})</p><p class="text-sm text-slate-700 mt-1 break-words">${escapeHtml(r.message)}</p><p class="text-[11px] text-slate-400 mt-2">${escapeHtml(r.actorEmail || '—')} • ${formatRequestTime(r.createdAt)}</p></div><div class="flex gap-2 shrink-0">${r.status === 'PENDING' ? `<button onclick="adminSetSupportProcessing('${r.id}')" class="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">Tiếp nhận</button>` : ''}<button onclick="adminResolveSupportRequest('${r.id}')" class="px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold">Phản hồi & hoàn tất</button></div></div>`));
                pendingBox.innerHTML = rows.length ? rows.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).map(x=>x.html).join('') : '<div class="py-8 text-center text-slate-400"><i class="fa-solid fa-circle-check text-3xl text-emerald-500 mb-2"></i><p class="text-sm font-semibold">Không có yêu cầu nào đang chờ Admin xử lý.</p></div>';
            }


            const qa=document.getElementById('admin-customer-qa');
            if(qa){
                const questions=adminSupportRequests.filter(r=>r.actorRole==='customer' && r.category!=='AI_QUESTION').slice(0,30);
                qa.innerHTML=questions.length ? questions.map(r=>`<div class="rounded-2xl bg-white border ${r.status==='DONE'?'border-slate-200':'border-indigo-200'} p-4"><div class="flex flex-wrap items-center justify-between gap-2"><div class="flex items-center gap-2">${adminSupportStatusBadge(r.status)}<span class="text-[10px] font-bold text-slate-400">${r.category==='AI_QUESTION'?'Câu hỏi AI (cũ)':'Hỏi Admin/Lễ tân'}</span></div><span class="text-[10px] text-slate-400">${formatRequestTime(r.createdAt)}</span></div><p class="font-bold text-slate-900 mt-3">${escapeHtml(r.actorName)} <span class="font-normal text-xs text-slate-400">(${escapeHtml(r.actorEmail)})</span></p><div class="mt-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><strong>Câu hỏi:</strong> ${escapeHtml(r.message)}</div>${r.aiReplyPreview?`<div class="mt-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900"><strong>AI đã trả lời:</strong> ${escapeHtml(r.aiReplyPreview)}</div>`:''}${r.adminReply?`<div class="mt-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900"><strong>Nhân viên đã trả lời:</strong> ${escapeHtml(r.adminReply)}</div>`:`<div class="mt-3">${r.status==='PENDING'?`<button onclick="adminSetSupportProcessing('${r.id}')" class="mb-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold"><i class="fa-solid fa-headset mr-1"></i>Tiếp nhận tư vấn</button>`:''}<div class="flex flex-col sm:flex-row gap-2"><input id="reply-${r.id}" class="flex-1 border border-indigo-200 rounded-xl px-3 py-2.5 text-sm" placeholder="Nhập câu trả lời tư vấn cho khách..."><button onclick="adminReplySupportInline('${r.id}')" class="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-extrabold"><i class="fa-solid fa-paper-plane mr-1"></i>Gửi trả lời</button></div></div>`}</div>`).join('') : '<p class="text-sm text-center text-slate-400 py-6">Chưa có câu hỏi nào từ khách hàng.</p>';
            }

            const roleFilter = document.getElementById('admin-activity-role-filter')?.value || 'ALL';
            const typeFilter = document.getElementById('admin-activity-type-filter')?.value || 'ALL';
            const filtered = systemActivities.filter(a => (roleFilter === 'ALL' || a.actorRole === roleFilter) && (typeFilter === 'ALL' || a.type === typeFilter));
            const feed = document.getElementById('admin-activity-feed');
            if (feed) {
                feed.innerHTML = filtered.length ? filtered.slice(0, 150).map(a => {
                    const roleMap = { admin:'bg-rose-100 text-rose-700', reception:'bg-blue-100 text-blue-700', customer:'bg-amber-100 text-amber-800', system:'bg-slate-100 text-slate-600' };
                    const typeIcon = { BOOKING:'fa-calendar-check', SERVICE:'fa-bell-concierge', AI:'fa-robot', AUTH:'fa-user-shield', ROOM:'fa-bed', PAYMENT:'fa-receipt', SYSTEM:'fa-circle-info' }[a.type] || 'fa-circle-info';
                    return `<div class="p-4 ${a.reviewed ? 'bg-white' : 'bg-amber-50/30'}"><div class="flex items-start gap-3"><div class="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0"><i class="fa-solid ${typeIcon}"></i></div><div class="flex-1 min-w-0"><div class="flex flex-wrap items-center gap-2"><span class="text-[10px] font-extrabold px-2 py-1 rounded-full ${roleMap[a.actorRole] || roleMap.system}">${escapeHtml((a.actorRole || 'system').toUpperCase())}</span><span class="text-[10px] font-bold text-slate-400">${formatRequestTime(a.createdAt)}</span>${!a.reviewed ? '<span class="text-[10px] font-extrabold text-amber-700">MỚI</span>' : ''}</div><p class="font-bold text-slate-900 mt-1">${escapeHtml(a.title)}</p><p class="text-xs text-slate-600 mt-1 break-words">${escapeHtml(a.detail || '')}</p><p class="text-[11px] text-slate-400 mt-1">${escapeHtml(a.actorName || 'Hệ thống')} ${a.actorEmail ? '• ' + escapeHtml(a.actorEmail) : ''}${a.result ? ' • Kết quả: ' + escapeHtml(a.result) : ''}</p></div></div></div>`;
                }).join('') : '<div class="p-10 text-center text-slate-400">Chưa có hoạt động phù hợp bộ lọc.</div>';
            }
        }

        let currentActiveRoomCheckout = null;

        // --- 2. CORE NAVIGATION & INIT ---

        let ghCenterNoticeTimer = null;
        function showCenterNotice(optionsOrTitle, message) {
            const overlay = document.getElementById('gh-center-notice');
            if (!overlay) { alert(typeof optionsOrTitle === 'string' ? message : (optionsOrTitle?.message || message || 'Thông báo')); return; }
            const opts = typeof optionsOrTitle === 'object'
                ? optionsOrTitle
                : { title: optionsOrTitle || 'Thông báo', message: message || '' };
            const titleEl = document.getElementById('gh-center-notice-title');
            const msgEl = document.getElementById('gh-center-notice-message');
            const iconEl = document.getElementById('gh-center-notice-icon');
            if (titleEl) titleEl.textContent = opts.title || 'Thông báo';
            if (msgEl) msgEl.textContent = opts.message || '';
            if (iconEl) iconEl.innerHTML = opts.icon || '<i class="fa-solid fa-circle-check"></i>';
            overlay.classList.remove('hidden');
            requestAnimationFrame(() => overlay.classList.add('show'));
            clearTimeout(ghCenterNoticeTimer);
            if (opts.autoClose !== false) {
                ghCenterNoticeTimer = setTimeout(() => hideCenterNotice(), opts.duration || 3800);
            }
        }
        function hideCenterNotice() {
            const overlay = document.getElementById('gh-center-notice');
            if (!overlay) return;
            overlay.classList.remove('show');
            clearTimeout(ghCenterNoticeTimer);
            setTimeout(() => overlay.classList.add('hidden'), 220);
        }

        window.onload = function() {
            restoreHotelData();
            updateClock();
            setInterval(updateClock, 1000);
            renderDashboard();
            renderRooms();
            renderBookingsTable();
            renderServicesLog();
            renderCustomersTable();
            initChart();
            updateServiceOptions();
            updateStaffNotifications();
            setupUnifiedAuth();
        };

        function updateClock() {
            const now = new Date();
            document.getElementById('current-time').innerHTML = `<i class="fa-regular fa-clock me-1"></i> ${now.toLocaleTimeString('vi-VN')} - ${now.toLocaleDateString('vi-VN')}`;
        }

        function switchTab(tabId) {
            if (tabId === 'customer-profile') { openProfileDialog(); return; }
            // Hide all modules
            const modules = ['dashboard', 'rooms', 'bookings', 'services', 'requests', 'customers', 'customer-profile', 'customer-booking', 'customer-services', 'customer-payment', 'customer-feedback', 'admin-control', 'admin-reports', 'ai-assistant'];
            modules.forEach(m => {
                const el = document.getElementById(`module-${m}`);
                if (el) el.classList.add('hidden');

                const navEl = document.getElementById(`nav-${m}`);
                if (navEl) {
                    navEl.classList.remove('bg-amber-500', 'text-slate-950', 'font-semibold');
                    navEl.classList.add('hover:bg-slate-800', 'hover:text-white', 'text-slate-300');
                }
            });

            // Show selected module
            const target = document.getElementById(`module-${tabId}`);
            if (target) target.classList.remove('hidden');

            const activeNav = document.getElementById(`nav-${tabId}`);
            if (activeNav) {
                activeNav.classList.add('bg-amber-500', 'text-slate-950', 'font-semibold');
                activeNav.classList.remove('hover:bg-slate-800', 'hover:text-white', 'text-slate-300');
            }

            // Update Header Title
            const titles = {
                'dashboard': 'Tổng quan hệ thống',
                'rooms': 'Quản lý Danh sách Phòng',
                'bookings': 'Đặt phòng & Check-in / Check-out',
                'services': 'Quản lý Dịch vụ & Tiện ích',
                'requests': 'Yêu cầu khách hàng chờ duyệt',
                'customers': 'Quản lý Khách hàng & Hóa đơn',
                'customer-profile': 'Thông tin cá nhân',
                'customer-booking': 'Đặt phòng của khách hàng',
                'customer-services': 'Yêu cầu dịch vụ',
                'customer-payment': 'Thanh toán của khách hàng',
                'customer-feedback': 'Đánh giá & góp ý',
                'admin-reports': 'Báo cáo & AI Insights',
                'admin-control': 'Quản trị & Kiểm soát hệ thống',
                'ai-assistant': 'AI trợ lý khách hàng & du lịch'
            };
            document.getElementById('page-title').innerText = titles[tabId] || 'Dashboard';
            if (tabId === 'admin-control') renderAdminControl();
            if (tabId === 'admin-reports') renderAdminReports();
            if (tabId === 'requests') renderStaffRequests();
            if (tabId === 'customer-profile') renderCustomerProfile();
            if (tabId === 'customer-booking' || tabId === 'customer-services' || tabId === 'customer-payment' || tabId === 'customer-feedback') renderCustomerPortal();
            if (tabId === 'customer-feedback') renderCustomerFeedback();
        }

        // --- STREAMING_CHUNK:Rendering UI Components and Views... ---
        // --- 3. DASHBOARD & ROOMS RENDERERS ---
        function renderDashboard() {
            const occupiedCount = rooms.filter(r => r.status === 'OCCUPIED').length;
            const totalCount = rooms.length;
            const occupancyPct = Math.round(occupiedCount / (rooms.filter(r=>r.status!=='MAINTENANCE').length || 1) * 100);

            document.getElementById('stat-occupancy').innerText = `${occupancyPct}%`;
            document.getElementById('stat-active-rooms').innerText = `${occupiedCount} / ${totalCount}`;
            document.getElementById('badge-total-rooms').innerText = totalCount;
            const paidRevenue = revenueHistory.reduce((sum, x) => sum + (Number(x.total) || 0), 0);
            const currentRoomRevenue = rooms.filter(r => r.guest && (r.status === 'OCCUPIED' || r.status === 'BOOKED')).reduce((sum, r) => sum + (Number(r.price)||0) * calculateStayNights(r), 0);
            const currentServiceRevenue = serviceLogs.filter(x => !x.closed).reduce((sum, x) => sum + (Number(x.total)||0), 0);
            const revenueEl = document.getElementById('stat-revenue');
            if (revenueEl) revenueEl.innerText = (paidRevenue).toLocaleString('vi-VN') + ' ₫';
            const serviceCountEl = document.getElementById('stat-services-count');
            if (serviceCountEl) serviceCountEl.innerText = serviceLogs.filter(x => !x.closed).reduce((sum, x) => sum + (Number(x.qty)||0), 0);

            // Room grid mini
            const gridContainer = document.getElementById('dashboard-room-grid');
            gridContainer.innerHTML = '';

            rooms.forEach(room => {
                let statusBg = '';
                let statusBorder = '';
                let statusText = '';
                let statusLabel = '';

                if (room.status === 'AVAILABLE') {
                    statusBg = 'bg-emerald-50';
                    statusBorder = 'border-emerald-200';
                    statusText = 'text-emerald-700';
                    statusLabel = 'Trống';
                } else if (room.status === 'OCCUPIED') {
                    statusBg = 'bg-blue-50';
                    statusBorder = 'border-blue-200';
                    statusText = 'text-blue-700';
                    statusLabel = 'Đang ở';
                } else if (room.status === 'BOOKED') {
                    statusBg = 'bg-amber-50';
                    statusBorder = 'border-amber-200';
                    statusText = 'text-amber-700';
                    statusLabel = 'Đã đặt';
                } else if (room.status === 'PENDING') {
                    statusBg = 'bg-purple-50';
                    statusBorder = 'border-purple-200';
                    statusText = 'text-purple-700';
                    statusLabel = 'Chờ duyệt';
                } else {
                    statusBg = 'bg-rose-50';
                    statusBorder = 'border-rose-200';
                    statusText = 'text-rose-700';
                    statusLabel = 'Bảo trì';
                }

                gridContainer.innerHTML += `
                    <div onclick="switchTab('rooms')" class="cursor-pointer ${statusBg} border ${statusBorder} p-3 rounded-xl transition-transform hover:scale-105">
                        <div class="flex items-center justify-between">
                            <span class="font-bold text-slate-800 text-sm">${room.id}</span>
                            <span class="text-[10px] font-bold ${statusText} uppercase px-1.5 py-0.5 rounded bg-white/60">${statusLabel}</span>
                        </div>
                        <p class="text-[11px] text-slate-500 truncate mt-1">${room.type}</p>
                        <p class="text-[11px] font-medium text-slate-700 mt-2 truncate">${room.guest ? room.guest : '---'}</p>
                    </div>
                `;
            });
        }

        function getRoomCurrentServices(roomId) {
            return serviceLogs.filter(x => x.roomId === roomId && !x.closed);
        }

        function getRoomPendingServices(roomId) {
            return serviceRequests.filter(x => x.roomId === roomId && x.status === 'PENDING');
        }

        function roomStayNightsForAdmin(room) {
            if (!room?.checkin || !room?.checkout) return 0;
            const a = new Date(room.checkin + 'T00:00:00');
            const b = new Date(room.checkout + 'T00:00:00');
            const n = Math.ceil((b-a)/86400000);
            return Number.isFinite(n) ? Math.max(1,n) : 0;
        }

        function renderAdminRoomOverview() {
            const box = document.getElementById('admin-room-live-overview');
            if (!box || ROLE_CONFIG?.role !== 'admin') return;
            const rank = { OCCUPIED:0, BOOKED:1, PENDING:2, AVAILABLE:3, MAINTENANCE:4 };
            const list = rooms.slice().sort((a,b)=>(rank[a.status]??9)-(rank[b.status]??9) || String(a.id).localeCompare(String(b.id)));
            const labels={OCCUPIED:'Đang ở',BOOKED:'Đã đặt',PENDING:'Chờ duyệt',AVAILABLE:'Trống',MAINTENANCE:'Bảo trì'};
            const styles={OCCUPIED:'bg-blue-100 text-blue-700',BOOKED:'bg-amber-100 text-amber-700',PENDING:'bg-purple-100 text-purple-700',AVAILABLE:'bg-emerald-100 text-emerald-700',MAINTENANCE:'bg-rose-100 text-rose-700'};
            box.innerHTML=list.map(room=>{
                const current=getRoomCurrentServices(room.id); const pending=getRoomPendingServices(room.id);
                const serviceTotal=current.reduce((s,x)=>s+Number(x.total||0),0);
                const nights=roomStayNightsForAdmin(room); const roomTotal=nights*Number(room.price||0);
                return `<button type="button" onclick="openAdminRoomDetail('${escapeHtml(room.id)}')" class="text-left rounded-2xl border border-slate-200 p-5 hover:border-sky-300 hover:shadow-lg transition bg-white">
                    <div class="flex items-start justify-between gap-3"><div><p class="text-xs font-bold text-slate-400 uppercase">Phòng</p><h5 class="text-2xl font-black text-slate-900">${escapeHtml(room.id)}</h5><p class="text-xs text-amber-600 font-bold mt-1">${escapeHtml(room.type)}</p></div><span class="text-[10px] font-extrabold px-2.5 py-1 rounded-full ${styles[room.status]||'bg-slate-100 text-slate-600'}">${labels[room.status]||room.status}</span></div>
                    <div class="mt-4 space-y-2 text-xs text-slate-600"><p><i class="fa-solid fa-user w-5 text-slate-400"></i><strong>${escapeHtml(room.guest||'Chưa có khách')}</strong></p><p><i class="fa-solid fa-calendar-days w-5 text-slate-400"></i>${escapeHtml(room.checkin||'—')} → ${escapeHtml(room.checkout||'—')}</p><p><i class="fa-solid fa-bell-concierge w-5 text-slate-400"></i>${current.length} dịch vụ đang dùng ${pending.length?`• <strong class="text-purple-700">${pending.length} đang chuẩn bị</strong>`:''}</p></div>
                    <div class="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between"><span class="text-xs text-slate-400">Tạm tính</span><strong class="text-sm text-slate-900">${(roomTotal+serviceTotal).toLocaleString('vi-VN')} ₫</strong></div>
                    <div class="mt-3 text-xs font-bold text-sky-700"><i class="fa-solid fa-eye mr-1"></i>Xem chi tiết phòng</div>
                </button>`;
            }).join('');
        }

        function openAdminRoomDetail(roomId) {
            if (ROLE_CONFIG?.role !== 'admin') return;
            const room=rooms.find(r=>r.id===roomId); if(!room) return;
            const current=getRoomCurrentServices(roomId); const pending=getRoomPendingServices(roomId);
            const nights=roomStayNightsForAdmin(room); const roomTotal=nights*Number(room.price||0); const serviceTotal=current.reduce((s,x)=>s+Number(x.total||0),0);
            const title=document.getElementById('admin-room-detail-title'); if(title) title.textContent=`Phòng ${room.id} • ${room.type}`;
            const c=document.getElementById('admin-room-detail-content'); if(!c) return;
            const labels={OCCUPIED:'Đang có khách',BOOKED:'Đã đặt trước',PENDING:'Chờ duyệt',AVAILABLE:'Phòng trống',MAINTENANCE:'Bảo trì'};
            c.innerHTML=`<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
                <div class="rounded-2xl bg-white border border-slate-200 p-4"><p class="text-[11px] font-bold uppercase text-slate-400">Trạng thái</p><p class="font-black text-slate-900 mt-1">${labels[room.status]||escapeHtml(room.status)}</p></div>
                <div class="rounded-2xl bg-white border border-slate-200 p-4"><p class="text-[11px] font-bold uppercase text-slate-400">Khách hàng</p><p class="font-black text-slate-900 mt-1">${escapeHtml(room.guest||'Chưa có khách')}</p></div>
                <div class="rounded-2xl bg-white border border-slate-200 p-4"><p class="text-[11px] font-bold uppercase text-slate-400">Lưu trú</p><p class="font-black text-slate-900 mt-1">${nights||0} đêm</p></div>
                <div class="rounded-2xl bg-white border border-slate-200 p-4"><p class="text-[11px] font-bold uppercase text-slate-400">Tổng tạm tính</p><p class="font-black text-emerald-700 mt-1">${(roomTotal+serviceTotal).toLocaleString('vi-VN')} ₫</p></div>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div class="rounded-2xl bg-white border border-slate-200 p-5"><h5 class="font-black text-slate-900"><i class="fa-solid fa-circle-info text-blue-500 mr-2"></i>Thông tin phòng</h5><div class="mt-4 grid grid-cols-2 gap-3 text-sm"><div class="rounded-xl bg-slate-50 p-3"><span class="text-xs text-slate-400">Ngày nhận</span><p class="font-bold mt-1">${escapeHtml(room.checkin||'—')}</p></div><div class="rounded-xl bg-slate-50 p-3"><span class="text-xs text-slate-400">Ngày trả</span><p class="font-bold mt-1">${escapeHtml(room.checkout||'—')}</p></div><div class="rounded-xl bg-slate-50 p-3"><span class="text-xs text-slate-400">Giá/đêm</span><p class="font-bold mt-1">${Number(room.price||0).toLocaleString('vi-VN')} ₫</p></div><div class="rounded-xl bg-slate-50 p-3"><span class="text-xs text-slate-400">Tiền phòng</span><p class="font-bold mt-1">${roomTotal.toLocaleString('vi-VN')} ₫</p></div></div></div>
                <div class="rounded-2xl bg-white border border-slate-200 p-5"><h5 class="font-black text-slate-900"><i class="fa-solid fa-bell-concierge text-purple-500 mr-2"></i>Dịch vụ đang sử dụng</h5><div class="mt-4 space-y-2">${current.length?current.map(x=>`<div class="rounded-xl bg-purple-50 border border-purple-100 p-3 flex items-center justify-between gap-3"><div><p class="font-bold text-sm text-slate-900">${escapeHtml(x.name||'Dịch vụ')}</p><p class="text-xs text-slate-500">${escapeHtml(x.type||'')} • SL ${Number(x.qty||1)}</p></div><strong class="text-sm text-purple-800">${Number(x.total||0).toLocaleString('vi-VN')} ₫</strong></div>`).join(''):'<p class="text-sm text-slate-400 py-4 text-center">Phòng chưa phát sinh dịch vụ đã duyệt.</p>'}</div><div class="mt-4 pt-4 border-t border-slate-100 flex justify-between"><span class="text-sm text-slate-500">Tổng dịch vụ</span><strong class="text-purple-800">${serviceTotal.toLocaleString('vi-VN')} ₫</strong></div></div>
            </div>
            <div class="mt-5 rounded-2xl bg-white border border-slate-200 p-5"><div class="flex items-center justify-between gap-3"><h5 class="font-black text-slate-900"><i class="fa-solid fa-hourglass-half text-amber-500 mr-2"></i>Dịch vụ khách đang chờ nhận</h5><span class="text-xs font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-800">${pending.length}</span></div><div class="mt-3 space-y-2">${pending.length?pending.map(x=>`<div class="rounded-xl bg-amber-50 border border-amber-100 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><p class="font-bold text-sm">${escapeHtml(x.name||x.type||'Dịch vụ')}</p><p class="text-xs text-slate-500">SL ${Number(x.qty||1)} • ${escapeHtml(x.note||'Không ghi chú')}</p></div><div class="flex gap-2"><button onclick="approveServiceRequest('${x.id}'); openAdminRoomDetail('${roomId}')" class="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold">Tiếp nhận phục vụ</button><button onclick="rejectServiceRequest('${x.id}'); openAdminRoomDetail('${roomId}')" class="px-3 py-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">Không thể phục vụ</button></div></div>`).join(''):'<p class="text-sm text-slate-400 py-3">Không có dịch vụ nào đang chờ phục vụ.</p>'}</div></div>`;
            document.getElementById('admin-room-detail-modal')?.classList.remove('hidden');
        }

        function closeAdminRoomDetail(){ document.getElementById('admin-room-detail-modal')?.classList.add('hidden'); }

        function renderRooms(filterStatus = 'ALL') {
            const container = document.getElementById('rooms-card-grid');
            container.innerHTML = '';

            const filtered = filterStatus === 'ALL' ? rooms : rooms.filter(r => r.status === filterStatus);

            filtered.forEach(room => {
                let badgeClass = '';
                let badgeLabel = '';

                if (room.status === 'AVAILABLE') {
                    badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                    badgeLabel = 'Phòng Trống';
                } else if (room.status === 'OCCUPIED') {
                    badgeClass = 'bg-blue-100 text-blue-800 border-blue-200';
                    badgeLabel = 'Đang Khách Ở';
                } else if (room.status === 'BOOKED') {
                    badgeClass = 'bg-amber-100 text-amber-800 border-amber-200';
                    badgeLabel = 'Đã Đặt Trước';
                } else if (room.status === 'PENDING') {
                    badgeClass = 'bg-purple-100 text-purple-800 border-purple-200';
                    badgeLabel = 'Chờ Duyệt';
                } else {
                    badgeClass = 'bg-rose-100 text-rose-800 border-rose-200';
                    badgeLabel = 'Đang Bảo Trì';
                }

                container.innerHTML += `
                    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition-all">
                        <div>
                            <div class="flex items-center justify-between mb-3">
                                <h3 class="text-xl font-bold text-slate-900">${room.id}</h3>
                                <span class="text-xs font-bold px-2.5 py-1 rounded-full border ${badgeClass}">${badgeLabel}</span>
                            </div>
                            <p class="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">${room.type}</p>
                            <div class="space-y-1.5 text-xs text-slate-600">
                                <p><i class="fa-solid fa-users w-4 text-slate-400"></i> Sức chứa: <strong>${room.capacity} Khách</strong></p>
                                <p><i class="fa-solid fa-tag w-4 text-slate-400"></i> Giá: <strong class="text-slate-900">${room.price.toLocaleString('vi-VN')} ₫/đêm</strong></p>
                                ${room.guest ? `<p class="text-blue-600 font-medium"><i class="fa-solid fa-user w-4"></i> Khách: ${room.guest}</p>` : ''}
                            </div>
                        </div>

                        <div class="pt-4 mt-4 border-t border-slate-100 flex gap-2">
                            ${room.status === 'OCCUPIED' ? `
                                <button onclick="openInvoiceModal('${room.id}')" class="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold py-2 rounded-xl transition-colors">
                                    <i class="fa-solid fa-receipt mr-1"></i> Check-out
                                </button>
                            ` : ''}
                            ${room.status === 'AVAILABLE' ? `
                                <button onclick="quickCheckin('${room.id}')" class="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded-xl transition-colors shadow-sm">
                                    <i class="fa-solid fa-key mr-1"></i> Check-in
                                </button>
                            ` : ''}
                            ${ROLE_CONFIG?.role === 'admin' ? `
                                <button onclick="openAdminRoomDetail('${room.id}')" class="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold py-2 rounded-xl transition-colors">
                                    <i class="fa-solid fa-eye mr-1"></i> Chi tiết
                                </button>` : ''}
                            <button onclick="toggleMaintenance('${room.id}')" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs" title="Đổi trạng thái bảo trì">
                                <i class="fa-solid fa-wrench"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
            if (typeof ROLE_CONFIG !== 'undefined') applyRolePermissions();
        }

        function filterRooms(status) {
            renderRooms(status);
            if (typeof ROLE_CONFIG !== 'undefined') applyRolePermissions();
        }

        function toggleMaintenance(roomId) {
            const room = rooms.find(r => r.id === roomId);
            if (room && room.status === 'PENDING') {
                alert('Phòng này đang có yêu cầu đặt phòng chờ duyệt. Hãy xử lý yêu cầu trước.');
                return;
            }
            if (room) {
                if (room.status === 'MAINTENANCE') {
                    room.status = 'AVAILABLE';
                } else {
                    room.status = 'MAINTENANCE';
                    room.guest = '';
                }
                logSystemActivity('ROOM', 'Thay đổi trạng thái bảo trì', `${CURRENT_USER?.email || 'Admin'} chuyển phòng ${roomId} sang trạng thái ${room.status}.`);
                persistHotelData();
                renderDashboard();
                renderRooms();
            }
        }

        // --- 4. BOOKINGS & INVOICES MANAGEMENT ---
        function renderBookingsTable() {
            const tbody = document.getElementById('bookings-table-body');
            tbody.innerHTML = '';

            const activeBookings = rooms.filter(r => r.guest !== '');

            if (activeBookings.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-slate-400">Chưa có đơn đặt phòng nào gần đây</td></tr>`;
                return;
            }

            activeBookings.forEach((b, idx) => {
                tbody.innerHTML += `
                    <tr class="hover:bg-slate-50/80 transition-colors">
                        <td class="p-4 font-mono font-bold text-slate-700">#BK-10${idx+1}</td>
                        <td class="p-4 font-semibold text-slate-900">${b.guest}</td>
                        <td class="p-4"><span class="bg-slate-100 font-bold px-2 py-1 rounded text-slate-800">${b.id}</span> (${b.type})</td>
                        <td class="p-4 text-xs text-slate-600">${b.checkin} ➔ ${b.checkout}</td>
                        <td class="p-4 font-bold text-slate-900">${(b.price * 2).toLocaleString('vi-VN')} ₫</td>
                        <td class="p-4">
                            <span class="text-xs font-bold px-2.5 py-1 rounded-full ${b.status==='OCCUPIED'?'bg-blue-100 text-blue-800':'bg-amber-100 text-amber-800'}">
                                ${b.status==='OCCUPIED'?'Đang ở':'Đặt trước'}
                            </span>
                        </td>
                        <td class="p-4 text-right">
                            <button onclick="openInvoiceModal('${b.id}')" class="text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium px-3 py-1.5 rounded-lg">
                                Hóa Đơn & Trả Phòng
                            </button>
                        </td>
                    </tr>
                `;
            });
        }

        function renderServicesLog() {
            const tbody = document.getElementById('services-log-table');
            tbody.innerHTML = '';

            serviceLogs.forEach(log => {
                tbody.innerHTML += `
                    <tr class="hover:bg-slate-50">
                        <td class="p-3 text-xs text-slate-500">${log.time}</td>
                        <td class="p-3 font-bold text-slate-800">${log.roomId}</td>
                        <td class="p-3 font-medium text-slate-900">${log.name}</td>
                        <td class="p-3"><span class="text-xs bg-purple-50 text-purple-700 font-semibold px-2 py-0.5 rounded">${log.type}</span></td>
                        <td class="p-3">${log.qty}</td>
                        <td class="p-3 text-right font-bold text-slate-900">${log.total.toLocaleString('vi-VN')} ₫</td>
                    </tr>
                `;
            });

            // Populate room select for services tab
            const roomSelect = document.getElementById('service-room-select');
            roomSelect.innerHTML = '';
            const occupiedRooms = rooms.filter(r => r.status === 'OCCUPIED');
            
            if (occupiedRooms.length === 0) {
                roomSelect.innerHTML = `<option value="">Không có phòng nào đang ở</option>`;
            } else {
                occupiedRooms.forEach(r => {
                    roomSelect.innerHTML += `<option value="${r.id}">${r.id} - ${r.guest}</option>`;
                });
            }
        }

        function updateServiceOptions() {
            const type = document.getElementById('service-type-select').value;
            const itemSelect = document.getElementById('service-item-select');
            itemSelect.innerHTML = '';

            const items = serviceCatalog[type] || [];
            items.forEach(item => {
                itemSelect.innerHTML += `<option value="${item.name}" data-price="${item.price}">${item.name} (${item.price.toLocaleString('vi-VN')} ₫)</option>`;
            });
        }

        function handleOrderService(e) {
            e.preventDefault();
            const roomId = document.getElementById('service-room-select').value;
            if (!roomId) {
                alert('Vui lòng chọn phòng đang lưu trú!');
                return;
            }

            const type = document.getElementById('service-type-select').value;
            const itemSelect = document.getElementById('service-item-select');
            const selectedOpt = itemSelect.options[itemSelect.selectedIndex];
            const name = itemSelect.value;
            const price = parseInt(selectedOpt.getAttribute('data-price')) || 0;
            const qty = parseInt(document.getElementById('service-qty').value) || 1;
            const total = price * qty;

            const now = new Date();
            const timeStr = `${now.getHours()}:${now.getMinutes()<10?'0':''}${now.getMinutes()} ${now.getDate()}/${now.getMonth()+1}`;

            serviceLogs.unshift({ time: timeStr, roomId, name, type, qty, total, closed: false, source: ROLE_CONFIG ? ROLE_CONFIG.role : 'staff' });
            logSystemActivity('SERVICE', 'Ghi nhận dịch vụ trực tiếp', `${CURRENT_USER?.email || 'Nhân viên'} ghi nhận ${name} x${qty} cho phòng ${roomId}.`, { result: total.toLocaleString('vi-VN') + ' ₫' });
            persistHotelData();
            renderServicesLog();
            if (ROLE_CONFIG && ROLE_CONFIG.role === 'customer') renderCustomerPortal();
            alert(`Đã ghi nhận dịch vụ ${name} cho phòng ${roomId}!`);
        }

        // Dữ liệu minh họa riêng; không phải tài khoản đăng nhập thật.
        const DEMO_CUSTOMERS = [
            ['Nguyễn Văn An','0988777666','034200111222',1,'Silver'],
            ['Trần Thị Bích','0912345678','025200333444',2,'Gold'],
            ['Phạm Minh Tuấn','0977112233','018200555666',3,'Gold'],
            ['Lê Hoàng Nam','0906253142','036195000123',4,'VIP Platinum'],
            ['Đặng Thu Thảo','0914221886','079201006912',2,'Silver'],
            ['Hoàng Anh Đức','0938123471','001198003321',3,'Gold'],
            ['Vũ Thu Hà','0968771204','038201005682',1,'Silver'],
            ['Đỗ Minh Khang','0973114862','034200003354',2,'Gold'],
            ['Bùi Ngọc Lan','0915002347','035199009821',5,'VIP Platinum'],
            ['Trần Đức Huy','0983114128','001201002301',1,'Silver'],
            ['Ngô Thanh Mai','0945126873','036202003235',2,'Gold'],
            ['Phan Quang Huy','0908795124','037199002417',1,'Silver'],
            ['Lê Ngọc Anh','0961123408','038200007215',4,'VIP Platinum'],
            ['Nguyễn Thị Hương','0936684221','025200002846',3,'Gold'],
            ['Trịnh Hoài Nam','0974512096','026199003184',2,'Silver'],
            ['Phạm Gia Hân','0945811209','001202009754',1,'Silver']
        ].map(([name,phone,idCard,stays,rank])=>({name,phone,idCard,stays,rank}));

        function renderCustomersTable() {
            const tbody = document.getElementById('customers-table-body');
            if (!tbody) return;
            const customers = DEMO_CUSTOMERS.slice();
            rooms.filter(r=>r.guest && !customers.some(c=>c.name===r.guest)).forEach(r=>customers.push({name:r.guest,phone:r.guestPhone||'—',idCard:'—',stays:1,rank:'Khách lưu trú'}));
            tbody.innerHTML = customers.map(c=>`<tr class="hover:bg-slate-50"><td class="p-4 font-bold text-slate-900">${escapeHtml(c.name)}</td><td class="p-4 text-slate-600">${escapeHtml(c.phone)}</td><td class="p-4 text-slate-600">${escapeHtml(c.idCard)}</td><td class="p-4 font-semibold">${c.stays} lần</td><td class="p-4"><span class="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full">${escapeHtml(c.rank)}</span></td><td class="p-4 text-right"><button type="button" onclick="showCustomerInvoiceHistory('${encodeURIComponent(c.name)}')" class="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-medium">Chi tiết</button></td></tr>`).join('');
            renderRoomInvoiceHistory();
        }
        function invoiceMoney(value){return Number(value||0).toLocaleString('vi-VN')+' ₫';}
        function renderRoomInvoiceHistory(){
            const box=document.getElementById('hotel-room-invoice-list'); if(!box)return;
            const term=(document.getElementById('hotel-invoice-search')?.value||'').toLowerCase().trim();
            const list=[...revenueHistory].sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
            const filtered=list.filter(x=>[x.roomId,x.guest,x.paymentMethod].some(v=>String(v||'').toLowerCase().includes(term)));
            box.innerHTML=filtered.length?filtered.map((inv)=>{const idx=revenueHistory.indexOf(inv);return `<tr class="border-b border-slate-100 hover:bg-slate-50"><td class="p-3 font-semibold">${escapeHtml(inv.roomId||'—')}</td><td class="p-3">${escapeHtml(inv.guest||'—')}</td><td class="p-3">${escapeHtml(inv.time||inv.createdAt||'—')}</td><td class="p-3 text-right font-semibold">${invoiceMoney(inv.total)}</td><td class="p-3 text-right"><button type="button" onclick="showRoomInvoiceDetails(${idx})" class="rounded-lg bg-amber-100 text-amber-900 px-3 py-2 text-xs font-bold">Xem hóa đơn</button></td></tr>`}).join(''):'<tr><td colspan="5" class="p-6 text-center text-slate-500">Chưa có hóa đơn đã xác nhận. Bạn có thể thêm dữ liệu mẫu hoặc ghi nhận thanh toán thật.</td></tr>';
        }
        function showRoomInvoiceDetails(index){
            const inv=revenueHistory[index]; if(!inv)return;
            const content=`<div class="text-left space-y-3"><p><b>Phòng:</b> ${escapeHtml(inv.roomId||'—')}</p><p><b>Khách:</b> ${escapeHtml(inv.guest||'—')}</p><p><b>Thời gian:</b> ${escapeHtml(inv.time||inv.createdAt||'—')}</p><p><b>Phương thức:</b> ${escapeHtml(inv.paymentMethod||'—')}</p><hr><p class="flex justify-between"><span>Tiền phòng</span><b>${invoiceMoney(inv.roomRevenue)}</b></p><p class="flex justify-between"><span>Tiền dịch vụ</span><b>${invoiceMoney(inv.serviceRevenue)}</b></p><hr><p class="flex justify-between text-lg"><b>Tổng cộng</b><b>${invoiceMoney(inv.total)}</b></p><p class="text-xs text-slate-500">${inv.demo?'Dữ liệu minh họa — không phải giao dịch thực tế.':'Hóa đơn đã được hệ thống ghi nhận.'}</p></div>`;
            if(window.Swal)Swal.fire({title:'Chi tiết hóa đơn · '+(inv.roomId||''),html:content,confirmButtonText:'Đóng',width:560});
            else {const el=document.getElementById('hotel-invoice-detail');el.innerHTML=content;el.hidden=false;el.scrollIntoView({behavior:'smooth'});}
        }
        function showCustomerInvoiceHistory(encodedName){
            const name=decodeURIComponent(encodedName);document.getElementById('hotel-invoice-search').value=name;renderRoomInvoiceHistory();document.getElementById('hotel-room-invoice-section')?.scrollIntoView({behavior:'smooth'});
        }
        function addHotelDemoData(){
            if(ROLE_CONFIG?.role!=='admin')return;
            if(localStorage.getItem('grandhotel_extra_demo_seeded')==='yes'){alert('Dữ liệu mẫu đã được thêm trước đó.');return;}
            const names=DEMO_CUSTOMERS.map(c=>c.name);
            for(let i=0;i<18;i++){
                const room=rooms[i%rooms.length], days=1+i%4,roomRevenue=Number(room.price)*days,serviceRevenue=(i%5)*85000;
                const createdAt=new Date(Date.now()-(i+2)*86400000).toISOString();
                revenueHistory.push({id:'DEMO-INV-'+String(i+1).padStart(3,'0'),createdAt,time:new Date(createdAt).toLocaleString('vi-VN'),roomId:room.id,guest:names[i%names.length],roomRevenue,serviceRevenue,total:roomRevenue+serviceRevenue,paymentMethod:i%2?'Tiền mặt':'Chuyển khoản',demo:true});
            }
            localStorage.setItem('grandhotel_extra_demo_seeded','yes');persistHotelData();renderCustomersTable();renderDashboard();alert('Đã thêm 18 hóa đơn minh họa. Không có yêu cầu thanh toán giả được gửi tới nhân viên.');
        }

        // --- STREAMING_CHUNK:Implementing Checkout Modal and Payments... ---
        // --- 5. CHECKOUT & INVOICE MODAL LOGIC ---
        function openInvoiceModal(roomId) {
            const room = rooms.find(r => r.id === roomId);
            if (!room) return;

            currentActiveRoomCheckout = room;
            document.getElementById('invoice-room-code').innerText = `Mã Phòng: ${room.id} (${room.type})`;

            // Calculate room charges from booking dates
            const roomNights = calculateStayNights(room);
            const roomTotal = room.price * roomNights;

            // Get only services belonging to the current open stay
            const roomServices = getOpenServiceLogsForRoom(roomId);
            const serviceTotal = roomServices.reduce((sum, s) => sum + s.total, 0);

            const grandTotal = roomTotal + serviceTotal;

            let servicesHTML = '';
            if (roomServices.length > 0) {
                servicesHTML = roomServices.map(s => `
                    <div class="flex justify-between py-1 border-b border-slate-100 text-xs">
                        <span>${s.name} (x${s.qty})</span>
                        <span class="font-medium">${s.total.toLocaleString('vi-VN')} ₫</span>
                    </div>
                `).join('');
            } else {
                servicesHTML = `<p class="text-xs text-slate-400 py-1">Chưa dùng dịch vụ bổ sung</p>`;
            }

            const html = `
                <div class="space-y-4">
                    <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <p class="text-xs text-slate-500">Khách hàng lưu trú:</p>
                        <p class="font-bold text-slate-900 text-base">${room.guest || 'Chưa cập nhật'}</p>
                        <p class="text-xs text-slate-600 mt-1">Thời gian: <strong>${room.checkin}</strong> ➔ <strong>${room.checkout}</strong> (${roomNights} đêm)</p>
                    </div>

                    <div>
                        <h5 class="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">Chi tiết tiền phòng</h5>
                        <div class="flex justify-between py-1 border-b border-slate-100">
                            <span>Giá phòng (${roomNights} đêm x ${room.price.toLocaleString('vi-VN')} ₫)</span>
                            <span class="font-bold">${roomTotal.toLocaleString('vi-VN')} ₫</span>
                        </div>
                    </div>

                    <div>
                        <h5 class="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">Dịch vụ đã phát sinh</h5>
                        ${servicesHTML}
                    </div>

                    <div class="pt-3 border-t-2 border-slate-900 flex justify-between items-center text-base font-bold text-slate-900">
                        <span>TỔNG CỘNG THANH TOÁN:</span>
                        <span class="text-amber-600 text-xl">${grandTotal.toLocaleString('vi-VN')} ₫</span>
                    </div>
                </div>
            `;

            document.getElementById('invoice-details-content').innerHTML = html;
            document.getElementById('invoice-modal').classList.remove('hidden');
        }

        function closeInvoiceModal() {
            document.getElementById('invoice-modal').classList.add('hidden');
            currentActiveRoomCheckout = null;
        }

        function confirmCheckout() {
            if (currentActiveRoomCheckout) {
                const room = currentActiveRoomCheckout;
                const roomNights = calculateStayNights(room);
                const roomRevenue = (Number(room.price) || 0) * roomNights;
                const roomServices = getOpenServiceLogsForRoom(room.id);
                const serviceRevenue = roomServices.reduce((sum, x) => sum + (Number(x.total) || 0), 0);
                const total = roomRevenue + serviceRevenue;
                const now = new Date();

                if (room.paymentStatus !== 'PAID') {
                    revenueHistory.push({
                        createdAt: now.toISOString(), time: now.toLocaleString('vi-VN'), roomId: room.id, guest: room.guest || '—',
                        roomRevenue, serviceRevenue, total, paymentMethod: 'Thanh toán tại checkout'
                    });
                    roomServices.forEach(x => x.closed = true);
                }

                room.status = 'AVAILABLE';
                room.guest = '';
                room.checkin = '';
                room.checkout = '';
                room.guestEmail = '';
                room.guestPhone = '';
                room.bookingNote = '';
                room.paymentStatus = '';
                room.paymentRequestId = '';
                logSystemActivity('PAYMENT', 'Thanh toán & trả phòng', `${CURRENT_USER?.email || 'Nhân viên'} hoàn tất trả phòng ${room.id} cho ${revenueHistory[revenueHistory.length-1]?.guest || 'khách'}.`, { result: total.toLocaleString('vi-VN') + ' ₫' });
                persistHotelData();

                renderDashboard();
                renderRooms();
                renderBookingsTable();
                renderServicesLog();
                if (ROLE_CONFIG && ROLE_CONFIG.role === 'admin') renderAdminControl();
                closeInvoiceModal();
                alert(`Đã hoàn tất thanh toán ${total.toLocaleString('vi-VN')} ₫ và trả phòng thành công!`);
            }
        }

        function quickCheckin(roomId) {
            if(!isStaffRole())return;
            const target=rooms.find(r=>r.id===roomId);if(!target||!['AVAILABLE','BOOKED'].includes(target.status))return;
            if(target.status==='BOOKED'){target.status='OCCUPIED';const req=bookingRequests.find(r=>r.roomId===roomId&&r.status==='APPROVED');if(req){req.status='CHECKED_IN';req.actualCheckinAt=new Date().toISOString();}persistHotelData();refreshRequestWorkflowViews();return;}
            const name = prompt('Nhập tên khách hàng Check-in:');
            if (name) {
                const room = rooms.find(r => r.id === roomId);
                if (room) {
                    room.status = 'OCCUPIED';
                    room.guest = name;
                    room.checkin = new Date().toISOString().split('T')[0];
                    const end=new Date();end.setDate(end.getDate()+1);room.checkout=`${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`;
                    logSystemActivity('BOOKING', 'Check-in nhanh', `${CURRENT_USER?.email || 'Nhân viên'} check-in ${name} vào phòng ${roomId}.`);
                    persistHotelData();
                    renderDashboard();
                    renderRooms();
                    renderBookingsTable();
                    renderServicesLog();
                }
            }
        }

        // --- CUSTOMER REQUEST APPROVAL WORKFLOW ---
        function makeRequestId(prefix) {
            return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
        }

        function escapeHtml(value) {
            return String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
        }

        function formatRequestTime(value) {
            if (!value) return '—';
            const d = new Date(value);
            if (Number.isNaN(d.getTime())) return value;
            return d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
        }

        function isStaffRole() {
            return !!ROLE_CONFIG && ['admin', 'reception'].includes(ROLE_CONFIG.role);
        }

        function getPendingRequestCount() {
            const operational = bookingRequests.filter(r => r.status === 'PENDING').length + serviceRequests.filter(r => r.status === 'PENDING').length;
            const staffConsult = isStaffRole() ? adminSupportRequests.filter(r => r.category !== 'AI_QUESTION' && r.status !== 'DONE').length : 0;
            const paymentOnly = isStaffRole() ? paymentRequests.filter(r => r.status === 'PENDING').length : 0;
            return operational + staffConsult + paymentOnly;
        }

        function updateStaffNotifications() {
            const count = getPendingRequestCount();
            const operationalCount = bookingRequests.filter(r => r.status === 'PENDING').length + serviceRequests.filter(r => r.status === 'PENDING').length + (isStaffRole() ? adminSupportRequests.filter(r => r.category !== 'AI_QUESTION' && r.status !== 'DONE').length + paymentRequests.filter(r => r.status === 'PENDING').length : 0);
            const notif = document.getElementById('notification-count');
            const navBadge = document.getElementById('nav-request-badge');
            if (notif) {
                notif.textContent = count > 99 ? '99+' : String(count);
                notif.classList.toggle('hidden', count === 0 || !isStaffRole());
                notif.classList.toggle('flex', count > 0 && isStaffRole());
            }
            if (navBadge) {
                navBadge.textContent = operationalCount > 99 ? '99+' : String(operationalCount);
                navBadge.classList.toggle('hidden', operationalCount === 0 || !isStaffRole());
                navBadge.classList.toggle('flex', operationalCount > 0 && isStaffRole());
            }
            const btn = document.getElementById('notification-btn');
            if (btn && isStaffRole()) btn.title = count ? `${count} yêu cầu/việc đang cần xử lý` : 'Không có yêu cầu mới';
        }

        function openStaffRequestsFromBell() {
            if (!isStaffRole()) return;
            if (ROLE_CONFIG?.role === 'admin') switchTab('admin-control');
            else switchTab('requests');
        }

        function requestStatusBadge(status) {
            if (status === 'APPROVED') return '<span class="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">ĐÃ DUYỆT</span>';
            if (status === 'REJECTED') return '<span class="text-[10px] font-bold px-2 py-1 rounded-full bg-rose-100 text-rose-700">TỪ CHỐI</span>';
            return '<span class="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-800">CHỜ DUYỆT</span>';
        }

        function renderStaffRequests() {
            if (!isStaffRole()) return;
            const bookingPending = bookingRequests.filter(r => r.status === 'PENDING').length;
            const servicePending = serviceRequests.filter(r => r.status === 'PENDING').length;
            const supportPending = adminSupportRequests.filter(r => r.category !== 'AI_QUESTION' && r.actorRole === 'customer' && r.status !== 'DONE').length;
            const paymentPending = paymentRequests.filter(r => r.status === 'PENDING').length;
            const total = bookingPending + servicePending + supportPending + paymentPending;
            const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
            setText('request-total-pending', total);
            setText('request-booking-pending', bookingPending);
            setText('request-service-pending', servicePending);
            setText('request-support-pending', supportPending);

            const bookingBox = document.getElementById('staff-booking-requests');
            if (bookingBox) {
                const sorted = bookingRequests.slice().sort((a,b) => (a.status === 'PENDING' ? -1 : 1) - (b.status === 'PENDING' ? -1 : 1) || String(b.createdAt).localeCompare(String(a.createdAt)));
                bookingBox.innerHTML = sorted.length ? sorted.map(req => {
                    const room = rooms.find(r => r.id === req.roomId);
                    const actionable = req.status === 'PENDING';
                    return `<div class="rounded-2xl border ${actionable ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200 bg-white'} p-4">
                        <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                            <div class="min-w-0">
                                <div class="flex flex-wrap items-center gap-2">${requestStatusBadge(req.status)}<span class="font-mono text-xs text-slate-400">${escapeHtml(req.id)}</span></div>
                                <h5 class="font-extrabold text-slate-900 mt-2">${escapeHtml(req.customerName)} muốn đặt phòng ${escapeHtml(req.roomId)}</h5>
                                <p class="text-xs text-slate-500 mt-1">${escapeHtml(req.customerEmail)} • ${escapeHtml(req.customerPhone || 'Chưa có SĐT')} • ${escapeHtml(req.roomType || room?.type || '')}</p>
                                <p class="text-sm text-slate-700 mt-2"><i class="fa-regular fa-calendar mr-1"></i>${escapeHtml(req.checkin)} → ${escapeHtml(req.checkout)} • ${req.guests || 1} khách • ${Number(req.roomPrice || room?.price || 0).toLocaleString('vi-VN')} ₫/đêm</p>
                                ${req.note ? `<p class="text-xs text-slate-600 mt-2"><strong>Ghi chú:</strong> ${escapeHtml(req.note)}</p>` : ''}
                                <p class="text-[11px] text-slate-400 mt-2">Gửi lúc ${formatRequestTime(req.createdAt)}${req.decidedBy ? ` • xử lý bởi ${escapeHtml(req.decidedBy)} lúc ${formatRequestTime(req.decidedAt)}` : ''}</p>
                            </div>
                            ${actionable ? `<div class="flex gap-2 shrink-0"><button onclick="approveBookingRequest('${req.id}')" class="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold"><i class="fa-solid fa-check mr-1"></i>Duyệt phòng</button><button onclick="rejectBookingRequest('${req.id}')" class="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-extrabold"><i class="fa-solid fa-xmark mr-1"></i>Không thể phục vụ</button></div>` : ''}
                        </div>
                    </div>`;
                }).join('') : '<div class="py-10 text-center text-slate-400"><i class="fa-regular fa-calendar-check text-3xl mb-3"></i><p>Chưa có yêu cầu đặt phòng từ khách hàng.</p></div>';
            }

            const serviceBox = document.getElementById('staff-service-requests');
            if (serviceBox) {
                const sorted = serviceRequests.slice().sort((a,b) => (a.status === 'PENDING' ? -1 : 1) - (b.status === 'PENDING' ? -1 : 1) || String(b.createdAt).localeCompare(String(a.createdAt)));
                serviceBox.innerHTML = sorted.length ? sorted.map(req => {
                    const actionable = req.status === 'PENDING';
                    return `<div class="rounded-2xl border ${actionable ? 'border-purple-200 bg-purple-50/30' : 'border-slate-200 bg-white'} p-4">
                        <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                            <div class="min-w-0">
                                <div class="flex flex-wrap items-center gap-2">${requestStatusBadge(req.status)}<span class="font-mono text-xs text-slate-400">${escapeHtml(req.id)}</span></div>
                                <h5 class="font-extrabold text-slate-900 mt-2">${escapeHtml(req.customerName)} • Phòng ${escapeHtml(req.roomId)}</h5>
                                <p class="text-sm text-slate-700 mt-1"><strong>${escapeHtml(req.name)}</strong> • ${escapeHtml(req.type)} • SL ${req.qty} • ${req.total ? Number(req.total).toLocaleString('vi-VN') + ' ₫' : 'Theo yêu cầu'}</p>
                                ${req.note ? `<p class="text-xs text-slate-600 mt-2"><strong>Ghi chú:</strong> ${escapeHtml(req.note)}</p>` : ''}
                                <p class="text-[11px] text-slate-400 mt-2">${escapeHtml(req.customerEmail)} • gửi lúc ${formatRequestTime(req.createdAt)}${req.decidedBy ? ` • xử lý bởi ${escapeHtml(req.decidedBy)} lúc ${formatRequestTime(req.decidedAt)}` : ''}</p>
                            </div>
                            ${actionable ? `<div class="flex gap-2 shrink-0"><button onclick="approveServiceRequest('${req.id}')" class="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold"><i class="fa-solid fa-bell-concierge mr-1"></i>Tiếp nhận phục vụ</button><button onclick="rejectServiceRequest('${req.id}')" class="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-extrabold"><i class="fa-solid fa-xmark mr-1"></i>Không thể phục vụ</button></div>` : ''}
                        </div>
                    </div>`;
                }).join('') : '<div class="py-10 text-center text-slate-400"><i class="fa-regular fa-bell text-3xl mb-3"></i><p>Chưa có yêu cầu dịch vụ từ khách hàng.</p></div>';
            }
            const paymentBox=document.getElementById('staff-payment-requests');
            if(paymentBox){
                const sorted=paymentRequests.slice().sort((a,b)=>(a.status==='PENDING'?-1:1)-(b.status==='PENDING'?-1:1)||String(b.createdAt).localeCompare(String(a.createdAt)));
                paymentBox.innerHTML=sorted.length?sorted.map(r=>`<div class="rounded-xl border ${r.status==='PENDING'?'border-amber-200 bg-amber-50/30':'border-slate-200'} p-4"><div class="flex flex-col md:flex-row justify-between gap-3"><div><div class="flex gap-2 items-center">${requestStatusBadge(r.status)}<span class="text-xs text-slate-400">${escapeHtml(r.id)}</span></div><p class="font-extrabold mt-2">${escapeHtml(r.customerName)} • Phòng ${escapeHtml(r.roomId)}</p><p class="text-xs mt-1">${escapeHtml(r.customerEmail)} • ${r.method==='BANK'?'Chuyển khoản':'Tiền mặt'} • ${Number(r.total||0).toLocaleString('vi-VN')} ₫</p><p class="text-xs text-slate-500 mt-1">${r.transactionCode?'Mã giao dịch: '+escapeHtml(r.transactionCode)+' • ':''}${formatRequestTime(r.createdAt)}</p><div class="mt-3">${paymentBillSrc(r.billImage)?`<button type="button" onclick="viewPaymentBill('${r.id}')" class="px-3 py-2 rounded-lg bg-sky-100 text-sky-800 font-bold text-xs"><i class="fa-solid fa-image mr-1"></i>Xem ảnh bill</button>`:'<span class="text-xs text-rose-600">Chưa có bill (yêu cầu cũ)</span>'}</div></div>${r.status==='PENDING'?`<div class="flex gap-2"><button onclick="adminApprovePayment('${r.id}')" class="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold">Xác nhận</button><button onclick="adminRejectPayment('${r.id}')" class="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">Từ chối</button></div>`:''}</div></div>`).join(''):'<p class="text-sm text-slate-400">Chưa có yêu cầu thanh toán.</p>';
            }
            const supportBox = document.getElementById('staff-support-requests');
            if (supportBox) {
                const tickets = adminSupportRequests.filter(r => r.category !== 'AI_QUESTION' && r.actorRole === 'customer')
                    .slice().sort((a,b) => ((a.status === 'PENDING' ? 0 : a.status === 'PROCESSING' ? 1 : 2) - (b.status === 'PENDING' ? 0 : b.status === 'PROCESSING' ? 1 : 2)) || String(b.createdAt).localeCompare(String(a.createdAt)));
                supportBox.innerHTML = tickets.length ? tickets.map(r => `<div class="rounded-2xl border ${r.status==='DONE'?'border-slate-200 bg-white':'border-indigo-200 bg-indigo-50/30'} p-4">
                    <div class="flex flex-col xl:flex-row xl:items-start justify-between gap-4"><div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2">${adminSupportStatusBadge(r.status)}<span class="font-mono text-[10px] text-slate-400">${escapeHtml(r.id)}</span><span class="text-[10px] font-bold text-indigo-600">HỎI NHÂN VIÊN</span></div>
                    <h5 class="font-extrabold text-slate-900 mt-2">${escapeHtml(r.actorName)} <span class="font-normal text-xs text-slate-400">(${escapeHtml(r.actorEmail)})</span></h5><p class="text-sm text-slate-700 mt-2 leading-relaxed">${escapeHtml(r.message)}</p><p class="text-[11px] text-slate-400 mt-2">Gửi lúc ${formatRequestTime(r.createdAt)}${r.handledBy?' • tiếp nhận bởi '+escapeHtml(r.handledBy):''}</p>
                    ${r.adminReply?`<div class="mt-3 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-sm text-emerald-900"><strong>Phản hồi:</strong> ${escapeHtml(r.adminReply)}</div>`:''}</div>
                    ${r.status!=='DONE'?`<div class="xl:w-[420px] shrink-0">${r.status==='PENDING'?`<button onclick="adminSetSupportProcessing('${r.id}')" class="mb-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold"><i class="fa-solid fa-headset mr-1"></i>Tiếp nhận</button>`:''}<div class="flex gap-2"><input id="reply-${r.id}" class="flex-1 border border-indigo-200 rounded-xl px-3 py-2.5 text-sm bg-white" placeholder="Nhập câu trả lời cho khách..."><button onclick="adminReplySupportInline('${r.id}')" class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-extrabold">Trả lời</button></div></div>`:''}</div></div>`).join('') : '<div class="py-10 text-center text-slate-400"><i class="fa-regular fa-comments text-3xl mb-3"></i><p>Chưa có câu hỏi tư vấn trực tiếp từ khách hàng.</p></div>';
            }
            updateStaffNotifications();
        }

        function approveBookingRequest(id) {
            if (!isStaffRole()) return;
            const req = bookingRequests.find(r => r.id === id);
            if (!req || req.status !== 'PENDING') return;
            const room = rooms.find(r => r.id === req.roomId);
            if (!room || room.status !== 'PENDING' || room.pendingRequestId !== req.id) {
                alert('Phòng này không còn ở trạng thái chờ duyệt. Vui lòng kiểm tra lại.');
                return;
            }
            room.status = 'BOOKED';
            room.guest = req.customerName;
            room.guestEmail = req.customerEmail;
            room.guestPhone = req.customerPhone || '';
            room.checkin = req.checkin;
            room.checkout = req.checkout;
            room.guests = req.guests;
            room.bookingNote = req.note || '';
            delete room.pendingRequestId;
            req.status = 'APPROVED';
            req.decidedAt = new Date().toISOString();
            req.decidedBy = CURRENT_USER.email;
            req.decidedByRole = ROLE_CONFIG.role;
            logSystemActivity('BOOKING', 'Duyệt yêu cầu đặt phòng', `${CURRENT_USER.email} đã duyệt phòng ${req.roomId} cho ${req.customerName}.`, { relatedKind: 'booking', relatedId: req.id, result: 'Đã duyệt' });
            persistHotelData();
            refreshRequestWorkflowViews();
            alert(`Đã duyệt phòng ${req.roomId} cho khách ${req.customerName}.`);
        }

        function rejectBookingRequest(id) {
            if (!isStaffRole()) return;
            const req = bookingRequests.find(r => r.id === id);
            if (!req || req.status !== 'PENDING') return;
            const reason = prompt('Lý do từ chối (có thể để trống):') || '';
            const room = rooms.find(r => r.id === req.roomId);
            if (room && room.pendingRequestId === req.id) {
                room.status = 'AVAILABLE';
                delete room.pendingRequestId;
            }
            req.status = 'REJECTED';
            req.decisionNote = reason.trim();
            req.decidedAt = new Date().toISOString();
            req.decidedBy = CURRENT_USER.email;
            req.decidedByRole = ROLE_CONFIG.role;
            logSystemActivity('BOOKING', 'Từ chối yêu cầu đặt phòng', `${CURRENT_USER.email} đã từ chối phòng ${req.roomId} của ${req.customerName}. ${reason ? 'Lý do: ' + reason : ''}`, { relatedKind: 'booking', relatedId: req.id, result: 'Từ chối' });
            persistHotelData();
            refreshRequestWorkflowViews();
        }

        function approveServiceRequest(id) {
            if (!isStaffRole()) return;
            const req = serviceRequests.find(r => r.id === id);
            if (!req || req.status !== 'PENDING') return;
            const room = rooms.find(r => r.id === req.roomId);
            if (!room || !['BOOKED','OCCUPIED'].includes(room.status)) {
                alert('Phòng của khách hiện không còn ở trạng thái đã đặt/đang ở nên chưa thể duyệt dịch vụ.');
                return;
            }
            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} ${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}`;
            if (!serviceLogs.some(log => log.requestId === req.id)) {
                serviceLogs.unshift({
                    time: timeStr, roomId: req.roomId, name: req.name, type: req.type, qty: req.qty,
                    total: Number(req.total) || 0, customerEmail: req.customerEmail, customerName: req.customerName,
                    note: req.note || '', requestId: req.id, requestStatus: 'Đã tiếp nhận', closed: false, source: 'customer',
                    approvedBy: CURRENT_USER.email
                });
            }
            req.status = 'APPROVED';
            req.decidedAt = new Date().toISOString();
            req.decidedBy = CURRENT_USER.email;
            req.decidedByRole = ROLE_CONFIG.role;
            logSystemActivity('SERVICE', 'Xử lý yêu cầu dịch vụ', `${CURRENT_USER.email} đã duyệt ${req.name} cho phòng ${req.roomId}.`, { relatedKind: 'service', relatedId: req.id, result: 'Đã duyệt' });
            persistHotelData();
            refreshRequestWorkflowViews();
            alert(`Đã tiếp nhận dịch vụ “${req.name}” cho phòng ${req.roomId}.`);
        }

        function rejectServiceRequest(id) {
            if (!isStaffRole()) return;
            const req = serviceRequests.find(r => r.id === id);
            if (!req || req.status !== 'PENDING') return;
            const reason = prompt('Lý do từ chối dịch vụ (có thể để trống):') || '';
            req.status = 'REJECTED';
            req.decisionNote = reason.trim();
            req.decidedAt = new Date().toISOString();
            req.decidedBy = CURRENT_USER.email;
            req.decidedByRole = ROLE_CONFIG.role;
            logSystemActivity('SERVICE', 'Từ chối yêu cầu dịch vụ', `${CURRENT_USER.email} đã từ chối ${req.name} cho phòng ${req.roomId}. ${reason ? 'Lý do: ' + reason : ''}`, { relatedKind: 'service', relatedId: req.id, result: 'Từ chối' });
            persistHotelData();
            refreshRequestWorkflowViews();
        }

        function refreshRequestWorkflowViews() {
            updateStaffNotifications();
            renderDashboard();
            renderRooms();
            renderBookingsTable();
            renderServicesLog();
            if (ROLE_CONFIG?.role === 'admin') { renderAdminControl(); renderAdminActivityCenter(); }
            if (isStaffRole()) renderStaffRequests();
            if (ROLE_CONFIG?.role === 'customer') { renderCustomerPortal(); renderCustomerAdminSupportHistory(); renderCustomerPayments(); }
        }

        // --- CUSTOMER PORTAL: BOOK ROOM + REQUEST SERVICES ---
        function getMyCustomerRooms() {
            if (!CURRENT_USER || !ROLE_CONFIG || ROLE_CONFIG.role !== 'customer') return [];
            const email = (CURRENT_USER.email || '').toLowerCase();
            return rooms.filter(r => (r.guestEmail || '').toLowerCase() === email && ['BOOKED', 'OCCUPIED'].includes(r.status));
        }

        function renderCustomerPortal() {
            renderCustomerFeedback();
            if (!CURRENT_USER || !ROLE_CONFIG || ROLE_CONFIG.role !== 'customer') return;
            renderCustomerAdminSupportHistory();
            const nameEl = document.getElementById('customer-welcome-name');
            if (nameEl) nameEl.textContent = CURRENT_USER.name || 'Khách hàng';
            renderCustomerAvailableRooms();
            renderCustomerMyBookings();
            populateCustomerServiceRooms();
            updateCustomerServiceOptions();
            renderCustomerServiceHistory();
            renderCustomerPayments();
        }

        function renderCustomerAvailableRooms() {
            const container = document.getElementById('customer-available-rooms');
            const countEl = document.getElementById('customer-available-count');
            if (!container || !countEl) return;
            const available = rooms.filter(r => r.status === 'AVAILABLE');
            countEl.textContent = `${available.length} phòng trống`;
            if (!available.length) {
                container.innerHTML = `<div class="md:col-span-2 xl:col-span-3 bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500"><i class="fa-solid fa-bed text-3xl text-slate-300 mb-3"></i><p class="font-semibold">Hiện tại chưa có phòng trống.</p><p class="text-xs mt-1">Vui lòng quay lại sau hoặc liên hệ lễ tân.</p></div>`;
                return;
            }
            container.innerHTML = available.map(room => `
                <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    <div class="p-5">
                        <div class="flex items-start justify-between gap-3">
                            <div>
                                <p class="text-xs font-bold uppercase tracking-wider text-amber-600">${room.type}</p>
                                <h3 class="text-2xl font-extrabold text-slate-900 mt-1">Phòng ${room.id}</h3>
                            </div>
                            <span class="bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold px-2.5 py-1 rounded-full">Đang trống</span>
                        </div>
                        <div class="mt-5 grid grid-cols-2 gap-3 text-sm">
                            <div class="bg-slate-50 rounded-xl p-3"><p class="text-xs text-slate-400">Sức chứa</p><p class="font-bold text-slate-800 mt-1"><i class="fa-solid fa-users mr-1 text-slate-400"></i>${room.capacity} khách</p></div>
                            <div class="bg-slate-50 rounded-xl p-3"><p class="text-xs text-slate-400">Giá / đêm</p><p class="font-bold text-slate-900 mt-1">${room.price.toLocaleString('vi-VN')} ₫</p></div>
                        </div>
                    </div>
                    <div class="p-4 border-t border-slate-100 bg-slate-50/60">
                        <button onclick="openCustomerBookingModal('${room.id}')" class="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-3 rounded-xl shadow-sm"><i class="fa-solid fa-calendar-check mr-2"></i>Đặt phòng này</button>
                    </div>
                </div>`).join('');
        }

        function renderCustomerMyBookings() {
            const container = document.getElementById('customer-my-bookings');
            if (!container || !CURRENT_USER) return;
            const email = (CURRENT_USER.email || '').toLowerCase();
            const requests = bookingRequests.filter(r => (r.customerEmail || '').toLowerCase() === email);
            const representedRooms = new Set(requests.filter(r => ['APPROVED','CHECKED_IN'].includes(r.status)).map(r => r.roomId));
            const legacyApproved = getMyCustomerRooms().filter(room => !representedRooms.has(room.id)).map(room => ({
                id: 'LEGACY-' + room.id, roomId: room.id, roomType: room.type, checkin: room.checkin, checkout: room.checkout,
                guests: room.guests || 1, note: room.bookingNote || '', status: room.status === 'OCCUPIED' ? 'CHECKED_IN' : 'APPROVED', createdAt: '', legacy: true
            }));
            const mine = [...requests, ...legacyApproved];
            if (!mine.length) {
                container.innerHTML = `<div class="md:col-span-2 text-center py-6 text-slate-400"><i class="fa-regular fa-calendar-xmark text-2xl mb-2"></i><p class="text-sm">Bạn chưa gửi yêu cầu đặt phòng nào.</p></div>`;
                return;
            }
            const cfg = {
                PENDING: { label: 'CHỜ DUYỆT', cls: 'bg-purple-100 text-purple-700', icon: 'fa-hourglass-half' },
                APPROVED: { label: 'ĐÃ ĐẶT • CHƯA CHECK-IN', cls: 'bg-amber-100 text-amber-800', icon: 'fa-calendar-check' },
                CHECKED_IN: { label: 'ĐANG Ở', cls: 'bg-blue-100 text-blue-700', icon: 'fa-key' },
                CHECKED_OUT: { label: 'ĐÃ TRẢ PHÒNG', cls: 'bg-slate-200 text-slate-700', icon: 'fa-door-open' },
                REJECTED: { label: 'TỪ CHỐI', cls: 'bg-rose-100 text-rose-700', icon: 'fa-circle-xmark' }
            };
            container.innerHTML = mine.map(req => {
                const c = cfg[req.status] || cfg.PENDING;
                const room = rooms.find(r => r.id === req.roomId);
                const isStaying = req.status === 'CHECKED_IN' && room && room.status === 'OCCUPIED';
                const canCheckIn = req.status === 'APPROVED' && room && room.status === 'BOOKED';
                const canCheckOut = isStaying;
                const canService = isStaying;
                const checkinDate = req.checkin ? new Date(req.checkin) : null;
                const checkoutDate = req.checkout ? new Date(req.checkout) : null;
                const nights = checkinDate && checkoutDate ? Math.max(1, Math.round((checkoutDate - checkinDate) / 86400000)) : 1;
                const roomPrice = Number(req.roomPrice || room?.price || 0);
                const roomTotal = roomPrice * nights;
                const serviceTotal = room ? getOpenServiceLogsForRoom(room.id).reduce((s,x)=>s+(Number(x.total)||0),0) : Number(req.finalServiceTotal||0);
                const paymentPaid = !!(room && room.paymentStatus === 'PAID') || req.paymentStatus === 'PAID';
                return `<div class="rounded-2xl border ${isStaying?'border-blue-200 bg-gradient-to-br from-blue-50/70 to-white':'border-slate-200 bg-gradient-to-br from-white to-slate-50'} p-5 shadow-sm flex flex-col gap-4">
                    <div>
                        <div class="flex flex-wrap items-center gap-2"><h5 class="font-extrabold text-slate-900">Phòng ${escapeHtml(req.roomId)}</h5><span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${c.cls}"><i class="fa-solid ${c.icon} mr-1"></i>${c.label}</span>${paymentPaid?'<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700"><i class="fa-solid fa-circle-check mr-1"></i>ĐÃ THANH TOÁN</span>':''}</div>
                        <p class="text-xs text-slate-500 mt-1">${escapeHtml(req.roomType || room?.type || '')}</p>
                        <p class="text-xs text-slate-600 mt-2"><i class="fa-regular fa-calendar mr-1"></i>${escapeHtml(req.checkin || '—')} → ${escapeHtml(req.checkout || '—')}</p>
                        ${req.actualCheckinAt ? `<p class="text-xs text-blue-700 mt-2 font-semibold"><i class="fa-solid fa-key mr-1"></i>Check-in lúc ${formatRequestTime(req.actualCheckinAt)}</p>` : ''}
                        ${req.actualCheckoutAt ? `<p class="text-xs text-slate-600 mt-2 font-semibold"><i class="fa-solid fa-door-open mr-1"></i>Check-out lúc ${formatRequestTime(req.actualCheckoutAt)}</p>` : ''}
                        ${req.note ? `<p class="text-xs text-slate-500 mt-1"><i class="fa-regular fa-note-sticky mr-1"></i>${escapeHtml(req.note)}</p>` : ''}
                        ${req.status === 'PENDING' ? `<p class="text-xs text-purple-600 mt-2 font-semibold">Đang chờ Admin/Lễ tân xác nhận đặt phòng.</p>` : ''}
                        ${req.status === 'APPROVED' ? `<p class="text-xs text-amber-700 mt-2 font-semibold">Phòng đã được giữ cho bạn. Hãy bấm “Check-in” khi bắt đầu nhận phòng để hệ thống xác nhận bạn đang ở.</p>` : ''}
                        ${req.status === 'CHECKED_IN' ? `<p class="text-xs text-blue-700 mt-2 font-semibold">Hệ thống đã xác nhận bạn đang lưu trú tại phòng này.</p>` : ''}
                        ${req.status === 'CHECKED_OUT' ? `<p class="text-xs text-slate-600 mt-2 font-semibold">Kỳ lưu trú đã kết thúc.</p>` : ''}
                        ${req.status === 'REJECTED' ? `<p class="text-xs text-rose-600 mt-2 font-semibold">Yêu cầu đã bị từ chối${req.decisionNote ? ': ' + escapeHtml(req.decisionNote) : '.'}</p>` : ''}
                    </div>
                    <div class="grid grid-cols-2 gap-3 text-xs">
                        <div class="rounded-xl bg-white border border-slate-200 p-3"><p class="text-slate-400">Số đêm</p><p class="font-extrabold text-slate-900 mt-1">${nights} đêm</p></div>
                        <div class="rounded-xl bg-white border border-slate-200 p-3"><p class="text-slate-400">Tiền phòng dự kiến</p><p class="font-extrabold text-amber-700 mt-1">${roomTotal.toLocaleString('vi-VN')} ₫</p></div>
                    </div>
                    ${isStaying ? `<div class="rounded-xl bg-blue-50 border border-blue-100 p-3 text-xs"><div class="flex justify-between"><span class="text-blue-700">Dịch vụ đang dùng</span><strong class="text-blue-900">${serviceTotal.toLocaleString('vi-VN')} ₫</strong></div></div>` : ''}
                    <div class="flex flex-wrap gap-2">
                        ${canCheckIn ? `<button onclick="customerCheckIn('${req.id}')" class="flex-1 min-w-[150px] px-3 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-extrabold hover:bg-blue-500"><i class="fa-solid fa-key mr-1"></i>Check-in • Xác nhận đang ở</button>` : ''}
                        ${canService ? `<button onclick="switchTab('customer-services')" class="flex-1 min-w-[140px] px-3 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-extrabold hover:bg-amber-400"><i class="fa-solid fa-utensils mr-1"></i>Gọi dịch vụ</button>` : ''}
                        ${isStaying ? `<button onclick="switchTab('customer-payment')" class="px-3 py-2.5 rounded-xl ${paymentPaid?'bg-emerald-100 text-emerald-700':'bg-slate-900 text-white'} text-xs font-bold"><i class="fa-solid fa-wallet mr-1"></i>${paymentPaid?'Đã thanh toán':'Thanh toán'}</button>` : ''}
                        ${canCheckOut ? `<button onclick="customerCheckOut('${req.id}')" class="flex-1 min-w-[140px] px-3 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-extrabold hover:bg-rose-500"><i class="fa-solid fa-right-from-bracket mr-1"></i>Check-out</button>` : ''}
                    </div>
                </div>`;
            }).join('');
        }

        async function customerCheckIn(requestId) {
            if (ROLE_CONFIG?.role !== 'customer' || !CURRENT_USER) return;
            const req = bookingRequests.find(r => r.id === requestId && (r.customerEmail||'').toLowerCase() === (CURRENT_USER.email||'').toLowerCase());
            if (!req || req.status !== 'APPROVED') { alert('Đơn này chưa sẵn sàng để Check-in.'); return; }
            const room = rooms.find(r => r.id === req.roomId);
            if (!room || room.status !== 'BOOKED') { alert('Trạng thái phòng đã thay đổi. Vui lòng tải lại trang.'); renderCustomerPortal(); return; }
            if (!(await window.ghSweetConfirm(`Xác nhận Check-in phòng ${req.roomId}? Sau thao tác này hệ thống sẽ chuyển trạng thái sang “Đang ở”.`))) return;
            req.status = 'CHECKED_IN';
            req.actualCheckinAt = new Date().toISOString();
            room.status = 'OCCUPIED';
            room.actualCheckinAt = req.actualCheckinAt;
            logSystemActivity('BOOKING','Khách Check-in',`${CURRENT_USER.email} đã Check-in phòng ${req.roomId}. Trạng thái phòng chuyển sang ĐANG Ở.`,{relatedKind:'booking',relatedId:req.id,result:'Đang ở'});
            persistHotelData();
            refreshRequestWorkflowViews();
            alert(`Check-in thành công phòng ${req.roomId}. Hệ thống đã xác nhận bạn đang ở phòng này.`);
        }

        async function customerCheckOut(requestId) {
            if (ROLE_CONFIG?.role !== 'customer' || !CURRENT_USER) return;
            const req = bookingRequests.find(r => r.id === requestId && (r.customerEmail||'').toLowerCase() === (CURRENT_USER.email||'').toLowerCase());
            if (!req || req.status !== 'CHECKED_IN') { alert('Phòng này chưa ở trạng thái đang lưu trú.'); return; }
            const room = rooms.find(r => r.id === req.roomId);
            if (!room || room.status !== 'OCCUPIED') { alert('Trạng thái phòng đã thay đổi. Vui lòng tải lại trang.'); return; }
            const pendingServices = serviceRequests.filter(s => s.roomId === room.id && s.status === 'PENDING');
            if (pendingServices.length) {
                alert(`Phòng ${room.id} còn ${pendingServices.length} yêu cầu dịch vụ đang được chuẩn bị/phục vụ. Vui lòng đợi nhân viên hoàn tất trước khi Check-out.`);
                return;
            }
            if (room.paymentStatus !== 'PAID') {
                alert('Bạn cần hoàn tất thanh toán và được Admin xác nhận trước khi Check-out. Hệ thống sẽ chuyển bạn đến mục Thanh toán.');
                switchTab('customer-payment');
                return;
            }
            if (!(await window.ghSweetConfirm(`Xác nhận Check-out phòng ${room.id}? Kỳ lưu trú sẽ được kết thúc và phòng chuyển về trạng thái trống.`))) return;
            req.status = 'CHECKED_OUT';
            req.actualCheckoutAt = new Date().toISOString();
            req.paymentStatus = 'PAID';
            req.finalServiceTotal = getOpenServiceLogsForRoom(room.id).reduce((s,x)=>s+(Number(x.total)||0),0);
            const guestName = room.guest;
            room.status = 'AVAILABLE';
            room.guest = '';
            room.guestEmail = '';
            room.guestPhone = '';
            room.guests = 0;
            room.bookingNote = '';
            room.actualCheckoutAt = req.actualCheckoutAt;
            room.paymentStatus = '';
            room.paymentRequestId = '';
            room.checkin = '';
            room.checkout = '';
            logSystemActivity('BOOKING','Khách Check-out',`${CURRENT_USER.email} đã Check-out phòng ${req.roomId}. Phòng được trả về trạng thái TRỐNG.`,{relatedKind:'booking',relatedId:req.id,result:'Đã trả phòng'});
            persistHotelData();
            refreshRequestWorkflowViews();
            alert(`Check-out thành công. Cảm ơn ${guestName || CURRENT_USER.name} đã lưu trú tại Grand Hotel.`);
        }

        function openCustomerBookingModal(roomId) {
            if (!CURRENT_USER || !ROLE_CONFIG || ROLE_CONFIG.role !== 'customer') return;
            const room = rooms.find(r => r.id === roomId && r.status === 'AVAILABLE');
            if (!room) {
                alert('Phòng này không còn trống. Vui lòng chọn phòng khác.');
                renderCustomerPortal();
                return;
            }
            document.getElementById('customer-booking-room-id').value = room.id;
            document.getElementById('customer-booking-room-label').textContent = `${room.id} • ${room.type} • ${room.price.toLocaleString('vi-VN')} ₫/đêm`;
            document.getElementById('customer-booking-guests').max = room.capacity;
            document.getElementById('customer-booking-guests').value = 1;
            document.getElementById('customer-booking-note').value = '';
            const today = new Date();
            const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
            const afterTomorrow = new Date(today); afterTomorrow.setDate(today.getDate() + 2);
            const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            document.getElementById('customer-booking-checkin').min = fmt(today);
            document.getElementById('customer-booking-checkout').min = fmt(tomorrow);
            document.getElementById('customer-booking-checkin').value = fmt(tomorrow);
            document.getElementById('customer-booking-checkout').value = fmt(afterTomorrow);
            document.getElementById('customer-booking-summary').innerHTML = `<strong>${room.id}</strong> • tối đa ${room.capacity} khách • ${room.price.toLocaleString('vi-VN')} ₫/đêm`;
            document.getElementById('customer-booking-modal').classList.remove('hidden');
        }

        function closeCustomerBookingModal() {
            document.getElementById('customer-booking-modal').classList.add('hidden');
        }

        function handleCustomerBooking(e) {
            e.preventDefault();
            if (!CURRENT_USER || !ROLE_CONFIG || ROLE_CONFIG.role !== 'customer') return;
            const roomId = document.getElementById('customer-booking-room-id').value;
            const room = rooms.find(r => r.id === roomId);
            if (!room || room.status !== 'AVAILABLE') {
                alert('Phòng này vừa có người yêu cầu đặt. Vui lòng chọn phòng khác.');
                closeCustomerBookingModal();
                renderCustomerPortal();
                return;
            }
            const checkin = document.getElementById('customer-booking-checkin').value;
            const checkout = document.getElementById('customer-booking-checkout').value;
            const guests = parseInt(document.getElementById('customer-booking-guests').value || '1', 10);
            if (!checkin || !checkout || checkin < fusionToday() || new Date(checkout) <= new Date(checkin)) {
                alert('Ngày trả phòng phải sau ngày nhận phòng.');
                return;
            }
            if (!Number.isInteger(guests) || guests < 1 || guests > room.capacity) {
                alert(`Phòng ${room.id} chỉ chứa tối đa ${room.capacity} khách.`);
                return;
            }

            const request = {
                id: makeRequestId('BK'),
                roomId: room.id,
                roomType: room.type,
                roomPrice: room.price,
                customerName: CURRENT_USER.name,
                customerEmail: CURRENT_USER.email,
                customerPhone: CURRENT_USER.phone || '',
                checkin, checkout, guests,
                note: document.getElementById('customer-booking-note').value.trim(),
                status: 'PENDING',
                createdAt: new Date().toISOString(),
                decidedAt: '', decidedBy: '', decidedByRole: ''
            };
            bookingRequests.unshift(request);
            logSystemActivity('BOOKING', 'Khách gửi yêu cầu đặt phòng', `${CURRENT_USER.name} yêu cầu phòng ${room.id}, ${checkin} → ${checkout}, ${guests} khách.`, { relatedKind: 'booking', relatedId: request.id });
            room.status = 'PENDING';
            room.pendingRequestId = request.id;
            persistHotelData();
            closeCustomerBookingModal();
            refreshRequestWorkflowViews();
            showCenterNotice({ title: 'Đã gửi yêu cầu đặt phòng', message: `Yêu cầu đặt phòng ${room.id} đã được gửi thành công. Admin hoặc Lễ tân sẽ sớm kiểm tra, bạn có thể theo dõi trạng thái tại “Phòng của tôi”.`, icon: '<i class="fa-solid fa-calendar-check"></i>' });
        }

        function populateCustomerServiceRooms() {
            const select = document.getElementById('customer-service-room');
            if (!select) return;
            // Chỉ cho gọi dịch vụ sau khi khách đã Check-in và phòng ở trạng thái OCCUPIED.
            const mine = getMyCustomerRooms().filter(r => r.status === 'OCCUPIED');
            if (!mine.length) {
                select.innerHTML = `<option value="">Vui lòng Check-in trước khi yêu cầu dịch vụ</option>`;
                select.disabled = true;
            } else {
                select.disabled = false;
                select.innerHTML = mine.map(r => `<option value="${r.id}">${r.id} - ${r.type} (Đang ở)</option>`).join('');
            }
        }

        function updateCustomerServiceOptions() {
            const typeEl = document.getElementById('customer-service-type');
            const itemEl = document.getElementById('customer-service-item');
            if (!typeEl || !itemEl) return;
            const items = serviceCatalog[typeEl.value] || [];
            itemEl.innerHTML = items.map(item => `<option value="${item.name}" data-price="${item.price}">${item.name}${item.price ? ` (${item.price.toLocaleString('vi-VN')} ₫)` : ''}</option>`).join('');
            updateCustomerServiceEstimate();
        }

        function updateCustomerServiceEstimate() {
            const itemEl = document.getElementById('customer-service-item');
            const qtyEl = document.getElementById('customer-service-qty');
            const estimateEl = document.getElementById('customer-service-estimate');
            if (!itemEl || !qtyEl || !estimateEl) return;
            const selected = itemEl.options[itemEl.selectedIndex];
            const price = selected ? parseInt(selected.dataset.price || '0', 10) : 0;
            const qty = Math.max(1, parseInt(qtyEl.value || '1', 10));
            estimateEl.textContent = price ? `${(price * qty).toLocaleString('vi-VN')} ₫` : 'Theo yêu cầu';
        }

        function handleCustomerServiceRequest(e) {
            e.preventDefault();
            if (!CURRENT_USER || !ROLE_CONFIG || ROLE_CONFIG.role !== 'customer') return;
            const roomId = document.getElementById('customer-service-room').value;
            const mine = getMyCustomerRooms().filter(r => r.status === 'OCCUPIED');
            if (!roomId || !mine.some(r => r.id === roomId)) {
                alert('Bạn cần Check-in và ở trạng thái “Đang ở” trước khi yêu cầu dịch vụ.');
                return;
            }
            const type = document.getElementById('customer-service-type').value;
            const itemEl = document.getElementById('customer-service-item');
            const selected = itemEl.options[itemEl.selectedIndex];
            const name = itemEl.value;
            const price = selected ? parseInt(selected.dataset.price || '0', 10) : 0;
            const qty = Math.max(1, parseInt(document.getElementById('customer-service-qty').value || '1', 10));
            const note = document.getElementById('customer-service-note').value.trim();
            const request = {
                id: makeRequestId('SV'), roomId, name, type, qty, unitPrice: price, total: price * qty,
                customerEmail: CURRENT_USER.email, customerName: CURRENT_USER.name,
                note, status: 'PENDING', createdAt: new Date().toISOString(),
                decidedAt: '', decidedBy: '', decidedByRole: ''
            };
            serviceRequests.unshift(request);
            logSystemActivity('SERVICE', 'Khách gửi yêu cầu dịch vụ', `${CURRENT_USER.name} yêu cầu ${name} cho phòng ${roomId}, số lượng ${qty}.`, { relatedKind: 'service', relatedId: request.id });
            persistHotelData();
            document.getElementById('customer-service-note').value = '';
            document.getElementById('customer-service-qty').value = 1;
            refreshRequestWorkflowViews();
            updateCustomerServiceEstimate();
            showCenterNotice({ title: 'Yêu cầu đã được tiếp nhận', message: `Yêu cầu “${name}” cho phòng ${roomId} đã được tiếp nhận. Xin đợi chúng tôi một chút, nhân viên sẽ mang lên cho bạn.`, icon: '<i class="fa-solid fa-bell-concierge"></i>' });
        }

        function renderCustomerServiceHistory() {
            const container = document.getElementById('customer-service-history');
            if (!container || !CURRENT_USER) return;
            const email = (CURRENT_USER.email || '').toLowerCase();
            const mine = serviceRequests.filter(log => (log.customerEmail || '').toLowerCase() === email);
            if (!mine.length) {
                container.innerHTML = `<div class="text-center py-10 text-slate-400"><i class="fa-regular fa-bell text-3xl mb-3"></i><p class="text-sm">Bạn chưa gửi yêu cầu dịch vụ nào.</p></div>`;
                return;
            }
            const cfg = {
                PENDING: { label: 'Đã tiếp nhận • Đang chuẩn bị', cls: 'bg-amber-100 text-amber-800' },
                APPROVED: { label: 'Đang phục vụ', cls: 'bg-emerald-100 text-emerald-800' },
                REJECTED: { label: 'Không thể phục vụ', cls: 'bg-rose-100 text-rose-800' }
            };
            container.innerHTML = mine.map(log => {
                const c = cfg[log.status] || cfg.PENDING;
                return `<div class="rounded-xl border border-slate-200 p-4 flex items-start justify-between gap-4">
                    <div>
                        <div class="flex flex-wrap items-center gap-2"><span class="font-bold text-slate-900">${escapeHtml(log.name)}</span><span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${c.cls}">${c.label}</span></div>
                        <p class="text-xs text-slate-500 mt-1">Phòng ${escapeHtml(log.roomId)} • ${escapeHtml(log.type)} • SL: ${log.qty}</p>
                        ${log.note ? `<p class="text-xs text-slate-600 mt-2">Ghi chú: ${escapeHtml(log.note)}</p>` : ''}
                        ${log.status === 'APPROVED' && log.decidedBy ? `<p class="text-xs text-emerald-600 mt-2">Nhân viên ${escapeHtml(log.decidedBy)} đã tiếp nhận và đang phục vụ.</p>` : ''}
                        ${log.status === 'REJECTED' ? `<p class="text-xs text-rose-600 mt-2">Hiện tại khách sạn chưa thể phục vụ yêu cầu này${log.decisionNote ? ': ' + escapeHtml(log.decisionNote) : '.'}</p>` : ''}
                    </div>
                    <div class="text-right shrink-0"><p class="text-xs text-slate-400">${formatRequestTime(log.createdAt)}</p><p class="text-sm font-bold text-slate-900 mt-1">${log.total ? Number(log.total).toLocaleString('vi-VN') + ' ₫' : 'Theo yêu cầu'}</p></div>
                </div>`;
            }).join('');
        }


        function calculateCustomerRoomTotal(room) {
            if (!room) return { nights:1, roomTotal:0, serviceTotal:0, total:0 };
            const nights = calculateStayNights(room);
            const roomTotal = (Number(room.price)||0) * nights;
            const serviceTotal = getOpenServiceLogsForRoom(room.id).reduce((s,x)=>s+(Number(x.total)||0),0);
            return { nights, roomTotal, serviceTotal, total:roomTotal+serviceTotal };
        }

        function renderCustomerPayments() {
            if (ROLE_CONFIG?.role !== 'customer' || !CURRENT_USER) return;
            const email=(CURRENT_USER.email||'').toLowerCase();
            const myRooms=rooms.filter(r => (r.guestEmail||'').toLowerCase()===email && ['BOOKED','OCCUPIED'].includes(r.status));
            const select=document.getElementById('customer-payment-room');
            if (select) {
                const old=select.value;
                select.innerHTML=myRooms.length ? myRooms.map(r=>`<option value="${r.id}">${r.id} - ${escapeHtml(r.type)}</option>`).join('') : '<option value="">Chưa có phòng đã duyệt</option>';
                if (myRooms.some(r=>r.id===old)) select.value=old;
            }
            const items=document.getElementById('customer-payment-items');
            if (items) {
                items.innerHTML=myRooms.length ? myRooms.map(r=>{ const c=calculateCustomerRoomTotal(r); const paid=r.paymentStatus==='PAID'; return `<div class="rounded-2xl border ${paid?'border-emerald-200 bg-emerald-50/50':'border-slate-200'} p-5"><div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><div class="flex items-center gap-2"><h5 class="font-extrabold text-slate-900">Phòng ${r.id}</h5>${paid?'<span class="text-[10px] font-extrabold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">ĐÃ THANH TOÁN</span>':'<span class="text-[10px] font-extrabold bg-amber-100 text-amber-700 px-2 py-1 rounded-full">CHƯA THANH TOÁN</span>'}</div><p class="text-xs text-slate-500 mt-1">${escapeHtml(r.type)} • ${c.nights} đêm</p></div><div class="text-right"><p class="text-xs text-slate-400">Tạm tính</p><p class="text-xl font-extrabold text-slate-900">${c.total.toLocaleString('vi-VN')} ₫</p></div></div><div class="grid grid-cols-2 gap-3 mt-4 text-xs"><div class="bg-white rounded-xl p-3 border border-slate-100"><span class="text-slate-400">Tiền phòng</span><p class="font-bold mt-1">${c.roomTotal.toLocaleString('vi-VN')} ₫</p></div><div class="bg-white rounded-xl p-3 border border-slate-100"><span class="text-slate-400">Dịch vụ</span><p class="font-bold mt-1">${c.serviceTotal.toLocaleString('vi-VN')} ₫</p></div></div></div>`}).join('') : '<div class="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400"><i class="fa-solid fa-receipt text-3xl mb-3"></i><p class="font-semibold">Chưa có phòng nào sẵn sàng thanh toán.</p><p class="text-xs mt-1">Phòng phải được Admin/Lễ tân duyệt trước.</p></div>';
            }
            const history=document.getElementById('customer-payment-history');
            if (history) {
                const mine=paymentRequests.filter(p=>(p.customerEmail||'').toLowerCase()===email);
                history.innerHTML=mine.length ? mine.map(p=>`<div class="rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><div class="flex gap-2 items-center"><span class="text-[10px] font-extrabold px-2 py-1 rounded-full ${p.status==='APPROVED'?'bg-emerald-100 text-emerald-700':p.status==='REJECTED'?'bg-rose-100 text-rose-700':'bg-amber-100 text-amber-700'}">${p.status==='APPROVED'?'ĐÃ XÁC NHẬN':p.status==='REJECTED'?'TỪ CHỐI':'CHỜ XÁC NHẬN'}</span><span class="font-bold text-slate-900">Phòng ${escapeHtml(p.roomId)}</span></div><p class="text-xs text-slate-500 mt-2">${p.method==='BANK'?'Chuyển khoản':'Tiền mặt'} • ${formatRequestTime(p.createdAt)}</p>${p.transactionCode?`<p class="text-xs text-slate-500 mt-1">Mã GD: ${escapeHtml(p.transactionCode)}</p>`:''}${p.adminNote?`<p class="text-xs text-indigo-700 mt-1">Admin: ${escapeHtml(p.adminNote)}</p>`:''}${paymentBillSrc(p.billImage)?`<button type="button" onclick="viewPaymentBill('${p.id}')" class="mt-2 px-3 py-1 bg-sky-50 text-sky-700 rounded-lg text-xs font-bold">Xem bill đã gửi</button>`:''}</div><p class="text-lg font-extrabold">${Number(p.total||0).toLocaleString('vi-VN')} ₫</p></div>`).join('') : '<p class="text-sm text-center text-slate-400 py-6">Chưa có yêu cầu thanh toán.</p>';
            }
            updateCustomerPaymentSummary();
        }

        function updateCustomerPaymentSummary() {
            const id=document.getElementById('customer-payment-room')?.value;
            const room=rooms.find(r=>r.id===id);
            const box=document.getElementById('customer-payment-summary');
            if (!box) return;
            if (!room) { box.innerHTML='<p class="text-slate-400">Chưa có phòng để thanh toán.</p>'; return; }
            const c=calculateCustomerRoomTotal(room);
            box.innerHTML=`<div class="flex justify-between"><span>Tiền phòng (${c.nights} đêm)</span><strong>${c.roomTotal.toLocaleString('vi-VN')} ₫</strong></div><div class="flex justify-between mt-2"><span>Dịch vụ đã duyệt</span><strong>${c.serviceTotal.toLocaleString('vi-VN')} ₫</strong></div><div class="flex justify-between mt-3 pt-3 border-t border-white/20 text-base"><span class="font-bold">Tổng dự kiến</span><strong class="text-amber-400">${c.total.toLocaleString('vi-VN')} ₫</strong></div>`;
            const ct=document.getElementById('bank-transfer-content'); if(ct) ct.textContent=`HOTEL ${room.id} ${(CURRENT_USER?.name||'KHACH').toUpperCase()}`;
        }

        function togglePaymentMethod() {
            const method=document.querySelector('input[name="payment-method"]:checked')?.value || 'BANK';
            document.getElementById('bank-payment-info')?.classList.toggle('hidden', method!=='BANK');
            document.getElementById('cash-payment-info')?.classList.toggle('hidden', method!=='CASH');
        }

        function paymentBillSrc(value) {
            return /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(String(value||'')) && String(value).length<=950000 ? value : '';
        }
        function previewPaymentBill(input) {
            const preview=document.getElementById('payment-bill-preview');
            if(!preview)return;
            preview.classList.add('hidden');preview.removeAttribute('src');
            const file=input.files?.[0];if(!file)return;
            if(!['image/jpeg','image/png','image/webp'].includes(file.type))return alert('Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.');
            const url=URL.createObjectURL(file);preview.src=url;preview.classList.remove('hidden');preview.onload=()=>URL.revokeObjectURL(url);
        }
        async function readPaymentBill() {
            const file=document.getElementById('payment-bill-image')?.files?.[0];
            if(!file)throw new Error('Bạn phải tải ảnh bill để gửi yêu cầu thanh toán.');
            if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Ảnh phải là JPG, PNG hoặc WebP.');
            if(file.size>12_000_000)throw new Error('Ảnh gốc không được quá 12 MB.');
            const img=await createImageBitmap(file);
            try {
                const max=1400, scale=Math.min(1,max/Math.max(img.width,img.height));
                const canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);
                canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
                for(const quality of [0.82,0.65,0.45,0.3]){
                    const data=canvas.toDataURL('image/jpeg',quality);
                    if(data.length<=900000)return data;
                }
                throw new Error('Ảnh quá lớn. Hãy chọn ảnh bill rõ nét nhưng có dung lượng nhỏ hơn.');
            }finally{img.close();}
        }
        function viewPaymentBill(id) {
            const p=paymentRequests.find(x=>x.id===id);const src=paymentBillSrc(p?.billImage);
            if(!src)return alert('Yêu cầu này không có ảnh bill (có thể được tạo trước bản nâng cấp).');
            if(window.Swal) Swal.fire({title:'Bill thanh toán • Phòng '+String(p.roomId),imageUrl:src,imageAlt:'Ảnh bill khách gửi',imageWidth:'100%',width:650,confirmButtonText:'Đóng'});
            else { const w=window.open('','_blank'); if(w){const image=w.document.createElement('img');image.src=src;image.alt='Bill thanh toán';image.style.maxWidth='100%';w.document.body.append(image);} }
        }
        async function submitCustomerPayment(e) {
            e.preventDefault();
            if (ROLE_CONFIG?.role!=='customer' || !CURRENT_USER) return;
            const roomId=document.getElementById('customer-payment-room')?.value;
            const room=rooms.find(r=>r.id===roomId);
            if(!room){ alert('Bạn chưa có phòng đã được duyệt để thanh toán.'); return; }
            if(paymentRequests.some(p=>p.roomId===roomId && p.status==='PENDING')) return alert('Phòng này đã có yêu cầu thanh toán chờ duyệt.');
            if(room.paymentStatus==='PAID'){ alert('Phòng này đã được xác nhận thanh toán.'); return; }
            const method=document.querySelector('input[name="payment-method"]:checked')?.value || 'BANK';
            const calc=calculateCustomerRoomTotal(room);
            let billImage; try { billImage=await readPaymentBill(); } catch(error) {alert(error.message);return;}
            const req={id:'PAY-'+Date.now(), roomId, customerName:CURRENT_USER.name, customerEmail:CURRENT_USER.email, method, transactionCode:method==='BANK'?(document.getElementById('payment-transaction-code')?.value.trim()||''):'', billImage, roomRevenue:calc.roomTotal, serviceRevenue:calc.serviceTotal, total:calc.total, status:'PENDING', createdAt:new Date().toISOString(), decidedBy:'', decidedAt:'', adminNote:''};
            try { await paymentApi('/api/payment-requests',req); } catch(error) { alert('Không gửi được yêu cầu thanh toán: '+error.message); return; }
            paymentRequests.unshift(req);
            const billInput=document.getElementById('payment-bill-image');if(billInput)billInput.value='';const billPreview=document.getElementById('payment-bill-preview');if(billPreview){billPreview.classList.add('hidden');billPreview.removeAttribute('src');}
            logSystemActivity('PAYMENT','Khách gửi yêu cầu thanh toán',`${CURRENT_USER.email} yêu cầu thanh toán phòng ${roomId} bằng ${method==='BANK'?'chuyển khoản':'tiền mặt'}, tổng ${calc.total.toLocaleString('vi-VN')} ₫.`,{relatedKind:'payment',relatedId:req.id});
            persistHotelData(); updateStaffNotifications(); renderCustomerPayments();
            showCenterNotice({ title: 'Đã gửi yêu cầu thanh toán', message: 'Yêu cầu thanh toán đã chuyển đến Admin và Lễ tân để đối soát.', icon: '<i class="fa-solid fa-credit-card"></i>' });
        }

        async function adminApprovePayment(id) {
            if(!isStaffRole()) return;
            const p=paymentRequests.find(x=>x.id===id); if(!p || p.status!=='PENDING') return;
            const room=rooms.find(r=>r.id===p.roomId);
            if(room && (room.paymentStatus==='PAID' || (room.guestEmail && room.guestEmail.toLowerCase()!==p.customerEmail.toLowerCase()))) return alert('Phòng đã thanh toán hoặc không còn thuộc yêu cầu này.');
            if(room && room.guestEmail && calculateCustomerRoomTotal(room).total!==p.total) return alert('Chi phí đã thay đổi. Hãy từ chối yêu cầu cũ để khách gửi lại.');
            if(!(await (window.ghSweetConfirm ? window.ghSweetConfirm('Bạn đã kiểm tra tiền thực nhận/chuyển khoản và muốn xác nhận yêu cầu này?') : Promise.resolve(confirm('Xác nhận đã nhận đủ tiền?'))))) return;
            try {await paymentApi('/api/payment-requests/decision',{id,status:'APPROVED',decidedBy:CURRENT_USER.email,adminNote:'Đã đối soát và xác nhận thanh toán.'});}
            catch(e){alert('Không xác nhận được: '+e.message);await syncPaymentRequests();return;}
            p.status='APPROVED'; p.decidedBy=CURRENT_USER.email; p.decidedAt=new Date().toISOString(); p.adminNote='Đã đối soát và xác nhận thanh toán.';
            if(room){ room.paymentStatus='PAID'; room.paymentRequestId=p.id; }
            if(!revenueHistory.some(x=>x.paymentRequestId===p.id)) revenueHistory.push({createdAt:new Date().toISOString(),time:new Date().toLocaleString('vi-VN'),roomId:p.roomId,guest:p.customerName,roomRevenue:p.roomRevenue,serviceRevenue:p.serviceRevenue,total:p.total,paymentMethod:p.method==='BANK'?'Chuyển khoản':'Tiền mặt',paymentRequestId:p.id});
            getOpenServiceLogsForRoom(p.roomId).forEach(x=>x.closed=true);
            logSystemActivity('PAYMENT','Admin xác nhận thanh toán',`Xác nhận ${p.method==='BANK'?'chuyển khoản':'tiền mặt'} phòng ${p.roomId}.`,{relatedKind:'payment',relatedId:p.id,result:p.total.toLocaleString('vi-VN')+' ₫'});
            persistHotelData(); renderAdminActivityCenter(); renderAdminControl(); updateStaffNotifications(); renderStaffRequests();
        }

        async function adminRejectPayment(id) {
            if(!isStaffRole()) return;
            const p=paymentRequests.find(x=>x.id===id); if(!p || p.status!=='PENDING') return;
            const note=prompt('Lý do chưa xác nhận thanh toán:','Chưa đối soát được giao dịch.') ?? null; if(note===null)return;
            try {await paymentApi('/api/payment-requests/decision',{id,status:'REJECTED',decidedBy:CURRENT_USER.email,adminNote:note});}
            catch(e){alert('Không từ chối được: '+e.message);await syncPaymentRequests();return;}
            p.status='REJECTED'; p.decidedBy=CURRENT_USER.email; p.decidedAt=new Date().toISOString(); p.adminNote=note;
            logSystemActivity('PAYMENT','Admin từ chối xác nhận thanh toán',`Phòng ${p.roomId}: ${note}`,{relatedKind:'payment',relatedId:p.id,result:'Từ chối'});
            persistHotelData(); renderAdminActivityCenter(); updateStaffNotifications(); renderStaffRequests();
        }

        function adminReplySupportInline(id) {
            if(!isStaffRole()) return;
            const req=adminSupportRequests.find(r=>r.id===id); if(!req)return;
            const input=document.getElementById('reply-'+id); const reply=input?.value.trim()||'';
            if(!reply){ alert('Vui lòng nhập câu trả lời cho khách hàng.'); input?.focus(); return; }
            req.status='DONE'; req.adminReply=reply; req.handledBy=CURRENT_USER.email; req.handledAt=new Date().toISOString();
            logSystemActivity('SYSTEM','Nhân viên trả lời khách hàng',req.message,{relatedKind:'admin_support',relatedId:req.id,result:reply});
            persistHotelData(); renderAdminActivityCenter(); updateStaffNotifications();
        }

        document.addEventListener('change' , function(e) {
            if (e.target && (e.target.id === 'customer-service-item' || e.target.id === 'customer-service-qty')) updateCustomerServiceEstimate();
            if (e.target && e.target.id === 'customer-booking-checkin') {
                const checkin = new Date(e.target.value);
                if (!isNaN(checkin)) {
                    const next = new Date(checkin); next.setDate(checkin.getDate() + 1);
                    const checkout = document.getElementById('customer-booking-checkout');
                    checkout.min = next.toISOString().split('T')[0];
                    if (!checkout.value || new Date(checkout.value) <= checkin) checkout.value = next.toISOString().split('T')[0];
                }
            }
        });

        // Đồng bộ thông báo giữa các tab Live Server cùng trình duyệt.
        window.addEventListener('storage', function(e) {
            if (!['grandhotel_rooms','grandhotel_service_logs','grandhotel_booking_requests','grandhotel_service_requests','grandhotel_revenue_history','grandhotel_admin_support_requests','grandhotel_payment_requests','grandhotel_system_activities','grandhotel_customer_feedbacks'].includes(e.key)) return;
            restoreHotelData();
            updateStaffNotifications();
            if (ROLE_CONFIG?.role === 'customer') { renderCustomerPortal(); renderCustomerAdminSupportHistory(); renderCustomerPayments(); }
            if (isStaffRole()) renderStaffRequests();
            renderDashboard();
            renderRooms();
            renderBookingsTable();
            renderServicesLog();
            if (ROLE_CONFIG?.role === 'admin') { renderAdminControl(); renderAdminActivityCenter(); }
        });

        // --- 6. BOOKING MODAL LOGIC ---
        function openBookingModal() {
            const select = document.getElementById('book-room-id');
            select.innerHTML = '';
            const available = rooms.filter(r => r.status === 'AVAILABLE');

            if (available.length === 0) {
                select.innerHTML = `<option value="">Hiện tại không còn phòng trống</option>`;
            } else {
                available.forEach(r => {
                    select.innerHTML += `<option value="${r.id}">${r.id} - ${r.type} (${r.price.toLocaleString('vi-VN')} ₫)</option>`;
                });
            }

            // Set default dates
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('book-checkin-date').value = today;

            document.getElementById('booking-modal').classList.remove('hidden');
        }

        function closeBookingModal() {
            document.getElementById('booking-modal').classList.add('hidden');
        }

        function handleCreateBooking(e) {
            e.preventDefault();
            const name = document.getElementById('book-customer-name').value;
            const roomId = document.getElementById('book-room-id').value;
            const checkin = document.getElementById('book-checkin-date').value;
            const checkout = document.getElementById('book-checkout-date').value;

            const room = rooms.find(r => r.id === roomId);
            if (!isStaffRole() || !name.trim() || !room || room.status !== 'AVAILABLE' || !checkin || !checkout || checkout <= checkin || checkin < fusionToday()) return alert('Kiểm tra tên khách, phòng trống và ngày nhận/trả phòng hợp lệ.');
            if (room) {
                room.status = 'BOOKED';
                room.guest = name;
                room.checkin = checkin;
                room.checkout = checkout;
                logSystemActivity('BOOKING', 'Nhân viên tạo đơn trực tiếp', `${CURRENT_USER?.email || 'Nhân viên'} tạo đơn cho ${name} tại phòng ${roomId}, ${checkin} → ${checkout}.`);
                persistHotelData();

                renderDashboard();
                renderRooms();
                renderBookingsTable();
                renderServicesLog();
                closeBookingModal();
                alert(`Tạo đơn đặt phòng thành công cho khách ${name} tại phòng ${roomId}!`);
            }
        }

        // --- 7. ADD ROOM MODAL LOGIC ---
        function openAddRoomModal() {
            document.getElementById('add-room-modal').classList.remove('hidden');
        }

        function closeAddRoomModal() {
            document.getElementById('add-room-modal').classList.add('hidden');
        }

        function handleAddNewRoom(e) {
            e.preventDefault();
            const number = document.getElementById('new-room-number').value.toUpperCase();
            const type = document.getElementById('new-room-type').value;
            const price = parseHotelMoney(document.getElementById('new-room-price').value);
            const capacity = parseInt(document.getElementById('new-room-capacity').value);

            if (rooms.some(r => r.id === number)) {
                alert('Mã phòng này đã tồn tại!');
                return;
            }

            rooms.push({
                id: number,
                type: type,
                price: price,
                capacity: capacity,
                status: 'AVAILABLE',
                guest: '',
                checkin: '',
                checkout: ''
            });
            logSystemActivity('ROOM', 'Admin thêm phòng mới', `Đã thêm phòng ${number} - ${type}, giá ${price.toLocaleString('vi-VN')} ₫/đêm.`);
            persistHotelData();

            renderDashboard();
            renderRooms();
            closeAddRoomModal();
            alert(`Đã thêm phòng ${number} mới thành công!`);
        }

        // --- 8. AI ASSISTANT PRO: HOTEL + TRAVEL + BUDGET + MEMORY ---
        let AI_CONVERSATION = [];

        function getAiConversationKey() {
            return 'grandhotel_ai_chat_' + ((CURRENT_USER?.email || ROLE_CONFIG?.role || 'guest').toLowerCase());
        }

        function saveAiConversation() {
            localStorage.setItem(getAiConversationKey(), JSON.stringify(AI_CONVERSATION.slice(-40)));
        }

        function safeAiHtml(html) {
            const template = document.createElement('template');
            template.innerHTML = String(html || '');
            template.content.querySelectorAll('script,style,iframe,object,embed,link,meta,form,input,button').forEach(el => el.remove());
            template.content.querySelectorAll('*').forEach(el => [...el.attributes].forEach(a => {
                if (a.name.startsWith('on') || ['src','href','style'].includes(a.name)) el.removeAttribute(a.name);
            }));
            return template.innerHTML;
        }

        function renderSavedAiMessage(item) {
            if (item.role === 'user') return `<div class="flex items-start justify-end gap-3 max-w-2xl ml-auto"><div class="bg-slate-900 text-white p-4 rounded-2xl rounded-tr-none shadow-sm text-sm leading-relaxed">${escapeHtml(item.text)}</div><div class="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-white shrink-0"><i class="fa-solid fa-user"></i></div></div>`;
            return `<div class="flex items-start gap-3 max-w-3xl"><div class="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 shrink-0"><i class="fa-solid fa-robot"></i></div><div class="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm text-sm text-slate-700 leading-relaxed space-y-2">${safeAiHtml(item.html)}<div class="ai-answer-actions"><button onclick="copyAiAnswer(this)"><i class="fa-regular fa-copy mr-1"></i>Sao chép</button><button onclick="rateAiAnswer(this,1)"><i class="fa-regular fa-thumbs-up mr-1"></i>Hữu ích</button><button onclick="rateAiAnswer(this,-1)"><i class="fa-regular fa-thumbs-down mr-1"></i>Chưa đúng</button></div></div></div>`;
        }

        function restoreAiConversation() {
            try { AI_CONVERSATION = JSON.parse(localStorage.getItem(getAiConversationKey()) || '[]'); } catch (_) { AI_CONVERSATION = []; }
            if (!AI_CONVERSATION.length) return;
            const box = document.getElementById('ai-chat-history');
            if (box) { box.innerHTML = AI_CONVERSATION.map(renderSavedAiMessage).join(''); box.scrollTop = box.scrollHeight; }
            updateAiModeBadge();
        }

        async function clearAiConversation() {
            if (!(await window.ghSweetConfirm('Xóa toàn bộ cuộc trò chuyện AI của tài khoản này?'))) return;
            AI_CONVERSATION = []; AI_TRIP_CONTEXT = null; localStorage.removeItem(getAiConversationKey());
            const box = document.getElementById('ai-chat-history');
            if (box) box.innerHTML = `<div class="flex items-start gap-3 max-w-2xl"><div class="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950"><i class="fa-solid fa-robot"></i></div><div class="bg-white p-4 rounded-2xl border border-slate-200 text-sm">Cuộc trò chuyện mới đã sẵn sàng. Bạn có thể hỏi tôi về phòng, dịch vụ, chi phí hoặc kế hoạch du lịch.</div></div>`;
        }

        function exportAiConversation() {
            const lines = AI_CONVERSATION.map(x => `${x.role === 'user' ? 'BẠN' : 'AI'}: ${String(x.text || x.html || '').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()}`);
            const blob = new Blob([`GRAND HOTEL AI PRO - LỊCH SỬ HỘI THOẠI\n${new Date().toLocaleString('vi-VN')}\n\n${lines.join('\n\n')}`], {type:'text/plain;charset=utf-8'});
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'Grand_Hotel_AI_Chat.txt'; a.click(); URL.revokeObjectURL(a.href);
        }

        function copyAiAnswer(btn) {
            const text = btn.closest('.bg-white')?.innerText.replace(/Sao chép|Hữu ích|Chưa đúng/g,'').trim() || '';
            navigator.clipboard?.writeText(text); btn.innerHTML = '<i class="fa-solid fa-check mr-1"></i>Đã sao chép';
        }

        function rateAiAnswer(btn, value) {
            btn.parentElement.querySelectorAll('button').forEach(x => x.classList.remove('bg-emerald-50','text-emerald-700','bg-rose-50','text-rose-700'));
            btn.classList.add(value > 0 ? 'bg-emerald-50' : 'bg-rose-50', value > 0 ? 'text-emerald-700' : 'text-rose-700');
        }

        function getAiConfig() { try { return {endpoint:'/api/ai/chat',model:'grand-hotel-ai',enabled:true,...JSON.parse(localStorage.getItem('grandhotel_ai_config') || '{}')}; } catch (_) { return {endpoint:'/api/ai/chat',model:'grand-hotel-ai',enabled:true}; } }
        function openAiConfig() { const c=getAiConfig(); document.getElementById('ai-endpoint').value=c.endpoint||'/api/ai/chat'; document.getElementById('ai-model-name').value=c.model||'grand-hotel-ai'; document.getElementById('ai-online-enabled').checked=!!c.enabled; const m=document.getElementById('ai-config-modal'); m.classList.remove('hidden'); m.classList.add('flex'); }
        function closeAiConfig() { const m=document.getElementById('ai-config-modal'); m.classList.add('hidden'); m.classList.remove('flex'); }
        function saveAiConfig() { const endpoint=document.getElementById('ai-endpoint').value.trim(); const enabled=document.getElementById('ai-online-enabled').checked; if(enabled && !endpoint) return alert('Vui lòng nhập endpoint backend trước khi bật AI trực tuyến.'); localStorage.setItem('grandhotel_ai_config',JSON.stringify({endpoint,model:document.getElementById('ai-model-name').value.trim()||'grand-hotel-ai',enabled})); closeAiConfig(); updateAiModeBadge(); }
        function updateAiModeBadge() { const c=getAiConfig(); const b=document.getElementById('ai-mode-badge'); if(b) b.textContent=c.enabled&&c.endpoint?'AI trực tuyến + dự phòng':'AI mô phỏng · dữ liệu cục bộ'; }

        function toggleAiVoiceInput() {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) return alert('Trình duyệt này chưa hỗ trợ nhập giọng nói. Hãy dùng Chrome hoặc Edge phiên bản mới.');
            const r = new SpeechRecognition(); r.lang='vi-VN'; r.interimResults=false;
            const btn=document.getElementById('ai-voice-btn'); btn.classList.add('bg-rose-50','text-rose-600');
            r.onresult=e=>{ document.getElementById('ai-input').value=e.results[0][0].transcript; };
            r.onend=()=>btn.classList.remove('bg-rose-50','text-rose-600'); r.start();
        }

        function setAiPrompt(text) {
            const input = document.getElementById('ai-input');
            if (!input) return;
            input.value = text;
            input.focus();
        }

        function normalizeVietnameseKey(value) {
            return (value || '').trim().toLowerCase()
                .replace(/thành phố/g, 'tp.')
                .replace(/ho chi minh|hồ chí minh city|sài gòn|sai gon/g, 'hồ chí minh')
                .replace(/danang/g, 'đà nẵng')
                .replace(/dalat/g, 'đà lạt')
                .replace(/hanoi/g, 'hà nội')
                .replace(/sapa/g, 'sa pa');
        }

        function findTourismDestination(value) {
            const key = normalizeVietnameseKey(value);
            if (!key) return null;
            if (TOURISM_CATALOG[key]) return TOURISM_CATALOG[key];
            const match = Object.entries(TOURISM_CATALOG).find(([k, v]) => key.includes(k) || k.includes(key) || key.includes(normalizeVietnameseKey(v.name)));
            return match ? match[1] : null;
        }

        // Ghi nhớ ngữ cảnh chuyến đi trong phiên chat để hiểu các câu trả lời nối tiếp.
        let AI_TRIP_CONTEXT = null;

        function getAiTripProfile() {
            const get = id => document.getElementById(id);
            return {
                destination: get('ai-destination')?.value.trim() || '',
                budget: Math.max(0, parseHotelMoney(get('ai-budget')?.value) || 0),
                travelers: Math.max(1, parseInt(get('ai-travelers')?.value || '1', 10) || 1),
                days: Math.max(1, parseInt(get('ai-days')?.value || '1', 10) || 1),
                style: get('ai-style')?.value || 'cân bằng',
                interest: get('ai-interest')?.value || 'tham quan và check-in'
            };
        }

        function generateBudgetTravelPlan() {
            const profile = getAiTripProfile();
            if (!profile.destination) {
                alert('Vui lòng nhập điểm đến để AI gợi ý địa điểm du lịch phù hợp.');
                document.getElementById('ai-destination')?.focus();
                return;
            }
            if (!profile.budget) {
                alert('Vui lòng nhập ngân sách dự kiến/người/ngày.');
                document.getElementById('ai-budget')?.focus();
                return;
            }
            const total = profile.budget * profile.travelers * profile.days;
            const prompt = `Tôi đi ${profile.destination} trong ${profile.days} ngày, ${profile.travelers} người. Ngân sách khoảng ${profile.budget.toLocaleString('vi-VN')} VNĐ/người/ngày (tổng khoảng ${total.toLocaleString('vi-VN')} VNĐ). Phong cách ${profile.style}, thích ${profile.interest}. Hãy tư vấn phòng Grand Hotel phù hợp, các dịch vụ khách sạn nên dùng, địa điểm du lịch nên đi và lịch trình theo từng ngày. Hãy ưu tiên không vượt ngân sách và nêu rõ khoản nào là giá khách sạn, khoản nào chỉ là ước tính bên ngoài.`;
            setAiPrompt(prompt);
            document.getElementById('ai-chat-form')?.requestSubmit();
        }

        function getBudgetTier(budget) {
            if (!budget || budget <= 800000) return 'tiết kiệm';
            if (budget <= 1800000) return 'cân bằng';
            if (budget <= 3500000) return 'thoải mái';
            return 'cao cấp';
        }

        function getRecommendedHotelServices(budget) {
            const all = Object.entries(serviceCatalog).flatMap(([type, items]) => items.map(item => ({ ...item, type })));
            const paid = all.filter(i => Number(i.price) > 0).sort((a,b) => a.price - b.price);
            const free = all.filter(i => Number(i.price) === 0);
            if (!budget || budget <= 800000) return [...free.slice(0,2), ...paid.filter(i => i.price <= 100000).slice(0,3)];
            if (budget <= 1800000) return [...free.slice(0,1), ...paid.filter(i => i.price <= 350000).slice(0,4)];
            if (budget <= 3500000) return [...paid.filter(i => i.price <= 700000).slice(0,5)];
            return paid.slice(-5).reverse();
        }

        function extractTripProfileFromMessage(userMsg, baseProfile) {
            const text = (userMsg || '').toLowerCase();
            const profile = { ...baseProfile };
            const budgetMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(triệu|tr|k|nghìn|ngàn)\b/i);
            if (budgetMatch) {
                let value = parseFloat(budgetMatch[1].replace(',', '.'));
                const unit = budgetMatch[2].toLowerCase();
                if (unit === 'triệu' || unit === 'tr') value *= 1000000;
                else value *= 1000;
                if (Number.isFinite(value) && value >= 100000) {
                    // Nếu khách chỉ nói "có/ngân sách X triệu" thì hiểu là TỔNG ngân sách chuyến đi.
                    // Chỉ hiểu là ngân sách/người/ngày khi khách nói rõ "mỗi người", "người/ngày"...
                    const perPersonDay = /(\/\s*người\s*\/\s*ngày|người\s*\/\s*ngày|mỗi\s*người\s*(mỗi\s*)?ngày|một\s*người\s*(mỗi\s*)?ngày)/i.test(text);
                    if (perPersonDay) {
                        profile.budget = Math.round(value);
                        profile.totalBudget = null;
                    } else {
                        profile.totalBudget = Math.round(value);
                    }
                }
            }
            const dayMatch = text.match(/(\d+)\s*(ngày|đêm)/i);
            if (dayMatch) profile.days = Math.max(1, parseInt(dayMatch[1], 10));
            const peopleMatch = text.match(/(\d+)\s*(người|khách)/i);
            if (peopleMatch) {
                profile.travelers = Math.max(1, parseInt(peopleMatch[1], 10));
                profile.travelersExplicit = true;
            } else if (budgetMatch && /(tư vấn|du lịch|đi đâu|chuyến đi)/i.test(text)) {
                // Một yêu cầu chuyến đi mới có ngân sách nhưng KHÔNG nói số người:
                // tuyệt đối không lấy số người cũ / giá trị mặc định từ biểu mẫu.
                profile.travelers = null;
                profile.travelersExplicit = false;
            }
            const foundDestination = Object.values(TOURISM_CATALOG).find(d => normalizeVietnameseKey(text).includes(normalizeVietnameseKey(d.name)));
            if (foundDestination) profile.destination = foundDestination.name;
            // Khi khách hỏi "đi đâu/ở đâu" mà không nêu địa danh, không được lấy điểm đến cũ từ biểu mẫu.
            if (!foundDestination && /(đi\s*(du lịch)?\s*ở đâu|nên đi đâu|đi đâu|gợi ý.*điểm đến)/i.test(text)) profile.destination = '';
            // Ghi nhận nơi xuất phát và phương tiện từ các câu trả lời nối tiếp như
            // “tôi đi từ Thái Nguyên và đi xe máy”.
            const originMatch = text.match(/(?:xuất phát|đi|từ)\s+(?:từ\s+)?([a-zà-ỹ\s.]+?)(?=\s+(?:và|bằng|đi\s+xe|xe\s+máy|xe\s+khách|ô\s*tô)|$)/i);
            if (originMatch) {
                const candidate = originMatch[1].trim().replace(/^(ở|tại)\s+/i, '');
                if (candidate && candidate.length <= 40 && !/^(đâu|du lịch|tham quan)$/i.test(candidate)) profile.origin = candidate.replace(/\b\w/g, c => c.toUpperCase());
            }
            if (/xe\s*máy/i.test(text)) profile.transport = 'xe máy';
            else if (/xe\s*khách/i.test(text)) profile.transport = 'xe khách';
            else if (/ô\s*tô|oto/i.test(text)) profile.transport = 'ô tô';
            else if (/tàu\s*hỏa|tàu\s*hoả/i.test(text)) profile.transport = 'tàu hỏa';

            if (profile.totalBudget) {
                const n = Math.max(1, (profile.travelers || 1) * (profile.days || 1));
                profile.budget = Math.max(1, Math.floor(profile.totalBudget / n));
            }
            return profile;
        }

        function buildRoomRecommendations(profile) {
            const travelers = profile.travelers || 1;
            const days = profile.days || 1;
            const totalBudget = (profile.budget || 1000000) * travelers * days;
            const targetRoomBudget = totalBudget * 0.75;
            const suitable = rooms
                .filter(r => r.status === 'AVAILABLE' && r.capacity >= travelers)
                .sort((a,b) => a.price - b.price);
            const withinBudget = suitable.filter(r => (r.price * days) <= targetRoomBudget);
            return withinBudget.slice(0, 3);
        }

        function revenueAiKey(text) { return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase(); }
        function isRevenueAiQuestion(text) { return /doanh thu|da thu|chua thanh toan|cong no|loi nhuan|tien phong|tien dich vu|so thu/.test(revenueAiKey(text)); }
        function revenueAiDate(row) {
            if (row.createdAt) { const d = new Date(row.createdAt); if (!isNaN(d)) return d; }
            const m = String(row.time || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (!m) return null;
            const d = new Date(+m[3], +m[2]-1, +m[1]);
            return d.getFullYear()===+m[3] && d.getMonth()===+m[2]-1 && d.getDate()===+m[1] ? d : null;
        }
        function revenueAiSnapshot(period='all', now=new Date()) {
            if (ROLE_CONFIG?.role !== 'admin') return null;
            const start = period==='today' ? new Date(now.getFullYear(),now.getMonth(),now.getDate()) : new Date(now.getFullYear(),now.getMonth()-(period==='previous'?1:0),1);
            const end = period==='today' ? new Date(now.getFullYear(),now.getMonth(),now.getDate()+1) : new Date(now.getFullYear(),now.getMonth()+(period==='previous'?0:1),1);
            const seen = new Set(); let duplicate=0, unknown=0, invalid=0;
            const rows = revenueHistory.filter(row=>{
                if(row.paymentRequestId) { if(seen.has(row.paymentRequestId)) {duplicate++; return false;} seen.add(row.paymentRequestId); }
                if(!Number.isFinite(Number(row.total)) || Number(row.total)<0) {invalid++; return false;}
                const d = revenueAiDate(row); if(!d) unknown++;
                return period==='all' || (d && d>=start && d<end);
            });
            const sum = field => rows.reduce((s,r)=>s+(Number(r[field])||0),0);
            const grouped = new Map(); rows.forEach(r=>grouped.set(r.roomId||'Không rõ phòng',(grouped.get(r.roomId||'Không rõ phòng')||0)+Number(r.total)));
            const open = rooms.filter(r=>['BOOKED','OCCUPIED'].includes(r.status)).map(r=>({id:r.id,amount:(r.paymentStatus==='PAID'?0:(Number(r.price)||0)*calculateStayNights(r))+getOpenServiceLogsForRoom(r.id).reduce((s,x)=>s+(Number(x.total)||0),0)})).filter(r=>r.amount>0);
            const pending = paymentRequests.filter(p=>p.status==='PENDING');
            return {period,count:rows.length,total:sum('total'),room:sum('roomRevenue'),service:sum('serviceRevenue'),unknown,duplicate,invalid,top:[...grouped].sort((a,b)=>b[1]-a[1]).slice(0,5),open,pendingCount:pending.length,pendingTotal:pending.reduce((s,p)=>s+(Number(p.total)||0),0)};
        }
        function askRevenueAi(question) {
            if(ROLE_CONFIG?.role !== 'admin') return;
            const p=document.getElementById('revenue-ai-period').value;
            const labels={all:'toàn bộ dữ liệu',today:'hôm nay',month:'tháng này',previous:'tháng trước'};
            setAiPrompt(question + (question.startsWith('So sánh')?'':' — '+labels[p]));
            document.getElementById('ai-chat-form').requestSubmit();
        }
        function generateRevenueAiAnswer(question) {
            if(ROLE_CONFIG?.role !== 'admin') return '<p>Chỉ Admin được xem báo cáo doanh thu.</p>';
            const q=revenueAiKey(question), money=n=>Number(n).toLocaleString('vi-VN')+' ₫';
            const period=q.includes('hom nay')?'today':q.includes('thang nay')?'month':q.includes('thang truoc')?'previous':'all';
            const s=revenueAiSnapshot(period), labels={all:'Toàn bộ dữ liệu',today:'Hôm nay',month:'Tháng này',previous:'Tháng trước'};
            let body='';
            if(q.includes('so sanh')) {
                const a=revenueAiSnapshot('month'), b=revenueAiSnapshot('previous'); const diff=a.total-b.total;
                body=`<p>Tháng này: <strong>${money(a.total)}</strong> (${a.count} giao dịch); tháng trước: <strong>${money(b.total)}</strong> (${b.count} giao dịch).</p><p>Chênh lệch ${money(diff)}${b.total ? ' ('+(diff/b.total*100).toFixed(1)+'%)' : '. Không tính tỷ lệ vì tháng trước bằng 0'}.</p><p>Tháng này chưa kết thúc; đây không phải so sánh hai tháng đầy đủ.</p>`;
            } else if(/chua thanh toan|cong no/.test(q)) {
                body=`<p>Số tiền chưa thu tạm tính hiện tại: <strong>${money(s.open.reduce((a,r)=>a+r.amount,0))}</strong>.</p><ul>${s.open.map(r=>`<li>${escapeHtml(r.id)}: ${money(r.amount)}</li>`).join('')||'<li>Không có khoản tạm tính chưa thu.</li>'}</ul><p>${s.pendingCount} yêu cầu thanh toán chờ xác nhận, tổng ${money(s.pendingTotal)}. Không cộng lần nữa vào khoản chưa thu; đây có thể là cùng khoản tiền.</p><p>Khoản chưa thu là ảnh chụp hiện tại, không lọc theo kỳ. Chưa xét đặt cọc, giảm giá, hoàn tiền hoặc điều chỉnh chưa có trong dữ liệu.</p>`;
            } else if(/cao nhat|top/.test(q)) {
                body=`<p>Phòng có tổng tiền đã ghi nhận cao nhất — ${labels[period]}:</p><ol>${s.top.map(([id,v])=>`<li>${escapeHtml(id)}: <strong>${money(v)}</strong> (gồm phòng và dịch vụ)</li>`).join('')||'<li>Chưa có giao dịch trong kỳ.</li>'}</ol>`;
            } else {
                body=`<p><strong>${labels[period]}: ${money(s.total)}</strong> đã ghi nhận trong sổ thu, từ ${s.count} giao dịch.</p><ul><li>Tiền phòng: ${money(s.room)}</li><li>Tiền dịch vụ: ${money(s.service)}</li><li>Chênh lệch tổng so với phân loại: ${money(s.total-s.room-s.service)}</li></ul>`;
                if(/de xuat|tang|toi uu/.test(q)) body+=`<p>Việc nên kiểm tra:</p><ul><li>Đối soát ${s.pendingCount} yêu cầu thanh toán chờ xác nhận trước khi ghi nhận đã thu.</li><li>Kiểm tra ${rooms.filter(r=>r.status==='AVAILABLE').length} phòng hiện trống để lập phương án bán phòng; chưa tự thay đổi giá.</li><li>Rà soát dịch vụ phát sinh sau lần thanh toán gần nhất để tránh bỏ sót thu tiền.</li></ul>`;
            }
            if(q.includes('loi nhuan')) body+='<p>Chưa thể tính lợi nhuận: hệ thống chưa có đủ chi phí vận hành, thuế và hoàn tiền. Doanh thu không phải lợi nhuận.</p>';
            body+=`<p class="text-xs text-slate-500">Nguồn: sổ thu cục bộ, không phải đối soát ngân hàng. ${s.unknown} bản ghi thiếu ngày hợp lệ ${period==='all'?'được giữ trong tổng toàn bộ':'bị loại khỏi kỳ'}; bỏ qua ${s.duplicate} bản ghi trùng mã thanh toán và ${s.invalid} bản ghi tổng tiền không hợp lệ. Kỳ tính theo ngày trên thiết bị. AI chỉ hỗ trợ đọc và tính số liệu.</p>`;
            return body;
        }

        function generateLocalAdminAdvice(userMsg) {
            if(isRevenueAiQuestion(userMsg)) return generateRevenueAiAnswer(userMsg);
            const msg = (userMsg || '').toLowerCase();
            const occupied = rooms.filter(r => r.status === 'OCCUPIED').length;
            const available = rooms.filter(r => r.status === 'AVAILABLE').length;
            const pendingBookings = typeof bookingRequests !== 'undefined' ? bookingRequests.filter(r => r.status === 'PENDING').length : 0;
            const pendingServices = typeof serviceRequests !== 'undefined' ? serviceRequests.filter(r => r.status === 'PENDING').length : 0;
            const supportPending = typeof adminSupportRequests !== 'undefined' ? adminSupportRequests.filter(r => !['DONE','CLOSED'].includes(r.status)).length : 0;
            const serviceRevenue = serviceLogs.reduce((sum, x) => sum + Number(x.total || 0), 0);
            if (/khách|câu hỏi|tư vấn|hỗ trợ/.test(msg)) {
                const latest=(adminSupportRequests||[]).filter(r=>!['DONE','CLOSED'].includes(r.status)).slice(0,5);
                return `<p><strong>💬 Hỗ trợ khách hàng cho Admin</strong></p><p>Hiện có <strong>${supportPending}</strong> yêu cầu/câu hỏi cần theo dõi.</p>${latest.length?`<ul>${latest.map(r=>`<li><strong>${escapeHtml(r.customerName||r.actorName||'Khách hàng')}</strong>: ${escapeHtml(String(r.content||r.message||r.question||'').slice(0,120))}${String(r.content||r.message||r.question||'').length>120?'…':''}</li>`).join('')}</ul>`:'<p>Không có câu hỏi mới cần xử lý.</p>'}<p>Vào <strong>Hộp thư tư vấn khách hàng / Trung tâm giám sát</strong> để tiếp nhận và trả lời trực tiếp.</p>`;
            }
            if (msg.includes('dịch vụ') || msg.includes('doanh thu')) {
                const groups = Object.entries(serviceCatalog).map(([type, items]) => `${escapeHtml(type)}: ${items.length} mục`).join('; ');
                return `<p><strong>📊 Phân tích nhanh cho Admin</strong></p><ul><li>Doanh thu dịch vụ đang ghi nhận: <strong>${serviceRevenue.toLocaleString('vi-VN')} ₫</strong>.</li><li>Dịch vụ đang được tiếp nhận/xử lý: <strong>${pendingServices}</strong>.</li><li>Danh mục hiện có: ${groups}.</li></ul><p>AI có thể tiếp tục phân tích dịch vụ được dùng nhiều, phòng phát sinh nhiều chi phí hoặc gợi ý gói dịch vụ bán kèm.</p>`;
            }
            if (/phòng|công suất|check/.test(msg)) {
                return `<p><strong>🏨 Tình trạng phòng</strong></p><ul><li>Đang có khách: <strong>${occupied}</strong></li><li>Đang trống: <strong>${available}</strong></li><li>Đặt phòng chờ xử lý: <strong>${pendingBookings}</strong></li></ul><p>Admin có thể mở chi tiết từng phòng để xem khách, thời gian lưu trú, dịch vụ và tổng chi phí.</p>`;
            }
            return `<p><strong>🤖 AI trợ lý Admin</strong></p><ul><li>Phòng đang có khách: <strong>${occupied}</strong>.</li><li>Phòng trống: <strong>${available}</strong>.</li><li>Đặt phòng chờ xử lý: <strong>${pendingBookings}</strong>.</li><li>Dịch vụ đang xử lý: <strong>${pendingServices}</strong>.</li><li>Câu hỏi/hỗ trợ khách hàng: <strong>${supportPending}</strong>.</li></ul><p>Bạn có thể hỏi AI: <strong>“Khách nào đang cần hỗ trợ?”, “Dịch vụ nào phát sinh nhiều?”, “Phòng nào có tổng chi phí cao?”, “Tóm tắt tình hình hôm nay”</strong>.</p>`;
        }



        function detectCustomerAiIntent(message) {
            const q=normalizeVietnameseKey(message);

            // Ưu tiên hiểu TOÀN BỘ câu hỏi. "check-in" trong câu tư vấn du lịch
            // thường có nghĩa là chụp ảnh/check-in địa điểm, không phải nhận phòng khách sạn.
            const travelSignal = /đi đâu|địa điểm|tham quan|du lịch|lịch trình|tour|ăn chơi|vui chơi|ninh bình|đà nẵng|đà lạt|hà nội|nha trang|phú quốc|sa pa|huế|hạ long|hội an|hà giang|cát bà|mộc châu|quảng bình|quy nhơn|phú yên|vũng tàu|cần thơ/.test(q);
            const planningSignal = /ngân sách|người\/ngày|số ngày|\d+\s*ngày|\d+\s*người|phong cách|tư vấn|gợi ý|lập lịch|kế hoạch/.test(q);
            if (travelSignal && planningSignal) return 'TRAVEL';

            if(/check-out|checkout|trả phòng|rời phòng/.test(q)) return 'CHECKOUT';
            // Chỉ coi là CHECKIN khi khách nói rõ hành động nhận/vào phòng.
            if(/nhận phòng|vào phòng|check-in\s+(phòng|khách sạn)|checkin\s+(phòng|khách sạn)|làm thủ tục\s+(nhận phòng|check-in)/.test(q)) return 'CHECKIN';
            if(/thanh toán|chuyển khoản|tiền mặt|trả tiền|hóa đơn|tổng tiền/.test(q)) return 'PAYMENT';
            if(/ăn gì|đồ ăn|món ăn|bữa sáng|bữa trưa|bữa tối|nước uống|cà phê|nước suối|burger|pizza|phở|cơm/.test(q) && !travelSignal) return 'FOOD';
            if(/phòng trống|còn phòng|giá phòng|loại phòng|chọn phòng|đặt phòng/.test(q) && !travelSignal) return 'ROOM';
            if(/dịch vụ|spa|massage|minibar|giặt|dọn phòng|khăn|đưa đón/.test(q) && !travelSignal) return 'SERVICE';
            if(/thông tin cá nhân|hồ sơ|số điện thoại|cccd|passport|địa chỉ|ngày sinh/.test(q)) return 'PROFILE';
            if(/đánh giá|góp ý|phản hồi|review/.test(q)) return 'REVIEW';
            if(/admin|quản lý|nhân viên hỗ trợ|khiếu nại|đổi ngày|hủy phòng|đặc biệt|khẩn/.test(q)) return 'SUPPORT';
            if(travelSignal) return 'TRAVEL';
            if(/ngân sách|bao nhiêu tiền|chi phí|tiết kiệm|kinh tế/.test(q)) return 'BUDGET';
            if(/đơn của tôi|phòng của tôi|trạng thái|đã duyệt|yêu cầu của tôi|đang ở/.test(q)) return 'STATUS';
            return 'GENERAL';
        }

        function buildDirectIntentLead(intent, profile) {
            if(intent==='PAYMENT') return `<p><strong>Trả lời nhanh:</strong> Bạn có thể thanh toán bằng <strong>chuyển khoản</strong> hoặc <strong>tiền mặt tại lễ tân</strong>. Vào mục <strong>Thanh toán</strong> để chọn phương thức và gửi xác nhận cho Admin.</p>`;
            if(intent==='ROOM') return `<p><strong>Trả lời nhanh:</strong> Tôi sẽ ưu tiên kiểm tra phòng trống, sức chứa, giá/đêm và tổng chi phí phù hợp câu hỏi của bạn.</p>`;
            if(intent==='SERVICE') return `<p><strong>Trả lời nhanh:</strong> Tôi sẽ chỉ gợi ý các dịch vụ Grand Hotel phù hợp nhu cầu và ngân sách của bạn; dịch vụ sẽ được nhân viên tiếp nhận và cập nhật theo quá trình phục vụ.</p>`;
            if(intent==='TRAVEL') return `<p><strong>Trả lời nhanh:</strong> Tôi sẽ tập trung vào địa điểm, lịch trình, cách di chuyển và mức chi dự kiến tại ${escapeHtml(profile.destination||'điểm đến bạn chọn')}.</p>`;
            if(intent==='BUDGET') return `<p><strong>Trả lời nhanh:</strong> Tôi sẽ ưu tiên phương án không vượt ngân sách và chia rõ tiền phòng, dịch vụ, ăn uống/di chuyển tham khảo.</p>`;
            if(intent==='STATUS') return `<p><strong>Trả lời nhanh:</strong> Tôi chỉ kiểm tra các yêu cầu/phòng thuộc chính tài khoản của bạn và giải thích trạng thái hiện tại.</p>`;
            return `<p><strong>Trả lời nhanh:</strong> Tôi sẽ trả lời trực tiếp đúng nội dung bạn vừa hỏi, sau đó mới bổ sung lựa chọn hữu ích nếu cần.</p>`;
        }

        function getMyActiveHotelRooms() {
            const email=(CURRENT_USER?.email||'').toLowerCase();
            return rooms.filter(r => (r.guestEmail||'').toLowerCase()===email && ['BOOKED','OCCUPIED'].includes(r.status));
        }

        function getFoodAndDrinkSuggestions(maxPrice=250000) {
            const keys=['Ăn uống','Đồ uống','Nước uống & Cà phê','Minibar'];
            const all=[];
            Object.entries(serviceCatalog).forEach(([type,items])=>{
                if(keys.some(k=>normalizeVietnameseKey(type).includes(normalizeVietnameseKey(k))) || /ăn|uống|minibar|cà phê/.test(normalizeVietnameseKey(type))) {
                    (items||[]).forEach(x=>{ if(Number(x.price||0)<=maxPrice) all.push({...x,type}); });
                }
            });
            return all.sort((a,b)=>Number(a.price||0)-Number(b.price||0)).slice(0,10);
        }

        function getCustomerCurrentCostSummary() {
            const myRooms=getMyActiveHotelRooms();
            return myRooms.map(r=>({room:r, cost:calculateCustomerRoomTotal(r)}));
        }

        function generateSmartCustomerAnswer(profile, userMsg) {
            const intent = detectCustomerAiIntent(userMsg);
            const directLead = buildDirectIntentLead(intent, profile);
            const msg = (userMsg || '').trim();
            const low = msg.toLowerCase();
            const email = (CURRENT_USER?.email || '').toLowerCase();
            const hasTravelIntent = /(du lịch|đi đâu|tham quan|lịch trình|check-in địa điểm|check in địa điểm|ninh bình|đà nẵng|hà nội|đà lạt|nha trang|sa pa|phú quốc|huế|hạ long|hội an|hà giang|cát bà|mộc châu|quảng bình|quy nhơn|phú yên|vũng tàu|cần thơ|sài gòn|hồ chí minh)/i.test(msg);
            // Nếu đang có một chuyến đi dang dở, các câu bổ sung ngắn như “tôi đi 3 người”,
            // “2 ngày”, “từ Thái Nguyên”, “đi xe máy” phải được hiểu là tiếp tục chuyến đó.
            const isTripFollowUp = !!(AI_TRIP_CONTEXT?.totalBudget && /(\d+\s*(người|khách|ngày|đêm)|từ\s+|xuất phát|xe\s*máy|xe\s*khách|ô\s*tô|oto|tàu|ngân sách|triệu|\btr\b)/i.test(msg));

            if (intent === 'FOOD') {
                const priceMatches=[...msg.matchAll(/(\d+[\.,]?\d*)\s*(k|nghìn|000|đ|vnd)?/gi)].map(m=>Number(String(m[1]).replace(/[.,]/g,''))*(m[2]&&/k|nghìn/i.test(m[2])?1000:1)).filter(n=>n>=10000);
                const maxPrice=priceMatches.length ? Math.max(...priceMatches) : 250000;
                const food=getFoodAndDrinkSuggestions(maxPrice);
                let html=`<div class="rounded-xl bg-orange-50 border border-orange-100 p-3"><p><strong>🍽️ Gợi ý nhanh:</strong> Tôi đã lọc món ăn/đồ uống có giá không quá <strong>${maxPrice.toLocaleString('vi-VN')} ₫</strong>.</p></div>`;
                if(food.length) html+=`<ul>${food.map(x=>`<li><strong>${escapeHtml(x.name)}</strong> • ${escapeHtml(x.type)} • <strong>${Number(x.price||0).toLocaleString('vi-VN')} ₫</strong></li>`).join('')}</ul><p>Nếu bạn đang <strong>Đang ở</strong>, mở <strong>Yêu cầu dịch vụ</strong> để gọi món. Hệ thống sẽ báo “đã tiếp nhận, nhân viên sẽ mang lên cho bạn”.</p>`;
                else html+=`<p>Hiện danh mục demo chưa có món phù hợp mức giá này. Bạn có thể tăng ngân sách hoặc hỏi tôi một loại món cụ thể.</p>`;
                return html;
            }

            if (intent === 'CHECKIN' || intent === 'CHECKOUT') {
                const mine=getMyActiveHotelRooms();
                if(!mine.length) return `<p><strong>Trả lời nhanh:</strong> Hiện tài khoản của bạn chưa có phòng đã được xác nhận để thực hiện ${intent==='CHECKIN'?'Check-in':'Check-out'}.</p><p>Bạn có thể vào <strong>Phòng của tôi</strong> để xem trạng thái đơn.</p>`;
                let html=`<div class="rounded-xl bg-blue-50 border border-blue-100 p-3"><p><strong>🔑 Tình trạng lưu trú:</strong></p></div><ul>`;
                mine.forEach(r=>{ html+=`<li><strong>${escapeHtml(r.id)}</strong>: ${r.status==='OCCUPIED'?'Đang ở':'Đã đặt • Chưa Check-in'}${r.paymentStatus==='PAID'?' • Đã thanh toán':''}</li>`; });
                html+='</ul>';
                if(intent==='CHECKIN') html+=`<p><strong>Cách Check-in:</strong> vào <strong>Phòng của tôi</strong> → chọn phòng đã được xác nhận → bấm <strong>Check-in • Xác nhận đang ở</strong>. Sau đó bạn mới có thể gọi dịch vụ cho phòng.</p>`;
                else html+=`<p><strong>Cách Check-out:</strong> hoàn tất thanh toán trước, chờ Admin xác nhận, bảo đảm không còn dịch vụ đang xử lý, sau đó vào <strong>Phòng của tôi</strong> và bấm Check-out.</p>`;
                return html;
            }

            if (intent === 'PROFILE') {
                return `<p><strong>Trả lời nhanh:</strong> Bạn có thể xem và chỉnh sửa hồ sơ tại <strong>Thông tin cá nhân</strong>.</p><ul><li>Có thể cập nhật họ tên, số điện thoại, ngày sinh, CCCD/Passport, giới tính, địa chỉ và yêu cầu lưu trú.</li><li>Email đăng nhập được giữ ở chế độ chỉ đọc để tránh mất quyền truy cập.</li></ul>`;
            }

            if (intent === 'REVIEW') {
                return `<p><strong>Trả lời nhanh:</strong> Vào mục <strong>Đánh giá</strong> để gửi số sao và góp ý về phòng, dịch vụ, thanh toán, AI hoặc nhân viên.</p><p>AI có thể giúp bạn viết góp ý lịch sự và rõ ràng. Ví dụ hãy nói: <em>“Giúp tôi viết đánh giá 4 sao vì phòng sạch nhưng phục vụ đồ ăn hơi chậm.”</em></p>`;
            }

            if (intent === 'SUPPORT') {
                return `<div class="rounded-xl bg-indigo-50 border border-indigo-100 p-3"><p><strong>👨‍💼 Cần người quản lý xử lý?</strong> Bạn có thể gửi trực tiếp cho Admin ngay trong khu AI.</p></div><p>Hãy ghi rõ <strong>phòng, vấn đề, thời gian và điều bạn muốn khách sạn xử lý</strong>. Ví dụ: “Phòng P102, tôi muốn đổi ngày trả từ 10/9 sang 11/9”. Admin sẽ tiếp nhận và trả lời trong hệ thống.</p>`;
            }

            if (!hasTravelIntent && /(phòng trống|còn phòng|giá phòng|loại phòng|phòng nào)/i.test(msg)) {
                const available = rooms.filter(r => r.status === 'AVAILABLE').sort((a,b) => a.price - b.price);
                let html = `<div class="rounded-xl bg-emerald-50 border border-emerald-100 p-3"><p><strong>⚡ Trả lời nhanh:</strong> Hiện có <strong>${available.length}</strong> phòng đang trống để bạn gửi yêu cầu đặt.</p></div>`;
                if (available.length) {
                    html += `<p><strong>🏨 Danh sách phù hợp:</strong></p><ul>` + available.slice(0,6).map(r => `<li><strong>${escapeHtml(r.id)} - ${escapeHtml(r.type)}</strong>: ${Number(r.price).toLocaleString('vi-VN')} ₫/đêm • tối đa ${r.capacity} khách.</li>`).join('') + `</ul>`;
                    html += `<p><strong>Gợi ý:</strong> hãy cho tôi biết số người, số đêm và ngân sách; tôi sẽ chọn 1–3 phòng tối ưu nhất và tính tổng dự kiến.</p>`;
                }
                html += `<p><strong>Bước tiếp theo:</strong> mở mục <strong>Đặt phòng</strong> để gửi yêu cầu. Phòng chỉ được xác nhận sau khi Admin/Lễ tân duyệt.</p>`;
                return html;
            }

            if (!hasTravelIntent && /(dịch vụ|spa|massage|minibar|giặt|ăn uống|đồ uống|dọn phòng|khăn|xe đưa đón)/i.test(msg)) {
                const budget = profile.budget || 1000000;
                const recommended = getRecommendedHotelServices(budget);
                let html = `<div class="rounded-xl bg-purple-50 border border-purple-100 p-3"><p><strong>⚡ Trả lời nhanh:</strong> Tôi có thể chọn dịch vụ theo ngân sách để tránh phát sinh quá nhiều chi phí.</p></div>`;
                html += `<p><strong>🛎️ Dịch vụ được đề xuất ở mức ngân sách hiện tại:</strong></p><ul>` + recommended.map(x => `<li><strong>${escapeHtml(x.name)}</strong> (${escapeHtml(x.type)}): ${Number(x.price) ? Number(x.price).toLocaleString('vi-VN') + ' ₫' : 'theo yêu cầu/không tính phí'}.</li>`).join('') + `</ul>`;
                html += `<p><strong>Toàn bộ nhóm dịch vụ:</strong> ${Object.keys(serviceCatalog).map(escapeHtml).join(', ')}.</p><p>Sau khi phòng của bạn được duyệt, gửi yêu cầu ở mục <strong>Yêu cầu dịch vụ</strong>; nhân viên sẽ tiếp nhận và phục vụ; chi phí được ghi nhận vào phòng khi dịch vụ được xử lý.</p>`;
                return html;
            }

            if (/(đơn của tôi|phòng của tôi|trạng thái đặt|đã duyệt chưa|yêu cầu của tôi)/i.test(msg)) {
                const b = bookingRequests.filter(r => (r.customerEmail || '').toLowerCase() === email).slice(0,5);
                const sv = serviceRequests.filter(r => (r.customerEmail || '').toLowerCase() === email).slice(0,5);
                const label = st => st === 'APPROVED' ? 'Đã duyệt' : st === 'REJECTED' ? 'Từ chối' : 'Chờ duyệt';
                let html = `<div class="rounded-xl bg-blue-50 border border-blue-100 p-3"><p><strong>⚡ Trạng thái của bạn:</strong></p></div>`;
                html += b.length ? `<p><strong>Đặt phòng:</strong></p><ul>${b.map(x => `<li>${escapeHtml(x.roomId)} • ${escapeHtml(x.checkin)} → ${escapeHtml(x.checkout)} • <strong>${label(x.status)}</strong>${x.decisionNote ? ' • ' + escapeHtml(x.decisionNote) : ''}</li>`).join('')}</ul>` : `<p>Bạn chưa có yêu cầu đặt phòng nào.</p>`;
                html += sv.length ? `<p><strong>Dịch vụ:</strong></p><ul>${sv.map(x => `<li>${escapeHtml(x.name)} • phòng ${escapeHtml(x.roomId)} • <strong>${label(x.status)}</strong>${x.decisionNote ? ' • ' + escapeHtml(x.decisionNote) : ''}</li>`).join('')}</ul>` : '';
                html += `<p>Nếu cần đổi ngày, hủy hoặc trường hợp đặc biệt, hãy dùng ô <strong>Gửi Admin</strong> bên dưới để quản trị viên xử lý trực tiếp.</p>`;
                return html;
            }

            if (intent === 'PAYMENT') {
                const myRooms = rooms.filter(r => (r.guestEmail || '').toLowerCase() === email && ['BOOKED','OCCUPIED'].includes(r.status));
                let html = directLead;
                if (myRooms.length) {
                    html += `<p><strong>Phòng có thể thanh toán:</strong></p><ul>` + myRooms.map(r => { const c=calculateCustomerRoomTotal(r); return `<li><strong>${escapeHtml(r.id)}</strong>: tổng dự kiến <strong>${c.total.toLocaleString('vi-VN')} ₫</strong>${r.paymentStatus==='PAID'?' • đã xác nhận thanh toán':''}.</li>`; }).join('') + `</ul>`;
                } else html += `<p>Hiện tài khoản của bạn chưa có phòng đã được duyệt để tạo yêu cầu thanh toán.</p>`;
                html += `<p><strong>Chuyển khoản:</strong> vào mục Thanh toán, chọn Chuyển khoản, kiểm tra thông tin ngân hàng demo và nhập mã giao dịch. <strong>Tiền mặt:</strong> chọn Tiền mặt và thanh toán tại quầy lễ tân.</p><p>Admin sẽ nhận thông báo và xác nhận trạng thái cho bạn.</p>`;
                return html;
            }

            if (intent === 'GENERAL' && /^(xin chào|chào|hello|hi|helo|alo)[!. ]*$/i.test(msg)) {
                return `<div class="rounded-xl bg-amber-50 border border-amber-100 p-3"><p><strong>Xin chào ${escapeHtml(CURRENT_USER?.name || 'bạn')}!</strong> Tôi là AI Concierge của Grand Hotel.</p></div><p>Bạn có thể hỏi trực tiếp về <strong>phòng trống, giá phòng, dịch vụ, thanh toán, trạng thái yêu cầu, địa điểm du lịch, lịch trình hoặc ngân sách</strong>. Tôi sẽ trả lời đúng vào câu hỏi trước, không bắt bạn phải điền toàn bộ biểu mẫu.</p>`;
            }

            if (intent === 'GENERAL' && /(wifi|wi-fi|internet)/i.test(msg)) {
                return `<p><strong>Trả lời nhanh:</strong> Trong dữ liệu demo hiện tại của hệ thống <strong>chưa có thông tin xác nhận chính thức về Wi‑Fi/Internet</strong>, nên tôi không nên tự đoán.</p><p>Bạn có thể bấm <strong>Gửi Admin</strong> để hỏi khách sạn; Admin sẽ thấy câu hỏi và trả lời trực tiếp trong tài khoản của bạn.</p>`;
            }

            if (!hasTravelIntent && /(admin|quản lý|hỗ trợ|đổi ngày|hủy phòng|khiếu nại|đặc biệt|khẩn)/i.test(msg)) {
                return directLead + `<div class="rounded-xl bg-indigo-50 border border-indigo-100 p-3"><p><strong>⚡ Tôi có thể hỗ trợ ngay:</strong> câu hỏi của bạn đã được AI ghi nhận và Admin cũng có thể nhìn thấy trong Trung tâm giám sát.</p></div><p>Nếu bạn cần người quản lý thực hiện thay đổi thật trên đơn/phòng/dịch vụ, hãy nhập yêu cầu cụ thể vào ô <strong>“Gửi Admin”</strong>. Admin có thể tiếp nhận, phản hồi và đánh dấu hoàn tất.</p><p><strong>Nên ghi rõ:</strong> mã phòng (nếu có), ngày mong muốn, dịch vụ cần đổi/hủy và nội dung cần xử lý.</p>`;
            }

            if (intent === 'TRAVEL' || intent === 'BUDGET' || hasTravelIntent || isTripFollowUp) return generateLocalTravelAdvice(profile, userMsg);

            return directLead + `<p>Tôi đã hiểu câu hỏi của bạn. Với những nội dung thuộc Grand Hotel, tôi sẽ ưu tiên trả lời dựa trên dữ liệu phòng, dịch vụ, đơn đặt và chi phí hiện có. Nếu câu hỏi cần xác nhận thực tế từ nhân viên (ví dụ giờ phục vụ đặc biệt, thay đổi chính sách hoặc yêu cầu ngoại lệ), tôi sẽ nói rõ thay vì tự đoán.</p><p><strong>Bạn có thể hỏi tiếp theo cách tự nhiên</strong>, ví dụ: “Tôi đang ở P102 thì tối nay nên gọi món gì?”, “Tôi muốn trả phòng muộn có được không?”, “Tính giúp tôi tổng tiền hiện tại”, hoặc “Lập lịch đi Đà Nẵng 2 ngày cho 2 người với 3 triệu”.</p>`;
        }

        function generateLocalTravelAdvice(profile, userMsg) {
            profile = extractTripProfileFromMessage(userMsg, profile);
            const raw = (userMsg || '').trim();
            const msg = raw.toLowerCase();
            const fmt = n => Number(n || 0).toLocaleString('vi-VN') + ' ₫';

            // Ưu tiên trả lời ĐÚNG câu vừa hỏi. Không ép mọi câu du lịch vào một mẫu chia ngân sách.
            const asksAttraction = /(tham quan|địa điểm|chỗ nào|đi chơi|check[ -]?in|có gì chơi|nên ghé|ghé đâu)/i.test(msg);
            const asksWhere = /(đi đâu|ở đâu|điểm đến|nơi nào|chỗ nào|gợi ý.*(đi|du lịch)|du lịch.*(đâu|nào))/i.test(msg);
            const asksBudget = /(ngân sách|bao nhiêu tiền|chi phí|tốn bao nhiêu|có\s*\d+.*(?:triệu|tr|k|nghìn|ngàn)|tiết kiệm|chia.*tiền)/i.test(msg);
            const asksSchedule = /(lịch trình|kế hoạch|ngày 1|ngày 2|\d+\s*ngày)/i.test(msg);
            const destination = findTourismDestination(profile.destination || raw);

            // Câu hỏi chỉ muốn tìm chỗ tham quan: trả lời bằng lựa chọn, không tự "chốt" 1 nơi và không lôi ngân sách cũ vào nếu không cần.
            if (asksAttraction && !destination && !asksBudget && !asksSchedule) {
                const origin = (profile.origin || '').toLowerCase();
                let suggestions = [];
                if (origin.includes('thái nguyên')) {
                    suggestions = [
                        ['Hồ Núi Cốc', 'ngắm hồ, đi chơi trong ngày, chụp ảnh và nghỉ ngơi'],
                        ['ATK Định Hóa', 'phù hợp nếu thích lịch sử, không gian xanh và chuyến đi nhẹ nhàng'],
                        ['Hang Phượng Hoàng – Suối Mỏ Gà', 'thiên nhiên, khám phá hang động và cảnh núi'],
                        ['Hà Nội', 'phố cổ, Hồ Hoàn Kiếm, Văn Miếu; nhiều lựa chọn ăn uống và tham quan'],
                        ['Ninh Bình', 'Tràng An, Hang Múa, Hoa Lư; hợp nếu muốn cảnh đẹp và check-in']
                    ];
                } else {
                    suggestions = [
                        ['Hà Nội', 'văn hóa, ẩm thực, đi bộ và nhiều điểm chi phí thấp'],
                        ['Ninh Bình', 'thiên nhiên, Tràng An, Hang Múa, Hoa Lư'],
                        ['Mộc Châu', 'đồi chè, rừng thông, thác và check-in thiên nhiên'],
                        ['Hạ Long/Cát Bà', 'biển, vịnh và trải nghiệm ngoài trời'],
                        ['Đà Nẵng – Hội An', 'biển, ẩm thực, phố cổ và nhiều hoạt động']
                    ];
                }
                return `<div class="rounded-xl bg-emerald-50 border border-emerald-100 p-3"><p><strong>🧭 Có nhé.</strong> Nếu bạn chỉ muốn tìm <strong>một nơi để tham quan</strong>, tôi chưa cần ép bạn vào một lịch trình hay ngân sách cố định.</p></div>
                <p><strong>Một số lựa chọn đáng cân nhắc${profile.origin ? ` khi xuất phát từ ${escapeHtml(profile.origin)}` : ''}:</strong></p>
                <ul>${suggestions.map(([n,d])=>`<li><strong>${escapeHtml(n)}</strong> – ${escapeHtml(d)}.</li>`).join('')}</ul>
                <p><strong>👉 Bạn thích kiểu nào nhất:</strong> thiên nhiên, check-in/chụp ảnh, lịch sử – văn hóa, ăn uống, hay vui chơi? ${profile.origin ? '' : 'Bạn cũng có thể cho tôi biết bạn xuất phát từ đâu.'} Tôi sẽ thu hẹp còn 2–3 nơi phù hợp thay vì tự chọn thay bạn.</p>`;
            }

            // Có địa danh cụ thể và khách hỏi điểm tham quan -> liệt kê đúng địa danh.
            if (destination && asksAttraction && !asksBudget) {
                const attractions = (destination.attractions || []).slice(0, 7);
                return `<div class="rounded-xl bg-emerald-50 border border-emerald-100 p-3"><p><strong>📍 ${escapeHtml(destination.name)}:</strong> nếu mục tiêu của bạn là tham quan, đây là các nơi tôi ưu tiên gợi ý theo sở thích chứ không tự áp một gói chi tiêu.</p></div>
                <ul>${attractions.map(a=>`<li><strong>${escapeHtml(a.name)}</strong> – ${escapeHtml(a.tags)}; mức chi phí trong dữ liệu demo: <strong>${escapeHtml(a.cost)}</strong>.</li>`).join('')}</ul>
                <p>Bạn nói thêm <strong>đi mấy người, mấy ngày và thích kiểu trải nghiệm nào</strong>, tôi sẽ ghép các điểm trên thành lịch trình hợp lý, tránh chạy lòng vòng.</p>`;
            }

            // Tổng ngân sách đã có nhưng chưa có số người: tuyệt đối không đoán.
            if (profile.totalBudget && !profile.travelers) {
                const d = profile.days || 1;
                return `<div class="rounded-xl bg-amber-50 border border-amber-200 p-3"><p><strong>💰 Tôi ghi nhận đúng:</strong> tổng ngân sách <strong>${fmt(profile.totalBudget)}</strong>${d ? `, thời gian <strong>${d} ngày</strong>` : ''}.</p></div>
                <p>Tôi chưa biết <strong>số người</strong>, nên chưa chia tiền/người và chưa đưa con số chi phí cụ thể.</p>
                <p><strong>👉 Bạn đi mấy người?</strong> Sau khi có số người, tôi sẽ dùng đúng ${fmt(profile.totalBudget)} làm <strong>tổng ngân sách</strong>, không tự nhân thêm.</p>`;
            }

            const travelers = profile.travelers || null;
            const days = profile.days || 1;
            const totalBudget = profile.totalBudget || (profile.budget && travelers ? profile.budget * travelers * days : 0);
            const perPersonDay = totalBudget && travelers && days ? Math.floor(totalBudget / travelers / days) : (profile.budget || 0);

            // Khách hỏi nên đi đâu: đưa nhiều phương án, giải thích; không tự chốt Hà Nội.
            if (asksWhere && !destination) {
                const origin = profile.origin ? escapeHtml(profile.origin) : '';
                const context = [totalBudget ? `tổng ngân sách <strong>${fmt(totalBudget)}</strong>` : '', travelers ? `<strong>${travelers} người</strong>` : '', days ? `<strong>${days} ngày</strong>` : '', profile.transport ? `đi <strong>${escapeHtml(profile.transport)}</strong>` : ''].filter(Boolean).join(' • ');
                const choices = (profile.origin || '').toLowerCase().includes('thái nguyên')
                    ? [
                        ['Hồ Núi Cốc / ATK Định Hóa', 'gần, hợp chuyến ngắn và dễ kiểm soát chi phí'],
                        ['Hà Nội', 'nhiều điểm miễn phí/chi phí thấp, đồ ăn đa dạng'],
                        ['Ninh Bình', 'đẹp về thiên nhiên, hợp Tràng An – Hang Múa – Hoa Lư'],
                        ['Mộc Châu', 'hợp đi xe máy nếu thích thiên nhiên và check-in']
                      ]
                    : [
                        ['Hà Nội', 'văn hóa – ẩm thực – tham quan đô thị'],
                        ['Ninh Bình', 'thiên nhiên – di sản – check-in'],
                        ['Mộc Châu', 'núi đồi – khí hậu – chụp ảnh'],
                        ['Đà Nẵng/Hội An', 'biển – phố cổ – ẩm thực; phù hợp hơn khi có ngân sách di chuyển xa']
                      ];
                return `<div class="rounded-xl bg-emerald-50 border border-emerald-100 p-3"><p><strong>🧭 Tư vấn theo đúng câu hỏi “nên đi đâu”:</strong> ${context || 'Tôi sẽ đưa vài hướng để bạn chọn trước.'}</p></div>
                ${origin ? `<p>Bạn xuất phát từ <strong>${origin}</strong>, vì vậy khoảng cách và phương tiện sẽ ảnh hưởng khá nhiều đến lựa chọn.</p>` : ''}
                <p><strong>Các phương án:</strong></p><ul>${choices.map(([n,d])=>`<li><strong>${escapeHtml(n)}</strong> – ${escapeHtml(d)}.</li>`).join('')}</ul>
                <p>Tôi chưa tự chốt một nơi. Bạn chỉ cần nói <strong>“tôi thích thiên nhiên”</strong>, <strong>“muốn check-in”</strong>, <strong>“muốn ăn uống”</strong> hoặc chọn tên một nơi; tôi sẽ tư vấn sâu tiếp và giữ nguyên các thông tin ngân sách/số người/ngày mà bạn đã cung cấp.</p>`;
            }

            // Khi có điểm đến: tư vấn điểm + lịch trình, và chỉ chia ngân sách nếu khách thật sự hỏi/đã cung cấp.
            if (destination) {
                const attractions = (destination.attractions || []).slice(0, Math.min(7, Math.max(3, days * 2)));
                let html = `<div class="rounded-xl bg-emerald-50 border border-emerald-100 p-3"><p><strong>📍 ${escapeHtml(destination.name)}</strong> – tôi sẽ tư vấn dựa trên đúng thông tin bạn đã nói.</p></div>`;
                if (totalBudget && travelers) html += `<p><strong>Thông tin đang dùng:</strong> ${fmt(totalBudget)} tổng ngân sách • ${travelers} người • ${days} ngày${profile.origin ? ` • từ ${escapeHtml(profile.origin)}` : ''}${profile.transport ? ` • ${escapeHtml(profile.transport)}` : ''}. Bình quân khoảng <strong>${fmt(perPersonDay)}/người/ngày</strong>.</p>`;
                html += `<p><strong>🌿 Điểm nên cân nhắc:</strong></p><ul>${attractions.map(a=>`<li><strong>${escapeHtml(a.name)}</strong> – ${escapeHtml(a.tags)} (${escapeHtml(a.cost)}).</li>`).join('')}</ul>`;
                if (asksSchedule || days > 1) {
                    const perDay = Math.max(1, Math.ceil(attractions.length / days));
                    html += `<p><strong>🗓️ Gợi ý lịch ${days} ngày:</strong></p><ul>${Array.from({length:days},(_,i)=>{const arr=attractions.slice(i*perDay,(i+1)*perDay); return `<li><strong>Ngày ${i+1}:</strong> ${arr.length?arr.map(a=>escapeHtml(a.name)).join(' → '):'tham quan nhẹ, ăn uống và nghỉ ngơi'}</li>`}).join('')}</ul>`;
                }
                if (totalBudget && travelers && asksBudget) {
                    const move = Math.round(totalBudget * (profile.transport === 'xe máy' ? .18 : .22));
                    const food = Math.round(totalBudget * .28);
                    const stay = days > 1 ? Math.round(totalBudget * .28) : 0;
                    const visit = Math.max(0, totalBudget - move - food - stay);
                    html += `<p><strong>💰 Khung chi tham khảo (không phải giá cố định):</strong></p><ul><li>Di chuyển: khoảng ${fmt(move)}</li><li>Ăn uống: khoảng ${fmt(food)}</li>${stay?`<li>Lưu trú: khoảng ${fmt(stay)}</li>`:''}<li>Tham quan + dự phòng: khoảng ${fmt(visit)}</li></ul>`;
                }
                html += `<p class="text-xs text-slate-500">Chi phí ngoài khách sạn và thông tin du lịch trong bản HTML là dữ liệu tư vấn demo, có thể thay đổi theo thời điểm. Với giá/vé/giờ mở cửa hiện tại, hệ thống cần kết nối AI/web hoặc backend dữ liệu trực tuyến để kiểm tra.</p>`;
                return html;
            }

            // Câu du lịch quá chung: trả lời hữu ích và hỏi đúng 1–2 thông tin còn thiếu.
            return `<div class="rounded-xl bg-blue-50 border border-blue-100 p-3"><p><strong>🧠 Tôi hiểu bạn đang cần tư vấn du lịch.</strong> Tôi sẽ không tự gán địa điểm, số người hay ngân sách nếu bạn chưa nói.</p></div>
            <p>Tôi có thể giúp theo nhiều kiểu: <strong>chọn điểm đến, tìm chỗ tham quan, lên lịch trình, chia ngân sách, gợi ý ăn uống, chọn phương tiện, tư vấn phòng và dịch vụ khách sạn</strong>.</p>
            <p><strong>Để bắt đầu:</strong> bạn có thể nói tự nhiên như “Tôi ở Thái Nguyên, muốn đi chơi 1 ngày, thích thiên nhiên” hoặc “3 người có 5 triệu đi 2 ngày thì nên đi đâu?”. Tôi sẽ bám đúng dữ liệu trong câu hỏi và hỏi lại phần thật sự còn thiếu.</p>`;
        }


        // Only public room fields are sent to the external AI provider.
        function getSafeAiRoomContext() {
            return rooms.map(room => ({
                id: room.id, type: room.type, price: room.price,
                capacity: room.capacity, status: room.status
            }));
        }

        function buildAiSystemPrompt(profile) {
            const role = ROLE_CONFIG?.role || 'guest';
            const roomContext = getSafeAiRoomContext();
            const common = `Dữ liệu phòng Grand Hotel: ${JSON.stringify(roomContext)}. Bảng giá dịch vụ khách sạn: ${JSON.stringify(serviceCatalog)}. Dữ liệu gợi ý du lịch mẫu: ${JSON.stringify(TOURISM_CATALOG)}.`;
            if (role === 'customer') {
                return `Bạn là AI Smart Concierge • Grand Hotel của Grand Hotel. Người dùng hiện tại là KHÁCH HÀNG: ${CURRENT_USER?.name || ''}.
                Nhiệm vụ của bạn:
                0) Đọc toàn bộ câu hỏi trước khi xác định ý định. Trả lời đúng những nội dung khách đang hỏi; không tự chuyển sang tình trạng lưu trú chỉ vì câu có từ “check-in”. Trong ngữ cảnh du lịch/tham quan, “check-in” mặc định là check-in/chụp ảnh tại địa điểm, trừ khi khách nói rõ nhận phòng/check-in khách sạn.
                1) Tư vấn loại phòng và dịch vụ khách sạn theo ngân sách, số người và số ngày; ưu tiên không vượt ngân sách.
                2) Tư vấn địa điểm du lịch, ăn uống, lịch trình và cách di chuyển phù hợp phong cách chi tiêu của khách.
                3) Trả lời nhanh ngay trong một lượt: nêu phương án hữu ích trước, dùng giả định hợp lý khi thiếu dữ liệu và ghi rõ giả định; chỉ hỏi tối đa 1 câu ngắn ở cuối nếu thông tin đó thực sự cần để cá nhân hóa hơn.
                4) Giá phòng và dịch vụ trong dữ liệu Grand Hotel là giá hệ thống; giá vé/ăn uống/di chuyển bên ngoài chỉ được nói là ước tính nếu không có dữ liệu chắc chắn.
                5) Khi đề xuất dịch vụ khách sạn, ưu tiên lựa chọn có giá phù hợp và tính tổng dự kiến. Nhắc khách gửi yêu cầu ở mục “Yêu cầu dịch vụ”; hệ thống sẽ tiếp nhận ngay và nhân viên sẽ phục vụ.
                6) Tuyệt đối không tiết lộ tên, email, số điện thoại, phòng đang ở, hóa đơn, doanh thu hay dữ liệu của khách khác; không tiết lộ tài khoản/mật khẩu nhân viên.
                7) Trình bày rõ ràng và đầy đủ theo thứ tự: “Trả lời nhanh”, “Chi tiết đề xuất”, “Chi phí dự kiến”, “Lịch trình/ bước tiếp theo”, “Lưu ý”; dùng HTML với <p>, <ul>, <li>, <strong>; không dùng Markdown.
                Hồ sơ chuyến đi đang nhập: ${JSON.stringify(profile)}. ${common}`;
            }
            return `Bạn là Trợ lý AI quản lý và concierge của Grand Hotel. Vai trò hiện tại: ${ROLE_CONFIG?.label || role}.
            Bạn có thể hỗ trợ phân tích phòng, dịch vụ, doanh thu và xây dựng gói trải nghiệm/địa điểm du lịch phù hợp ngân sách để nhân viên tư vấn khách. Trình bày bằng HTML với <p>, <ul>, <li>, <strong>; không dùng Markdown. ${common}`;
        }

        async function handleAiChatSubmit(e) {
            e.preventDefault();
            const inputEl = document.getElementById('ai-input');
            const userMsg = inputEl.value.trim();
            if (!userMsg) return;
            const chatHistory = document.getElementById('ai-chat-history');

            chatHistory.innerHTML += `
                <div class="flex items-start justify-end gap-3 max-w-2xl ml-auto">
                    <div class="bg-slate-900 text-white p-4 rounded-2xl rounded-tr-none shadow-sm text-sm leading-relaxed">${escapeHtml(userMsg)}</div>
                    <div class="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-white font-bold shrink-0 text-sm"><i class="fa-solid fa-user"></i></div>
                </div>`;
            AI_CONVERSATION.push({ role:'user', text:userMsg, at:new Date().toISOString() });
            saveAiConversation();
            inputEl.value = '';
            chatHistory.scrollTop = chatHistory.scrollHeight;

            const loadingId = 'ai-loading-' + Date.now();
            chatHistory.innerHTML += `
                <div id="${loadingId}" class="flex items-start gap-3 max-w-2xl">
                    <div class="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-bold shrink-0 text-sm"><i class="fa-solid fa-robot animate-spin"></i></div>
                    <div class="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-200/80 shadow-sm text-sm text-slate-500">AI Concierge đang đọc câu hỏi và chuẩn bị câu trả lời phù hợp nhất...</div>
                </div>`;
            chatHistory.scrollTop = chatHistory.scrollHeight;

            let profile = AI_TRIP_CONTEXT ? { ...AI_TRIP_CONTEXT } : getAiTripProfile();
            profile = extractTripProfileFromMessage(userMsg, profile);
            AI_TRIP_CONTEXT = { ...profile };
            let aiReply = '';
            let trackedAdminRequest = null;
            if (ROLE_CONFIG?.role === 'customer') {
                logSystemActivity('AI', 'Khách hỏi AI Concierge', userMsg, { result: 'AI trả lời trực tiếp' });
            } else if (ROLE_CONFIG?.role === 'admin') {
                logSystemActivity('AI', 'Admin hỏi trợ lý AI', userMsg);
            } else if (ROLE_CONFIG?.role === 'reception') {
                logSystemActivity('AI', 'Lễ tân hỏi trợ lý AI', userMsg);
            }

            // AI Pro hỗ trợ backend riêng; tuyệt đối không nhúng API key vào HTML.
            const aiConfig = getAiConfig();
            if (isRevenueAiQuestion(userMsg) && ROLE_CONFIG?.role !== 'customer' && (!aiConfig.enabled || !aiConfig.endpoint)) {
                aiReply = generateRevenueAiAnswer(userMsg);
            } else if (!aiConfig.enabled || !aiConfig.endpoint) {
                aiReply = ROLE_CONFIG?.role === 'customer' ? generateSmartCustomerAnswer(profile, userMsg) : generateLocalAdminAdvice(userMsg);
            } else {
                try {
                    const response = await fetch(aiConfig.endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            message: userMsg,
                            model: aiConfig.model || 'grand-hotel-ai',
                            system: buildAiSystemPrompt(profile),
                            history: AI_CONVERSATION.slice(-12),
                            context: { role: ROLE_CONFIG?.role, trip: profile }
                        })
                    });
                    if (!response.ok) { let detail = ''; try { detail = (await response.json()).error || ''; } catch (_) {} throw new Error(detail || ('AI API HTTP ' + response.status)); }
                    const result = await response.json();
                    aiReply = result.answer ? '<p>' + escapeHtml(result.answer).replace(/\n/g,'<br>') + '</p>' : (result.reply || result.content || result.message || '');
                    if (!aiReply) throw new Error('AI không trả về nội dung');
                } catch (err) {
                    console.error('Gemini Error:', err);
                    const fallback = ROLE_CONFIG?.role === 'customer' ? generateSmartCustomerAnswer(profile, userMsg) : generateLocalAdminAdvice(userMsg);
                    aiReply = fallback + `<p class="text-xs text-amber-700 mt-2"><strong>Đang dùng tư vấn dự phòng.</strong> ${escapeHtml(String(err.message || 'Không thể kết nối AI').slice(0,280))}. Kiểm tra cấu hình Gemini hoặc thử lại sau.</p>`;
                }
            }

            if (trackedAdminRequest) {
                trackedAdminRequest.aiReplyPreview = String(aiReply).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400);
                persistHotelData();
                updateStaffNotifications();
            }

            const customerActions = ROLE_CONFIG?.role === 'customer' ? `
                <div class="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                    <button type="button" onclick="switchTab('customer-booking')" class="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"><i class="fa-solid fa-bed mr-1"></i>Xem phòng trống</button>
                    <button type="button" onclick="switchTab('customer-services')" class="px-3 py-2 rounded-lg bg-amber-100 text-amber-800 text-xs font-bold hover:bg-amber-200"><i class="fa-solid fa-bell-concierge mr-1"></i>Yêu cầu dịch vụ</button>
                    <button type="button" onclick="switchTab('customer-payment')" class="px-3 py-2 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold hover:bg-emerald-200"><i class="fa-solid fa-credit-card mr-1"></i>Thanh toán</button>
                    <button type="button" onclick="document.getElementById('admin-support-input')?.focus()" class="px-3 py-2 rounded-lg bg-indigo-100 text-indigo-800 text-xs font-bold hover:bg-indigo-200"><i class="fa-solid fa-headset mr-1"></i>Nhờ Admin xử lý</button>
                </div>` : '';
            document.getElementById(loadingId)?.remove();
            aiReply = safeAiHtml(aiReply);
            AI_CONVERSATION.push({ role:'assistant', html:aiReply, at:new Date().toISOString() });
            saveAiConversation();
            chatHistory.innerHTML += `
                <div class="flex items-start gap-3 max-w-3xl">
                    <div class="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-bold shrink-0 text-sm"><i class="fa-solid fa-robot"></i></div>
                    <div class="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-200/80 shadow-sm text-sm text-slate-700 leading-relaxed space-y-2">${aiReply}${customerActions}<div class="ai-answer-actions"><button onclick="copyAiAnswer(this)"><i class="fa-regular fa-copy mr-1"></i>Sao chép</button><button onclick="rateAiAnswer(this,1)"><i class="fa-regular fa-thumbs-up mr-1"></i>Hữu ích</button><button onclick="rateAiAnswer(this,-1)"><i class="fa-regular fa-thumbs-down mr-1"></i>Chưa đúng</button></div></div>
                </div>`;
            chatHistory.scrollTop = chatHistory.scrollHeight;
        }

        // --- STREAMING_CHUNK:Rendering Revenue Chart with Chart.js... ---
        // --- 9. CHART INITIALIZATION ---
        function initChart() {
            const ctx = document.getElementById('revenueChart').getContext('2d');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
                    datasets: [
                        {
                            label: 'Doanh thu (Triệu VNĐ)',
                            data: [12.5, 14.0, 11.8, 16.2, 18.4, 24.0, 22.5],
                            borderColor: '#f59e0b',
                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                            fill: true,
                            tension: 0.4,
                            borderWidth: 3
                        },
                        {
                            label: 'Công suất phòng (%)',
                            data: [50, 60, 55, 70, 75, 95, 90],
                            borderColor: '#0f172a',
                            borderDash: [5, 5],
                            borderWidth: 2,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top' }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'Doanh thu (Tr ₫)' }
                        },
                        y1: {
                            position: 'right',
                            min: 0,
                            max: 100,
                            title: { display: true, text: 'Công suất (%)' },
                            grid: { drawOnChartArea: false }
                        }
                    }
                }
            });
        }
    