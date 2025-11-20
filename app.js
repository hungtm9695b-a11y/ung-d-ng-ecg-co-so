// Điều hướng bước
function goToStep(step) {
  for (let i = 1; i <= 4; i++) {
    document.getElementById("step" + i).classList.add("hidden");
    document.getElementById("stepLabel" + i).classList.remove("active");
  }
  document.getElementById("step" + step).classList.remove("hidden");
  document.getElementById("stepLabel" + step).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Tách SBP từ "110/70" hoặc "110"
function parseBloodPressure(text) {
  if (!text) return { sbp: NaN, dbp: NaN };
  const cleaned = text.replace(/\s+/g, "");
  const parts = cleaned.split("/");
  if (parts.length === 2) {
    return { sbp: parseInt(parts[0]), dbp: parseInt(parts[1]) };
  }
  return { sbp: parseInt(cleaned), dbp: NaN };
}

// HEAR score (tham khảo)
function calculateHEAR() {
  let H = 0, E = 0, A = 0, R = 0;

  const symptomCount = document.querySelectorAll(".symptom:checked").length;
  if (symptomCount <= 2) H = 0;
  else if (symptomCount <= 4) H = 1;
  else H = 2;

  const ischemia = document.getElementById("ecgIschemia").checked;
  const other = document.getElementById("ecgOtherAbnormal").checked;
  if (!ischemia && !other) E = 0;
  else if (other && !ischemia) E = 1;
  else if (ischemia) E = 2;

  const age = parseInt(document.getElementById("patientAge").value);
  if (age < 45) A = 0;
  else if (age < 65) A = 1;
  else A = 2;

  const riskCount = document.querySelectorAll(".risk:checked").length;
  if (riskCount === 0) R = 0;
  else if (riskCount <= 2) R = 1;
  else R = 2;

  return { H, E, A, R, total: H + E + A + R };
}

// ======================
// ECG PREVIEW + "AI" DEMO
// ======================
const ecgFileInput = document.getElementById("ecgFile");
const ecgPreview = document.getElementById("ecgPreview");
const ecgStatus = document.getElementById("ecgStatus");

ecgFileInput.addEventListener("change", async function () {
  const file = this.files[0];
  if (!file) {
    ecgPreview.innerHTML = "Chưa có ảnh ECG.";
    ecgStatus.textContent = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    ecgPreview.innerHTML = "Ảnh ECG xem trước:";
    const img = document.createElement("img");
    img.src = e.target.result;
    ecgPreview.appendChild(img);
  };
  reader.readAsDataURL(file);

  await callBackendDemo(file);
});

// ⚠️ Hàm này hiện tại là "AI mô phỏng" để demo trên GitHub Pages.
// Sau này IT chỉ cần thay thành fetch() tới API thật.
async function callBackendDemo(file) {
  ecgStatus.textContent = "AI đang phân tích ECG (demo)...";
  ecgStatus.className = "status-text status-loading";

  // giả lập trễ 1.2s
  await new Promise(resolve => setTimeout(resolve, 1200));

  const age = parseInt(document.getElementById("patientAge").value) || 0;

  let ischemia = false;
  let dangerousArr = false;
  let otherAbn = false;

  if (age >= 65) {
    ischemia = true;
    otherAbn = true;
  } else if (age >= 45) {
    ischemia = true;
  } else {
    otherAbn = true;
  }

  const fileName = file.name.toLowerCase();
  if (fileName.includes("vt") || fileName.includes("vf")) {
    dangerousArr = true;
    ischemia = false;
  }

  document.getElementById("ecgIschemia").checked = ischemia;
  document.getElementById("ecgDangerousRhythm").checked = dangerousArr;
  document.getElementById("ecgOtherAbnormal").checked = otherAbn;

  let msg = "AI demo: ";
  msg += ischemia ? "nghi thiếu máu cơ tim; " : "không rõ thiếu máu cơ tim; ";
  msg += dangerousArr ? "có rối loạn nhịp nguy hiểm; " : "không thấy rối loạn nhịp nguy hiểm; ";
  msg += otherAbn ? "có bất thường ECG khác." : "không ghi nhận bất thường khác.";
  ecgStatus.textContent = msg;
  ecgStatus.className = "status-text status-success";
}

// ======================
// LOGIC 4 MÀU – 4 KHUYẾN CÁO
// ======================
function calculateAndShowResult() {
  const bpText = document.getElementById("bp").value;
  const { sbp } = parseBloodPressure(bpText);
  const hr = parseInt(document.getElementById("hr").value);
  const rr = parseInt(document.getElementById("rr").value);
  const spo2 = parseInt(document.getElementById("spo2").value);
  const consciousness = document.getElementById("consciousness").value;

  let vitalsCritical = false;
  let vitalReasons = [];

  if (!isNaN(sbp) && sbp < 90) {
    vitalsCritical = true;
    vitalReasons.push("Huyết áp thấp (SBP < 90 mmHg)");
  }
  if (!isNaN(hr) && (hr < 40 || hr > 140)) {
    vitalsCritical = true;
    vitalReasons.push("Mạch bất thường (< 40 hoặc > 140 l/p)");
  }
  if (!isNaN(rr) && rr > 30) {
    vitalsCritical = true;
    vitalReasons.push("Nhịp thở nhanh (> 30 l/p)");
  }
  if (!isNaN(spo2) && spo2 < 90) {
    vitalsCritical = true;
    vitalReasons.push("SpO₂ thấp (< 90%)");
  }
  if (consciousness !== "tinh") {
    vitalsCritical = true;
    vitalReasons.push("Tri giác không tỉnh táo");
  }

  const dangerousRhythm = document.getElementById("ecgDangerousRhythm").checked;
  const ecgIschemia = document.getElementById("ecgIschemia").checked;
  const ecgOther = document.getElementById("ecgOtherAbnormal").checked;

  const symptomsChecked = document.querySelectorAll(".symptom:checked").length;
  const riskChecked = document.querySelectorAll(".risk:checked").length;

  let riskClass = "";
  let riskTitle = "";
  let riskSubtitle = "";
  let vitalExplain = "";
  let rhythmExplain = "";
  let ischemiaExplain = "";
  let recommendations = [];
  let probability = 0;

  // 1) ĐỎ – NGUY KỊCH
  if (vitalsCritical) {
    riskClass = "risk-critical";
    riskTitle = "ĐỎ – NGUY KỊCH (ƯU TIÊN CẤP CỨU)";
    riskSubtitle = "Chỉ số sinh tồn không ổn định, nguy cơ đe dọa tính mạng.";
    vitalExplain = "AI Safety: phát hiện bất thường sinh tồn: " + vitalReasons.join("; ") + ".";
    rhythmExplain = "AI Rhythm: đánh giá nhịp sau khi đã ổn định huyết động.";
    ischemiaExplain = "AI thiếu máu cơ tim chỉ mang tính tham khảo, không trì hoãn cấp cứu.";
    recommendations = [
      "Xử trí ABC ngay (đường thở, hô hấp, tuần hoàn).",
      "Oxy, truyền dịch/thuốc theo phác đồ.",
      "Gọi hỗ trợ nội viện và chuẩn bị chuyển tuyến khẩn cấp.",
      "Theo dõi sát trên đường vận chuyển."
    ];
    probability = 0.9;
  }
  // 2) CAM – RỐI LOẠN NHỊP NGUY HIỂM
  else if (dangerousRhythm) {
    riskClass = "risk-arrhythmia";
    riskTitle = "CAM – RỐI LOẠN NHỊP NGUY HIỂM";
    riskSubtitle = "AI Rhythm nghi ngờ rối loạn nhịp có nguy cơ đe dọa tính mạng.";
    vitalExplain = "AI Safety: chưa ghi nhận tiêu chí sốc rõ, nhưng cần theo dõi sát.";
    rhythmExplain = "AI Rhythm: ưu tiên xử trí rối loạn nhịp (sốc điện/thuốc).";
    ischemiaExplain = "AI thiếu máu cơ tim sẽ đánh giá thêm sau khi kiểm soát nhịp.";
    recommendations = [
      "Xử trí rối loạn nhịp theo phác đồ (sốc điện/thuốc).",
      "Theo dõi huyết động liên tục.",
      "Liên hệ và hội chẩn tuyến trên.",
      "Chuyển tuyến cấp cứu đến cơ sở có hồi sức/can thiệp."
    ];
    probability = 0.9;
  }
  // 3) VÀNG / XANH – THIẾU MÁU CƠ TIM
  else {
    let fusionScore = 0;
    if (ecgIschemia) fusionScore += 4;
    fusionScore += symptomsChecked;
    fusionScore += riskChecked * 0.5;

    const maxScore = 11;
    probability = Math.max(0, Math.min(1, fusionScore / maxScore));

    vitalExplain = "AI Safety: không ghi nhận tiêu chí sốc/suy hô hấp rõ.";
    rhythmExplain = "AI Rhythm: không phát hiện rối loạn nhịp nguy hiểm.";
    ischemiaExplain = "AI Thiếu máu cơ tim (Fusion): kết hợp ECG, triệu chứng, yếu tố nguy cơ.";

    if (probability < 0.2) {
      // 4) XANH – NGUY CƠ THẤP
      riskClass = "risk-low";
      riskTitle = "XANH – NGUY CƠ THIẾU MÁU CƠ TIM THẤP";
      riskSubtitle = "Hiện ít gợi ý thiếu máu cơ tim cấp, có thể theo dõi tại tuyến cơ sở.";
      recommendations = [
        "Theo dõi triệu chứng và chỉ số sinh tồn tại tuyến cơ sở.",
        "Lặp lại ECG nếu triệu chứng xuất hiện hoặc thay đổi.",
        "Khám chuyên khoa tim mạch khi thuận tiện.",
        "Giải thích cho người bệnh các dấu hiệu nguy hiểm cần quay lại ngay."
      ];
    } else {
      // 3) VÀNG – NGUY CƠ TRUNG BÌNH/CAO
      riskClass = "risk-medium";
      riskTitle = "VÀNG – NGUY CƠ THIẾU MÁU CƠ TIM TRUNG BÌNH/CAO";
      riskSubtitle = "Có khả năng thiếu máu cơ tim, cần theo dõi sát và cân nhắc chuyển tuyến.";
      recommendations = [
        "Theo dõi sát triệu chứng và huyết động.",
        "Lặp lại ECG sau 10–15 phút hoặc khi triệu chứng thay đổi.",
        "Hội chẩn tuyến trên (trực tiếp hoặc từ xa).",
        "Chuẩn bị chuyển tuyến nếu triệu chứng không cải thiện hoặc nặng lên."
      ];
    }
  }

  const probText = (probability * 100).toFixed(0) + "%";
  const resultDiv = document.getElementById("resultRiskCard");
  resultDiv.innerHTML = `
    <div class="risk-card ${riskClass}">
      <h2>${riskTitle}</h2>
      <p>${riskSubtitle}</p>
      <div class="pill">
        <span class="pill-dot"></span>
        Xác suất thiếu máu cơ tim (ước tính demo): <b>${probText}</b>
      </div>
    </div>
  `;

  document.getElementById("vitalSummary").textContent = vitalExplain;
  document.getElementById("rhythmSummary").textContent = rhythmExplain;
  document.getElementById("ischemiaSummary").textContent = ischemiaExplain;

  const recList = document.getElementById("recommendationList");
  recList.innerHTML = "";
  recommendations.forEach(r => {
    const li = document.createElement("li");
    li.textContent = r;
    recList.appendChild(li);
  });

  const hear = calculateHEAR();
  const hearDiv = document.getElementById("hearSummary");
  hearDiv.innerHTML = `
    <h3>HEAR score (tham khảo)</h3>
    <p><b>Tổng điểm: ${hear.total} / 8</b></p>
    <p>History: ${hear.H} • ECG: ${hear.E} • Age: ${hear.A} • Risk: ${hear.R}</p>
    <p style="font-size:11px;color:#6b7280;">
      HEAR score chỉ mang tính tham khảo, không thay thế phân tầng 4 màu của AI.
    </p>
  `;

  goToStep(4);
}

function resetForm() {
  document.querySelectorAll("input, select").forEach(el => {
    if (el.type === "checkbox" || el.type === "radio") el.checked = false;
    else if (el.tagName.toLowerCase() === "select") el.selectedIndex = 0;
    else el.value = "";
  });
  ecgPreview.innerHTML = "Chưa có ảnh ECG.";
  ecgStatus.textContent = "";
  document.getElementById("resultRiskCard").innerHTML = "";
  document.getElementById("vitalSummary").textContent = "";
  document.getElementById("rhythmSummary").textContent = "";
  document.getElementById("ischemiaSummary").textContent = "";
  document.getElementById("recommendationList").innerHTML = "";
  document.getElementById("hearSummary").innerHTML = "";
  goToStep(1);
}
