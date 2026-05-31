// Smart CSC Suite - Core Controller

document.addEventListener('DOMContentLoaded', () => {
    // 0. Firebase Cloud Connection Setup & Fallback Simulation Layer
    const firebaseConfig = {
        apiKey: "AIzaSyB5GvUO0mK5WIowM9aoFrMYo73C92l_XHo",
        authDomain: "csctool-5bc47.firebaseapp.com",
        projectId: "csctool-5bc47",
        storageBucket: "csctool-5bc47.firebasestorage.app",
        messagingSenderId: "980975302751",
        appId: "1:980975302751:web:e0582a3748224d638843ea"
    };

    // EmailJS Cloud Integration Config (To send real verification emails & OTPs)
    const emailjsConfig = {
        publicKey: "V8hAD_Kl8Bgs4vqBw",
        serviceId: "V8hAD_Kl8Bgs4vqBw",
        templateId: "template_uui7uqq"
    };

    try {
        if (typeof emailjs !== 'undefined' && emailjsConfig.publicKey !== "YOUR_EMAILJS_PUBLIC_KEY") {
            emailjs.init({
                publicKey: emailjsConfig.publicKey,
            });
            console.log("EmailJS Mail Service Initialized.");
        }
    } catch (e) {
        console.error("EmailJS initialization failed:", e);
    }

    let db = null;
    let isFirebaseReady = false;

    try {
        if (typeof firebase !== 'undefined' && firebaseConfig.apiKey !== "demo-api-key-replace-me") {
            firebase.initializeApp(firebaseConfig);
            db = firebase.firestore();
            isFirebaseReady = true;
            console.log("Firebase Central Cloud Database Initialized.");
        } else {
            console.warn("Firebase in Demo/Fallback Mode.");
        }
    } catch (e) {
        console.error("Firebase init failed, running in fallback mode:", e);
    }

    // Cloud Register Tenant Helper
    window.cloudRegisterTenant = function(tenant) {
        let simTenants = [];
        try {
            simTenants = JSON.parse(localStorage.getItem('csc_cloud_sim_tenants') || '[]');
        } catch (e) {}
        simTenants = simTenants.filter(t => t.email !== tenant.email);
        simTenants.push(tenant);
        localStorage.setItem('csc_cloud_sim_tenants', JSON.stringify(simTenants));

        if (isFirebaseReady && db) {
            db.collection("csc_tenants").doc(tenant.email).set(tenant)
                .then(() => console.log("Cloud Tenant synced to Firebase:", tenant.email))
                .catch(err => console.error("Error syncing to Firebase:", err));
        }
    };

    // Cloud Check Tenant Status Helper
    window.cloudCheckTenant = function(email, role, callback) {
        const defaultResponse = { exists: false, isBlocked: false, data: null };

        let simTenants = [];
        try {
            simTenants = JSON.parse(localStorage.getItem('csc_cloud_sim_tenants') || '[]');
        } catch (e) {}
        
        if (simTenants.length === 0) {
            simTenants = [
                { id: "user_owner", name: "Owner / Admin", role: "Owner", pin: "1111", mobile: "-", email: "owner@gmail.com", status: "active", shopName: "APNA DIGITAL CSC CENTER" },
                { id: "user_staff", name: "Staff User", role: "Staff", pin: "2222", mobile: "-", email: "staff@gmail.com", status: "active", shopName: "APNA DIGITAL CSC CENTER" }
            ];
            localStorage.setItem('csc_cloud_sim_tenants', JSON.stringify(simTenants));
        }

        const matchedSim = simTenants.find(t => t.email === email && t.role === role);
        if (matchedSim) {
            callback({
                exists: true,
                isBlocked: matchedSim.status === 'blocked',
                data: matchedSim
            });
        }

        if (isFirebaseReady && db) {
            db.collection("csc_tenants").doc(email).get()
                .then(doc => {
                    if (doc.exists) {
                        const tenantData = doc.data();
                        if (tenantData.role === role) {
                            callback({
                                exists: true,
                                isBlocked: tenantData.status === 'blocked',
                                data: tenantData
                            });
                        } else {
                            if (!matchedSim) callback(defaultResponse);
                        }
                    } else {
                        if (!matchedSim) callback(defaultResponse);
                    }
                })
                .catch(err => {
                    console.error("Firebase get tenant failed:", err);
                    if (!matchedSim) callback(defaultResponse);
                });
        } else {
            if (!matchedSim) callback(defaultResponse);
        }
    };

    // Cloud Load All Tenants Helper
    window.cloudLoadAllTenants = function(callback) {
        let simTenants = [];
        try {
            simTenants = JSON.parse(localStorage.getItem('csc_cloud_sim_tenants') || '[]');
        } catch (e) {}

        if (simTenants.length === 0) {
            simTenants = [
                { id: "user_owner", name: "Owner / Admin", role: "Owner", pin: "1111", mobile: "-", email: "owner@gmail.com", status: "active", shopName: "APNA DIGITAL CSC CENTER", registeredAt: new Date().toISOString() },
                { id: "user_staff", name: "Staff User", role: "Staff", pin: "2222", mobile: "-", email: "staff@gmail.com", status: "active", shopName: "APNA DIGITAL CSC CENTER", registeredAt: new Date().toISOString() }
            ];
            localStorage.setItem('csc_cloud_sim_tenants', JSON.stringify(simTenants));
        }

        if (isFirebaseReady && db) {
            db.collection("csc_tenants").get()
                .then(snapshot => {
                    const tenants = [];
                    snapshot.forEach(doc => {
                        tenants.push(doc.data());
                    });
                    const merged = [...simTenants];
                    tenants.forEach(t => {
                        if (!merged.some(m => m.email === t.email)) {
                            merged.push(t);
                        }
                    });
                    callback(merged);
                })
                .catch(err => {
                    console.error("Firebase fetch tenants failed, falling back to local simulation:", err);
                    callback(simTenants);
                });
        } else {
            callback(simTenants);
        }
    };

    // Cloud Update Tenant Status Helper
    window.cloudUpdateTenantStatus = function(email, newStatus, callback) {
        let simTenants = [];
        try {
            simTenants = JSON.parse(localStorage.getItem('csc_cloud_sim_tenants') || '[]');
        } catch (e) {}

        const index = simTenants.findIndex(t => t.email === email);
        if (index !== -1) {
            simTenants[index].status = newStatus;
            localStorage.setItem('csc_cloud_sim_tenants', JSON.stringify(simTenants));
        }

        if (isFirebaseReady && db) {
            db.collection("csc_tenants").doc(email).update({ status: newStatus })
                .then(() => {
                    console.log(`Cloud Tenant status updated to ${newStatus}:`, email);
                    if (callback) callback(true);
                })
                .catch(err => {
                    console.error("Firebase tenant update failed:", err);
                    if (callback) callback(false);
                });
        } else {
            if (callback) callback(true);
        }
    };

    // 1. Initialize Icons
    lucide.createIcons();

    // 2. State Variables
    let processedCount = parseInt(localStorage.getItem('csc_processed_count') || '0', 10);
    updateProcessedUI();

    // Set Default Target Date to Today in Age Calculator
    const today = new Date().toISOString().split('T')[0];
    const ageTargetInput = document.getElementById('age-target-input');
    if (ageTargetInput) ageTargetInput.value = today;

    // 3. Routing / Navigation Logic
    const navItems = document.querySelectorAll('.nav-item');
    const toolCards = document.querySelectorAll('.tool-card');
    const panels = document.querySelectorAll('.tool-panel');
    const backBtns = document.querySelectorAll('.back-btn');
    const searchWrapper = document.getElementById('search-wrapper');

    function switchPanel(targetId) {
        // Role authorization check: Block Staff role from accessing restricted panels
        const activeSession = JSON.parse(localStorage.getItem('csc_active_user'));
        const restrictedTargets = ['profile', 'csp', 'reports', 'services', 'staff', 'admin'];
        if (activeSession && activeSession.role === 'Staff' && restrictedTargets.includes(targetId)) {
            targetId = 'dashboard';
        }

        if (targetId === 'admin') {
            const activeUser = JSON.parse(localStorage.getItem('csc_active_user') || '{}');
            const isSuperAdmin = activeUser.email === 'help@smartspe.in' || activeUser.email === 'owner@gmail.com';
            const tabBtn = document.getElementById('admin-tab-tenants-btn');
            if (tabBtn) {
                tabBtn.style.display = isSuperAdmin ? 'inline-block' : 'none';
            }
            if (window.renderAdminUsers) window.renderAdminUsers();
            if (window.updateAdminKPIs) window.updateAdminKPIs();
        }

        panels.forEach(panel => {
            panel.classList.remove('active');
        });
        
        const activePanel = document.getElementById(`panel-${targetId}`);
        if (activePanel) {
            activePanel.classList.add('active');
        }

        // Update active class in sidebar nav
        navItems.forEach(item => {
            if (item.getAttribute('data-target') === targetId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update active class in bottom nav
        const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
        bottomNavItems.forEach(item => {
            if (item.getAttribute('data-target') === targetId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            closeSidebarDrawer();
        }

        // Hide/Show Search box on Header depending on Dashboard view
        if (searchWrapper) {
            if (targetId === 'dashboard') {
                searchWrapper.style.visibility = 'visible';
            } else {
                searchWrapper.style.visibility = 'hidden';
            }
        }

        // Recreate icons if elements were rendered dynamically
        lucide.createIcons();

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Sidebar navigation clicks
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const target = item.getAttribute('data-target');
            if (!target) return; // Allow normal link navigation (tel/mailto/etc.)
            e.preventDefault();
            switchPanel(target);
        });
    });

    // Dashboard card clicks
    toolCards.forEach(card => {
        card.addEventListener('click', () => {
            const target = card.getAttribute('data-launch');
            switchPanel(target);
        });
    });

    // Back to dashboard buttons
    backBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            switchPanel('dashboard');
        });
    });

    // 4. Search Filter Logic
    const searchInput = document.getElementById('search-tools');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            toolCards.forEach(card => {
                const title = card.querySelector('.card-title').textContent.toLowerCase();
                const desc = card.querySelector('.card-desc').textContent.toLowerCase();
                if (title.includes(query) || desc.includes(query)) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }

    // 5. Theme Toggling Logic
    const themeBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const themeText = document.getElementById('theme-text');
    
    // Load existing theme from localstorage
    const currentTheme = localStorage.getItem('csc_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeButtonUI(currentTheme);

    themeBtn.addEventListener('click', () => {
        const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('csc_theme', theme);
        updateThemeButtonUI(theme);
    });

    function updateThemeButtonUI(theme) {
        if (theme === 'dark') {
            themeText.textContent = 'Light Mode';
            themeIcon.setAttribute('data-lucide', 'sun');
        } else {
            themeText.textContent = 'Dark Mode';
            themeIcon.setAttribute('data-lucide', 'moon');
        }
        lucide.createIcons();
    }

    // 6. Global Stats Incrementer
    window.incrementProcessedCount = function() {
        processedCount++;
        localStorage.setItem('csc_processed_count', processedCount);
        updateProcessedUI();
    };

    function updateProcessedUI() {
        const processedLbl = document.getElementById('processed-count');
        if (processedLbl) processedLbl.textContent = processedCount;

        const dbProcessed = document.getElementById('db-processed-stat');
        if (dbProcessed) dbProcessed.textContent = processedCount;
    }

    // 7. Age Calculator Implementation
    const calculateAgeBtn = document.getElementById('calculate-age-btn');
    if (calculateAgeBtn) {
        calculateAgeBtn.addEventListener('click', () => {
            const dobVal = document.getElementById('age-dob-input').value;
            const targetVal = document.getElementById('age-target-input').value;

            if (!dobVal) {
                alert('Please select your Date of Birth.');
                return;
            }

            const dob = new Date(dobVal);
            const target = targetVal ? new Date(targetVal) : new Date();

            if (dob > target) {
                alert('Date of Birth cannot be in the future relative to the calculation target date.');
                return;
            }

            // Calculation
            let years = target.getFullYear() - dob.getFullYear();
            let months = target.getMonth() - dob.getMonth();
            let days = target.getDate() - dob.getDate();

            if (days < 0) {
                months--;
                // Get days in the previous month
                const prevMonth = new Date(target.getFullYear(), target.getMonth(), 0);
                days += prevMonth.getDate();
            }

            if (months < 0) {
                years--;
                months += 12;
            }

            // Next Birthday Calculation
            let nextBday = new Date(target.getFullYear(), dob.getMonth(), dob.getDate());
            if (nextBday < target) {
                nextBday.setFullYear(target.getFullYear() + 1);
            }
            
            const diffTime = nextBday - target;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            let nextBdayText = '';
            if (diffDays === 365 || diffDays === 366 || diffDays === 0) {
                nextBdayText = "Today! 🎉 Happy Birthday!";
            } else {
                const nextBdayMonths = Math.floor(diffDays / 30.43);
                const nextBdayDaysRemaining = Math.floor(diffDays % 30.43);
                nextBdayText = `${diffDays} days (${nextBdayMonths} months, ${nextBdayDaysRemaining} days)`;
            }

            // Totals
            const totalDiffTime = target - dob;
            const totalDays = Math.floor(totalDiffTime / (1000 * 60 * 60 * 24));
            const totalWeeks = Math.floor(totalDays / 7);
            const totalMonths = (target.getFullYear() - dob.getFullYear()) * 12 + (target.getMonth() - dob.getMonth());
            const totalHours = totalDays * 24;

            // Update UI
            document.getElementById('age-years').textContent = years;
            document.getElementById('age-months').textContent = months;
            document.getElementById('age-days').textContent = days;

            document.getElementById('age-next-bday').textContent = nextBdayText;
            document.getElementById('age-tot-months').textContent = totalMonths.toLocaleString();
            document.getElementById('age-tot-weeks').textContent = totalWeeks.toLocaleString();
            document.getElementById('age-tot-days').textContent = totalDays.toLocaleString();
            document.getElementById('age-tot-hours').textContent = totalHours.toLocaleString();

            window.incrementProcessedCount();
        });
    }

    // 8. Live Clock & Dynamic Greeting
    function initLiveClock() {
        const clockEl = document.getElementById('dashboard-clock');
        const dateEl = document.getElementById('dashboard-date');
        const greetingEl = document.getElementById('hero-greeting');

        if (!clockEl || !dateEl) return;

        function updateClock() {
            const now = new Date();
            
            // Format Time: HH:MM:SS AM/PM
            let hours = now.getHours();
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            const formattedTime = `${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
            clockEl.textContent = formattedTime;

            // Format Date: e.g. Tuesday, May 26, 2026
            const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
            dateEl.textContent = now.toLocaleDateString('en-IN', options);

            // Dynamic Greeting
            if (greetingEl) {
                const currentHour = now.getHours();
                const profileName = localStorage.getItem('csc_profile_name') || 'VLE Partner';
                let greeting = `Welcome Back, ${profileName}`;
                if (currentHour < 12) {
                    greeting = `Good Morning, ${profileName}! ☀️`;
                } else if (currentHour < 17) {
                    greeting = `Good Afternoon, ${profileName}! 🌤️`;
                } else if (currentHour < 22) {
                    greeting = `Good Evening, ${profileName}! 🌙`;
                } else {
                    greeting = `Working Late? Keep it up, ${profileName}! 💼`;
                }
                greetingEl.textContent = greeting;
            }
        }

        updateClock();
        setInterval(updateClock, 1000);
    }
    initLiveClock();

    // 8b. Profile Section Logic
    function initProfile() {
        const defaultName = "Aarav Sharma";
        const defaultId = "CSC98765432";
        const defaultShop = "Aarav Digital Center";
        const defaultPhone = "+91 98765 43210";
        const defaultEmail = "aarav.csc@gmail.com";
        const defaultAddress = "Main Market, Jaipur, Rajasthan";
        const defaultPhoto = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop";

        // DOM elements for display
        const displayPhoto = document.getElementById('profile-display-photo');
        const displayName = document.getElementById('profile-display-name');
        const displayId = document.getElementById('profile-display-id');
        const displayShop = document.getElementById('profile-display-shop');
        const displayPhone = document.getElementById('profile-display-phone');
        const displayEmail = document.getElementById('profile-display-email');
        const displayAddress = document.getElementById('profile-display-address');
        const heroShopName = document.getElementById('hero-shop-name');

        // DOM elements for inputs
        const inputName = document.getElementById('profile-input-name');
        const inputId = document.getElementById('profile-input-id');
        const inputShop = document.getElementById('profile-input-shop');
        const inputPhone = document.getElementById('profile-input-phone');
        const inputEmail = document.getElementById('profile-input-email');
        const inputAddress = document.getElementById('profile-input-address');
        const photoUpload = document.getElementById('profile-photo-upload');
        const profileForm = document.getElementById('profile-edit-form');

        function updateProfileUI() {
            const name = localStorage.getItem('csc_profile_name') || defaultName;
            const rid = localStorage.getItem('csc_profile_retailer_id') || defaultId;
            const shop = localStorage.getItem('csc_profile_shop_name') || defaultShop;
            const phone = localStorage.getItem('csc_profile_phone') || defaultPhone;
            const email = localStorage.getItem('csc_profile_email') || defaultEmail;
            const address = localStorage.getItem('csc_profile_address') || defaultAddress;
            const photo = localStorage.getItem('csc_profile_photo') || defaultPhoto;

            // Update Header Display Card
            if (displayPhoto) displayPhoto.src = photo;
            if (displayName) displayName.textContent = name;
            if (displayId) displayId.textContent = rid;
            if (displayShop) displayShop.textContent = shop;
            if (displayPhone) displayPhone.textContent = phone;
            if (displayEmail) displayEmail.textContent = email;
            if (displayAddress) displayAddress.textContent = address;

            // Update Dashboard Welcome Banner
            if (heroShopName) heroShopName.textContent = shop;

            // Update Sidebar Welcome Note
            const sidebarWelcome = document.getElementById('sidebar-welcome-note');
            if (sidebarWelcome) {
                sidebarWelcome.textContent = `Welcome, ${name}`;
            }

            // Update Form Input Values
            if (inputName) inputName.value = name;
            if (inputId) inputId.value = rid;
            if (inputShop) inputShop.value = shop;
            if (inputPhone) inputPhone.value = phone;
            if (inputEmail) inputEmail.value = email;
            if (inputAddress) inputAddress.value = address;

            // Render icons
            if (window.lucide) {
                lucide.createIcons();
            }
        }

        // Initialize displays
        updateProfileUI();
        window.updateProfileUI = updateProfileUI;


        // Handle Form Submit
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const name = inputName.value.trim();
                const rid = inputId.value.trim();
                const shop = inputShop.value.trim();
                const phone = inputPhone.value.trim();
                const email = inputEmail.value.trim();
                const address = inputAddress.value.trim();

                localStorage.setItem('csc_profile_name', name);
                localStorage.setItem('csc_profile_retailer_id', rid);
                localStorage.setItem('csc_profile_shop_name', shop);
                localStorage.setItem('csc_profile_phone', phone);
                localStorage.setItem('csc_profile_email', email);
                localStorage.setItem('csc_profile_address', address);

                updateProfileUI();
                alert('Profile details updated successfully!');
            });
        }

        // Handle Photo Upload
        if (photoUpload) {
            photoUpload.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                if (!file.type.startsWith('image/')) {
                    alert('Please select an image file.');
                    return;
                }

                const reader = new FileReader();
                reader.onload = (event) => {
                    const base64Data = event.target.result;
                    localStorage.setItem('csc_profile_photo', base64Data);
                    updateProfileUI();
                };
                reader.readAsDataURL(file);
            });
        }
    }
    initProfile();

    // 9. Force clear all custom zoom styles to restore standard 100% scale
    document.body.style.zoom = '';
    document.documentElement.style.zoom = '';
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.style.zoom = '';
    }
    localStorage.removeItem('csc_zoom');

    // 10. Mobile Drawer, Bottom Nav, & FAB Controllers
    const sidebar = document.querySelector('.sidebar');
    const sidebarBackdrop = document.getElementById('sidebar-backdrop');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const bottomMenuToggle = document.getElementById('bottom-menu-toggle');
    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');

    function toggleSidebarDrawer() {
        if (sidebar && sidebarBackdrop) {
            sidebar.classList.toggle('open');
            sidebarBackdrop.classList.toggle('active');
        }
    }

    function closeSidebarDrawer() {
        if (sidebar && sidebarBackdrop) {
            sidebar.classList.remove('open');
            sidebarBackdrop.classList.remove('active');
        }
    }

    // Expose closeSidebarDrawer lexically
    window.closeSidebarDrawer = closeSidebarDrawer;

    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', toggleSidebarDrawer);
    }
    if (bottomMenuToggle) {
        bottomMenuToggle.addEventListener('click', toggleSidebarDrawer);
    }
    if (sidebarBackdrop) {
        sidebarBackdrop.addEventListener('click', closeSidebarDrawer);
    }

    // Bottom Navigation click handlers
    bottomNavItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.getAttribute('data-target');
            if (target) {
                switchPanel(target);
            }
        });
    });

    // Floating Action Button & Quick Entry Modal
    const quickModal = document.getElementById('quick-modal-backdrop');
    const quickModalClose = document.getElementById('quick-modal-close');
    const quickModalBody = document.getElementById('quick-modal-body');
    const quickEntryPlaceholder = document.getElementById('quick-entry-placeholder');
    const quickEntryHub = document.querySelector('.quick-entry-hub');
    const fabBtn = document.getElementById('fab-btn');

    function openQuickEntryModal() {
        if (quickModal && quickModalBody && quickEntryHub) {
            quickModalBody.appendChild(quickEntryHub);
            quickModal.classList.add('active');
            lucide.createIcons(); // ensure icons inside modal are rendered
        }
    }

    function closeQuickEntryModal() {
        if (quickModal && quickEntryPlaceholder && quickEntryHub) {
            quickModal.classList.remove('active');
            // Wait for transition before returning DOM element
            setTimeout(() => {
                quickEntryPlaceholder.appendChild(quickEntryHub);
            }, 300);
        }
    }

    if (fabBtn) {
        fabBtn.addEventListener('click', openQuickEntryModal);
    }
    if (quickModalClose) {
        quickModalClose.addEventListener('click', closeQuickEntryModal);
    }
    if (quickModal) {
        quickModal.addEventListener('click', (e) => {
            if (e.target === quickModal) {
                closeQuickEntryModal();
            }
        });
    }

    // 12. User Authentication and Role-Based Access Control (RBAC)
    function initUserAuth() {
        // Initialize user registry in localStorage if empty
        // Initialize user registry in localStorage if empty or migrate (with crash-proof safety)
        let users = [];
        try {
            const parsed = JSON.parse(localStorage.getItem('csc_users'));
            if (Array.isArray(parsed)) {
                users = parsed;
            }
        } catch (e) {
            users = [];
        }

        let updated = false;
        if (users.length === 0) {
            users = [
                { id: "user_owner", name: "Owner / Admin", role: "Owner", pin: "1111", mobile: "-", email: "owner@gmail.com" },
                { id: "user_staff", name: "Staff User", role: "Staff", pin: "2222", mobile: "-", email: "staff@gmail.com" }
            ];
            updated = true;
        } else {
            // Migration: Ensure email field is populated for existing users
            users.forEach(u => {
                if (u && !u.email) {
                    u.email = u.role === 'Owner' ? 'owner@gmail.com' : 'staff@gmail.com';
                    updated = true;
                }
            });
        }
        if (updated) {
            localStorage.setItem('csc_users', JSON.stringify(users));
        }

        // Helper to get users safely elsewhere
        function getSafeUsers() {
            try {
                const parsed = JSON.parse(localStorage.getItem('csc_users'));
                if (Array.isArray(parsed)) return parsed;
            } catch (e) {}
            return [];
        }
        window.getSafeUsers = getSafeUsers;

        // DOM elements
        const authOverlay = document.getElementById('auth-overlay');
        const pinInput = document.getElementById('auth-pin-input');
        const loginBtn = document.getElementById('auth-login-btn');
        const btnRoleOwner = document.getElementById('btn-role-owner');
        const btnRoleStaff = document.getElementById('btn-role-staff');
        const errorMsg = document.getElementById('auth-error-msg');
        const logoutBtn = document.getElementById('sidebar-logout-btn');

        let selectedRole = 'Owner';

        // Signup Wizard elements
        const toggleSignupBtn = document.getElementById('auth-toggle-signup');
        const toggleLoginBtn = document.getElementById('auth-toggle-login');
        const loginCard = document.getElementById('auth-login-card');
        const signupCard = document.getElementById('signup-wizard-card');

        // Toggle Views (Robust and resilient)
        if (toggleSignupBtn) {
            toggleSignupBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const currentLoginCard = document.getElementById('auth-login-card');
                const currentSignupCard = document.getElementById('signup-wizard-card');
                const currentGmailCard = document.getElementById('auth-gmail-card');
                if (currentLoginCard) currentLoginCard.style.display = 'none';
                if (currentGmailCard) currentGmailCard.style.display = 'none';
                if (currentSignupCard) currentSignupCard.style.display = 'block';
                resetSignupWizard();
            });
        }
        if (toggleLoginBtn) {
            toggleLoginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const currentLoginCard = document.getElementById('auth-login-card');
                const currentSignupCard = document.getElementById('signup-wizard-card');
                const currentGmailCard = document.getElementById('auth-gmail-card');
                if (currentSignupCard) currentSignupCard.style.display = 'none';
                if (currentGmailCard) currentGmailCard.style.display = 'none';
                if (currentLoginCard) currentLoginCard.style.display = 'block';
            });
        }

        // Onboarding State Variables
        let currentWizardStep = 1;
        let generatedPin = '';
        let signupName = '';
        let signupMobile = '';
        let signupEmail = '';
        let signupShop = '';
        let signupAddress = '';
        let signupPhotoBase64 = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop';

        // Step navigation elements
        const step1 = document.getElementById('signup-step-1');
        const step2 = document.getElementById('signup-step-2');
        const step3 = document.getElementById('signup-step-3');
        const step4 = document.getElementById('signup-step-4');
        const step5 = document.getElementById('signup-step-5');

        const btnNext1 = document.getElementById('btn-signup-next-1');
        const btnNext2 = document.getElementById('btn-signup-next-2');
        const btnBack2 = document.getElementById('btn-signup-back-2');
        const btnNext3 = document.getElementById('btn-signup-next-3');
        const btnBack3 = document.getElementById('btn-signup-back-3');
        const btnComplete = document.getElementById('btn-signup-complete');

        const signupPinInput = document.getElementById('signup-pin-input');
        const signupPinError = document.getElementById('signup-pin-error');
        const photoUploadInput = document.getElementById('signup-photo-upload');
        const photoPreview = document.getElementById('signup-profile-preview');

        // File reader for profile photo
        if (photoUploadInput && photoPreview) {
            photoUploadInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    if (!file.type.startsWith('image/')) {
                        alert('Please select an image file.');
                        return;
                    }
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        signupPhotoBase64 = event.target.result;
                        photoPreview.src = signupPhotoBase64;
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        function resetSignupWizard() {
            currentWizardStep = 1;
            generatedPin = '';
            signupName = '';
            signupMobile = '';
            signupEmail = '';
            signupShop = '';
            signupAddress = '';
            signupPhotoBase64 = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop';
            
            if (photoPreview) photoPreview.src = signupPhotoBase64;
            
            // Reset inputs
            ['signup-name', 'signup-mobile', 'signup-email', 'signup-pin-input', 'signup-shop', 'signup-address'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });

            if (signupPinError) signupPinError.style.display = 'none';

            showStep(1);
        }

        function showStep(stepNum) {
            currentWizardStep = stepNum;
            const steps = [step1, step2, step3, step4, step5];
            steps.forEach((container, idx) => {
                if (container) {
                    container.style.display = (idx + 1 === stepNum) ? 'block' : 'none';
                }
            });

            // Update Indicator Bullets
            const indicatorSteps = document.querySelectorAll('.wizard-steps-indicator .wizard-step');
            indicatorSteps.forEach((indicator, idx) => {
                const stepIdx = idx + 1;
                indicator.classList.remove('active', 'completed');
                if (stepIdx === stepNum) {
                    indicator.classList.add('active');
                } else if (stepIdx < stepNum) {
                    indicator.classList.add('completed');
                }
            });

            // Trigger Lucide icons reload for navigation buttons
            if (window.lucide) lucide.createIcons();
        }

        // STEP 1 -> STEP 2 (Generate Password PIN & Sim Email)
        if (btnNext1) {
            btnNext1.addEventListener('click', () => {
                const nameEl = document.getElementById('signup-name');
                const mobileEl = document.getElementById('signup-mobile');
                const emailEl = document.getElementById('signup-email');

                signupName = nameEl ? nameEl.value.trim() : '';
                signupMobile = mobileEl ? mobileEl.value.trim() : '';
                signupEmail = emailEl ? emailEl.value.trim() : '';

                if (!signupName || !signupMobile || !signupEmail) {
                    alert('Please fill in Name, Mobile, and Email Address.');
                    return;
                }

                // Auto-generate random 4-digit PIN password
                generatedPin = String(Math.floor(1000 + Math.random() * 9000));
                
                // Show Step 2
                showStep(2);
                if (signupPinInput) {
                    signupPinInput.value = '';
                    signupPinInput.focus();
                }

                // Send Real Email via EmailJS if configuration is provided
                if (typeof emailjs !== 'undefined' && emailjsConfig.publicKey !== "YOUR_EMAILJS_PUBLIC_KEY") {
                    emailjs.send(emailjsConfig.serviceId, emailjsConfig.templateId, {
                        user_name: signupName,
                        user_email: signupEmail,
                        generated_pin: generatedPin
                    }).then(
                        function(response) {
                            console.log("Real Registration PIN sent successfully via EmailJS:", response.status, response.text);
                        },
                        function(error) {
                            console.error("EmailJS failed to send Registration PIN:", error);
                        }
                    );
                }

                // Simulate Email Notification popup after 0.8s
                setTimeout(() => {
                    const notifyBanner = document.getElementById('mock-email-notification');
                    const notifyName = document.getElementById('mock-email-user-name');
                    const notifyPin = document.getElementById('mock-email-pin-value');

                    if (notifyBanner && notifyPin) {
                        if (notifyName) notifyName.textContent = signupName;
                        notifyPin.textContent = generatedPin;
                        notifyBanner.style.transform = 'translateX(0)';
                        notifyBanner.style.opacity = '1';
                        notifyBanner.style.pointerEvents = 'auto';
                        
                        // Re-trigger Lucide icon render inside notification
                        if (window.lucide) lucide.createIcons();
                    }
                }, 800);
            });
        }

        // STEP 2 -> STEP 3 (Verify Email Code PIN)
        if (btnNext2) {
            btnNext2.addEventListener('click', () => {
                const enteredPin = signupPinInput ? signupPinInput.value.trim() : '';
                if (enteredPin === generatedPin) {
                    if (signupPinError) signupPinError.style.display = 'none';
                    // Hide email notification
                    const notifyBanner = document.getElementById('mock-email-notification');
                    if (notifyBanner) {
                        notifyBanner.style.transform = 'translateX(340px)';
                        notifyBanner.style.opacity = '0';
                        notifyBanner.style.pointerEvents = 'none';
                    }
                    showStep(3);
                } else {
                    if (signupPinError) signupPinError.style.display = 'block';
                    signupPinInput.value = '';
                    signupPinInput.focus();
                }
            });
        }

        if (btnBack2) {
            btnBack2.addEventListener('click', () => {
                // Hide email notification if visible
                const notifyBanner = document.getElementById('mock-email-notification');
                if (notifyBanner) {
                    notifyBanner.style.transform = 'translateX(340px)';
                    notifyBanner.style.opacity = '0';
                    notifyBanner.style.pointerEvents = 'none';
                }
                showStep(1);
            });
        }

        // STEP 3 -> STEP 4 (Save Profile info & show Welcome visual)
        if (btnNext3) {
            btnNext3.addEventListener('click', () => {
                const shopEl = document.getElementById('signup-shop');
                const addrEl = document.getElementById('signup-address');

                signupShop = shopEl ? shopEl.value.trim() : '';
                signupAddress = addrEl ? addrEl.value.trim() : '';

                if (!signupShop || !signupAddress) {
                    alert('Please enter your Shop Name and Shop Address.');
                    return;
                }

                // Populate welcome email template preview fields
                const welcomeName = document.getElementById('welcome-email-name');
                const welcomeShop = document.getElementById('welcome-email-shop');
                const welcomePin = document.getElementById('welcome-email-pin');

                if (welcomeName) welcomeName.textContent = signupName;
                if (welcomeShop) welcomeShop.textContent = signupShop;
                if (welcomePin) welcomePin.textContent = generatedPin;

                showStep(4);
            });
        }

        if (btnBack3) {
            btnBack3.addEventListener('click', () => {
                showStep(2);
            });
        }

        // STEP 4 -> STEP 5 (Complete Registration & Redirect)
        if (btnComplete) {
            btnComplete.addEventListener('click', () => {
                showStep(5);

                const progressFill = document.getElementById('signup-progress-fill');
                if (progressFill) {
                    setTimeout(() => {
                        progressFill.style.width = '100%';
                    }, 50);
                }

                // Finalize signup after animation delay (1.5s)
                setTimeout(() => {
                    // Create new VLE user credentials
                    const newUserId = "user_" + Date.now();
                    const newVleUser = {
                        id: newUserId,
                        name: signupName,
                        role: "Owner",
                        pin: generatedPin,
                        mobile: signupMobile,
                        email: signupEmail
                    };

                    // Write user into csc_users registry
                    let currentUsers = getSafeUsers();
                    currentUsers.push(newVleUser);
                    localStorage.setItem('csc_users', JSON.stringify(currentUsers));

                    // Central cloud register VLE Shop (Tenant)
                    const tenantData = {
                        id: newUserId,
                        name: signupName,
                        role: "Owner",
                        pin: generatedPin,
                        mobile: signupMobile,
                        email: signupEmail,
                        shopName: signupShop,
                        status: "active",
                        registeredAt: new Date().toISOString()
                    };
                    if (window.cloudRegisterTenant) window.cloudRegisterTenant(tenantData);

                    // Cache profile details immediately
                    localStorage.setItem('csc_profile_name', signupName);
                    localStorage.setItem('csc_profile_shop_name', signupShop);
                    localStorage.setItem('csc_profile_phone', signupMobile);
                    localStorage.setItem('csc_profile_email', signupEmail);
                    localStorage.setItem('csc_profile_address', signupAddress);
                    localStorage.setItem('csc_profile_photo', signupPhotoBase64);
                    localStorage.setItem('csc_profile_retailer_id', "CSC" + String(Math.floor(10000000 + Math.random() * 90000000)));

                    // Sync Welcome banner greetings
                    const heroShopName = document.getElementById('hero-shop-name');
                    if (heroShopName) heroShopName.textContent = signupShop;

                    // Set Active Session
                    localStorage.setItem('csc_active_user', JSON.stringify(newVleUser));

                    // Hide auth overlay
                    if (authOverlay) {
                        authOverlay.style.opacity = '0';
                        setTimeout(() => {
                            authOverlay.style.visibility = 'hidden';
                        }, 400);
                    }

                    // Apply RBAC UI
                    applyRoleAccessControl('Owner');

                    // Redirect panel to Dashboard
                    switchPanel('dashboard');

                    // Reset wizard for future uses
                    resetSignupWizard();
                    if (signupCard) signupCard.style.display = 'none';
                    if (loginCard) loginCard.style.display = 'block';

                }, 1600);
            });
        }

        if (btnRoleOwner && btnRoleStaff) {
            btnRoleOwner.addEventListener('click', () => {
                selectedRole = 'Owner';
                btnRoleOwner.classList.add('active');
                btnRoleStaff.classList.remove('active');
                if (errorMsg) errorMsg.style.display = 'none';
                if (pinInput) { pinInput.value = ''; pinInput.focus(); }
            });

            btnRoleStaff.addEventListener('click', () => {
                selectedRole = 'Staff';
                btnRoleStaff.classList.add('active');
                btnRoleOwner.classList.remove('active');
                if (errorMsg) errorMsg.style.display = 'none';
                if (pinInput) { pinInput.value = ''; pinInput.focus(); }
            });
        }

        function applyRoleAccessControl(role) {
            const navItems = document.querySelectorAll('.nav-links .nav-item');
            const toolCards = document.querySelectorAll('.tool-card');
            const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
            const statsRow = document.querySelector('.stats-row-wrapper');
            const categoryHeaders = document.querySelectorAll('.nav-category-header');
            
            // Restrictable target panel names
            const restrictedTargets = ['profile', 'csp', 'reports', 'services', 'staff', 'admin'];

            if (!role) {
                // Completely hide app navigation and views until logged in
                navItems.forEach(item => item.style.display = 'none');
                toolCards.forEach(card => card.style.display = 'none');
                bottomNavItems.forEach(item => item.style.display = 'none');
                categoryHeaders.forEach(header => header.style.display = 'none');
                if (statsRow) statsRow.style.display = 'none';
                return;
            }

            if (role === 'Staff') {
                // Hide restricted navigation items
                navItems.forEach(item => {
                    const target = item.getAttribute('data-target');
                    if (restrictedTargets.includes(target)) {
                        item.style.display = 'none';
                    } else {
                        item.style.display = 'flex';
                    }
                });

                // Hide restricted bottom nav items
                bottomNavItems.forEach(item => {
                    const target = item.getAttribute('data-target');
                    if (restrictedTargets.includes(target)) {
                        item.style.display = 'none';
                    } else {
                        item.style.display = 'flex';
                    }
                });

                // Hide restricted tool cards on dashboard
                toolCards.forEach(card => {
                    const target = card.getAttribute('data-launch');
                    if (restrictedTargets.includes(target)) {
                        card.style.display = 'none';
                    } else {
                        card.style.display = 'flex';
                    }
                });

                // Hide restricted category headers in sidebar
                categoryHeaders.forEach(header => {
                    const text = header.textContent.trim().toLowerCase();
                    if (text.includes('office') || text.includes('finance')) {
                        header.style.display = 'none';
                    } else {
                        header.style.display = 'block';
                    }
                });

                // Hide financial stats row wrapper on dashboard
                if (statsRow) statsRow.style.display = 'none';

                // Safety: redirect active panel back to dashboard if they were in a restricted panel
                const activePanel = document.querySelector('.tool-panel.active');
                if (activePanel) {
                    const panelId = activePanel.id.replace('panel-', '');
                    if (restrictedTargets.includes(panelId)) {
                        // Switch back to dashboard
                        if (window.closeSidebarDrawer) window.closeSidebarDrawer();
                        const dashboardPanel = document.getElementById('panel-dashboard');
                        if (dashboardPanel) {
                            document.querySelectorAll('.tool-panel').forEach(p => p.classList.remove('active'));
                            dashboardPanel.classList.add('active');
                            navItems.forEach(item => {
                                if (item.getAttribute('data-target') === 'dashboard') {
                                    item.classList.add('active');
                                } else {
                                    item.classList.remove('active');
                                }
                            });
                        }
                    }
                }
            } else {
                // Owner / Admin role - show all
                navItems.forEach(item => item.style.display = 'flex');
                toolCards.forEach(card => card.style.display = 'flex');
                bottomNavItems.forEach(item => item.style.display = 'flex');
                categoryHeaders.forEach(header => header.style.display = 'block');
                if (statsRow) statsRow.style.display = 'grid';
            }

            // Always recreate icons to ensure everything is rendered
            if (window.lucide) {
                lucide.createIcons();
            }
        }

        function proceedLogin(matchedUser) {
            // Success! Set active session
            localStorage.setItem('csc_active_user', JSON.stringify(matchedUser));
            if (authOverlay) {
                authOverlay.style.opacity = '0';
                setTimeout(() => {
                    authOverlay.style.visibility = 'hidden';
                }, 400);
            }
            if (pinInput) pinInput.value = '';
            if (errorMsg) errorMsg.style.display = 'none';

            // Apply RBAC UI changes
            applyRoleAccessControl(matchedUser.role);

            // Update greetings in welcome clock banner
            const greetingEl = document.getElementById('hero-greeting');
            if (greetingEl) {
                const currentHour = new Date().getHours();
                let greeting = `Welcome Back, ${matchedUser.name}`;
                if (currentHour < 12) {
                    greeting = `Good Morning, ${matchedUser.name}! ☀️`;
                } else if (currentHour < 17) {
                    greeting = `Good Afternoon, ${matchedUser.name}! 🌤️`;
                } else if (currentHour < 22) {
                    greeting = `Good Evening, ${matchedUser.name}! 🌙`;
                } else {
                    greeting = `Working Late? Keep it up, ${matchedUser.name}! 💼`;
                }
                greetingEl.textContent = greeting;
            }
        }

        function handleLoginSubmit() {
            const enteredPin = pinInput ? pinInput.value.trim() : '';
            if (!enteredPin) {
                alert('Please enter your security PIN.');
                return;
            }

            // Fetch latest user list from storage
            const currentUsers = getSafeUsers();
            const matchedUser = currentUsers.find(u => u.role === selectedRole && u.pin === enteredPin);

            if (matchedUser) {
                // License check
                if (window.cloudCheckTenant && matchedUser.email && matchedUser.email !== '-') {
                    window.cloudCheckTenant(matchedUser.email, matchedUser.role, function(res) {
                        if (res.exists && res.isBlocked) {
                            alert("Access Denied: Your account/license has been suspended by the platform administrator. Please contact support at help@smartspe.in");
                            if (pinInput) pinInput.value = '';
                            return;
                        }
                        proceedLogin(matchedUser);
                    });
                } else {
                    proceedLogin(matchedUser);
                }
            } else {
                // Invalid credentials: error animations
                if (errorMsg) errorMsg.style.display = 'block';
                const authCard = document.querySelector('.auth-card');
                if (authCard) {
                    authCard.classList.add('shake');
                    setTimeout(() => {
                        authCard.classList.remove('shake');
                    }, 400);
                }
                if (pinInput) {
                    pinInput.value = '';
                    pinInput.focus();
                }
            }
        }

        if (loginBtn) {
            loginBtn.addEventListener('click', handleLoginSubmit);
        }

        if (pinInput) {
            pinInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handleLoginSubmit();
                }
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('csc_active_user');
                if (authOverlay) {
                    authOverlay.style.visibility = 'visible';
                    authOverlay.style.opacity = '1';
                }
                applyRoleAccessControl(null);
                if (pinInput) {
                    pinInput.value = '';
                    pinInput.focus();
                }
            });
        }

        // --- GMAIL LOGIN WITH OTP LOGIC ---
        const authGmailCard = document.getElementById('auth-gmail-card');
        const authGmailToggleBtn = document.getElementById('auth-gmail-login-toggle-btn');
        const authToggleToPinBtns = document.querySelectorAll('.auth-toggle-to-pin');

        const gmailStep1 = document.getElementById('gmail-login-step-1');
        const gmailStep2 = document.getElementById('gmail-login-step-2');
        const btnGmailSendOtp = document.getElementById('btn-gmail-send-otp');
        const btnGmailVerifyOtp = document.getElementById('btn-gmail-verify-otp');
        const btnGmailResend = document.getElementById('btn-gmail-resend');
        const gmailEmailInput = document.getElementById('gmail-login-email');
        const gmailRoleSelect = document.getElementById('gmail-login-role');
        const gmailOtpInput = document.getElementById('gmail-login-otp-input');
        const gmailErrorMsg = document.getElementById('gmail-login-error-msg');

        let gmailGeneratedOtp = '';
        let gmailEnteredEmail = '';
        let gmailSelectedRole = 'Owner';

        if (authGmailToggleBtn && authGmailCard && loginCard) {
            authGmailToggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                loginCard.style.display = 'none';
                authGmailCard.style.display = 'block';
                if (gmailStep1) gmailStep1.style.display = 'flex';
                if (gmailStep2) gmailStep2.style.display = 'none';
                if (gmailEmailInput) {
                    gmailEmailInput.value = '';
                    gmailEmailInput.focus();
                }
                if (gmailOtpInput) gmailOtpInput.value = '';
                if (gmailErrorMsg) gmailErrorMsg.style.display = 'none';
            });
        }

        authToggleToPinBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (authGmailCard) authGmailCard.style.display = 'none';
                if (loginCard) loginCard.style.display = 'block';
            });
        });

        function sendGmailOtp() {
            gmailEnteredEmail = gmailEmailInput ? gmailEmailInput.value.trim() : '';
            gmailSelectedRole = gmailRoleSelect ? gmailRoleSelect.value : 'Owner';

            if (!gmailEnteredEmail) {
                alert('Please enter your Gmail address.');
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(gmailEnteredEmail)) {
                alert('Please enter a valid email address.');
                return;
            }

            // Check if user is registered in local storage database
            let currentUsers = getSafeUsers();
            let matchedUser = currentUsers.find(u => u.role === gmailSelectedRole && u.email.toLowerCase() === gmailEnteredEmail.toLowerCase());

            if (!matchedUser) {
                alert('This Gmail address is not registered for the selected role. Please register/setup your profile first!');
                return;
            }

            gmailGeneratedOtp = String(Math.floor(100000 + Math.random() * 900000));

            if (gmailStep1) gmailStep1.style.display = 'none';
            if (gmailStep2) gmailStep2.style.display = 'flex';
            if (gmailOtpInput) {
                gmailOtpInput.value = '';
                gmailOtpInput.focus();
            }
            if (gmailErrorMsg) gmailErrorMsg.style.display = 'none';

            // Send Real OTP via EmailJS if configuration is provided
            if (typeof emailjs !== 'undefined' && emailjsConfig.publicKey !== "YOUR_EMAILJS_PUBLIC_KEY") {
                emailjs.send(emailjsConfig.serviceId, emailjsConfig.templateId, {
                    user_name: matchedUser.name || "VLE Partner",
                    user_email: gmailEnteredEmail,
                    generated_pin: gmailGeneratedOtp
                }).then(
                    function(response) {
                        console.log("Real Gmail OTP sent successfully via EmailJS:", response.status, response.text);
                    },
                    function(error) {
                        console.error("EmailJS failed to send Gmail OTP:", error);
                    }
                );
            }

            setTimeout(() => {
                const notifyBanner = document.getElementById('mock-email-notification');
                const notifyBody = document.querySelector('.mock-email-body');

                if (notifyBanner && notifyBody) {
                    notifyBody.innerHTML = `<p style="margin: 0;">Hello <strong>VLE</strong>, your SmartSpe Gmail Login OTP is: <strong id="mock-email-pin-value" style="font-size: 14px; color: var(--success); font-family: monospace; font-weight: 800; background: rgba(16, 185, 129, 0.1); padding: 2px 6px; border-radius: var(--radius-sm);">${gmailGeneratedOtp}</strong></p>`;
                    
                    notifyBanner.style.transform = 'translateX(0)';
                    notifyBanner.style.opacity = '1';
                    notifyBanner.style.pointerEvents = 'auto';
                    
                    if (window.lucide) lucide.createIcons();
                }
            }, 800);
        }

        if (btnGmailSendOtp) {
            btnGmailSendOtp.addEventListener('click', sendGmailOtp);
        }

        if (btnGmailResend) {
            btnGmailResend.addEventListener('click', (e) => {
                e.preventDefault();
                sendGmailOtp();
            });
        }

        if (gmailEmailInput) {
            gmailEmailInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    sendGmailOtp();
                }
            });
        }

        function proceedGmailLogin(matchedUser) {
            if (matchedUser.role === 'Owner') {
                localStorage.setItem('csc_profile_email', gmailEnteredEmail);
                localStorage.setItem('csc_profile_name', matchedUser.name);
                if (window.updateProfileUI) {
                    window.updateProfileUI();
                }
            }

            localStorage.setItem('csc_active_user', JSON.stringify(matchedUser));

            if (authOverlay) {
                authOverlay.style.opacity = '0';
                setTimeout(() => {
                    authOverlay.style.visibility = 'hidden';
                }, 400);
            }

            if (gmailOtpInput) gmailOtpInput.value = '';
            if (gmailEmailInput) gmailEmailInput.value = '';

            applyRoleAccessControl(matchedUser.role);

            const greetingEl = document.getElementById('hero-greeting');
            if (greetingEl) {
                const currentHour = new Date().getHours();
                let greeting = `Welcome Back, ${matchedUser.name}`;
                if (currentHour < 12) {
                    greeting = `Good Morning, ${matchedUser.name}! ☀️`;
                } else if (currentHour < 17) {
                    greeting = `Good Afternoon, ${matchedUser.name}! 🌤️`;
                } else if (currentHour < 22) {
                    greeting = `Good Evening, ${matchedUser.name}! 🌙`;
                } else {
                    greeting = `Working Late? Keep it up, ${matchedUser.name}! 💼`;
                }
                greetingEl.textContent = greeting;
            }

            switchPanel('dashboard');

            if (authGmailCard) authGmailCard.style.display = 'none';
            if (loginCard) loginCard.style.display = 'block';
        }

        function verifyGmailOtp() {
            const enteredOtp = gmailOtpInput ? gmailOtpInput.value.trim() : '';
            if (enteredOtp === gmailGeneratedOtp) {
                if (gmailErrorMsg) gmailErrorMsg.style.display = 'none';

                const notifyBanner = document.getElementById('mock-email-notification');
                if (notifyBanner) {
                    notifyBanner.style.transform = 'translateX(340px)';
                    notifyBanner.style.opacity = '0';
                    notifyBanner.style.pointerEvents = 'none';
                }

                let currentUsers = getSafeUsers();
                let matchedUser = currentUsers.find(u => u.role === gmailSelectedRole && u.email.toLowerCase() === gmailEnteredEmail.toLowerCase());

                if (!matchedUser) {
                    alert('Session expired or user not registered. Please try again.');
                    return;
                }

                // Cloud license check
                if (window.cloudCheckTenant && matchedUser.email) {
                    window.cloudCheckTenant(matchedUser.email, matchedUser.role, function(res) {
                        if (res.exists && res.isBlocked) {
                            alert("Access Denied: Your account/license has been suspended by the platform administrator. Please contact support at help@smartspe.in");
                            if (gmailOtpInput) gmailOtpInput.value = '';
                            if (gmailEmailInput) gmailEmailInput.value = '';
                            return;
                        }
                        proceedGmailLogin(matchedUser);
                    });
                } else {
                    proceedGmailLogin(matchedUser);
                }

            } else {
                if (gmailErrorMsg) gmailErrorMsg.style.display = 'block';
                const authCard = authGmailCard;
                if (authCard) {
                    authCard.classList.add('shake');
                    setTimeout(() => {
                        authCard.classList.remove('shake');
                    }, 400);
                }
                if (gmailOtpInput) {
                    gmailOtpInput.value = '';
                    gmailOtpInput.focus();
                }
            }
        }

        if (btnGmailVerifyOtp) {
            btnGmailVerifyOtp.addEventListener('click', verifyGmailOtp);
        }

        if (gmailOtpInput) {
            gmailOtpInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    verifyGmailOtp();
                }
            });
        }

        // On load check session
        let activeSession = JSON.parse(localStorage.getItem('csc_active_user'));

        if (activeSession) {
            // Normalize legacy active session roles to Owner
            if (activeSession.role === 'Owner / Admin' || activeSession.role === 'Admin') {
                activeSession.role = 'Owner';
                localStorage.setItem('csc_active_user', JSON.stringify(activeSession));
            }
            if (authOverlay) {
                authOverlay.style.visibility = 'hidden';
                authOverlay.style.opacity = '0';
            }
            applyRoleAccessControl(activeSession.role);
        } else {
            if (authOverlay) {
                authOverlay.style.visibility = 'visible';
                authOverlay.style.opacity = '1';
            }
            applyRoleAccessControl(null);
            if (pinInput) {
                pinInput.focus();
            }
        }
    }
    initUserAuth();

    // 13. System Admin Control Panel Implementation
    function initAdminPanel() {
        // Tab triggers toggling
        const tabUsersBtn = document.getElementById('admin-tab-users-btn');
        const tabBackupBtn = document.getElementById('admin-tab-backup-btn');
        const tabTenantsBtn = document.getElementById('admin-tab-tenants-btn');
        const tabUsersContent = document.getElementById('admin-tab-users');
        const tabBackupContent = document.getElementById('admin-tab-backup');
        const tabTenantsContent = document.getElementById('admin-tab-tenants');

        if (tabUsersBtn && tabBackupBtn && tabUsersContent && tabBackupContent) {
            tabUsersBtn.addEventListener('click', () => {
                tabUsersBtn.classList.add('active');
                tabBackupBtn.classList.remove('active');
                if (tabTenantsBtn) tabTenantsBtn.classList.remove('active');
                tabUsersContent.style.display = 'flex';
                tabBackupContent.style.display = 'none';
                if (tabTenantsContent) tabTenantsContent.style.display = 'none';
            });

            tabBackupBtn.addEventListener('click', () => {
                tabBackupBtn.classList.add('active');
                tabUsersBtn.classList.remove('active');
                if (tabTenantsBtn) tabTenantsBtn.classList.remove('active');
                tabBackupContent.style.display = 'flex';
                tabUsersContent.style.display = 'none';
                if (tabTenantsContent) tabTenantsContent.style.display = 'none';
            });
        }

        if (tabTenantsBtn && tabTenantsContent) {
            tabTenantsBtn.addEventListener('click', () => {
                tabTenantsBtn.classList.add('active');
                if (tabUsersBtn) tabUsersBtn.classList.remove('active');
                if (tabBackupBtn) tabBackupBtn.classList.remove('active');
                tabTenantsContent.style.display = 'flex';
                if (tabUsersContent) tabUsersContent.style.display = 'none';
                if (tabBackupContent) tabBackupContent.style.display = 'none';
                
                renderPlatformTenants();
            });
        }

        // Global KPI indicators updater
        function updateAdminKPIs() {
            const uStat = document.getElementById('admin-stat-users');
            const sStat = document.getElementById('admin-stat-staff');
            const cStat = document.getElementById('admin-stat-customers');
            const bStat = document.getElementById('admin-stat-balance');
            
            const users = window.getSafeUsers ? window.getSafeUsers() : [];
            if (uStat) uStat.textContent = users.length;
            if (sStat) sStat.textContent = users.filter(u => u.role === 'Staff').length;
            
            let customers = [];
            try {
                customers = JSON.parse(localStorage.getItem('csc_csp_customers') || '[]');
            } catch (e) {}
            if (cStat) cStat.textContent = customers.length;
            
            let transactions = [];
            try {
                transactions = JSON.parse(localStorage.getItem('csc_csp_transactions') || '[]');
            } catch (e) {}
            let totalIncome = 0;
            let totalExpense = 0;
            transactions.forEach(tx => {
                const amt = parseFloat(tx.amount);
                if (!isNaN(amt)) {
                    if (tx.type === 'income') {
                        totalIncome += amt;
                    } else {
                        totalExpense += amt;
                    }
                }
            });
            let netBalance = totalIncome - totalExpense;
            if (bStat) {
                bStat.textContent = '₹' + netBalance.toFixed(2);
                if (netBalance >= 0) {
                    bStat.style.color = 'var(--success)';
                    bStat.style.webkitTextFillColor = 'var(--success)';
                } else {
                    bStat.style.color = 'var(--danger)';
                    bStat.style.webkitTextFillColor = 'var(--danger)';
                }
            }
        }
        window.updateAdminKPIs = updateAdminKPIs;

        // User Database Manager Table Rendering
        function renderAdminUsers() {
            const tableBody = document.getElementById('admin-users-table-body');
            if (!tableBody) return;
            
            const users = window.getSafeUsers ? window.getSafeUsers() : [];
            const activeUser = JSON.parse(localStorage.getItem('csc_active_user') || '{}');
            
            tableBody.innerHTML = '';
            
            if (users.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">No user records found.</td>
                    </tr>
                `;
                return;
            }
            
            users.forEach(user => {
                const roleBadge = user.role === 'Owner'
                    ? `<span class="badge badge-role-owner"><i data-lucide="crown" style="width: 12px; height: 12px; vertical-align: middle; margin-right: 4px;"></i>Owner</span>`
                    : `<span class="badge badge-role-staff"><i data-lucide="user" style="width: 12px; height: 12px; vertical-align: middle; margin-right: 4px;"></i>Staff</span>`;
                
                const isSelf = user.id === activeUser.id;
                const isDefaultOwner = user.id === 'user_owner';
                
                const deleteButton = (isSelf || isDefaultOwner)
                    ? `<span style="color: var(--text-muted); font-size: 11px; font-weight: 600;">Protected</span>`
                    : `<button class="table-action-btn del-btn admin-del-user-btn" data-id="${user.id}" style="padding: 4px 8px; font-size: 12px;">Delete</button>`;
                
                const editPinButton = `<button class="table-action-btn edit-pin-btn" data-id="${user.id}" style="padding: 4px 8px; font-size: 12px; background: var(--primary-gradient); color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 8px;">Edit PIN</button>`;
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td style="padding: 12px 16px; font-weight: 600; color: var(--text-main);">${user.name}</td>
                    <td style="padding: 12px 16px;">${roleBadge}</td>
                    <td style="padding: 12px 16px; color: var(--text-muted);">${user.email || '-'}</td>
                    <td style="padding: 12px 16px; color: var(--text-muted);">${user.mobile || '-'}</td>
                    <td style="padding: 12px 16px; text-align: center; font-family: monospace; font-weight: bold; color: var(--primary); letter-spacing: 2px;">${user.pin}</td>
                    <td style="padding: 12px 16px; text-align: center;">
                        ${editPinButton}
                        ${deleteButton}
                    </td>
                `;
                
                // Edit PIN click listener
                const editBtn = row.querySelector('.edit-pin-btn');
                if (editBtn) {
                    editBtn.addEventListener('click', () => {
                        let newPin = prompt(`Enter new security PIN for "${user.name}" (4-6 digits):`, user.pin);
                        if (newPin === null) return;
                        newPin = newPin.trim();
                        
                        if (newPin.length < 4 || newPin.length > 6 || isNaN(newPin)) {
                            alert('Invalid PIN! PIN must be a numeric value containing between 4 and 6 digits.');
                            return;
                        }
                        
                        let currentUsers = window.getSafeUsers ? window.getSafeUsers() : [];
                        const userIndex = currentUsers.findIndex(u => u.id === user.id);
                        if (userIndex !== -1) {
                            const pinExists = currentUsers.some((u, idx) => idx !== userIndex && u.role === user.role && u.pin === newPin);
                            if (pinExists) {
                                alert(`Error: A user with role "${user.role}" already uses this security PIN. Please choose a different PIN.`);
                                return;
                            }
                            
                            currentUsers[userIndex].pin = newPin;
                            localStorage.setItem('csc_users', JSON.stringify(currentUsers));
                            alert(`Security PIN for "${user.name}" has been successfully updated.`);
                            renderAdminUsers();
                            
                            if (window.loadStaffList) window.loadStaffList();
                        }
                    });
                }
                
                // Delete User click listener
                const delBtn = row.querySelector('.admin-del-user-btn');
                if (delBtn) {
                    delBtn.addEventListener('click', () => {
                        if (confirm(`Are you sure you want to permanently delete user account: "${user.name}"?`)) {
                            let currentUsers = window.getSafeUsers ? window.getSafeUsers() : [];
                            currentUsers = currentUsers.filter(u => u.id !== user.id);
                            localStorage.setItem('csc_users', JSON.stringify(currentUsers));
                            alert(`User account "${user.name}" has been deleted.`);
                            renderAdminUsers();
                            
                            updateAdminKPIs();
                            if (window.loadStaffList) window.loadStaffList();
                        }
                    });
                }
                
                tableBody.appendChild(row);
            });
            
            if (window.lucide) lucide.createIcons();
        }
        window.renderAdminUsers = renderAdminUsers;

        // Platform Retailers SaaS Rendering Logic
        function renderPlatformTenants() {
            const tableBody = document.getElementById('admin-tenants-table-body');
            if (!tableBody) return;
            
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 20px;">Fetching from central cloud registry...</td>
                </tr>
            `;

            if (window.cloudLoadAllTenants) {
                window.cloudLoadAllTenants(function(tenants) {
                    tableBody.innerHTML = '';
                    if (tenants.length === 0) {
                        tableBody.innerHTML = `
                            <tr>
                                <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 20px;">No registered platform retailers found.</td>
                            </tr>
                        `;
                        return;
                    }

                    tenants.forEach(tenant => {
                        const statusBadge = tenant.status === 'blocked'
                            ? `<span class="badge" style="background: rgba(244, 63, 94, 0.1); color: var(--danger); padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 11px;">Suspended</span>`
                            : `<span class="badge" style="background: rgba(16, 185, 129, 0.1); color: var(--success); padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 11px;">Active</span>`;

                        const joinedDate = tenant.registeredAt 
                            ? new Date(tenant.registeredAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '-';

                        const actionBtn = tenant.status === 'blocked'
                            ? `<button class="table-action-btn license-btn" data-email="${tenant.email}" data-action="activate" style="padding: 4px 8px; font-size: 12px; background: var(--success-gradient); color: white; border: none; border-radius: 4px; cursor: pointer;">Activate</button>`
                            : `<button class="table-action-btn license-btn" data-email="${tenant.email}" data-action="block" style="padding: 4px 8px; font-size: 12px; background: var(--danger-gradient); color: white; border: none; border-radius: 4px; cursor: pointer;">Suspend</button>`;

                        const finalAction = (tenant.email === 'help@smartspe.in' || tenant.email === 'owner@gmail.com' || tenant.id === 'user_owner')
                            ? `<span style="color: var(--text-muted); font-size: 11px;">Admin Protected</span>`
                            : actionBtn;

                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td style="padding: 12px 16px; font-weight: 600; color: var(--text-main);">${tenant.name}</td>
                            <td style="padding: 12px 16px; color: var(--text-main);">${tenant.shopName || '-'}</td>
                            <td style="padding: 12px 16px; color: var(--text-muted);">${tenant.email}</td>
                            <td style="padding: 12px 16px; color: var(--text-muted);">${tenant.mobile || '-'}</td>
                            <td style="padding: 12px 16px; text-align: center; color: var(--text-muted);">${joinedDate}</td>
                            <td style="padding: 12px 16px; text-align: center;">${statusBadge}</td>
                            <td style="padding: 12px 16px; text-align: center;">${finalAction}</td>
                        `;

                        const btn = row.querySelector('.license-btn');
                        if (btn) {
                            btn.addEventListener('click', () => {
                                const email = btn.getAttribute('data-email');
                                const act = btn.getAttribute('data-action');
                                const newStatus = act === 'block' ? 'blocked' : 'active';
                                if (confirm(`Are you sure you want to ${act} platform access for "${tenant.name}" (${tenant.shopName})?`)) {
                                    if (window.cloudUpdateTenantStatus) {
                                        window.cloudUpdateTenantStatus(email, newStatus, function(success) {
                                            if (success) {
                                                alert(`Retailer has been ${newStatus === 'blocked' ? 'suspended' : 'activated'} successfully.`);
                                                renderPlatformTenants();
                                            } else {
                                                alert('Failed to update status on the central database.');
                                            }
                                        });
                                    }
                                }
                            });
                        }

                        tableBody.appendChild(row);
                    });
                    if (window.lucide) lucide.createIcons();
                });
            }
        }

        // JSON Export (Backup)
        const exportBtn = document.getElementById('btn-admin-export');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                const keys = [
                    'csc_users', 'csc_csp_transactions', 'csc_csp_customers', 
                    'csc_csp_rates', 'csc_wallet_transactions', 'csc_processed_count', 
                    'csc_theme', 'csc_sidebar_collapsed', 'csc_profile_name', 
                    'csc_profile_retailer_id', 'csc_profile_shop_name', 'csc_profile_phone', 
                    'csc_profile_email', 'csc_profile_address', 'csc_profile_photo'
                ];
                const backupData = {};
                keys.forEach(k => {
                    const val = localStorage.getItem(k);
                    if (val !== null) {
                        backupData[k] = val;
                    }
                });
                
                const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const downloadAnchor = document.createElement('a');
                const dateStr = new Date().toISOString().slice(0, 10);
                downloadAnchor.href = url;
                downloadAnchor.download = `smartspe_backup_${dateStr}.json`;
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                document.body.removeChild(downloadAnchor);
                URL.revokeObjectURL(url);
            });
        }

        // JSON Import (Restore)
        const fileInput = document.getElementById('admin-restore-file-input');
        const restoreTrigger = document.getElementById('btn-admin-restore-trigger');
        const restoreFileName = document.getElementById('admin-restore-file-name');
        const restoreConfirm = document.getElementById('btn-admin-restore-confirm');
        
        if (restoreTrigger && fileInput) {
            restoreTrigger.addEventListener('click', () => {
                fileInput.click();
            });
        }
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    if (restoreFileName) restoreFileName.textContent = file.name;
                    if (restoreConfirm) {
                        restoreConfirm.removeAttribute('disabled');
                    }
                } else {
                    if (restoreFileName) restoreFileName.textContent = 'No file selected';
                    if (restoreConfirm) {
                        restoreConfirm.setAttribute('disabled', 'true');
                    }
                }
            });
        }
        
        if (restoreConfirm && fileInput) {
            restoreConfirm.addEventListener('click', () => {
                const file = fileInput.files[0];
                if (!file) return;
                
                if (!confirm('Are you sure you want to restore this backup? Current local data will be completely overwritten.')) {
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        const data = JSON.parse(e.target.result);
                        if (typeof data !== 'object' || data === null) {
                            throw new Error('Invalid backup format');
                        }
                        
                        // Restore keys
                        for (const [key, value] of Object.entries(data)) {
                            if (key.startsWith('csc_')) {
                                localStorage.setItem(key, value);
                            }
                        }
                        
                        alert('Database restored successfully! Reloading...');
                        window.location.reload();
                    } catch (err) {
                        alert('Error restoring backup: ' + err.message);
                    }
                };
                reader.readAsText(file);
            });
        }

        // Factory Reset
        const factoryResetBtn = document.getElementById('btn-admin-factory-reset');
        if (factoryResetBtn) {
            factoryResetBtn.addEventListener('click', () => {
                if (confirm('CRITICAL WARNING: Are you sure you want to FACTORY RESET the system? All bookkeeping entries, customer accounts, custom rates, registered users, and profile details will be permanently wiped.')) {
                    const keys = Object.keys(localStorage);
                    keys.forEach(k => {
                        if (k.startsWith('csc_')) {
                            localStorage.removeItem(k);
                        }
                    });
                    alert('System has been factory reset to default settings! Reloading...');
                    window.location.reload();
                }
            });
        }

        // Initial table load
        renderAdminUsers();
        updateAdminKPIs();
    }
    initAdminPanel();

    // 11. Collapsible Sidebar Logic
    const sidebarCollapseBtn = document.getElementById('sidebar-collapse-btn');
    const isSidebarCollapsed = localStorage.getItem('csc_sidebar_collapsed') === 'true';

    if (sidebar && isSidebarCollapsed) {
        sidebar.classList.add('collapsed');
    }

    if (sidebarCollapseBtn) {
        sidebarCollapseBtn.addEventListener('click', () => {
            if (sidebar) {
                sidebar.classList.toggle('collapsed');
                const collapsed = sidebar.classList.contains('collapsed');
                localStorage.setItem('csc_sidebar_collapsed', collapsed);
            }
        });
    }

});
