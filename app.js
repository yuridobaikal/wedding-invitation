const $ = (sel) => document.querySelector(sel);
const RSVP_ENDPOINT = "https://script.google.com/macros/s/AKfycbzMSWRugoMbqgHJ21ITPmBscwx1DAIKUoKZbeWYITQCe2sL4MY5XECmsF9u8ENHpdNm/exec";
const RSVP_STORAGE_PREFIX = "wedding_rsvp_yes_";
const GUEST_ID_PREFIX = "WEDDING";
const BGM_STORAGE_KEY = "wedding_bgm_on";

function toast(msg) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

function normalizeParam(value, maxLen = 60) {
  if (!value) return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLen);
}

function getFirstParam(params, keys) {
  for (const key of keys) {
    const value = params.get(key);
    if (value) return value;
  }
  return "";
}

function normalizeKey(value) {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

function normalizeTransferText(value) {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeGuestId(value) {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .toUpperCase();
}

function formatGuestTransferId(value) {
  const cleaned = normalizeGuestId(value);
  if (!cleaned) return "";
  const prefix = normalizeGuestId(GUEST_ID_PREFIX);
  return cleaned.startsWith(prefix) ? cleaned : `${prefix}${cleaned}`;
}

function resolveGuestSide(value) {
  const key = normalizeKey(value);
  if (!key) return "groom";
  if (["codau", "nhagai", "bride", "gai"].some(v => key.includes(v))) return "bride";
  if (["chure", "nhatrai", "groom", "trai"].some(v => key.includes(v))) return "groom";
  return "groom";
}

function resolveBankBin(account) {
  if (account.bankBin) return account.bankBin;
  const bankKey = normalizeKey(account.bank || "");
  const knownBanks = {
    mb: "970422",
    mbbank: "970422",
    vietcombank: "970436",
    vcb: "970436",
    acb: "970416",
    techcombank: "970407",
    tcb: "970407"
  };
  return knownBanks[bankKey] || "";
}

function buildGiftQrUrl(account) {
  const bankBin = resolveBankBin(account);
  if (!bankBin) return "";
  const addInfo = encodeURIComponent(account.note || "");
  const accountName = encodeURIComponent(account.name || "");
  return `https://img.vietqr.io/image/${bankBin}-${account.number}-print.png?addInfo=${addInfo}&accountName=${accountName}`;
}

function setupBackgroundMusic() {
  const audio = $("#bgMusic");
  const btn = $("#musicToggleBtn");
  const textEl = $("#musicToggleText");
  if (!audio || !btn || !textEl) return;

  audio.volume = 0.25;
  const savedPreference = localStorage.getItem(BGM_STORAGE_KEY);
  const isDesktopLike = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  let isEnabled = savedPreference === "1" || (savedPreference === null && isDesktopLike);
  let hasRetryListeners = false;

  const updateUi = () => {
    btn.classList.toggle("is-on", isEnabled);
    btn.setAttribute("aria-pressed", isEnabled ? "true" : "false");
    textEl.textContent = isEnabled ? "Tắt nhạc" : "Bật nhạc";
  };

  const retryPlay = async () => {
    if (!isEnabled) return;
    try {
      await audio.play();
      window.removeEventListener("pointerdown", retryPlay);
      window.removeEventListener("keydown", retryPlay);
      hasRetryListeners = false;
    } catch {
      // Keep listening for the next user interaction.
    }
  };

  const attachRetryListeners = () => {
    if (hasRetryListeners) return;
    hasRetryListeners = true;
    window.addEventListener("pointerdown", retryPlay, { passive: true });
    window.addEventListener("keydown", retryPlay);
  };

  const detachRetryListeners = () => {
    if (!hasRetryListeners) return;
    window.removeEventListener("pointerdown", retryPlay);
    window.removeEventListener("keydown", retryPlay);
    hasRetryListeners = false;
  };

  const enableMusic = async () => {
    isEnabled = true;
    localStorage.setItem(BGM_STORAGE_KEY, "1");
    updateUi();
    try {
      await audio.play();
      detachRetryListeners();
    } catch {
      attachRetryListeners();
    }
  };

  const disableMusic = () => {
    isEnabled = false;
    localStorage.setItem(BGM_STORAGE_KEY, "0");
    audio.pause();
    detachRetryListeners();
    updateUi();
  };

  btn.addEventListener("click", () => {
    if (isEnabled) disableMusic();
    else void enableMusic();
  });

  updateUi();
  if (isEnabled) void enableMusic();
}

function setupGalleryLayout() {
  const galleryEl = document.querySelector("#gallery .masonry");
  if (!galleryEl) return;
  const shotCount = galleryEl.querySelectorAll(".shot").length;
  galleryEl.classList.toggle("single", shotCount === 1);
}

function setupInviteeText(params) {
  const inviteeName = normalizeParam(
    getFirstParam(params, ["ten_nguoi_moi", "ten", "name", "guest"]),
    120
  );
  const inviteePronoun = normalizeParam(
    getFirstParam(params, ["xung_ho", "xungho", "pronoun"]),
    60
  );
  const hostPronoun = normalizeParam(
    getFirstParam(params, ["xung_ho_minh", "xungho_minh", "xung_ho_ben_moi", "host_pronoun"]),
    60
  );

  if (inviteeName) {
    const inviteeNameEl = $("#inviteeName");
    if (inviteeNameEl) inviteeNameEl.textContent = inviteeName;
  }

  if (inviteePronoun) {
    document.querySelectorAll("[data-invitee-pronoun]").forEach((el) => {
      el.textContent = inviteePronoun;
    });
  }

  if (hostPronoun) {
    document.querySelectorAll("[data-host-pronoun]").forEach((el) => {
      el.textContent = hostPronoun;
    });
  }
}

function setupCeremonyInfo(params) {
  const sideRaw = getFirstParam(params, ["khach", "guest_side", "side", "phe", "ben"]);
  const side = resolveGuestSide(sideRaw);
  const ceremonyTitleEl = $("#ceremonyTitle");
  const ceremonyPlaceEl = $("#ceremonyPlace");
  if (!ceremonyTitleEl && !ceremonyPlaceEl) return;

  const ceremonyBySide = {
    groom: {
      title: "Thông tin Lễ Thành Hôn",
      place: "Xóm Hoa Nam, Thôn Hội, Xã Song Lãng, Huyện Vũ Thư, Tỉnh Thái Bình"
    },
    bride: {
      title: "Thông tin Lễ Vu Quy",
      place: "Xóm Đông Cường, Thôn Trung, Xã Song Lãng, Huyện Vũ Thư, Tỉnh Thái Bình"
    }
  };

  const selected = ceremonyBySide[side] || ceremonyBySide.groom;
  if (ceremonyTitleEl) ceremonyTitleEl.textContent = selected.title;
  if (ceremonyPlaceEl) ceremonyPlaceEl.textContent = selected.place;
}

function setupIntimateMealInfo(params) {
  const sideRaw = getFirstParam(params, ["khach", "guest_side", "side", "phe", "ben"]);
  const side = resolveGuestSide(sideRaw);
  const mealTimeEl = $("#intimateMealTime");
  const mealPlaceEl = $("#intimateMealPlace");
  if (!mealTimeEl && !mealPlaceEl) return;

  const mealTimeBySide = {
    groom: "16:00 • Thứ Bảy 28/03/2026",
    bride: "07:00 • Chủ Nhật 29/03/2026"
  };

  const mealPlaceBySide = {
    groom: "Tại nhà trai: Xóm Hoa Nam, Thôn Hội, Song Lãng, Vũ Thư, Thái Bình",
    bride: "Tại nhà gái: Xóm Đông Cường, Thôn Trung, Song Lãng, Vũ Thư, Thái Bình"
  };

  if (mealTimeEl) mealTimeEl.textContent = mealTimeBySide[side] || mealTimeBySide.groom;
  if (mealPlaceEl) mealPlaceEl.textContent = mealPlaceBySide[side] || mealPlaceBySide.groom;
}

function setupGiftSection(params) {
  const sideRaw = getFirstParam(params, ["khach", "guest_side", "side", "phe", "ben"]);
  const side = resolveGuestSide(sideRaw);
  const guestIdRaw = getFirstParam(params, ["guest_id", "guestid", "ma_khach"]);
  const guestIdForTransfer = formatGuestTransferId(guestIdRaw);
  const inviteeNameRaw = normalizeParam(
    getFirstParam(params, ["ten_nguoi_moi", "ten", "name", "guest"]),
    120
  );
  const inviteeNameForTransfer = normalizeTransferText(inviteeNameRaw);
  const hasInviteeName = Boolean(inviteeNameForTransfer);

  const giftAccounts = {
    groom: {
      title: "Mừng cưới chú rể",
      bank: "MB Bank",
      bankBin: "970422",
      number: "699600006996",
      name: "DO DINH NHAT",
      note: "mung cuoi DINH NHAT"
    },
    bride: {
      title: "Mừng cưới cô dâu",
      bank: "MB Bank",
      bankBin: "970422",
      number: "100688886868",
      name: "NGUYEN THI THUY",
      note: "mung cuoi NGUYEN THUY"
    }
  };

  const selected = giftAccounts[side];
  const dynamicNote = hasInviteeName
    ? [inviteeNameForTransfer, selected.note, guestIdForTransfer].filter(Boolean).join(" ")
    : "";
  const selectedWithDynamicNote = { ...selected, note: dynamicNote };
  const titleEl = $("#giftTitle");
  const bankEl = $("#giftBankName");
  const accountEl = $("#giftAccountNumber");
  const nameEl = $("#giftAccountName");
  const noteEl = $("#giftTransferNote");
  const noteRowEl = noteEl?.closest(".kv");
  const qrEl = $("#giftQrImg");
  const qrCardEl = qrEl?.closest(".gift-qr");
  const copyBtn = $("#copyAccountBtn");
  const copyNoteBtn = $("#copyTransferNoteBtn");

  if (titleEl) titleEl.textContent = selected.title;
  if (bankEl) bankEl.textContent = selected.bank;
  if (accountEl) accountEl.textContent = selected.number;
  if (nameEl) nameEl.textContent = selected.name;
  if (noteEl) noteEl.textContent = dynamicNote;
  if (hasInviteeName) {
    noteRowEl?.classList.remove("is-hidden");
    copyNoteBtn?.classList.remove("is-hidden");
  } else {
    noteRowEl?.classList.add("is-hidden");
    copyNoteBtn?.classList.add("is-hidden");
  }
  if (qrEl) {
    const qrUrl = buildGiftQrUrl(selectedWithDynamicNote);
    const hideQrCard = () => qrCardEl?.classList.add("is-hidden");
    qrCardEl?.classList.remove("is-hidden");
    qrEl.onerror = () => {
      hideQrCard();
      toast("Không tải được QR, vui lòng dùng STK bên dưới");
    };
    qrEl.alt = `QR ${selected.title}`;
    if (!qrUrl) {
      hideQrCard();
      toast("Thiếu mã ngân hàng để tạo VietQR");
    } else {
      qrEl.src = qrUrl;
    }
  }

  copyBtn?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(selected.number);
      toast("Đã copy số tài khoản");
    } catch {
      toast("Không thể copy lúc này");
    }
  });

  copyNoteBtn?.addEventListener("click", async () => {
    if (!dynamicNote) {
      toast("Không có nội dung chuyển khoản gợi ý");
      return;
    }
    try {
      await navigator.clipboard.writeText(dynamicNote);
      toast("Đã copy nội dung chuyển khoản");
    } catch {
      toast("Không thể copy lúc này");
    }
  });
}

function setupOneClickRsvp(params) {
  const confirmBtn = $("#confirmAttendBtn");
  const confirmStatus = $("#confirmStatus");
  if (!confirmBtn) return;

  const guestId = normalizeParam(
    getFirstParam(params, ["guest_id", "guestid", "ma_khach"]),
    120
  );
  const guestSideRaw = getFirstParam(params, ["khach", "guest_side", "side", "phe", "ben"]);
  const guestSide = resolveGuestSide(guestSideRaw);
  if (!guestId) {
    confirmBtn.style.display = "none";
    if (confirmStatus) confirmStatus.style.display = "none";
    return;
  }

  confirmBtn.hidden = false;
  confirmBtn.style.display = "";
  if (confirmStatus) {
    confirmStatus.hidden = true;
    confirmStatus.style.display = "none";
  }
  const storageKey = `${RSVP_STORAGE_PREFIX}${guestId}`;

  const markConfirmed = () => {
    confirmBtn.classList.remove("is-loading");
    confirmBtn.disabled = true;
    const textEl = confirmBtn.querySelector(".btn-text");
    if (textEl) textEl.textContent = "Đã xác nhận tham dự";
  };

  if (storageKey && localStorage.getItem(storageKey) === "YES") {
    markConfirmed();
    return;
  }

  confirmBtn.addEventListener("click", async () => {
    if (!RSVP_ENDPOINT || RSVP_ENDPOINT.includes("PASTE_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE")) {
      toast("Chưa cấu hình endpoint RSVP");
      return;
    }

    confirmBtn.classList.add("is-loading");
    confirmBtn.disabled = true;

    const payload = {
      guest_id: guestId,
      response: "YES",
      submitted_at: new Date().toISOString(),
      khach: guestSide,
      page_url: window.location.href
    };

    try {
      await fetch(RSVP_ENDPOINT, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      if (storageKey) localStorage.setItem(storageKey, "YES");
      markConfirmed();
      toast("Đã xác nhận tham dự");
    } catch {
      confirmBtn.classList.remove("is-loading");
      confirmBtn.disabled = false;
      if (confirmStatus) {
        confirmStatus.textContent = "Không gửi được lúc này, vui lòng thử lại.";
        confirmStatus.hidden = false;
        confirmStatus.style.display = "";
      }
      toast("Không gửi được xác nhận");
    }
  });
}

function applyInviteeParams() {
  const params = new URLSearchParams(window.location.search);
  setupGalleryLayout();
  setupBackgroundMusic();
  setupInviteeText(params);
  setupCeremonyInfo(params);
  setupIntimateMealInfo(params);
  setupGiftSection(params);
  setupOneClickRsvp(params);
}

applyInviteeParams();

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    if (!id || id === "#") return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

// Lightbox
const lb = $("#lightbox");
const lbImg = $("#lbImg");
const lbClose = $("#lbClose");

document.querySelectorAll(".shot").forEach(btn => {
  btn.addEventListener("click", () => {
    const src = btn.dataset.src || btn.querySelector("img")?.getAttribute("src") || "";
    if (!src) return;
    lbImg.src = src;
    lb.classList.add("open");
    lb.setAttribute("aria-hidden", "false");
  });
});

function closeLB() {
  if (!lb || !lbImg) return;
  lb.classList.remove("open");
  lb.setAttribute("aria-hidden", "true");
  lbImg.src = "";
}
lbClose?.addEventListener("click", closeLB);
lb?.addEventListener("click", (e) => { if (e.target === lb) closeLB(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLB(); });

// Share
async function shareLink() {
  try {
    if (navigator.share) {
      await navigator.share({
        title: document.title,
        text: "Thiệp mời cưới online 💛",
        url: location.href
      });
    } else {
      await navigator.clipboard.writeText(location.href);
      toast("Đã copy link thiệp mời ✅");
    }
  } catch {
    toast("Không thể chia sẻ lúc này.");
  }
}
