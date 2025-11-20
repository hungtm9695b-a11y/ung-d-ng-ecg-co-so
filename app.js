// ======================
// Trạng thái toàn cục
// ======================
const state = {
  basic: {},     // age, sex, vitals, risk factors
  ecgAI: null,   // kết quả AI mô phỏng
  symptoms: {},  // history, duration, sx...
  hearScore: null,
  hearDetail: null,
  riskLevel: null,
};

// ======================
// Điều khiển bước & progress
// ======================
function goToStep(step) {
  // 0..4
  for (let i = 0; i <= 4; i++) {
    const el = document.getElementById(`step-${i}`);
    if (!el) continue;
    if (i === step) {
      el.classList.remove("d-none");
    } else {
      el.classList.add("d-none");
    }
  }

  // cập nhật text & progress
  const currentText = document.getElementById("currentStepText");
  const progressBar = document.getElementById("progressBar");

  currentText.textContent = step;
  const percent = (step / 4) * 100;
  progressBar.style.width = `${percent}%`;

  // nếu chuyển sang step 4 thì tính toán kết quả
  if (step === 4) {
    collectAllInputs();
    computeHearAndRisk();
    renderResult();
  }
}

// Reset toàn bộ
function resetAll() {
  window.location.reload();
}

// ======================
// Bước 1: Lưu thông tin cơ bản
// ======================
function collectBasicInfo() {
  const age = parseInt(document.getElementById("age").value || "0", 10);
  const sex = document.getElementById("sex").value;
  const sbp = parseInt(document.getElementById("sbp").value || "0", 10);
  const dbp = parseInt(document.getElementById("dbp").value || "0", 10);
  const hr = parseInt(document.getElementById("hr").value || "0", 10);
  const rr = parseInt(document.getElementById("rr").value || "0", 10);
  const spo2 = parseInt(document.getElementById("spo2").value || "0", 10);
  const temp = parseFloat(document.getElementById("temp").value || "0");

  const riskFactors = {
    htn: document.getElementById("rf-htn").checked,
    dm: document.getElementById("rf-dm").checked,
    dyslip: document.getElementById("rf-dyslip").checked,
    smoke: document.getElementById("rf-smoke").checked,
    cad: document.getElementById("rf-cad").checked,
    ckd: document.getElementById("rf-ckd").checked,
  };

  state.basic = { age, sex, sbp, dbp, hr, rr, spo2, temp, riskFactors };
}

// ======================
// Bước 2: ECG – preview & mô phỏng AI
// ======================
function handleECGFileChange(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const img = document.getElementById("ecgPreview");
    const container = document.getElementById("ecgPreviewContainer");
    img.src = e.target.result;
    container.classList.remove("d-none");
  };
  reader.readAsDataURL(file);
}

// Mô phỏng API AI phân tích ECG (demo, không thật)
function simulateAIAnalyzeECG() {
  // Lấy lại thông tin cơ bản để mô phỏng hợp lý hơn
  collectBasicInfo();
  const hr = state.basic.hr || 80;

  // logic mô phỏng rất đơn giản:
  let stElevation = false;
  let stDepression = false;
  let tInversion = false;

  // giả định nhịp nhanh, ST chênh lên khi mạch > 100, hoặc random
  if (hr > 100) {
    stElevation = true;
    tInversion = true;
  } else {
    // tỉ lệ nhỏ có ST chênh xuống
    stDepression = Math.random() < 0.3;
    tInversion = Math.random() < 0.4;
  }

  const result = {
    rhythm: hr > 100 ? `Sinus tachycardia ${hr} bpm` : `Sinus rhythm ${hr} bpm`,
    st_elevation: {
      present: stElevation,
      leads: stElevation ? ["V2", "V3", "V4"] : [],
      max_mm: stElevation ? 3.0 : 0.0,
    },
    st_depression: {
      present: stDepression,
      leads: stDepression ? ["V5", "V6"] : [],
      max_mm: stDepression ? 2.0 : 0.0,
    },
    t_wave_inversion: {
      present: tInversion,
      leads: tInversion ? ["V4", "V5", "V6"] : [],
    },
    pathologic_q: {
      present: false,
      leads: [],
    },
    other_findings: [],
    quality_flag: "good",
  };

  state.ecgAI = result;

  // hiển thị JSON & tóm tắt mô phỏng
  const container = document.getElementById("aiResultContainer");
  const jsonEl = document.getElementById("aiResultJson");
  const summaryEl = document.getElementById("aiResultSummary");

  jsonEl.textContent = JSON.stringify(result, null, 2);

  let summary = result.rhythm + ". ";
  if (result.st_elevation.present) {
    summary += `ST chênh lên khoảng ${result.st_elevation.max_mm} mm ở ${result.st_elevation.leads.join(", ")}. `;
  }
  if (result.st_depression.present) {
    summary += `ST chênh xuống ở ${result.st_depression.leads.join(", ")}. `;
  }
  if (result.t_wave_inversion.present) {
    summary += `T đảo ở ${result.t_wave_inversion.leads.join(", ")}. `;
  }
  if (!result.st_elevation.present && !result.st_depression.present && !result.t_wave_inversion.present) {
    summary += "Không thấy thay đổi ST-T đáng kể (mô phỏng).";
  }

  summaryEl.textContent = summary;

  container.classList.remove("d-none");
}

// ======================
// Bước 3: Triệu chứng & HEAR preview
// ======================
function collectSymptomInfo() {
  const historyType = document.getElementById("historyType").value;
  const painDuration = document.getElementById("painDuration").value;
  const sxDyspnea = document.getElementById("sx-dyspnea").checked;
  const sxSweat = document.getElementById("sx-sweat").checked;
  const sxRadiate = document.getElementById("sx-radiate").checked;
  const sxSyncope = document.getElementById("sx-syncope").checked;

  state.symptoms = {
    historyType,
    painDuration,
    sxDyspnea,
    sxSweat,
    sxRadiate,
    sxSyncope,
  };
}

function calculateHearPreview() {
  collectBasicInfo();
  collectSymptomInfo();
  computeHearAndRisk(true); // chỉ tính HEAR, chưa xuất risk card
  if (state.hearScore != null) {
    const container = document.getElementById("hearPreviewContainer");
    const scoreText = document.getElementById("hearScoreText");
    const riskText = document.getElementById("hearRiskText");

    scoreText.textContent = `${state.hearScore} điểm`;

    let desc = "";
    if (state.hearScore <= 2) {
      desc = "Nguy cơ thấp (theo HEAR – demo).";
    } else if (state.hearScore <= 4) {
      desc = "Nguy cơ trung bình.";
    } else {
      desc = "Nguy cơ cao.";
    }
    riskText.textContent = desc;
    container.classList.remove("d-none");
  }
}

// ======================
// Tính HEAR & phân tầng nguy cơ (demo)
// ======================
function computeHearAndRisk(onlyHear = false) {
  collectBasicInfo();
  collectSymptomInfo();

  const { basic, symptoms, ecgAI } = state;
  const { age, riskFactors, sbp, spo2 } = basic;

  // H (History)
  let H = 0;
  if (symptoms.historyType === "typical") H = 2;
  else if (symptoms.historyType === "atypical") H = 1;
  else H = 0;

  // E (ECG) – dựa vào AI mô phỏng
  let E = 0;
  if (ecgAI) {
    if (ecgAI.st_elevation.present) E = 2;
    else if (ecgAI.st_depression.present || ecgAI.t_wave_inversion.present)
      E = 1;
    else E = 0;
  } else {
    E = 0; // nếu chưa có ECG, cho 0 trong demo
  }

  // A (Age)
  let A = 0;
  if (age > 65) A = 2;
  else if (age >= 45) A = 1;
  else A = 0;

  // R (Risk factors)
  let rfCount = 0;
  if (riskFactors) {
    Object.values(riskFactors).forEach((v) => {
      if (v) rfCount += 1;
    });
  }
  let R = 0;
  if (rfCount >= 4) R = 2;
  else if (rfCount >= 2) R = 1;
  else R = 0;

  const hearScore = H + E + A + R;
  state.hearScore = hearScore;
  state.hearDetail = { H, E, A, R, rfCount };

  if (onlyHear) return;

  // Xác định mức nguy cơ tổng hợp (4 màu) rất đơn giản (demo):
  // - ĐỎ: HEAR >= 6 hoặc SBP < 90 hoặc SpO2 < 90 hoặc ST chênh lên
  // - CAM: HEAR 4–5
  // - VÀNG: HEAR 2–3
  // - XANH: HEAR 0–1
  let risk = "green";

  if (hearScore >= 6 || sbp < 90 || spo2 < 90 || (ecgAI && ecgAI.st_elevation.present)) {
    risk = "red";
  } else if (hearScore >= 4) {
    risk = "orange";
  } else if (hearScore >= 2) {
    risk = "yellow";
  } else {
    risk = "green";
  }

  state.riskLevel = risk;
}

// ======================
// Render kết quả Step 4
// ======================
function renderResult() {
  const { hearScore, hearDetail, riskLevel, basic, symptoms, ecgAI } = state;
  const container = document.getElementById("riskCardContainer");
  container.innerHTML = "";

  let title = "";
  let desc = "";
  let colorClass = "";

  if (riskLevel === "red") {
    title = "Mức ĐỎ – Nguy cơ rất cao / nghi hội chứng vành cấp nguy hiểm";
    desc =
      "Xử trí cấp cứu ngay tại chỗ (ABC, oxy nếu SpO₂ thấp, đường truyền, aspirin nếu không chống chỉ định) và chuyển tuyến khẩn đến bệnh viện có can thiệp tim mạch, liên hệ trước khi chuyển.";
    colorClass = "risk-red";
  } else if (riskLevel === "orange") {
    title = "Mức CAM – Nguy cơ cao";
    desc =
      "Cần chuyển bệnh nhân đến bệnh viện có khoa tim mạch/cấp cứu trong thời gian sớm, theo dõi mạch, huyết áp, SpO₂ trên đường chuyển, cân nhắc lặp lại ECG.";
    colorClass = "risk-orange";
  } else if (riskLevel === "yellow") {
    title = "Mức VÀNG – Nguy cơ trung bình";
    desc =
      "Khuyến khích chuyển tuyến để làm thêm xét nghiệm (troponin, siêu âm tim...). Nếu giữ tại tuyến cơ sở, cần theo dõi sát, lặp lại ECG, dặn bệnh nhân quay lại ngay nếu đau tăng, khó thở, vã mồ hôi.";
    colorClass = "risk-yellow";
  } else {
    title = "Mức XANH – Nguy cơ thấp (không loại trừ hoàn toàn bệnh mạch vành)";
    desc =
      "Có thể theo dõi ngoại trú, tìm thêm các nguyên nhân khác gây đau ngực (cơ xương, hô hấp, tiêu hoá...). Dặn bệnh nhân quay lại/đến cấp cứu nếu đau tăng, kéo dài, khó thở, vã mồ hôi, ngất.";
    colorClass = "risk-green";
  }

  const card = document.createElement("div");
  card.className = `risk-card ${colorClass}`;
  card.innerHTML = `
    <div class="d-flex justify-content-between align-items-start mb-2">
      <div>
        <div class="fw-bold mb-1">${title}</div>
        <div class="badge bg-light text-dark badge-pill">
          HEAR: ${hearScore} điểm
        </div>
      </div>
    </div>
    <div class="mb-1">
      <strong>Khuyến cáo hành động (gợi ý):</strong>
      <div>${desc}</div>
    </div>
  `;
  container.appendChild(card);

  // Chi tiết HEAR
  const hearDetailText = document.getElementById("hearDetailText");
  if (hearDetail) {
    hearDetailText.innerHTML = `
      H (triệu chứng đau ngực): ${hearDetail.H} điểm<br>
      E (ECG – AI mô phỏng): ${hearDetail.E} điểm<br>
      A (tuổi): ${hearDetail.A} điểm (tuổi: ${basic.age || "?"})<br>
      R (yếu tố nguy cơ): ${hearDetail.R} điểm (số yếu tố: ${hearDetail.rfCount})<br>
      <strong>Tổng HEAR: ${hearScore} điểm</strong>
    `;
  }

  // Tóm tắt ECG
  const ecgSummaryText = document.getElementById("ecgSummaryText");
  if (ecgAI) {
    let summary = ecgAI.rhythm + ". ";
    if (ecgAI.st_elevation.present) {
      summary += `ST chênh lên ${ecgAI.st_elevation.max_mm} mm ở ${ecgAI.st_elevation.leads.join(", ")}. `;
    }
    if (ecgAI.st_depression.present) {
      summary += `ST chênh xuống ở ${ecgAI.st_depression.leads.join(", ")}. `;
    }
    if (ecgAI.t_wave_inversion.present) {
      summary += `T đảo ở ${ecgAI.t_wave_inversion.leads.join(", ")}. `;
    }
    if (
      !ecgAI.st_elevation.present &&
      !ecgAI.st_depression.present &&
      !ecgAI.t_wave_inversion.present
    ) {
      summary += "Không thấy thay đổi ST–T rõ ràng (mô phỏng).";
    }
    ecgSummaryText.textContent = summary;
  } else {
    ecgSummaryText.textContent =
      "Chưa có kết quả AI phân tích ECG (bước 2). Trong demo có thể bỏ qua.";
  }
}

// ======================
// Thu gom tất cả input
// ======================
function collectAllInputs() {
  collectBasicInfo();
  collectSymptomInfo();
}

// ======================
// Giải thích chi tiết
// ======================
function toggleExplain() {
  const container = document.getElementById("explainContainer");
  const txt = document.getElementById("explainToggleText");
  const isHidden = container.classList.contains("d-none");
  if (isHidden) {
    container.classList.remove("d-none");
    txt.textContent = "Ẩn giải thích chi tiết & hạn chế AI";
  } else {
    container.classList.add("d-none");
    txt.textContent = "Xem giải thích chi tiết & hạn chế AI";
  }
}

// ======================
// Khởi động
// ======================
document.addEventListener("DOMContentLoaded", () => {
  goToStep(0);
});
