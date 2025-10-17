// app/bridge/page.tsx
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
    <main className="p-4 font-sans">
      <div className="mb-3 rounded-lg bg-zinc-100 px-3 py-2 font-semibold">
        🌐 이 영역은 <b>WebView(웹)</b> UI입니다
      </div>

      <h3 className="text-lg font-semibold">웹 ↔ 네이티브 브릿지 (네트워크 + 숫자)</h3>

      <button
        onClick={onClick}
        className="mt-3 rounded-lg bg-black px-4 py-3 text-white"
      >
        네이티브에 요청하기
      </button>

      <div className="mt-3 rounded-xl border border-zinc-200 p-3">
        <div className="my-1 flex justify-between">
          <div className="text-zinc-600">네트워크 상태</div>
          <div className="font-semibold">{network}</div>
        </div>

        <div className="my-1 flex justify-between">
          <div className="text-zinc-600">랜덤 숫자</div>
          <div className="font-semibold">{number}</div>
        </div>

        <div className="mt-1 text-xs text-zinc-500">{status}</div>
      </div>
    </main>
  );
}
