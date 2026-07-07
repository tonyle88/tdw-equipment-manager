const state = {
    assets: [],
    settings: [],
    departments: [],
    maintenanceLogs: [],
    inventoryMovements: [],
    softwareLicenses: [],
    filtered: [],
    selectedId: null,
    page: 1,
    pageSize: 13,
    activeView: "overview",
    isSaving: false,
    editingSettingId: "",
    editingUserId: "",
    authToken: "",
    currentUser: null,
    users: [],
    usersLoaded: false,
    usersLoading: null,
    usersError: "",
    dialogResolve: null,
  };

  const AUTH_STORAGE_KEY = "tdw_equipment_auth_token";
  const REMEMBER_USERNAME_KEY = "tdw_equipment_remember_username";

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[char]));
  }

  function safeClass(value) {
    return String(value ?? "").replace(/[^A-Za-z0-9_-]/g, "");
  }


  function formatDate(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return text;
    return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function formatMoney(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    const amount = Number(text.replace(/[^\d.-]/g, ""));
    if (Number.isNaN(amount)) return text;
    return `${amount.toLocaleString("en-US")} VND`;
  }

  const fallbackLabels = {
    asset_group: {
      MAY_TINH_LAPTOP: "Máy tính - Laptop",
      SCADA_LOGGER_DATA: "SCADA - Logger - Data TDW",
      O_CUNG_THIET_BI_DIEN_TU: "Ổ cứng - Thiết bị điện tử",
      MAY_IN_PHOTOCOPY_MAY_CHIEU_TV_DIEN_THOAI: "Máy in - Photocopy - Máy chiếu - TV - Điện thoại",
      LUU_KHO_KEM_PHAM_CHAT: "Thiết bị lưu kho - Kém phẩm chất",
    },
    status: {
      CON_SU_DUNG: "Còn sử dụng",
      MOI_100: "Mới 100%",
      KEM_PHAM_CHAT: "Kém phẩm chất",
      KHONG_SU_DUNG: "Không sử dụng",
      LUU_KHO_THANH_LY: "Lưu kho/thanh lý",
      CAN_KIEM_TRA: "Cần kiểm tra",
    },
  };

  const settingTypes = {
    asset_group: "Nhóm thiết bị",
    status: "Tình trạng",
    asset_type: "Loại thiết bị",
    maintenance_type: "Loại bảo trì",
  };

  const els = {};

  function collectElements() {
    Object.assign(els, {
      metrics: document.querySelector("#metrics"),
      appShell: document.querySelector("#appShell"),
      authHeader: document.querySelector("#authHeader"),
      bootScreen: document.querySelector("#bootScreen"),
      loginScreen: document.querySelector("#loginScreen"),
      loginForm: document.querySelector("#loginForm"),
      loginError: document.querySelector("#loginError"),
      loginStatus: document.querySelector("#loginStatus"),
      loginSubmit: document.querySelector("#loginSubmit"),
      loginSubmitText: document.querySelector("#loginSubmitText"),
      loginUsername: document.querySelector("#loginUsername"),
      loginPassword: document.querySelector("#loginPassword"),
      rememberLogin: document.querySelector("#rememberLogin"),
      togglePassword: document.querySelector("#togglePassword"),
      toastStack: document.querySelector("#toastStack"),
      loginLogo: document.querySelector(".login-logo"),
      brandLogo: document.querySelector(".brand-logo"),
      passwordChangeModal: document.querySelector("#passwordChangeModal"),
      passwordChangeForm: document.querySelector("#passwordChangeForm"),
      passwordChangeError: document.querySelector("#passwordChangeError"),
      passwordChangeLogout: document.querySelector("#passwordChangeLogout"),
      passwordChangeSubmit: document.querySelector("#passwordChangeSubmit"),
      toolbar: document.querySelector(".toolbar"),
      content: document.querySelector("#mainContent"),
      rows: document.querySelector("#assetRows"),
      detail: document.querySelector("#assetDetail"),
      search: document.querySelector("#searchInput"),
      group: document.querySelector("#groupFilter"),
      year: document.querySelector("#yearFilter"),
      department: document.querySelector("#departmentFilter"),
      status: document.querySelector("#statusFilter"),
      filterCount: document.querySelector("#filterCount"),
      resultCount: document.querySelector("#resultCount"),
      pagination: document.querySelector("#pagination"),
      dataSource: document.querySelector("#dataSource"),
      modal: document.querySelector("#assetModal"),
      form: document.querySelector("#assetForm"),
      formTitle: document.querySelector("#assetFormTitle"),
      addButton: document.querySelector("#addAssetButton"),
      logoutButton: document.querySelector("#logoutButton"),
      currentUserChip: document.querySelector("#currentUserChip"),
      closeModal: document.querySelector("#closeAssetModal"),
      cancelForm: document.querySelector("#cancelAssetForm"),
      saveButton: document.querySelector("#saveAssetButton"),
      settingModal: document.querySelector("#settingModal"),
      settingForm: document.querySelector("#settingForm"),
      settingFormTitle: document.querySelector("#settingFormTitle"),
      closeSettingModal: document.querySelector("#closeSettingModal"),
      cancelSettingForm: document.querySelector("#cancelSettingForm"),
      userModal: document.querySelector("#userModal"),
      userForm: document.querySelector("#userForm"),
      userFormTitle: document.querySelector("#userFormTitle"),
      closeUserModal: document.querySelector("#closeUserModal"),
      cancelUserForm: document.querySelector("#cancelUserForm"),
      maintenanceLogModal: document.querySelector("#maintenanceLogModal"),
      maintenanceLogForm: document.querySelector("#maintenanceLogForm"),
      maintenanceLogGroupFilter: document.querySelector("#maintenanceLogGroupFilter"),
      closeMaintenanceLogModal: document.querySelector("#closeMaintenanceLogModal"),
      cancelMaintenanceLogForm: document.querySelector("#cancelMaintenanceLogForm"),
      softwareLicenseModal: document.querySelector("#softwareLicenseModal"),
      softwareLicenseForm: document.querySelector("#softwareLicenseForm"),
      closeSoftwareLicenseModal: document.querySelector("#closeSoftwareLicenseModal"),
      cancelSoftwareLicenseForm: document.querySelector("#cancelSoftwareLicenseForm"),
      movementLogModal: document.querySelector("#movementLogModal"),
      movementLogForm: document.querySelector("#movementLogForm"),
      closeMovementLogModal: document.querySelector("#closeMovementLogModal"),
      cancelMovementLogForm: document.querySelector("#cancelMovementLogForm"),
      departmentModal: document.querySelector("#departmentModal"),
      departmentForm: document.querySelector("#departmentForm"),
      closeDepartmentModal: document.querySelector("#closeDepartmentModal"),
      cancelDepartmentForm: document.querySelector("#cancelDepartmentForm"),
      departmentFormTitle: document.querySelector("#departmentFormTitle"),
      systemModal: document.querySelector("#systemModal"),
      systemModalForm: document.querySelector("#systemModalForm"),
      systemModalEyebrow: document.querySelector("#systemModalEyebrow"),
      systemModalTitle: document.querySelector("#systemModalTitle"),
      systemModalMessage: document.querySelector("#systemModalMessage"),
      systemModalInputWrap: document.querySelector("#systemModalInputWrap"),
      systemModalInputLabel: document.querySelector("#systemModalInputLabel"),
      systemModalInput: document.querySelector("#systemModalInput"),
      systemModalCancel: document.querySelector("#systemModalCancel"),
      systemModalConfirm: document.querySelector("#systemModalConfirm"),
      navLinks: [...document.querySelectorAll(".nav-pills [data-view]")],
    });
    if (els.loginLogo && els.brandLogo) els.loginLogo.src = els.brandLogo.src;
  }

  async function callServer(fn, ...args) {
    const serverArgs = fn === "loginUser" ? args : [...args, state.authToken];
    const response = await fetch(window.TDW_ASSET_CONFIG.apiProxyUrl || "/api/google-script", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fn, args: serverArgs }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || `API proxy lỗi ${response.status}`);
    if (!payload || payload.ok === false) throw new Error(payload?.error || "API xử lý không thành công");
    return payload;
  }

  async function loadAppData() {
    const payload = await callServer("getAppData");
    if (payload.currentUser) state.currentUser = payload.currentUser;
    state.settings = normalizeSettings(payload.settings || []);
    state.departments = payload.departments || [];
    state.assets = sortAssets(
      (payload.assets || []).map((a) => {
        a.costStr = formatMoney(a.unit_price);
        return a;
      }),
    );
    state.maintenanceLogs = (payload.maintenanceLogs || []).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    state.inventoryMovements = (payload.inventoryMovements || []).sort((a, b) => new Date(b.movement_date || 0) - new Date(a.movement_date || 0));
    state.softwareLicenses = payload.softwareLicenses || [];
  }

  function isAdmin() {
    return state.currentUser?.role === "admin";
  }

  function canEditAssets() {
    const permissions = String(state.currentUser?.permissions || "").toLowerCase();
    return isAdmin() || permissions === "all" || permissions.split(",").map((item) => item.trim()).includes("edit");
  }

  function setAuthToken(token) {
    state.authToken = token || "";
    if (state.authToken) localStorage.setItem(AUTH_STORAGE_KEY, state.authToken);
    else localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  function showLogin(error = "") {
    if (els.authHeader) els.authHeader.hidden = false;
    if (els.bootScreen) els.bootScreen.hidden = true;
    if (els.appShell) els.appShell.hidden = true;
    if (els.loginScreen) els.loginScreen.hidden = false;
    if (els.passwordChangeModal) els.passwordChangeModal.hidden = true;
    setLoginBusy(false);
    if (els.loginError) {
      els.loginError.hidden = !error;
      els.loginError.textContent = error;
    }
  }

  function showApp() {
    if (els.authHeader) els.authHeader.hidden = true;
    if (els.bootScreen) els.bootScreen.hidden = true;
    if (els.loginScreen) els.loginScreen.hidden = true;
    if (els.passwordChangeModal) els.passwordChangeModal.hidden = true;
    if (els.appShell) els.appShell.hidden = false;
    updateUserChrome();
  }

  function showPasswordChange() {
    if (els.authHeader) els.authHeader.hidden = false;
    if (els.bootScreen) els.bootScreen.hidden = true;
    if (els.loginScreen) els.loginScreen.hidden = true;
    if (els.appShell) els.appShell.hidden = true;
    if (els.passwordChangeError) els.passwordChangeError.hidden = true;
    if (els.passwordChangeForm) els.passwordChangeForm.reset();
    if (els.passwordChangeModal) els.passwordChangeModal.hidden = false;
  }

  function setLoginBusy(isBusy) {
    if (els.loginSubmit) els.loginSubmit.disabled = isBusy;
    if (els.loginSubmitText) els.loginSubmitText.textContent = isBusy ? "Đang đăng nhập..." : "↪ Đăng nhập";
    if (els.loginStatus) els.loginStatus.hidden = !isBusy;
    if (els.loginForm) {
      [...els.loginForm.elements].forEach((field) => {
        if (field !== els.loginSubmit) field.disabled = isBusy;
      });
    }
  }

  function hydrateLoginMemory() {
    const remembered = localStorage.getItem(REMEMBER_USERNAME_KEY) || "";
    if (els.loginUsername && remembered) els.loginUsername.value = remembered;
    if (els.rememberLogin) els.rememberLogin.checked = Boolean(remembered) || els.rememberLogin.checked;
  }

  function showToast(title, message = "", type = "success") {
    if (!els.toastStack) return;
    const icons = { success: "✓", error: "✕", info: "ℹ" };
    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || "✓"}</div>
      <div>
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(message)}</span>
      </div>
    `;
    els.toastStack.appendChild(toast);
    window.setTimeout(() => {
      toast.classList.add("is-hiding");
      toast.addEventListener("animationend", () => toast.remove(), { once: true });
    }, 3000);
  }

  function showSystemModal({ eyebrow = "THÔNG BÁO", title, message, confirmText = "Đồng ý", cancelText = "", inputLabel = "", inputType = "text" }) {
    if (!els.systemModal) return Promise.resolve(false);
    if (els.systemModalEyebrow) els.systemModalEyebrow.textContent = eyebrow;
    if (els.systemModalTitle) els.systemModalTitle.textContent = title;
    if (els.systemModalMessage) els.systemModalMessage.textContent = message || "";
    if (els.systemModalConfirm) els.systemModalConfirm.textContent = confirmText;
    if (els.systemModalCancel) {
      els.systemModalCancel.textContent = cancelText || "Hủy";
      els.systemModalCancel.hidden = !cancelText;
    }
    if (els.systemModalInputWrap && els.systemModalInput) {
      const hasInput = Boolean(inputLabel);
      els.systemModalInputWrap.hidden = !hasInput;
      els.systemModalInput.required = hasInput;
      els.systemModalInput.value = "";
      els.systemModalInput.type = inputType;
      if (els.systemModalInputLabel) els.systemModalInputLabel.textContent = inputLabel;
    }
    els.systemModal.hidden = false;
    if (inputLabel) window.setTimeout(() => els.systemModalInput?.focus(), 0);
    return new Promise((resolve) => {
      state.dialogResolve = resolve;
    });
  }

  function closeSystemModal(value) {
    if (els.systemModal) els.systemModal.hidden = true;
    const resolve = state.dialogResolve;
    state.dialogResolve = null;
    if (resolve) resolve(value);
  }

  function showMessageModal(title, message) {
    return showSystemModal({ title, message, confirmText: "Đã hiểu" });
  }

  function showConfirmModal(title, message, confirmText = "Đồng ý") {
    return showSystemModal({ title, message, confirmText, cancelText: "Hủy" });
  }

  function showInputModal(title, message, inputLabel, inputType = "text") {
    return showSystemModal({ title, message, inputLabel, inputType, confirmText: "Lưu", cancelText: "Hủy" });
  }

  function updateUserChrome() {
    if (els.currentUserChip) els.currentUserChip.textContent = state.currentUser ? `${state.currentUser.full_name} · ${state.currentUser.role}` : "";
    document.querySelectorAll("[data-admin-only]").forEach((node) => {
      node.hidden = !isAdmin();
    });
    if (els.addButton) els.addButton.hidden = !canEditAssets();
  }

  async function handleLogin(event) {
    event.preventDefault();
    if (els.loginError) els.loginError.hidden = true;
    const credentials = Object.fromEntries(new FormData(event.target).entries());
    setLoginBusy(true);
    try {
      const payload = await callServer("loginUser", credentials);
      if (els.rememberLogin?.checked) localStorage.setItem(REMEMBER_USERNAME_KEY, String(credentials.username || ""));
      else localStorage.removeItem(REMEMBER_USERNAME_KEY);
      setAuthToken(payload.token);
      state.currentUser = payload.user;
      if (state.currentUser?.must_change_password) {
        setLoginBusy(false);
        showPasswordChange();
        return;
      }
      await startApp();
      showToast("Đăng nhập thành công", `Xin chào ${state.currentUser?.full_name || "TDW"}`);
    } catch (error) {
      setLoginBusy(false);
      showLogin(error.message);
    }
  }

  async function handleLogout() {
    const token = state.authToken;
    if (token) {
      try {
        await callServer("logoutUser");
      } catch (error) {
        console.warn("Không thể hủy phiên trên server", error);
      }
    }
    setAuthToken("");
    state.currentUser = null;
    state.users = [];
    state.usersLoaded = false;
    state.usersLoading = null;
    state.usersError = "";
    showLogin();
  }

  async function handlePasswordChange(event) {
    event.preventDefault();
    const form = event.target;
    const data = Object.fromEntries(new FormData(form).entries());
    if (data.new_password !== data.confirm_password) {
      if (els.passwordChangeError) {
        els.passwordChangeError.textContent = "Mật khẩu nhập lại chưa khớp";
        els.passwordChangeError.hidden = false;
      }
      return;
    }
    if (els.passwordChangeSubmit) els.passwordChangeSubmit.disabled = true;
    try {
      const payload = await callServer("changeOwnPassword", data.new_password);
      state.currentUser = payload.user || { ...state.currentUser, must_change_password: false };
      showToast("Đã đổi mật khẩu", "Tài khoản đã được cập nhật bảo mật");
      await startApp();
    } catch (error) {
      if (els.passwordChangeError) {
        els.passwordChangeError.textContent = error.message;
        els.passwordChangeError.hidden = false;
      }
    } finally {
      if (els.passwordChangeSubmit) els.passwordChangeSubmit.disabled = false;
    }
  }

  async function startApp() {
    await loadAppData();
    if (state.currentUser?.must_change_password) {
      showPasswordChange();
      return;
    }
    els.dataSource.textContent = "Google Sheet";
    fillFilters();
    fillFormSelects();
    renderMetrics();
    showApp();
    renderDeviceView("overview");
    if (isAdmin()) preloadUsers().catch(() => null);
  }

  function preloadUsers({ force = false } = {}) {
    if (!isAdmin()) return Promise.resolve([]);
    if (state.usersLoaded && !force) return Promise.resolve(state.users);
    if (state.usersLoading) return state.usersLoading;
    state.usersError = "";
    state.usersLoading = callServer("listUsers")
      .then((payload) => {
        state.users = payload.users || [];
        state.usersLoaded = true;
        state.usersError = "";
        return state.users;
      })
      .catch((error) => {
        state.usersError = error.message;
        throw error;
      })
      .finally(() => {
        state.usersLoading = null;
      });
    return state.usersLoading;
  }

  function normalizeAssets(rows) {
    return rows.map((asset, index) => ({
      ...asset,
      asset_id: asset.asset_id || `asset_${index + 1}`,
      asset_code: asset.asset_code || "",
      asset_name: asset.asset_name || "",
      asset_group: asset.asset_group || "",
      asset_group_label: asset.asset_group_label || labelFor("asset_group", asset.asset_group),
      asset_type: asset.asset_type || "",
      brand: asset.brand || "",
      serial_number: asset.serial_number || "",
      purchase_year: asset.purchase_year || "",
      quantity: asset.quantity || "",
      unit_price: asset.unit_price || "",
      location: asset.location || "",
      assigned_to: asset.assigned_to || "",
      department: asset.department || "",
      warranty_end_date: asset.warranty_end_date || "",
      last_maintenance_date: asset.last_maintenance_date || "",
      software_license: asset.software_license || "",
      status: asset.status || "",
      note: asset.note || "",
      source_row: asset.source_row || "",
      created_at: asset.created_at || "",
      updated_at: asset.updated_at || "",
    }));
  }

  function normalizeSettings(rows) {
    const normalized = rows.map((setting, index) => ({
      setting_id: setting.setting_id || `${setting.setting_type || "setting"}_${index + 1}`,
      setting_type: setting.setting_type || "",
      setting_value: setting.setting_value || "",
      display_name: setting.display_name || setting.setting_value || "",
      sort_order: Number(setting.sort_order || 999),
      active: String(setting.active || "TRUE").toUpperCase() !== "FALSE",
    }));

    Object.entries(fallbackLabels).forEach(([type, items]) => {
      Object.entries(items).forEach(([value, label], index) => {
        if (!normalized.some((item) => item.setting_type === type && item.setting_value === value)) {
          normalized.push({
            setting_id: `${type}_${value}`,
            setting_type: type,
            setting_value: value,
            display_name: label,
            sort_order: index + 1,
            active: true,
          });
        }
      });
    });

    return normalized;
  }

  function sortAssets(assets) {
    return [...assets].sort((a, b) => {
      const yearA = Number(String(a.purchase_year || "").replace(/\D/g, "")) || 0;
      const yearB = Number(String(b.purchase_year || "").replace(/\D/g, "")) || 0;
      if (yearA !== yearB) return yearB - yearA;
      const dateA = Date.parse(a.created_at || a.updated_at || "") || 0;
      const dateB = Date.parse(b.created_at || b.updated_at || "") || 0;
      if (dateA !== dateB) return dateB - dateA;
      return Number(a.source_row || 0) - Number(b.source_row || 0);
    });
  }

  function labelFor(type, value) {
    const setting = state.settings.find((item) => item.setting_type === type && item.setting_value === value && item.active);
    return setting?.display_name || fallbackLabels[type]?.[value] || value || "";
  }

  function departmentLabel(departmentValue) {
    const dept = state.departments.find((d) => d.department_name === departmentValue || d.department_id === departmentValue);
    return dept ? dept.department_name : departmentValue;
  }

  function settingOptions(type, extraValues = []) {
    const base = state.settings
      .filter((item) => item.setting_type === type && item.active)
      .map((item) => [item.setting_value, item.display_name, item.sort_order]);

    extraValues.filter(Boolean).forEach((value) => {
      if (!base.some(([existing]) => existing === value)) base.push([value, value, 999]);
    });

    return base.sort((a, b) => a[2] - b[2] || a[1].localeCompare(b[1], "vi")).map(([value, label]) => [value, label]);
  }

  function fillSelect(select, options, allLabel) {
    select.innerHTML = "";
    if (allLabel) select.append(new Option(allLabel, ""));
    options.forEach(([value, label]) => select.append(new Option(label, value)));
  }

  function fillFilters() {
    fillSelect(els.group, settingOptions("asset_group", state.assets.map((asset) => asset.asset_group)), "Tất cả nhóm");
    fillSelect(els.year, uniqueValues(state.assets.map((asset) => asset.purchase_year)).map((value) => [value, value]), "Tất cả năm");
    fillSelect(els.department, settingOptions("department", state.assets.map((asset) => asset.department)), "Tất cả bộ phận");
    fillSelect(els.status, settingOptions("status", state.assets.map((asset) => asset.status)), "Tất cả tình trạng");
  }

  function uniqueValues(values) {
    return [...new Set(values.filter(Boolean).map(String))].sort((a, b) => b.localeCompare(a, "vi", { numeric: true }));
  }

  function fillFormSelects() {
    fillSelect(els.form.elements.asset_group, settingOptions("asset_group"), "");
    fillSelect(els.form.elements.status, settingOptions("status"), "");
    fillSelect(els.form.elements.asset_type, settingOptions("asset_type"), "Chọn loại thiết bị");
    fillSelect(els.form.elements.department, settingOptions("department"), "Chọn phòng ban");
    fillSelect(els.form.elements.software_license, settingOptions("software_name"), "Chọn phần mềm");
  }

  function renderMetrics() {
    const total = state.assets.length;
    const inUse = state.assets.filter((asset) => ["CON_SU_DUNG", "MOI_100"].includes(asset.status)).length;
    const poor = state.assets.filter((asset) => asset.status === "KEM_PHAM_CHAT").length;
    const inactive = state.assets.filter((asset) => ["KHONG_SU_DUNG", "LUU_KHO_THANH_LY"].includes(asset.status)).length;
    const groups = new Set(state.assets.map((asset) => asset.asset_group)).size;
    const metrics = [
      ["Tổng thiết bị", total, "Từ Google Sheet"],
      ["Đang sử dụng", inUse, "Thiết bị hoạt động"],
      ["Kém phẩm chất", poor, "Cần theo dõi"],
      ["Không sử dụng/lưu kho", inactive, "Chờ xử lý"],
      ["Nhóm thiết bị", groups, "Danh mục quản lý"],
    ];
    els.metrics.innerHTML = metrics.map(([label, value, hint]) => `
      <article class="metric"><div class="label">${label}</div><div class="value">${value}</div><div class="hint">${hint}</div></article>
    `).join("");
  }

  function normalize(value) {
    return String(value || "").toLowerCase();
  }

  function applyFilters({ resetPage = true } = {}) {
    const keyword = normalize(els.search?.value);
    const group = els.group?.value || "";
    const year = els.year?.value || "";
    const department = els.department?.value || "";
    const status = els.status?.value || "";
    state.filtered = state.assets.filter((asset) => {
      const searchText = normalize([asset.asset_code, asset.asset_name, asset.asset_group_label, asset.serial_number, asset.location, asset.assigned_to, departmentLabel(asset.department), asset.software_license, asset.note].join(" "));
      return (
        (!keyword || searchText.includes(keyword)) &&
        (!group || asset.asset_group === group) &&
        (!year || String(asset.purchase_year) === year) &&
        (!department || asset.department === department) &&
        (!status || asset.status === status)
      );
    });
    if (resetPage) state.page = 1;
    const maxPage = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
    state.page = Math.min(state.page, maxPage);
    if (els.filterCount) els.filterCount.textContent = [keyword, group, year, department, status].filter(Boolean).length;
    if (els.resultCount) els.resultCount.textContent = `${state.filtered.length} thiết bị`;
    renderRows();
    renderPagination();
    if (state.activeView === "overview") renderDashboardInsights();
  }

  function getVisibleRows() {
    const start = (state.page - 1) * state.pageSize;
    return state.filtered.slice(start, start + state.pageSize);
  }

  function renderRows() {
    if (!els.rows) return;
    const visibleRows = getVisibleRows();
    if (!visibleRows.length) {
      els.rows.innerHTML = `<tr><td colspan="7" class="muted">Không có thiết bị phù hợp bộ lọc.</td></tr>`;
      return;
    }
    els.rows.innerHTML = visibleRows.map((asset) => `
      <tr data-id="${escapeHtml(asset.asset_id)}" class="${asset.asset_id === state.selectedId ? "selected" : ""}">
        <td>${escapeHtml(asset.asset_code)}</td>
        <td class="asset-name">${escapeHtml(asset.asset_name || "")}</td>
        <td>${escapeHtml(asset.asset_group_label || "")}</td>
        <td>${escapeHtml(asset.purchase_year || "")}</td>
        <td>${escapeHtml([asset.assigned_to, departmentLabel(asset.department)].filter(Boolean).join(" / "))}</td>
        <td>${escapeHtml(asset.software_license || "")}</td>
        <td><span class="badge ${safeClass(asset.status)}">${escapeHtml(labelFor("status", asset.status) || "Chưa rõ")}</span></td>
      </tr>
    `).join("");
  }

  function renderPagination() {
    if (!els.pagination) return;
    const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
    const start = state.filtered.length ? (state.page - 1) * state.pageSize + 1 : 0;
    const end = Math.min(state.page * state.pageSize, state.filtered.length);
    const pageButtons = Array.from({ length: totalPages }, (_, index) => index + 1)
      .filter((page) => totalPages <= 7 || page === 1 || page === totalPages || Math.abs(page - state.page) <= 1)
      .map((page, index, pages) => `${index > 0 && page - pages[index - 1] > 1 ? `<span>...</span>` : ""}<button class="page-button ${page === state.page ? "active" : ""}" data-page="${page}" type="button">${page}</button>`)
      .join("");
    els.pagination.innerHTML = `
      <span>Hiển thị ${start}-${end} / ${state.filtered.length} thiết bị</span>
      <div class="page-buttons">
        <button class="page-button" data-page-prev type="button" ${state.page <= 1 ? "disabled" : ""}>‹</button>
        ${pageButtons}
        <button class="page-button" data-page-next type="button" ${state.page >= totalPages ? "disabled" : ""}>›</button>
      </div>
    `;
  }

  function renderDetail(asset) {
    if (!els.detail) return;
    if (!asset) {
      els.detail.innerHTML = `<p class="muted">Chọn một thiết bị để xem chi tiết.</p>`;
      return;
    }
    els.detail.innerHTML = `
      <span class="badge ${safeClass(asset.status)}">${escapeHtml(labelFor("status", asset.status) || "Chưa rõ")}</span>
      <h2>${escapeHtml(asset.asset_name || "Thiết bị chưa đặt tên")}</h2>
      <p class="muted">${escapeHtml(asset.asset_code)}</p>
      <div class="detail-grid">
        <div class="mini-card"><span>Năm</span><strong>${escapeHtml(asset.purchase_year || "Chưa rõ")}</strong></div>
        <div class="mini-card"><span>Số lượng</span><strong>${escapeHtml(asset.quantity || "Chưa rõ")}</strong></div>
        <div class="mini-card"><span>Loại</span><strong>${escapeHtml(asset.asset_type || "Thiết bị")}</strong></div>
        <div class="mini-card"><span>Hãng</span><strong>${escapeHtml(asset.brand || "Chưa tách")}</strong></div>
        <div class="mini-card"><span>Serial</span><strong>${escapeHtml(asset.serial_number || "Chưa có")}</strong></div>
        <div class="mini-card"><span>Đơn giá</span><strong>${escapeHtml(formatMoney(asset.unit_price) || "Chưa có")}</strong></div>
        <div class="mini-card"><span>Hết bảo hành</span><strong>${escapeHtml(formatDate(asset.warranty_end_date) || "Chưa có")}</strong></div>
        <div class="mini-card"><span>Bảo trì gần nhất</span><strong>${escapeHtml(formatDate(asset.last_maintenance_date) || "Chưa có")}</strong></div>
      </div>
      <dl>
        <div><dt>Nhóm</dt><dd>${escapeHtml(asset.asset_group_label || "")}</dd></div>
        <div><dt>Vị trí</dt><dd>${escapeHtml(asset.location || "Chưa có dữ liệu")}</dd></div>
        <div><dt>Người dùng</dt><dd>${escapeHtml(asset.assigned_to || "Chưa có dữ liệu")}</dd></div>
        <div><dt>Phòng ban</dt><dd>${escapeHtml(departmentLabel(asset.department) || "Chưa có dữ liệu")}</dd></div>
        <div><dt>Phần mềm</dt><dd>${escapeHtml(asset.software_license || "Không có dữ liệu")}</dd></div>
        <div><dt>Ghi chú</dt><dd>${escapeHtml(asset.note || "Không có ghi chú")}</dd></div>
      </dl>
      
      <div class="maintenance-logs-section" style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border-color);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="margin: 0; font-size: 14px; font-weight: bold;">LỊCH SỬ LUÂN CHUYỂN</h3>
          ${canEditAssets() ? `<button class="secondary-button" type="button" data-add-movement="${escapeHtml(asset.asset_id)}" style="padding: 4px 8px; font-size: 12px;">+ Ghi nhận</button>` : ""}
        </div>
        ${renderMovementLogsTable(asset.asset_id)}
      </div>

      <div class="maintenance-logs-section" style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border-color);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="margin: 0; font-size: 14px; font-weight: bold;">PHẦN MỀM ĐÃ CÀI</h3>
          ${canEditAssets() ? `<button class="secondary-button" type="button" data-add-software="${escapeHtml(asset.asset_id)}" style="padding: 4px 8px; font-size: 12px;">+ Gán phần mềm</button>` : ""}
        </div>
        ${renderAssetSoftwareTable(asset.asset_id)}
      </div>

      <div class="maintenance-logs-section" style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border-color);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="margin: 0; font-size: 14px; font-weight: bold;">LỊCH SỬ BẢO TRÌ</h3>
          ${canEditAssets() ? `<button class="secondary-button" type="button" data-add-log="${escapeHtml(asset.asset_id)}" style="padding: 4px 8px; font-size: 12px;">+ Ghi nhận</button>` : ""}
        </div>
        ${renderMaintenanceLogsTable(asset.asset_id)}
      </div>

      ${canEditAssets() ? `<div class="detail-actions">
        <button class="secondary-button detail-action-button" type="button" data-edit-asset="${escapeHtml(asset.asset_id)}">✎ Sửa</button>
        <button class="danger-button detail-action-button" type="button" data-delete-asset="${escapeHtml(asset.asset_id)}">× Xóa</button>
      </div>` : ""}
    `;

    els.detail.querySelectorAll("[data-add-log]").forEach(btn => {
      btn.addEventListener("click", (e) => openMaintenanceLogModal(e.target.dataset.addLog));
    });
    els.detail.querySelectorAll("[data-add-movement]").forEach(btn => {
      btn.addEventListener("click", (e) => openMovementLogModal(e.target.dataset.addMovement));
    });
    els.detail.querySelectorAll("[data-add-software]").forEach(btn => {
      btn.addEventListener("click", (e) => openSoftwareLicenseModal(null, e.target.dataset.addSoftware));
    });
  }

  function renderMovementLogsTable(assetId) {
    const logs = (state.inventoryMovements || []).filter(log => log.asset_id === assetId);
    if (!logs.length) return `<p class="muted" style="font-size: 13px;">Chưa có lịch sử luân chuyển.</p>`;
    return `
      <table class="mini-table" style="width: 100%; font-size: 13px;">
        <thead>
          <tr><th style="padding: 4px 0">Ngày</th><th style="padding: 4px 0">Đến ND</th><th style="padding: 4px 0">Đến VT</th><th style="padding: 4px 0">Lý do</th></tr>
        </thead>
        <tbody>
          ${logs.map(log => `<tr><td style="padding: 8px 0">${escapeHtml(formatDate(log.movement_date))}</td><td style="padding: 8px 0">${escapeHtml(log.to_user)}</td><td style="padding: 8px 0">${escapeHtml(log.to_location)}</td><td style="padding: 8px 0">${escapeHtml(log.reason)}</td></tr>`).join('')}
        </tbody>
      </table>
    `;
  }

  function renderAssetSoftwareTable(assetId) {
    const logs = (state.softwareLicenses || []).filter(log => log.assigned_asset_id === assetId);
    if (!logs.length) return `<p class="muted" style="font-size: 13px;">Chưa có phần mềm nào gán vào thiết bị này.</p>`;
    return `
      <table class="mini-table" style="width: 100%; font-size: 13px;">
        <thead>
          <tr><th style="padding: 4px 0">Phần mềm</th><th style="padding: 4px 0">Key</th><th style="padding: 4px 0">Ngày hết hạn</th></tr>
        </thead>
        <tbody>
          ${logs.map(log => `<tr><td style="padding: 8px 0; font-weight:500;">${escapeHtml(log.software_name)} ${escapeHtml(log.version)}</td><td style="padding: 8px 0"><code style="background: var(--bg-hover); padding: 2px 4px; border-radius: 4px;">${escapeHtml(log.license_key)}</code></td><td style="padding: 8px 0">${escapeHtml(formatDate(log.expiry_date))}</td></tr>`).join('')}
        </tbody>
      </table>
    `;
  }

  function renderMaintenanceLogsTable(assetId) {
    const logs = (state.maintenanceLogs || []).filter(log => log.asset_id === assetId);
    if (!logs.length) return `<p class="muted" style="font-size: 13px;">Chưa có lịch sử bảo trì.</p>`;
    return `
      <table class="mini-table" style="width: 100%; font-size: 13px;">
        <thead>
          <tr><th style="padding: 4px 0">Ngày</th><th style="padding: 4px 0">Loại</th><th style="padding: 4px 0">Nội dung</th><th style="padding: 4px 0">Chi phí</th></tr>
        </thead>
        <tbody>
          ${logs.map(log => `<tr><td style="padding: 8px 0">${escapeHtml(formatDate(log.date))}</td><td style="padding: 8px 0">${escapeHtml(log.action_type)}</td><td style="padding: 8px 0">${escapeHtml(log.description)}</td><td style="padding: 8px 0; font-weight: 500;">${escapeHtml(formatMoney(log.cost))}</td></tr>`).join('')}
        </tbody>
      </table>
    `;
  }

  function openAssetModal(asset = null) {
    fillFormSelects();
    els.form.reset();
    els.formTitle.textContent = asset ? "Sửa thiết bị" : "Thêm thiết bị";
    const values = asset || { status: "CON_SU_DUNG", asset_group: "MAY_TINH_LAPTOP", quantity: "1" };
    [...els.form.elements].forEach((field) => {
      if (field.name) field.value = values[field.name] || "";
    });
    els.modal.hidden = false;
  }

  function closeAssetModal() {
    els.modal.hidden = true;
    els.form.reset();
  }

  function getFormAsset() {
    const data = Object.fromEntries(new FormData(els.form).entries());
    data.asset_group_label = labelFor("asset_group", data.asset_group);
    return data;
  }

  function setModalBusy(modal, isBusy) {
    const buttons = modal.querySelectorAll("button");
    const inputs = modal.querySelectorAll("input, select, textarea");
    buttons.forEach((btn) => { btn.disabled = isBusy; });
    inputs.forEach((inp) => { inp.disabled = isBusy; });
  }

  async function handleAssetSubmit(event) {
    event.preventDefault();
    if (state.isSaving) return;
    const asset = getFormAsset(); // Đọc form TRƯỚC mọi thứ khác
    if (!asset.asset_name?.trim()) {
      showMessageModal("Thiếu thông tin", "Vui lòng nhập Tên thiết bị");
      return;
    }
    state.isSaving = true;
    const saveBtn = els.saveButton;
    const originalText = saveBtn.textContent;
    saveBtn.classList.add("is-loading");
    saveBtn.disabled = true;
    try {
      const isEdit = Boolean(asset.asset_id);
      await callServer("saveAsset", asset);
      showToast(isEdit ? "Đã cập nhật thiết bị" : "Đã thêm thiết bị", asset.asset_name || "Thiết bị TDW");
      closeAssetModal();
      await refreshAppData({ resetPage: !isEdit });
    } catch (error) {
      showMessageModal("Không thể lưu thiết bị", error.message);
    } finally {
      state.isSaving = false;
      saveBtn.classList.remove("is-loading");
      saveBtn.textContent = originalText;
      saveBtn.disabled = false;
    }
  }

  async function handleDeleteAsset(assetId) {
    const asset = state.assets.find((item) => item.asset_id === assetId);
    const confirmed = asset && await showConfirmModal("XÓA THIẾT BỊ", `Xóa thiết bị "${asset.asset_name}" khỏi danh sách hiển thị?`, "Xóa");
    if (!confirmed) return;
    // Disable delete button ngay lập tức
    const deleteBtn = els.detail?.querySelector(`[data-delete-asset="${assetId}"]`);
    if (deleteBtn) { deleteBtn.classList.add("is-loading"); deleteBtn.disabled = true; }
    try {
      await callServer("deleteAsset", assetId);
      showToast("Đã xóa thiết bị", asset.asset_name || "Thiết bị TDW");
      state.selectedId = null;
      await refreshAppData({ resetPage: true });
    } catch (error) {
      if (deleteBtn) { deleteBtn.classList.remove("is-loading"); deleteBtn.disabled = false; }
      showMessageModal("Không thể xóa thiết bị", error.message);
    }
  }

  async function refreshAppData({ resetPage = false } = {}) {
    await loadAppData();
    renderMetrics();
    fillFilters();
    if (state.activeView === "overview" || state.activeView === "devices") {
      applyFilters({ resetPage });
      renderDetail(state.assets.find((asset) => asset.asset_id === state.selectedId));
    }
    if (state.activeView === "maintenance") renderMaintenanceView();
    if (state.activeView === "software") renderSoftwareView();
    if (state.activeView === "reports") renderReportsView();
    if (state.activeView === "settings") renderSettingsView();
    if (state.activeView === "users") renderUsersView();
  }

  function setView(view) {
    if (view === "users" && !isAdmin()) {
      showMessageModal("Không đủ quyền", "Chỉ admin mới được vào trang người dùng");
      return;
    }
    if (view === "departments" && !isAdmin()) {
      showMessageModal("Không đủ quyền", "Chỉ admin mới được vào trang phòng ban");
      return;
    }
    state.activeView = view;
    els.navLinks.forEach((link) => link.classList.toggle("active", link.dataset.view === view));
    els.toolbar.style.display = view === "maintenance" || view === "software" || view === "departments" || view === "reports" || view === "settings" || view === "users" ? "none" : "";
    const dashboardInsights = document.querySelector("#dashboardInsights");
    if (dashboardInsights) dashboardInsights.hidden = view !== "overview";
    if (view === "overview" || view === "devices") renderDeviceView(view);
    if (view === "maintenance") renderMaintenanceView();
    if (view === "software") renderSoftwareView();
    if (view === "departments") renderDepartmentsView();
    if (view === "reports") renderReportsView();
    if (view === "settings") renderSettingsView();
    if (view === "users") renderUsersView();
  }

  function renderDeviceView(view) {
    els.content.innerHTML = `
      <div class="list-panel">
        <div class="panel-head"><h2>${view === "devices" ? "Quản lý thiết bị" : "Danh sách thiết bị"}</h2><span id="resultCount">0 thiết bị</span></div>
        <div class="table-wrap">
          <table class="assets-table">
            <thead><tr><th>Mã tài sản</th><th>Thiết bị</th><th>Nhóm</th><th>Năm</th><th>Người dùng</th><th>Phần mềm</th><th>Tình trạng</th></tr></thead>
            <tbody id="assetRows"></tbody>
          </table>
        </div>
        <div class="pagination" id="pagination"></div>
      </div>
      <aside class="detail" id="assetDetail"><p class="muted">Chọn một thiết bị để xem chi tiết.</p></aside>
    `;
    collectElements();
    bindDynamicEvents();
    applyFilters({ resetPage: false });
    if (view === "overview") renderDashboardInsights();
    renderDetail(state.assets.find((asset) => asset.asset_id === state.selectedId));
  }

  function renderDashboardInsights() {
    const container = document.querySelector("#dashboardInsights");
    if (!container) return;
    const byStatus = countBy(state.assets, "status", "status");
    const byGroup = countBy(state.assets, "asset_group_label");
    container.innerHTML = `
      <article class="insight-card">
        <div class="insight-head">
          <p class="eyebrow">THỐNG KÊ</p>
          <h2>TỶ LỆ TÌNH TRẠNG</h2>
        </div>
        ${renderPieChart(byStatus)}
      </article>
      <article class="insight-card">
        <div class="insight-head">
          <p class="eyebrow">NHÓM THIẾT BỊ</p>
          <h2>PHÂN BỔ THIẾT BỊ</h2>
        </div>
        ${renderBarChart(byGroup)}
      </article>
    `;
  }

  function renderMaintenanceView() {
    const watchList = state.assets.filter((asset) => ["KEM_PHAM_CHAT", "CAN_KIEM_TRA", "KHONG_SU_DUNG", "LUU_KHO_THANH_LY"].includes(asset.status));
    const byStatus = countBy(watchList, "status", "status");
    
    // Nhóm watchList theo status
    const statusGroups = {};
    watchList.forEach(asset => {
      if (!statusGroups[asset.status]) statusGroups[asset.status] = [];
      statusGroups[asset.status].push(asset);
    });
    
    let tableHtml = "";
    Object.keys(statusGroups).forEach(statusKey => {
      const items = statusGroups[statusKey];
      tableHtml += `<tr class="maintenance-group-header"><td colspan="4" style="border-bottom: 2px solid var(--border-color); padding-top: 16px; padding-bottom: 8px;"><span style="font-weight: 700; font-size: 14px; color: ${colorForLabel(labelFor("status", statusKey), 0)}; text-transform: uppercase; letter-spacing: 0.5px;">${escapeHtml(labelFor("status", statusKey))} (${items.length})</span></td></tr>`;
      items.forEach((asset, index) => {
        tableHtml += `<tr><td style="width: 50px; text-align: center; color: var(--text-secondary);">${index + 1}</td><td>${escapeHtml(asset.asset_name)}</td><td><span class="badge ${safeClass(asset.status)}">${escapeHtml(labelFor("status", asset.status))}</span></td><td>${escapeHtml([asset.assigned_to, departmentLabel(asset.department)].filter(Boolean).join(" / "))}</td></tr>`;
      });
    });
    if (!tableHtml) tableHtml = `<tr><td colspan="4">CHƯA CÓ THIẾT BỊ CẦN XỬ LÝ.</td></tr>`;

    els.content.innerHTML = `
      <div class="view-only-panel">
        <div class="panel-head maintenance-title-row"><h2>BẢO TRÌ THIẾT BỊ</h2><span>${watchList.length} THIẾT BỊ CẦN THEO DÕI</span></div>
        <div class="report-grid">
          <article class="module-card wide-card">
            <h3>TÌNH TRẠNG CẦN XỬ LÝ</h3>
            ${renderBarChart(byStatus)}
          </article>
          <article class="module-card maintenance-list-card" style="grid-column: 1 / -1;">
            <h3>DANH SÁCH CHI TIẾT THEO TÌNH TRẠNG</h3>
            <table class="mini-table maintenance-table" style="table-layout: fixed; width: 100%; min-width: 600px;">
              <thead>
                <tr>
                  <th style="width: 50px; text-align: center;">STT</th>
                  <th style="width: 40%;">THIẾT BỊ</th>
                  <th style="width: 150px; text-align: center;">TÌNH TRẠNG</th>
                  <th style="width: 35%;">NGƯỜI DÙNG</th>
                </tr>
              </thead>
              <tbody>${tableHtml}</tbody>
            </table>
          </article>
          <article class="module-card maintenance-list-card" style="grid-column: 1 / -1; margin-top: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <h3 style="margin: 0;">LỊCH SỬ BẢO TRÌ GẦN ĐÂY</h3>
              ${canEditAssets() ? `<button class="primary-button" type="button" id="openAddLogModal" style="padding: 6px 12px; font-size: 12px;">+ GHI NHẬN BẢO TRÌ</button>` : ""}
            </div>
            <table class="mini-table">
              <thead>
                <tr>
                  <th style="width: 100px;">NGÀY</th>
                  <th>THIẾT BỊ</th>
                  <th style="width: 120px;">LOẠI</th>
                  <th>NỘI DUNG</th>
                  <th style="width: 120px; text-align: right;">CHI PHÍ</th>
                </tr>
              </thead>
              <tbody>
                ${(state.maintenanceLogs || []).slice(0, 20).map(log => {
                  const asset = state.assets.find(a => a.asset_id === log.asset_id);
                  return `
                    <tr>
                      <td style="color: var(--text-secondary);">${escapeHtml(formatDate(log.date))}</td>
                      <td style="font-weight: 500;">${escapeHtml(asset ? asset.asset_name : "Thiết bị đã xóa")}</td>
                      <td><span class="badge" style="background: var(--bg-color); color: var(--text-primary); border: 1px solid var(--border-color);">${escapeHtml(log.action_type)}</span></td>
                      <td>${escapeHtml(log.description)}</td>
                      <td style="text-align: right; font-weight: 500; color: #e11d48;">${escapeHtml(formatMoney(log.cost))}</td>
                    </tr>
                  `;
                }).join('') || `<tr><td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 24px 0;">Chưa có lịch sử bảo trì.</td></tr>`}
              </tbody>
            </table>
          </article>
        </div>
      </div>
    `;
    
    const openBtn = els.content.querySelector("#openAddLogModal");
    if (openBtn) {
      openBtn.addEventListener("click", () => openMaintenanceLogModal());
    }
  }

  function renderSoftwareView() {
    els.content.innerHTML = `
      <div class="list-panel">
        <div class="panel-head">
          <div>
            <h2>Quản lý Bản quyền Phần mềm</h2>
            <p class="view-subtitle" style="margin-top: 4px; color: rgba(255,255,255,.6);">Theo dõi danh sách bản quyền, license key và thiết bị được cấp phép</p>
          </div>
          ${canEditAssets() ? `<button class="primary-button" type="button" id="openAddSoftwareBtn">+ Thêm bản quyền</button>` : ""}
        </div>
        
        <div class="table-wrap" style="margin-top: 16px;">
          <table class="data-table" style="min-width: 1000px;">
            <thead>
              <tr>
                <th style="width: 20%">PHẦN MỀM</th>
                <th style="width: 10%">PHIÊN BẢN</th>
                <th style="width: 15%">LICENSE KEY</th>
                <th style="width: 25%">GÁN CHO</th>
                <th style="width: 15%">NGÀY HẾT HẠN</th>
                <th style="width: 15%">TRẠNG THÁI</th>
                ${canEditAssets() ? `<th style="width: 60px; text-align: center;"></th>` : ""}
              </tr>
            </thead>
          <tbody>
            ${state.softwareLicenses.map(license => {
              const asset = state.assets.find(a => a.asset_id === license.assigned_asset_id);
              const isExpired = license.expiry_date && new Date(license.expiry_date) < new Date();
              const isExpiringSoon = license.expiry_date && new Date(license.expiry_date) < new Date(new Date().setDate(new Date().getDate() + 30));
              
              let statusColor = "var(--text-secondary)";
              if (license.status === "ACTIVE") statusColor = "var(--color-success)";
              if (license.status === "EXPIRED" || isExpired) statusColor = "var(--color-error)";
              else if (isExpiringSoon) statusColor = "var(--color-warning)";
              
              let statusLabel = license.status === "ACTIVE" ? "Đang sử dụng" : 
                                license.status === "AVAILABLE" ? "Sẵn sàng" : 
                                license.status === "EXPIRED" ? "Hết hạn" : "Đã thu hồi";
              if (license.status === "ACTIVE" && isExpired) statusLabel = "Hết hạn";
              else if (license.status === "ACTIVE" && isExpiringSoon) statusLabel = "Sắp hết hạn";

              return `
                <tr>
                  <td style="font-weight: 500;">${escapeHtml(license.software_name)}</td>
                  <td>${escapeHtml(license.version)}</td>
                  <td><code style="background: var(--bg-hover); padding: 2px 6px; border-radius: 4px; font-size: 12px;">${escapeHtml(license.license_key)}</code></td>
                  <td>
                    ${asset ? `<span>🖥 ${escapeHtml(asset.asset_name)}</span>` : ""}
                    ${license.assigned_user ? `<div>👤 ${escapeHtml(license.assigned_user)}</div>` : ""}
                  </td>
                  <td style="color: ${isExpired || isExpiringSoon ? statusColor : 'inherit'}; font-weight: ${isExpired || isExpiringSoon ? '600' : 'normal'}">${escapeHtml(formatDate(license.expiry_date))}</td>
                  <td><span class="badge" style="color: ${statusColor}; border: 1px solid ${statusColor}; background: transparent;">${escapeHtml(statusLabel)}</span></td>
                  ${canEditAssets() ? `
                    <td class="table-actions" style="text-align: center;">
                      <button class="icon-button edit-software-btn" data-id="${escapeHtml(license.license_id)}" type="button" aria-label="Sửa">✎</button>
                    </td>
                  ` : ""}
                </tr>
              `;
            }).join('') || `<tr><td colspan="${canEditAssets() ? 7 : 6}" style="text-align: center; color: var(--text-secondary); padding: 32px;">Chưa có bản quyền phần mềm nào.</td></tr>`}
          </tbody>
        </table>
      </div>
      </div>
    `;

    const addBtn = els.content.querySelector("#openAddSoftwareBtn");
    if (addBtn) addBtn.addEventListener("click", () => openSoftwareLicenseModal());

    els.content.querySelectorAll(".edit-software-btn").forEach(btn => {
      btn.addEventListener("click", (e) => openSoftwareLicenseModal(e.target.dataset.id));
    });
  }

  function renderDepartmentsView() {
    els.content.innerHTML = `
      <div class="list-panel">
        <div class="panel-head">
          <div>
            <h2>Quản lý Phòng ban</h2>
            <p class="view-subtitle" style="margin-top: 4px; color: rgba(255,255,255,.6);">Theo dõi danh sách các phòng ban, trưởng phòng và vị trí của công ty</p>
          </div>
          ${isAdmin() ? `<button class="primary-button" type="button" id="openAddDepartmentBtn">+ Thêm phòng ban</button>` : ""}
        </div>
        
        <div class="table-wrap" style="margin-top: 16px;">
          <table class="data-table" style="min-width: 800px;">
            <thead>
              <tr>
                <th style="width: 25%">PHÒNG BAN</th>
                <th style="width: 25%">TRƯỞNG PHÒNG</th>
                <th style="width: 25%">VỊ TRÍ / KHU VỰC</th>
                <th style="width: 25%">GHI CHÚ</th>
                ${isAdmin() ? `<th style="width: 80px; text-align: center;"></th>` : ""}
              </tr>
            </thead>
          <tbody>
            ${state.departments.map(dept => `
                <tr>
                  <td style="font-weight: 500;">${escapeHtml(dept.department_name)}</td>
                  <td>${escapeHtml(dept.manager)}</td>
                  <td>${escapeHtml(dept.location)}</td>
                  <td>${escapeHtml(dept.note)}</td>
                  ${isAdmin() ? `
                    <td class="table-actions" style="text-align: center;">
                      <button class="icon-button edit-dept-btn" data-id="${escapeHtml(dept.department_id)}" type="button" aria-label="Sửa">✎</button>
                      <button class="icon-button danger-icon-button delete-dept-btn" data-id="${escapeHtml(dept.department_id)}" data-name="${escapeHtml(dept.department_name)}" type="button" aria-label="Xóa">×</button>
                    </td>
                  ` : ""}
                </tr>
              `).join('') || `<tr><td colspan="${isAdmin() ? 5 : 4}" style="text-align: center; color: var(--text-secondary); padding: 32px;">Chưa có phòng ban nào.</td></tr>`}
          </tbody>
        </table>
      </div>
      </div>
    `;

    const addBtn = els.content.querySelector("#openAddDepartmentBtn");
    if (addBtn) addBtn.addEventListener("click", () => openDepartmentModal());

    els.content.querySelectorAll(".edit-dept-btn").forEach(btn => {
      btn.addEventListener("click", (e) => openDepartmentModal(e.target.dataset.id));
    });
    
    els.content.querySelectorAll(".delete-dept-btn").forEach(btn => {
      btn.addEventListener("click", (e) => handleDeleteDepartment(e.target.dataset.id, e.target.dataset.name));
    });
  }

  function renderReportsView() {
    const byGroup = countBy(state.assets, "asset_group_label");
    const byStatus = countBy(state.assets, "status", "status");
    const groupOptions = settingOptions("asset_group")
      .map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`)
      .join("");
    els.content.innerHTML = `
      <div class="view-only-panel">
        <div class="panel-head report-title-row">
          <h2>BÁO CÁO</h2>
          <div class="report-actions">
            <label class="report-group-filter">
              <span>Nhóm xuất</span>
              <select id="reportGroupSelect">
                <option value="">Tất cả nhóm</option>
                ${groupOptions}
              </select>
            </label>
            <button class="secondary-button" type="button" data-export-csv>Xuất Excel (.xlsx)</button>
            <button class="secondary-button" type="button" data-print-pdf>Xuất PDF</button>
          </div>
        </div>
        <div class="report-dashboard">
          <article class="module-card report-main-card">
            <h3>BIỂU ĐỒ TÌNH TRẠNG</h3>
            ${renderBarChart(byStatus)}
          </article>
          <article class="module-card report-pie-card">
            <h3>TỶ LỆ TÌNH TRẠNG</h3>
            ${renderPieChart(byStatus)}
          </article>
          ${renderReportCard("THEO NHÓM THIẾT BỊ", byGroup, "group")}
          ${renderReportCard("THEO TÌNH TRẠNG", byStatus, "status")}
        </div>
      </div>
    `;
    els.content.querySelector("[data-export-csv]").addEventListener("click", () => {
      const selectedGroup = document.getElementById("reportGroupSelect")?.value || "";
      exportExcel(selectedGroup);
    });
    els.content.querySelector("[data-print-pdf]").addEventListener("click", () => {
      const selectedGroup = document.getElementById("reportGroupSelect")?.value || "";
      printReport(selectedGroup);
    });
  }

  function printReport(groupFilter = "") {
    const data = groupFilter
      ? state.assets.filter((a) => a.asset_group === groupFilter)
      : state.assets;
    if (!data.length) { showMessageModal("Không có dữ liệu", "Không có thiết bị phù hợp để in."); return; }

    // Nhóm theo asset_group + Tách riêng nhóm lưu kho/kém phẩm chất
    const groupOrder = [];
    const groups = {};
    const specialGroupKey = "_SPECIAL_";
    const specialGroupLabel = "THIẾT BỊ LƯU KHO / KÉM PHẨM CHẤT / THANH LÝ";
    const badStatuses = ["KEM_PHAM_CHAT", "LUU_KHO_THANH_LY", "KHONG_SU_DUNG"];

    data.forEach((asset) => {
      let key, label;
      
      if (!groupFilter && badStatuses.includes(asset.status)) {
        key = specialGroupKey;
        label = specialGroupLabel;
      } else {
        key = asset.asset_group;
        label = asset.asset_group_label || labelFor("asset_group", key) || key;
      }

      if (!groups[key]) { 
        groups[key] = { label, items: [] }; 
        if (key !== specialGroupKey) groupOrder.push(key); 
      }
      groups[key].items.push(asset);
    });

    if (groups[specialGroupKey]) {
      groupOrder.push(specialGroupKey); // Đưa xuống cuối cùng
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    const groupTitle = groupFilter ? labelFor("asset_group", groupFilter) : "TấT CẢ NHÓM";

    let tableRows = "";
    groupOrder.forEach((key) => {
      const { label, items } = groups[key];
      tableRows += `<tr class="pr-group-row"><td colspan="9">${escapeHtml(label)}</td></tr>`;
      items.forEach((asset, i) => {
        const price = asset.unit_price ? Number(asset.unit_price).toLocaleString("vi-VN") + " đ" : "";
        tableRows += `
          <tr>
            <td class="pr-center">${i + 1}</td>
            <td>${escapeHtml(asset.asset_name)}</td>
            <td class="pr-center">${escapeHtml(asset.purchase_year)}</td>
            <td class="pr-center">${escapeHtml(asset.quantity || "1")}</td>
            <td>${escapeHtml(asset.assigned_to)}</td>
            <td>${escapeHtml(departmentLabel(asset.department))}</td>
            <td class="pr-right">${escapeHtml(price)}</td>
            <td>${escapeHtml(asset.software_license)}</td>
            <td style="color: ${colorForLabel(labelFor("status", asset.status), i)}; font-weight: bold;">${escapeHtml(labelFor("status", asset.status))}</td>
          </tr>`;
      });
    });
    tableRows += `<tr class="pr-total-row"><td colspan="3">TỔNG CỘNG</td><td class="pr-center">${data.reduce((s, a) => s + Number(a.quantity || 1), 0)}</td><td colspan="5">${data.length} thiết bị</td></tr>`;

    const html = `
      <div class="pr-header" style="position: relative;">
        <img src="assets/tdw-logo.webp" alt="TDW" style="position: absolute; left: 0; top: 0; width: 100px; height: auto;" />
        <div class="pr-company">CÔNG TY CỔ PHẦN NƯỚC THỦ ĐỨC &mdash; TDW</div>
        <div class="pr-title">TỔNG HỢP DANH SÁCH THIẾT BỊ &mdash; ${escapeHtml(groupTitle)}</div>
        <div class="pr-meta">Ngày xuất: ${dateStr} &nbsp;|&nbsp; Tổng: ${data.length} thiết bị</div>
      </div>
      <table class="pr-table">
        <thead>
          <tr>
            <th style="width:4%">STT</th>
            <th style="width:22%">TÊN THIẾT BỊ</th>
            <th style="width:6%">NĂM</th>
            <th style="width:5%">SỐ LƯỢNG</th>
            <th style="width:12%">NGƯỜI SỬ DỤNG</th>
            <th style="width:10%">PHÒNG BAN</th>
            <th style="width:10%">ĐƠN GIÁ</th>
            <th style="width:14%">PHẦN MỀM</th>
            <th style="width:12%">TÌNH TRẠNG</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
      <div class="pr-footer">
        <span>Tài liệu nội bộ · TDW Equipment Manager</span>
        <span>In lúc ${now.toLocaleTimeString("vi-VN")} ngày ${dateStr}</span>
      </div>`;

    const el = document.getElementById("printReport");
    el.innerHTML = html;
    el.hidden = false;
    window.print();
    el.hidden = true;
    el.innerHTML = "";
  }


  function renderSettingsView() {
    els.content.innerHTML = `
      <div class="view-only-panel">
        <div class="settings-title-row">
          <h2>CẤU HÌNH</h2>
          <button class="primary-button" type="button" id="openSettingModal">+ Thêm cấu hình</button>
        </div>
        <div class="settings-layout full-settings-layout">
          <div class="module-card settings-list">
            <h3>DANH MỤC HIỆN CÓ</h3>
            <div class="settings-groups-grid">
              ${Object.entries(settingTypes).map(([type, label]) => `
                <section class="setting-group">
                  <h4>${label.toUpperCase()}</h4>
                  ${settingsByType(type).map((item, index, list) => `
                    <div class="setting-row">
                      <div>
                        <strong>${escapeHtml(item.display_name)}</strong>
                        <small>${escapeHtml(item.setting_value)} · thứ tự ${escapeHtml(item.sort_order)}</small>
                      </div>
                      <div class="setting-actions">
                        <div class="setting-order-buttons" aria-label="Đổi thứ tự">
                          <button class="secondary-button" type="button" data-move-setting="${escapeHtml(item.setting_id)}" data-direction="up" ${index === 0 ? "disabled" : ""}>↑</button>
                          <button class="secondary-button" type="button" data-move-setting="${escapeHtml(item.setting_id)}" data-direction="down" ${index === list.length - 1 ? "disabled" : ""}>↓</button>
                        </div>
                        <button class="secondary-button" type="button" data-edit-setting="${escapeHtml(item.setting_id)}">Sửa</button>
                        <button class="danger-button" type="button" data-delete-setting="${escapeHtml(item.setting_id)}">Xóa</button>
                      </div>
                    </div>
                  `).join("") || `<p>Chưa có cấu hình.</p>`}
                </section>
              `).join("")}
            </div>
          </div>
        </div>
      </div>
    `;
    els.content.querySelector("#openSettingModal").addEventListener("click", () => openSettingModal());
    els.content.querySelectorAll("[data-edit-setting]").forEach((button) => {
      button.addEventListener("click", () => openSettingModal(state.settings.find((item) => item.setting_id === button.dataset.editSetting)));
    });
    els.content.querySelectorAll("[data-move-setting]").forEach((button) => {
      button.addEventListener("click", () => moveSetting(button.dataset.moveSetting, button.dataset.direction));
    });
    els.content.querySelectorAll("[data-delete-setting]").forEach((button) => {
      button.addEventListener("click", () => handleDeleteSetting(button.dataset.deleteSetting));
    });
  }

  function settingsByType(type) {
    return state.settings
      .filter((item) => item.setting_type === type && item.active)
      .sort((a, b) => a.sort_order - b.sort_order || a.display_name.localeCompare(b.display_name, "vi"));
  }

  function resetSettingForm() {
    const form = els.settingForm;
    state.editingSettingId = "";
    form.reset();
    form.elements.setting_id.value = "";
    form.elements.sort_order.value = nextSettingOrder(form.elements.setting_type.value);
    els.settingFormTitle.textContent = "THÊM CẤU HÌNH";
  }

  function fillSettingFormTypes() {
    const select = els.settingForm.elements.setting_type;
    select.innerHTML = "";
    Object.entries(settingTypes).forEach(([value, label]) => select.append(new Option(label, value)));
  }

  function openSettingModal(setting = null) {
    fillSettingFormTypes();
    resetSettingForm();
    if (setting) {
      state.editingSettingId = setting.setting_id;
      els.settingForm.elements.setting_id.value = setting.setting_id;
      els.settingForm.elements.setting_type.value = setting.setting_type;
      els.settingForm.elements.setting_value.value = setting.setting_value;
      els.settingForm.elements.display_name.value = setting.display_name;
      els.settingForm.elements.sort_order.value = setting.sort_order;
      els.settingFormTitle.textContent = "SỬA CẤU HÌNH";
    }
    els.settingModal.hidden = false;
  }

  function nextSettingOrder(type) {
    const orders = settingsByType(type).map((item) => Number(item.sort_order) || 0);
    return String(Math.max(0, ...orders) + 1);
  }

  function closeSettingModal() {
    els.settingModal.hidden = true;
    resetSettingForm();
  }

  async function moveSetting(settingId, direction) {
    const setting = state.settings.find((item) => item.setting_id === settingId);
    if (!setting) return;
    const list = settingsByType(setting.setting_type);
    const index = list.findIndex((item) => item.setting_id === settingId);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const target = list[targetIndex];
    if (!target) return;
    // Disable tất cả nút move trong group này khi đang xử lý
    const moveButtons = els.content?.querySelectorAll(`[data-move-setting]`);
    moveButtons?.forEach((btn) => { btn.disabled = true; btn.classList.add("is-loading"); });
    const currentOrder = setting.sort_order;
    setting.sort_order = target.sort_order;
    target.sort_order = currentOrder;
    try {
      await Promise.all([callServer("saveSetting", setting), callServer("saveSetting", target)]);
      showToast("Đã đổi thứ tự cấu hình", setting.display_name || "Cấu hình TDW");
      await refreshAppData();
    } catch (error) {
      moveButtons?.forEach((btn) => { btn.disabled = false; btn.classList.remove("is-loading"); });
      showMessageModal("Không thể đổi thứ tự", error.message);
    }
  }

  async function handleSettingSubmit(event) {
    event.preventDefault();
    const setting = Object.fromEntries(new FormData(event.target).entries());
    const submitBtn = event.target.querySelector("[type=submit]");
    if (submitBtn) { submitBtn.classList.add("is-loading"); submitBtn.disabled = true; }
    try {
      const isEdit = Boolean(setting.setting_id);
      await callServer("saveSetting", setting);
      showToast(isEdit ? "Đã cập nhật cấu hình" : "Đã thêm cấu hình", setting.display_name || setting.setting_value || "Cấu hình TDW");
      closeSettingModal();
      await refreshAppData();
    } catch (error) {
      showMessageModal("Không thể lưu cấu hình", error.message);
    } finally {
      if (submitBtn) { submitBtn.classList.remove("is-loading"); submitBtn.disabled = false; }
    }
  }

  async function handleDeleteSetting(settingId) {
    const setting = state.settings.find((item) => item.setting_id === settingId);
    const confirmed = await showConfirmModal("XÓA CẤU HÌNH", `Xóa cấu hình "${setting?.display_name || "này"}" khỏi dropdown?`, "Xóa");
    if (!confirmed) return;
    const deleteBtn = els.content?.querySelector(`[data-delete-setting="${settingId}"]`);
    if (deleteBtn) { deleteBtn.classList.add("is-loading"); deleteBtn.disabled = true; }
    try {
      await callServer("deleteSetting", settingId);
      showToast("Đã xóa cấu hình", setting?.display_name || "Cấu hình TDW");
      await refreshAppData();
    } catch (error) {
      if (deleteBtn) { deleteBtn.classList.remove("is-loading"); deleteBtn.disabled = false; }
      showMessageModal("Không thể xóa cấu hình", error.message);
    }
  }

  async function renderUsersView() {
    els.content.innerHTML = `
      <div class="users-panel">
        <div class="panel-head">
          <h2>QUẢN LÝ NGƯỜI DÙNG</h2>
          <button class="primary-button" type="button" id="openUserModal">+ Thêm user</button>
        </div>
        <div class="users-list" id="usersList">
          <p class="muted">Đang tải danh sách user...</p>
        </div>
      </div>
    `;
    els.content.querySelector("#openUserModal").addEventListener("click", () => openUserModal());
    if (state.usersLoaded) {
      renderUsersList();
      return;
    }
    try {
      await preloadUsers({ force: true });
      renderUsersList();
    } catch (error) {
      els.content.querySelector("#usersList").innerHTML = `<p class="muted">Không tải được user: ${escapeHtml(error.message)}</p>`;
    }
  }

  function renderUsersList() {
    const list = els.content.querySelector("#usersList");
    if (!list) return;
    list.innerHTML = state.users.map((user) => `
      <div class="user-row">
        <div>
          <strong>${escapeHtml(user.full_name || user.username)}</strong>
          <small>${escapeHtml(user.username)}</small>
        </div>
        <span class="role-pill ${safeClass(user.role)}">${escapeHtml(user.role)}</span>
        <span class="user-status">${user.active ? "Đang hoạt động" : "Đã khóa"}</span>
        <div class="user-row-actions">
          <button class="secondary-button" type="button" data-edit-user="${escapeHtml(user.user_id)}">Sửa</button>
          <button class="secondary-button" type="button" data-reset-user="${escapeHtml(user.user_id)}">Reset mật khẩu</button>
          <button class="danger-button" type="button" data-delete-user="${escapeHtml(user.user_id)}">${user.active ? "Khóa" : "Xóa"}</button>
        </div>
      </div>
    `).join("") || `<p class="muted">Chưa có user.</p>`;

    list.querySelectorAll("[data-edit-user]").forEach((button) => {
      button.addEventListener("click", () => openUserModal(state.users.find((user) => user.user_id === button.dataset.editUser)));
    });
    list.querySelectorAll("[data-reset-user]").forEach((button) => {
      button.addEventListener("click", () => handleResetPassword(button.dataset.resetUser));
    });
    list.querySelectorAll("[data-delete-user]").forEach((button) => {
      button.addEventListener("click", () => handleDeleteUser(button.dataset.deleteUser));
    });
  }

  function resetUserForm() {
    const form = els.userForm;
    state.editingUserId = "";
    form.reset();
    form.elements.user_id.value = "";
    form.elements.role.value = "user";
    form.elements.active.value = "TRUE";
    form.elements.permissions.value = "view";
    els.userFormTitle.textContent = "THÊM USER";
  }

  function openUserModal(user = null) {
    resetUserForm();
    if (user) {
      state.editingUserId = user.user_id;
      els.userForm.elements.user_id.value = user.user_id;
      els.userForm.elements.username.value = user.username;
      els.userForm.elements.full_name.value = user.full_name;
      els.userForm.elements.role.value = user.role;
      els.userForm.elements.active.value = user.active ? "TRUE" : "FALSE";
      els.userForm.elements.permissions.value = user.permissions || "";
      els.userFormTitle.textContent = "SỬA USER";
    }
    els.userModal.hidden = false;
  }

  function closeUserModal() {
    els.userModal.hidden = true;
    resetUserForm();
  }

  async function handleUserSubmit(event) {
    event.preventDefault();
    const user = Object.fromEntries(new FormData(event.target).entries());
    const submitBtn = event.target.querySelector("[type=submit]");
    if (submitBtn) { submitBtn.classList.add("is-loading"); submitBtn.disabled = true; }
    try {
      const isEdit = Boolean(user.user_id);
      await callServer("saveUser", user);
      showToast(isEdit ? "Đã cập nhật user" : "Đã thêm user", user.full_name || user.username || "User TDW");
      state.usersLoaded = false;
      closeUserModal();
      if (state.activeView === "users") await renderUsersView();
    } catch (error) {
      showMessageModal("Không thể lưu user", error.message);
    } finally {
      if (submitBtn) { submitBtn.classList.remove("is-loading"); submitBtn.disabled = false; }
    }
  }

  function openMaintenanceLogModal(assetId = null) {
    els.maintenanceLogForm.reset();
    const assetSelect = els.maintenanceLogForm.querySelector('[name="asset_id"]');
    
    // Populate Group Filter
    const groups = settingOptions("asset_group");
    els.maintenanceLogGroupFilter.innerHTML = `<option value="">-- Tất cả thiết bị --</option>` + groups.map(([val, label]) => `<option value="${escapeHtml(val)}">${escapeHtml(label)}</option>`).join('');
    els.maintenanceLogGroupFilter.value = "";

    // Populate Maintenance Types
    const actionSelect = els.maintenanceLogForm.querySelector('[name="action_type"]');
    if (actionSelect) {
      const actions = settingOptions("maintenance_type");
      actionSelect.innerHTML = `<option value="">-- Chọn loại bảo trì --</option>` + actions.map(([val, label]) => `<option value="${escapeHtml(val)}">${escapeHtml(label)}</option>`).join('');
    }
    
    const populateAssets = (groupFilter) => {
      const filteredAssets = groupFilter ? state.assets.filter(a => a.asset_group === groupFilter) : state.assets;
      assetSelect.innerHTML = `<option value="">-- Chọn thiết bị --</option>` + filteredAssets.map(a => `<option value="${escapeHtml(a.asset_id)}">${escapeHtml(a.asset_name)} (${escapeHtml(a.asset_code)})</option>`).join('');
    };
    
    // Bind filter change
    els.maintenanceLogGroupFilter.onchange = (e) => populateAssets(e.target.value);
    
    if (assetId) {
      const asset = state.assets.find(a => a.asset_id === assetId);
      if (asset) {
        els.maintenanceLogGroupFilter.value = asset.asset_group;
        populateAssets(asset.asset_group);
        assetSelect.value = assetId;
      } else {
        populateAssets("");
      }
    } else {
      populateAssets("");
    }
    
    els.maintenanceLogForm.querySelector('[name="date"]').value = new Date().toISOString().split('T')[0];
    els.maintenanceLogModal.hidden = false;
  }

  function closeMaintenanceLogModal() {
    els.maintenanceLogModal.hidden = true;
    els.maintenanceLogForm.reset();
  }

  async function handleMaintenanceLogSubmit(event) {
    event.preventDefault();
    const log = Object.fromEntries(new FormData(event.target).entries());
    const submitBtn = event.target.querySelector("[type=submit]");
    if (submitBtn) { submitBtn.classList.add("is-loading"); submitBtn.disabled = true; }
    try {
      await callServer("saveMaintenanceLog", log);
      showToast("Đã lưu lịch sử bảo trì", log.action_type);
      closeMaintenanceLogModal();
      await loadAppData();
      if (state.activeView === "overview") renderOverviewView();
      if (state.activeView === "assets") renderAssetsView();
      if (state.activeView === "maintenance") renderMaintenanceView();
      if (state.selectedId) renderDetail(state.assets.find((a) => a.asset_id === state.selectedId));
    } catch (error) {
      showMessageModal("Không thể lưu", error.message);
    } finally {
      if (submitBtn) { submitBtn.classList.remove("is-loading"); submitBtn.disabled = false; }
    }
  }

  function openSoftwareLicenseModal(licenseId = null, assetIdForNew = null) {
    els.softwareLicenseForm.reset();
    const assetSelect = els.softwareLicenseForm.querySelector('[name="assigned_asset_id"]');
    assetSelect.innerHTML = `<option value="">-- Không gán thiết bị --</option>` + state.assets.map(a => `<option value="${escapeHtml(a.asset_id)}">${escapeHtml(a.asset_name)} (${escapeHtml(a.asset_code)})</option>`).join('');
    
    if (licenseId && typeof licenseId === "string") {
      const license = state.softwareLicenses.find(l => l.license_id === licenseId);
      if (license) {
        Object.keys(license).forEach(key => {
          const input = els.softwareLicenseForm.querySelector(`[name="${key}"]`);
          if (input) input.value = license[key];
        });
        els.softwareLicenseForm.querySelector('[name="license_id"]').value = licenseId;
      }
    } else {
      els.softwareLicenseForm.querySelector('[name="license_id"]').value = "";
      if (assetIdForNew) assetSelect.value = assetIdForNew;
    }
    els.softwareLicenseModal.hidden = false;
  }

  function closeSoftwareLicenseModal() {
    els.softwareLicenseModal.hidden = true;
    els.softwareLicenseForm.reset();
  }

  async function handleSoftwareLicenseSubmit(event) {
    event.preventDefault();
    const license = Object.fromEntries(new FormData(event.target).entries());
    const submitBtn = event.target.querySelector("[type=submit]");
    if (submitBtn) { submitBtn.classList.add("is-loading"); submitBtn.disabled = true; }
    try {
      await callServer("saveSoftwareLicense", license);
      showToast("Đã lưu bản quyền", license.software_name);
      closeSoftwareLicenseModal();
      await loadAppData();
      if (state.activeView === "software") renderSoftwareView();
      if (state.selectedId) renderDetail(state.assets.find((a) => a.asset_id === state.selectedId));
    } catch (error) {
      showMessageModal("Lỗi", error.message);
    } finally {
      if (submitBtn) { submitBtn.classList.remove("is-loading"); submitBtn.disabled = false; }
    }
  }

  function openMovementLogModal(assetId = null) {
    els.movementLogForm.reset();
    const assetSelect = els.movementLogForm.querySelector('[name="asset_id"]');
    assetSelect.innerHTML = `<option value="">-- Chọn thiết bị --</option>` + state.assets.map(a => `<option value="${escapeHtml(a.asset_id)}">${escapeHtml(a.asset_name)} (${escapeHtml(a.asset_code)})</option>`).join('');
    if (assetId) assetSelect.value = assetId;
    
    els.movementLogForm.querySelector('[name="movement_date"]').value = new Date().toISOString().split('T')[0];
    
    // Auto populate "From" if asset is known
    if (assetId) {
      const asset = state.assets.find(a => a.asset_id === assetId);
      if (asset) {
        els.movementLogForm.querySelector('[name="from_user"]').value = asset.assigned_to || "";
        els.movementLogForm.querySelector('[name="from_location"]').value = asset.location || "";
      }
    }
    
    els.movementLogModal.hidden = false;
  }

  function closeMovementLogModal() {
    els.movementLogModal.hidden = true;
    els.movementLogForm.reset();
  }

  async function handleMovementLogSubmit(event) {
    event.preventDefault();
    const log = Object.fromEntries(new FormData(event.target).entries());
    const submitBtn = event.target.querySelector("[type=submit]");
    if (submitBtn) { submitBtn.classList.add("is-loading"); submitBtn.disabled = true; }
    try {
      await callServer("saveMovementLog", log);
      showToast("Đã ghi nhận luân chuyển", log.reason || "Cập nhật thành công");
      closeMovementLogModal();
      await loadAppData();
      if (state.selectedId) renderDetail(state.assets.find((a) => a.asset_id === state.selectedId));
      if (state.activeView === "assets") renderAssetsView();
    } catch (error) {
      showMessageModal("Lỗi", error.message);
    } finally {
      if (submitBtn) { submitBtn.classList.remove("is-loading"); submitBtn.disabled = false; }
    }
  }

  function openDepartmentModal(departmentId = null) {
    els.departmentForm.reset();
    els.departmentFormTitle.textContent = departmentId ? "SỬA PHÒNG BAN" : "THÊM PHÒNG BAN";
    if (departmentId) {
      const dept = state.departments.find(d => d.department_id === departmentId);
      if (dept) {
        Object.keys(dept).forEach(key => {
          const input = els.departmentForm.querySelector(`[name="${key}"]`);
          if (input) input.value = dept[key];
        });
      }
    } else {
      els.departmentForm.querySelector('[name="department_id"]').value = "";
    }
    els.departmentModal.hidden = false;
  }

  function closeDepartmentModal() {
    els.departmentModal.hidden = true;
    els.departmentForm.reset();
  }

  async function handleDepartmentSubmit(event) {
    event.preventDefault();
    const dept = Object.fromEntries(new FormData(event.target).entries());
    const submitBtn = event.target.querySelector("[type=submit]");
    if (submitBtn) { submitBtn.classList.add("is-loading"); submitBtn.disabled = true; }
    try {
      await callServer("saveDepartment", dept);
      showToast("Đã lưu phòng ban", dept.department_name);
      closeDepartmentModal();
      await loadAppData();
      if (state.activeView === "departments") renderDepartmentsView();
    } catch (error) {
      showMessageModal("Lỗi", error.message);
    } finally {
      if (submitBtn) { submitBtn.classList.remove("is-loading"); submitBtn.disabled = false; }
    }
  }

  async function handleDeleteDepartment(deptId, deptName) {
    const confirmed = await showConfirmModal("XÓA PHÒNG BAN", `Bạn có chắc muốn xóa phòng ban "${deptName}" không?`, "Xóa");
    if (!confirmed) return;
    try {
      await callServer("deleteDepartment", deptId);
      showToast("Đã xóa", `Phòng ban ${deptName}`);
      await loadAppData();
      if (state.activeView === "departments") renderDepartmentsView();
    } catch (error) {
      showMessageModal("Lỗi", error.message);
    }
  }

  async function handleDeleteUser(userId) {
    const user = state.users.find((item) => item.user_id === userId);
    const confirmed = await showConfirmModal("KHÓA USER", `Khóa user "${user?.full_name || user?.username || "này"}"?`, "Khóa");
    if (!confirmed) return;
    const deleteBtn = els.content?.querySelector(`[data-delete-user="${userId}"]`);
    if (deleteBtn) { deleteBtn.classList.add("is-loading"); deleteBtn.disabled = true; }
    try {
      await callServer("deleteUser", userId);
      showToast("Đã khóa user", user?.full_name || user?.username || "User TDW");
      state.usersLoaded = false;
      await renderUsersView();
    } catch (error) {
      if (deleteBtn) { deleteBtn.classList.remove("is-loading"); deleteBtn.disabled = false; }
      showMessageModal("Không thể khóa user", error.message);
    }
  }

  async function handleResetPassword(userId) {
    const newPassword = await showInputModal("RESET MẬT KHẨU", "Nhập mật khẩu mới cho user này (tối thiểu 6 ký tự).", "Mật khẩu mới", "password");
    if (!newPassword) return;
    const resetBtn = els.content?.querySelector(`[data-reset-user="${userId}"]`);
    if (resetBtn) { resetBtn.classList.add("is-loading"); resetBtn.disabled = true; }
    const user = state.users.find((item) => item.user_id === userId);
    try {
      await callServer("resetUserPassword", userId, newPassword);
      showToast("Đã reset mật khẩu", user?.full_name || user?.username || "User TDW");
    } catch (error) {
      showMessageModal("Không thể reset mật khẩu", error.message);
    } finally {
      if (resetBtn) { resetBtn.classList.remove("is-loading"); resetBtn.disabled = false; }
    }
  }

  function countBy(items, key, settingType) {
    return items.reduce((acc, item) => {
      const raw = item[key] || "Chưa phân loại";
      const label = settingType ? labelFor(settingType, raw) : raw;
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});
  }

  function palette(index) {
    return ["#38bdf8", "#22c55e", "#f59e0b", "#ef4444", "#a78bfa", "#14b8a6", "#f97316", "#e879f9"][index % 8];
  }

  function colorForLabel(label, index) {
    const statusColors = {
      "Còn sử dụng": "#38bdf8",
      "Kém phẩm chất": "#22c55e",
      "Không sử dụng": "#f59e0b",
      "Mới 100%": "#ef4444",
      "Lưu kho/thanh lý": "#a78bfa",
      "Cần kiểm tra": "#f97316",
    };
    return statusColors[label] || palette(index);
  }

  function renderBarChart(data) {
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    const max = Math.max(1, ...entries.map(([, count]) => count));
    return `<div class="bar-chart">${entries.map(([label, count], index) => `
      <div class="bar-row">
        <div class="bar-label">${escapeHtml(label)}</div>
        <div class="bar-track" style="--bar-color:${colorForLabel(label, index)};">
          <div class="bar-fill" style="width:${Math.max(8, (count / max) * 100)}%; background:${colorForLabel(label, index)};"></div>
        </div>
        <strong>${count}</strong>
      </div>
    `).join("")}</div>`;
  }

  function renderPieChart(data) {
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((sum, [, count]) => sum + count, 0) || 1;
    let cursor = 0;
    const stops = entries.map(([label, count], index) => {
      const start = cursor;
      const size = (count / total) * 100;
      cursor += size;
      return `${colorForLabel(label, index)} ${start}% ${cursor}%`;
    }).join(", ");
    const top = entries[0] || ["Chưa có dữ liệu", 0];
    return `
      <div class="pie-wrap">
        <div class="pie-chart" style="background: conic-gradient(${stops});">
          <div class="pie-center"><strong>${Math.round((top[1] / total) * 100)}%</strong><span>${escapeHtml(top[0])}</span></div>
        </div>
        <div class="pie-legend">
          ${entries.map(([label, count], index) => `
            <div class="legend-row">
              <i style="background:${colorForLabel(label, index)}"></i>
              <span>${escapeHtml(label)}</span>
              <strong>${Math.round((count / total) * 100)}%</strong>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderReportCard(title, data, type) {
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((sum, [, count]) => sum + count, 0) || 1;
    return `
      <article class="module-card report-list-card">
        <h3>${title}</h3>
        <div class="report-list">
          ${entries.map(([label, count], index) => `
            <div class="report-item">
              <div class="report-item-main">
                <i style="background:${colorForLabel(label, index)}"></i>
                <span>${escapeHtml(label)}</span>
              </div>
              <div class="report-item-stat">
                <strong>${count}</strong>
                <em>${Math.round((count / total) * 100)}%</em>
              </div>
            </div>
          `).join("")}
        </div>
      </article>
    `;
  }

  async function exportExcel(groupFilter = "") {
    if (typeof ExcelJS === "undefined") {
      showMessageModal("Lỗi xuất", "Thư viện ExcelJS chưa tải xong, vui lòng thử lại sau vài giây.");
      return;
    }

    const data = groupFilter
      ? state.assets.filter((asset) => asset.asset_group === groupFilter)
      : state.assets;
    if (!data.length) {
      showMessageModal("Không có dữ liệu", "Không có thiết bị phù hợp để xuất.");
      return;
    }

    // Nhóm theo asset_group + Tách riêng nhóm lưu kho/kém phẩm chất
    const groupOrder = [];
    const groups = {};
    const specialGroupKey = "_SPECIAL_";
    const specialGroupLabel = "THIẾT BỊ LƯU KHO / KÉM PHẨM CHẤT / THANH LÝ";
    const badStatuses = ["KEM_PHAM_CHAT", "LUU_KHO_THANH_LY", "KHONG_SU_DUNG"];

    data.forEach((asset) => {
      let key, label;
      
      if (!groupFilter && badStatuses.includes(asset.status)) {
        key = specialGroupKey;
        label = specialGroupLabel;
      } else {
        key = asset.asset_group;
        label = asset.asset_group_label || labelFor("asset_group", key) || key;
      }

      if (!groups[key]) { 
        groups[key] = { label, items: [] }; 
        if (key !== specialGroupKey) groupOrder.push(key); 
      }
      groups[key].items.push(asset);
    });

    if (groups[specialGroupKey]) {
      groupOrder.push(specialGroupKey); // Đưa xuống cuối cùng
    }

    const year = new Date().getFullYear();
    const groupTitle = groupFilter ? labelFor("asset_group", groupFilter).toUpperCase() : "TẤT CẢ NHÓM";

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(String(year));

    // Cột độ rộng
    ws.columns = [
      { width: 3 },  // A (Trống)
      { width: 6 },  // B (STT)
      { width: 48 }, // C (Tên)
      { width: 10 }, // D (Năm)
      { width: 10 }, // E (SL)
      { width: 28 }, // F (Người SD)
      { width: 16 }, // G (Phòng ban)
      { width: 18 }, // H (Đơn giá)
      { width: 28 }, // I (Phần mềm)
      { width: 22 }, // J (Tình trạng)
      { width: 36 }  // K (Ghi chú)
    ];

    // Thêm logo
    try {
      const response = await fetch("assets/tdw-logo.jpg");
      if (response.ok) {
        const blob = await response.blob();
        const reader = new FileReader();
        const base64 = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
        const logoId = wb.addImage({ base64, extension: "jpeg" });
        ws.addImage(logoId, {
          tl: { col: 1, row: 1 },
          ext: { width: 120, height: 44 }
        });
      }
    } catch(e) { console.error("Lỗi tải logo", e); }

    // Hàng 1, 2, 3 trống cho logo
    ws.addRow([]);
    ws.addRow([]);
    ws.addRow([]);

    // Hàng 4: Tiêu đề lớn
    const titleRow = ws.addRow(["", "", `TỔNG HỢP DANH SÁCH MÁY TÍNH - THIẾT BỊ CUNG CẤP CHO NHÂN VIÊN CÔNG TY TDW ĐẾN NĂM ${year} — ${groupTitle}`]);
    ws.mergeCells('C4:K4');
    titleRow.height = 30;
    titleRow.getCell(3).font = { bold: true, size: 14, color: { argb: 'FF176DA5' } };
    titleRow.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
    
    ws.addRow([]); // Hàng 5 trống

    // Hàng 6: Header cột
    const headerRow = ws.addRow(["", "STT", "TÊN MÁY / THIẾT BỊ", "NĂM MUA", "SỐ LƯỢNG", "NGƯỜI SỬ DỤNG", "PHÒNG BAN", "ĐƠN GIÁ (VNĐ)", "PHẦN MỀM BẢN QUYỀN", "TÌNH TRẠNG THIẾT BỊ", "GHI CHÚ"]);
    headerRow.height = 25;
    headerRow.eachCell((cell, colNumber) => {
      if (colNumber > 1) {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF176DA5' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      }
    });

    // Dữ liệu
    groupOrder.forEach((key) => {
      const { label, items } = groups[key];
      // Hàng nhóm
      const groupRow = ws.addRow(["", label.toUpperCase()]);
      ws.mergeCells(`B${groupRow.number}:K${groupRow.number}`);
      groupRow.getCell(2).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      groupRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E6FA8' } };
      groupRow.getCell(2).alignment = { vertical: 'middle' };
      groupRow.getCell(2).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };

      // Hàng item
      items.forEach((asset, index) => {
        const statusLabel = labelFor("status", asset.status);
        const colorHex = colorForLabel(statusLabel, 0).replace('#', 'FF').toUpperCase();

        const itemRow = ws.addRow([
          "",
          index + 1,
          asset.asset_name,
          asset.purchase_year,
          asset.quantity || 1,
          asset.assigned_to,
          departmentLabel(asset.department),
          asset.unit_price ? Number(asset.unit_price) : "",
          asset.software_license,
          statusLabel,
          asset.note
        ]);

        itemRow.eachCell((cell, colNumber) => {
          if (colNumber > 1) {
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            cell.alignment = { vertical: 'top', wrapText: true };
          }
        });
        
        // Căn giữa STT, Năm, SL
        [2, 4, 5].forEach(c => itemRow.getCell(c).alignment = { vertical: 'top', horizontal: 'center' });
        // Định dạng tiền
        if (itemRow.getCell(8).value) itemRow.getCell(8).numFmt = '#,##0';
        
        // Màu status
        const statusCell = itemRow.getCell(10);
        statusCell.font = { bold: true, color: { argb: colorHex } };
      });
    });

    // Hàng tổng
    const totalQty = data.reduce((s, a) => s + Number(a.quantity || 1), 0);
    const dateStr = new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    const summaryRow = ws.addRow(["", "TỔNG CỘNG", "", "", totalQty, `Ngày xuất: ${dateStr}`, "", "", "", `Tổng: ${data.length} thiết bị`, ""]);
    ws.mergeCells(`B${summaryRow.number}:D${summaryRow.number}`);
    ws.mergeCells(`F${summaryRow.number}:I${summaryRow.number}`);
    
    summaryRow.eachCell((cell, colNumber) => {
      if (colNumber > 1) {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D4F7C' } };
        cell.alignment = { vertical: 'middle' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      }
    });
    summaryRow.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };

    // Xuất file
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `TDW-thiet-bi-${year}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function bindDynamicEvents() {
    els.rows?.addEventListener("click", (event) => {
      const row = event.target.closest("tr[data-id]");
      if (!row) return;
      state.selectedId = row.dataset.id;
      renderRows();
      renderDetail(state.assets.find((asset) => asset.asset_id === state.selectedId));
    });
    els.pagination?.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
      if (button.dataset.pagePrev !== undefined) state.page = Math.max(1, state.page - 1);
      if (button.dataset.pageNext !== undefined) state.page = Math.min(totalPages, state.page + 1);
      if (button.dataset.page) state.page = Number(button.dataset.page);
      renderRows();
      renderPagination();
    });
    els.detail?.addEventListener("click", (event) => {
      const editButton = event.target.closest("[data-edit-asset]");
      const deleteButton = event.target.closest("[data-delete-asset]");
      if (editButton) openAssetModal(state.assets.find((asset) => asset.asset_id === editButton.dataset.editAsset));
      if (deleteButton) handleDeleteAsset(deleteButton.dataset.deleteAsset);
    });
  }

  function bindEvents() {
    els.loginForm?.addEventListener("submit", handleLogin);
    els.togglePassword?.addEventListener("click", () => {
      if (!els.loginPassword) return;
      const isHidden = els.loginPassword.type === "password";
      els.loginPassword.type = isHidden ? "text" : "password";
      els.togglePassword.textContent = isHidden ? "🙈" : "👁";
      els.togglePassword.setAttribute("aria-label", isHidden ? "Ẩn mật khẩu" : "Hiện mật khẩu");
    });
    els.loginPassword?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      els.loginForm?.requestSubmit();
    });
    els.passwordChangeForm?.addEventListener("submit", handlePasswordChange);
    els.passwordChangeLogout?.addEventListener("click", handleLogout);
    els.logoutButton?.addEventListener("click", handleLogout);
    [els.search, els.group, els.year, els.department, els.status]
      .filter(Boolean)
      .forEach((el) => el.addEventListener("input", () => applyFilters({ resetPage: true })));
    els.addButton.addEventListener("click", () => openAssetModal());
    els.closeModal.addEventListener("click", closeAssetModal);
    els.cancelForm.addEventListener("click", closeAssetModal);
    els.modal.addEventListener("click", (event) => {
      if (event.target === els.modal) closeAssetModal();
    });
    els.form.addEventListener("submit", handleAssetSubmit);
    els.settingForm.addEventListener("submit", handleSettingSubmit);
    els.settingForm.elements.setting_type.addEventListener("change", () => {
      if (!state.editingSettingId) els.settingForm.elements.sort_order.value = nextSettingOrder(els.settingForm.elements.setting_type.value);
    });
    els.closeSettingModal.addEventListener("click", closeSettingModal);
    els.cancelSettingForm.addEventListener("click", closeSettingModal);
    els.settingModal.addEventListener("click", (event) => {
      if (event.target === els.settingModal) closeSettingModal();
    });
    els.userForm.addEventListener("submit", handleUserSubmit);
    els.closeUserModal.addEventListener("click", closeUserModal);
    els.cancelUserForm.addEventListener("click", closeUserModal);
    els.userModal.addEventListener("click", (event) => {
      if (event.target === els.userModal) closeUserModal();
    });
    els.maintenanceLogForm.addEventListener("submit", handleMaintenanceLogSubmit);
    els.closeMaintenanceLogModal.addEventListener("click", closeMaintenanceLogModal);
    els.cancelMaintenanceLogForm.addEventListener("click", closeMaintenanceLogModal);
    els.maintenanceLogModal.addEventListener("click", (event) => {
      if (event.target === els.maintenanceLogModal) closeMaintenanceLogModal();
    });
    
    // Software License Listeners
    els.softwareLicenseForm.addEventListener("submit", handleSoftwareLicenseSubmit);
    els.closeSoftwareLicenseModal.addEventListener("click", closeSoftwareLicenseModal);
    els.cancelSoftwareLicenseForm.addEventListener("click", closeSoftwareLicenseModal);
    els.softwareLicenseModal.addEventListener("click", (event) => {
      if (event.target === els.softwareLicenseModal) closeSoftwareLicenseModal();
    });
    
    // Movement Log Listeners
    els.movementLogForm.addEventListener("submit", handleMovementLogSubmit);
    els.closeMovementLogModal.addEventListener("click", closeMovementLogModal);
    els.cancelMovementLogForm.addEventListener("click", closeMovementLogModal);
    els.movementLogModal.addEventListener("click", (event) => {
      if (event.target === els.movementLogModal) closeMovementLogModal();
    });

    // Department Listeners
    els.departmentForm.addEventListener("submit", handleDepartmentSubmit);
    els.closeDepartmentModal.addEventListener("click", closeDepartmentModal);
    els.cancelDepartmentForm.addEventListener("click", closeDepartmentModal);
    els.departmentModal.addEventListener("click", (event) => {
      if (event.target === els.departmentModal) closeDepartmentModal();
    });

    els.systemModalForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      closeSystemModal(els.systemModalInputWrap?.hidden ? true : els.systemModalInput?.value);
    });
    els.systemModalCancel?.addEventListener("click", () => closeSystemModal(false));
    els.systemModal?.addEventListener("click", (event) => {
      if (event.target === els.systemModal) closeSystemModal(false);
    });
    els.navLinks.forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        setView(link.dataset.view);
      });
    });
    bindDynamicEvents();
  }

  async function init() {
    collectElements();
    bindEvents();
    hydrateLoginMemory();
    state.authToken = localStorage.getItem(AUTH_STORAGE_KEY) || "";
    if (!state.authToken) {
      showLogin();
      return;
    }
    try {
      await startApp();
    } catch (error) {
      setAuthToken("");
      showLogin(error.message);
    }
  }

  init();
