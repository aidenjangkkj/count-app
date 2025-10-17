// app/bridge/page.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { linkBridge } from "@webview-bridge/web";
import { z } from "zod";

// 런타임 결과 검증 스키마
const BaseSchema = z.object({
  network: z.string(),
  number: z.coerce.number().int().min(1),
});
const ResponseSchema = z.union([
  BaseSchema,
  z.object({ data: BaseSchema }),
]).transform((v) => ("data" in v ? v.data : v));

export default function BridgePage() {
  const [status, setStatus] = useState("버튼 클릭 시 3초 후 결과 표시");
  const [network, setNetwork] = useState("-");
  const [number, setNumber] = useState<string | number>("-");
  const [ready, setReady] = useState(false);

  // ✅ 브릿지를 한 번만 생성
  const bridgeRef = useRef<ReturnType<typeof linkBridge> | null>(null);
  useEffect(() => {
    // SSR 회피: 클라이언트에서만 생성
    bridgeRef.current = linkBridge({
      onReady: () => {
        console.log("[bridge] ready");
        setReady(true); // 여기서 setState OK (1회)
      },
    });

    // 선택: 언마운트 시 정리(필요 시)
    return () => {
      bridgeRef.current = null;
    };
  }, []);

  const onClick = async () => {
    if (!bridgeRef.current) {
      setStatus("브릿지가 아직 준비되지 않았습니다.");
      return;
    }

    setStatus("네이티브 처리 중... (3초 지연)");

    let raw: unknown;
    try {
      // ✅ 매 렌더마다 새 인스턴스 생성하지 않고 ref 사용
      const call = bridgeRef.current as unknown as Record<string, () => Promise<unknown>>;
      raw = await call.requestInfo();
      console.log("[bridge] raw response:", raw);
    } catch (e) {
      console.error("[bridge] call error:", e);
      setStatus("브릿지 호출 실패 (WebView 내부에서 열렸는지 확인)");
      return;
    }

    const parsed = ResponseSchema.safeParse(raw);
    if (!parsed.success) {
      console.error("[bridge] parse error:", parsed.error.flatten());
      setStatus("응답 형식 오류 (콘솔 로그 확인)");
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
        disabled={!ready}
        className={`mt-3 rounded-lg px-4 py-3 text-white ${
          ready ? "bg-black" : "bg-zinc-400 cursor-not-allowed"
        }`}
        title={ready ? "" : "RN WebView 안에서 열리면 활성화됩니다"}
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
