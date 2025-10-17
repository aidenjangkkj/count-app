// app/bridge/page.tsx  (Next.js App Router)
"use client";

import React, { useState } from "react";
import { linkBridge } from "@webview-bridge/web";
import { z } from "zod";

// 런타임 결과 검증 스키마 (네이티브 반환값 가드)
const ResponseSchema = z.object({
  network: z.string(),
  number: z.number().int().min(1),
});

export default function BridgePage() {
  const [status, setStatus] = useState("버튼 클릭 시 3초 후 결과 표시");
  const [network, setNetwork] = useState("-");
  const [number, setNumber] = useState<string | number>("-");

  // 제네릭/타입 공유 없이 사용
  const bridge = linkBridge({
    onReady: () => {
      // RN WebView 안에서 열리면 호출됨
      console.log("bridge ready");
    },
  });

  const onClick = async () => {
    setStatus("네이티브 처리 중... (3초 지연)");
    // 타입 공유가 없으므로 런타임 검증으로 가드
    const raw = await (bridge as unknown as Record<string, () => Promise<unknown>>).requestInfo();
    const parsed = ResponseSchema.safeParse(raw);

    if (!parsed.success) {
      setStatus("응답 형식 오류");
      return;
    }

    setNetwork(parsed.data.network);
    setNumber(parsed.data.number);
    setStatus("웹뷰 렌더링 완료");
  };

  return (
    <main style={{ padding: 16, fontFamily: "system-ui, -apple-system" }}>
      <div style={{ padding: 8, borderRadius: 8, background: "#f4f4f5", fontWeight: 600, marginBottom: 12 }}>
        🌐 이 영역은 <b>WebView(웹)</b> UI입니다
      </div>

      <h3>웹 ↔ 네이티브 브릿지 (네트워크 + 숫자)</h3>
      <button
        onClick={onClick}
        style={{ padding: "12px 16px", borderRadius: 8, background: "#111", color: "#fff", border: 0 }}
      >
        네이티브에 요청하기
      </button>

      <div style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 12, marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", margin: "6px 0" }}>
          <div style={{ color: "#666" }}>네트워크 상태</div>
          <div style={{ fontWeight: 600 }}>{network}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", margin: "6px 0" }}>
          <div style={{ color: "#666" }}>랜덤 숫자</div>
          <div style={{ fontWeight: 600 }}>{number}</div>
        </div>
        <div style={{ color: "#888", fontSize: 12, marginTop: 6 }}>{status}</div>
      </div>
    </main>
  );
}
