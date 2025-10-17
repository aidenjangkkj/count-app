// app/bridge/page.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { linkBridge } from "@webview-bridge/web";
import { z } from "zod";

// 1) 관대한 스키마: 문자열/래핑까지 허용
const BaseSchema = z.object({
  network: z.string(),
  number: z.coerce.number().int().min(1),
});
const ResponseSchema = z.union([
  BaseSchema,
  z.object({ data: BaseSchema }),
]);

function normalizeRaw(raw: unknown): unknown {
  // 문자열이면 JSON 파싱 시도
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { /* 그대로 둠 */ }
  }
  return raw;
}

export default function BridgePage() {
  const [status, setStatus] = useState("버튼 클릭 시 3초 후 결과 표시");
  const [network, setNetwork] = useState("-");
  const [number, setNumber] = useState<string | number>("-");
  const [ready, setReady] = useState(false);

  const bridgeRef = useRef<ReturnType<typeof linkBridge> | null>(null);

  useEffect(() => {
    bridgeRef.current = linkBridge({
    timeout: 5000,
      onReady: () => {
        console.log("[bridge] ready");
        setReady(true);
      },
    });
    return () => { bridgeRef.current = null; };
  }, []);

  const onClick = async () => {
    if (!bridgeRef.current) {
      setStatus("브릿지가 아직 준비되지 않았습니다.");
      return;
    }

    setStatus("네이티브 처리 중... (3초 지연)");

    const call = bridgeRef.current as unknown as Record<string, () => Promise<unknown>>;

    try {
      const pong = await call.ping?.();
      console.log("[bridge] ping:", pong);
    } catch (e) {
      console.error("[bridge] ping error:", e);
      setStatus("브릿지 연결 안 됨 (WebView 내부에서 열렸는지 확인)");
      return;
    }

    let raw: unknown;
    try {
      raw = await call.requestInfo?.();
      console.log("[bridge] raw response (original):", raw, " typeof:", typeof raw);
    } catch (e) {
      console.error("[bridge] call error:", e);
      setStatus("브릿지 호출 실패");
      return;
    }

    // 4) 응답 정규화 + 검증
    const normalized = normalizeRaw(raw);
    console.log("[bridge] normalized:", normalized);

    const parsed = ResponseSchema.safeParse(normalized);
    if (!parsed.success) {
      console.error("[bridge] parse error:", parsed.error.flatten());
      setStatus("응답 형식 오류 (콘솔 로그 확인)");
      return;
    }

    const data = "data" in parsed.data ? parsed.data.data : parsed.data;
    setNetwork(data.network);
    setNumber(data.number);
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
        disabled={!ready}
        className={`mt-3 rounded-lg px-4 py-3 text-white ${ready ? "bg-black" : "bg-zinc-400 cursor-not-allowed"}`}
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
