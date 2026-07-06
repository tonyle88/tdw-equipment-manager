const state = {
    assets: [],
    settings: [],
    filtered: [],
    selectedId: null,
    page: 1,
    pageSize: 9,
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

  function csvCell(value) {
    const text = String(value ?? "");
    const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safeText.replace(/"/g, '""')}"`;
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
    department: "Phòng ban",
    software_name: "Phần mềm",
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
    state.assets = sortAssets(normalizeAssets(payload.assets || []));
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

  function showToast(title, message = "") {
    if (!els.toastStack) return;
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `
      <div class="toast-icon">✓</div>
      <div>
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(message)}</span>
      </div>
    `;
    els.toastStack.appendChild(toast);
    window.setTimeout(() => {
      toast.classList.add("is-hiding");
      toast.addEventListener("animationend", () => toast.remove(), { once: true });
    }, 2600);
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
      purchase_year: asset.purchase_year || "",
      quantity: asset.quantity || "",
      assigned_to: asset.assigned_to || "",
      department: asset.department || "",
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
    fillSelect(
      els.department,
      uniqueValues(state.assets.map((asset) => asset.department || asset.assigned_to)).map((value) => [value, value]),
      "Tất cả bộ phận",
    );
    fillSelect(els.status, settingOptions("status", state.assets.map((asset) => asset.status)), "Tất cả tình trạng");
  }

  function uniqueValues(values) {
    return [...new Set(values.filter(Boolean).map(String))].sort((a, b) => b.localeCompare(a, "vi", { numeric: true }));
  }

  function fillFormSelects() {
    fillSelect(els.form.elements.asset_group, settingOptions("asset_group"), "");
    fillSelect(els.form.elements.status, settingOptions("status"), "");
    fillSelect(els.form.elements.asset_type, settingOptions("asset_type", state.assets.map((asset) => asset.asset_type)), "Chọn loại thiết bị");
    fillSelect(els.form.elements.department, settingOptions("department", state.assets.map((asset) => asset.department)), "Chọn phòng ban");
    fillSelect(els.form.elements.software_license, settingOptions("software_name", state.assets.map((asset) => asset.software_license)), "Chọn phần mềm");
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
      const searchText = normalize([asset.asset_code, asset.asset_name, asset.asset_group_label, asset.assigned_to, asset.department, asset.software_license, asset.note].join(" "));
      const assetDepartment = asset.department || asset.assigned_to || "";
      return (
        (!keyword || searchText.includes(keyword)) &&
        (!group || asset.asset_group === group) &&
        (!year || String(asset.purchase_year) === year) &&
        (!department || assetDepartment === department) &&
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
        <td>${escapeHtml(asset.assigned_to || asset.department || "")}</td>
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
      </div>
      <dl>
        <div><dt>Nhóm</dt><dd>${escapeHtml(asset.asset_group_label || "")}</dd></div>
        <div><dt>Người dùng/phòng ban</dt><dd>${escapeHtml(asset.assigned_to || asset.department || "")}</dd></div>
        <div><dt>Phần mềm</dt><dd>${escapeHtml(asset.software_license || "Không có dữ liệu")}</dd></div>
        <div><dt>Ghi chú</dt><dd>${escapeHtml(asset.note || "Không có ghi chú")}</dd></div>
      </dl>
      ${canEditAssets() ? `<div class="detail-actions">
        <button class="secondary-button" type="button" data-edit-asset="${escapeHtml(asset.asset_id)}">Sửa</button>
        <button class="danger-button" type="button" data-delete-asset="${escapeHtml(asset.asset_id)}">Xóa</button>
      </div>` : ""}
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

  async function handleAssetSubmit(event) {
    event.preventDefault();
    if (state.isSaving) return;
    state.isSaving = true;
    els.saveButton.textContent = "Đang lưu...";
    els.saveButton.disabled = true;
    try {
      const asset = getFormAsset();
      const isEdit = Boolean(asset.asset_id);
      await callServer("saveAsset", asset);
      closeAssetModal();
      await refreshAppData({ resetPage: true });
      showToast(isEdit ? "Đã cập nhật thiết bị" : "Đã thêm thiết bị", asset.asset_name || "Thiết bị TDW");
    } catch (error) {
      alert(error.message);
    } finally {
      state.isSaving = false;
      els.saveButton.textContent = "Lưu thiết bị";
      els.saveButton.disabled = false;
    }
  }

  async function handleDeleteAsset(assetId) {
    const asset = state.assets.find((item) => item.asset_id === assetId);
    if (!asset || !confirm(`Xóa thiết bị "${asset.asset_name}" khỏi Google Sheet?`)) return;
    try {
      await callServer("deleteAsset", assetId);
      state.selectedId = null;
      await refreshAppData({ resetPage: true });
      showToast("Đã xóa thiết bị", asset.asset_name || "Thiết bị TDW");
    } catch (error) {
      alert(error.message);
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
    if (state.activeView === "reports") renderReportsView();
    if (state.activeView === "settings") renderSettingsView();
    if (state.activeView === "users") renderUsersView();
  }

  function setView(view) {
    if (view === "users" && !isAdmin()) {
      alert("Chỉ admin mới được vào trang người dùng");
      return;
    }
    state.activeView = view;
    els.navLinks.forEach((link) => link.classList.toggle("active", link.dataset.view === view));
    els.toolbar.style.display = view === "maintenance" || view === "reports" || view === "settings" || view === "users" ? "none" : "";
    const dashboardInsights = document.querySelector("#dashboardInsights");
    if (dashboardInsights) dashboardInsights.hidden = view !== "overview";
    if (view === "overview" || view === "devices") renderDeviceView(view);
    if (view === "maintenance") renderMaintenanceView();
    if (view === "reports") renderReportsView();
    if (view === "settings") renderSettingsView();
    if (view === "users") renderUsersView();
  }

  function renderDeviceView(view) {
    els.content.innerHTML = `
      <div class="list-panel">
        <div class="panel-head"><h2>${view === "devices" ? "Quản lý thiết bị" : "Danh sách thiết bị"}</h2><span id="resultCount">0 thiết bị</span></div>
        <div class="table-wrap">
          <table>
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
    els.content.innerHTML = `
      <div class="view-only-panel">
        <div class="panel-head maintenance-title-row"><h2>BẢO TRÌ THIẾT BỊ</h2><span>${watchList.length} THIẾT BỊ CẦN THEO DÕI</span></div>
        <div class="report-grid">
          <article class="module-card wide-card">
            <h3>TÌNH TRẠNG CẦN XỬ LÝ</h3>
            ${renderBarChart(byStatus)}
          </article>
          <article class="module-card maintenance-list-card">
            <h3>DANH SÁCH ƯU TIÊN</h3>
            <table class="mini-table maintenance-table">
              <thead><tr><th>THIẾT BỊ</th><th>TÌNH TRẠNG</th><th>NGƯỜI DÙNG</th></tr></thead>
              <tbody>${watchList.slice(0, 12).map((asset) => `<tr><td>${escapeHtml(asset.asset_name)}</td><td><span class="badge ${safeClass(asset.status)}">${escapeHtml(labelFor("status", asset.status))}</span></td><td>${escapeHtml(asset.assigned_to || asset.department || "")}</td></tr>`).join("") || `<tr><td colspan="3">CHƯA CÓ THIẾT BỊ CẦN XỬ LÝ.</td></tr>`}</tbody>
            </table>
          </article>
          <article class="module-card">
            <h3>GỢI Ý VẬN HÀNH</h3>
            <p>Chọn thiết bị ở tab Thiết bị để cập nhật tình trạng và ghi chú bảo trì. Giai đoạn kế tiếp có thể ghi timeline riêng vào tab MaintenanceLogs.</p>
          </article>
        </div>
      </div>
    `;
  }

  function renderReportsView() {
    const byGroup = countBy(state.assets, "asset_group_label");
    const byStatus = countBy(state.assets, "status", "status");
    els.content.innerHTML = `
      <div class="view-only-panel">
        <div class="panel-head report-title-row">
          <h2>BÁO CÁO</h2>
          <div class="report-actions">
            <button class="secondary-button" type="button" data-export-csv>Xuất Excel/CSV</button>
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
    els.content.querySelector("[data-export-csv]").addEventListener("click", exportCsv);
    els.content.querySelector("[data-print-pdf]").addEventListener("click", () => window.print());
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
    const currentOrder = setting.sort_order;
    setting.sort_order = target.sort_order;
    target.sort_order = currentOrder;
    try {
      await callServer("saveSetting", setting);
      await callServer("saveSetting", target);
      await refreshAppData();
      showToast("Đã đổi thứ tự cấu hình", setting.display_name || "Cấu hình TDW");
    } catch (error) {
      alert(error.message);
    }
  }

  async function handleSettingSubmit(event) {
    event.preventDefault();
    try {
      const setting = Object.fromEntries(new FormData(event.target).entries());
      const isEdit = Boolean(setting.setting_id);
      await callServer("saveSetting", setting);
      closeSettingModal();
      showToast(isEdit ? "Đã cập nhật cấu hình" : "Đã thêm cấu hình", setting.display_name || setting.setting_value || "Cấu hình TDW");
      await refreshAppData();
    } catch (error) {
      alert(error.message);
    }
  }

  async function handleDeleteSetting(settingId) {
    if (!confirm("Xóa cấu hình này khỏi dropdown?")) return;
    const setting = state.settings.find((item) => item.setting_id === settingId);
    try {
      await callServer("deleteSetting", settingId);
      await refreshAppData();
      showToast("Đã xóa cấu hình", setting?.display_name || "Cấu hình TDW");
    } catch (error) {
      alert(error.message);
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
    try {
      const user = Object.fromEntries(new FormData(event.target).entries());
      const isEdit = Boolean(user.user_id);
      await callServer("saveUser", user);
      state.usersLoaded = false;
      closeUserModal();
      if (state.activeView === "users") await renderUsersView();
      showToast(isEdit ? "Đã cập nhật user" : "Đã thêm user", user.full_name || user.username || "User TDW");
    } catch (error) {
      alert(error.message);
    }
  }

  async function handleDeleteUser(userId) {
    if (!confirm("Khóa user này?")) return;
    const user = state.users.find((item) => item.user_id === userId);
    try {
      await callServer("deleteUser", userId);
      state.usersLoaded = false;
      await renderUsersView();
      showToast("Đã khóa user", user?.full_name || user?.username || "User TDW");
    } catch (error) {
      alert(error.message);
    }
  }

  async function handleResetPassword(userId) {
    const newPassword = prompt("Nhập mật khẩu mới cho user này:");
    if (!newPassword) return;
    const user = state.users.find((item) => item.user_id === userId);
    try {
      await callServer("resetUserPassword", userId, newPassword);
      state.usersLoaded = false;
      showToast("Đã reset mật khẩu", user?.full_name || user?.username || "User TDW");
    } catch (error) {
      alert(error.message);
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

  function exportCsv() {
    const headers = ["Mã tài sản", "Tên thiết bị", "Nhóm", "Loại", "Năm", "Người dùng", "Phòng ban", "Phần mềm", "Tình trạng", "Ghi chú"];
    const rows = state.assets.map((asset) => [asset.asset_code, asset.asset_name, asset.asset_group_label, asset.asset_type, asset.purchase_year, asset.assigned_to, asset.department, asset.software_license, labelFor("status", asset.status), asset.note]);
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tdw-thiet-bi-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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
