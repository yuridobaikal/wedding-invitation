const $ = (sel) => document.querySelector(sel);
const RSVP_ENDPOINT = "https://script.google.com/macros/s/AKfycbzMSWRugoMbqgHJ21ITPmBscwx1DAIKUoKZbeWYITQCe2sL4MY5XECmsF9u8ENHpdNm/exec";
const RSVP_STORAGE_PREFIX = "wedding_rsvp_yes_";
const GUEST_ID_PREFIX = "WEDDING";

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

function capitalizeFirst(value) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
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

function setupGiftSection(params, inviteeName) {
  const sideRaw = getFirstParam(params, ["khach", "guest_side", "side", "phe", "ben"]);
  const side = resolveGuestSide(sideRaw);
  const guestIdRaw = getFirstParam(params, ["guest_id", "guestid", "id", "ma_khach"]);
  const guestIdForTransfer = formatGuestTransferId(guestIdRaw);

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
  const inviteeNameForTransfer = inviteeName
    ? normalizeTransferText(inviteeName)
    : "";
  const dynamicNote = [inviteeNameForTransfer, selected.note, guestIdForTransfer]
    .filter(Boolean)
    .join(" ");
  const selectedWithDynamicNote = { ...selected, note: dynamicNote };
  const titleEl = $("#giftTitle");
  const bankEl = $("#giftBankName");
  const accountEl = $("#giftAccountNumber");
  const nameEl = $("#giftAccountName");
  const noteEl = $("#giftTransferNote");
  const qrEl = $("#giftQrImg");
  const qrCardEl = qrEl?.closest(".gift-qr");
  const copyBtn = $("#copyAccountBtn");
  const copyNoteBtn = $("#copyTransferNoteBtn");

  if (titleEl) titleEl.textContent = selected.title;
  if (bankEl) bankEl.textContent = selected.bank;
  if (accountEl) accountEl.textContent = selected.number;
  if (nameEl) nameEl.textContent = selected.name;
  if (noteEl) noteEl.textContent = dynamicNote;
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
    try {
      await navigator.clipboard.writeText(dynamicNote);
      toast("Đã copy nội dung chuyển khoản");
    } catch {
      toast("Không thể copy lúc này");
    }
  });
}

function setupOneClickRsvp(params, context) {
  const confirmBtn = $("#confirmAttendBtn");
  const confirmStatus = $("#confirmStatus");
  if (!confirmBtn) return;

  const guestId = normalizeParam(
    getFirstParam(params, ["guest_id", "guestid", "id", "ma_khach"]),
    120
  );
  const guestSideRaw = getFirstParam(params, ["khach", "guest_side", "side", "phe", "ben"]);
  const guestSide = resolveGuestSide(guestSideRaw);
  const storageKey = guestId ? `${RSVP_STORAGE_PREFIX}${guestId}` : "";
  const inviteeName = (context.inviteeName || "").trim();
  const inviteePronoun = (context.inviteePronoun || "").trim();
  const hostPronoun = (context.hostPronoun || "tụi mình").trim();

  let inviteeDisplay = "bạn";
  if (inviteeName && inviteePronoun) {
    const nameKey = normalizeKey(inviteeName);
    const pronounKey = normalizeKey(inviteePronoun);
    inviteeDisplay = nameKey.startsWith(pronounKey)
      ? inviteeName
      : `${inviteePronoun} ${inviteeName}`;
  } else if (inviteeName) {
    inviteeDisplay = inviteeName;
  } else if (inviteePronoun) {
    inviteeDisplay = inviteePronoun;
  }

  const markConfirmed = () => {
    confirmBtn.classList.remove("is-loading");
    confirmBtn.disabled = true;
    const textEl = confirmBtn.querySelector(".btn-text");
    if (textEl) textEl.textContent = "Đã xác nhận tham dự";
    if (confirmStatus) {
      confirmStatus.textContent = `Cảm ơn ${inviteeDisplay}. ${capitalizeFirst(hostPronoun)} đã nhận được xác nhận.`;
    }
  };

  if (storageKey && localStorage.getItem(storageKey) === "YES") {
    markConfirmed();
    return;
  }

  if (!guestId) {
    confirmBtn.disabled = true;
    if (confirmStatus) confirmStatus.textContent = "Thiếu mã khách mời, chưa thể xác nhận.";
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
      ten_nguoi_moi: context.inviteeName || "",
      xung_ho: context.inviteePronoun || "",
      xung_ho_minh: context.hostPronoun || "",
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
      if (confirmStatus) confirmStatus.textContent = "Không gửi được lúc này, vui lòng thử lại.";
      toast("Không gửi được xác nhận");
    }
  });
}

function applyInviteeParams() {
  const params = new URLSearchParams(window.location.search);
  const inviteeName = normalizeParam(
    getFirstParam(params, ["ten_nguoi_moi", "ten", "name", "guest"])
  );
  const inviteePronoun = normalizeParam(
    getFirstParam(params, ["xung_ho", "xungho", "pronoun"])
  );
  const hostPronoun = normalizeParam(
    getFirstParam(params, ["xung_ho_minh", "xungho_minh", "xung_ho_ben_moi", "host_pronoun"])
  );

  if (inviteeName) {
    const nameEl = $("#inviteeName");
    if (nameEl) nameEl.textContent = inviteeName;
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
    const hostPronounCap = capitalizeFirst(hostPronoun);
    document.querySelectorAll("[data-host-pronoun-cap]").forEach((el) => {
      el.textContent = hostPronounCap;
    });
  }

  setupGiftSection(params, inviteeName);
  setupOneClickRsvp(params, { inviteeName, inviteePronoun, hostPronoun });
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
    const src = btn.dataset.src;
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
